
import { Op, STR_MASK, SystemOp } from './types';
import iconv from 'iconv-lite';
import { LavaXAssembler } from './compiler/LavaXAssembler';

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
  private globals: Map<string, number> = new Map();
  private locals: Map<string, number> = new Map();
  private globalOffset = 0x2000;
  private localOffset = 0;
  private functions: Set<string> = new Set();

  compile(source: string): string {
    this.src = source;
    this.pos = 0;
    this.asm = [];
    this.labelCount = 0;
    this.globals = new Map();
    this.locals = new Map();
    this.globalOffset = 0x8000;
    this.localOffset = 0;
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
          this.globals.set(name, this.globalOffset);
          this.globalOffset += 4;
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
      const params: string[] = [];
      if (!this.match(')')) {
        do {
          this.parseToken(); // type
          params.push(this.parseToken()); // name
        } while (this.match(','));
        this.expect(')');
      }
      this.expect('{');
      this.asm.push(`${name}:`);
      this.localOffset = 6;
      this.locals.clear();
      params.forEach((p, i) => {
        this.locals.set(p, 6 + i * 4);
        this.localOffset += 4;
      });
      const localSizePos = this.asm.length;
      this.asm.push('REPLACE_ME_FUNC');
      const startLocalOffset = this.localOffset;
      this.parseBlock();
      const localSize = this.localOffset - startLocalOffset;
      this.asm[localSizePos] = `FUNC ${localSize + 64} ${params.length}`;
      this.asm.push('PUSH_CHAR 0');
      this.asm.push('RET');
    } else {
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
    this.skipWhitespace();
    const token = this.peekToken();
    if (!token) return;

    if (token.endsWith(':')) {
      this.parseToken();
      this.asm.push(token);
      return;
    }

    if (token === 'int' || token === 'char' || token === 'long' || token === 'void' || token === 'addr') {
      this.parseToken();
      const name = this.parseToken();
      this.locals.set(name, this.localOffset);
      const addr = this.localOffset;
      this.localOffset += 4;
      if (this.match('=')) {
        this.parseExpression();
        this.asm.push(`PUSH_R_ADDR ${addr}`);
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
    } else if (token === 'goto') {
      this.parseToken();
      const label = this.parseToken();
      this.asm.push(`JMP ${label}`);
      this.expect(';');
    } else if ((this.locals.has(token) || this.globals.has(token)) && this.peekNextToken() === '=') {
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
    if (this.locals.has(token)) {
      this.expect('=');
      this.parseExpression();
      this.asm.push(`PUSH_R_ADDR ${this.locals.get(token)}`);
      this.asm.push('STORE');
      this.asm.push('POP');
    } else if (this.globals.has(token)) {
      this.expect('=');
      this.parseExpression();
      this.asm.push(`PUSH_LONG ${this.globals.get(token)}`);
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
    if (token.match(/^0x[0-9a-fA-F]+$/)) {
      const val = parseInt(token.substring(2), 16);
      if (val >= 0 && val <= 255) this.asm.push(`PUSH_CHAR ${val}`);
      else if (val >= -32768 && val <= 32767) this.asm.push(`PUSH_INT ${val}`);
      else this.asm.push(`PUSH_LONG ${val}`);
    } else if (token.match(/^[0-9]+$/)) {
      const val = parseInt(token);
      if (val >= 0 && val <= 255) this.asm.push(`PUSH_CHAR ${val}`);
      else if (val >= -32768 && val <= 32767) this.asm.push(`PUSH_INT ${val}`);
      else this.asm.push(`PUSH_LONG ${val}`);
    } else if (token.startsWith('"')) {
      this.asm.push(`ADD_STRING ${token}`);
    } else if (this.locals.has(token)) {
      this.asm.push(`LOAD_R1_LONG ${this.locals.get(token)}`);
    } else if (this.globals.has(token)) {
      this.asm.push(`PUSH_ADDR_LONG ${this.globals.get(token)}`);
    } else if (this.functions.has(token) || SystemOp[token as keyof typeof SystemOp] !== undefined) {
      this.expect('(');
      const isVariadic = token === 'printf' || token === 'sprintf';
      if (isVariadic) {
        const args: string[][] = [];
        if (!this.match(')')) {
          do {
            const currentAsm = this.asm;
            this.asm = [];
            this.parseExpression();
            args.push(this.asm);
            this.asm = currentAsm;
          } while (this.match(','));
          this.expect(')');
        }
        for (let i = args.length - 1; i >= 0; i--) {
          this.asm.push(...args[i]);
        }
        this.asm.push(`PUSH_CHAR ${args.length}`);
      } else {
        if (!this.match(')')) {
          do {
            this.parseExpression();
          } while (this.match(','));
          this.expect(')');
        }
      }

      if (SystemOp[token as keyof typeof SystemOp] !== undefined) {
        this.asm.push(`${token}`);
      } else {
        this.asm.push(`CALL ${token}`);
      }
    } else if (token === '(') {
      this.parseExpression();
      this.expect(')');
    } else if (token === '-') {
      this.parseFactor();
      this.asm.push('NEG');
    } else {
      throw new Error(`Unexpected token: ${token}`);
    }
  }
}

export { LavaXAssembler };
