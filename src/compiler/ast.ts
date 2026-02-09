export type ASTNode = 
  | Program
  | FunctionDeclaration
  | VariableDeclaration
  | StructDeclaration
  | BlockStatement
  | IfStatement
  | ForStatement
  | WhileStatement
  | DoWhileStatement
  | ReturnStatement
  | ExpressionStatement
  | BinaryExpression
  | UnaryExpression
  | Literal
  | Identifier
  | CallExpression
  | MemberExpression
  | IndexExpression
  | CastExpression;

export interface Program {
  type: 'Program';
  body: (FunctionDeclaration | VariableDeclaration | StructDeclaration)[];
}

export interface FunctionDeclaration {
  type: 'FunctionDeclaration';
  returnType: string;
  name: string;
  params: { name: string; type: string; isRef: boolean }[];
  body: BlockStatement;
}

export interface VariableDeclaration {
  type: 'VariableDeclaration';
  varType: string;
  isRef: boolean;
  declarators: { name: string; arraySize?: number; init?: ASTNode }[];
}

export interface StructDeclaration {
  type: 'StructDeclaration';
  name: string;
  members: { name: string; type: string; arraySize?: number }[];
}

export interface BlockStatement {
  type: 'BlockStatement';
  body: ASTNode[];
}

export interface IfStatement {
  type: 'IfStatement';
  test: ASTNode;
  consequent: ASTNode;
  alternate?: ASTNode;
}

export interface ForStatement {
  type: 'ForStatement';
  init?: ASTNode;
  test?: ASTNode;
  update?: ASTNode;
  body: ASTNode;
}

export interface WhileStatement {
  type: 'WhileStatement';
  test: ASTNode;
  body: ASTNode;
}

export interface DoWhileStatement {
  type: 'DoWhileStatement';
  test: ASTNode;
  body: ASTNode;
}

export interface ReturnStatement {
  type: 'ReturnStatement';
  argument?: ASTNode;
}

export interface ExpressionStatement {
  type: 'ExpressionStatement';
  expression: ASTNode;
}

export interface BinaryExpression {
  type: 'BinaryExpression';
  operator: string;
  left: ASTNode;
  right: ASTNode;
}

export interface UnaryExpression {
  type: 'UnaryExpression';
  operator: string;
  argument: ASTNode;
  prefix: boolean;
}

export interface Literal {
  type: 'Literal';
  value: any;
  raw: string;
}

export interface Identifier {
  type: 'Identifier';
  name: string;
}

export interface CallExpression {
  type: 'CallExpression';
  callee: ASTNode;
  arguments: ASTNode[];
}

export interface MemberExpression {
  type: 'MemberExpression';
  object: ASTNode;
  property: ASTNode;
}

export interface IndexExpression {
  type: 'IndexExpression';
  object: ASTNode;
  index: ASTNode;
}

export interface CastExpression {
  type: 'CastExpression';
  targetType: string;
  pointerLevel: number;
  argument: ASTNode;
}
