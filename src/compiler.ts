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

interface Variable {
  offset: number;
  type: string; // 'int', 'char', 'long', 'void', 'addr'
  size: number; // For arrays, this is the number of elements
  pointerDepth: number; // 0 for normal vars, 1 for *p, 2 for **p etc.
}

export class LavaXCompiler {
  private src: string = "";
  private pos: number = 0;
  private asm: string[] = [];
  private labelCount = 0;
  private globals: Map<string, Variable> = new Map();
  private locals: Map<string, Variable> = new Map();
  private globalOffset = 0x2000;
  private localOffset = 0;
  private functions: Map<string, { params: number, returnType: string }> = new Map();
  private breakLabels: string[] = [];
  private defines: Map<string, string> = new Map();

  private evalConstant(expr: string): number {
    // 1. Recursive macro expansion
    let expanded = expr;
    let limit = 100;
    while (limit-- > 0) {
      let changed = false;
      // Find identifiers
      expanded = expanded.replace(/[a-zA-Z_]\w*/g, (match) => {
        if (this.defines.has(match)) {
          changed = true;
          return this.defines.get(match)!;
        }
        return match;
      });
      if (!changed) break;
    }

    // 2. Evaluate
    try {
      // Safety check: only allow digits, operators, parens, spaces, hex
      // We allow \w for hex (0x...) and identifiers that might be valid (e.g. true/false if supported, or unexpanded)
      // But strictly we should probably limit it.
      // For now, let's try to eval.
      return new Function(`return (${expanded});`)();
    } catch (e) {
      return NaN;
    }
  }

  compile(source: string): string {
    this.src = source;
    this.pos = 0;
    this.asm = [];
    this.labelCount = 0;
    this.globals = new Map();
    this.locals = new Map();
    this.globalOffset = 0x2000;
    this.localOffset = 0;
    this.functions = new Map();
    this.breakLabels = [];
    this.defines = new Map();

    try {
      const tempPos = this.pos;
      while (this.pos < this.src.length) {
        this.skipWhitespace();
        const type = this.peekToken();
        if (type === '#') {
          this.parseToken(); // #
          const directive = this.parseToken();
          if (directive === 'define') {
            const key = this.parseToken();
            // Read until newline
            let val = "";
            // Skip horizontal whitespace
            while (this.pos < this.src.length && " \t".includes(this.src[this.pos])) this.pos++;
            const start = this.pos;
            while (this.pos < this.src.length && this.src[this.pos] !== '\n' && this.src[this.pos] !== '\r') {
              this.pos++;
            }
            val = this.src.substring(start, this.pos);
            // Handle // comments
            const commentIdx = val.indexOf('//');
            if (commentIdx !== -1) val = val.substring(0, commentIdx);
            
            this.defines.set(key, val.trim());
          }
          continue;
        }

        if (!type || !['int', 'char', 'long', 'void', 'addr'].includes(type)) {
          if (type) this.parseToken(); // Consume unknown top-level or whatever
          continue;
        }
        this.parseToken(); // Consume base type
        do {
          let pointerDepth = 0;
          while (this.match('*')) { pointerDepth++; }
          const name = this.parseToken();
          if (this.match('(')) {
            // Pre-scan function to register its existence
            let paramsCount = 0;
            if (!this.match(')')) {
              do {
                this.parseToken(); // type
                while (this.match('*')) { /* consume */ }
                this.parseToken(); // name
                paramsCount++;
              } while (this.match(','));
              this.expect(')');
            }
            this.functions.set(name, { params: paramsCount, returnType: type });

            if (this.match(';')) {
              // Already handled
            } else {
              this.expect('{');
              let depth = 1;
              while (this.pos < this.src.length && depth > 0) {
                if (this.src[this.pos] === '{') depth++;
                else if (this.src[this.pos] === '}') depth--;
                this.pos++;
              }
            }
            break; // functions can't be comma-separated with vars in this simple parser
          } else {
            // Global variable/array
            let size = 1;
            const elementSize = type === 'char' ? 1 : 4;
            const dimensions: number[] = [];
            let isImplicitFirstDim = false;

            while (this.match('[')) {
                if (this.peekToken() === ']') {
                  this.parseToken();
                  if (dimensions.length > 0) throw new Error("Only the first dimension can be implicit");
                  isImplicitFirstDim = true;
                  dimensions.push(0);
                } else {
                  // Capture expression until ]
                  const start = this.pos;
                  let depth = 0;
                  while (this.pos < this.src.length) {
                    const char = this.src[this.pos];
                    if (char === ']') {
                      if (depth === 0) break;
                      depth--;
                    } else if (char === '[') {
                      depth++;
                    }
                    this.pos++;
                  }
                  const expr = this.src.substring(start, this.pos);
                  // Manually consume ] if loop finished by finding ]
                  if (this.src[this.pos] === ']') this.pos++;
                  else throw new Error("Expected ']'");

                  let dim = this.evalConstant(expr);
                  if (isNaN(dim)) throw new Error(`Invalid array dimension: ${expr}`);
                  dimensions.push(dim);
                }
              }

            if (dimensions.length > 0) {
              size = dimensions.reduce((a, b) => (b === 0 ? a : a * b), 1);
              if (isImplicitFirstDim) size = 0; // Will be set by initializer
              else {
                // If not implicit, size is product of all dims
                size = dimensions.reduce((a, b) => a * b, 1);
              }
            }

            if (this.match('=')) {
              const initializer = this.peekToken();
              if (initializer.startsWith('"')) {
                const str = initializer.substring(1, initializer.length - 1);
                if (size === 0) size = str.length + 1;
                this.parseToken(); // consume string
              } else if (initializer === '{') {
                const count = this.parseInitializerList();
                if (size === 0 && isImplicitFirstDim) {
                  // If dimensions = [0, 5], size was 0.
                  // Initializer count = 2 (e.g. {{...}, {...}}).
                  // Total size = 2 * 5 = 10.
                  const innerSize = dimensions.length > 1 ? dimensions.slice(1).reduce((a, b) => a * b, 1) : 1;
                  size = count * innerSize;
                }
              } else {
                this.parseToken(); // consume simple initializer
              }
            }

            if (size === 0) throw new Error(`Array size required for ${name}`);

            this.globals.set(name, { offset: this.globalOffset, type, size, pointerDepth });
            this.globalOffset += size * elementSize;
          }
        } while (this.match(','));
        this.match(';');
      }
      this.pos = tempPos;

      this.asm.push(`SPACE ${this.globalOffset} `);
      this.asm.push('CALL main');
      this.asm.push('EXIT');

      while (this.pos < this.src.length) {
        this.skipWhitespace();
        if (this.pos >= this.src.length) break;
        this.parseTopLevel();
      }
    } catch (e: any) {
      // Calculate line and column number
      const lines = this.src.substring(0, this.pos).split('\n');
      const lineNumber = lines.length;
      const columnNumber = lines[lines.length - 1].length + 1;

      const contextStart = Math.max(0, this.pos - 20);
      const contextEnd = Math.min(this.src.length, this.pos + 30);
      const context = this.src.substring(contextStart, contextEnd);
      const pointer = ' '.repeat(this.pos - contextStart) + '^';
      console.error('[COMPILER ERROR]', e.message);
      console.error(`At line ${lineNumber}, column ${columnNumber} `);
      console.error('Context:', context);
      console.error('        ', pointer);
      return `ERROR: ${e.message} at line ${lineNumber}, column ${columnNumber} \nContext: ${context} \n         ${pointer} `;
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
    if (this.peekToken() === str) {
      this.parseToken();
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

    // Handle character literals (single quotes)
    if (this.src[this.pos] === "'") {
      this.pos++;
      while (this.pos < this.src.length && this.src[this.pos] !== "'") {
        if (this.src[this.pos] === '\\') this.pos++;
        this.pos++;
      }
      this.pos++;
      return this.src.substring(start, this.pos);
    }

    const special = "(){}[],;=+-*/%><!&|^~";
    if (special.includes(this.src[this.pos])) {
      let op = this.src[this.pos++];
      if (op === '<' && this.src[this.pos] === '<') {
        op += this.src[this.pos++];
        if (this.src[this.pos] === '=') op += this.src[this.pos++];
      }
      else if (op === '>' && this.src[this.pos] === '>') {
        op += this.src[this.pos++];
        if (this.src[this.pos] === '=') op += this.src[this.pos++];
      }
      else if ((op === '=' || op === '!' || op === '<' || op === '>') && this.src[this.pos] === '=') op += this.src[this.pos++];
      else if ((op === '&' || op === '|') && this.src[this.pos] === op) {
        op += this.src[this.pos++];
        if (this.src[this.pos] === '=') op += this.src[this.pos++];
      }
      else if ((op === '+' || op === '-') && this.src[this.pos] === op) op += this.src[this.pos++];
      else if ("+-*/%&|^!".includes(op) && this.src[this.pos] === '=') op += this.src[this.pos++];
      return op;
    }

    while (this.pos < this.src.length && !/\s/.test(this.src[this.pos]) && !special.includes(this.src[this.pos])) {
      this.pos++;
    }
    return this.src.substring(start, this.pos);
  }

  private parseTopLevel() {
    const type = this.parseToken();
    if (!type || !['int', 'char', 'long', 'void', 'addr'].includes(type)) return;
    while (this.match('*')) { /* consume stars */ }
    const name = this.parseToken();
    if (this.match('(')) {
      const params: { name: string, type: string }[] = [];
      if (!this.match(')')) {
        do {
          const pType = this.parseToken();
          let pDepth = 0;
          while (this.match('*')) { pDepth++; }
          const pName = this.parseToken();
          // We cheat a bit and store depth in type for now or just ignore it for params? 
          // No, we need it. 
          // Let's store it in a way we can retrieve.
          // Since params are {name, type}, we might lose depth.
          // Let's hack: type = "int*" if depth 1.
          params.push({ name: pName, type: pType, pointerDepth: pDepth } as any);
        } while (this.match(','));
        this.expect(')');
      }

      if (this.match(';')) return;

      this.expect('{');
      this.asm.push(`${name}: `);
      this.localOffset = 5;
      this.locals.clear();
      params.forEach((p, i) => {
        // Simple param parsing in parseTopLevel doesn't capture pointer depth properly in 'type' string
        // We'd need to parse stars there too.
        // For now, let's assume params are simple types or we need to fix parseTopLevel param parsing.
        // The params array structure is { name: string, type: string }. 
        // We really should capture depth there.
        // But for this edit, let's update where params are parsed: lines 243-250.
        this.locals.set(p.name, { offset: 5 + i * 4, type: p.type, size: 1, pointerDepth: (p as any).pointerDepth || 0 });
        this.localOffset += 4;
      });
      const localSizePos = this.asm.length;
      this.asm.push('REPLACE_ME_FUNC');
      const prevLocalOffset = this.localOffset;
      this.parseBlock();
      const localVarsSize = this.localOffset - prevLocalOffset;
      this.asm[localSizePos] = `FUNC ${params.length} ${localVarsSize + 64} `;
      this.asm.push('PUSH_B 0');
      this.asm.push('RET');
    } else {
      // Global already handled in pre-scan, but let's skip
      if (this.match('[')) {
        this.parseToken();
        this.expect(']');
      }
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
      do {
        let pointerDepth = 0;
        while (this.match('*')) { pointerDepth++; }
        const name = this.parseToken();
        let size = 1;
        const elementSize = token === 'char' ? 1 : 4;
        if (this.match('[')) {
          if (this.peekToken() === ']') {
            this.parseToken();
            size = 0;
          } else {
            size = parseInt(this.parseToken());
            this.expect(']');
          }
        }
        if (this.match('=')) {
          const initializerToken = this.peekToken();
          if (initializerToken.startsWith('"')) {
            const str = initializerToken.substring(1, initializerToken.length - 1);
            if (size === 0) size = str.length + 1;
          }
          if (size === 0) throw new Error(`Array size required for ${name}`);

          if (size === 0) throw new Error(`Array size required for ${name}`);
          this.locals.set(name, { offset: this.localOffset, type: token, size, pointerDepth });
          const addr = this.localOffset;
          this.localOffset += size * elementSize;

          this.parseExpression();
          this.asm.push(`${token === 'char' ? 'LEA_L_B' : (token === 'int' ? 'LEA_L_W' : 'LEA_L_D')} ${addr} `);
          this.asm.push('STORE');
          this.asm.push('POP');
        } else {
          if (size === 0) throw new Error(`Array size required for ${name}`);
          this.locals.set(name, { offset: this.localOffset, type: token, size, pointerDepth });
          this.localOffset += size * elementSize;
        }
      } while (this.match(','));
      this.expect(';');
    } else if (token === 'if') {
      this.parseToken();
      this.expect('(');
      this.parseExpression();
      this.expect(')');
      const labelElse = `L_ELSE_${this.labelCount++} `;
      const labelEnd = `L_END_${this.labelCount++} `;
      this.asm.push(`JZ ${labelElse} `);
      this.parseInnerStatement();
      if (this.match('else')) {
        this.asm.push(`JMP ${labelEnd} `);
        this.asm.push(`${labelElse}: `);
        this.parseInnerStatement();
        this.asm.push(`${labelEnd}: `);
      } else {
        this.asm.push(`${labelElse}: `);
      }
    } else if (token === 'while') {
      this.parseToken();
      const labelStart = `L_WHILE_${this.labelCount++} `;
      const labelEnd = `L_WEND_${this.labelCount++} `;
      this.asm.push(`${labelStart}: `);
      this.expect('(');
      this.parseExpression();
      this.expect(')');
      this.asm.push(`JZ ${labelEnd} `);
      this.breakLabels.push(labelEnd);
      this.parseInnerStatement();
      this.breakLabels.pop();
      this.asm.push(`JMP ${labelStart} `);
      this.asm.push(`${labelEnd}: `);
    } else if (token === 'for') {
      this.parseToken();
      this.expect('(');
      if (!this.match(';')) { this.parseExprStmt(); this.expect(';'); }
      const labelStart = `L_FOR_${this.labelCount++} `;
      const labelEnd = `L_FEND_${this.labelCount++} `;
      const labelStep = `L_FSTEP_${this.labelCount++} `;
      this.asm.push(`${labelStart}: `);
      if (!this.match(';')) { this.parseExpression(); this.asm.push(`JZ ${labelEnd} `); this.expect(';'); }
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
      this.breakLabels.push(labelEnd);
      this.parseInnerStatement();
      this.breakLabels.pop();
      this.asm.push(`${labelStep}: `);
      const savedPos = this.pos;
      this.pos = stepExprStart;
      if (this.pos < stepExprEnd) { this.parseExprStmt(); }
      this.pos = savedPos;
      this.asm.push(`JMP ${labelStart} `);
      this.asm.push(`${labelEnd}: `);
    } else if (token === 'goto') {
      this.parseToken();
      const label = this.parseToken();
      this.asm.push(`JMP ${label} `);
      this.expect(';');
    } else if (token === 'break') {
      this.parseToken();
      if (this.breakLabels.length === 0) throw new Error("break outside of loop");
      this.asm.push(`JMP ${this.breakLabels[this.breakLabels.length - 1]} `);
      this.expect(';');
    } else {
      this.parseExprStmt();
      this.expect(';');
    }
  }

  private parseInnerStatement() {
    if (this.match('{')) this.parseBlock();
    else this.parseStatement();
  }

  private parseExprStmt() {
    this.parseExpression();
    this.asm.push('POP');
  }

  private peekNextToken(): string {
    const oldPos = this.pos;
    this.parseToken();
    const next = this.peekToken();
    this.pos = oldPos;
    return next;
  }

  private parseExpression() {
    this.parseAssignment();
  }

  private parseAssignment() {
    const token = this.peekToken();

    // Support *ptr = value
    const savedPos = this.pos;
    const savedAsmLen = this.asm.length;
    if (this.match('*')) {
      try {
        // Handle cast (type *) or just *expr
        // If we see '(', it might be a cast
        let castType: string | null = null;
        let castDepth = 0;

        // This is a bit ambiguous with defaults, but let's try to detect (type *)
        // Actually, parseUnary handles *expr.
        // If we are here, we saw '*'.

        // Let's just parseFactor. 
        // If the user wrote (int *)addr, parseFactor will see '(' and call parseExpression.
        // Wait, (int *) is not an expression, it's a cast type prefix.
        // parseExpression -> parseAssignment -> ... -> parseUnary -> match('*')
        // So we need to handle (type *) inside parseUnary primarily.

        // But here we are in parseAssignment to handle *ptr = val.
        // If we have *ptr = val, we need to know the type of *ptr to know if we store Byte, Word, or Dword.

        // We can evaluate the address expression:
        // Heuristic: Peek to see if it's a variable reference to determine type size
        let handleType = '0x10000'; // Default to char (1 byte)
        const savedPos2 = this.pos;
        const possibleVar = this.parseToken();
        const variable = this.locals.get(possibleVar) || this.globals.get(possibleVar);

        if (variable && variable.pointerDepth > 0) {
          if (variable.type === 'int') handleType = '0x20000'; // Word/Int
          else if (variable.type === 'long' || variable.type === 'addr') handleType = '0x40000'; // Dword
          // else char is default
        }
        this.pos = savedPos2;

        this.parseUnary(); // Stack: [..., addr]

        // Check if there is an assignment following
        const op = this.peekToken();
        const isCompound = op.endsWith('=') && op.length > 1 && !['==', '!=', '<=', '>='].includes(op);

        if (op === '=' || isCompound) {
          this.parseToken(); // consume op (= or compound)

          this.asm.push(`PUSH_D ${handleType} `);
          this.asm.push('OR'); // Stack: [..., handle]

          if (isCompound) {
            this.asm.push('DUP');
            this.asm.push('LD_IND');
            this.parseExpression();
            this.emitCompoundOp(op);
          } else {
            this.parseExpression();
          }
          this.asm.push('STORE');
          this.asm.push('POP');
          return;
        }
      } catch (e) {
        // Fallthrough
      }
      this.pos = savedPos;
      this.asm.length = savedAsmLen;
    }

    const variable = (token && (this.locals.get(token) || this.globals.get(token))) || null;
    const isLocal = token ? this.locals.has(token) : false;

    if (variable) {
      const oldPos = this.pos;
      this.parseToken(); // consume name

      if (this.match('[')) {
        this.parseExpression();
        this.expect(']');
        const op = this.peekToken();
        const isCompound = op.endsWith('=') && op.length > 1 && !['==', '!=', '<=', '>='].includes(op);
        if (op === '=' || isCompound) {
          this.parseToken(); // consume op
          const elementSize = variable.type === 'char' ? 1 : 4;
          this.asm.push(`PUSH_B ${elementSize} `);
          this.asm.push('MUL');
          if (isLocal) {
            this.asm.push(`PUSH_W ${variable.offset} `);
            this.asm.push('ADD');
            this.asm.push('LEA_L_PH 0');
          } else {
            this.asm.push(`PUSH_W ${variable.offset} `);
            this.asm.push('ADD');
          }
          const handleType = variable.type === 'char' ? '0x10000' : (variable.type === 'int' ? '0x20000' : '0x40000');
          this.asm.push(`PUSH_D ${handleType} `);
          this.asm.push('OR'); // Stack: [..., handle]

          if (isCompound) {
            this.asm.push('DUP'); // Stack: [..., handle, handle]
            this.asm.push('LD_IND'); // Stack: [..., handle, value]
            this.parseAssignment(); // Parse RHS, stack: [..., handle, value, rhs]
            this.emitCompoundOp(op);
          } else {
            this.parseAssignment(); // Stack: [..., handle, rhs]
          }
          this.asm.push('STORE');
          return;
        }
        this.pos = oldPos;
      } else {
        const op = this.peekToken();
        const isCompound = op.endsWith('=') && op.length > 1 && !['==', '!=', '<=', '>='].includes(op);
        if (op === '=' || isCompound) {
          this.parseToken(); // consume op
          if (isCompound) {
            const opPrefix = isLocal ? 'LD_L' : 'LD_G';
            const opSuffix = variable.type === 'char' ? 'B' : (variable.type === 'int' ? 'W' : 'D');
            this.asm.push(`${opPrefix}_${opSuffix} ${variable.offset} `);
          }
          this.parseAssignment();
          if (isCompound) {
            this.emitCompoundOp(op);
          }
          const opPrefix = isLocal ? 'LEA_L' : 'LEA_G';
          const opSuffix = variable.type === 'char' ? 'B' : (variable.type === 'int' ? 'W' : 'D');
          this.asm.push(`${opPrefix}_${opSuffix} ${variable.offset} `);
          this.asm.push('STORE');
          return;
        }
        this.pos = oldPos;
      }
    }
    this.parseLogicalOr();
  }

  private parseLogicalOr() {
    this.parseLogicalAnd();
    while (true) {
      if (this.match('||')) {
        this.parseLogicalAnd();
        this.asm.push('L_OR');
      } else break;
    }
  }

  private parseLogicalAnd() {
    this.parseBitwiseOr();
    while (true) {
      if (this.match('&&')) {
        this.parseBitwiseOr();
        this.asm.push('L_AND');
      } else break;
    }
  }

  private parseBitwiseOr() {
    this.parseBitwiseXor();
    while (true) {
      if (this.match('|')) {
        this.parseBitwiseXor();
        this.asm.push('OR');
      } else break;
    }
  }

  private parseBitwiseXor() {
    this.parseBitwiseAnd();
    while (true) {
      if (this.match('^')) {
        this.parseBitwiseAnd();
        this.asm.push('XOR');
      } else break;
    }
  }

  private parseBitwiseAnd() {
    this.parseEquality();
    while (true) {
      if (this.match('&')) {
        this.parseEquality();
        this.asm.push('AND');
      } else break;
    }
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
    this.parseShift();
    while (true) {
      if (this.match('<')) { this.parseShift(); this.asm.push('LT'); }
      else if (this.match('>')) { this.parseShift(); this.asm.push('GT'); }
      else if (this.match('<=')) { this.parseShift(); this.asm.push('LE'); }
      else if (this.match('>=')) { this.parseShift(); this.asm.push('GE'); }
      else break;
    }
  }

  private parseShift() {
    this.parseAdditive();
    while (true) {
      if (this.match('<<')) { this.parseAdditive(); this.asm.push('SHL'); }
      else if (this.match('>>')) { this.parseAdditive(); this.asm.push('SHR'); }
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
    this.parseUnary();
    while (true) {
      if (this.match('*')) { this.parseUnary(); this.asm.push('MUL'); }
      else if (this.match('/')) { this.parseUnary(); this.asm.push('DIV'); }
      else if (this.match('%')) { this.parseUnary(); this.asm.push('MOD'); }
      else break;
    }
  }

  private parseUnary() {
    if (this.match('++')) {
      // ... (existing ++ code)
      const token = this.parseToken();
      const variable = this.locals.get(token) || this.globals.get(token);
      const isLocal = this.locals.has(token);
      if (variable) {
        const opPrefix = isLocal ? 'LEA_L' : 'LEA_G';
        const opSuffix = variable.type === 'char' ? 'B' : (variable.type === 'int' ? 'W' : 'D');
        this.asm.push(`${opPrefix}_${opSuffix} ${variable.offset} `);
        this.asm.push('INC_PRE');
      } else {
        throw new Error(`++ requires lvalue, got ${token} `);
      }
    } else if (this.match('--')) {
      // ... (existing -- code)
      const token = this.parseToken();
      const variable = this.locals.get(token) || this.globals.get(token);
      const isLocal = this.locals.has(token);
      if (variable) {
        const opPrefix = isLocal ? 'LEA_L' : 'LEA_G';
        const opSuffix = variable.type === 'char' ? 'B' : (variable.type === 'int' ? 'W' : 'D');
        this.asm.push(`${opPrefix}_${opSuffix} ${variable.offset} `);
        this.asm.push('DEC_PRE');
      } else {
        throw new Error(`-- requires lvalue, got ${token} `);
      }
    } else if (this.match('(')) {
      // Handle cast: (int *) expr or (type) expr
      // Check if it's a type cast
      const savedPos = this.pos;
      const token = this.parseToken();
      if (['int', 'char', 'long', 'void', 'addr'].includes(token)) {
        // It is a cast
        let pointerDepth = 0;
        while (this.match('*')) { pointerDepth++; }
        this.expect(')');

        // Now parse the expression to be casted/dereferenced
        this.parseUnary(); // Recursively parse the expression

        // If it was a pointer cast (type *), in LavaX this is a dereference!
        // (int *) p  reads an int from address p.
        if (pointerDepth > 0) {
          let handleType = '0x10000'; // Default char
          if (token === 'int') handleType = '0x20000';
          else if (token === 'long' || token === 'addr') handleType = '0x40000';

          this.asm.push(`PUSH_D ${handleType} `);
          this.asm.push('OR');
          this.asm.push('LD_IND');
        }
        // If it was just (int) p, it's a type conversion, typically checking bounds or truncation
        // For now we ignore value casts or implement simple truncation if needed.
        // LavaX VM types are dynamic-ish but ops are typed.
        return;
      }
      // Not a type cast, just parenthesized expression
      this.pos = savedPos;
      this.parseExpression();
      this.expect(')');
    } else if (this.match('*')) {
      // Shorthand *expr -> usually (char *)expr
      // But if expr is a variable with typed pointer, we should use that type.

      // Look ahead to see if it is a variable
      const savedPos = this.pos;
      const possibleVar = this.parseToken();
      const variable = this.locals.get(possibleVar) || this.globals.get(possibleVar);

      this.pos = savedPos; // Backtrack to parse the expression properly

      this.parseUnary(); // Evaluate the expression (the address)

      let handleType = '0x10000'; // Default char for *p shortcut
      if (variable && variable.pointerDepth > 0) {
        if (variable.type === 'int') handleType = '0x20000';
        else if (variable.type === 'long' || variable.type === 'addr') handleType = '0x40000';
      }

      this.asm.push(`PUSH_D ${handleType} `);
      this.asm.push('OR');
      this.asm.push('LD_IND');
    } else if (this.match('&')) {
      // ... (existing & code)
      const token = this.peekToken();
      const variable = this.locals.get(token) || this.globals.get(token);
      const isLocal = this.locals.has(token);
      if (variable) {
        this.parseToken(); // consume name
        if (this.match('[')) {
          this.parseExpression();
          this.expect(']');
          const elementSize = variable.type === 'char' ? 1 : 4;
          this.asm.push(`PUSH_B ${elementSize} `);
          this.asm.push('MUL');
          if (isLocal) {
            this.asm.push(`PUSH_W ${variable.offset} `);
            this.asm.push('ADD');
            this.asm.push('LEA_L_PH 0');
          } else {
            this.asm.push(`PUSH_W ${variable.offset} `);
            this.asm.push('ADD');
          }
        } else {
          const opPrefix = isLocal ? 'LEA_L' : 'LEA_G';
          const opSuffix = variable.type === 'char' ? 'B' : (variable.type === 'int' ? 'W' : 'D');
          this.asm.push(`${opPrefix}_${opSuffix} ${variable.offset} `);
        }
      } else {
        throw new Error(`& requires lvalue, got ${token} `);
      }
    } else if (this.match('-')) {
      this.parseUnary();
      this.asm.push('NEG');
    } else if (this.match('!')) {
      this.parseUnary();
      this.asm.push('L_NOT');
    } else if (this.match('~')) {
      this.parseUnary();
      this.asm.push('NOT');
    } else {
      this.parseFactor();
    }
  }

  private parseFactor() {
    const token = this.peekToken();
    if (!token) return;

    if (token === '(') {
      this.parseToken();
      this.parseExpression();
      this.expect(')');
    } else if (token.match(/^0x[0-9a-fA-F]+$/)) {
      this.parseToken();
      this.pushLiteral(parseInt(token.substring(2), 16));
    } else if (token.match(/^[0-9]+$/)) {
      this.parseToken();
      this.pushLiteral(parseInt(token));
    } else if (token.startsWith('"')) {
      this.parseToken();
      this.asm.push(`PUSH_STR ${token} `);
    } else if (token.startsWith("'")) {
      this.parseToken();
      this.pushLiteral(this.parseCharLiteral(token));
    } else if (this.functions.has(token) || SystemOp[token as keyof typeof SystemOp] !== undefined) {
      this.parseToken();
      const func = this.functions.get(token);
      this.expect('(');
      const isVariadic = token === 'printf' || token === 'sprintf';
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

      // Push arguments
      for (let i = 0; i < args.length; i++) {
        this.asm.push(...args[i]);
      }

      if (isVariadic) {
        this.asm.push(`PUSH_B ${args.length} `);
      }

      if (SystemOp[token as keyof typeof SystemOp] !== undefined) {
        this.asm.push(`${token} `);
      } else {
        this.asm.push(`CALL ${token} `);
      }
    } else if (this.locals.has(token) || this.globals.has(token)) {
      this.parseToken();
      const variable = (this.locals.get(token) || this.globals.get(token))!;
      const isLocal = this.locals.has(token);

      if (this.match('[')) {
        this.parseExpression(); // This will push the index
        this.expect(']');
        const elementSize = variable.type === 'char' ? 1 : 4;
        this.asm.push(`PUSH_B ${elementSize} `);
        this.asm.push('MUL');
        if (isLocal) {
          this.asm.push(`PUSH_W ${variable.offset} `);
          this.asm.push('ADD');
          const opSuffix = variable.type === 'char' ? 'B' : (variable.type === 'int' ? 'W' : 'D');
          this.asm.push(`LD_LO_${opSuffix} 0`);
        } else {
          this.asm.push(`PUSH_W ${variable.offset} `);
          this.asm.push('ADD');
          const opSuffix = variable.type === 'char' ? 'B' : (variable.type === 'int' ? 'W' : 'D');
          this.asm.push(`LD_GO_${opSuffix} 0`);
        }
      } else if (variable.size > 1) {
        // Array name without indexing -> load address (LEA)
        const opPrefix = isLocal ? 'LEA_L' : 'LEA_G';
        const opSuffix = variable.type === 'char' ? 'B' : (variable.type === 'int' ? 'W' : 'D');
        this.asm.push(`${opPrefix}_${opSuffix} ${variable.offset} `);
      } else {
        const opPrefix = isLocal ? 'LD_L' : 'LD_G';
        const opSuffix = variable.type === 'char' ? 'B' : (variable.type === 'int' ? 'W' : 'D');
        this.asm.push(`${opPrefix}_${opSuffix} ${variable.offset} `);
      }

      // Handle postfix increment/decrement
      if (this.match('++')) {
        const opPrefix = isLocal ? 'LEA_L' : 'LEA_G';
        const opSuffix = variable.type === 'char' ? 'B' : (variable.type === 'int' ? 'W' : 'D');
        const last = this.asm.pop(); // Remove the LD_* opcode we just pushed
        this.asm.push(`${opPrefix}_${opSuffix} ${variable.offset} `);
        this.asm.push('INC_POST');
      } else if (this.match('--')) {
        const opPrefix = isLocal ? 'LEA_L' : 'LEA_G';
        const opSuffix = variable.type === 'char' ? 'B' : (variable.type === 'int' ? 'W' : 'D');
        const last = this.asm.pop(); // Remove the LD_* opcode we just pushed
        this.asm.push(`${opPrefix}_${opSuffix} ${variable.offset} `);
        this.asm.push('DEC_POST');
      }
    } else {
      throw new Error(`Unexpected token: ${token} `);
    }
  }

  private pushLiteral(val: number) {
    if (val >= 0 && val <= 255) this.asm.push(`PUSH_B ${val} `);
    else if (val >= -32768 && val <= 32767) this.asm.push(`PUSH_W ${val} `);
    else this.asm.push(`PUSH_D ${val} `);
  }

  private parseCharLiteral(token: string): number {
    let char = token.substring(1, token.length - 1);
    if (char.startsWith('\\')) {
      switch (char[1]) {
        case 'n': return 10;
        case 't': return 9;
        case 'r': return 13;
        case '0': return 0;
        case '\\': return 92;
        case "'": return 39;
        case '"': return 34;
        default: return char.charCodeAt(1);
      }
    }
    return char.charCodeAt(0);
  }

  private parseInitializerList(): number {
    // Consumes { ... } and returns number of top-level elements
    this.expect('{');
    let count = 0;
    if (this.peekToken() === '}') {
      this.parseToken();
      return 0;
    }

    do {
      count++;
      const token = this.peekToken();
      if (token === '{') {
        this.parseInitializerList(); // recurse to skip
      } else {
        // Skip until comma or }
        // Simple skip for now: parseExpression might consume too much?
        // We just need to balance braces if any, but elements are usually expressions.
        // Actually, for pre-scan we just want to count.
        // And we need to skip the expression.
        // An expression might contain function calls etc.
        // But for global init, usually constants.
        // Let's implement a simple brace/paren balancer skip.
        this.skipInitializerElement();
      }
    } while (this.match(','));

    this.expect('}');
    return count;
  }

  private skipInitializerElement() {
    let depth = 0;
    while (this.pos < this.src.length) {
      const token = this.peekToken();
      if (token === '{' || token === '(' || token === '[') {
        depth++;
        this.parseToken();
      } else if (token === '}' || token === ')' || token === ']') {
        if (depth === 0) {
          if (token === '}') return; // End of list
          // ) or ] without opening is weird but let's just return if we see comma/semicolon/brace
        }
        depth--;
        this.parseToken();
      } else if (token === ',' && depth === 0) {
        return;
      } else if (token === ';' && depth === 0) {
        return; // Should not happen in init list
      } else {
        this.parseToken();
      }
    }
  }

  private emitCompoundOp(op: string) {
    const baseOp = op.substring(0, op.length - 1);
    const opMap: { [key: string]: string } = {
      '+': 'ADD', '-': 'SUB', '*': 'MUL', '/': 'DIV', '%': 'MOD',
      '&': 'AND', '|': 'OR', '^': 'XOR', '<<': 'SHL', '>>': 'SHR'
    };
    if (opMap[baseOp]) {
      this.asm.push(opMap[baseOp]);
    } else {
      throw new Error(`Unsupported compound operator: ${op} `);
    }
  }
}

export { LavaXAssembler };
