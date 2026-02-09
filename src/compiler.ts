
import { Op, STR_MASK, SystemOp } from './types';
import iconv from 'iconv-lite';

function encodeToGBK(str: string): number[] {
  try {
    const buf = iconv.encode(str, 'gbk');
    return Array.from(buf);
  } catch (e) {
    return Array.from(str).map(c => c.charCodeAt(0) & 0xFF);
  }
}

export class LavaXCompiler {
  private src: string = "";
  private pos: number = 0;
  private asm: string[] = [];
  private labelCount = 0;
  private vars: Map<string, number> = new Map();
  private varOffset = 0;
  private functions: Set<string> = new Set();

  compile(source: string): string {
    this.src = source;
    this.pos = 0;
    this.asm = [];
    this.labelCount = 0;
    this.vars = new Map();
    this.varOffset = 0;
    this.functions = new Set();

    try {
      const tempPos = this.pos;
      while (this.pos < this.src.length) {
        this.skipWhitespace();
        const type = this.peekToken();
        if (!type) break;
        this.parseToken();
        const name = this.parseToken();
        if (this.match('(')) {
          this.functions.add(name);
          let depth = 0;
          while (this.pos < this.src.length) {
            if (this.src[this.pos] === '{') depth++;
            if (this.src[this.pos] === '}') {
              depth--;
              if (depth === 0) { this.pos++; break; }
            }
            this.pos++;
          }
        } else {
          this.match(';');
        }
      }
      this.pos = tempPos;

      this.asm.push('CALL main');
      this.asm.push('EXIT');

      while (this.pos < this.src.length) {
        this.skipWhitespace();
        if (this.pos >= this.src.length) break;
        this.parseTopLevel();
      }
    } catch (e: any) {
      return `ERROR: ${e.message} near: ${this.src.substring(this.pos, this.pos + 30)}...`;
    }
    return this.asm.join('\n');
  }

  private peekToken(): string {
    const oldPos = this.pos;
    const token = this.parseToken();
    this.pos = oldPos;
    return token;
  }

  private match(str: string) {
    this.skipWhitespace();
    if (this.src.startsWith(str, this.pos)) {
      this.pos += str.length;
      return true;
    }
    return false;
  }

  private expect(str: string) {
    if (!this.match(str)) throw new Error(`Expected '${str}'`);
  }

  private skipWhitespace() {
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (/\s/.test(c)) { this.pos++; continue; }
      if (this.src.startsWith('//', this.pos)) {
        while (this.pos < this.src.length && this.src[this.pos] !== '\n') this.pos++;
        continue;
      }
      if (this.src.startsWith('/*', this.pos)) {
        this.pos += 2;
        while (this.pos < this.src.length && !this.src.startsWith('*/', this.pos)) this.pos++;
        this.pos += 2;
        continue;
      }
      break;
    }
  }

  private parseToken(): string {
    this.skipWhitespace();
    const start = this.pos;
    if (this.pos >= this.src.length) return "";

    if (this.src[this.pos] === '"') {
      this.pos++;
      while (this.pos < this.src.length && this.src[this.pos] !== '"') {
        if (this.src[this.pos] === '\\') this.pos++;
        this.pos++;
      }
      this.pos++;
      return this.src.substring(start, this.pos);
    }

    const special = "(){}[],;=+-*/%><!&|";
    if (special.includes(this.src[this.pos])) {
      let op = this.src[this.pos++];
      if ((op === '=' || op === '!' || op === '<' || op === '>') && this.src[this.pos] === '=') op += this.src[this.pos++];
      if ((op === '&' || op === '|') && this.src[this.pos] === op) op += this.src[this.pos++];
      return op;
    }

    while (this.pos < this.src.length && !/\s/.test(this.src[this.pos]) && !special.includes(this.src[this.pos])) {
      this.pos++;
    }
    return this.src.substring(start, this.pos);
  }

  private parseTopLevel() {
    const type = this.parseToken();
    if (!type) return;
    const name = this.parseToken();
    if (this.match('(')) {
      while (!this.match(')')) this.parseToken();
      this.expect('{');
      this.asm.push(`${name}:`);
      this.asm.push('ENTER 64 0');
      this.varOffset = 0;
      this.vars.clear();
      this.parseBlock();
      this.asm.push('PUSH_CHAR 0');
      this.asm.push('RET');
    } else {
      this.vars.set(name, this.varOffset);
      this.varOffset += 4;
      this.match(';');
    }
  }

  private parseBlock() {
    while (this.pos < this.src.length) {
      this.skipWhitespace();
      if (this.src[this.pos] === '}') {
        this.pos++;
        break;
      }
      this.parseStatement();
    }
  }

  private parseStatement() {
    const token = this.peekToken();
    if (!token) return;

    if (token === 'int' || token === 'char' || token === 'long') {
      this.parseToken();
      const name = this.parseToken();
      this.vars.set(name, this.varOffset);
      this.varOffset += 4;
      if (this.match('=')) {
        this.parseExpression();
        this.asm.push(`PUSH_R_ADDR ${this.vars.get(name)}`);
        this.asm.push('STORE');
        this.asm.push('POP');
      }
      this.expect(';');
    } else if (token === 'if') {
      this.parseToken();
      this.expect('(');
      this.parseExpression();
      this.expect(')');
      const labelElse = `L_ELSE_${this.labelCount++}`;
      const labelEnd = `L_END_${this.labelCount++}`;
      this.asm.push(`JZ ${labelElse}`);
      this.parseInnerStatement();
      if (this.match('else')) {
        this.asm.push(`JMP ${labelEnd}`);
        this.asm.push(`${labelElse}:`);
        this.parseInnerStatement();
        this.asm.push(`${labelEnd}:`);
      } else {
        this.asm.push(`${labelElse}:`);
      }
    } else if (token === 'while') {
      this.parseToken();
      const labelStart = `L_WHILE_${this.labelCount++}`;
      const labelEnd = `L_WEND_${this.labelCount++}`;
      this.asm.push(`${labelStart}:`);
      this.expect('(');
      this.parseExpression();
      this.expect(')');
      this.asm.push(`JZ ${labelEnd}`);
      this.parseInnerStatement();
      this.asm.push(`JMP ${labelStart}`);
      this.asm.push(`${labelEnd}:`);
    } else if (token === 'for') {
      this.parseToken();
      this.expect('(');
      if (!this.match(';')) { this.parseExprStmt(); this.expect(';'); }
      const labelStart = `L_FOR_${this.labelCount++}`;
      const labelEnd = `L_FEND_${this.labelCount++}`;
      const labelStep = `L_FSTEP_${this.labelCount++}`;
      this.asm.push(`${labelStart}:`);
      if (!this.match(';')) { this.parseExpression(); this.asm.push(`JZ ${labelEnd}`); this.expect(';'); }
      let stepExprStart = this.pos;
      let parenDepth = 0;
      while (true) {
        if (this.src[this.pos] === '(') parenDepth++;
        if (this.src[this.pos] === ')') {
          if (parenDepth === 0) break;
          parenDepth--;
        }
        this.pos++;
      }
      let stepExprEnd = this.pos;
      this.expect(')');
      this.parseInnerStatement();
      this.asm.push(`${labelStep}:`);
      const savedPos = this.pos;
      this.pos = stepExprStart;
      if (this.pos < stepExprEnd) { this.parseExprStmt(); }
      this.pos = savedPos;
      this.asm.push(`JMP ${labelStart}`);
      this.asm.push(`${labelEnd}:`);
    } else if (token === 'return') {
      this.parseToken();
      if (!this.match(';')) {
        this.parseExpression();
        this.expect(';');
      }
      this.asm.push('RET');
    } else if (this.vars.has(token) && this.peekNextToken() === '=') {
      this.parseExprStmt();
      this.expect(';');
    } else {
      this.parseExpression();
      this.asm.push('POP');
      this.expect(';');
    }
  }

  private parseInnerStatement() {
    if (this.match('{')) this.parseBlock();
    else this.parseStatement();
  }

  private parseExprStmt() {
    const token = this.parseToken();
    if (this.vars.has(token)) {
      this.expect('=');
      this.parseExpression();
      this.asm.push(`PUSH_R_ADDR ${this.vars.get(token)}`);
      this.asm.push('STORE');
      this.asm.push('POP');
    } else {
      this.pos -= token.length;
      this.parseExpression();
      this.asm.push('POP');
    }
  }

  private peekNextToken(): string {
    const oldPos = this.pos;
    this.parseToken();
    const next = this.peekToken();
    this.pos = oldPos;
    return next;
  }

  private parseExpression() {
    this.parseEquality();
  }

  private parseEquality() {
    this.parseRelational();
    while (true) {
      if (this.match('==')) { this.parseRelational(); this.asm.push('EQ'); }
      else if (this.match('!=')) { this.parseRelational(); this.asm.push('NEQ'); }
      else break;
    }
  }

  private parseRelational() {
    this.parseAdditive();
    while (true) {
      if (this.match('<')) { this.parseAdditive(); this.asm.push('LT'); }
      else if (this.match('>')) { this.parseAdditive(); this.asm.push('GT'); }
      else if (this.match('<=')) { this.parseAdditive(); this.asm.push('LE'); }
      else if (this.match('>=')) { this.parseAdditive(); this.asm.push('GE'); }
      else break;
    }
  }

  private parseAdditive() {
    this.parseTerm();
    while (true) {
      if (this.match('+')) { this.parseTerm(); this.asm.push('ADD'); }
      else if (this.match('-')) { this.parseTerm(); this.asm.push('SUB'); }
      else break;
    }
  }

  private parseTerm() {
    this.parseFactor();
    while (true) {
      if (this.match('*')) { this.parseFactor(); this.asm.push('MUL'); }
      else if (this.match('/')) { this.parseFactor(); this.asm.push('DIV'); }
      else if (this.match('%')) { this.parseFactor(); this.asm.push('MOD'); }
      else break;
    }
  }

  private parseFactor() {
    const token = this.parseToken();
    if (!token) return;
    if (token.match(/^[0-9]+$/)) {
      const val = parseInt(token);
      if (val >= 0 && val <= 255) this.asm.push(`PUSH_CHAR ${val}`);
      else if (val >= -32768 && val <= 32767) this.asm.push(`PUSH_INT ${val}`);
      else this.asm.push(`PUSH_LONG ${val}`);
    } else if (token.startsWith('"')) {
      this.asm.push(`ADD_STRING ${token}`);
    } else if (this.vars.has(token)) {
      this.asm.push(`LOAD_R1_LONG ${this.vars.get(token)}`);
    } else if (this.functions.has(token) || SystemOp[token as keyof typeof SystemOp] !== undefined) {
      this.expect('(');
      if (!this.match(')')) {
        do {
          this.parseExpression();
        } while (this.match(','));
        this.expect(')');
      }
      if (SystemOp[token as keyof typeof SystemOp] !== undefined) {
        this.asm.push(`${token}`);
      } else {
        this.asm.push(`CALL ${token}`);
      }
    } else if (token === '(') {
      this.parseExpression();
      this.expect(')');
    } else {
      throw new Error(`Unexpected token: ${token}`);
    }
  }
}

export class LavaXAssembler {
  assemble(asmSource: string): Uint8Array {
    const lines = asmSource.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith(';'));
    const code: number[] = [];
    const labels: Map<string, number> = new Map();
    const fixups: { pos: number, label: string, size: 2 | 3 | 4 }[] = [];

    let currentPos = 0;
    for (const line of lines) {
      if (line.endsWith(':')) { labels.set(line.slice(0, -1), currentPos); continue; }
      const parts = line.split(/\s+/);
      const opcodeStr = parts[0].toUpperCase();
      const op = Op[opcodeStr as keyof typeof Op];
      const sysOp = SystemOp[parts[0] as keyof typeof SystemOp];

      currentPos += 1;
      if (op !== undefined) {
        if (op === Op.PUSH_CHAR) currentPos += 1;
        else if ([Op.PUSH_INT, Op.PUSH_OFFSET_CHAR, Op.PUSH_OFFSET_INT, Op.PUSH_OFFSET_LONG, Op.LOAD_R1_CHAR, Op.LOAD_R1_INT, Op.LOAD_R1_LONG, Op.CALC_R_ADDR_1, Op.PUSH_R_ADDR].includes(op)) currentPos += 2;
        else if ([Op.JZ, Op.JNZ, Op.JMP, Op.CALL].includes(op)) currentPos += 3;
        else if ([Op.PUSH_LONG, Op.PUSH_ADDR_CHAR, Op.PUSH_ADDR_INT, Op.PUSH_ADDR_LONG].includes(op)) currentPos += 4;
        else if (op === Op.ADD_STRING) {
          const start = line.indexOf('"');
          const end = line.lastIndexOf('"');
          const str = (start !== -1 && end !== -1) ? line.substring(start + 1, end) : "";
          currentPos += encodeToGBK(str).length + 1;
        } else if (op === Op.ENTER) {
          currentPos += 3;
        }
      } else if (sysOp !== undefined) {
        currentPos += 1;
      }
    }

    for (const line of lines) {
      if (line.endsWith(':')) continue;
      const parts = line.split(/\s+/);
      const opcodeStr = parts[0].toUpperCase();
      const op = Op[opcodeStr as keyof typeof Op];
      const sysOp = SystemOp[parts[0] as keyof typeof SystemOp];

      if (op !== undefined) {
        code.push(op);
        const arg = parts[1];
        if (op === Op.PUSH_CHAR) {
          code.push(parseInt(arg) & 0xFF);
        } else if ([Op.PUSH_INT, Op.PUSH_OFFSET_CHAR, Op.PUSH_OFFSET_INT, Op.PUSH_OFFSET_LONG, Op.LOAD_R1_CHAR, Op.LOAD_R1_INT, Op.LOAD_R1_LONG, Op.CALC_R_ADDR_1, Op.PUSH_R_ADDR].includes(op)) {
          this.pushInt16(code, parseInt(arg));
        } else if ([Op.PUSH_LONG, Op.PUSH_ADDR_CHAR, Op.PUSH_ADDR_INT, Op.PUSH_ADDR_LONG].includes(op)) {
          this.pushInt32(code, parseInt(arg));
        } else if (op === Op.ENTER) {
          this.pushInt16(code, parseInt(parts[1]));
          code.push(parseInt(parts[2]));
        } else if ([Op.JMP, Op.JZ, Op.JNZ, Op.CALL].includes(op)) {
          fixups.push({ pos: code.length, label: arg, size: 3 });
          this.pushInt24(code, 0);
        } else if (op === Op.ADD_STRING) {
          const str = line.substring(line.indexOf('"') + 1, line.lastIndexOf('"'));
          const bytes = encodeToGBK(str);
          bytes.forEach(b => code.push(b));
          code.push(0);
        }
      } else if (sysOp !== undefined) {
        code.push(sysOp);
      }
    }

    for (const fix of fixups) {
      const addr = labels.get(fix.label) ?? 0;
      if (fix.size === 3) {
        code[fix.pos] = addr & 0xFF;
        code[fix.pos + 1] = (addr >> 8) & 0xFF;
        code[fix.pos + 2] = (addr >> 16) & 0xFF;
      }
    }

    const binary = new Uint8Array(16 + code.length);
    binary.set([0x4C, 0x41, 0x56, 0x12], 0);
    binary[8] = 0x01;
    const SCREEN_WIDTH = 160;
    const SCREEN_HEIGHT = 80;
    binary[9] = SCREEN_WIDTH / 16;
    binary[10] = SCREEN_HEIGHT / 16;
    binary.set(new Uint8Array(code), 16);
    return binary;
  }

  private pushInt16(ops: number[], val: number) {
    ops.push(val & 0xFF, (val >> 8) & 0xFF);
  }
  private pushInt24(ops: number[], val: number) {
    ops.push(val & 0xFF, (val >> 8) & 0xFF, (val >> 16) & 0xFF);
  }
  private pushInt32(ops: number[], val: number) {
    ops.push(val & 0xFF, (val >> 8) & 0xFF, (val >> 16) & 0xFF, (val >> 24) & 0xFF);
  }
}
