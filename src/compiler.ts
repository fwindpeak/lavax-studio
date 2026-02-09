
import { Op, STR_MASK, Syscall } from './types';
import iconv from 'https://esm.sh/iconv-lite';

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
      // First pass: collect function names
      const tempPos = this.pos;
      while (this.pos < this.src.length) {
        this.skipWhitespace();
        const type = this.peekToken();
        if (!type) break;
        this.parseToken(); // consume type
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
      this.varOffset = 0;
      this.vars.clear();
      this.parseBlock();
      this.asm.push('RET');
    } else {
      this.vars.set(name, this.varOffset++);
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

    if (token === 'int' || token === 'char') {
      this.parseToken(); // consume type
      const name = this.parseToken();
      this.vars.set(name, this.varOffset++);
      if (this.match('=')) {
        this.parseExpression();
        this.asm.push(`STO ${this.vars.get(name)}`);
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
      // init
      if (!this.match(';')) { this.parseExprStmt(); this.expect(';'); }
      const labelStart = `L_FOR_${this.labelCount++}`;
      const labelEnd = `L_FEND_${this.labelCount++}`;
      const labelStep = `L_FSTEP_${this.labelCount++}`;
      this.asm.push(`${labelStart}:`);
      // condition
      if (!this.match(';')) { this.parseExpression(); this.asm.push(`JZ ${labelEnd}`); this.expect(';'); }
      // step expression skip for now
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
      // parse step expression
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
      this.asm.push(`STO ${this.vars.get(token)}`);
    } else {
      this.pos -= token.length; // backtrack
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
      this.asm.push(`LIT ${token}`);
    } else if (token.startsWith('"')) {
      this.asm.push(`LIT ${token}`);
    } else if (this.vars.has(token)) {
      this.asm.push(`LOD ${this.vars.get(token)}`);
    } else if (this.functions.has(token) || Object.values(Syscall).includes(token)) {
      this.expect('(');
      let argCount = 0;
      if (!this.match(')')) {
        do {
          this.parseExpression();
          argCount++;
        } while (this.match(','));
        this.expect(')');
      }
      if (Syscall[token as keyof typeof Syscall]) {
        this.asm.push(`SYS ${token}`);
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
    const fixups: { pos: number, label: string }[] = [];
    const strings: string[] = [];
    
    let currentPos = 0;
    for (const line of lines) {
      if (line.endsWith(':')) { labels.set(line.slice(0, -1), currentPos); continue; }
      const parts = line.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      const opcode = parts[0].toUpperCase();
      currentPos += 1;
      if (['LIT', 'LOD', 'STO', 'JMP', 'JZ', 'JNZ', 'CALL', 'SYS'].includes(opcode)) currentPos += 4;
    }

    for (const line of lines) {
      if (line.endsWith(':')) continue;
      const parts = line.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      const opcode = parts[0].toUpperCase();
      const arg = parts[1];

      const opCodeValue = Op[opcode as keyof typeof Op];
      if (opCodeValue !== undefined) {
        code.push(opCodeValue);
        if (['LIT', 'LOD', 'STO', 'JMP', 'JZ', 'JNZ', 'CALL', 'SYS'].includes(opcode)) {
          if (opcode === 'LIT' && arg && arg.startsWith('"')) {
            const str = arg.slice(1, -1);
            let idx = strings.indexOf(str);
            if (idx === -1) { strings.push(str); idx = strings.length - 1; }
            this.pushInt(code, STR_MASK | idx);
          } else if (opcode === 'SYS') {
            const sysId = Syscall[arg as keyof typeof Syscall] || parseInt(arg || "0");
            this.pushInt(code, sysId);
          } else if (['JMP', 'JZ', 'JNZ', 'CALL'].includes(opcode)) {
            fixups.push({ pos: code.length, label: arg });
            this.pushInt(code, 0);
          } else {
            this.pushInt(code, parseInt(arg || "0"));
          }
        }
      }
    }

    for (const fix of fixups) {
      const addr = labels.get(fix.label) ?? 0;
      code[fix.pos] = (addr >> 24) & 0xFF;
      code[fix.pos + 1] = (addr >> 16) & 0xFF;
      code[fix.pos + 2] = (addr >> 8) & 0xFF;
      code[fix.pos + 3] = addr & 0xFF;
    }

    const stringsData: number[] = [];
    for (const s of strings) {
      const gbkBytes = encodeToGBK(s);
      gbkBytes.forEach(b => stringsData.push(b));
      stringsData.push(0);
    }

    const binary = new Uint8Array(8 + code.length + stringsData.length);
    binary.set([0x4C, 0x41, 0x56, 0x01], 0); // Header
    binary[4] = (code.length >> 24) & 0xFF;
    binary[5] = (code.length >> 16) & 0xFF;
    binary[6] = (code.length >> 8) & 0xFF;
    binary[7] = code.length & 0xFF;
    binary.set(new Uint8Array(code), 8);
    binary.set(new Uint8Array(stringsData), 8 + code.length);
    return binary;
  }

  private pushInt(ops: number[], val: number) {
    ops.push((val >> 24) & 0xFF, (val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF);
  }
}
