
import {
  SCREEN_WIDTH, SCREEN_HEIGHT, MEMORY_SIZE, Op, SystemOp, MathOp, FloatOp,
  VRAM_OFFSET, BUF_OFFSET, TEXT_OFFSET, HEAP_OFFSET,
  HANDLE_TYPE_BYTE, HANDLE_TYPE_WORD, HANDLE_TYPE_DWORD, HANDLE_BASE_EBP,
  STR_MASK
} from './types';

export class LavaXVM {
  private memory = new Uint8Array(MEMORY_SIZE);
  private fd = new Uint8Array(0);     // File data buffer
  private stk = new Int32Array(4096); // Operand stack (Increased from 1024)
  private esp = 0;                    // Stack pointer
  private pc = 0;                     // EIP (Instruction pointer)
  private ebp = 0;                    // Base pointer
  private ebp2 = 0;                   // Dynamic space pointer (for frame management)
  private running = false;
  public debug = false;               // Verbose logging flag
  private startTime = Date.now();
  private codeLength = 0;
  private keyBuffer: number[] = [];

  private files: Map<string, Uint8Array> = new Map();
  private fileHandles: Map<number, { name: string, pos: number, data: Uint8Array }> = new Map();
  private nextHandle = 1;

  private fontData: Uint8Array | null = null;
  private fontOffsets: number[] = [];
  private currentFontSize: 12 | 16 = 16;
  private colorMode: number = 1;

  public onUpdateScreen: (imageData: ImageData) => void = () => { };
  public onLog: (msg: string) => void = () => { };
  public onFinished: () => void = () => { };

  constructor() {
    this.loadVFSFromStorage();
  }

  private async loadVFSFromStorage() {
    try {
      if (typeof localStorage === 'undefined') return;
      const saved = localStorage.getItem('lavax_vfs_v2');
      if (saved) {
        const obj = JSON.parse(saved);
        for (const k in obj) {
          const arr = Uint8Array.from(atob(obj[k]), c => c.charCodeAt(0));
          this.files.set(k, arr);
        }
      }
    } catch (e) {
      console.warn("Storage access not allowed:", e);
    }
  }

  private saveVFSToStorage() {
    if (typeof localStorage === 'undefined') return;
    const obj: any = {};
    this.files.forEach((v, k) => {
      let binary = '';
      const len = v.byteLength;
      for (let i = 0; i < len; i++) binary += String.fromCharCode(v[i]);
      obj[k] = btoa(binary);
    });
    localStorage.setItem('lavax_vfs_v2', JSON.stringify(obj));
  }

  public setInternalFontData(data: Uint8Array) {
    if (data && data.length >= 16) {
      this.fontData = data;
      const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
      this.fontOffsets = [];
      for (let i = 0; i < 4; i++) {
        this.fontOffsets.push(view.getUint32(i * 4, true));
      }
    }
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
    this.fd = lav;
    this.codeLength = lav.length;
    this.pc = 0x10;
    this.memory.fill(0);
  }

  public addFile(path: string, data: Uint8Array) {
    this.files.set(path, data);
    this.saveVFSToStorage();
  }
  public getFile(path: string) { return this.files.get(path); }
  public deleteFile(path: string) { this.files.delete(path); this.saveVFSToStorage(); }
  public getFiles() { return Array.from(this.files.entries()).map(([p, d]) => ({ path: p, size: d.length })); }

  async run() {
    if (this.codeLength === 0) {
      this.onLog("VM Error: No code loaded.");
      return;
    }
    this.running = true;
    this.esp = 0;
    this.ebp = 0;           // Base 0 for sentinel check
    this.ebp2 = HEAP_OFFSET; // Frames start at HEAP_OFFSET
    this.keyBuffer = [];
    this.fileHandles.clear();
    this.nextHandle = 1;
    this.currentFontSize = 16;
    this.colorMode = 1;
    this.pc = 0x10; // IMPORTANT: Reset PC to entry point on every run
    this.startTime = Date.now();
    this.flushScreen();

    this.onLog("VM: Starting execution...");
    try {
      let stepCount = 0;
      while (this.running && this.pc < this.codeLength) {
        await this.step();
        stepCount++;
        if (stepCount % 2000 === 0) {
          await new Promise(r => requestAnimationFrame(r));
        }
      }
      this.onLog(`VM: Terminated at PC: ${this.pc}`);
    } catch (e: any) {
      if (this.debug) this.dumpState();
      this.onLog(`VM Runtime Error: ${e.message} at PC: ${this.pc}`);
      console.error(e);
    }

    // Screen Cleanup: Clear VRAM and flush
    this.memory.fill(0, VRAM_OFFSET, VRAM_OFFSET + 1600);
    this.flushScreen();

    this.running = false;
    this.onFinished();
  }

  stop() { this.running = false; }

  pushKey(key: string) {
    const keyMap: Record<string, number> = {
      '↵': 13, 'ESC': 27, '↑': 19, '↓': 20, '←': 21, '→': 22,
      'F1': 28, 'F2': 29, 'F3': 30, 'F4': 31, 'HELP': 1
    };
    const code = key.length === 1 ? key.charCodeAt(0) : (keyMap[key] || 0);
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

  private push(val: number) {
    if (this.esp >= this.stk.length) throw new Error("Stack Overflow");
    this.stk[this.esp++] = val | 0;
  }
  private pop() {
    if (this.esp <= 0) throw new Error("Stack Underflow");
    return this.stk[--this.esp];
  }

  private pushFloat(val: number) {
    const buffer = new ArrayBuffer(4);
    new Float32Array(buffer)[0] = val;
    this.push(new Int32Array(buffer)[0]);
  }
  private popFloat() {
    const val = this.pop();
    const buffer = new ArrayBuffer(4);
    new Int32Array(buffer)[0] = val;
    return new Float32Array(buffer)[0];
  }

  private memRead(addr: number, size: number) {
    if (addr < 0 || addr + size > MEMORY_SIZE) return 0;
    const view = new DataView(this.memory.buffer);
    if (size === 1) return view.getUint8(addr);
    else if (size === 2) return view.getInt16(addr, true);
    else if (size === 3) {
      const b1 = view.getUint8(addr);
      const b2 = view.getUint8(addr + 1);
      const b3 = view.getUint8(addr + 2);
      return (b1 | (b2 << 8) | (b3 << 16)) >>> 0;
    }
    else return view.getInt32(addr, true);
  }

  private memWrite(addr: number, val: number, size: number) {
    if (addr < 0 || addr + size > MEMORY_SIZE) return;
    const view = new DataView(this.memory.buffer);
    if (size === 1) view.setUint8(addr, val & 0xFF);
    else if (size === 2) view.setInt16(addr, val, true);
    else if (size === 3) {
      view.setUint8(addr, val & 0xFF);
      view.setUint8(addr + 1, (val >> 8) & 0xFF);
      view.setUint8(addr + 2, (val >> 16) & 0xFF);
    }
    else view.setInt32(addr, val, true);
  }

  private resolveAddress(addr: number): number {
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
      this.onLog(`[DEBUG] PC: 0x${pcBefore.toString(16).padStart(4, '0')}, Op: 0x${op.toString(16).padStart(2, '0')} (${this.getOpName(op)}), ESP: ${this.esp}, EBP: 0x${this.ebp.toString(16)}`);
    }

    if (op & 0x80) {
      await this.handleSyscall(op);
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

      case Op.STR: {
        const start = this.pc;
        while (this.fd[this.pc] !== 0 && this.pc < this.codeLength) this.pc++;
        const strBytes = this.fd.slice(start, this.pc);
        this.pc++;
        const addr = this.ebp2;
        this.memory.set(strBytes, addr);
        this.memory[addr + strBytes.length] = 0;
        const oldEbp2 = this.ebp2;
        this.ebp2 += strBytes.length + 1;
        this.push(oldEbp2);
        break;
      }

      case Op.LD_L_B: this.push(this.memRead(this.ebp + this.readInt16(), 1)); break;
      case Op.LD_L_W: this.push(this.memRead(this.ebp + this.readInt16(), 2)); break;
      case Op.LD_L_D: this.push(this.memRead(this.ebp + this.readInt16(), 4)); break;

      case Op.LD_LO_B: { const off = this.readInt16(); this.push(this.memRead(this.ebp + this.pop() + off, 1)); break; }
      case Op.LD_LO_W: { const off = this.readInt16(); this.push(this.memRead(this.ebp + this.pop() + off, 2)); break; }
      case Op.LD_LO_D: { const off = this.readInt16(); this.push(this.memRead(this.ebp + this.pop() + off, 4)); break; }

      case Op.LEA_L_B: this.push(HANDLE_BASE_EBP | HANDLE_TYPE_BYTE | this.readInt16()); break;
      case Op.LEA_L_W: this.push(HANDLE_BASE_EBP | HANDLE_TYPE_WORD | this.readInt16()); break;
      case Op.LEA_L_D: this.push(HANDLE_BASE_EBP | HANDLE_TYPE_DWORD | this.readInt16()); break;

      case Op.LEA_23: this.push((this.pop() + this.readInt16()) & 0xFFFF); break;
      case Op.LEA_24: this.push(this.pop() + this.readInt16() + this.ebp); break;
      case Op.ADDR_L: this.push(this.readInt16() + this.ebp); break;

      case Op.LD_TBUF: this.push(TEXT_OFFSET); break;
      case Op.LD_GRA: this.push(VRAM_OFFSET); break;
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
      case Op.LE: { const b = this.pop(); const a = this.pop(); this.push(a <= b ? 1 : 0); break; }
      case Op.GE: { const b = this.pop(); const a = this.pop(); this.push(a >= b ? 1 : 0); break; }
      case Op.GT: { const b = this.pop(); const a = this.pop(); this.push(a > b ? 1 : 0); break; }
      case Op.LT: { const b = this.pop(); const a = this.pop(); this.push(a < b ? 1 : 0); break; }

      case Op.STORE: {
        const h = this.pop();
        const val = this.pop();
        this.writeByHandle(h, val);
        this.push(val);
        break;
      }
      case Op.LD_IND_B: this.push(this.memRead(this.pop(), 1)); break;
      case Op.LD_IND_W: this.push(this.memRead(this.pop(), 2)); break;
      case Op.LD_IND_D: this.push(this.memRead(this.pop(), 4)); break;
      case Op.CAST_PTR: break;
      case Op.PUSH_ADDR_LONG: this.push(this.readInt32()); break;
      case Op.TAG_B: this.push(this.pop() | HANDLE_TYPE_BYTE); break;

      case Op.JZ: { const addr = this.readUInt24(); if (this.pop() === 0) this.pc = addr; break; }
      case Op.JNZ: { const addr = this.readUInt24(); if (this.pop() !== 0) this.pc = addr; break; }
      case Op.JMP: { this.pc = this.readUInt24(); break; }
      case Op.BASE: {
        const val = this.readInt16();
        this.ebp = this.ebp2 = val;
        break;
      }

      case Op.CALL: {
        const addr = this.readUInt24();
        const retEip = this.pc;
        this.memWrite(this.ebp2, retEip, 3); // 24-bit EIP (low 3 bytes)
        this.memWrite(this.ebp2 + 3, this.ebp, 2); // 16-bit old EBP
        this.ebp = this.ebp2;
        this.pc = addr;
        break;
      }
      case Op.FUNC: {
        const size = this.readInt16();
        const argc = this.readByte();
        this.ebp2 += size; // Allocate local space (ebp2 grows globally)
        if (argc > 0) {
          // Arguments start at ebp + 5
          for (let i = 0; i < argc; i++) {
            this.memWrite(this.ebp + 5 + (argc - 1 - i) * 4, this.pop(), 4);
          }
        }
        break;
      }
      case Op.RET: {
        const retVal = this.esp > 0 ? this.pop() : 0; // Return value if stack not empty
        this.pc = this.memRead(this.ebp, 3);          // Restore 24-bit EIP
        const oldEbp = this.memRead(this.ebp + 3, 2); // Restore 16-bit EBP
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
      case Op.LOAD_R1_CHAR: this.push(this.memRead(this.ebp + this.readInt16(), 1)); break;
      case Op.LOAD_R1_INT: this.push(this.memRead(this.ebp + this.readInt16(), 2)); break;
      case Op.LOAD_R1_LONG: this.push(this.memRead(this.ebp + this.readInt16(), 4)); break;
      case Op.CALC_R_ADDR_1: this.push(this.pop() + this.readInt16() + this.ebp); break;
      case Op.PUSH_R_ADDR: this.push(this.readInt16() + this.ebp); break;

      // Combo Opcodes
      case Op.ADD_C: { const imm = this.readInt16(); this.push(this.pop() + imm); break; }
      case Op.SUB_C: { const imm = this.readInt16(); this.push(this.pop() - imm); break; }
      case Op.MUL_C: { const imm = this.readInt16(); this.push(this.pop() * imm); break; }
      case Op.DIV_C: { const imm = this.readInt16(); const a = this.pop(); this.push(imm === 0 ? 0 : (a / imm) | 0); break; }
      case Op.MOD_C: { const imm = this.readInt16(); const a = this.pop(); this.push(imm === 0 ? 0 : a % imm); break; }
      case Op.SHL_C: { const imm = this.readInt16(); this.push(this.pop() << imm); break; }
      case Op.SHR_C: { const imm = this.readInt16(); this.push(this.pop() >> imm); break; }
      case Op.EQ_C: { const imm = this.readInt16(); this.push(this.pop() === imm ? 1 : 0); break; }
      case Op.NEQ_C: { const imm = this.readInt16(); this.push(this.pop() !== imm ? 1 : 0); break; }
      case Op.GT_C: { const imm = this.readInt16(); this.push(this.pop() > imm ? 1 : 0); break; }
      case Op.LT_C: { const imm = this.readInt16(); this.push(this.pop() < imm ? 1 : 0); break; }
      case Op.GE_C: { const imm = this.readInt16(); this.push(this.pop() >= imm ? 1 : 0); break; }
      case Op.LE_C: { const imm = this.readInt16(); this.push(this.pop() <= imm ? 1 : 0); break; }

      case Op.POP: this.pop(); break;

      // Float Opcodes (0x54 - 0x68)
      case FloatOp.itof: this.pushFloat(this.pop()); break;
      case FloatOp.ftoi: this.push(this.popFloat() | 0); break;
      case FloatOp.fadd: this.pushFloat(this.popFloat() + this.popFloat()); break;
      case FloatOp.fadd_fi: { const b = this.pop(); const a = this.popFloat(); this.pushFloat(a + b); break; }
      case FloatOp.fadd_if: { const b = this.popFloat(); const a = this.pop(); this.pushFloat(a + b); break; }
      case FloatOp.fsub: { const b = this.popFloat(); const a = this.popFloat(); this.pushFloat(a - b); break; }
      case FloatOp.fsub_fi: { const b = this.pop(); const a = this.popFloat(); this.pushFloat(a - b); break; }
      case FloatOp.fsub_if: { const b = this.popFloat(); const a = this.pop(); this.pushFloat(a - b); break; }
      case FloatOp.fmul: this.pushFloat(this.popFloat() * this.popFloat()); break;
      case FloatOp.fmul_fi: { const b = this.pop(); const a = this.popFloat(); this.pushFloat(a * b); break; }
      case FloatOp.fmul_if: { const b = this.popFloat(); const a = this.pop(); this.pushFloat(a * b); break; }
      case FloatOp.fdiv: { const b = this.popFloat(); const a = this.popFloat(); this.pushFloat(b === 0 ? 0 : a / b); break; }
      case FloatOp.fdiv_fi: { const b = this.pop(); const a = this.popFloat(); this.pushFloat(b === 0 ? 0 : a / b); break; }
      case FloatOp.fdiv_if: { const b = this.popFloat(); const a = this.pop(); this.pushFloat(b === 0 ? 0 : a / b); break; }
      case FloatOp.fneg: this.pushFloat(-this.popFloat()); break;
      case FloatOp.flt: { const b = this.popFloat(); const a = this.popFloat(); this.push(a < b ? -1 : 0); break; }
      case FloatOp.fgt: { const b = this.popFloat(); const a = this.popFloat(); this.push(a > b ? -1 : 0); break; }
      case FloatOp.feq: { const b = this.popFloat(); const a = this.popFloat(); this.push(a === b ? -1 : 0); break; }
      case FloatOp.fneq: { const b = this.popFloat(); const a = this.popFloat(); this.push(a !== b ? -1 : 0); break; }
      case FloatOp.fle: { const b = this.popFloat(); const a = this.popFloat(); this.push(a <= b ? -1 : 0); break; }
      case FloatOp.fge: { const b = this.popFloat(); const a = this.popFloat(); this.push(a >= b ? -1 : 0); break; }

      default:
        if (this.debug) this.dumpState();
        this.onLog(`VM Error: Unknown opcode 0x${op.toString(16)} at PC: ${this.pc}`);
        this.running = false;
        break;
    }
  }

  private getOpName(op: number): string {
    if (op & 0x80) return SystemOp[op] || "UNKNOWN_SYSCALL";
    return Op[op] || "UNKNOWN_OP";
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
  private getStringBytes(handle: number): Uint8Array | null {
    const addr = this.resolveAddress(handle);
    if (addr < 0 || addr >= MEMORY_SIZE) return null;
    let end = addr;
    while (end < MEMORY_SIZE && this.memory[end] !== 0) end++;
    return this.memory.slice(addr, end);
  }

  private async handleSyscall(op: number) {
    let result = 0;
    if (this.debug) {
      this.onLog(`[SYSCALL] ${SystemOp[op] || '0x' + op.toString(16)} START`);
    }
    switch (op) {
      case SystemOp.putchar: {
        const c = this.pop();
        this.onLog(String.fromCharCode(c));
        break;
      }
      case SystemOp.getchar: {
        while (this.keyBuffer.length === 0 && this.running) await new Promise(r => setTimeout(r, 20));
        result = this.keyBuffer.shift() || 0;
        break;
      }
      case SystemOp.printf: {
        const count = this.pop();
        const fmtHandle = this.stk[this.esp - count];
        const formatBytes = this.getStringBytes(fmtHandle);
        if (formatBytes) {
          const str = this.formatVariadicString(formatBytes, count - 1, this.esp - count + 1);
          this.onLog(str);
        }
        this.esp -= count;
        break;
      }
      case SystemOp.sprintf: {
        const count = this.pop();
        const fmtHandle = this.stk[this.esp - count];
        const destAddr = this.resolveAddress(this.stk[this.esp - count - 1]);
        const formatBytes = this.getStringBytes(fmtHandle);
        if (formatBytes) {
          const str = this.formatVariadicString(formatBytes, count - 1, this.esp - count + 1);
          const bytes = new TextEncoder().encode(str);
          this.memory.set(bytes, destAddr);
          this.memory[destAddr + bytes.length] = 0;
        }
        this.esp -= (count + 1);
        result = destAddr;
        break;
      }
      case SystemOp.strcpy: {
        const srcAddr = this.pop();
        const destAddr = this.resolveAddress(this.pop());
        const bytes = this.getStringBytes(srcAddr);
        if (bytes) {
          this.memory.set(bytes, destAddr);
          this.memory[destAddr + bytes.length] = 0;
        }
        result = destAddr;
        break;
      }
      case SystemOp.strlen: {
        const strHandle = this.pop();
        const bytes = this.getStringBytes(strHandle);
        result = bytes ? bytes.length : 0;
        break;
      }
      case SystemOp.SetScreen: {
        const mode = this.pop();
        this.memory.fill(0, TEXT_OFFSET, TEXT_OFFSET + 160);
        break;
      }
      case SystemOp.UpdateLCD: this.pop(); break;
      case SystemOp.Delay: await new Promise(r => setTimeout(r, this.pop())); break;
      case SystemOp.WriteBlock: {
        const addr = this.resolveAddress(this.pop());
        const mode = this.pop();
        const h = this.pop();
        const w = this.pop();
        const y = this.pop();
        const x = this.pop();

        const bytesPerRow = (w + 7) >> 3;
        const copyMode = (mode & 0x07) === 1;

        for (let r = 0; r < h; r++) {
          for (let c = 0; c < w; c++) {
            const byte = this.memory[addr + r * bytesPerRow + (c >> 3)];
            const bit = (byte >> (7 - (c & 7))) & 1;
            if (bit) {
              this.setPixel(x + c, y + r, 1, mode);
            } else if (copyMode) {
              this.setPixel(x + c, y + r, 0, mode);
            }
          }
        }
        if (mode & 0x40) this.flushScreen();
        break;
      }
      case SystemOp.Refresh: {
        this.memory.copyWithin(VRAM_OFFSET, BUF_OFFSET, BUF_OFFSET + 1600);
        this.flushScreen();
        break;
      }
      case SystemOp.TextOut: {
        const mode = this.pop();
        const strAddr = this.pop();
        const y = this.pop();
        const x = this.pop();
        const bytes = this.getStringBytes(strAddr);
        if (bytes) {
          const size = (mode & 0x80) ? 16 : 12;
          const reverse = !!(mode & 0x08);
          const drawMode = mode & 0x07;
          this.drawText(x, y, bytes, size, reverse, mode); // Pass full mode to use bit 6
          if (mode & 0x40) this.flushScreen();
        }
        break;
      }
      case SystemOp.Block:
      case SystemOp.Rectangle: {
        const mode = this.pop();
        const h = this.pop();
        const w = this.pop();
        const y = this.pop();
        const x = this.pop();
        const fill = (op === SystemOp.Block);
        if (fill) this.drawFillBox(x, y, w, h, mode);
        else this.drawBox(x, y, w, h, mode);
        break;
      }
      case SystemOp.Exit: this.pop(); this.running = false; return;
      case SystemOp.ClearScreen: this.memory.fill(0, BUF_OFFSET, BUF_OFFSET + 1600); break;
      case SystemOp.abs: result = Math.abs(this.pop()); break;
      case SystemOp.rand: result = (Math.random() * 0x8000) | 0; break;
      case SystemOp.srand: this.pop(); break; // Math.random() is self-seeding
      case SystemOp.Locate: {
        const y = this.pop();
        const x = this.pop();
        // Should update lpScrText, but our VM is graphics-mostly
        break;
      }
      case SystemOp.Inkey: result = this.keyBuffer.length > 0 ? this.keyBuffer.shift()! : 0; break;
      case SystemOp.Point: {
        const mode = this.pop();
        const y = this.pop();
        const x = this.pop();
        this.setPixel(x, y, 1, mode);
        break;
      }
      case SystemOp.GetPoint: {
        const y = this.pop();
        const x = this.pop();
        result = this.getPixel(x, y);
        break;
      }
      case SystemOp.Line: {
        const mode = this.pop();
        const y1 = this.pop();
        const x1 = this.pop();
        const y0 = this.pop();
        const x0 = this.pop();
        this.drawLine(x0, y0, x1, y1, mode);
        break;
      }
      case SystemOp.Box: {
        const mode = this.pop();
        const fill = this.pop();
        const y1 = this.pop();
        const x1 = this.pop();
        const y0 = this.pop();
        const x0 = this.pop();
        if (fill) this.drawFillBox(x0, y0, x1 - x0 + 1, y1 - y0 + 1, mode);
        else this.drawBox(x0, y0, x1 - x0 + 1, y1 - y0 + 1, mode);
        break;
      }
      case SystemOp.Circle: {
        const mode = this.pop();
        const fill = this.pop();
        const r = this.pop();
        const y = this.pop();
        const x = this.pop();
        if (fill) this.drawFillCircle(x, y, r, mode);
        else this.drawCircle(x, y, r, mode);
        break;
      }
      case SystemOp.Ellipse: {
        const mode = this.pop();
        const fill = this.pop();
        const ry = this.pop();
        const rx = this.pop();
        const y = this.pop();
        const x = this.pop();
        this.drawEllipse(x, y, rx, ry, !!fill, mode);
        break;
      }
      case SystemOp.Beep: break; // MessageBeep not available in web context easily
      case SystemOp.isdigit: result = /\d/.test(String.fromCharCode(this.pop())) ? 1 : 0; break;
      case SystemOp.isalpha: result = /[a-zA-Z]/.test(String.fromCharCode(this.pop())) ? 1 : 0; break;
      case SystemOp.isalnum: result = /[a-zA-Z0-9]/.test(String.fromCharCode(this.pop())) ? 1 : 0; break;
      case SystemOp.tolower: result = String.fromCharCode(this.pop()).toLowerCase().charCodeAt(0); break;
      case SystemOp.toupper: result = String.fromCharCode(this.pop()).toUpperCase().charCodeAt(0); break;
      case SystemOp.strcat: {
        const srcAddr = this.pop();
        const destAddr = this.resolveAddress(this.pop());
        const src = this.getStringBytes(srcAddr);
        const dest = this.getStringBytes(destAddr);
        if (src && dest) {
          this.memory.set(src, destAddr + dest.length);
          this.memory[destAddr + dest.length + src.length] = 0;
        }
        result = destAddr;
        break;
      }
      case SystemOp.strcmp: {
        const s2Addr = this.pop();
        const s1Addr = this.pop();
        const s1 = this.getStringBytes(s1Addr) || new Uint8Array(0);
        const s2 = this.getStringBytes(s2Addr) || new Uint8Array(0);
        const len = Math.max(s1.length, s2.length);
        for (let i = 0; i < len; i++) {
          if (s1[i] !== s2[i]) { result = s1[i] - s2[i]; break; }
        }
        break;
      }
      case SystemOp.memset: {
        const count = this.pop();
        const val = this.pop();
        const addr = this.resolveAddress(this.pop());
        this.memory.fill(val, addr, addr + count);
        break;
      }
      case SystemOp.memcpy: {
        const count = this.pop();
        const src = this.resolveAddress(this.pop());
        const dest = this.resolveAddress(this.pop());
        this.memory.set(this.memory.slice(src, src + count), dest);
        break;
      }
      case SystemOp.fopen: {
        const modeAddr = this.pop();
        const pathAddr = this.pop();
        const pathBytes = this.getStringBytes(pathAddr);
        const modeBytes = this.getStringBytes(modeAddr);
        const path = new TextDecoder('gbk').decode(pathBytes!);
        const mode = new TextDecoder('gbk').decode(modeBytes!);
        const fileData = this.files.get(path);
        if (!fileData && !mode.includes('w')) { result = 0; }
        else {
          const handle = this.nextHandle++;
          this.fileHandles.set(handle, { name: path, pos: 0, data: fileData || new Uint8Array(0) });
          result = handle;
        }
        break;
      }
      case SystemOp.fclose: {
        const h = this.pop();
        this.fileHandles.delete(h);
        break;
      }
      case SystemOp.fread: {
        const fp = this.pop();
        const count = this.pop();
        const bufAddr = this.resolveAddress(this.pop());
        const h = this.fileHandles.get(fp);
        if (!h) { result = 0; break; }
        const toRead = Math.min(count, h.data.length - h.pos);
        if (toRead > 0) {
          this.memory.set(h.data.slice(h.pos, h.pos + toRead), bufAddr);
          h.pos += toRead;
        }
        result = toRead;
        break;
      }
      case SystemOp.fwrite: {
        const fp = this.pop();
        const count = this.pop();
        const bufAddr = this.resolveAddress(this.pop());
        const h = this.fileHandles.get(fp);
        if (!h) { result = 0; break; }
        const newData = new Uint8Array(h.data.length + count);
        newData.set(h.data);
        newData.set(this.memory.slice(bufAddr, bufAddr + count), h.pos);
        h.data = newData;
        h.pos += count;
        this.files.set(h.name, h.data);
        this.saveVFSToStorage();
        result = count;
        break;
      }
      case SystemOp.fseek: {
        const origin = this.pop() & 3;
        const offset = this.pop();
        const fp = this.pop();
        const h = this.fileHandles.get(fp);
        if (!h) { result = -1; break; }
        if (origin === 0) h.pos = offset;
        else if (origin === 1) h.pos += offset;
        else if (origin === 2) h.pos = h.data.length + offset;
        result = 0;
        break;
      }
      case SystemOp.ftell: result = this.fileHandles.get(this.pop())?.pos ?? -1; break;
      case SystemOp.feof: { const h = this.fileHandles.get(this.pop()); result = h ? (h.pos >= h.data.length ? 1 : 0) : 0; break; }
      case SystemOp.Getms: result = (Date.now() & 0x7FFFFFFF); break;
      case SystemOp.CheckKey: {
        const key = this.pop();
        result = this.keyBuffer.includes(key === 0 ? this.keyBuffer[0] : key) ? 1 : 0;
        break;
      }
      case SystemOp.memmove: {
        const count = this.pop();
        const src = this.resolveAddress(this.pop());
        const dest = this.resolveAddress(this.pop());
        this.memory.set(this.memory.slice(src, src + count), dest);
        break;
      }
      case SystemOp.Sin: result = Math.floor(Math.sin((this.pop() % 360) * Math.PI / 180) * 256); break;
      case SystemOp.Cos: result = Math.floor(Math.cos((this.pop() % 360) * Math.PI / 180) * 256); break;

      case SystemOp.System: {
        const sub = this.pop();
        if (sub === 0x1f) result = (Date.now() - this.startTime) | 0;
        break;
      }
      case SystemOp.Math: {
        const sub = this.pop();
        switch (sub) {
          case MathOp.itof: this.pushFloat(this.pop()); return; // Returns via stack
          case MathOp.ftoi: result = (this.popFloat() | 0); break;
          case MathOp.fadd: this.pushFloat(this.popFloat() + this.popFloat()); return;
          case MathOp.fsub: { const b = this.popFloat(); const a = this.popFloat(); this.pushFloat(a - b); return; }
          case MathOp.fmul: this.pushFloat(this.popFloat() * this.popFloat()); return;
          case MathOp.fdiv: { const b = this.popFloat(); const a = this.popFloat(); this.pushFloat(a / b); return; }
          case MathOp.sin: this.pushFloat(Math.sin(this.popFloat())); return;
          case MathOp.cos: this.pushFloat(Math.cos(this.popFloat())); return;
          case MathOp.tan: this.pushFloat(Math.tan(this.popFloat())); return;
          case MathOp.sqrt: this.pushFloat(Math.sqrt(this.popFloat())); return;
          case MathOp.fabs: this.pushFloat(Math.abs(this.popFloat())); return;
          default: break;
        }
        break;
      }
      case SystemOp.SetPalette: {
        const addr = this.pop();
        const count = this.pop();
        const start = this.pop();
        // Simplified: ignore for now as we use hardcoded 2-color
        result = 0;
        break;
      }
      default:
        this.onLog(`VM Warning: Unimplemented syscall 0x${op.toString(16)} `);
        break;
    }
    this.push(result);
    if (this.debug) {
      this.onLog(`[SYSCALL] END -> Result: ${result}`);
    }
  }

  private flushScreen() {
    if (typeof ImageData === 'undefined') return;
    const img = new ImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    for (let i = 0; i < SCREEN_WIDTH * SCREEN_HEIGHT; i++) {
      const pixel = (this.memory[VRAM_OFFSET + Math.floor(i / 8)] >> (7 - (i % 8))) & 1;
      const idx = i * 4;
      const c = pixel ? [35, 45, 35] : [148, 161, 135];
      img.data[idx] = c[0]; img.data[idx + 1] = c[1]; img.data[idx + 2] = c[2]; img.data[idx + 3] = 255;
    }
    this.onUpdateScreen(img);
  }

  private setPixel(x: number, y: number, color: number, mode: number = 1) {
    if (x < 0 || x >= SCREEN_WIDTH || y < 0 || y >= SCREEN_HEIGHT) return;
    const offset = (mode & 0x40) ? VRAM_OFFSET : BUF_OFFSET;
    const i = y * SCREEN_WIDTH + x;
    const byteIdx = offset + Math.floor(i / 8);
    const bitIdx = 7 - (i % 8);
    const oldPixel = (this.memory[byteIdx] >> bitIdx) & 1;

    let newPixel = color;
    const drawMode = mode & 0x07;
    const reverse = !!(mode & 0x08);

    if (reverse) newPixel = 1 - newPixel;

    switch (drawMode) {
      case 1: break; // Copy
      case 2: newPixel = 1 - oldPixel; break; // Not
      case 3: newPixel = oldPixel | newPixel; break; // Or
      case 4: newPixel = oldPixel & newPixel; break; // And
      case 5: newPixel = oldPixel ^ newPixel; break; // Xor
    }

    if (newPixel) this.memory[byteIdx] |= (1 << bitIdx);
    else this.memory[byteIdx] &= ~(1 << bitIdx);
  }

  private getPixel(x: number, y: number): number {
    if (x < 0 || x >= SCREEN_WIDTH || y < 0 || y >= SCREEN_HEIGHT) return 0;
    const i = y * SCREEN_WIDTH + x;
    return (this.memory[VRAM_OFFSET + Math.floor(i / 8)] >> (7 - (i % 8))) & 1;
  }

  private drawText(x: number, y: number, bytes: Uint8Array, size: number, reverse: boolean, drawMode: number) {
    if (!this.fontData) return;
    const mode = (reverse ? 0x08 : 0) | (drawMode & 0x07);

    let curX = x;
    let i = 0;
    while (i < bytes.length) {
      const b1 = bytes[i];
      if (b1 < 0x80) {
        this.drawChar(curX, y, b1, size, mode);
        curX += (size === 16 ? 8 : 6); i++;
      } else {
        const b2 = bytes[i + 1];
        if (b2) {
          this.drawChinese(curX, y, b1, b2, size, mode);
          curX += size;
          i += 2;
        } else i++;
      }
    }
  }

  private drawChar(x: number, y: number, code: number, size: number, mode: number) {
    const base = this.fontOffsets[size === 16 ? 0 : 1];
    const charIdx = code - 32;
    if (charIdx < 0 || charIdx >= 95) return;
    const width = size === 16 ? 8 : 6;
    const offset = base + charIdx * size;
    for (let r = 0; r < size; r++) {
      const byte = this.fontData![offset + r];
      for (let c = 0; c < width; c++) if ((byte >> (7 - c)) & 1) this.setPixel(x + c, y + r, 1, mode);
    }
  }

  private drawChinese(x: number, y: number, b1: number, b2: number, size: number, mode: number) {
    const base = this.fontOffsets[size === 16 ? 2 : 3];
    const rIdx = b1 - 0xA1, cIdx = b2 - 0xA1;
    if (rIdx < 0 || rIdx >= 94 || cIdx < 0 || cIdx >= 94) return;
    const charBytes = size === 16 ? 32 : 24;
    const offset = base + (rIdx * 94 + cIdx) * charBytes;
    for (let r = 0; r < size; r++) {
      const bL = this.fontData![offset + r * 2], bR = this.fontData![offset + r * 2 + 1];
      for (let b = 0; b < 8; b++) if ((bL >> (7 - b)) & 1) this.setPixel(x + b, y + r, 1, mode);
      for (let b = 0; b < size - 8; b++) if ((bR >> (7 - b)) & 1) this.setPixel(x + 8 + b, y + r, 1, mode);
    }
  }

  private drawBox(x: number, y: number, w: number, h: number, mode: number = 1) {
    for (let i = x; i < x + w; i++) { this.setPixel(i, y, 1, mode); this.setPixel(i, y + h - 1, 1, mode); }
    for (let i = y; i < y + h; i++) { this.setPixel(x, i, 1, mode); this.setPixel(x + w - 1, i, 1, mode); }
  }

  private drawFillBox(x: number, y: number, w: number, h: number, mode: number = 1) {
    for (let i = y; i < y + h; i++) {
      for (let j = x; j < x + w; j++) {
        this.setPixel(j, i, 1, mode);
      }
    }
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number, mode: number = 1) {
    const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      this.setPixel(x1, y1, 1, mode);
      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x1 += sx; }
      if (e2 < dx) { err += dx; y1 += sy; }
    }
  }

  private drawCircle(xc: number, yc: number, r: number, mode: number = 1) {
    let x = 0, y = r;
    let d = 3 - 2 * r;
    const drawPoints = (xc: number, yc: number, x: number, y: number) => {
      this.setPixel(xc + x, yc + y, 1, mode); this.setPixel(xc - x, yc + y, 1, mode);
      this.setPixel(xc + x, yc - y, 1, mode); this.setPixel(xc - x, yc - y, 1, mode);
      this.setPixel(xc + y, yc + x, 1, mode); this.setPixel(xc - y, yc + x, 1, mode);
      this.setPixel(xc + y, yc - x, 1, mode); this.setPixel(xc - y, yc - x, 1, mode);
    };
    drawPoints(xc, yc, x, y);
    while (y >= x) {
      x++;
      if (d > 0) { y--; d = d + 4 * (x - y) + 10; }
      else d = d + 4 * x + 6;
      drawPoints(xc, yc, x, y);
    }
  }

  private drawFillCircle(xc: number, yc: number, r: number, mode: number = 1) {
    for (let i = 0; i <= r; i++) {
      let d = Math.floor(Math.sqrt(r * r - i * i));
      this.drawLine(xc - d, yc + i, xc + d, yc + i, mode);
      this.drawLine(xc - d, yc - i, xc + d, yc - i, mode);
    }
  }

  private drawEllipse(xc: number, yc: number, rx: number, ry: number, fill: boolean, mode: number = 1) {
    if (fill) {
      for (let i = -ry; i <= ry; i++) {
        let dx = Math.floor(rx * Math.sqrt(1 - (i * i) / (ry * ry)));
        this.drawLine(xc - dx, yc + i, xc + dx, yc + i, mode);
      }
    } else {
      let x = 0, y = ry;
      let rx2 = rx * rx, ry2 = ry * ry;
      let tworx2 = 2 * rx2, twory2 = 2 * ry2;
      let px = 0, py = tworx2 * y;
      let p = Math.round(ry2 - (rx2 * ry) + (0.25 * rx2));
      const drawPoints = (xc: number, yc: number, x: number, y: number) => {
        this.setPixel(xc + x, yc + y, 1, mode); this.setPixel(xc - x, yc + y, 1, mode);
        this.setPixel(xc + x, yc - y, 1, mode); this.setPixel(xc - x, yc - y, 1, mode);
      };
      drawPoints(xc, yc, x, y);
      while (px < py) {
        x++; px += twory2;
        if (p < 0) p += ry2 + px;
        else { y--; py -= tworx2; p += ry2 + px - py; }
        drawPoints(xc, yc, x, y);
      }
      p = Math.round(ry2 * (x + 0.5) * (x + 0.5) + rx2 * (y - 1) * (y - 1) - rx2 * ry2);
      while (y > 0) {
        y--; py -= tworx2;
        if (p > 0) p += rx2 - py;
        else { x++; px += twory2; p += rx2 - py + px; }
        drawPoints(xc, yc, x, y);
      }
    }
  }

  private formatVariadicString(formatBytes: Uint8Array, count: number, startIdx: number): string {
    const format = new TextDecoder('gbk').decode(formatBytes);
    let result = "";
    let i = 0;
    let argIdx = 0;
    while (i < format.length) {
      if (format[i] === '%' && i + 1 < format.length) {
        i++;
        const spec = format[i];
        if (spec === '%') {
          result += "%";
        } else {
          const val = this.stk[startIdx + argIdx++];
          if (spec === 'c') {
            result += String.fromCharCode(val);
          } else if (spec === 'd') {
            result += val.toString();
          } else if (spec === 'f') {
            const buffer = new ArrayBuffer(4);
            new Int32Array(buffer)[0] = val;
            result += new Float32Array(buffer)[0].toFixed(6);
          } else if (spec === 's') {
            const bytes = this.getStringBytes(val);
            if (bytes) result += new TextDecoder('gbk').decode(bytes);
          } else {
            result += "%" + spec;
          }
        }
      } else {
        result += format[i];
      }
      i++;
    }
    return result;
  }

  // No separate vram, uses this.memory views
}
