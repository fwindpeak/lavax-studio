
import { Op, STR_MASK, SystemOp } from './types';
import iconv from 'iconv-lite';

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
      if ([Op.JMP, Op.JZ, Op.JNZ, Op.CALL].includes(op)) {
        const addr = ops[ip] | (ops[ip + 1] << 8) | (ops[ip + 2] << 16);
        jumpTargets.add(addr);
        ip += 3;
      } else if ([Op.PUSH_INT, Op.LEA_23, Op.LEA_24, Op.LOAD_R1_CHAR, Op.LOAD_R1_INT, Op.LOAD_R1_LONG, Op.CALC_R_ADDR_1, Op.PUSH_R_ADDR, Op.ENTER, Op.LEA_G_B, Op.LEA_G_W, Op.LEA_G_D, Op.LEA_L_B, Op.LEA_L_W, Op.LEA_L_D].includes(op)) {
        ip += 2;
      } else if ([Op.PUSH_LONG, Op.LEA_G_D, Op.LEA_L_D, Op.PUSH_ADDR_LONG].includes(op)) {
        ip += 4;
      } else if (op === Op.PUSH_CHAR) {
        ip += 1;
      } else if (op === Op.ADD_STRING) {
        while (ops[ip] !== 0 && ip < ops.length) ip++;
        ip++; // skip null
      } else if (op === Op.INIT) {
        ip += 4;
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

      if ([Op.JMP, Op.JZ, Op.JNZ, Op.CALL].includes(op)) {
        const addr = ops[ip] | (ops[ip + 1] << 8) | (ops[ip + 2] << 16);
        ip += 3;
        line += ` L_${addr.toString(16).padStart(4, '0')}`;
      } else if (op === Op.PUSH_CHAR) {
        line += ` ${ops[ip++]}`;
      } else if ([Op.PUSH_INT, Op.LEA_23, Op.LEA_24, Op.LOAD_R1_CHAR, Op.LOAD_R1_INT, Op.LOAD_R1_LONG, Op.CALC_R_ADDR_1, Op.PUSH_R_ADDR, Op.LEA_G_B, Op.LEA_G_W, Op.LEA_G_D, Op.LEA_L_B, Op.LEA_L_W, Op.LEA_L_D].includes(op)) {
        const val = ops[ip] | (ops[ip + 1] << 8); ip += 2;
        const signed = val > 32767 ? val - 65536 : val;
        line += ` ${signed}`;
      } else if ([Op.PUSH_LONG, Op.LEA_G_D, Op.LEA_L_D, Op.PUSH_ADDR_LONG].includes(op)) {
        const val = ops[ip] | (ops[ip + 1] << 8) | (ops[ip + 2] << 16) | (ops[ip + 3] << 24); ip += 4;
        line += ` ${val}`;
      } else if (op === Op.ENTER) {
        const size = ops[ip] | (ops[ip + 1] << 8); ip += 2;
        const cnt = ops[ip++];
        line += ` ${size} ${cnt}`;
      } else if (op === Op.ADD_STRING) {
        const start = ip;
        while (ops[ip] !== 0 && ip < ops.length) ip++;
        const strBytes = ops.slice(start, ip);
        ip++;
        line += ` "${iconv.decode(Buffer.from(strBytes), 'gbk')}"`;
      } else if (op === Op.INIT) {
        const addr = ops[ip] | (ops[ip + 1] << 8); ip += 2;
        const len = ops[ip] | (ops[ip + 1] << 8); ip += 2;
        line += ` ${addr} ${len}`;
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  decompile(lav: Uint8Array): string {
    const asm = this.disassemble(lav);
    if (asm.startsWith("//")) return asm;

    const lines = asm.split('\n');
    let src = "// Decompiled LavaX Source\n\n";
    const stack: string[] = [];
    let indent = "";

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (trimmed.endsWith(':')) {
        src += `\n${indent}// Label: ${trimmed}\n`;
        return;
      }
      const parts = trimmed.split(/\s+/);
      const op = parts[0];
      const args = parts.slice(1);

      switch (op) {
        case 'PUSH_CHAR':
        case 'PUSH_INT':
        case 'PUSH_LONG': stack.push(args[0]); break;
        case 'ADD_STRING': stack.push(args.join(' ')); break;
        case 'LOAD_R1_LONG':
        case 'LOAD_R1_INT':
        case 'LOAD_R1_CHAR': stack.push(`var_at_${args[0]}`); break;
        case 'PUSH_ADDR_LONG': stack.push(`global_at_${args[0]}`); break;
        case 'PUSH_R_ADDR': stack.push(`&var_at_${args[0]}`); break;

        case 'STORE': {
          const addr = stack.pop();
          const val = stack.pop();
          src += `${indent}${addr} = ${val};\n`;
          stack.push(val);
          break;
        }
        case 'POP': stack.pop(); break;

        case 'ADD': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} + ${b})`); break; }
        case 'SUB': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} - ${b})`); break; }
        case 'MUL': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} * ${b})`); break; }
        case 'DIV': { const b = stack.pop(); const a = stack.pop(); stack.push(`(${a} / ${b})`); break; }

        case 'ENTER': src += `void function_${lines.indexOf(line)}() {\n`; indent = "  "; break;
        case 'RET': src += `${indent}return ${stack.pop() || ""};\n`; break;
        case 'EXIT': src += `${indent}exit();\n`; break;

        default:
          if (SystemOp[op as any] !== undefined || op in SystemOp) {
            const count = 3; // Heuristic
            const sysArgs = [];
            for (let i = 0; i < Math.min(count, stack.length); i++) sysArgs.unshift(stack.pop());
            src += `${indent}${op}(${sysArgs.join(', ')});\n`;
            stack.push("0");
          }
      }
    });

    if (indent) src += "}\n";
    return src;
  }
}
