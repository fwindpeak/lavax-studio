import { Opcode, SysCall, TOTAL_RAM_SIZE } from './types';
import { LavaXScreen } from './screen';

export class GVM {
  public ram: Uint8Array;
  public screen: LavaXScreen;

  // Registers
  private pc: number = 0x10;
  private sp: number = TOTAL_RAM_SIZE - 4;
  private regionStart: number = 0;
  private seed: number = 0;
  public running: boolean = false;

  private code: Uint8Array = new Uint8Array(0);

  constructor() {
    this.ram = new Uint8Array(TOTAL_RAM_SIZE);
    this.screen = new LavaXScreen(this.ram);
    this.seed = Date.now() & 0xFFFFFFFF;
  }

  loadProgram(data: Uint8Array) {
    this.code = data;
    this.ram.fill(0);
    this.pc = 0x10;
    this.sp = TOTAL_RAM_SIZE - 4;
    this.regionStart = this.sp;
    this.running = true;
  }

  private readByte(): number {
    if (this.pc >= this.code.length) {
      this.running = false;
      return 0;
    }
    return this.code[this.pc++] as number;
  }

  private readInt16(): number {
    if (this.pc + 1 >= this.code.length) {
      this.running = false;
      return 0;
    }
    const val = (this.code[this.pc] as number) | ((this.code[this.pc + 1] as number) << 8);
    this.pc += 2;
    return (val << 16) >> 16;
  }

  private readInt32(): number {
    if (this.pc + 3 >= this.code.length) {
      this.running = false;
      return 0;
    }
    const val = (this.code[this.pc] as number) | 
                ((this.code[this.pc + 1] as number) << 8) | 
                ((this.code[this.pc + 2] as number) << 16) | 
                ((this.code[this.pc + 3] as number) << 24);
    this.pc += 4;
    return val;
  }

  private readAddr(): number {
    return this.readInt32();
  }

  private push(val: number) {
    this.sp -= 4;
    this.ram[this.sp] = val & 0xFF;
    this.ram[this.sp + 1] = (val >> 8) & 0xFF;
    this.ram[this.sp + 2] = (val >> 16) & 0xFF;
    this.ram[this.sp + 3] = (val >> 24) & 0xFF;
  }

  private pop(): number {
    const val = (this.ram[this.sp] as number) | 
                ((this.ram[this.sp + 1] as number) << 8) | 
                ((this.ram[this.sp + 2] as number) << 16) | 
                ((this.ram[this.sp + 3] as number) << 24);
    this.sp += 4;
    return val;
  }

  private readMem8(addr: number): number {
    return this.ram[addr & (TOTAL_RAM_SIZE - 1)] as number;
  }

  private readMem16(addr: number): number {
    const a = addr & (TOTAL_RAM_SIZE - 1);
    const val = (this.ram[a] as number) | ((this.ram[a + 1] as number) << 8);
    return (val << 16) >> 16;
  }

  private writeMem32(addr: number, val: number) {
    const a = addr & (TOTAL_RAM_SIZE - 1);
    this.ram[a] = val & 0xFF;
    this.ram[a + 1] = (val >> 8) & 0xFF;
    this.ram[a + 2] = (val >> 16) & 0xFF;
    this.ram[a + 3] = (val >> 24) & 0xFF;
  }

  private readMem32(addr: number): number {
    const a = addr & (TOTAL_RAM_SIZE - 1);
    return (this.ram[a] as number) | 
           ((this.ram[a + 1] as number) << 8) | 
           ((this.ram[a + 2] as number) << 16) | 
           ((this.ram[a + 3] as number) << 24);
  }

  step() {
    if (!this.running) return;

    const opcode = this.readByte();

    if (opcode & 0x80) {
      this.handleSysCall(opcode);
    } else {
      this.handleOpcode(opcode);
    }
  }

  private handleOpcode(opcode: number) {
    switch (opcode) {
      case Opcode.PUSH_CHAR:
        this.push(this.readByte());
        break;
      case Opcode.PUSH_INT:
        this.push(this.readInt16());
        break;
      case Opcode.PUSH_LONG:
        this.push(this.readInt32());
        break;
      case Opcode.PUSH_ADDR_CHAR:
        this.push(this.readMem8(this.readAddr()));
        break;
      case Opcode.PUSH_ADDR_INT:
        this.push(this.readMem16(this.readAddr()));
        break;
      case Opcode.PUSH_ADDR_LONG:
        this.push(this.readMem32(this.readAddr()));
        break;
      case Opcode.PUSH_OFFSET_CHAR: {
        const offset = this.readInt16();
        const addr = this.pop();
        this.push(this.readMem8(addr + offset));
        break;
      }
      case Opcode.PUSH_OFFSET_INT: {
        const offset = this.readInt16();
        const addr = this.pop();
        this.push(this.readMem16(addr + offset));
        break;
      }
      case Opcode.PUSH_OFFSET_LONG: {
        const offset = this.readInt16();
        const addr = this.pop();
        this.push(this.readMem32(addr + offset));
        break;
      }
      case Opcode.ADD_STRING: {
        const start = this.pc;
        while (this.pc < this.code.length && this.code[this.pc] !== 0) this.pc++;
        const strLen = this.pc - start;
        this.pc++; // skip null
        const strAddr = 0x10000;
        for (let i = 0; i < strLen; i++) {
          this.ram[strAddr + i] = this.code[start + i] as number;
        }
        this.ram[strAddr + strLen] = 0;
        this.push(strAddr);
        break;
      }
      case Opcode.LOAD_R1_CHAR:
        this.push(this.readMem8(this.regionStart + this.readInt16()));
        break;
      case Opcode.LOAD_R1_INT:
        this.push(this.readMem16(this.regionStart + this.readInt16()));
        break;
      case Opcode.LOAD_R1_LONG:
        this.push(this.readMem32(this.regionStart + this.readInt16()));
        break;
      case Opcode.PUSH_R_ADDR:
        this.push(this.regionStart + this.readInt16());
        break;
      case Opcode.ADD: {
        const b = this.pop();
        const a = this.pop();
        this.push(a + b);
        break;
      }
      case Opcode.SUB: {
        const b = this.pop();
        const a = this.pop();
        this.push(a - b);
        break;
      }
      case Opcode.MUL: {
        const b = this.pop();
        const a = this.pop();
        this.push(a * b);
        break;
      }
      case Opcode.DIV: {
        const b = this.pop();
        const a = this.pop();
        this.push(b === 0 ? 0 : Math.trunc(a / b));
        break;
      }
      case Opcode.MOD: {
        const b = this.pop();
        const a = this.pop();
        this.push(b === 0 ? 0 : a % b);
        break;
      }
      case Opcode.EQ: {
        const b = this.pop();
        const a = this.pop();
        this.push(a === b ? -1 : 0);
        break;
      }
      case Opcode.NEQ: {
        const b = this.pop();
        const a = this.pop();
        this.push(a !== b ? -1 : 0);
        break;
      }
      case Opcode.LT: {
        const b = this.pop();
        const a = this.pop();
        this.push(a < b ? -1 : 0);
        break;
      }
      case Opcode.GT: {
        const b = this.pop();
        const a = this.pop();
        this.push(a > b ? -1 : 0);
        break;
      }
      case Opcode.LE: {
        const b = this.pop();
        const a = this.pop();
        this.push(a <= b ? -1 : 0);
        break;
      }
      case Opcode.GE: {
        const b = this.pop();
        const a = this.pop();
        this.push(a >= b ? -1 : 0);
        break;
      }
      case Opcode.JZ: {
        const addr = this.readInt32() & 0xFFFFFF;
        if (this.pop() === 0) this.pc = addr;
        break;
      }
      case Opcode.JNZ: {
        const addr = this.readInt32() & 0xFFFFFF;
        if (this.pop() !== 0) this.pc = addr;
        break;
      }
      case Opcode.JMP: {
        const addr = this.readInt32() & 0xFFFFFF;
        this.pc = addr;
        break;
      }
      case Opcode.STORE: {
        const addr = this.pop();
        const val = this.pop();
        this.writeMem32(addr, val);
        this.push(val);
        break;
      }
      case Opcode.ENTER: {
        const size = this.readInt16();
        this.readByte(); // skip cnt
        this.push(this.regionStart);
        this.regionStart = this.sp;
        this.sp -= size;
        break;
      }
      case Opcode.RET: {
        const retVal = this.pop();
        this.sp = this.regionStart;
        this.regionStart = this.pop();
        this.pc = this.pop();
        this.push(retVal);
        break;
      }
      case Opcode.CALL: {
        const addr = this.readInt32() & 0xFFFFFF;
        this.push(this.pc);
        this.pc = addr;
        break;
      }
      case Opcode.EXIT:
        this.running = false;
        break;
      default:
        console.warn('Unknown opcode:', opcode.toString(16));
        this.running = false;
        break;
    }
  }

  private rand(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7FFFFFFF;
    return this.seed;
  }

  private handleSysCall(opcode: number) {
    switch (opcode) {
      case SysCall.REFRESH:
        this.screen.refresh();
        break;
      case SysCall.CLEAR_SCREEN:
        this.screen.clear();
        break;
      case SysCall.DELAY:
        this.pop();
        break;
      case SysCall.GETCHAR:
        this.push(0);
        break;
      case SysCall.CIRCLE: {
        const type = this.pop();
        const fill = this.pop();
        const r = this.pop();
        const y = this.pop();
        const x = this.pop();
        this.screen.drawCircle(x, y, r, fill !== 0, type);
        break;
      }
      case SysCall.LINE: {
        const type = this.pop();
        const y1 = this.pop();
        const x1 = this.pop();
        const y0 = this.pop();
        const x0 = this.pop();
        this.screen.drawLine(x0, y0, x1, y1, type);
        break;
      }
      case SysCall.BOX: {
        const type = this.pop();
        const fill = this.pop();
        const y1 = this.pop();
        const x1 = this.pop();
        const y0 = this.pop();
        const x0 = this.pop();
        this.screen.drawRect(x0, y0, x1, y1, fill !== 0, type);
        break;
      }
      case SysCall.POINT: {
        const type = this.pop();
        const y = this.pop();
        const x = this.pop();
        this.screen.drawPoint(x, y, type);
        break;
      }
      case SysCall.RAND:
        this.push(this.rand() & 0x7FFF);
        break;
      default:
        console.warn('Unknown syscall:', opcode.toString(16));
        break;
    }
  }
}
