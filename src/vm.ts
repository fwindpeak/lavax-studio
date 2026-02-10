
import {
  MEMORY_SIZE, Op,
  VRAM_OFFSET, BUF_OFFSET, TEXT_OFFSET, HEAP_OFFSET,
  HANDLE_TYPE_BYTE, HANDLE_TYPE_WORD, HANDLE_TYPE_DWORD, HANDLE_BASE_EBP
} from './types';
import { VirtualFileSystem } from './vm/VirtualFileSystem';
import { GraphicsEngine } from './vm/GraphicsEngine';
import { SyscallHandler } from './vm/SyscallHandler';

export class LavaXVM {
  public memory = new Uint8Array(MEMORY_SIZE);
  private fd = new Uint8Array(0);     // File data buffer
  public stk = new Int32Array(4096); // Operand stack
  public esp = 0;                    // Stack pointer
  private pc = 0;                     // EIP (Instruction pointer)
  private ebp = 0;                    // Base pointer
  private ebp2 = 0;                   // Dynamic space pointer (for frame management)
  public running = false;
  public debug = false;               // Verbose logging flag
  public startTime = Date.now();
  private codeLength = 0;
  public keyBuffer: number[] = [];
  private strMask = 0;

  public vfs = new VirtualFileSystem();
  public graphics: GraphicsEngine;
  private syscall: SyscallHandler;

  public onUpdateScreen: (imageData: ImageData) => void = () => { };
  public onLog: (msg: string) => void = () => { };
  public onFinished: () => void = () => { };

  constructor() {
    this.graphics = new GraphicsEngine(this.memory, (img) => this.onUpdateScreen(img));
    this.syscall = new SyscallHandler(this);
  }

  public setInternalFontData(data: Uint8Array) {
    this.graphics.setInternalFontData(data);
  }

  load(lav: Uint8Array) {
    if (lav.length < 16) {
      this.onLog(`VM Error: File too small (${lav.length} bytes)`);
      return;
    }
    if (lav[0] !== 0x4C || lav[1] !== 0x41 || lav[2] !== 0x56) {
      this.onLog(`VM Error: Invalid magic ${lav[0]},${lav[1]},${lav[2]}`);
      return;
    }
    this.onLog(`VM: Loading LAV file v0x${lav[3].toString(16)}...`);
    this.onLog(`VM: Memory limit: 0x${lav[5].toString(16)}`);
    console.log(`VM: Loading LAV file v0x${lav[3].toString(16)}...`, lav);
    this.fd = lav;
    this.codeLength = lav.length;
    // jp_var is at 0x08-0x09
    const jpVar = lav[8] | (lav[9] << 8);
    this.pc = jpVar > 0 ? jpVar : 0x10;
  }

  async run() {
    if (this.codeLength === 0) {
      this.onLog("VM Error: No code loaded.");
      return;
    }
    this.running = true;
    this.esp = 0;
    this.ebp = 0;
    this.ebp2 = HEAP_OFFSET;
    this.keyBuffer = [];
    this.vfs.clearHandles();
    this.strMask = 0;
    const jpVar = this.fd[8] | (this.fd[9] << 8);
    this.pc = jpVar > 0 ? jpVar : 0x10;
    this.memory.fill(0);
    this.startTime = Date.now();
    this.graphics.flushScreen();

    this.onLog("VM: Starting execution...");
    console.log("VM: Starting execution...");
    try {
      let stepCount = 0;
      while (this.running && this.pc < this.codeLength) {
        await this.step();
        stepCount++;
        if (stepCount % 2000 === 0) {
          this.graphics.flushScreen();
          await new Promise(r => requestAnimationFrame(r));
        }
      }
      this.onLog(`VM: Terminated at PC: ${this.pc}`);
    } catch (e: any) {
      if (this.debug) this.dumpState();
      this.onLog(`VM Runtime Error: ${e.message} at PC: ${this.pc}`);
      console.error(`VM Runtime Error: ${e.message} at PC: ${this.pc}`, e);
      this.running = false;
    }

    this.graphics.flushScreen();

    this.running = false;
    this.onFinished();
  }

  stop() { this.running = false; }

  pushKey(code: number) {
    if (code) this.keyBuffer.push(code);
  }

  private readByte() { return this.fd[this.pc++]; }
  private readInt16() {
    const low = this.fd[this.pc++];
    const high = this.fd[this.pc++];
    const val = low | (high << 8);
    return val > 32767 ? val - 65536 : val;
  }
  private readUInt24() {
    const b1 = this.fd[this.pc++];
    const b2 = this.fd[this.pc++];
    const b3 = this.fd[this.pc++];
    return (b1 | (b2 << 8) | (b3 << 16)) >>> 0;
  }
  private readInt32() {
    const b1 = this.fd[this.pc++];
    const b2 = this.fd[this.pc++];
    const b3 = this.fd[this.pc++];
    const b4 = this.fd[this.pc++];
    return (b1 | (b2 << 8) | (b3 << 16) | (b4 << 24)) | 0;
  }

  public push(val: number) {
    if (this.esp >= this.stk.length) throw new Error("Stack Overflow");
    this.stk[this.esp++] = val | 0;
  }
  public pop() {
    if (this.esp <= 0) throw new Error("Stack Underflow");
    return this.stk[--this.esp];
  }

  public pushFloat(val: number) {
    const buffer = new ArrayBuffer(4);
    new Float32Array(buffer)[0] = val;
    this.push(new Int32Array(buffer)[0]);
  }
  public popFloat() {
    const val = this.pop();
    const buffer = new ArrayBuffer(4);
    new Int32Array(buffer)[0] = val;
    return new Float32Array(buffer)[0];
  }

  private memRead(addr: number, size: number): number {
    if (addr >= HANDLE_BASE_EBP) {
      return this.stk[this.ebp + 3 + (addr & 0xFFFF)];
    }
    const realAddr = this.resolveAddress(addr);
    if (realAddr < 0 || realAddr + size > MEMORY_SIZE) return 0;
    if (size === 1) return this.memory[realAddr];
    if (size === 2) {
      const val = this.memory[realAddr] | (this.memory[realAddr + 1] << 8);
      return val > 32767 ? val - 65536 : val; // Convert to signed 16-bit
    }
    if (size === 3) {
      return (this.memory[realAddr] | (this.memory[realAddr + 1] << 8) | (this.memory[realAddr + 2] << 16)) >>> 0;
    }
    if (size === 4) {
      return (this.memory[realAddr] | (this.memory[realAddr + 1] << 8) | (this.memory[realAddr + 2] << 16) | (this.memory[realAddr + 3] << 24)) | 0; // Signed 32-bit
    }
    return 0;
  }

  private memWrite(addr: number, val: number, size: number) {
    if (addr >= HANDLE_BASE_EBP) {
      this.stk[this.ebp + 3 + (addr & 0xFFFF)] = val;
      return;
    }
    const realAddr = this.resolveAddress(addr);
    if (realAddr < 0 || realAddr + size > MEMORY_SIZE) return;
    if (size === 1) {
      this.memory[realAddr] = val & 0xFF;
    } else if (size === 2) {
      this.memory[realAddr] = val & 0xFF;
      this.memory[realAddr + 1] = (val >> 8) & 0xFF;
    } else if (size === 3) {
      this.memory[realAddr] = val & 0xFF;
      this.memory[realAddr + 1] = (val >> 8) & 0xFF;
      this.memory[realAddr + 2] = (val >> 16) & 0xFF;
    } else if (size === 4) {
      this.memory[realAddr] = val & 0xFF;
      this.memory[realAddr + 1] = (val >> 8) & 0xFF;
      this.memory[realAddr + 2] = (val >> 16) & 0xFF;
      this.memory[realAddr + 3] = (val >> 24) & 0xFF;
    }
  }

  public resolveAddress(addr: number): number {
    const offset = addr & 0xFFFFFF;
    if (addr & 0x800000) {
      return (this.ebp + offset) & (MEMORY_SIZE - 1);
    }
    return offset & (MEMORY_SIZE - 1);
  }

  private writeByHandle(handle: number, val: number) {
    const actualAddr = this.resolveAddress(handle);
    const type = handle & 0x70000;
    let size = 4;
    if (type === HANDLE_TYPE_BYTE) size = 1;
    else if (type === HANDLE_TYPE_WORD) size = 2;
    this.memWrite(actualAddr, val, size);
  }

  private readByHandle(handle: number) {
    const actualAddr = this.resolveAddress(handle);
    const type = handle & 0x70000;
    let size = 4;
    if (type === HANDLE_TYPE_BYTE) size = 1;
    else if (type === HANDLE_TYPE_WORD) size = 2;
    return this.memRead(actualAddr, size);
  }

  private async step() {
    const pcBefore = this.pc;
    const op = this.readByte();
    if (op === undefined) {
      this.running = false;
      return;
    }

    if (this.debug) {
      this.onLog(`[DEBUG] PC: 0x${pcBefore.toString(16).padStart(4, '0')}, Op: 0x${op.toString(16).padStart(2, '0')}, ESP: ${this.esp}, EBP: 0x${this.ebp.toString(16)}`);
    }

    if (op & 0x80) {
      const res = await this.syscall.handle(op);
      this.push(res);
      return;
    }

    switch (op) {
      case Op.NOP: break;
      case Op.PUSH_B: this.push(this.readByte()); break;
      case Op.PUSH_W: this.push(this.readInt16()); break;
      case Op.PUSH_D: this.push(this.readInt32()); break;

      case Op.LD_G_B: this.push(this.memRead(this.readInt16(), 1)); break;
      case Op.LD_G_W: this.push(this.memRead(this.readInt16(), 2)); break;
      case Op.LD_G_D: this.push(this.memRead(this.readInt16(), 4)); break;

      case Op.LD_GO_B: { const off = this.readInt16(); this.push(this.memRead(this.pop() + off, 1)); break; }
      case Op.LD_GO_W: { const off = this.readInt16(); this.push(this.memRead(this.pop() + off, 2)); break; }
      case Op.LD_GO_D: { const off = this.readInt16(); this.push(this.memRead(this.pop() + off, 4)); break; }

      case Op.LEA_G_B: this.push(HANDLE_TYPE_BYTE | this.readInt16()); break;
      case Op.LEA_G_W: this.push(HANDLE_TYPE_WORD | this.readInt16()); break;
      case Op.LEA_G_D: this.push(HANDLE_TYPE_DWORD | this.readInt16()); break;

      case Op.PUSH_STR: {
        const start = this.pc;
        while (this.fd[this.pc] !== 0 && this.pc < this.codeLength) this.pc++;
        const strBytes = this.fd.slice(start, this.pc);
        this.pc++;
        const addr = this.ebp2;
        for (let i = 0; i < strBytes.length; i++) {
          this.memory[addr + i] = strBytes[i] ^ this.strMask;
        }
        this.memory[addr + strBytes.length] = 0;
        const oldEbp2 = this.ebp2;
        this.ebp2 += strBytes.length + 1;
        this.push(oldEbp2);
        break;
      }

      case Op.LD_L_B: this.push(this.stk[this.ebp + 3 + this.readInt16()] & 0xFF); break;
      case Op.LD_L_W: this.push(this.stk[this.ebp + 3 + this.readInt16()] & 0xFFFF); break;
      case Op.LD_L_D: this.push(this.stk[this.ebp + 3 + this.readInt16()]); break;

      case Op.LD_LO_B: { const off = this.readInt16(); this.push(this.memRead(this.ebp + this.pop() + off, 1)); break; }
      case Op.LD_LO_W: { const off = this.readInt16(); this.push(this.memRead(this.ebp + this.pop() + off, 2)); break; }
      case Op.LD_LO_D: { const off = this.readInt16(); this.push(this.memRead(this.pop() + off, 4)); break; }

      case Op.LEA_L_B: this.push(HANDLE_BASE_EBP | HANDLE_TYPE_BYTE | this.readInt16()); break;
      case Op.LEA_L_W: this.push(HANDLE_BASE_EBP | HANDLE_TYPE_WORD | this.readInt16()); break;
      case Op.LEA_L_D: this.push(HANDLE_BASE_EBP | HANDLE_TYPE_DWORD | this.readInt16()); break;

      case Op.LEA_OFT: this.push((this.pop() + this.readInt16()) & 0xFFFF); break;
      case Op.LEA_L_PH: this.push(this.pop() + this.readInt16() + this.ebp); break;
      case Op.LEA_ABS: this.push(this.readInt16() + this.ebp); break;

      case Op.LD_TEXT: this.push(TEXT_OFFSET); break;
      case Op.LD_GRAP: this.push(VRAM_OFFSET); break;
      case Op.LD_GBUF: this.push(BUF_OFFSET); break;

      case Op.NEG: this.push(-this.pop()); break;
      case Op.INC_PRE: { const h = this.pop(); const v = this.readByHandle(h) + 1; this.writeByHandle(h, v); this.push(v); break; }
      case Op.DEC_PRE: { const h = this.pop(); const v = this.readByHandle(h) - 1; this.writeByHandle(h, v); this.push(v); break; }
      case Op.INC_POST: { const h = this.pop(); const v = this.readByHandle(h); this.writeByHandle(h, v + 1); this.push(v); break; }
      case Op.DEC_POST: { const h = this.pop(); const v = this.readByHandle(h); this.writeByHandle(h, v - 1); this.push(v); break; }

      case Op.ADD: { const b = this.pop(); const a = this.pop(); this.push(a + b); break; }
      case Op.SUB: { const b = this.pop(); const a = this.pop(); this.push(a - b); break; }
      case Op.AND: { const b = this.pop(); const a = this.pop(); this.push(a & b); break; }
      case Op.OR: { const b = this.pop(); const a = this.pop(); this.push(a | b); break; }
      case Op.XOR: { const b = this.pop(); const a = this.pop(); this.push(a ^ b); break; }
      case Op.NOT: this.push(~this.pop()); break;
      case Op.L_AND: { const b = this.pop(); const a = this.pop(); this.push(a && b ? 1 : 0); break; }
      case Op.L_OR: { const b = this.pop(); const a = this.pop(); this.push(a || b ? 1 : 0); break; }
      case Op.L_NOT: this.push(!this.pop() ? 1 : 0); break;

      case Op.MUL: { const b = this.pop(); const a = this.pop(); this.push(a * b); break; }
      case Op.DIV: { const b = this.pop(); const a = this.pop(); this.push(b === 0 ? 0 : (a / b) | 0); break; }
      case Op.MOD: { const b = this.pop(); const a = this.pop(); this.push(b === 0 ? 0 : a % b); break; }
      case Op.SHL: { const b = this.pop(); const a = this.pop(); this.push(a << b); break; }
      case Op.SHR: { const b = this.pop(); const a = this.pop(); this.push(a >> b); break; }

      case Op.EQ: { const b = this.pop(); const a = this.pop(); this.push(a === b ? 1 : 0); break; }
      case Op.NEQ: { const b = this.pop(); const a = this.pop(); this.push(a !== b ? 1 : 0); break; }
      case Op.GT: { const b = this.pop(); const a = this.pop(); this.push(a > b ? 1 : 0); break; }
      case Op.LT: { const b = this.pop(); const a = this.pop(); this.push(a < b ? 1 : 0); break; }
      case Op.GE: { const b = this.pop(); const a = this.pop(); this.push(a >= b ? 1 : 0); break; }
      case Op.LE: { const b = this.pop(); const a = this.pop(); this.push(a <= b ? 1 : 0); break; }

      case Op.STORE: {
        const h = this.pop();
        const val = this.pop();
        this.writeByHandle(h, val);
        this.push(val);
        break;
      }
      case Op.LD_IND: this.push(this.memRead(this.pop(), 4)); break;
      case Op.POP: this.pop(); break;

      case Op.JZ: { const addr = this.readUInt24(); if (this.pop() === 0) this.pc = addr; break; }
      case Op.JMP: { this.pc = this.readUInt24(); break; }
      case Op.SPACE: {
        const val = this.readInt16();
        this.ebp = this.ebp2 = val;
        break;
      }

      case Op.CALL: {
        const addr = this.readUInt24();
        const retEip = this.pc;
        this.memWrite(this.ebp2, retEip, 3);
        this.memWrite(this.ebp2 + 3, this.ebp, 2);
        this.ebp = this.ebp2;
        this.pc = addr;
        break;
      }
      case Op.FUNC: {
        const argc = this.readByte();
        const size = this.readInt16();
        this.ebp2 += size;
        if (argc > 0) {
          for (let i = 0; i < argc; i++) {
            this.memWrite(this.ebp + 5 + (argc - 1 - i) * 4, this.pop(), 4);
          }
        }
        break;
      }
      case Op.RET: {
        const retVal = this.esp > 0 ? this.pop() : 0;
        this.pc = this.memRead(this.ebp, 3);
        const oldEbp = this.memRead(this.ebp + 3, 2);
        this.ebp2 = this.ebp;
        this.ebp = oldEbp;
        this.push(retVal);
        break;
      }
      case Op.EXIT: this.running = false; break;
      case Op.FINISH: this.running = false; break;
      case Op.INIT: {
        const addr = this.readInt16();
        const len = this.readInt16();
        for (let i = 0; i < len; i++) this.memory[addr + i] = this.readByte();
        break;
      }
      case Op.MASK: this.strMask = this.readByte(); break;
      case Op.LOADALL: break;

      case Op.POP: this.pop(); break;

      default:
        if (this.debug) this.dumpState();
        this.onLog(`VM Error: Unknown opcode 0x${op.toString(16)} at PC: ${this.pc}`);
        this.running = false;
        break;
    }
  }

  private dumpState() {
    this.onLog(`--- VM STATE DUMP ---`);
    this.onLog(`PC:  0x${this.pc.toString(16).padStart(4, '0')} (${this.pc})`);
    this.onLog(`ESP: ${this.esp}`);
    this.onLog(`EBP: 0x${this.ebp.toString(16).padStart(4, '0')} (${this.ebp})`);
    this.onLog(`EBP2: 0x${this.ebp2.toString(16).padStart(4, '0')} (${this.ebp2})`);
    let stackTrace = "Stack (Top 20): ";
    for (let i = Math.max(0, this.esp - 20); i < this.esp; i++) {
      stackTrace += `${this.stk[i]} `;
    }
    this.onLog(stackTrace);
    this.onLog(`----------------------`);
  }

  public getStringBytes(handle: number): Uint8Array | null {
    const addr = this.resolveAddress(handle);
    if (addr < 0 || addr >= MEMORY_SIZE) return null;
    let end = addr;
    while (end < MEMORY_SIZE && this.memory[end] !== 0) end++;
    return this.memory.slice(addr, end);
  }
}
