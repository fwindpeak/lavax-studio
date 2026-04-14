
import {
  GLOBAL_RAM_START,
  HANDLE_BASE_EBP,
  HANDLE_TYPE_BYTE,
  HANDLE_TYPE_DWORD,
  HANDLE_TYPE_WORD,
  Op,
  SystemOp,
} from './types';
import iconv from 'iconv-lite';

// Instructions that consume the top-of-stack value (used to detect non-void return usage)
const VALUE_CONSUMER_OPS = new Set([
  'ADD','SUB','MUL','DIV','MOD','AND','OR','XOR','SHL','SHR',
  'EQ','NEQ','LT','GT','LE','GE','L_AND','L_OR',
  'STORE','SWAP','NEG','NOT','L_NOT',
  'INC_PRE','DEC_PRE','INC_POS','DEC_POS','DUP',
]);

const UNSIGNED_WORD_OPS = new Set<number>([
  Op.LD_G_B, Op.LD_G_W, Op.LD_G_D,
  Op.LEA_G_B, Op.LEA_G_W, Op.LEA_G_D,
  Op.LD_G_O_B, Op.LD_G_O_W, Op.LD_G_O_D,
  Op.LD_TEXT, Op.LD_GRAP, Op.LEA_ABS,
]);

const COMBO_IMM_OPS = new Set<number>([
  Op.ADD_C, Op.SUB_C, Op.MUL_C, Op.DIV_C, Op.MOD_C, Op.SHL_C, Op.SHR_C,
  Op.EQ_C, Op.NEQ_C, Op.GT_C, Op.LT_C, Op.GE_C, Op.LE_C,
]);

export class LavaXDecompiler {
  private labelToAddr = new Map<string, number>();
  private addrToLine = new Map<number, number>();

  disassemble(lav: Uint8Array): string {
    if (lav.length < 16) return "// Invalid LAV file";
    const version = lav[3];
    if (version !== 0x12) return `// Invalid LAV version: 0x${version.toString(16).toUpperCase()}, expected 0x12`;
    let currentStrMask = lav[5];
    const ops = lav.slice(16);
    const lines: string[] = [];
    const jumpTargets = new Set<number>();
    let ip = 0;
    while (ip < ops.length) {
      const op = ops[ip++];
      if ([Op.JMP, Op.JZ, Op.JNZ, Op.CALL].includes(op)) {
        const addr = (ops[ip] | (ops[ip + 1] << 8) | (ops[ip + 2] << 16)) - 16;
        jumpTargets.add(addr);
        ip += 3;
      } else if ([Op.PUSH_B, Op.MASK, Op.PASS, Op.STORE_EXT, Op.IDX].includes(op)) {
        if (op === Op.MASK) currentStrMask = ops[ip];
        ip += 1;
      }
      else if ([Op.PUSH_W, Op.LD_G_B, Op.LD_G_W, Op.LD_G_D, Op.LEA_G_B, Op.LEA_G_W, Op.LEA_G_D, Op.LD_L_B, Op.LD_L_W, Op.LD_L_D, Op.LEA_L_B, Op.LEA_L_W, Op.LEA_L_D, Op.LEA_OFT, Op.LEA_L_PH, Op.LEA_ABS, Op.PUSH_ADDR, Op.SPACE, Op.INIT, Op.LD_G_O_B, Op.LD_G_O_W, Op.LD_G_O_D, Op.LD_L_O_B, Op.LD_L_O_W, Op.LD_L_O_D].includes(op) || COMBO_IMM_OPS.has(op)) {
        if (op === Op.INIT) { const len = ops[ip + 2] | (ops[ip + 3] << 8); ip += 4 + len; } else ip += 2;
      } else if (op === Op.PUSH_D) ip += 4;
      else if (op === Op.FUNC || op === Op.DBG || op === Op.FUNCID) ip += 3;
      else if (op === Op.PUSH_STR) { while (ops[ip] !== 0 && ip < ops.length) ip++; ip++; }
    }
    ip = 0;
    currentStrMask = lav[5];
    while (ip < ops.length) {
      const addr = ip;
      if (jumpTargets.has(addr)) lines.push(`L_${addr.toString(16).padStart(4, '0')}:`);
      const op = ops[ip++];
      const name = Op[op] || (op & 0x80 ? SystemOp[op] : null) || `DB 0x${op.toString(16)}`;
      let line = `  ${name}`;
      if ([Op.JMP, Op.JZ, Op.JNZ, Op.CALL].includes(op)) {
        const target = (ops[ip] | (ops[ip + 1] << 8) | (ops[ip + 2] << 16)) - 16;
        ip += 3; line += ` L_${target.toString(16).padStart(4, '0')}`;
      } else if ([Op.PUSH_B, Op.MASK, Op.PASS, Op.STORE_EXT, Op.IDX].includes(op)) {
        const value = ops[ip++];
        if (op === Op.MASK) currentStrMask = value;
        line += ` ${value}`;
      }
      else if ([Op.PUSH_W, Op.LD_G_B, Op.LD_G_W, Op.LD_G_D, Op.LEA_G_B, Op.LEA_G_W, Op.LEA_G_D, Op.LD_L_B, Op.LD_L_W, Op.LD_L_D, Op.LEA_L_B, Op.LEA_L_W, Op.LEA_L_D, Op.LEA_OFT, Op.LEA_L_PH, Op.LEA_ABS, Op.PUSH_ADDR, Op.SPACE, Op.LD_G_O_B, Op.LD_G_O_W, Op.LD_G_O_D, Op.LD_L_O_B, Op.LD_L_O_W, Op.LD_L_O_D].includes(op) || COMBO_IMM_OPS.has(op)) {
        const v = ops[ip] | (ops[ip + 1] << 8); ip += 2; line += ` ${UNSIGNED_WORD_OPS.has(op) ? v : (v > 32767 ? v - 65536 : v)}`;
      } else if (op === Op.PUSH_D) {
        const v = ops[ip] | (ops[ip + 1] << 8) | (ops[ip + 2] << 16) | (ops[ip + 3] << 24); ip += 4; line += ` ${v}`;
      } else if (op === Op.FUNC || op === Op.DBG || op === Op.FUNCID) { line += ` ${ops[ip] | (ops[ip + 1] << 8)} ${ops[ip + 2]}`; ip += 3; }
      else if (op === Op.PUSH_STR) {
        const s = ip; while (ops[ip] !== 0 && ip < ops.length) ip++; const bytes = Array.from(ops.slice(s, ip)); ip++;
        if (currentStrMask !== 0) {
          for (let index = 0; index < bytes.length; index++) bytes[index] ^= currentStrMask;
        }
        line += ` "${iconv.decode(Buffer.from(bytes), 'gbk').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
      } else if (op === Op.INIT) {
        const a = ops[ip] | (ops[ip + 1] << 8); ip += 2; const l = ops[ip] | (ops[ip + 1] << 8); ip += 2;
        line += ` ${a} ${l} ${Array.from(ops.slice(ip, ip + l)).join(' ')}`; ip += l;
      }
      lines.push(line);
    }
    return lines.join('\n');
  }

  decompile(lav: Uint8Array): string {
    const asm = this.disassemble(lav);
    if (asm.startsWith("//")) return asm;
    const lines = asm.split('\n');
    const addrToName = new Map<number, string>();
    const globals = new Map<number, { size: number, data?: number[] }>();
    this.labelToAddr.clear();
    this.addrToLine.clear();

    lines.forEach((l, idx) => {
      const t = l.trim();
      if (t.endsWith(':')) {
          const label = t.slice(0, -1);
          const addr = parseInt(label.substring(2), 16);
          this.labelToAddr.set(label, addr);
          this.addrToLine.set(addr, idx);
      }
    });

    lines.forEach(line => {
      const t = line.trim();
      if (t.startsWith('JMP') && !Array.from(addrToName.values()).includes('main')) {
        const lbl = t.split(' ')[1];
        if (this.labelToAddr.has(lbl)) addrToName.set(this.labelToAddr.get(lbl)!, 'main');
      } else if (t.startsWith('CALL')) {
        const label = t.split(' ')[1];
        if (this.labelToAddr.has(label)) {
            const addr = this.labelToAddr.get(label)!;
            if (!addrToName.has(addr)) addrToName.set(addr, `func_${label.substring(2)}`);
        }
      } else if (t.startsWith('LD_G_') || t.startsWith('LEA_G_')) {
          const addr = parseInt(t.split(' ')[1]);
          if (!globals.has(addr)) globals.set(addr, { size: 4 });
      } else if (t.startsWith('INIT')) {
          const parts = t.split(/\s+/);
          const addr = parseInt(parts[1]);
          const len = parseInt(parts[2]);
          globals.set(addr, { size: len, data: parts.slice(3).map(x => parseInt(x)) });
      }
    });

    // Pass 1.5: Aggressive Global Discovery
    lines.forEach(line => {
        const t = line.trim();
        const parts = t.split(/\s+/), op = parts[0], args = parts.slice(1);
        if (op === 'PUSH_D' || op === 'PUSH_W') {
            const val = parseInt(args[0]);
        const addr = val >= GLOBAL_RAM_START ? val : (val & 0xFFFF);
        if (addr >= GLOBAL_RAM_START && addr < 0x20000 && !globals.has(addr)) globals.set(addr, { size: 4 });
        }
    });

    let bodySrc = "";

    const fAddrs = Array.from(addrToName.keys()).sort((a, b) => a - b);
    const functionInfo = new Map<number, { name: string, params: number, returnsValue: boolean }>();
    fAddrs.forEach((addr, idx) => {
      const sLine = this.addrToLine.get(addr)!;
      const eLine = (idx + 1 < fAddrs.length) ? this.addrToLine.get(fAddrs[idx + 1])! - 1 : lines.length - 1;
      const fl = lines.slice(sLine, eLine + 1).find(l => l.trim().startsWith('FUNC'));
      const params = fl ? parseInt(fl.trim().split(/\s+/)[2]) : 0;
      functionInfo.set(addr, { name: addrToName.get(addr)!, params, returnsValue: false });
    });
    lines.forEach((line, idx) => {
      const t = line.trim();
      if (!t.startsWith('CALL ')) return;
      const label = t.split(/\s+/)[1];
      const calleeAddr = this.labelToAddr.get(label);
      if (calleeAddr === undefined || !functionInfo.has(calleeAddr)) return;
      const nextOp = idx + 1 < lines.length ? lines[idx + 1].trim().split(/\s+/)[0] : '';
      const nextNextOp = idx + 2 < lines.length ? lines[idx + 2].trim().split(/\s+/)[0] : '';
      const consumesReturn =
        (nextOp === 'POP' && (nextNextOp === 'JZ' || nextNextOp === 'JNZ')) ||
        nextOp === 'RET' ||
        nextOp === 'JZ' ||
        nextOp === 'JNZ' ||
        VALUE_CONSUMER_OPS.has(nextOp) ||
        nextOp.startsWith('LEA_') ||
        nextOp.startsWith('LD_IND') ||
        nextOp.startsWith('LD_G_O_') ||
        nextOp.startsWith('LD_L_O_');
      if (consumesReturn) functionInfo.get(calleeAddr)!.returnsValue = true;
    });

    let current: { name: string, locals: Map<number, { size: number, isArray: boolean, data?: string[] }>, params: number, returnsValue: boolean } | null = null;
    let stack: string[] = [];

    const typedHandle = (kind: 'char' | 'int' | 'long', expr: string) => `__lavptr_${kind}__(${expr})`;

    const parseTypedHandle = (expr: string | undefined): { kind: 'char' | 'int' | 'long', expr: string } | null => {
      if (!expr) return null;
      const match = expr.match(/^__lavptr_(char|int|long)__\((.*)\)$/);
      if (!match) return null;
      return { kind: match[1] as 'char' | 'int' | 'long', expr: match[2] };
    };

    const stripOuterParens = (expr: string) => {
      let value = expr.trim();
      while (value.startsWith('(') && value.endsWith(')')) {
        let depth = 0;
        let balanced = true;
        for (let i = 0; i < value.length; i++) {
          const ch = value[i];
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
          if (depth === 0 && i < value.length - 1) {
            balanced = false;
            break;
          }
        }
        if (!balanced) break;
        value = value.slice(1, -1).trim();
      }
      return value;
    };

    const simplifyHandleBits = (expr: string) => {
      let value = expr.trim();
      const handleBits = new Set([
        HANDLE_TYPE_BYTE.toString(),
        HANDLE_TYPE_WORD.toString(),
        HANDLE_TYPE_DWORD.toString(),
        HANDLE_BASE_EBP.toString(),
      ]);
      while (true) {
        const stripped = stripOuterParens(value);
        const match = stripped.match(/^(.*)\|\s*(-?\d+)$/);
        if (!match) return stripped;
        const rhs = match[2].trim();
        if (!handleBits.has(rhs)) return stripped;
        value = match[1].trim();
      }
    };

    const evalOrExpression = (expr: string): number | null => {
      const stripped = stripOuterParens(expr).replace(/[()]/g, '').trim();
      if (!stripped || !/^[-\d\s|]+$/.test(stripped)) return null;
      const parts = stripped.split('|').map(part => part.trim()).filter(Boolean);
      if (!parts.length) return null;
      let result = 0;
      for (const part of parts) {
        const num = parseInt(part, 10);
        if (isNaN(num)) return null;
        result |= num;
      }
      return result;
    };

    const resolveHandleNumber = (val: number) => {
      const hasHandleBits = !!(val & (HANDLE_BASE_EBP | HANDLE_TYPE_BYTE | HANDLE_TYPE_WORD | HANDLE_TYPE_DWORD));
      if (!hasHandleBits && val >= GLOBAL_RAM_START) {
        return `g_${val.toString(16)}`;
      }
      const addr = val & 0xFFFF;
      const isEBP = !!(val & HANDLE_BASE_EBP);
      if (isEBP) {
        if (current) {
          const pLimit = 5 + current.params * 4;
          if (addr >= 5 && addr < pLimit) return `p_${addr}`;
          if (!current.locals.has(addr)) current.locals.set(addr, { size: 4, isArray: false });
          return `l_${addr}`;
        }
        return `local_${addr}`;
      }
      if (globals.has(addr) || addr >= GLOBAL_RAM_START) return `g_${addr.toString(16)}`;
      return String(addr);
    };

    const resolveAddrLiteral = (lit: string | undefined): string => {
      if (!lit) return '0';
      const typed = parseTypedHandle(lit);
      if (typed) return typedHandle(typed.kind, resolveAddrLiteral(typed.expr));

      const directEval = evalOrExpression(lit);
      if (directEval !== null) return resolveHandleNumber(directEval);

      const simplified = simplifyHandleBits(lit);
      const evaluated = evalOrExpression(simplified);
      if (evaluated !== null) return resolveHandleNumber(evaluated);
      if (/^-?\d+$/.test(simplified)) return resolveHandleNumber(parseInt(simplified, 10));
      return simplified;
    };

    const getGlobalAddr = (addr: number) => {
      const name = `g_${addr.toString(16)}`;
      return name;
    };

    const normalizeCondition = (expr: string | undefined) => {
      const resolved = resolveAddrLiteral(expr);
      if (!resolved || resolved === '""' || resolved === '"\\""') return '0';
      return resolved;
    };

    const formatTypedRead = (expr: string | undefined, forceKind?: 'char' | 'int' | 'long') => {
      const resolved = resolveAddrLiteral(expr);
      const typed = parseTypedHandle(resolved);
      const kind = forceKind || typed?.kind || 'char';
      const addrExpr = typed ? resolveAddrLiteral(typed.expr) : resolved;
      const directVar = addrExpr.match(/^&(g_[0-9a-f]+|l_\d+|p_\d+(?:\[[^\]]+\])?|l_\d+(?:\[[^\]]+\])?|g_[0-9a-f]+(?:\[[^\]]+\])?)$/);
      if (directVar) return directVar[1];
      if (kind === 'char') return `*(${addrExpr})`;
      if (kind === 'int') return `(int *)(${addrExpr})`;
      return `(long *)(${addrExpr})`;
    };

    const formatStoreTarget = (expr: string | undefined) => {
      const resolved = resolveAddrLiteral(expr);
      const typed = parseTypedHandle(resolved);
      const addrExpr = typed ? resolveAddrLiteral(typed.expr) : resolved;
      const directValuePattern = /^(g_[0-9a-f]+|l_\d+|p_\d+)(?:\[[^\]]+\])?$/;
      const directVar = addrExpr.match(/^&(g_[0-9a-f]+|l_\d+|p_\d+(?:\[[^\]]+\])?|l_\d+(?:\[[^\]]+\])?|g_[0-9a-f]+(?:\[[^\]]+\])?)$/);
      if (directVar) return directVar[1];
      if (!typed) {
        if (directValuePattern.test(addrExpr)) return addrExpr;
        if (addrExpr.startsWith('&')) return addrExpr.substring(1);
        return `*(${addrExpr})`;
      }
      if (typed.kind === 'char') return `*(${addrExpr})`;
      if (typed.kind === 'int') return `*(int *)(${addrExpr})`;
      return `*(long *)(${addrExpr})`;
    };

    let emittedLabels = new Set<string>();

    const decompileBlock = (start: number, end: number, indent: string): string => {
      let bSrc = "";
      let pendingBranchCond: string | null = null;
      for (let i = start; i <= end; i++) {
        const t = lines[i].trim();
        if (!t || t.startsWith('SPACE') || t.startsWith('INIT') || t.startsWith('F_FLAG')) continue;
        if (t.endsWith(':')) {
          if (emittedLabels.has(t)) continue;
          emittedLabels.add(t);
          bSrc += `${t}\n`;
          continue;
        }
        const parts = t.split(/\s+/), op = parts[0], args = parts.slice(1);
        
        // Pattern 1: PUSH_*  value + PUSH_D encoded_addr + SWAP + STORE + POP (local array initialization)
        if ((op === 'PUSH_B' || op === 'PUSH_W' || op === 'PUSH_D') && i + 4 <= end) {
          const n1 = lines[i+1].trim().split(/\s+/);
          const n2 = lines[i+2].trim().split(/\s+/);
          const n3 = lines[i+3].trim().split(/\s+/);
          
          if ((n1[0] === 'PUSH_D' || n1[0] === 'PUSH_W') && n2[0] === 'SWAP' && n3[0] === 'STORE') {
            const firstVal = parseInt(args[0] || '0');
            const encodedAddr = parseInt(n1[1] || '0');
            const hasEBP = !!(encodedAddr & 0x800000);
            
            if (hasEBP) {
              const offset = encodedAddr & 0xFFFF;
              const values: string[] = [`0x${(firstVal & 0xFF).toString(16).toUpperCase().padStart(2, '0')}`];
              let j = i + 4; // After STORE
              
              // Skip POP
              if (j <= end && lines[j].trim() === 'POP') j++;
              
              // Look for more values in the sequence
              while (j + 4 <= end) {
                const p0 = lines[j].trim().split(/\s+/);
                const p1 = lines[j+1].trim().split(/\s+/);
                const p2 = lines[j+2].trim().split(/\s+/);
                const p3 = lines[j+3].trim().split(/\s+/);
                
                if ((p0[0] === 'PUSH_B' || p0[0] === 'PUSH_W' || p0[0] === 'PUSH_D') &&
                    (p1[0] === 'PUSH_D' || p1[0] === 'PUSH_W') &&
                    p2[0] === 'SWAP' &&
                    p3[0] === 'STORE') {
                  
                  const val = parseInt(p0[1] || '0');
                  const nextAddr = parseInt(p1[1] || '0');
                  const nextOffset = nextAddr & 0xFFFF;
                  
                  if ((nextAddr & 0x800000) && nextOffset === offset + values.length) {
                    values.push(`0x${(val & 0xFF).toString(16).toUpperCase().padStart(2, '0')}`);
                    j += 4;
                    if (j <= end && lines[j].trim() === 'POP') j++;
                  } else {
                    break;
                  }
                } else {
                  break;
                }
              }
              
              // Mark this as an array if we found multiple values
              if (values.length >= 2 && current) {
                current.locals.set(offset, { size: values.length, isArray: true, data: values });
                i = j - 1;
                continue;
              }
            }
          }
        }
        
        // Pattern 2: LEA_L_ + PUSH + STORE + POP (alternative array pattern)
        if (op.startsWith('LEA_L_') && i + 3 <= end) {
            const n1 = lines[i+1].trim().split(/\s+/), n2 = lines[i+2].trim().split(/\s+/), n3 = lines[i+3].trim().split(/\s+/);
            if (n1[0].startsWith('PUSH_') && n2[0] === 'STORE' && n3[0] === 'POP') {
                const sOff = parseInt(args[0]), values: string[] = []; let k = i;
                while (k + 3 <= end) {
                    const cO = lines[k].trim().split(/\s+/), cV = lines[k+1].trim().split(/\s+/), cS = lines[k+2].trim().split(/\s+/), cP = lines[k+3].trim().split(/\s+/);
                    if (cO[0].startsWith('LEA_L_') && parseInt(cO[1]) === sOff + values.length && cV[0].startsWith('PUSH_') && cS[0] === 'STORE' && cP[0] === 'POP') {
                        values.push('0x' + (parseInt(cV[1]) & 0xFF).toString(16)); k += 4;
                    } else break;
                }
                if (values.length > 2) { current!.locals.set(sOff, { size: values.length, isArray: true, data: values }); i = k - 1; continue; }
            }
        }

        if (op === 'FUNC' || op === 'RET' || op === 'EXIT' || op === 'DBG' || op === 'FUNCID' || op === 'VOID' || op === 'PASS') {
            if (op === 'RET') {
              // Flush leftover expressions from void function calls that were pushed to the stack
              // but never consumed. Keep the last item as the (optional) return value.
              while (stack.length > 1) {
                  const v = resolveAddrLiteral(stack.shift()!);
                  if (v && (v.includes('(') || v.includes('='))) bSrc += `${indent}${v};\n`;
              }
              const rv = stack.length ? resolveAddrLiteral(stack.pop()) : "";
              const strippedRv = rv ? stripOuterParens(rv) : "";
              const isZeroReturn = strippedRv === '0' || /^0x0+$/i.test(strippedRv);
              if (rv && current && current.name !== 'main' && (!isZeroReturn || current.returnsValue)) {
                current.returnsValue = true;
                bSrc += `${indent}return ${rv};\n`;
              } else {
                if (rv && (rv.includes('(') || rv.includes('=') || rv.includes('++') || rv.includes('--')) && !isZeroReturn) {
                  bSrc += `${indent}${rv};\n`;
                }
                bSrc += `${indent}return;\n`;
              }
          }
          if (op === 'EXIT' && current?.name !== 'main') bSrc += `${indent}exit(0);\n`;
          continue;
        }

        // Handle user-defined function calls
        if (op === 'CALL') {
          const funcLabel = args[0];
          const funcAddr = this.labelToAddr.get(funcLabel);
          const funcName = funcAddr !== undefined ? (addrToName.get(funcAddr) || funcLabel) : funcLabel;
          // Find param count from the called function's FUNC instruction
          let paramCount = 0;
          if (funcAddr !== undefined) {
            const funcStartLine = this.addrToLine.get(funcAddr);
            if (funcStartLine !== undefined) {
              for (let k = funcStartLine; k <= Math.min(funcStartLine + 3, lines.length - 1); k++) {
                const lt = lines[k].trim();
                if (lt.startsWith('FUNC')) { paramCount = parseInt(lt.split(/\s+/)[2]) || 0; break; }
              }
            }
          }
          const callArgs: string[] = [];
          for (let k = 0; k < paramCount; k++) callArgs.unshift(resolveAddrLiteral(stack.pop() || '0'));
          const callExpr = `${funcName}(${callArgs.join(', ')})`;
          // Determine if the return value is consumed by the immediately following instruction
          const nextParts = i + 1 <= end ? lines[i + 1].trim().split(/\s+/) : [];
          const nextOp2 = nextParts[0] || '';
          if (nextOp2 === 'POP') {
            // Non-void called as a statement, return value discarded
            bSrc += `${indent}${callExpr};\n`;
            i++; // skip POP
          } else if (VALUE_CONSUMER_OPS.has(nextOp2) || nextOp2.startsWith('LEA_') || nextOp2.startsWith('LD_IND')) {
            // Return value used in an expression
            stack.push(callExpr);
          } else {
            // Void function call (no return value consumed)
            bSrc += `${indent}${callExpr};\n`;
          }
          continue;
        }
        // Handle POP+JZ/JNZ fusion: skip POP if next is JZ/JNZ (combined pattern)
        if (op === 'POP') {
          const nextOp = i + 1 <= end ? lines[i+1].trim().split(/\s+/)[0] : "";
          if (nextOp === 'JZ' || nextOp === 'JNZ') {
            pendingBranchCond = normalizeCondition(stack.pop());
            continue;
          }
        }
        if (op === 'JZ' || op === 'JNZ') {
          const rawCond = pendingBranchCond ?? normalizeCondition(stack.pop());
          pendingBranchCond = null;
          const cond = op === 'JNZ' ? `!(${rawCond})` : rawCond;
          const target = args[0], tAddr = this.labelToAddr.get(target);
          if (tAddr !== undefined) {
              const targetLine = this.addrToLine.get(tAddr)!, pT = lines[targetLine - 1]?.trim() || "";
              if (pT.startsWith('JMP')) {
                  const jL = pT.split(' ')[1], ja = this.labelToAddr.get(jL);
                  if (ja !== undefined) {
                      const jLine = this.addrToLine.get(ja)!;
                      if (jLine < i) { bSrc += `${indent}while (${cond}) {\n${decompileBlock(i + 1, targetLine - 2, indent + "  ")}${indent}}\n`; i = targetLine - 1; continue; }
                      if (jLine > targetLine) { bSrc += `${indent}if (${cond}) {\n${decompileBlock(i + 1, targetLine - 2, indent + "  ")}${indent}} else {\n${decompileBlock(targetLine + 1, jLine - 1, indent + "  ")}${indent}}\n`; i = jLine - 1; continue; }
                  }
              }
              bSrc += `${indent}if (${cond}) {\n${decompileBlock(i + 1, targetLine - 1, indent + "  ")}${indent}}\n`;
              i = targetLine - 1; continue;
          }
        }
        if (op === 'JMP') { bSrc += `${indent}goto ${args[0]};\n`; continue; }
        const nO = i + 1 <= end ? lines[i+1].trim() : "";
        const iSP = op === 'STORE' && nO === 'POP';
        this.handleOp(
          op,
          args,
          stack,
          (s) => bSrc += `${indent}${s};\n`,
          current!,
          iSP,
          resolveAddrLiteral,
          { typedHandle, parseTypedHandle, formatTypedRead, formatStoreTarget, getGlobalAddr, stripOuterParens },
        );
        if (iSP) i++;
      }
      return bSrc;
    };

    fAddrs.forEach((addr, idx) => {
        let sLine = this.addrToLine.get(addr)!, eLine = (idx + 1 < fAddrs.length) ? this.addrToLine.get(fAddrs[idx + 1])! - 1 : lines.length - 1;
        const info = functionInfo.get(addr)!;
      emittedLabels = new Set();
        current = { name: info.name, locals: new Map(), params: info.params, returnsValue: info.returnsValue }; stack = [];
        let body = decompileBlock(sLine + 1, eLine, "  ");
        for (const match of body.matchAll(/\bl_(\d+)\b/g)) {
          const off = parseInt(match[1], 10);
          if (!current.locals.has(off)) current.locals.set(off, { size: 4, isArray: false });
        }
        const returnType = current.returnsValue && current.name !== 'main' ? 'int' : 'void';
        bodySrc += `${returnType} ${current.name}(${Array.from({length: current.params}, (_, j) => `int p_${5+j*4}`).join(', ')}) {\n`;
        Array.from(current.locals.entries()).sort((a, b) => a[0] - b[0]).forEach(([off, info]) => {
          if (info.isArray) bodySrc += `  char l_${off}[] = { ${info.data?.join(', ')} };\n`;
          else bodySrc += `  int l_${off};\n`;
        });
        bodySrc += body + "}\n\n";
    });

    const referencedGlobals = new Set<number>();
    for (const match of bodySrc.matchAll(/\bg_([0-9a-f]+)\b/g)) {
      referencedGlobals.add(parseInt(match[1], 16));
    }
    referencedGlobals.forEach(addr => {
      if (!globals.has(addr)) globals.set(addr, { size: 4 });
    });

    let src = "// Decompiled LavaX Source\n\n";
    Array.from(globals.keys()).sort((a, b) => a - b).forEach(addr => {
        const info = globals.get(addr)!;
        if (info.data) src += `char g_${addr.toString(16)}[] = { ${info.data.map(b => '0x' + b.toString(16)).join(', ')} };\n`;
        else src += `int g_${addr.toString(16)};\n`;
    });
    src += "\n";
    src += bodySrc;
    return src;
  }

  private handleOp(op: string, args: string[], stack: string[], emit: (s: string) => void, func: any, iSP: boolean, resolveAddr: any, helpers: any) {
    const getLocal = (off: number) => {
      const paramLimit = 5 + func.params * 4;
      if (off >= 5 && off < paramLimit) return `p_${off}`;
      for (const [start, info] of func.locals.entries()) {
          if (off >= start && off < start + info.size) {
              if (info.isArray) return `l_${start}[${off - start}]`;
              if (off === start) return `l_${start}`;
          }
      }
      func.locals.set(off, { size: 4, isArray: false });
      return `l_${off}`;
    };
    const deref = (s: string | undefined) => helpers.formatStoreTarget(s);
    const getAddr = (off: number) => { for (const [start, info] of func.locals.entries()) { if (off === start && info.isArray) return `l_${start}`; } return `&${getLocal(off)}`; };
    const directValuePattern = /^(g_[0-9a-f]+|l_\d+|p_\d+)(?:\[[^\]]+\])?$/;
    const buildIncDecExpr = (operand: string | undefined, delta: 1 | -1, postfix: boolean) => {
      const resolvedOperand = resolveAddr(operand);
      const targetExpr = deref(resolvedOperand);
      if (directValuePattern.test(targetExpr)) {
        if (postfix) return `${targetExpr}${delta > 0 ? '++' : '--'}`;
        return `${delta > 0 ? '++' : '--'}${targetExpr}`;
      }
      const typed = helpers.parseTypedHandle(resolvedOperand);
      const readExpr = helpers.formatTypedRead(resolvedOperand, typed?.kind);
      return `(${targetExpr} = ${readExpr} ${delta > 0 ? '+' : '-'} 1)`;
    };

    switch (op) {
      case 'PUSH_B': case 'PUSH_W': case 'PUSH_D': stack.push(args[0]); break;
      case 'PUSH_STR': stack.push(args.join(' ')); break;
      case 'LD_G_B': case 'LD_G_W': case 'LD_G_D': stack.push(`g_${parseInt(args[0]).toString(16)}`); break;
      case 'LD_L_B': case 'LD_L_W': case 'LD_L_D': stack.push(getLocal(parseInt(args[0]))); break;
      case 'LEA_G_B': { const idx = resolveAddr(stack.pop()); stack.push(helpers.typedHandle('char', `${helpers.getGlobalAddr(parseInt(args[0]))} + ${idx}`)); break; }
      case 'LEA_G_W': { const idx = resolveAddr(stack.pop()); stack.push(helpers.typedHandle('int', `${helpers.getGlobalAddr(parseInt(args[0]))} + ${idx}`)); break; }
      case 'LEA_G_D': { const idx = resolveAddr(stack.pop()); stack.push(helpers.typedHandle('long', `${helpers.getGlobalAddr(parseInt(args[0]))} + ${idx}`)); break; }
      case 'LEA_L_B': { const idx = resolveAddr(stack.pop()); stack.push(helpers.typedHandle('char', `${getAddr(parseInt(args[0]))} + ${idx}`)); break; }
      case 'LEA_L_W': { const idx = resolveAddr(stack.pop()); stack.push(helpers.typedHandle('int', `${getAddr(parseInt(args[0]))} + ${idx}`)); break; }
      case 'LEA_L_D': { const idx = resolveAddr(stack.pop()); stack.push(helpers.typedHandle('long', `${getAddr(parseInt(args[0]))} + ${idx}`)); break; }
      case 'LEA_OFT': if (stack.length) stack[stack.length - 1] = `(${resolveAddr(stack[stack.length - 1])} + ${args[0]})`; break;
      case 'LEA_L_PH': if (stack.length) stack[stack.length - 1] = `(${resolveAddr(stack[stack.length - 1])} + ${args[0]})`; break;
      case 'LEA_ABS': stack.push(resolveAddr(args[0])); break;
      case 'PUSH_ADDR': if (stack.length) stack[stack.length - 1] = `(${resolveAddr(stack[stack.length - 1])} + ${args[0]})`; break;
      case 'STORE': {
        const val = resolveAddr(stack.pop());
        const rawAddrExpr = resolveAddr(stack.pop());
        // Try to evaluate address as a numeric handle encoding (offset | EBP_flag | type_bits)
        // e.g. "((9 | 8388608) | 131072)" → resolve as local var at offset 9
        const lhs = (() => {
          const cleaned = rawAddrExpr.replace(/[()]/g, '').trim();
          if (/^[\d\s|]+$/.test(cleaned)) {
            const parts = cleaned.split('|');
            let result = 0, valid = true;
            for (const p of parts) { const n = parseInt(p.trim()); if (isNaN(n)) { valid = false; break; } result |= n; }
            if (valid) {
              const resolved = resolveAddr(String(result));
              if (resolved !== String(result)) return deref(resolved);
            }
          }
          return deref(rawAddrExpr);
        })();
        if (iSP) {
          emit(`${lhs} = ${val}`);
        } else {
          stack.push(`(${lhs} = ${val})`);
        }
        break;
      }
      case 'POP': if (stack.length) { const v = resolveAddr(stack.pop())!; if (v.includes('(') || v.includes('=') || v.includes('++') || v.includes('--')) emit(v); } break;
      case 'ADD': case 'SUB': case 'MUL': case 'DIV': case 'MOD': case 'AND': case 'OR': case 'XOR': case 'SHL': case 'SHR': case 'EQ': case 'NEQ': case 'LT': case 'GT': case 'LE': case 'GE': case 'L_AND': case 'L_OR': { const b = stack.pop() || "0", a = stack.pop() || "0"; const ops:any = {ADD:'+',SUB:'-',MUL:'*',DIV:'/',MOD:'%',AND:'&',OR:'|',XOR:'^',SHL:'<<',SHR:'>>',EQ:'==',NEQ:'!=',LT:'<',GT:'>',LE:'<=',GE:'>=',L_AND:'&&',L_OR:'||'}; stack.push(`(${a} ${ops[op]} ${b})`); break; }
      case 'ADD_C': case 'SUB_C': case 'MUL_C': case 'DIV_C': case 'MOD_C': case 'SHL_C': case 'SHR_C': case 'EQ_C': case 'NEQ_C': case 'GT_C': case 'LT_C': case 'GE_C': case 'LE_C': {
        const a = stack.pop() || '0';
        const imm = args[0] || '0';
        const ops:any = {ADD_C:'+',SUB_C:'-',MUL_C:'*',DIV_C:'/',MOD_C:'%',SHL_C:'<<',SHR_C:'>>',EQ_C:'==',NEQ_C:'!=',GT_C:'>',LT_C:'<',GE_C:'>=',LE_C:'<='};
        stack.push(`(${a} ${ops[op]} ${imm})`);
        break;
      }
      case 'NEG': case 'NOT': case 'L_NOT': { const ops:any = {NEG:'-',NOT:'~',L_NOT:'!'}; stack.push(`(${ops[op]}${stack.pop()})`); break; }
      case 'INC_PRE': stack.push(buildIncDecExpr(stack.pop(), 1, false)); break;
      case 'DEC_PRE': stack.push(buildIncDecExpr(stack.pop(), -1, false)); break;
      case 'INC_POS': stack.push(buildIncDecExpr(stack.pop(), 1, true)); break;
      case 'DEC_POS': stack.push(buildIncDecExpr(stack.pop(), -1, true)); break;
      case 'LD_IND': stack.push(helpers.formatTypedRead(stack.pop())); break;
      case 'LD_IND_W': stack.push(helpers.formatTypedRead(stack.pop(), 'int')); break;
      case 'LD_IND_D': stack.push(helpers.formatTypedRead(stack.pop(), 'long')); break;
      case 'LD_L_O_B':
      case 'LD_L_O_W':
      case 'LD_L_O_D':
      case 'LD_G_O_B':
      case 'LD_G_O_W':
      case 'LD_G_O_D': {
        const rawOffsetExpr = resolveAddr(stack.pop());
        const isLocal = op.startsWith('LD_L_');
        const kind = op.endsWith('_B') ? 'char' : (op.endsWith('_W') ? 'int' : 'long');
        const inlineOffset = parseInt(args[0] || '0', 10) || 0;
        const buildOffsetAddress = (expr: string) => {
          const normalized = helpers.stripOuterParens(expr);
          const forms = [
            normalized.match(/^(.*)\+\s*(-?\d+)$/),
            normalized.match(/^(-?\d+)\s*\+\s*(.*)$/),
          ].filter(Boolean) as RegExpMatchArray[];
          const directNumeric = /^-?\d+$/.test(normalized) ? parseInt(normalized, 10) : null;
          const baseToExpr = (baseOffset: number, dynamicExpr?: string) => {
            const baseAddr = isLocal ? getAddr(baseOffset) : helpers.getGlobalAddr(baseOffset);
            if (!dynamicExpr) return baseAddr;
            return `(${baseAddr} + ${helpers.stripOuterParens(dynamicExpr)})`;
          };
          if (directNumeric !== null) return baseToExpr(directNumeric + inlineOffset);
          for (const match of forms) {
            const left = match[1].trim();
            const right = match[2].trim();
            if (/^-?\d+$/.test(right)) return baseToExpr(parseInt(right, 10) + inlineOffset, left);
            if (/^-?\d+$/.test(left)) return baseToExpr(parseInt(left, 10) + inlineOffset, right);
          }
          const numericEval = /^[-\d\s|]+$/.test(normalized) ? parseInt(normalized, 10) : NaN;
          if (!isNaN(numericEval)) return baseToExpr(numericEval + inlineOffset);
          const fallbackBase = isLocal ? getAddr(inlineOffset) : helpers.getGlobalAddr(inlineOffset);
          return `(${fallbackBase} + ${normalized})`;
        };
        stack.push(helpers.formatTypedRead(buildOffsetAddress(rawOffsetExpr), kind));
        break;
      }
      case 'CPTR': stack.push(helpers.typedHandle('char', resolveAddr(stack.pop()))); break;
      case 'CIPTR': stack.push(helpers.typedHandle('int', resolveAddr(stack.pop()))); break;
      case 'CLPTR': stack.push(helpers.typedHandle('long', resolveAddr(stack.pop()))); break;
      case 'L2C': stack.push(`(char)(${resolveAddr(stack.pop())})`); break;
      case 'L2I': stack.push(`(int)(${resolveAddr(stack.pop())})`); break;
      case 'DUP': if (stack.length) stack.push(stack[stack.length - 1]); break;
      case 'SWAP': if (stack.length >= 2) { const t = stack[stack.length-1]; stack[stack.length-1] = stack[stack.length-2]; stack[stack.length-2] = t; } break;
      default:
        if (SystemOp[op as any] !== undefined || op in SystemOp) {
          const spec: any = {
            putchar: [0], getchar: [], printf: [], sprintf: [], strcpy: [1, 1], strcat: [1, 1], strlen: [1],
            strchr: [1, 0], strcmp: [1, 1], strstr: [1, 1], memset: [1, 0, 0], memcpy: [1, 1, 0], memmove: [1, 1, 0],
            SetScreen: [0], UpdateLCD: [0], Delay: [0], WriteBlock: [0, 0, 0, 0, 0, 1], Refresh: [], TextOut: [0, 0, 1, 0],
            Block: [0, 0, 0, 0, 0], Rectangle: [0, 0, 0, 0, 0], exit: [0], ClearScreen: [], abs: [0], rand: [], srand: [0],
            Locate: [0, 0], Inkey: [], Point: [0, 0, 0], GetPoint: [0, 0], Line: [0, 0, 0, 0, 0], Box: [0, 0, 0, 0, 0, 0],
            Circle: [0, 0, 0, 0, 0], Ellipse: [0, 0, 0, 0, 0, 0], Beep: [], isalnum: [0], isalpha: [0], iscntrl: [0],
            isdigit: [0], isgraph: [0], islower: [0], isprint: [0], ispunct: [0], isspace: [0], isupper: [0], isxdigit: [0],
            tolower: [0], toupper: [0], fopen: [1, 1], fclose: [0], fread: [1, 0, 0, 0], fwrite: [1, 0, 0, 0], fseek: [0, 0, 0],
            ftell: [0], feof: [0], rewind: [0], getc: [0], putc: [0, 0], MakeDir: [1], DeleteFile: [1], Getms: [], CheckKey: [0],
            Crc16: [1, 0], Secret: [1, 0, 1], ChDir: [1], FileList: [1], GetTime: [1], SetTime: [1], GetWord: [], XDraw: [0],
            ReleaseKey: [0], GetBlock: [0, 0, 0, 0, 0, 1], Sin: [0], Cos: [0], FillArea: [0, 0, 0], PutKey: [0], FindWord: [0],
            PlayInit: [0], PlayFile: [0], PlayStops: [], SetVolume: [0], PlaySleep: [], opendir: [1], readdir: [0], rewinddir: [0],
            closedir: [0], Refresh2: [], open_key: [0], close_key: [], PlayWordVoice: [0], sysexecset: [0], open_uart: [0, 0],
            close_uart: [], write_uart: [0, 0], read_uart: [0, 0], RefreshIcon: [], SetFgColor: [0], SetBgColor: [0], SetPalette: [0, 0, 1],
            SetGraphMode: [0],
          };
          let c = 0; let argSpecs: number[] = []; if (spec[op]) { argSpecs = spec[op]; c = argSpecs.length; }
          if (op === 'printf' || op === 'sprintf') { const countStr = stack.pop(); c = (countStr !== undefined) ? (parseInt(countStr) || 0) : 0; argSpecs = Array(c).fill(0); if (op === 'printf') argSpecs[0] = 1; else if (op === 'sprintf') { argSpecs[0] = 1; argSpecs[1] = 1; } }
          const a: string[] = []; for (let i = 0; i < c; i++) {
              let val = stack.pop() || '0';
              const argIdxFromRight = c - 1 - i;
              
              // For array parameter arguments (markers like 1 in spec), try to recover array name from local variables
              if (argSpecs[argIdxFromRight] === 1 && func) {
                const rawVal = val.trim();
                // Check if this value is a simple number that corresponds to a local array offset
                if (/^\d+$/.test(rawVal)) {
                  const offset = parseInt(rawVal);
                  // Check if this offset corresponds to a known local array
                  for (const [start, info] of func.locals.entries()) {
                    if (info.isArray && start === offset) {
                      val = `l_${start}`;
                      break;
                    }
                  }
                }
              }
              
              val = resolveAddr(val);
              if (argSpecs[argIdxFromRight] === 1) val = resolveAddr(val);
              a.unshift(val);
          }
          const call = `${op}(${a.join(', ')})`;
          const returns = ['getchar', 'strlen', 'abs', 'rand', 'Inkey', 'GetPoint', 'isalnum', 'isalpha', 'iscntrl', 'isdigit', 'isgraph', 'islower', 'isprint', 'ispunct', 'isspace', 'isupper', 'isxdigit', 'strchr', 'strcmp', 'strstr', 'tolower', 'toupper', 'fopen', 'fread', 'fwrite', 'fseek', 'ftell', 'feof', 'getc', 'putc', 'MakeDir', 'DeleteFile', 'Getms', 'CheckKey', 'Crc16', 'ChDir', 'FileList', 'GetWord', 'Sin', 'Cos', 'FindWord', 'PlayInit', 'PlayFile', 'opendir', 'readdir', 'closedir', 'read_uart', 'srand', 'GetBlock'];
          if (returns.includes(op)) stack.push(call); else emit(call);
        }
    }
  }
}
