
import { SCREEN_WIDTH, SCREEN_HEIGHT, MEMORY_SIZE, STR_MASK, Op, Syscall } from './types';
import iconv from 'iconv-lite';

export class LavaXVM {
  private memory = new Int32Array(MEMORY_SIZE / 4);
  private stack: number[] = [];
  private callStack: number[] = [];
  private ip = 0;
  private running = false;
  private code: Uint8Array = new Uint8Array(0);
  private stringPool: Uint8Array[] = [];
  private vram = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT / 8);
  private keyBuffer: number[] = [];

  private files: Map<string, Uint8Array> = new Map();
  private fileHandles: Map<number, { name: string, pos: number, data: Uint8Array }> = new Map();
  private nextHandle = 1;

  private fontData: Uint8Array | null = null;
  private fontOffsets: number[] = [];
  private currentFontSize: 12 | 16 = 16;
  private colorMode: number = 1; // 1 = black, 0 = white (for mono)

  public onUpdateScreen: (imageData: ImageData) => void = () => { };
  public onLog: (msg: string) => void = () => { };
  public onFinished: () => void = () => { };

  constructor() {
    this.loadVFSFromStorage();
  }

  private async loadVFSFromStorage() {
    const saved = localStorage.getItem('lavax_vfs_v2');
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        for (const k in obj) {
          const arr = Uint8Array.from(atob(obj[k]), c => c.charCodeAt(0));
          this.files.set(k, arr);
        }
      } catch (e) { }
    }
  }

  private saveVFSToStorage() {
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
    if (lav.length < 8) return;
    const codeLen = (lav[4] << 24) | (lav[5] << 16) | (lav[6] << 8) | lav[7];
    this.code = lav.slice(8, 8 + codeLen);
    this.stringPool = [];
    const stringsTail = lav.slice(8 + codeLen);
    let i = 0;
    while (i < stringsTail.length) {
      let start = i;
      while (i < stringsTail.length && stringsTail[i] !== 0) i++;
      this.stringPool.push(stringsTail.slice(start, i));
      i++; // skip null
    }
  }

  public addFile(path: string, data: Uint8Array) {
    this.files.set(path, data);
    this.saveVFSToStorage();
  }
  public getFile(path: string) { return this.files.get(path); }
  public deleteFile(path: string) { this.files.delete(path); this.saveVFSToStorage(); }
  public getFiles() { return Array.from(this.files.entries()).map(([p, d]) => ({ path: p, size: d.length })); }

  async run() {
    if (this.code.length === 0) return;
    this.running = true;
    this.ip = 0;
    this.stack = [];
    this.callStack = [];
    this.vram.fill(0);
    this.memory.fill(0);
    this.keyBuffer = [];
    this.fileHandles.clear();
    this.nextHandle = 1;
    this.currentFontSize = 16;
    this.colorMode = 1;
    this.flushScreen();

    try {
      let stepCount = 0;
      while (this.running && this.ip < this.code.length) {
        await this.step();
        stepCount++;
        if (stepCount % 2000 === 0) {
          await new Promise(r => requestAnimationFrame(r));
        }
      }
    } catch (e: any) {
      this.onLog(`VM Runtime Error: ${e.message} at IP: ${this.ip}`);
    }
    this.running = false;
    this.onFinished();
  }

  stop() { this.running = false; }

  pushKey(key: string) {
    const keyMap: Record<string, number> = {
      '↵': 13, 'ESC': 27, '↑': 20, '↓': 21, '←': 22, '→': 23,
      'F1': 28, 'F2': 29, 'F3': 30, 'F4': 31, 'HELP': 1
    };
    const code = key.length === 1 ? key.charCodeAt(0) : (keyMap[key] || 0);
    if (code) this.keyBuffer.push(code);
  }

  private async step() {
    const op = this.code[this.ip++];
    switch (op) {
      case Op.LIT: this.stack.push(this.readInt()); break;
      case Op.LOD: this.stack.push(this.memory[this.readInt()] || 0); break;
      case Op.STO: this.memory[this.readInt()] = this.stack.pop() || 0; break;
      case Op.ADD: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push((a + b) | 0); break; }
      case Op.SUB: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push((a - b) | 0); break; }
      case Op.MUL: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push((a * b) | 0); break; }
      case Op.DIV: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push(b === 0 ? 0 : (a / b) | 0); break; }
      case Op.MOD: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push(b === 0 ? 0 : (a % b) | 0); break; }
      case Op.AND: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push((a & b) | 0); break; }
      case Op.OR: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push((a | b) | 0); break; }
      case Op.XOR: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push((a ^ b) | 0); break; }
      case Op.EQ: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push(a === b ? 1 : 0); break; }
      case Op.NEQ: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push(a !== b ? 1 : 0); break; }
      case Op.LT: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push(a < b ? 1 : 0); break; }
      case Op.GT: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push(a > b ? 1 : 0); break; }
      case Op.LE: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push(a <= b ? 1 : 0); break; }
      case Op.GE: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push(a >= b ? 1 : 0); break; }
      case Op.JMP: this.ip = this.readInt(); break;
      case Op.JZ: { const addr = this.readInt(); if (!this.stack.pop()) this.ip = addr; break; }
      case Op.JNZ: { const addr = this.readInt(); if (this.stack.pop()) this.ip = addr; break; }
      case Op.CALL: { const addr = this.readInt(); this.callStack.push(this.ip); this.ip = addr; break; }
      case Op.RET: { const addr = this.callStack.pop(); if (addr !== undefined) this.ip = addr; else this.running = false; break; }
      case Op.SYS: await this.handleSyscall(this.readInt()); break;
      case Op.POP: this.stack.pop(); break;
      case Op.DUP: { const v = this.stack[this.stack.length - 1]; if (v !== undefined) this.stack.push(v); break; }
      case Op.SWP: { const b = this.stack.pop()!; const a = this.stack.pop()!; this.stack.push(b, a); break; }
      case Op.HLT: this.running = false; break;
    }
  }

  private readInt() {
    const val = (this.code[this.ip] << 24) | (this.code[this.ip + 1] << 16) | (this.code[this.ip + 2] << 8) | this.code[this.ip + 3];
    this.ip += 4;
    return val;
  }

  private async handleSyscall(id: number) {
    switch (id) {
      case Syscall.ClearScreen: this.vram.fill(0); break;
      case Syscall.Refresh: this.flushScreen(); break;
      case Syscall.TextOut: {
        const str = this.stack.pop(); const y = this.stack.pop(); const x = this.stack.pop();
        this.drawText(x || 0, y || 0, str);
        break;
      }
      case Syscall.getchar: {
        while (this.keyBuffer.length === 0 && this.running) await new Promise(r => setTimeout(r, 20));
        this.stack.push(this.keyBuffer.shift() || 0);
        break;
      }
      case Syscall.Inkey: {
        this.stack.push(this.keyBuffer.shift() || 0);
        break;
      }
      case Syscall.delay: await new Promise(r => setTimeout(r, this.stack.pop() || 0)); break;
      case Syscall.Box: {
        const h = this.stack.pop(); const w = this.stack.pop(); const y = this.stack.pop(); const x = this.stack.pop();
        this.drawBox(x || 0, y || 0, w || 0, h || 0); break;
      }
      case Syscall.FillBox: {
        const h = this.stack.pop(); const w = this.stack.pop(); const y = this.stack.pop(); const x = this.stack.pop();
        this.drawFillBox(x || 0, y || 0, w || 0, h || 0); break;
      }
      case Syscall.Line: {
        const y2 = this.stack.pop(); const x2 = this.stack.pop(); const y1 = this.stack.pop(); const x1 = this.stack.pop();
        this.drawLine(x1 || 0, y1 || 0, x2 || 0, y2 || 0); break;
      }
      case Syscall.Circle: {
        const r = this.stack.pop(); const y = this.stack.pop(); const x = this.stack.pop();
        this.drawCircle(x || 0, y || 0, r || 0); break;
      }
      case Syscall.SetFontSize: this.currentFontSize = (this.stack.pop() === 12 ? 12 : 16); break;
      case Syscall.SetColor: this.colorMode = this.stack.pop() ? 1 : 0; break;
      case Syscall.GetMS: this.stack.push(Date.now() & 0x7FFFFFFF); break;
      case Syscall.fopen: {
        const mode = this.stack.pop();
        const obj = this.stack.pop();
        if ((obj! & STR_MASK) !== STR_MASK) { this.stack.push(0); break; }
        const name = iconv.decode(this.stringPool[obj! & 0x0FFFFFFF], 'gbk');
        let data = this.files.get(name);
        if (!data && mode === 1) { data = new Uint8Array(0); this.files.set(name, data); }
        if (data) {
          const h = this.nextHandle++;
          this.fileHandles.set(h, { name, pos: 0, data });
          this.stack.push(h);
        } else this.stack.push(0);
        break;
      }
      case Syscall.fclose: {
        const h = this.stack.pop();
        const handle = this.fileHandles.get(h!);
        if (handle) {
          this.files.set(handle.name, handle.data);
          this.fileHandles.delete(h!);
          this.saveVFSToStorage();
        }
        break;
      }
      case Syscall.fwrite: {
        const val = this.stack.pop(); const h = this.stack.pop();
        const handle = this.fileHandles.get(h!);
        if (handle) {
          const next = new Uint8Array(handle.data.length + 1);
          next.set(handle.data); next[handle.data.length] = val! & 0xFF;
          handle.data = next;
          this.stack.push(1);
        } else this.stack.push(0);
        break;
      }
    }
  }

  private flushScreen() {
    const img = new ImageData(SCREEN_WIDTH, SCREEN_HEIGHT);
    for (let i = 0; i < SCREEN_WIDTH * SCREEN_HEIGHT; i++) {
      const pixel = (this.vram[Math.floor(i / 8)] >> (7 - (i % 8))) & 1;
      const idx = i * 4;
      const c = pixel ? [35, 45, 35] : [148, 161, 135];
      img.data[idx] = c[0]; img.data[idx + 1] = c[1]; img.data[idx + 2] = c[2]; img.data[idx + 3] = 255;
    }
    this.onUpdateScreen(img);
  }

  private setPixel(x: number, y: number, color: number) {
    if (x < 0 || x >= SCREEN_WIDTH || y < 0 || y >= SCREEN_HEIGHT) return;
    const i = y * SCREEN_WIDTH + x;
    if (color) this.vram[Math.floor(i / 8)] |= (1 << (7 - (i % 8)));
    else this.vram[Math.floor(i / 8)] &= ~(1 << (7 - (i % 8)));
  }

  private drawText(x: number, y: number, obj: any) {
    if ((obj & STR_MASK) !== STR_MASK || !this.fontData) return;
    const bytes = this.stringPool[obj & 0x0FFFFFFF];
    if (!bytes) return;

    let curX = x;
    let i = 0;
    while (i < bytes.length) {
      const b1 = bytes[i];
      if (b1 < 0x80) {
        this.drawChar(curX, y, b1, this.currentFontSize);
        curX += (this.currentFontSize === 16 ? 8 : 6); i++;
      } else {
        const b2 = bytes[i + 1];
        if (b2) {
          this.drawChinese(curX, y, b1, b2, this.currentFontSize);
          curX += this.currentFontSize;
          i += 2;
        } else i++;
      }
    }
  }

  private drawChar(x: number, y: number, code: number, size: number) {
    const base = this.fontOffsets[size === 16 ? 0 : 1];
    const charIdx = code - 32;
    if (charIdx < 0 || charIdx >= 95) return;
    const width = size === 16 ? 8 : 6;
    const offset = base + charIdx * size;
    for (let r = 0; r < size; r++) {
      const byte = this.fontData![offset + r];
      for (let c = 0; c < width; c++) if ((byte >> (7 - c)) & 1) this.setPixel(x + c, y + r, this.colorMode);
    }
  }

  private drawChinese(x: number, y: number, b1: number, b2: number, size: number) {
    const base = this.fontOffsets[size === 16 ? 2 : 3];
    const rIdx = b1 - 0xA1, cIdx = b2 - 0xA1;
    if (rIdx < 0 || rIdx >= 94 || cIdx < 0 || cIdx >= 94) return;
    const charBytes = size === 16 ? 32 : 24;
    const offset = base + (rIdx * 94 + cIdx) * charBytes;
    for (let r = 0; r < size; r++) {
      const bL = this.fontData![offset + r * 2], bR = this.fontData![offset + r * 2 + 1];
      for (let b = 0; b < 8; b++) if ((bL >> (7 - b)) & 1) this.setPixel(x + b, y + r, this.colorMode);
      for (let b = 0; b < size - 8; b++) if ((bR >> (7 - b)) & 1) this.setPixel(x + 8 + b, y + r, this.colorMode);
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
}
