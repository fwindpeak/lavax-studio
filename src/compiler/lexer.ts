export const TokenType = {
  KEYWORD: 0,
  IDENTIFIER: 1,
  NUMBER: 2,
  STRING: 3,
  OPERATOR: 4,
  DELIMITER: 5,
  EOF: 6,
} as const;

export type TokenTypeValue = typeof TokenType[keyof typeof TokenType];

export interface Token {
  type: TokenTypeValue;
  value: string;
  line: number;
  col: number;
}

const KEYWORDS = new Set([
  'char', 'int', 'long', 'float', 'addr', 'void', 'struct',
  'if', 'else', 'for', 'while', 'do', 'return', 'break', 'continue', 'goto', 'sizeof'
]);

const OPERATORS = new Set([
  '+', '-', '*', '/', '%', '&', '|', '^', '~', '!', '=', 
  '==', '!=', '<', '>', '<=', '>=', '<<', '>>', '&&', '||', '++', '--'
]);

const DELIMITERS = new Set(['(', ')', '[', ']', '{', '}', ';', ',', '.']);

export class Lexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private col: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  private peek(): string {
    return this.input[this.pos] || '';
  }

  private advance(): string {
    const ch = this.input[this.pos++] || '';
    if (ch === '\n') {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  private skipWhitespace() {
    while (true) {
      const ch = this.peek();
      if (/\s/.test(ch)) {
        this.advance();
      } else if (ch === '/' && this.input[this.pos + 1] === '/') {
        while (this.peek() !== '\n' && this.peek() !== '') this.advance();
      } else if (ch === '/' && this.input[this.pos + 1] === '*') {
        this.advance(); this.advance();
        while (!(this.peek() === '*' && this.input[this.pos + 1] === '/') && this.peek() !== '') {
          this.advance();
        }
        this.advance(); this.advance();
      } else {
        break;
      }
    }
  }

  nextToken(): Token {
    this.skipWhitespace();

    const line = this.line;
    const col = this.col;

    if (this.pos >= this.input.length) {
      return { type: TokenType.EOF, value: '', line, col };
    }

    const ch = this.peek();

    if (/[a-zA-Z_]/.test(ch)) {
      let value = '';
      while (/[a-zA-Z0-9_]/.test(this.peek())) {
        value += this.advance();
      }
      if (KEYWORDS.has(value)) {
        return { type: TokenType.KEYWORD, value, line, col };
      }
      return { type: TokenType.IDENTIFIER, value, line, col };
    }

    if (/[0-9]/.test(ch)) {
      let value = '';
      if (ch === '0' && (this.input[this.pos + 1]?.toLowerCase() === 'x')) {
        value += this.advance();
        value += this.advance();
        while (/[0-9a-fA-F]/.test(this.peek())) value += this.advance();
      } else {
        while (/[0-9]/.test(this.peek())) value += this.advance();
        if (this.peek() === '.') {
          value += this.advance();
          while (/[0-9]/.test(this.peek())) value += this.advance();
          if (this.peek().toLowerCase() === 'e') {
            value += this.advance();
            if (this.peek() === '+' || this.peek() === '-') value += this.advance();
            while (/[0-9]/.test(this.peek())) value += this.advance();
          }
        }
      }
      return { type: TokenType.NUMBER, value, line, col };
    }

    if (ch === '"') {
      this.advance();
      let value = '';
      while (this.peek() !== '"' && this.peek() !== '') {
        if (this.peek() === '\\') {
          this.advance();
          const esc = this.advance();
          if (esc === 'n') value += '\n';
          else if (esc === 't') value += '\t';
          else if (esc === 'r') value += '\r';
          else value += esc;
        } else {
          value += this.advance();
        }
      }
      this.advance();
      return { type: TokenType.STRING, value, line, col };
    }

    if (ch === '\'') {
      this.advance();
      let value = '';
      if (this.peek() === '\\') {
        this.advance();
        value = this.advance();
      } else {
        value = this.advance();
      }
      this.advance();
      return { type: TokenType.NUMBER, value: value.charCodeAt(0).toString(), line, col };
    }

    const next2 = this.input.slice(this.pos, this.pos + 2);
    if (OPERATORS.has(next2)) {
      this.advance(); this.advance();
      return { type: TokenType.OPERATOR, value: next2, line, col };
    }

    if (OPERATORS.has(ch)) {
      return { type: TokenType.OPERATOR, value: this.advance(), line, col };
    }

    if (DELIMITERS.has(ch)) {
      return { type: TokenType.DELIMITER, value: this.advance(), line, col };
    }

    return { type: TokenType.OPERATOR, value: this.advance(), line, col };
  }
}
