
import { SCREEN_WIDTH, SCREEN_HEIGHT, MEMORY_SIZE, STR_MASK, Op, SystemOp } from './types';

export class LavaXVM {
  private memory = new Uint8Array(MEMORY_SIZE);
  private stack: number[] = [];
  private pc = 0;
  private regionStart = 0;
  private running = false;
  private code: Uint8Array = new Uint8Array(0);
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
    this.code = lav.slice(0x10);
    this.pc = 0;
  }

  public addFile(path: string, data: Uint8Array) {
    this.files.set(path, data);
    this.saveVFSToStorage();
  }
  public getFile(path: string) { return this.files.get(path); }
  public deleteFile(path: string) { this.files.delete(path); this.saveVFSToStorage(); }
  public getFiles() { return Array.from(this.files.entries()).map(([p, d]) => ({ path: p, size: d.length })); }

  async run() {
    if (this.code.length === 0) {
      this.onLog("VM Error: No code loaded.");
      return;
    }
    this.running = true;
    this.pc = 0;
    this.sp = MEMORY_SIZE - 4;
    this.regionStart = 0;
    this.memory.fill(0);
    this.keyBuffer = [];
    this.fileHandles.clear();
    this.nextHandle = 1;
    this.currentFontSize = 16;
    this.colorMode = 1;
    this.internalStrings = []; // Reset internal string pool
    this.flushScreen();

    this.onLog("VM: Starting execution...");
    try {
      let stepCount = 0;
      while (this.running && this.pc < this.code.length) {
        const opStr = Op[this.code[this.pc]] || (`0x${this.code[this.pc].toString(16)}`);
        // this.onLog(`PC: 0x${(this.pc + 0x10).toString(16)} OP: ${opStr} SP: ${this.sp}`);
        await this.step();
        stepCount++;
        if (stepCount % 2000 === 0) {
          await new Promise(r => requestAnimationFrame(r));
        }
      }
      this.onLog(`VM: Terminated at PC: ${this.pc + 0x10}`);
    } catch (e: any) {
      this.onLog(`VM Runtime Error: ${e.message} at PC: ${this.pc + 0x10}`);
      console.error(e);
    }
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

  private readByte() { return this.code[this.pc++]; }
  private readInt16() {
    const low = this.code[this.pc++];
    const high = this.code[this.pc++];
    const val = low | (high << 8);
    return val > 32767 ? val - 65536 : val;
  }
  private readUInt24() {
    const b1 = this.code[this.pc++];
    const b2 = this.code[this.pc++];
    const b3 = this.code[this.pc++];
    return b1 | (b2 << 8) | (b3 << 16);
  }
  private readInt32() {
    const b1 = this.code[this.pc++];
    const b2 = this.code[this.pc++];
    const b3 = this.code[this.pc++];
    const b4 = this.code[this.pc++];
    return (b1 | (b2 << 8) | (b3 << 16) | (b4 << 24)) | 0;
  }

  private sp = 0;
  private push(val: number) {
    if (this.sp < 0x2000) throw new Error("Stack Overflow");
    this.memWrite(this.sp, val, 4);
    this.sp -= 4;
  }
  private pop() {
    this.sp += 4;
    return this.memRead(this.sp, 4);
  }

  private memWrite(addr: number, val: number, size: 1 | 2 | 4) {
    if (addr < 0 || addr + size > MEMORY_SIZE) return;
    const view = new DataView(this.memory.buffer);
    if (size === 1) view.setUint8(addr, val & 0xFF);
    else if (size === 2) view.setInt16(addr, val, true);
    else view.setInt32(addr, val, true);
  }

  private memRead(addr: number, size: 1 | 2 | 4) {
    if (addr < 0 || addr + size > MEMORY_SIZE) return 0;
    const view = new DataView(this.memory.buffer);
    if (size === 1) return view.getUint8(addr);
    else if (size === 2) return view.getInt16(addr, true);
    else return view.getInt32(addr, true);
  }

  private async step() {
    const op = this.code[this.pc++];
    if (op === undefined) {
      this.running = false;
      return;
    }
    if (op & 0x80) {
      await this.handleSyscall(op);
      return;
    }

    switch (op) {
      case Op.NOP: break;
      case Op.PUSH_CHAR: this.push(this.readByte()); break;
      case Op.PUSH_INT: this.push(this.readInt16()); break;
      case Op.PUSH_LONG: this.push(this.readInt32()); break;

      case Op.PUSH_ADDR_CHAR: this.push(this.memRead(this.readInt32(), 1)); break;
      case Op.PUSH_ADDR_INT: this.push(this.memRead(this.readInt32(), 2)); break;
      case Op.PUSH_ADDR_LONG: this.push(this.memRead(this.readInt32(), 4)); break;

      case Op.PUSH_OFFSET_CHAR: { const off = this.readInt16(); this.push(this.memRead(this.pop() + off, 1)); break; }
      case Op.PUSH_OFFSET_INT: { const off = this.readInt16(); this.push(this.memRead(this.pop() + off, 2)); break; }
      case Op.PUSH_OFFSET_LONG: { const off = this.readInt16(); this.push(this.memRead(this.pop() + off, 4)); break; }

      case Op.ADD_STRING: {
        const start = this.pc;
        while (this.code[this.pc] !== 0 && this.pc < this.code.length) this.pc++;
        const strBytes = this.code.slice(start, this.pc);
        this.pc++;
        const id = this.stringToPool(strBytes);
        this.push(STR_MASK | id);
        break;
      }

      case Op.LOAD_R1_CHAR: this.push(this.memRead(this.regionStart - 4 - this.readInt16(), 1)); break;
      case Op.LOAD_R1_INT: this.push(this.memRead(this.regionStart - 4 - this.readInt16(), 2)); break;
      case Op.LOAD_R1_LONG: this.push(this.memRead(this.regionStart - 4 - this.readInt16(), 4)); break;

      case Op.CALC_R_ADDR_1: {
        const val = this.readInt16();
        const base = this.pop();
        this.push(this.regionStart - 4 - val + base);
        break;
      }
      case Op.PUSH_R_ADDR: this.push(this.regionStart - 4 - this.readInt16()); break;

      case Op.NEG: this.push(-this.pop()); break;
      case Op.INC_PRE: { const addr = this.pop(); const v = this.memRead(addr, 4) + 1; this.memWrite(addr, v, 4); this.push(v); break; }
      case Op.DEC_PRE: { const addr = this.pop(); const v = this.memRead(addr, 4) - 1; this.memWrite(addr, v, 4); this.push(v); break; }
      case Op.INC_POST: { const addr = this.pop(); const v = this.memRead(addr, 4); this.memWrite(addr, v + 1, 4); this.push(v); break; }
      case Op.DEC_POST: { const addr = this.pop(); const v = this.memRead(addr, 4); this.memWrite(addr, v - 1, 4); this.push(v); break; }

      case Op.ADD: { const b = this.pop(); const a = this.pop(); this.push(a + b); break; }
      case Op.SUB: { const b = this.pop(); const a = this.pop(); this.push(a - b); break; }
      case Op.AND: { const b = this.pop(); const a = this.pop(); this.push(a & b); break; }
      case Op.OR: { const b = this.pop(); const a = this.pop(); this.push(a | b); break; }
      case Op.XOR: { const b = this.pop(); const a = this.pop(); this.push(a ^ b); break; }
      case Op.NOT: this.push(~this.pop()); break;
      case Op.LOGIC_AND: { const b = this.pop(); const a = this.pop(); this.push(a && b ? -1 : 0); break; }
      case Op.LOGIC_OR: { const b = this.pop(); const a = this.pop(); this.push(a || b ? -1 : 0); break; }
      case Op.LOGIC_NOT: this.push(!this.pop() ? -1 : 0); break;

      case Op.MUL: { const b = this.pop(); const a = this.pop(); this.push(a * b); break; }
      case Op.DIV: { const b = this.pop(); const a = this.pop(); this.push(b === 0 ? 0 : (a / b) | 0); break; }
      case Op.MOD: { const b = this.pop(); const a = this.pop(); this.push(b === 0 ? 0 : a % b); break; }
      case Op.SHL: { const b = this.pop(); const a = this.pop(); this.push(a << b); break; }
      case Op.SHR: { const b = this.pop(); const a = this.pop(); this.push(a >> b); break; }

      case Op.EQ: { const b = this.pop(); const a = this.pop(); this.push(a === b ? -1 : 0); break; }
      case Op.NEQ: { const b = this.pop(); const a = this.pop(); this.push(a !== b ? -1 : 0); break; }
      case Op.LE: { const b = this.pop(); const a = this.pop(); this.push(a <= b ? -1 : 0); break; }
      case Op.GE: { const b = this.pop(); const a = this.pop(); this.push(a >= b ? -1 : 0); break; }
      case Op.GT: { const b = this.pop(); const a = this.pop(); this.push(a > b ? -1 : 0); break; }
      case Op.LT: { const b = this.pop(); const a = this.pop(); this.push(a < b ? -1 : 0); break; }

      case Op.STORE: {
        const addr = this.pop();
        const val = this.pop();
        this.memWrite(addr, val, 4);
        this.push(val);
        break;
      }
      case Op.LOAD_CHAR: this.push(this.memRead(this.pop(), 1)); break;

      case Op.JZ: { const addr = this.readUInt24(); const v = this.pop(); /* this.onLog(`JZ -> ${addr} (v=${v})`); */ if (v === 0) this.pc = addr; break; }
      case Op.JNZ: { const addr = this.readUInt24(); const v = this.pop(); if (v !== 0) this.pc = addr; break; }
      case Op.JMP: { this.pc = this.readUInt24(); break; }

      case Op.CALL: {
        const addr = this.readUInt24();
        this.push(this.pc);
        this.onLog(`CALL 0x${addr.toString(16)} (return to 0x${this.pc.toString(16)})`);
        this.pc = addr;
        break;
      }
      case Op.ENTER: {
        const size = this.readInt16();
        this.readByte(); // skip cnt
        this.push(this.regionStart);
        this.push(size);
        this.regionStart = this.sp; // Points to size word slot (actually sp is next free)
        this.sp -= size;
        this.onLog(`ENTER: size=${size} rs=0x${this.regionStart.toString(16)} sp=0x${this.sp.toString(16)}`);
        break;
      }
      case Op.RET: {
        const retVal = this.pop();
        this.sp = this.regionStart;
        const size = this.pop();
        const oldRs = this.pop();
        const nextPc = this.pop();
        this.onLog(`RET: retVal=${retVal} jumping back to 0x${nextPc.toString(16)} (prevRS=0x${oldRs.toString(16)})`);
        this.pc = nextPc;
        this.regionStart = oldRs;
        this.push(retVal);
        break;
      }
      case Op.EXIT: this.running = false; break;
      case Op.LOAD_BYTES: {
        const addr = this.readInt16();
        const len = this.readInt16();
        for (let i = 0; i < len; i++) this.memory[addr + i] = this.code[this.pc++];
        break;
      }
      default:
        this.onLog(`VM Error: Unknown opcode 0x${op.toString(16)} at PC: 0x${(this.pc + 15).toString(16)}`);
        this.running = false;
        break;
    }
  }

  private internalStrings: Uint8Array[] = [];
  private stringToPool(bytes: Uint8Array): number {
    this.internalStrings.push(bytes);
    return this.internalStrings.length - 1;
  }

  private getStringBytes(obj: number): Uint8Array | null {
    if ((obj & STR_MASK) === STR_MASK) {
      return this.internalStrings[obj & 0x0FFFFFFF] || null;
    }
    // Read from RAM
    let addr = obj;
    if (addr < 0 || addr >= MEMORY_SIZE) return null;
    let end = addr;
    while (end < MEMORY_SIZE && this.memory[end] !== 0) end++;
    return this.memory.slice(addr, end);
  }

  private async handleSyscall(op: number) {
    let result = 0;
    switch (op) {
      case SystemOp.putchar: {
        const c = this.pop();
        this.onLog(String.fromCharCode(c));
        break;
      }
      case SystemOp.printf: {
        const formatObj = this.pop();
        const formatBytes = this.getStringBytes(formatObj);
        if (formatBytes) {
          const str = this.formatString(formatBytes);
          this.onLog(str);
        }
        break;
      }
      case SystemOp.sprintf: {
        const formatObj = this.pop();
        const destAddr = this.pop();
        const formatBytes = this.getStringBytes(formatObj);
        if (formatBytes) {
          const str = this.formatString(formatBytes);
          const bytes = new TextEncoder().encode(str);
          this.memory.set(bytes, destAddr);
          this.memory[destAddr + bytes.length] = 0;
        }
        result = destAddr;
        break;
      }
      case SystemOp.getchar: {
        while (this.keyBuffer.length === 0 && this.running) await new Promise(r => setTimeout(r, 20));
        result = this.keyBuffer.shift() || 0;
        break;
      }
      case SystemOp.Refresh: this.flushScreen(); break;
      case SystemOp.ClearScreen: this.vram.fill(0); break;
      case SystemOp.SetScreen: this.pop(); break; // No-op, we only have one screen

      case SystemOp.TextOut: {
        const mode = this.pop();
        const strObj = this.pop();
        const y = this.pop();
        const x = this.pop();
        const bytes = this.getStringBytes(strObj);
        if (bytes) {
          const size = (mode & 0x80) ? 16 : 12;
          const reverse = !!(mode & 0x08);
          const drawMode = mode & 0x07; // 1:copy, 2:not, 3:or, 4:and, 5:xor
          this.drawText(x, y, bytes, size, reverse, drawMode);
          if (mode & 0x40) this.flushScreen();
        }
        break;
      }
      case SystemOp.Box: {
        const mode = this.pop();
        const fill = this.pop();
        const y1 = this.pop();
        const x1 = this.pop();
        const y0 = this.pop();
        const x0 = this.pop();
        if (fill) this.drawFillBox(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
        else this.drawBox(x0, y0, x1 - x0 + 1, y1 - y0 + 1);
        this.push(0);
        break;
      }
      case SystemOp.Line: {
        const mode = this.pop();
        const y1 = this.pop();
        const x1 = this.pop();
        const y0 = this.pop();
        const x0 = this.pop();
        this.drawLine(x0, y0, x1, y1);
        this.push(0);
        break;
      }
      case SystemOp.Circle: {
        const mode = this.pop();
        const fill = this.pop();
        const r = this.pop();
        const y = this.pop();
        const x = this.pop();
        if (fill) {
          // FillCircle implementation
          for (let i = 0; i <= r; i++) {
            let d = Math.floor(Math.sqrt(r * r - i * i));
            this.drawLine(x - d, y + i, x + d, y + i);
            this.drawLine(x - d, y - i, x + d, y - i);
          }
        } else {
          this.drawCircle(x, y, r);
        }
        this.push(0);
        break;
      }
      case SystemOp.Point: {
        const mode = this.pop();
        const y = this.pop();
        const x = this.pop();
        this.setPixel(x, y, mode);
        this.push(0);
        break;
      }
      case SystemOp.Delay: await new Promise(r => setTimeout(r, this.pop())); this.push(0); break;
      case SystemOp.Getms: this.push(Date.now() & 0x7FFFFFFF); break;

      case SystemOp.fopen: {
        const modeObj = this.pop();
        const pathObj = this.pop();
        const pathBytes = this.getStringBytes(pathObj);
        const modeBytes = this.getStringBytes(modeObj);
        if (!pathBytes) { this.push(0); break; }
        const path = new TextDecoder('gbk').decode(pathBytes);
        const mode = modeBytes ? new TextDecoder('gbk').decode(modeBytes) : 'r';

        const fileData = this.files.get(path);
        if (!fileData && !mode.includes('w')) {
          this.push(0);
        } else {
          const handle = this.nextHandle++;
          this.fileHandles.set(handle, {
            name: path,
            pos: 0,
            data: fileData || new Uint8Array(0)
          });
          this.push(handle);
        }
        break;
      }
      case SystemOp.fclose: {
        const handle = this.pop();
        const h = this.fileHandles.get(handle);
        if (h) {
          // If it was opened for writing, we might want to save it to VFS
          // For now, let's assume direct VFS write on fwrite
          this.fileHandles.delete(handle);
        }
        this.push(0);
        break;
      }
      case SystemOp.fread: {
        const fp = this.pop();
        const count = this.pop();
        const size = this.pop();
        const bufAddr = this.pop();
        const h = this.fileHandles.get(fp);
        if (!h) { this.push(0); break; }
        const total = size * count;
        const available = h.data.length - h.pos;
        const toRead = Math.min(total, available);
        if (toRead > 0) {
          this.memory.set(h.data.slice(h.pos, h.pos + toRead), bufAddr);
          h.pos += toRead;
        }
        this.push(Math.floor(toRead / size));
        break;
      }
      case SystemOp.fwrite: {
        const fp = this.pop();
        const count = this.pop();
        const size = this.pop();
        const bufAddr = this.pop();
        const h = this.fileHandles.get(fp);
        if (!h) { this.push(0); break; }
        const total = size * count;
        const newData = new Uint8Array(h.data.length + total); // Simplistic, doesn't handle overwriting middle
        newData.set(h.data);
        newData.set(this.memory.slice(bufAddr, bufAddr + total), h.pos);
        h.data = newData;
        h.pos += total;
        this.files.set(h.name, h.data);
        this.saveVFSToStorage();
        this.push(count);
        break;
      }
      case SystemOp.fseek: {
        const origin = this.pop();
        const offset = this.pop();
        const fp = this.pop();
        const h = this.fileHandles.get(fp);
        if (!h) { this.push(-1); break; }
        if (origin === 0) h.pos = offset; // SEEK_SET
        else if (origin === 1) h.pos += offset; // SEEK_CUR
        else if (origin === 2) h.pos = h.data.length + offset; // SEEK_END
        this.push(0);
        break;
      }
      case SystemOp.ftell: {
        const fp = this.pop();
        const h = this.fileHandles.get(fp);
        this.push(h ? h.pos : -1);
        break;
      }
      case SystemOp.DeleteFile: {
        const pathObj = this.pop();
        const bytes = this.getStringBytes(pathObj);
        if (bytes) {
          const path = new TextDecoder('gbk').decode(bytes);
          this.deleteFile(path);
          this.push(0);
        } else this.push(-1);
        break;
      }
      case SystemOp.strlen: {
        const strObj = this.pop();
        const bytes = this.getStringBytes(strObj);
        result = bytes ? bytes.length : 0;
        break;
      }
      case SystemOp.strcpy: {
        const srcObj = this.pop();
        const destAddr = this.pop();
        const bytes = this.getStringBytes(srcObj);
        if (bytes) {
          this.memory.set(bytes, destAddr);
          this.memory[destAddr + bytes.length] = 0;
        }
        result = destAddr;
        break;
      }
      case SystemOp.strcat: {
        const srcObj = this.pop();
        const destAddr = this.pop();
        const srcBytes = this.getStringBytes(srcObj);
        const destBytes = this.getStringBytes(destAddr);
        if (srcBytes && destBytes) {
          const actualDestAddr = destAddr; // This is just the start
          const currentLen = destBytes.length;
          this.memory.set(srcBytes, actualDestAddr + currentLen);
          this.memory[actualDestAddr + currentLen + srcBytes.length] = 0;
        }
        result = destAddr;
        break;
      }
      case SystemOp.strcmp: {
        const s2Obj = this.pop();
        const s1Obj = this.pop();
        const s1 = this.getStringBytes(s1Obj);
        const s2 = this.getStringBytes(s2Obj);
        if (!s1 && !s2) result = 0;
        else if (!s1) result = -1;
        else if (!s2) result = 1;
        else {
          const len = Math.min(s1.length, s2.length);
          let diff = 0;
          for (let i = 0; i < len; i++) {
            if (s1[i] !== s2[i]) {
              diff = s1[i] - s2[i];
              break;
            }
          }
          result = diff !== 0 ? diff : s1.length - s2.length;
        }
        break;
      }
      case SystemOp.memset: {
        const count = this.pop();
        const val = this.pop();
        const dest = this.pop();
        this.memory.fill(val & 0xFF, dest, dest + count);
        result = dest;
        break;
      }
      case SystemOp.memcpy: {
        const count = this.pop();
        const src = this.pop();
        const dest = this.pop();
        this.memory.set(this.memory.slice(src, src + count), dest);
        result = dest;
        break;
      }
      case SystemOp.abs: {
        const val = this.pop();
        result = Math.abs(val);
        break;
      }
      case SystemOp.isdigit: result = /\d/.test(String.fromCharCode(this.pop())) ? 1 : 0; break;
      case SystemOp.isalpha: result = /[a-zA-Z]/.test(String.fromCharCode(this.pop())) ? 1 : 0; break;
      case SystemOp.isalnum: result = /[a-zA-Z0-9]/.test(String.fromCharCode(this.pop())) ? 1 : 0; break;
      case SystemOp.tolower: result = String.fromCharCode(this.pop()).toLowerCase().charCodeAt(0); break;
      case SystemOp.toupper: result = String.fromCharCode(this.pop()).toUpperCase().charCodeAt(0); break;
      case SystemOp.CheckKey: {
        const key = this.pop();
        // Just return first key if any for now, or match specific key
        result = this.keyBuffer.length > 0 ? 1 : 0;
        break;
      }
      case SystemOp.CheckKey_Alt: {
        const key = this.pop();
        result = this.keyBuffer.length > 0 ? 1 : 0;
        break;
      }
      default:
        this.onLog(`VM Warning: Unimplemented syscall 0x${op.toString(16)} `);
        break;
    }
    this.push(result);
  }

  private flushScreen() {
    if (typeof ImageData === 'undefined') return;
    const img = new ImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    for (let i = 0; i < SCREEN_WIDTH * SCREEN_HEIGHT; i++) {
      const pixel = (this.vram[Math.floor(i / 8)] >> (7 - (i % 8))) & 1;
      const idx = i * 4;
      const c = pixel ? [35, 45, 35] : [148, 161, 135];
      img.data[idx] = c[0]; img.data[idx + 1] = c[1]; img.data[idx + 2] = c[2]; img.data[idx + 3] = 255;
    }
    this.onUpdateScreen(img);
  }

  private setPixel(x: number, y: number, color: number, mode: number = 1) {
    if (x < 0 || x >= SCREEN_WIDTH || y < 0 || y >= SCREEN_HEIGHT) return;
    const i = y * SCREEN_WIDTH + x;
    const byteIdx = Math.floor(i / 8);
    const bitIdx = 7 - (i % 8);
    const oldPixel = (this.vram[byteIdx] >> bitIdx) & 1;

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

    if (newPixel) this.vram[byteIdx] |= (1 << bitIdx);
    else this.vram[byteIdx] &= ~(1 << bitIdx);
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

  private drawBox(x: number, y: number, w: number, h: number) {
    for (let i = x; i < x + w; i++) { this.setPixel(i, y, this.colorMode); this.setPixel(i, y + h - 1, this.colorMode); }
    for (let i = y; i < y + h; i++) { this.setPixel(x, i, this.colorMode); this.setPixel(x + w - 1, i, this.colorMode); }
  }

  private drawFillBox(x: number, y: number, w: number, h: number) {
    for (let i = y; i < y + h; i++) {
      for (let j = x; j < x + w; j++) {
        this.setPixel(j, i, this.colorMode);
      }
    }
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number) {
    const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1, sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    while (true) {
      this.setPixel(x1, y1, this.colorMode);
      if (x1 === x2 && y1 === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x1 += sx; }
      if (e2 < dx) { err += dx; y1 += sy; }
    }
  }

  private drawCircle(xc: number, yc: number, r: number) {
    let x = 0, y = r;
    let d = 3 - 2 * r;
    const drawPoints = (xc: number, yc: number, x: number, y: number) => {
      this.setPixel(xc + x, yc + y, this.colorMode); this.setPixel(xc - x, yc + y, this.colorMode);
      this.setPixel(xc + x, yc - y, this.colorMode); this.setPixel(xc - x, yc - y, this.colorMode);
      this.setPixel(xc + y, yc + x, this.colorMode); this.setPixel(xc - y, yc + x, this.colorMode);
      this.setPixel(xc + y, yc - x, this.colorMode); this.setPixel(xc - y, yc - x, this.colorMode);
    };
    drawPoints(xc, yc, x, y);
    while (y >= x) {
      x++;
      if (d > 0) { y--; d = d + 4 * (x - y) + 10; }
      else d = d + 4 * x + 6;
      drawPoints(xc, yc, x, y);
    }
  }

  private formatString(formatBytes: Uint8Array): string {
    const format = new TextDecoder('gbk').decode(formatBytes);
    let result = "";
    let i = 0;
    while (i < format.length) {
      if (format[i] === '%' && i + 1 < format.length) {
        i++;
        const spec = format[i];
        if (spec === '%') {
          result += "%";
        } else if (spec === 'c') {
          result += String.fromCharCode(this.pop());
        } else if (spec === 'd') {
          result += this.pop().toString();
        } else if (spec === 'f') {
          // GVM doesn't really have 32-bit floats in standard stack, 
          // but we can try to interpret the 32-bit value.
          // For now, treat as integer or a fixed-point if known.
          // LavaX-docs says "浮点数", so we'll treat the 32-bit as float.
          const val = this.pop();
          const buffer = new ArrayBuffer(4);
          new Int32Array(buffer)[0] = val;
          result += new Float32Array(buffer)[0].toString();
        } else if (spec === 's') {
          const strObj = this.pop();
          const bytes = this.getStringBytes(strObj);
          if (bytes) result += new TextDecoder('gbk').decode(bytes);
        } else {
          result += "%" + spec;
        }
      } else {
        result += format[i];
      }
      i++;
    }
    return result;
  }

  private vram = new Uint8Array(this.memory.buffer, 0, SCREEN_WIDTH * SCREEN_HEIGHT / 8);
}
