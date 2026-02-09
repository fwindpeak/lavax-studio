import { Lexer, TokenType } from './lexer';
import type { Token, TokenTypeValue } from './lexer';
import * as AST from './ast';

export class Parser {
  private lexer: Lexer;
  private currentToken: Token;

  constructor(lexer: Lexer) {
    this.lexer = lexer;
    this.currentToken = this.lexer.nextToken();
  }

  private advance(): Token {
    const old = this.currentToken;
    this.currentToken = this.lexer.nextToken();
    return old;
  }

  private expect(type: TokenTypeValue, value?: string): Token {
    if (this.currentToken.type !== type || (value !== undefined && this.currentToken.value !== value)) {
      throw new Error(`Expected ${value || type}, got ${this.currentToken.value} at line ${this.currentToken.line}:${this.currentToken.col}`);
    }
    return this.advance();
  }

  parse(): AST.Program {
    const body: any[] = [];
    while (this.currentToken.type !== TokenType.EOF) {
      body.push(this.parseTopLevel());
    }
    return { type: 'Program', body };
  }

  private parseTopLevel() {
    if (this.currentToken.value === 'struct') {
      return this.parseStructDeclaration();
    }
    
    const typeToken = this.expect(TokenType.KEYWORD);
    const type = typeToken.value;
    
    let isRef = false;
    if (this.currentToken.value === '&') {
      isRef = true;
      this.advance();
    }
    
    const name = this.expect(TokenType.IDENTIFIER).value;
    
    const nextVal: string = this.currentToken.value;
    if (nextVal === '(') {
      return this.parseFunctionDeclaration(type, name);
    } else {
      return this.parseVariableDeclaration(type, name, isRef);
    }
  }

  private parseStructDeclaration(): AST.StructDeclaration {
    this.expect(TokenType.KEYWORD, 'struct');
    const name = this.expect(TokenType.IDENTIFIER).value;
    this.expect(TokenType.DELIMITER, '{');
    while (this.currentToken.value !== '}') {
      this.expect(TokenType.KEYWORD);
      this.expect(TokenType.IDENTIFIER);
      const next: string = this.currentToken.value;
      if (next === '[') {
        this.advance();
        this.expect(TokenType.NUMBER);
        this.expect(TokenType.DELIMITER, ']');
      }
      this.expect(TokenType.DELIMITER, ';');
    }
    this.expect(TokenType.DELIMITER, '}');
    this.expect(TokenType.DELIMITER, ';');
    return { type: 'StructDeclaration', name, members: [] };
  }

  private parseFunctionDeclaration(returnType: string, name: string): AST.FunctionDeclaration {
    this.expect(TokenType.DELIMITER, '(');
    const params: any[] = [];
    while (this.currentToken.value !== ')') {
      const pType = this.expect(TokenType.KEYWORD).value;
      let pRef = false;
      if (this.currentToken.value === '&') {
        pRef = true;
        this.advance();
      }
      const pName = this.expect(TokenType.IDENTIFIER).value;
      params.push({ name: pName, type: pType, isRef: pRef });
      if (this.currentToken.value === ',') this.advance();
    }
    this.expect(TokenType.DELIMITER, ')');
    const body = this.parseBlock();
    return { type: 'FunctionDeclaration', returnType, name, params, body };
  }

  private parseVariableDeclaration(type: string, name: string, isRef: boolean): AST.VariableDeclaration {
    const declarators: any[] = [{ name }];
    const nextVal1: string = this.currentToken.value;
    if (nextVal1 === '[') {
      this.advance();
      if (this.currentToken.type === TokenType.NUMBER) {
        declarators[0].arraySize = parseInt(this.advance().value);
      }
      this.expect(TokenType.DELIMITER, ']');
    }
    const nextVal2: string = this.currentToken.value;
    if (nextVal2 === '=') {
      this.advance();
      declarators[0].init = this.parseExpression();
    }
    
    while (this.currentToken.value === ',') {
      this.advance();
      const nextName = this.expect(TokenType.IDENTIFIER).value;
      const decl: any = { name: nextName };
      const nextVal3: string = this.currentToken.value;
      if (nextVal3 === '[') {
        this.advance();
        if (this.currentToken.type === TokenType.NUMBER) {
          decl.arraySize = parseInt(this.advance().value);
        }
        this.expect(TokenType.DELIMITER, ']');
      }
      const nextVal4: string = this.currentToken.value;
      if (nextVal4 === '=') {
        this.advance();
        decl.init = this.parseExpression();
      }
      declarators.push(decl);
    }
    this.expect(TokenType.DELIMITER, ';');
    return { type: 'VariableDeclaration', varType: type, isRef, declarators };
  }

  private parseBlock(): AST.BlockStatement {
    this.expect(TokenType.DELIMITER, '{');
    const body: any[] = [];
    while (this.currentToken.value !== '}') {
      body.push(this.parseStatement());
    }
    this.expect(TokenType.DELIMITER, '}');
    return { type: 'BlockStatement', body };
  }

  private parseStatement(): AST.ASTNode {
    const token = this.currentToken;
    if (token.type === TokenType.KEYWORD) {
      switch (token.value) {
        case 'if': return this.parseIf();
        case 'for': return this.parseFor();
        case 'while': return this.parseWhile();
        case 'do': return this.parseDoWhile();
        case 'return': return this.parseReturn();
        case 'char':
        case 'int':
        case 'long':
        case 'float':
        case 'addr': {
          const type = this.advance().value;
          let isRef = false;
          if (this.currentToken.value === '&') {
            isRef = true;
            this.advance();
          }
          const name = this.expect(TokenType.IDENTIFIER).value;
          return this.parseVariableDeclaration(type, name, isRef);
        }
      }
    }
    
    if (token.value === '{') return this.parseBlock();
    
    const expr = this.parseExpression();
    this.expect(TokenType.DELIMITER, ';');
    return { type: 'ExpressionStatement', expression: expr };
  }

  private parseIf(): AST.IfStatement {
    this.advance(); // if
    this.expect(TokenType.DELIMITER, '(');
    const test = this.parseExpression();
    this.expect(TokenType.DELIMITER, ')');
    const consequent = this.parseStatement();
    let alternate;
    if (this.currentToken.value === 'else') {
      this.advance();
      alternate = this.parseStatement();
    }
    return { type: 'IfStatement', test, consequent, alternate };
  }

  private parseFor(): AST.ForStatement {
    this.advance(); // for
    this.expect(TokenType.DELIMITER, '(');
    let init, test, update;
    if (this.currentToken.value !== ';') init = this.parseExpression();
    this.expect(TokenType.DELIMITER, ';');
    if (this.currentToken.value !== ';') test = this.parseExpression();
    this.expect(TokenType.DELIMITER, ';');
    if (this.currentToken.value !== ')') update = this.parseExpression();
    this.expect(TokenType.DELIMITER, ')');
    const body = this.parseStatement();
    return { type: 'ForStatement', init, test, update, body };
  }

  private parseWhile(): AST.WhileStatement {
    this.advance(); // while
    this.expect(TokenType.DELIMITER, '(');
    const test = this.parseExpression();
    this.expect(TokenType.DELIMITER, ')');
    const body = this.parseStatement();
    return { type: 'WhileStatement', test, body };
  }

  private parseDoWhile(): AST.DoWhileStatement {
    this.advance(); // do
    const body = this.parseStatement();
    this.expect(TokenType.KEYWORD, 'while');
    this.expect(TokenType.DELIMITER, '(');
    const test = this.parseExpression();
    this.expect(TokenType.DELIMITER, ')');
    this.expect(TokenType.DELIMITER, ';');
    return { type: 'DoWhileStatement', test, body };
  }

  private parseReturn(): AST.ReturnStatement {
    this.advance(); // return
    let argument;
    if (this.currentToken.value !== ';') {
      argument = this.parseExpression();
    }
    this.expect(TokenType.DELIMITER, ';');
    return { type: 'ReturnStatement', argument };
  }

  private parseExpression(precedence = 0): AST.ASTNode {
    let left = this.parsePrimary();

    while (true) {
      const op = this.currentToken.value;
      const prec = this.getPrecedence(op);
      if (prec === 0 || prec <= precedence) break;
      
      this.advance();
      const right = this.parseExpression(prec);
      left = { type: 'BinaryExpression', operator: op, left, right } as AST.BinaryExpression;
    }

    return left;
  }

  private parsePrimary(): AST.ASTNode {
    const token = this.currentToken;

    if (token.type === TokenType.NUMBER) {
      this.advance();
      return { type: 'Literal', value: parseFloat(token.value), raw: token.value };
    }
    if (token.type === TokenType.STRING) {
      this.advance();
      return { type: 'Literal', value: token.value, raw: `"${token.value}"` };
    }
    if (token.type === TokenType.IDENTIFIER) {
      const name = this.advance().value;
      let node: AST.ASTNode = { type: 'Identifier', name } as AST.Identifier;
      
      while (true) {
        const next: string = this.currentToken.value;
        if (next === '(') {
          this.advance();
          const args: any[] = [];
          while (this.currentToken.value !== ')') {
            args.push(this.parseExpression());
            if (this.currentToken.value === ',') this.advance();
          }
          this.expect(TokenType.DELIMITER, ')');
          node = { type: 'CallExpression', callee: node, arguments: args } as AST.CallExpression;
        } else if (next === '[') {
          this.advance();
          const index = this.parseExpression();
          this.expect(TokenType.DELIMITER, ']');
          node = { type: 'IndexExpression', object: node, index } as AST.IndexExpression;
        } else if (next === '.') {
          this.advance();
          const propertyName = this.expect(TokenType.IDENTIFIER).value;
          const property = { type: 'Identifier', name: propertyName } as AST.Identifier;
          node = { type: 'MemberExpression', object: node, property } as AST.MemberExpression;
        } else {
          break;
        }
      }
      return node;
    }

    if (token.value === '(') {
      this.advance();
      if (this.currentToken.type === TokenType.KEYWORD) {
        const type = this.advance().value;
        let pointerLevel = 0;
        if (this.currentToken.value === '*') {
          pointerLevel = 1;
          this.advance();
        }
        this.expect(TokenType.DELIMITER, ')');
        const argument = this.parsePrimary();
        return { type: 'CastExpression', targetType: type, pointerLevel, argument } as AST.CastExpression;
      }
      
      const expr = this.parseExpression();
      this.expect(TokenType.DELIMITER, ')');
      return expr;
    }

    const unaryOps = ['&', '*', '!', '-', '~', '++', '--'];
    if (unaryOps.includes(token.value)) {
      const op = this.advance().value;
      const arg = this.parsePrimary();
      return { type: 'UnaryExpression', operator: op, argument: arg, prefix: true } as AST.UnaryExpression;
    }

    throw new Error(`Unexpected token ${token.value} at line ${token.line}`);
  }

  private getPrecedence(op: string): number {
    switch (op) {
      case '=': return 1;
      case '||': return 2;
      case '&&': return 3;
      case '|': return 4;
      case '^': return 5;
      case '&': return 6;
      case '==': case '!=': return 7;
      case '<': case '<=': case '>': case '>=': return 8;
      case '<<': case '>>': return 9;
      case '+': case '-': return 10;
      case '*': case '/': case '%': return 11;
      default: return 0;
    }
  }
}
