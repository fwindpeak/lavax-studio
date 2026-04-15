import iconv from 'iconv-lite';
import {
  createOfficialLavHeader,
  encodeLavHeader,
  LAV_HEADER_SIZE,
  LAV_OPCODE_BY_MNEMONIC,
  LAV_OPCODE_BY_UPPERCASE_MNEMONIC,
  OperandType,
  type LavFuncOperand,
  type LavInitOperand,
  type LavInstructionNode,
  type LavProgram,
} from '../lav/format';

function encodeToGBK(str: string): number[] {
  try {
    return Array.from(iconv.encode(str, 'gbk'));
  } catch {
    return Array.from(str).map(c => c.charCodeAt(0) & 0xff);
  }
}

function unescapeString(str: string): string {
  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
}

function parseNumericToken(token: string | undefined): number {
  if (!token) return 0;
  const value = Number(token);
  if (!Number.isNaN(value)) return value;
  if (/^0x/i.test(token)) return parseInt(token, 16);
  return parseInt(token, 10);
}

function encodeI16(code: number[], value: number) {
  code.push(value & 0xff, (value >> 8) & 0xff);
}

function encodeU24(code: number[], value: number) {
  code.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff);
}

function encodeI32(code: number[], value: number) {
  code.push(value & 0xff, (value >> 8) & 0xff, (value >> 16) & 0xff, (value >> 24) & 0xff);
}

type Fixup = {
  position: number;
  label: string;
};

export interface AssembleOptions {
  strictOfficial?: boolean;
}

export class LavaXAssembler {
  private splitAsmLines(asmSource: string): string[] {
    const lines: string[] = [];
    let current = '';
    let inString = false;
    let escaping = false;

    for (let i = 0; i < asmSource.length; i++) {
      const ch = asmSource[i];
      if (ch === '"' && !escaping) {
        inString = !inString;
        current += ch;
        continue;
      }
      if (ch === '\n') {
        if (inString) {
          current += '\\n';
        } else {
          lines.push(current);
          current = '';
        }
        escaping = false;
        continue;
      }
      current += ch;
      escaping = ch === '\\' && !escaping;
      if (ch !== '\\') escaping = false;
    }

    if (current.length > 0) lines.push(current);
    return lines;
  }

  assembleProgram(program: LavProgram): Uint8Array {
    const header = encodeLavHeader(program.header);
    const bodyLength = program.instructions.reduce((sum, instruction) => sum + instruction.rawBytes.length, 0);
    const output = new Uint8Array(header.length + bodyLength);
    output.set(header, 0);

    let offset = header.length;
    for (const instruction of program.instructions) {
      output.set(instruction.rawBytes, offset);
      offset += instruction.rawBytes.length;
    }

    return output;
  }

  assemble(asmSource: string, options: AssembleOptions = {}): Uint8Array {
    const lines = this.splitAsmLines(asmSource)
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.startsWith(';'));

    const labels = new Map<string, number>();
    const fixups: Fixup[] = [];
    const code: number[] = [];
    let currentPos = 0;
    let headerMask = 0;
    let sawMask = false;

    for (const line of lines) {
      if (line.endsWith(':')) {
        labels.set(line.slice(0, -1), currentPos);
        continue;
      }
      currentPos += this.getEncodedLength(line, sawMask ? headerMask : 0, options);
      if (!sawMask && /^MASK\s+/i.test(line)) {
        headerMask = parseNumericToken(line.split(/\s+/)[1]) & 0xff;
        sawMask = true;
      }
    }

    for (const line of lines) {
      if (line.endsWith(':')) continue;
      this.encodeLine(line, code, labels, fixups, headerMask, options);
    }

    for (const fixup of fixups) {
      const target = labels.get(fixup.label);
      if (target === undefined) {
        throw new Error(`Unknown label: ${fixup.label}`);
      }
      const address = target + LAV_HEADER_SIZE;
      code[fixup.position] = address & 0xff;
      code[fixup.position + 1] = (address >> 8) & 0xff;
      code[fixup.position + 2] = (address >> 16) & 0xff;
    }

    const header = createOfficialLavHeader({
      strMask: headerMask,
      entryPointField: 0,
    });
    const output = new Uint8Array(LAV_HEADER_SIZE + code.length);
    output.set(encodeLavHeader(header), 0);
    output.set(new Uint8Array(code), LAV_HEADER_SIZE);
    return output;
  }

  private getEncodedLength(line: string, headerMask: number, options: AssembleOptions): number {
    if (/^DB\s+/i.test(line)) {
      return this.parseDbBytes(line).length;
    }

    const token = line.split(/\s+/)[0];
    const mnemonic = token.toUpperCase();
    const def = mnemonic === 'F_FLAG'
      ? { opcode: 0xad, mnemonic: 'F_FLAG', operandType: OperandType.NONE, official: false }
      : (LAV_OPCODE_BY_MNEMONIC.get(token) || LAV_OPCODE_BY_UPPERCASE_MNEMONIC.get(mnemonic));
    if (!def) {
      throw new Error(`Unknown opcode: ${mnemonic}`);
    }
    if (options.strictOfficial && !def.official) {
      throw new Error(`Opcode ${mnemonic} is not part of official-compatible mode`);
    }

    switch (def.operandType) {
      case OperandType.NONE:
        return 1;
      case OperandType.U8:
        return 2;
      case OperandType.I16:
      case OperandType.U16:
        return 3;
      case OperandType.U24:
        return 4;
      case OperandType.I32:
        return 5;
      case OperandType.STRING_Z: {
        const text = this.extractQuotedString(line);
        const encoded = encodeToGBK(unescapeString(text)).map(byte => headerMask === 0 ? byte : (byte ^ headerMask));
        return 1 + encoded.length + 1;
      }
      case OperandType.INIT: {
        const parts = line.split(/\s+/);
        const len = parseNumericToken(parts[2]);
        return 1 + 2 + 2 + len;
      }
      case OperandType.FUNC_META:
        return 4;
    }
  }

  private encodeLine(
    line: string,
    code: number[],
    labels: Map<string, number>,
    fixups: Fixup[],
    headerMask: number,
    options: AssembleOptions,
  ) {
    if (/^DB\s+/i.test(line)) {
      for (const byte of this.parseDbBytes(line)) code.push(byte);
      return;
    }

    const parts = line.split(/\s+/);
    const token = parts[0];
    const mnemonic = token.toUpperCase();
    const def = mnemonic === 'F_FLAG'
      ? { opcode: 0xad, mnemonic: 'F_FLAG', operandType: OperandType.NONE, official: false }
      : (LAV_OPCODE_BY_MNEMONIC.get(token) || LAV_OPCODE_BY_UPPERCASE_MNEMONIC.get(mnemonic));
    if (!def) {
      throw new Error(`Unknown opcode: ${mnemonic}`);
    }
    if (options.strictOfficial && !def.official) {
      throw new Error(`Opcode ${mnemonic} is not part of official-compatible mode`);
    }

    code.push(def.opcode);

    switch (def.operandType) {
      case OperandType.NONE:
        return;
      case OperandType.U8:
        code.push(parseNumericToken(parts[1]) & 0xff);
        return;
      case OperandType.I16:
      case OperandType.U16:
        encodeI16(code, parseNumericToken(parts[1]));
        return;
      case OperandType.U24: {
        const target = parts[1];
        if (target && labels.has(target)) {
          encodeU24(code, (labels.get(target) || 0) + LAV_HEADER_SIZE);
        } else {
          fixups.push({ position: code.length, label: target });
          encodeU24(code, 0);
        }
        return;
      }
      case OperandType.I32:
        encodeI32(code, parseNumericToken(parts[1]));
        return;
      case OperandType.STRING_Z: {
        const text = unescapeString(this.extractQuotedString(line));
        const bytes = encodeToGBK(text).map(byte => headerMask === 0 ? byte : (byte ^ headerMask));
        for (const byte of bytes) code.push(byte);
        code.push(0);
        return;
      }
      case OperandType.INIT: {
        const init = this.parseInit(line);
        encodeI16(code, init.targetAddr);
        encodeI16(code, init.dataLength);
        for (const byte of init.data) code.push(byte);
        return;
      }
      case OperandType.FUNC_META: {
        const operand = this.parseFuncOperand(parts);
        encodeI16(code, operand.frameSize);
        code.push(operand.argCount & 0xff);
      }
    }
  }

  private extractQuotedString(line: string): string {
    const start = line.indexOf('"');
    const end = line.lastIndexOf('"');
    if (start === -1 || end <= start) return '';
    return line.slice(start + 1, end);
  }

  private parseInit(line: string): LavInitOperand {
    const parts = line.split(/\s+/);
    const targetAddr = parseNumericToken(parts[1]);
    const dataLength = parseNumericToken(parts[2]);
    const data = new Uint8Array(dataLength);
    for (let i = 0; i < dataLength; i++) {
      data[i] = parseNumericToken(parts[3 + i]) & 0xff;
    }
    return { targetAddr, dataLength, data };
  }

  private parseFuncOperand(parts: string[]): LavFuncOperand {
    return {
      frameSize: parseNumericToken(parts[1]),
      argCount: parseNumericToken(parts[2]) & 0xff,
    };
  }

  private parseDbBytes(line: string): number[] {
    const body = line.replace(/^DB\s+/i, '').trim();
    if (!body) return [];
    return body
      .split(/[,\s]+/)
      .filter(Boolean)
      .map(token => parseNumericToken(token) & 0xff);
  }
}
