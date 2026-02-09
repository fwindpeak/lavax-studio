import * as AST from './ast';
import { Opcode, SysCall } from '../vm/types';

export class Codegen {
  private buffer: number[] = [];
  private symbolTable: Map<string, any> = new Map();
  private localTable: Map<string, any> = new Map();
  private labels: Map<number, number> = new Map(); // labelId -> pos
  private fixups: { pos: number; labelId: number; size: number }[] = [];
  private nextLabelId: number = 0;

  constructor() {
    // Standard functions (SysCalls)
    this.symbolTable.set('putchar', { type: 'sys', code: SysCall.PUTCHAR });
    this.symbolTable.set('getchar', { type: 'sys', code: SysCall.GETCHAR });
    this.symbolTable.set('printf', { type: 'sys', code: SysCall.PRINTF });
    this.symbolTable.set('Refresh', { type: 'sys', code: SysCall.REFRESH });
    this.symbolTable.set('ClearScreen', { type: 'sys', code: SysCall.CLEAR_SCREEN });
    this.symbolTable.set('Circle', { type: 'sys', code: SysCall.CIRCLE });
    this.symbolTable.set('Line', { type: 'sys', code: SysCall.LINE });
    this.symbolTable.set('Box', { type: 'sys', code: SysCall.BOX });
    this.symbolTable.set('rand', { type: 'sys', code: SysCall.RAND });
  }

  generate(program: AST.Program): Uint8Array {
    this.buffer = [];
    // Placeholder for 16-byte header
    for (let i = 0; i < 16; i++) this.emit8(0);

    // Initial JMP to main? No, GVM starts at 0x10.
    // Usually, we emit global variables initialization first, then JMP to main.
    // For now, let's assume code follows.
    
    // Pass 1: Collect globals and functions
    for (const node of program.body) {
      if (node.type === 'FunctionDeclaration') {
        this.symbolTable.set(node.name, { type: 'func', pos: -1 });
      } else if (node.type === 'VariableDeclaration') {
        // Handle globals
      }
    }

    // Pass 2: Generate code
    for (const node of program.body) {
      this.genNode(node);
    }

    // Patch labels
    for (const fix of this.fixups) {
      const target = this.labels.get(fix.labelId);
      if (target === undefined) throw new Error(`Undefined label ${fix.labelId}`);
      if (fix.size === 4) {
        this.buffer[fix.pos] = target & 0xFF;
        this.buffer[fix.pos + 1] = (target >> 8) & 0xFF;
        this.buffer[fix.pos + 2] = (target >> 16) & 0xFF;
        this.buffer[fix.pos + 3] = (target >> 24) & 0xFF;
      }
    }

    // Set header
    this.buffer[0] = 0x4C; // 'L'
    this.buffer[1] = 0x41; // 'A'
    this.buffer[2] = 0x56; // 'V'
    this.buffer[3] = 0x12; // version
    this.buffer[9] = 10; // 160/16
    this.buffer[10] = 5; // 80/16

    return new Uint8Array(this.buffer);
  }

  private emit8(val: number) {
    this.buffer.push(val & 0xFF);
  }

  private emit16(val: number) {
    this.emit8(val);
    this.emit8(val >> 8);
  }

  private emit32(val: number) {
    this.emit16(val);
    this.emit16(val >> 16);
  }

  private createLabel(): number {
    return this.nextLabelId++;
  }

  private markLabel(id: number) {
    this.labels.set(id, this.buffer.length);
  }

  private emitJump(opcode: number, labelId: number) {
    this.emit8(opcode);
    const pos = this.buffer.length;
    this.emit32(0); // Placeholder for 4 bytes (actually 3 or 4 used by GVM)
    this.fixups.push({ pos, labelId, size: 4 });
  }

  private genNode(node: AST.ASTNode) {
    switch (node.type) {
      case 'FunctionDeclaration':
        this.genFunction(node);
        break;
      case 'BlockStatement':
        for (const stmt of node.body) this.genNode(stmt);
        break;
      case 'ExpressionStatement':
        this.genNode(node.expression);
        // Usually, expression result is left on stack, we should pop it if not used.
        // But GVM instructions often consume/produce. 
        // For simplicity, let's assume we need to pop if it's not a top-level void func.
        // Actually, many GVM ops like STORE push the value back. 
        // We might need a POP instruction (if it exists, but GVM docs didn't list a generic POP 0x00?)
        // Wait, GVM 0x00 is often NOP or not used. 
        break;
      case 'BinaryExpression':
        this.genNode(node.left);
        this.genNode(node.right);
        this.emitBinaryOp(node.operator);
        break;
      case 'Literal':
        if (typeof node.value === 'number') {
          if (node.value >= 0 && node.value <= 255) {
            this.emit8(Opcode.PUSH_CHAR);
            this.emit8(node.value);
          } else if (node.value >= -32768 && node.value <= 32767) {
            this.emit8(Opcode.PUSH_INT);
            this.emit16(node.value);
          } else {
            this.emit8(Opcode.PUSH_LONG);
            this.emit32(node.value);
          }
        } else if (typeof node.value === 'string') {
          this.emit8(Opcode.ADD_STRING);
          for (let i = 0; i < node.value.length; i++) this.emit8(node.value.charCodeAt(i));
          this.emit8(0);
        }
        break;
      case 'Identifier':
        const local = this.localTable.get(node.name);
        if (local) {
          this.emit8(Opcode.LOAD_R1_LONG); // Assume long for simplicity
          this.emit16(local.offset);
        } else {
          // Global?
        }
        break;
      case 'CallExpression':
        // Arguments
        for (let i = node.arguments.length - 1; i >= 0; i--) {
          this.genNode(node.arguments[i]!);
        }
        if (node.callee.type === 'Identifier') {
          const func = this.symbolTable.get(node.callee.name);
          if (func) {
            if (func.type === 'sys') {
              this.emit8(func.code);
            } else {
              // CALL with label
              const labelId = this.createLabel(); // Need to map function name to label
              // For now, let's just assume we'll fix it up later
              this.emitJump(Opcode.CALL, labelId);
            }
          }
        }
        break;
      case 'IfStatement': {
        const elseLabel = this.createLabel();
        const endLabel = this.createLabel();
        this.genNode(node.test);
        this.emitJump(Opcode.JZ, elseLabel);
        this.genNode(node.consequent);
        this.emitJump(Opcode.JMP, endLabel);
        this.markLabel(elseLabel);
        if (node.alternate) this.genNode(node.alternate);
        this.markLabel(endLabel);
        break;
      }
      case 'WhileStatement': {
        const startLabel = this.createLabel();
        const endLabel = this.createLabel();
        this.markLabel(startLabel);
        this.genNode(node.test);
        this.emitJump(Opcode.JZ, endLabel);
        this.genNode(node.body);
        this.emitJump(Opcode.JMP, startLabel);
        this.markLabel(endLabel);
        break;
      }
      case 'ReturnStatement':
        if (node.argument) this.genNode(node.argument);
        else { this.emit8(Opcode.PUSH_CHAR); this.emit8(0); }
        this.emit8(Opcode.RET);
        break;
    }
  }

  private genFunction(node: AST.FunctionDeclaration) {
    const sym = this.symbolTable.get(node.name);
    if (sym) sym.pos = this.buffer.length;
    
    this.localTable.clear();
    
    // ENTER size, cnt
    // size = space for locals. For now let's just count them.
    // For simplicity, let's generate ENTER 64, 0
    this.emit8(Opcode.ENTER);
    this.emit16(64);
    this.emit8(node.params.length);
    
    // Map params to local offsets (relative to regionStart)
    // Parameters are pushed to stack before CALL, 
    // ENTER copies them to the region.
    // In GVM, ENTER's cnt parameter says how many arguments to copy from the stack to the region.
    let offset = 0;
    for (const p of node.params) {
      this.localTable.set(p.name, { offset });
      offset += 4;
    }
    
    this.genNode(node.body);
    
    // Implicit return 0 if no EXIT/RET
    this.emit8(Opcode.PUSH_CHAR);
    this.emit8(0);
    this.emit8(Opcode.RET);
  }

  private emitBinaryOp(op: string) {
    switch (op) {
      case '+': this.emit8(Opcode.ADD); break;
      case '-': this.emit8(Opcode.SUB); break;
      case '*': this.emit8(Opcode.MUL); break;
      case '/': this.emit8(Opcode.DIV); break;
      case '%': this.emit8(Opcode.MOD); break;
      case '==': this.emit8(Opcode.EQ); break;
      case '!=': this.emit8(Opcode.NEQ); break;
      case '<': this.emit8(Opcode.LT); break;
      case '>': this.emit8(Opcode.GT); break;
      case '<=': this.emit8(Opcode.LE); break;
      case '>=': this.emit8(Opcode.GE); break;
      case '=': this.emit8(Opcode.STORE); break;
    }
  }
}
