
import { Op, STR_MASK, SystemOp } from './types';
import iconv from 'iconv-lite';

export class LavaXDecompiler {
  disassemble(lav: Uint8Array): string {
    if (lav.length < 8) return "// Invalid LAV file";
    const codeLen = (lav[4] << 24) | (lav[5] << 16) | (lav[6] << 8) | lav[7];
    const ops = lav.slice(8, 8 + codeLen);
    const stringsTail = lav.slice(8 + codeLen);

    const strings: string[] = [];
    let currentStr: number[] = [];
    for (let i = 0; i < stringsTail.length; i++) {
      if (stringsTail[i] === 0) {
        strings.push(iconv.decode(new Uint8Array(currentStr), 'gbk'));
        currentStr = [];
      } else {
        currentStr.push(stringsTail[i]);
      }
    }

    const lines: string[] = [];
    const jumpTargets = new Set<number>();

    // Pass 1: find targets
    let ip = 0;
    while (ip < ops.length) {
      const op = ops[ip++];
      if ([Op.JMP, Op.JZ, Op.JNZ, Op.CALL].includes(op)) {
        // GVM uses 3-byte addresses for JMP/CALL
        ip += 3;
      } else if ([Op.PUSH_INT, Op.LOAD_R1_CHAR, Op.LOAD_R1_INT, Op.LOAD_R1_LONG, Op.PUSH_R_ADDR, Op.ENTER].includes(op)) {
        ip += 2;
      } else if ([Op.PUSH_LONG, Op.PUSH_ADDR_CHAR, Op.PUSH_ADDR_INT, Op.PUSH_ADDR_LONG].includes(op)) {
        ip += 4;
      } else if (op === Op.PUSH_CHAR) {
        ip += 1;
      } else if (op === Op.ADD_STRING) {
        while (ops[ip] !== 0 && ip < ops.length) ip++;
        ip++; // skip null
      }
    }

    // Pass 2: disassemble
    ip = 0;
    while (ip < ops.length) {
      const currentAddr = ip;
      let line = jumpTargets.has(currentAddr) ? `L_${currentAddr.toString(16).padStart(4, '0')}:\n  ` : "  ";
      const op = ops[ip++];
      const opcodeName = Op[op] || `DB 0x${op.toString(16)}`;

      line += opcodeName;
      if (op & 0x80) {
        line += ` ${SystemOp[op] || op}`;
      } else if ([Op.JMP, Op.JZ, Op.JNZ, Op.CALL].includes(op)) {
        const addr = ops[ip] | (ops[ip + 1] << 8) | (ops[ip + 2] << 16);
        ip += 3;
        line += ` L_${addr.toString(16).padStart(4, '0')}`;
      } else if ([Op.PUSH_CHAR].includes(op)) {
        line += ` ${ops[ip++]}`;
      } else if ([Op.PUSH_INT, Op.PUSH_R_ADDR, Op.LOAD_R1_LONG].includes(op)) {
        const val = ops[ip] | (ops[ip + 1] << 8); ip += 2;
        line += ` ${val > 32767 ? val - 65536 : val}`;
      } else if (op === Op.ADD_STRING) {
        const start = ip;
        while (ops[ip] !== 0 && ip < ops.length) ip++;
        const strBytes = ops.slice(start, ip);
        ip++;
        line += ` "${iconv.decode(strBytes, 'gbk')}"`;
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  decompile(lav: Uint8Array): string {
    if (lav.length < 8) return "// Invalid LAV file";
    const asm = this.disassemble(lav);
    const lines = asm.split('\n');
    let src = "// Decompiled LavaX Source\n\nvoid main() {\n";
    const stack: string[] = [];

    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      const op = parts[0];
      const arg = parts.slice(1).join(' ');

      switch (op) {
        case 'LIT': stack.push(arg); break;
        case 'LOD': stack.push(`var_${arg}`); break;
        case 'STO': src += `  var_${arg} = ${stack.pop()};\n`; break;
        case 'ADD': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} + ${b})`); break; }
        case 'SUB': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} - ${b})`); break; }
        case 'MUL': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} * ${b})`); break; }
        case 'DIV': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} / ${b})`); break; }
        case 'EQ': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} == ${b})`); break; }
        case 'SYS': {
          const sysId = arg;
          const sysArgs = [];
          // Heuristic: common syscalls arg counts
          const argCounts: Record<string, number> = { 'TextOut': 3, 'Box': 4, 'Line': 4, 'delay': 1, 'SetFontSize': 1, 'Locate': 2, 'FillBox': 4 };
          const count = argCounts[sysId] || 0;
          for (let i = 0; i < count; i++) sysArgs.unshift(stack.pop());
          src += `  ${sysId}(${sysArgs.join(', ')});\n`;
          break;
        }
        case 'CALL': src += `  func_${arg.replace('L_', '')}(...);\n`; break;
      }
    });

    src += "}\n";
    return src;
  }

  private readInt(buf: Uint8Array, ptr: number) {
    return (buf[ptr] << 24) | (buf[ptr + 1] << 16) | (buf[ptr + 2] << 8) | buf[ptr + 3];
  }
}
