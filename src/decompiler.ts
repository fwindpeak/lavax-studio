
import { Op, SystemOp } from './types';
import iconv from 'iconv-lite';

interface FunctionInfo {
  startAddr: number;
  endAddr: number;
  name: string;
  frameSize: number;
  paramCount: number;
}

interface VariableInfo {
  offset: number;
  size: number;
  type: 'byte' | 'word' | 'dword';
  isArray: boolean;
  arraySize?: number;
}

export class LavaXDecompiler {
  disassemble(lav: Uint8Array): string {
    if (lav.length < 16) return "// Invalid LAV file (too small)";
    if (lav[0] !== 0x4C || lav[1] !== 0x41 || lav[2] !== 0x56) return "// Invalid LAV magic";

    const ops = lav.slice(16);
    const lines: string[] = [];
    const jumpTargets = new Set<number>();

    // Pass 1: find jump targets
    let ip = 0;
    while (ip < ops.length) {
      const op = ops[ip++];
      if ([Op.JMP, Op.JZ, Op.CALL].includes(op)) {
        const addr = ops[ip] | (ops[ip + 1] << 8) | (ops[ip + 2] << 16);
        const relativeAddr = addr - 16;
        jumpTargets.add(relativeAddr);
        ip += 3;
      } else if ([Op.PUSH_B, Op.MASK].includes(op)) {
        ip += 1;
      } else if ([Op.PUSH_W, Op.LD_G_B, Op.LD_G_W, Op.LD_G_D,
      Op.LEA_G_B, Op.LEA_G_W, Op.LEA_G_D, Op.LD_L_B, Op.LD_L_W, Op.LD_L_D,
      Op.LEA_L_B, Op.LEA_L_W, Op.LEA_L_D,
      Op.LEA_OFT, Op.LEA_L_PH, Op.LEA_ABS, Op.SPACE, Op.INIT].includes(op)) {
        if (op === Op.INIT) {
          const len = ops[ip + 2] | (ops[ip + 3] << 8);
          ip += 4 + len;
        } else {
          ip += 2;
        }
      } else if ([Op.PUSH_D].includes(op)) {
        ip += 4;
      } else if (op === Op.FUNC) {
        ip += 3;
      } else if (op === Op.PUSH_STR) {
        while (ops[ip] !== 0 && ip < ops.length) ip++;
        ip++; // skip null
      }
    }

    // Pass 2: disassemble
    ip = 0;
    while (ip < ops.length) {
      const currentAddr = ip;
      let labelLine = jumpTargets.has(currentAddr) ? `L_${currentAddr.toString(16).padStart(4, '0')}:` : "";
      if (labelLine) lines.push(labelLine);

      const op = ops[ip++];
      let line = "  ";
      const opcodeName = Op[op] || (op & 0x80 ? SystemOp[op] : null) || `DB 0x${op.toString(16)}`;
      line += opcodeName;

      if ([Op.JMP, Op.JZ, Op.CALL].includes(op)) {
        const addr = ops[ip] | (ops[ip + 1] << 8) | (ops[ip + 2] << 16);
        ip += 3;
        line += ` L_${(addr - 16).toString(16).padStart(4, '0')}`;
      } else if ([Op.PUSH_B, Op.MASK].includes(op)) {
        line += ` ${ops[ip++]}`;
      } else if ([Op.PUSH_W, Op.LD_G_B, Op.LD_G_W, Op.LD_G_D,
      Op.LEA_G_B, Op.LEA_G_W, Op.LEA_G_D, Op.LD_L_B, Op.LD_L_W, Op.LD_L_D,
      Op.LEA_L_B, Op.LEA_L_W, Op.LEA_L_D,
      Op.LEA_OFT, Op.LEA_L_PH, Op.LEA_ABS, Op.SPACE].includes(op)) {
        const val = ops[ip] | (ops[ip + 1] << 8); ip += 2;
        const signed = val > 32767 ? val - 65536 : val;
        line += ` ${signed}`;
      } else if ([Op.PUSH_D].includes(op)) {
        const val = ops[ip] | (ops[ip + 1] << 8) | (ops[ip + 2] << 16) | (ops[ip + 3] << 24); ip += 4;
        line += ` ${val}`;
      } else if (op === Op.FUNC) {
        // Binary format: #NUM1(2B) = frameSize, #NUM2(1B) = param_count
        const size = ops[ip] | (ops[ip + 1] << 8); ip += 2;
        const cnt = ops[ip++];
        line += ` ${size} ${cnt}`;
      } else if (op === Op.PUSH_STR) {
        const start = ip;
        while (ops[ip] !== 0 && ip < ops.length) ip++;
        const strBytes = ops.slice(start, ip);
        ip++;
        // Note: we can't easily XOR decode without knowing the current strMask at this point
        // but we'll try to show it as best as we can.
        line += ` "${iconv.decode(Buffer.from(strBytes), 'gbk')}"`;
      } else if (op === Op.INIT) {
        const addr = ops[ip] | (ops[ip + 1] << 8); ip += 2;
        const len = ops[ip] | (ops[ip + 1] << 8); ip += 2;
        line += ` ${addr} ${len}`;
        ip += len;
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  decompile(lav: Uint8Array): string {
    const asm = this.disassemble(lav);
    if (asm.startsWith("//")) return asm;

    const lines = asm.split('\n');
    let src = "// Decompiled LavaX Source (Experimental)\n\n";
    const stack: string[] = [];
    let indent = "";
    
    // Track variable information
    const globalVars = new Map<number, VariableInfo>();
    const localVars = new Map<number, VariableInfo>();
    let currentFunc: FunctionInfo | null = null;
    let funcCount = 0;
    
    // First pass: collect variable information from INIT and memory accesses
    this.collectVariableInfo(lines, globalVars);

    lines.forEach((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      
      // Handle labels
      if (trimmed.endsWith(':')) {
        src += `\n${indent}// ${trimmed}\n`;
        return;
      }
      
      const parts = trimmed.split(/\s+/);
      const op = parts[0];
      const args = parts.slice(1);

      // Handle INIT instruction - array initialization
      if (op === 'INIT') {
        const addr = parseInt(args[0]);
        const len = parseInt(args[1]);
        const varInfo = globalVars.get(addr);
        
        if (varInfo && varInfo.isArray) {
          // Try to extract array values from the INIT data
          const values = this.extractInitValues(lav, 16 + lineIdx, len, varInfo.size);
          src += `${indent}// Array init: ${this.formatArrayDecl(varInfo, addr, values)}\n`;
        } else {
          src += `${indent}// INIT data at offset ${addr}, len ${len}\n`;
        }
        return;
      }

      // Handle SPACE instruction - global space allocation
      if (op === 'SPACE') {
        const size = parseInt(args[0]);
        src += `${indent}// Global space: ${size} bytes\n`;
        return;
      }

      // Handle FUNC instruction - function start
      if (op === 'FUNC') {
        const frameSize = parseInt(args[0]);
        const paramCount = parseInt(args[1]);
        currentFunc = {
          startAddr: lineIdx,
          endAddr: -1,
          name: `func_${funcCount++}`,
          frameSize,
          paramCount
        };
        src += `\n${indent}void ${currentFunc.name}(${this.formatParams(paramCount)}) {\n`;
        indent = "  ";
        return;
      }

      // Handle RET instruction - function return
      if (op === 'RET') {
        const retVal = stack.length > 0 ? stack.pop() : "";
        if (retVal) {
          src += `${indent}return ${retVal};\n`;
        }
        if (currentFunc) {
          currentFunc.endAddr = lineIdx;
          indent = "";
          src += `}\n`;
          currentFunc = null;
        }
        return;
      }

      // Handle EXIT instruction
      if (op === 'EXIT') {
        src += `${indent}exit();\n`;
        return;
      }

      // Standard instruction handling
      this.handleInstruction(op, args, stack, src, indent);
    });

    if (indent) src += "}\n";
    return src;
  }

  private collectVariableInfo(lines: string[], globalVars: Map<number, VariableInfo>) {
    // Scan for memory access patterns to infer variable types
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.endsWith(':')) return;
      
      const parts = trimmed.split(/\s+/);
      const op = parts[0];
      const args = parts.slice(1);

      // Detect array accesses (LD_G_O, LD_L_O)
      if (op.startsWith('LD_G_O') || op.startsWith('LD_L_O')) {
        const offset = parseInt(args[0]);
        const size = op.endsWith('_B') ? 1 : op.endsWith('_W') ? 2 : 4;
        if (!globalVars.has(offset)) {
          globalVars.set(offset, {
            offset,
            size,
            type: size === 1 ? 'byte' : size === 2 ? 'word' : 'dword',
            isArray: true
          });
        }
      }

      // Detect simple variable accesses (LD_G, LD_L without _O)
      if ((op.startsWith('LD_G_') || op.startsWith('LD_L_')) && !op.includes('_O')) {
        const offset = parseInt(args[0]);
        const size = op.endsWith('_B') ? 1 : op.endsWith('_W') ? 2 : 4;
        if (!globalVars.has(offset)) {
          globalVars.set(offset, {
            offset,
            size,
            type: size === 1 ? 'byte' : size === 2 ? 'word' : 'dword',
            isArray: false
          });
        }
      }
    });
  }

  private extractInitValues(lav: Uint8Array, lineOffset: number, len: number, elemSize: number): number[] {
    // This is a simplified extraction - actual implementation would need to parse the INIT data
    const values: number[] = [];
    // Extract values based on element size
    return values;
  }

  private formatArrayDecl(varInfo: VariableInfo, addr: number, values: number[]): string {
    const typeStr = varInfo.type === 'byte' ? 'char' : varInfo.type === 'word' ? 'int' : 'long';
    const count = varInfo.arraySize || Math.floor((varInfo.size || 4) / (varInfo.type === 'byte' ? 1 : varInfo.type === 'word' ? 2 : 4));
    
    if (values.length > 0) {
      return `${typeStr} arr_${addr}[${count}] = {${values.join(', ')}};`;
    }
    return `${typeStr} arr_${addr}[${count}];`;
  }

  private formatParams(count: number): string {
    if (count === 0) return "";
    const params: string[] = [];
    for (let i = 0; i < count; i++) {
      params.push(`int arg${i}`);
    }
    return params.join(', ');
  }

  private handleInstruction(op: string, args: string[], stack: string[], src: string, indent: string): string {
    switch (op) {
      case 'PUSH_B':
      case 'PUSH_W':
      case 'PUSH_D':
        stack.push(args[0]);
        break;
      case 'PUSH_STR':
        stack.push(`"${args.join(' ')}"`);
        break;
      case 'LD_G_B':
      case 'LD_G_W':
      case 'LD_G_D':
        stack.push(`g_${args[0]}`);
        break;
      case 'LD_L_B':
      case 'LD_L_W':
      case 'LD_L_D':
        stack.push(`l_${args[0]}`);
        break;
      case 'LEA_G_B':
      case 'LEA_G_W':
      case 'LEA_G_D':
        stack.push(`&g_${args[0]}`);
        break;
      case 'LEA_L_B':
      case 'LEA_L_W':
      case 'LEA_L_D':
        stack.push(`&l_${args[0]}`);
        break;

      case 'STORE': {
        const addr = stack.pop();
        const val = stack.pop();
        src += `${indent}${addr} = ${val};\n`;
        stack.push(val);
        break;
      }
      case 'POP':
        stack.pop();
        break;

      case 'ADD': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} + ${b})`); break; }
      case 'SUB': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} - ${b})`); break; }
      case 'MUL': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} * ${b})`); break; }
      case 'DIV': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} / ${b})`); break; }
      case 'MOD': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} % ${b})`); break; }
      case 'AND': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} & ${b})`); break; }
      case 'OR': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} | ${b})`); break; }
      case 'XOR': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} ^ ${b})`); break; }
      case 'SHL': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} << ${b})`); break; }
      case 'SHR': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} >> ${b})`); break; }

      case 'EQ': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} == ${b})`); break; }
      case 'NEQ': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} != ${b})`); break; }
      case 'LT': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} < ${b})`); break; }
      case 'GT': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} > ${b})`); break; }
      case 'LE': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} <= ${b})`); break; }
      case 'GE': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} >= ${b})`); break; }

      case 'NEG': { const a = stack.pop(); stack.push(`(-${a})`); break; }
      case 'NOT': { const a = stack.pop(); stack.push(`(~${a})`); break; }
      case 'L_NOT': { const a = stack.pop(); stack.push(`(!${a})`); break; }

      case 'INC_PRE': { const a = stack.pop(); stack.push(`++${a}`); break; }
      case 'DEC_PRE': { const a = stack.pop(); stack.push(`--${a}`); break; }
      case 'INC_POS': { const a = stack.pop(); stack.push(`${a}++`); break; }
      case 'DEC_POS': { const a = stack.pop(); stack.push(`${a}--`); break; }

      case 'LD_IND': {
        const addr = stack.pop();
        stack.push(`*${addr}`);
        break;
      }

      default:
        if (SystemOp[op as any] !== undefined || op in SystemOp) {
          const sysArgs: string[] = [];
          // Most syscalls pop args from stack
          const argCount = this.getSyscallArgCount(op);
          for (let i = 0; i < argCount && stack.length > 0; i++) {
            sysArgs.unshift(stack.pop()!);
          }
          src += `${indent}${op}(${sysArgs.join(', ')});\n`;
          // Push return value placeholder for syscalls that return
          if (this.syscallReturns(op)) {
            stack.push(`${op}_ret`);
          }
        }
    }
    return src;
  }

  private getSyscallArgCount(op: string): number {
    // Return approximate arg count for common syscalls
    const argCounts: Record<string, number> = {
      'putchar': 1, 'getchar': 0, 'printf': 1, 'sprintf': 2,
      'strcpy': 2, 'strlen': 1, 'strcat': 2, 'strcmp': 2,
      'SetScreen': 1, 'Refresh': 0, 'ClearScreen': 0,
      'Point': 3, 'GetPoint': 2, 'Line': 5, 'Box': 6,
      'Circle': 5, 'Ellipse': 6, 'Block': 5, 'Rectangle': 5,
      'TextOut': 4, 'WriteBlock': 6, 'GetBlock': 6,
      'Delay': 1, 'Getms': 0, 'exit': 1,
      'fopen': 2, 'fclose': 1, 'fread': 4, 'fwrite': 4,
      'abs': 1, 'rand': 0, 'srand': 1,
    };
    return argCounts[op] || 0;
  }

  private syscallReturns(op: string): boolean {
    const returns: string[] = [
      'getchar', 'strlen', 'strcmp', 'strstr', 'strchr',
      'GetPoint', 'abs', 'rand', 'Getms', 'fopen',
      'fread', 'fwrite', 'fseek', 'ftell', 'feof',
      'Inkey', 'CheckKey'
    ];
    return returns.includes(op);
  }
}
