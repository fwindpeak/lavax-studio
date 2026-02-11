
import {
  MEMORY_SIZE, Op,
  VRAM_OFFSET, BUF_OFFSET, TEXT_OFFSET, HEAP_OFFSET,
  STRBUF_START, STRBUF_END, GBUF_OFFSET_LVM,
  HANDLE_TYPE_BYTE, HANDLE_TYPE_WORD, HANDLE_TYPE_DWORD, HANDLE_BASE_EBP
} from './types';
import { VirtualFileSystem } from './vm/VirtualFileSystem';
import { VFSStorageDriver } from './vm/VFSStorageDriver';
import { GraphicsEngine } from './vm/GraphicsEngine';
import { SyscallHandler } from './vm/SyscallHandler';

export class LavaXVM {
  // Registers and state (Alignment with LavaVM.ts)
  private pc: number = 0;              // lvm_pi
  public sp: number = 0;              // lvm_stk_p
  private base: number = 0;            // lvm_dat_pb (ebp)
  private base2: number = 0;           // lvm_dat_pb2 (ebp2)
  private strBufPtr: number = STRBUF_START;

  public memory = new Uint8Array(MEMORY_SIZE);
  public stk = new Int32Array(4096);   // lvm_stk (Stack size from LavaVM.ts is 0x500, but we keep 4K for safety)
  private regBuf = new Int32Array(32); // lvm_buf

  private fd = new Uint8Array(0);      // ROM (.lav file)
  private fdView: DataView = new DataView(new ArrayBuffer(0));
  private codeLength = 0;

  public running = false;
  public debug = false;
  public startTime = Date.now();
  public keyBuffer: number[] = [];
  private strMask = 0;

  public vfs: VirtualFileSystem;
  public graphics: GraphicsEngine;
  private syscall: SyscallHandler;

  public onUpdateScreen: (imageData: ImageData) => void = () => { };
  public onLog: (msg: string) => void = () => { };
  public onFinished: () => void = () => { };

  constructor(vfsDriver?: VFSStorageDriver) {
    this.vfs = new VirtualFileSystem(vfsDriver);
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
    this.fd = lav;
    this.fdView = new DataView(lav.buffer as ArrayBuffer, lav.byteOffset, lav.byteLength);
    this.codeLength = lav.length;
    this.reset();
    const jpVar = lav[8] | (lav[9] << 8);
    this.pc = jpVar > 0 ? jpVar : 0x10;
  }

  public reset() {
    this.pc = 0;
    this.sp = 0;
    this.base = 0;
    this.base2 = 0;
    this.strBufPtr = STRBUF_START;
    this.memory.fill(0);
    this.stk.fill(0);
    this.regBuf.fill(0);
    this.strMask = 0;
  }

  async run() {
    if (this.codeLength === 0) {
      this.onLog("VM Error: No code loaded.");
      return;
    }
    this.running = true;
    this.keyBuffer = [];
    this.vfs.clearHandles();
    this.startTime = Date.now();
    this.graphics.flushScreen();

    this.onLog("VM: Starting execution...");
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
      this.onLog(`\n[VM FATAL ERROR] ${e.message}`);
      this.dumpState();

      // Bytecode context
      let nearby = "Code near PC: ";
      const start = Math.max(0, this.pc - 16);
      const end = Math.min(this.codeLength, this.pc + 16);
      for (let i = start; i < end; i++) {
        if (i === this.pc) nearby += ">>";
        nearby += this.fd[i].toString(16).padStart(2, '0') + " ";
      }
      this.onLog(nearby);

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

  // --- Reading Helpers (Alignment with LavaVM.ts) ---

  private readNext8(): number {
    if (this.pc >= this.codeLength) return 0xFF;
    return this.fd[this.pc++];
  }

  private readNext16(): number {
    if (this.pc + 1 >= this.codeLength) return 0;
    const val = this.fdView.getUint16(this.pc, true);
    this.pc += 2;
    return val;
  }

  private readNext16s(): number {
    if (this.pc + 1 >= this.codeLength) return 0;
    const val = this.fdView.getInt16(this.pc, true);
    this.pc += 2;
    return val;
  }

  private readNext24(): number {
    if (this.pc + 2 >= this.codeLength) return 0;
    const v = this.fd[this.pc] | (this.fd[this.pc + 1] << 8) | (this.fd[this.pc + 2] << 16);
    this.pc += 3;
    return v >>> 0;
  }

  private readNext32(): number {
    if (this.pc + 3 >= this.codeLength) return 0;
    const val = this.fdView.getInt32(this.pc, true);
    this.pc += 4;
    return val;
  }

  private readToRam(destAddr: number, len: number) {
    for (let i = 0; i < len; i++) {
      if (this.pc < this.codeLength) {
        this.memory[destAddr + i] = this.fd[this.pc++];
      }
    }
  }

  // --- Stack and Handle Helpers (Alignment with LavaVM.ts) ---

  public push(val: number) {
    if (this.sp >= this.stk.length) throw new Error("Stack Overflow");
    this.stk[this.sp++] = val | 0;
  }

  public pop(): number {
    if (this.sp <= 0) throw new Error("Stack Underflow");
    return this.stk[--this.sp];
  }

  public pushFloat(val: number) {
    const buffer = new ArrayBuffer(4);
    new Float32Array(buffer)[0] = val;
    this.push(new Int32Array(buffer)[0]);
  }

  public popFloat(): number {
    const val = this.pop();
    const buffer = new ArrayBuffer(4);
    new Int32Array(buffer)[0] = val;
    return new Float32Array(buffer)[0];
  }

  private stkPush(n: number) {
    if (this.sp + n >= this.stk.length) throw new Error("Stack Overflow");
    let cnt = n;
    while ((--cnt) >= 0) {
      this.stk[this.sp + cnt] = this.regBuf[cnt];
    }
    this.sp += n;
  }

  private stkPop(n: number) {
    if (this.sp - n < 0) throw new Error("Stack Underflow");
    this.sp -= n;
    let cnt = n;
    while ((--cnt) >= 0) {
      this.regBuf[cnt] = this.stk[this.sp + cnt];
    }
  }

  public resolveAddress(lp: number): number {
    if (lp & 0x800000) {
      return (lp + this.base) & 0xFFFF;
    }
    return lp & 0xFFFF;
  }

  private setValue(lp: number, n: number) {
    const addr = this.resolveAddress(lp);
    const type = lp & 0x70000;
    const view = new DataView(this.memory.buffer);
    if (type === HANDLE_TYPE_BYTE) {
      this.memory[addr] = n & 0xFF;
    } else if (type === HANDLE_TYPE_WORD) {
      view.setInt16(addr, n, true);
    } else {
      view.setInt32(addr, n, true);
    }
  }

  private readValue(lp: number): number {
    const addr = this.resolveAddress(lp);
    const type = lp & 0x70000;
    const view = new DataView(this.memory.buffer);
    if (type === HANDLE_TYPE_BYTE) {
      return this.memory[addr];
    } else if (type === HANDLE_TYPE_WORD) {
      return view.getInt16(addr, true);
    } else {
      return view.getInt32(addr, true);
    }
  }

  // --- String and Format Helpers (Alignment with LavaVM.ts) ---

  private readString(addr: number): string {
    let str = "";
    let i = addr;
    while (i < this.memory.length && this.memory[i] !== 0) {
      str += String.fromCharCode(this.memory[i]);
      i++;
    }
    return str;
  }

  // --- Core Execution Step (Alignment with LavaVM.ts) ---

  private async step() {
    if (!this.running || this.pc >= this.codeLength) return;

    const op = this.readNext8();

    if (this.debug) {
      this.onLog(`[DEBUG] PC: 0x${(this.pc - 1).toString(16).padStart(4, '0')}, Op: 0x${op.toString(16).padStart(2, '0')}, SP: ${this.sp}, BASE: 0x${this.base.toString(16)}`);
    }

    if (op >= 0x80 && op <= 0xCA) {
      const res = await this.syscall.handle(op);
      if (typeof res === 'number') this.push(res);
      return;
    }

    let i = 0, j = 0, val = 0, address = 0, m = 0;

    switch (op) {
      case 0x00: // nop
      case 0xFF:
      case 0x44: // #loadall
        break;
      case 0x41: // init
        i = this.readNext16();
        j = this.readNext16();
        this.readToRam(i, j);
        break;
      case 0x40: // end
        this.running = false;
        return;

      // --- Push ---
      case 0x01: // push1b
        this.push(this.readNext8());
        break;
      case 0x02: // push2b
        val = this.readNext16s();
        this.push(val);
        break;
      case 0x03: // push4b
        val = this.readNext32();
        this.push(val | 0);
        break;

      // --- Load Variable ---
      // Local (04-06), Global (0E-10)
      case 0x0E: case 0x0F: case 0x10:
        i = this.base;
        m = op - 0x0A; // 10
        i += this.readNext16();
        if (m === 0x04) this.push(this.memory[i & 0xFFFF]);
        else if (m === 0x05) this.push(new DataView(this.memory.buffer).getInt16(i & 0xFFFF, true));
        else this.push(new DataView(this.memory.buffer).getInt32(i & 0xFFFF, true));
        break;
      case 0x04: case 0x05: case 0x06:
        i = this.readNext16();
        if (op === 0x04) this.push(this.memory[i & 0xFFFF]);
        else if (op === 0x05) this.push(new DataView(this.memory.buffer).getInt16(i & 0xFFFF, true));
        else this.push(new DataView(this.memory.buffer).getInt32(i & 0xFFFF, true));
        break;

      // --- Load Indirect ---
      // Local (07-09), Global (11-13)
      case 0x11: case 0x12: case 0x13:
        i = this.base;
        m = op - 0x0A;
        i += this.readNext16() + this.stk[this.sp - 1];
        if (m === 0x07) this.stk[this.sp - 1] = this.memory[i & 0xFFFF];
        else if (m === 0x08) this.stk[this.sp - 1] = new DataView(this.memory.buffer).getInt16(i & 0xFFFF, true);
        else this.stk[this.sp - 1] = new DataView(this.memory.buffer).getInt32(i & 0xFFFF, true);
        break;
      case 0x07: case 0x08: case 0x09:
        i = this.readNext16() + this.stk[this.sp - 1];
        if (op === 0x07) this.stk[this.sp - 1] = this.memory[i & 0xFFFF];
        else if (op === 0x08) this.stk[this.sp - 1] = new DataView(this.memory.buffer).getInt16(i & 0xFFFF, true);
        else this.stk[this.sp - 1] = new DataView(this.memory.buffer).getInt32(i & 0xFFFF, true);
        break;

      // --- LEA (Load Effective Address) ---
      // Local (0A-0C), Global (14-16)
      case 0x14: case 0x15: case 0x16:
        i = 0x800000;
        m = op - 0x0A;
        address = (this.readNext16() + this.stk[this.sp - 1]) & 0xFFFF;
        this.stk[this.sp - 1] = i | address | (64 << m);
        break;
      case 0x0A: case 0x0B: case 0x0C:
        i = 0x000000;
        address = (this.readNext16() + this.stk[this.sp - 1]) & 0xFFFF;
        this.stk[this.sp - 1] = i | address | (64 << op);
        break;

      // --- String Literal ---
      case 0x0D:
        i = this.strBufPtr;
        while (true) {
          let c = this.readNext8();
          this.memory[i] = c;
          i++;
          if (c === 0) break;
        }
        let length = i - this.strBufPtr;
        if (this.strBufPtr + length > STRBUF_END) {
          // Rewind PC to reconsider the string after resetting the pointer
          this.pc -= length;
          this.strBufPtr = STRBUF_START;
          // In the reference, it just calls itself again. 
          // We'll just break and let the next cycle handle it to avoid infinite recursion if length > buffer
          return;
        }
        this.push(this.strBufPtr);
        this.strBufPtr += length;
        break;

      // --- Address Math ---
      case 0x17:
        this.stk[this.sp - 1] = (this.readNext16() + this.stk[this.sp - 1]) & 0xFFFF;
        break;
      case 0x18:
        this.stk[this.sp - 1] = (this.readNext16() + this.stk[this.sp - 1] + this.base) & 0xFFFF;
        break;
      case 0x19:
        this.push((this.readNext16() + this.base) & 0xFFFF);
        break;

      // --- Buffers ---
      case 0x1A: this.push(0x8000); break; // TBUF
      case 0x1B: this.push(GBUF_OFFSET_LVM); break; // GRAPH
      case 0x42: this.push(0x8000); break; // GBUF

      // --- Immediate Arithmetic (45-51) ---
      case 0x45: this.stk[this.sp - 1] += this.readNext16s(); break;
      case 0x46: this.stk[this.sp - 1] -= this.readNext16s(); break;
      case 0x47: this.stk[this.sp - 1] *= this.readNext16s(); break;
      case 0x48: {
        const d = this.readNext16s();
        this.stk[this.sp - 1] = d === 0 ? 0 : (this.stk[this.sp - 1] / d) | 0;
        break;
      }
      case 0x49: {
        const d = this.readNext16s();
        this.stk[this.sp - 1] = d === 0 ? 0 : this.stk[this.sp - 1] % d;
        break;
      }
      case 0x4A: this.stk[this.sp - 1] <<= this.readNext16(); break;
      case 0x4B: this.stk[this.sp - 1] >>= this.readNext16(); break;
      case 0x4C: this.stk[this.sp - 1] = (this.stk[this.sp - 1] === this.readNext16s()) ? -1 : 0; break;
      case 0x4D: this.stk[this.sp - 1] = (this.stk[this.sp - 1] !== this.readNext16s()) ? -1 : 0; break;
      case 0x4E: this.stk[this.sp - 1] = (this.stk[this.sp - 1] > this.readNext16s()) ? -1 : 0; break;
      case 0x4F: this.stk[this.sp - 1] = (this.stk[this.sp - 1] < this.readNext16s()) ? -1 : 0; break;
      case 0x50: this.stk[this.sp - 1] = (this.stk[this.sp - 1] >= this.readNext16s()) ? -1 : 0; break;
      case 0x51: this.stk[this.sp - 1] = (this.stk[this.sp - 1] <= this.readNext16s()) ? -1 : 0; break;

      // --- Binary Operations (21-34) ---
      case 0x21: this.sp--; this.stk[this.sp - 1] += this.stk[this.sp]; break;
      case 0x22: this.sp--; this.stk[this.sp - 1] -= this.stk[this.sp]; break;
      case 0x23: this.sp--; this.stk[this.sp - 1] &= this.stk[this.sp]; break;
      case 0x24: this.sp--; this.stk[this.sp - 1] |= this.stk[this.sp]; break;
      case 0x25: this.stk[this.sp - 1] = ~this.stk[this.sp - 1]; break;
      case 0x26: this.sp--; this.stk[this.sp - 1] ^= this.stk[this.sp]; break;
      case 0x27: this.sp--; this.stk[this.sp - 1] = (this.stk[this.sp - 1] && this.stk[this.sp]) ? -1 : 0; break;
      case 0x28: this.sp--; this.stk[this.sp - 1] = (this.stk[this.sp - 1] || this.stk[this.sp]) ? -1 : 0; break;
      case 0x29: this.stk[this.sp - 1] = this.stk[this.sp - 1] ? 0 : -1; break;
      case 0x2A: this.sp--; this.stk[this.sp - 1] *= this.stk[this.sp]; break;
      case 0x2B: {
        this.sp--;
        const d = this.stk[this.sp];
        this.stk[this.sp - 1] = d === 0 ? 0 : (this.stk[this.sp - 1] / d) | 0;
        break;
      }
      case 0x2C: {
        this.sp--;
        const d = this.stk[this.sp];
        this.stk[this.sp - 1] = d === 0 ? 0 : this.stk[this.sp - 1] % d;
        break;
      }
      case 0x2D: this.sp--; this.stk[this.sp - 1] <<= this.stk[this.sp]; break;
      case 0x2E: this.sp--; this.stk[this.sp - 1] >>>= this.stk[this.sp]; break;
      case 0x2F: this.sp--; this.stk[this.sp - 1] = (this.stk[this.sp - 1] === this.stk[this.sp]) ? -1 : 0; break;
      case 0x30: this.sp--; this.stk[this.sp - 1] = (this.stk[this.sp - 1] !== this.stk[this.sp]) ? -1 : 0; break;
      case 0x31: this.sp--; this.stk[this.sp - 1] = (this.stk[this.sp - 1] <= this.stk[this.sp]) ? -1 : 0; break;
      case 0x32: this.sp--; this.stk[this.sp - 1] = (this.stk[this.sp - 1] >= this.stk[this.sp]) ? -1 : 0; break;
      case 0x33: this.sp--; this.stk[this.sp - 1] = (this.stk[this.sp - 1] > this.stk[this.sp]) ? -1 : 0; break;
      case 0x34: this.sp--; this.stk[this.sp - 1] = (this.stk[this.sp - 1] < this.stk[this.sp]) ? -1 : 0; break;

      // --- Assignment & Memory ---
      case 0x35: {
        this.sp--;
        const val = this.stk[this.sp];
        const addrEncoded = this.stk[this.sp - 1];
        this.setValue(addrEncoded, val);
        this.stk[this.sp - 1] = val;
        break;
      }
      case 0x36: {
        const addr = this.stk[this.sp - 1] & 0xFFFF;
        this.stk[this.sp - 1] = this.memory[addr];
        break;
      }
      case 0x37: this.stk[this.sp - 1] = (this.stk[this.sp - 1] & 0xFFFF) | 0x10000; break;
      case 0x38: this.sp--; break;
      case 0x1C: this.stk[this.sp - 1] = -this.stk[this.sp - 1]; break;

      // --- Inc/Dec (1D-20) ---
      case 0x1D: case 0x1E: case 0x1F: case 0x20: {
        const addrEncoded = this.stk[this.sp - 1];
        const val = this.readValue(addrEncoded);
        let newVal = (op === 0x1D || op === 0x1F) ? val + 1 : val - 1;
        this.setValue(addrEncoded, newVal);
        this.stk[this.sp - 1] = (op === 0x1D || op === 0x1E) ? newVal : val;
        break;
      }

      // --- Jumps ---
      case 0x39: {
        address = this.readNext24();
        if (this.pop() === 0) this.pc = address;
        break;
      }
      case 0x3A: {
        address = this.readNext24();
        if (this.pop() !== 0) this.pc = address;
        break;
      }
      case 0x3B: this.pc = this.readNext24(); break;

      // --- Function Calls (Alignment with LavaVM.ts) ---
      case 0x3C: // base
        this.base = this.base2 = this.readNext16();
        break;
      case 0x3D: // call
        address = this.readNext24();
        new DataView(this.memory.buffer).setUint32(this.base2, this.pc, true);
        new DataView(this.memory.buffer).setUint16(this.base2 + 3, this.base, true);
        this.base = this.base2;
        this.pc = address;
        break;
      case 0x3E: // prologue
        this.base2 += this.readNext16();
        m = this.readNext8();
        if (m > 0) {
          this.sp -= m;
          for (let k = 0; k < m; k++) {
            new DataView(this.memory.buffer).setInt32(this.base + 5 + (k * 4), this.stk[this.sp + k], true);
          }
        }
        break;
      case 0x3F: // return
        this.base2 = this.base;
        this.pc = new DataView(this.memory.buffer).getUint32(this.base, true) & 0xFFFFFF;
        this.base = new DataView(this.memory.buffer).getUint16(this.base + 3, true);
        break;

      // --- Unknowns ---
      case 0x52: this.stk[this.sp - 1] = new DataView(this.memory.buffer).getInt16(this.stk[this.sp - 1] & 0xFFFF, true); break;
      case 0x53: this.stk[this.sp - 1] = new DataView(this.memory.buffer).getInt32(this.stk[this.sp - 1] & 0xFFFF, true); break;

      default:
        this.onLog(`VM Error: Unknown opcode 0x${op.toString(16)} at PC: ${this.pc - 1}`);
        this.running = false;
        break;
    }
  }

  private dumpState() {
    this.onLog(`--- VM STATE DUMP ---`);
    this.onLog(`PC:   0x${this.pc.toString(16).padStart(4, '0')} (${this.pc})`);
    this.onLog(`SP:   ${this.sp}`);
    this.onLog(`BASE: 0x${this.base.toString(16).padStart(4, '0')} (${this.base})`);
    this.onLog(`BASE2:0x${this.base2.toString(16).padStart(4, '0')} (${this.base2})`);

    // Detailed Stack Info
    if (this.sp > 0) {
      let stackTrace = "Stack (Bottom to Top): ";
      const count = Math.min(this.sp, 32);
      for (let i = this.sp - count; i < this.sp; i++) {
        stackTrace += `[${i}]:${this.stk[i]} `;
      }
      this.onLog(stackTrace);
    } else {
      this.onLog("Stack is EMPTY");
    }

    // Linkage Context
    if (this.base > 0 && this.base < MEMORY_SIZE - 5) {
      const view = new DataView(this.memory.buffer);
      const savedPC = view.getUint32(this.base, true) & 0xFFFFFF;
      const savedBASE = view.getUint16(this.base + 3, true);
      this.onLog(`Frame Linkage -> SavedPC: 0x${savedPC.toString(16)}, SavedEBP: 0x${savedBASE.toString(16)}`);
    }
    this.onLog(`----------------------`);
  }

  public getStringBytes(handle: number): Uint8Array | null {
    const addr = this.resolveAddress(handle);
    if (addr < 0 || addr >= MEMORY_SIZE) return null;
    let end = addr;
    while (end < MEMORY_SIZE && this.memory[end] !== 0) end++;
    const raw = this.memory.slice(addr, end);

    // Support decryption from strMask
    if (this.strMask !== 0) {
      const dec = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) dec[i] = raw[i] ^ this.strMask;
      return dec;
    }
    return raw;
  }
}
