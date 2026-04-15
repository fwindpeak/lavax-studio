import iconv from 'iconv-lite';
import { SystemOp, MathOp, MathFrameworkOp, SystemCoreOp, GBUF_OFFSET, TEXT_OFFSET, MEMORY_SIZE, VRAM_OFFSET, GBUF_OFFSET_LVM } from '../types';
import { GraphicsEngine } from './GraphicsEngine';
import { VirtualFileSystem } from './VirtualFileSystem';

export interface ILavaXVM {
    pop(): number;
    push(val: number): void;
    pushFloat(val: number): void;
    popFloat(): number;
    resolveAddress(addr: number): number;
    getStringBytes(handle: number): Uint8Array | null;
    onLog(msg: string): void;
    memory: Uint8Array;
    running: boolean;
    debug: boolean;
    keyBuffer: number[];
    startTime: number;
    vfs: VirtualFileSystem;
    graphics: GraphicsEngine;
    stk: Int32Array;
    sp: number;
    heldKeys: Uint8Array;
    currentKeyDown: number;
    delayUntil: number;
    rngSeed: number;
    wakeUp(): void;
}

const LTRUE = -1;
const LFALSE = 0;
const SIN90 = [
    0, 18, 36, 54, 71, 89, 107, 125,
    143, 160, 178, 195, 213, 230, 248, 265,
    282, 299, 316, 333, 350, 367, 384, 400,
    416, 433, 449, 465, 481, 496, 512, 527,
    543, 558, 573, 587, 602, 616, 630, 644,
    658, 672, 685, 698, 711, 724, 737, 749,
    761, 773, 784, 796, 807, 818, 828, 839,
    849, 859, 868, 878, 887, 896, 904, 912,
    920, 928, 935, 943, 949, 956, 962, 968,
    974, 979, 984, 989, 994, 998, 1002, 1005,
    1008, 1011, 1014, 1016, 1018, 1020, 1022, 1023,
    1023, 1024, 1024,
];

/**
 * LavaX Syscall Handler (GVM ISA V3.0)
 * Source of truth for parameter counts and returns: src/vm/SyscallMetadata.ts
 */
interface FileListState {
    files: string[];
    fpos: number;
    fnum_i: number;
    ptr: number;
}

export class SyscallHandler {
    private fileListState: FileListState | null = null;
    constructor(private vm: ILavaXVM) { }

    private getHeldKey(): number {
        for (let key = 1; key < this.vm.heldKeys.length; key++) {
            if (this.vm.heldKeys[key]) return key;
        }
        return 0;
    }

    private nextRand(): number {
        const next = (Math.imul(this.vm.rngSeed, 0x15a4e35) + 1) | 0;
        this.vm.rngSeed = next;
        return (next >>> 16) & 0x7fff;
    }

    private getMilliseconds256(): number {
        return ((new Date().getMilliseconds() * 256) / 1000) & 0xFF;
    }

    private sin1024(angle: number): number {
        let v = angle & 0xffff;
        v %= 360;
        if (v < 0) v += 360;
        if (v < 90) return SIN90[v];
        if (v < 180) return SIN90[180 - v];
        if (v < 270) return -SIN90[v - 180];
        return -SIN90[360 - v];
    }

    public handleSync(op: number): number | null | undefined {
        const vm = this.vm;

        // Async triggers
        if (op === SystemOp.getchar || op === SystemOp.GetWord) {
            if (vm.keyBuffer.length === 0) return undefined;
        }
        if (op === SystemOp.Delay) {
            const now = Date.now();
            if (vm.delayUntil === 0) {
                // Peek the delay duration from stack (it's the top value)
                const duration = vm.stk[vm.sp - 1] & 0x7fff;
                const ticks = Math.floor((duration * 256) / 1000);
                if (ticks <= 0) {
                    vm.pop();
                    return null;
                }
                const delayMs = Math.ceil((ticks * 1000) / 256);
                vm.delayUntil = now + delayMs;
                setTimeout(() => {
                    vm.wakeUp();
                }, delayMs);
                return undefined; // Yield
            } else if (now < vm.delayUntil) {
                return undefined; // Still waiting
            } else {
                // Done waiting
                vm.delayUntil = 0;
                vm.pop(); // Actually consume the duration argument
                return null;
            }
        }

        switch (op) {
            case SystemOp.putchar: {
                const char = String.fromCharCode(vm.pop());
                vm.graphics.writeString(char);
                // UpdateLCD(0)
                vm.graphics.repaintFromTextMemory(0);
                vm.graphics.flushScreen();
                return null;
            }

            case SystemOp.printf: {
                const count = vm.pop();
                const startIdx = vm.sp - count;
                const fmtHandle = vm.stk[startIdx];
                const formatBytes = vm.getStringBytes(fmtHandle);
                if (formatBytes) {
                    const str = this.formatVariadicString(formatBytes, count - 1, startIdx + 1);
                    if (vm.debug) vm.onLog(str);
                    vm.graphics.writeString(str);
                    // UpdateLCD(0)
                    vm.graphics.repaintFromTextMemory(0);
                    vm.graphics.flushScreen();
                }
                vm.sp -= count;
                return null;
            }

            case SystemOp.sprintf: {
                const count = vm.pop();
                // Stack layout: [buf, fmt, arg1, arg2...]
                const bufIdx = vm.sp - count;
                const fmtIdx = vm.sp - count + 1;
                const argsIdx = vm.sp - count + 2;

                const destAddr = vm.resolveAddress(vm.stk[bufIdx]);
                const fmtHandle = vm.stk[fmtIdx];
                const formatBytes = vm.getStringBytes(fmtHandle);

                if (formatBytes) {
                    // count - 2 = number of format args (excluding buf and fmt)
                    const str = this.formatVariadicString(formatBytes, count - 2, argsIdx);
                    const bytes = iconv.encode(str, 'gbk');
                    vm.memory.set(bytes, destAddr);
                    vm.memory[destAddr + bytes.length] = 0;
                }
                vm.sp -= count; // pop all args (buf, fmt, varargs)
                return null;
            }

            case SystemOp.strcpy: {
                const srcAddr = vm.pop();
                const destAddr = vm.resolveAddress(vm.pop());
                const bytes = vm.getStringBytes(srcAddr);
                if (bytes) {
                    vm.memory.set(bytes, destAddr);
                    vm.memory[destAddr + bytes.length] = 0;
                }
                return null;
            }

            case SystemOp.strlen: {
                const bytes = vm.getStringBytes(vm.pop());
                return bytes ? bytes.length : 0;
            }

            case SystemOp.SetScreen: {
                const mode = vm.pop();
                vm.graphics.currentFontSize = (mode === 0) ? 16 : 12;
                // Clear VRAM and _TEXT buffer on SetScreen
                vm.graphics.clearVRAM();
                vm.graphics.clearTextBuffer();
                vm.graphics.flushScreen();
                return null;
            }

            case SystemOp.UpdateLCD:
                const mask = vm.pop();
                vm.graphics.repaintFromTextMemory(mask);
                vm.graphics.flushScreen();
                return null;

            case SystemOp.WriteBlock: {
                const addr = vm.resolveAddress(vm.pop());
                const type = vm.pop(), h = vm.pop(), w = vm.pop(), y = vm.pop(), x = vm.pop();
                vm.graphics.WriteBlock(x, y, w, h, type, addr);
                return null;
            }

            case SystemOp.TextOut: {
                const type = vm.pop(), strAddr = vm.pop(), y = vm.pop(), x = vm.pop();
                const bytes = vm.getStringBytes(strAddr);
                if (bytes) {
                    vm.graphics.TextOut(x, y, bytes, type);
                }
                return null;
            }

            case SystemOp.Block: {
                const type = vm.pop(), y1 = vm.pop(), x1 = vm.pop(), y0 = vm.pop(), x0 = vm.pop();
                vm.graphics.Block(x0, y0, x1, y1, type);
                return null;
            }

            case SystemOp.Rectangle: {
                const type = vm.pop(), y1 = vm.pop(), x1 = vm.pop(), y0 = vm.pop(), x0 = vm.pop();
                vm.graphics.Rectangle(x0, y0, x1, y1, type);
                return null;
            }

            case SystemOp.Refresh: {
                const gbuf = (vm.graphics.graphMode === 1) ? GBUF_OFFSET : GBUF_OFFSET_LVM;
                const size = (vm.graphics.graphMode === 8) ? 12800 : (vm.graphics.graphMode === 4 ? 6400 : 1600);
                vm.memory.copyWithin(VRAM_OFFSET, gbuf, gbuf + size);
                vm.graphics.flushScreen();
                return null;
            }

            case SystemOp.RefreshIcon: {
                // Refresh top icon bar if applicable, for now same as refresh
                vm.graphics.flushScreen();
                return null;
            }

            case SystemOp.Locate: {
                const x = vm.pop(), y = vm.pop();
                vm.graphics.cursorX = x;
                vm.graphics.cursorY = y;
                vm.graphics.setCurrentLine(y);
                return null;
            }

            case SystemOp.Point: {
                const type = vm.pop(), y = vm.pop(), x = vm.pop();
                vm.graphics.Point(x, y, type);
                return null;
            }

            case SystemOp.GetPoint: {
                const y = vm.pop(), x = vm.pop();
                return vm.graphics.getPixel(x, y, 0);
            }

            case SystemOp.Line: {
                const type = vm.pop(), y1 = vm.pop(), x1 = vm.pop(), y0 = vm.pop(), x0 = vm.pop();
                vm.graphics.Line(x0, y0, x1, y1, type);
                return null;
            }

            case SystemOp.Box: {
                const type = vm.pop(), fill = vm.pop(), y1 = vm.pop(), x1 = vm.pop(), y0 = vm.pop(), x0 = vm.pop();
                vm.graphics.Box(x0, y0, x1, y1, fill, type);
                return null;
            }

            case SystemOp.Circle: {
                const type = vm.pop(), fill = vm.pop(), r = vm.pop(), y = vm.pop(), x = vm.pop();
                vm.graphics.Circle(x, y, r, fill, type);
                return null;
            }

            case SystemOp.Ellipse: {
                const type = vm.pop(), fill = vm.pop(), ry = vm.pop(), rx = vm.pop(), y = vm.pop(), x = vm.pop();
                vm.graphics.Ellipse(x, y, rx, ry, fill, type);
                return null;
            }

            case SystemOp.Beep: {
                // Not supported in headless, but avoid warning
                return null;
            }

            case SystemOp.XDraw: {
                const mode = vm.pop();
                vm.graphics.XDraw(mode);
                return null;
            }

            case SystemOp.GetBlock: {
                const addr = vm.resolveAddress(vm.pop());
                const type = vm.pop(), h = vm.pop(), w = vm.pop(), y = vm.pop(), x = vm.pop();
                vm.graphics.GetBlock(x, y, w, h, type, addr);
                return null;
            }

            case SystemOp.FillArea: {
                const type = vm.pop(), y = vm.pop(), x = vm.pop();
                vm.graphics.FillArea(x, y, type);
                return null;
            }

            case SystemOp.SetGraphMode: {
                const mode = vm.pop();
                if (mode === 0) return vm.graphics.graphMode;
                if (mode !== 1 && mode !== 4 && mode !== 8) return 0;

                const oldMode = vm.graphics.graphMode;
                vm.graphics.graphMode = mode;
                if (mode === 4) {
                    vm.graphics.bgColor = 0;
                    vm.graphics.fgColor = 15;
                } else if (mode === 8) {
                    vm.graphics.bgColor = 0;
                    vm.graphics.fgColor = 255;
                } else {
                    vm.graphics.bgColor = 0;
                    vm.graphics.fgColor = 1;
                }
                // Clearing screen on mode change is common
                vm.graphics.clearVRAM();
                vm.graphics.clearGraphBuffer();
                vm.graphics.flushScreen();
                return oldMode;
            }

            case SystemOp.SetPalette: {
                const palAddr = vm.resolveAddress(vm.pop());
                const num = vm.pop();
                const start = vm.pop();
                for (let i = 0; i < num; i++) {
                    if (start + i >= 256) break;
                    vm.graphics.palette[(start + i) * 4] = vm.memory[palAddr + i * 4 + 2];
                    vm.graphics.palette[(start + i) * 4 + 1] = vm.memory[palAddr + i * 4 + 1];
                    vm.graphics.palette[(start + i) * 4 + 2] = vm.memory[palAddr + i * 4];
                    vm.graphics.palette[(start + i) * 4 + 3] = 255;
                }
                return num;
            }
            case SystemOp.SetFgColor: {
                const color = vm.pop();
                const old = vm.graphics.fgColor;
                vm.graphics.fgColor = vm.graphics.graphMode === 8 ? (color & 0xFF) : (color & 0x0F);
                return old;
            }
            case SystemOp.SetBgColor: {
                const color = vm.pop();
                const old = vm.graphics.bgColor;
                vm.graphics.bgColor = vm.graphics.graphMode === 8 ? (color & 0xFF) : (color & 0x0F);
                return old;
            }
            case SystemOp.exit: vm.pop(); vm.running = false; return 0;
            case SystemOp.ClearScreen: vm.graphics.clearGraphBuffer(); return null;
            case SystemOp.abs: return Math.abs(vm.pop());
            case SystemOp.rand: return this.nextRand();
            case SystemOp.srand:
                vm.rngSeed = vm.pop() | 0;
                return null;
            case SystemOp.getchar: {
                if (vm.keyBuffer.length === 0) return undefined;
                return vm.keyBuffer.shift()!;
            }
            case SystemOp.Inkey: return vm.keyBuffer.length > 0 ? vm.keyBuffer.shift()! : 0;

            case SystemOp.isalnum: return /^[a-z0-9]$/i.test(String.fromCharCode(vm.pop())) ? -1 : 0;
            case SystemOp.isalpha: return /^[a-z]$/i.test(String.fromCharCode(vm.pop())) ? -1 : 0;
            case SystemOp.iscntrl: {
                const c = vm.pop();
                return (c >= 0 && c <= 31) || c === 127 ? -1 : 0;
            }
            case SystemOp.isdigit: return /^[0-9]$/.test(String.fromCharCode(vm.pop())) ? -1 : 0;
            case SystemOp.isgraph: {
                const c = vm.pop();
                return (c >= 33 && c <= 126) ? -1 : 0;
            }
            case SystemOp.islower: return /^[a-z]$/.test(String.fromCharCode(vm.pop())) ? -1 : 0;
            case SystemOp.isprint: {
                const c = vm.pop();
                return (c >= 32 && c <= 126) ? -1 : 0;
            }
            case SystemOp.ispunct: return /^[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]$/.test(String.fromCharCode(vm.pop())) ? -1 : 0;
            case SystemOp.isspace: return /^\s$/.test(String.fromCharCode(vm.pop())) ? -1 : 0;
            case SystemOp.isupper: return /^[A-Z]$/.test(String.fromCharCode(vm.pop())) ? -1 : 0;
            case SystemOp.isxdigit: return /^[a-f0-9]$/i.test(String.fromCharCode(vm.pop())) ? -1 : 0;

            case SystemOp.tolower: return String.fromCharCode(vm.pop()).toLowerCase().charCodeAt(0);
            case SystemOp.toupper: return String.fromCharCode(vm.pop()).toUpperCase().charCodeAt(0);

            case SystemOp.strcmp: {
                const s2 = vm.getStringBytes(vm.pop());
                const s1 = vm.getStringBytes(vm.pop());
                if (!s1 || !s2) return 0;
                const str1 = new TextDecoder('gbk').decode(s1);
                const str2 = new TextDecoder('gbk').decode(s2);
                if (str1 < str2) return -1;
                if (str1 > str2) return 1;
                return 0;
            }
            case SystemOp.strcat: {
                const src = vm.getStringBytes(vm.pop());
                const destHandle = vm.pop();
                const destAddr = vm.resolveAddress(destHandle);
                const destBytes = vm.getStringBytes(destHandle);
                if (destBytes && src) {
                    vm.memory.set(src, destAddr + destBytes.length);
                    vm.memory[destAddr + destBytes.length + src.length] = 0;
                }
                return null;
            }
            case SystemOp.strchr: {
                const char = vm.pop();
                const strHandle = vm.pop();
                const bytes = vm.getStringBytes(strHandle);
                if (bytes) {
                    const idx = bytes.indexOf(char);
                    if (idx !== -1) return (strHandle & 0xFFFF0000) | ((vm.resolveAddress(strHandle) + idx) & 0xFFFF);
                }
                return 0;
            }
            case SystemOp.strstr: {
                const subHandle = vm.pop();
                const strHandle = vm.pop();
                const sub = vm.getStringBytes(subHandle);
                const str = vm.getStringBytes(strHandle);
                if (str && sub) {
                    const strText = new TextDecoder('gbk').decode(str);
                    const subText = new TextDecoder('gbk').decode(sub);
                    const idx = strText.indexOf(subText);
                    if (idx !== -1) {
                        // We need to find the byte offset, not char offset for GBK
                        // But since we are returning a handle, it's tricky.
                        // Let's find byte index in 'str'
                        let byteIdx = 0;
                        const enc = new TextEncoder(); // This might be UTF-8, but GBK prefix match should be similar in structure for simple ASCII
                        // Actually, let's just use the index on bytes if possible
                        // Simple byte search for now
                        for (let i = 0; i <= str.length - sub.length; i++) {
                            let match = true;
                            for (let j = 0; j < sub.length; j++) {
                                if (str[i + j] !== sub[j]) { match = false; break; }
                            }
                            if (match) return (strHandle & 0xFFFF0000) | ((vm.resolveAddress(strHandle) + i) & 0xFFFF);
                        }
                    }
                }
                return 0;
            }


            case SystemOp.memset: {
                const count = vm.pop(), val = vm.pop(), addr = vm.resolveAddress(vm.pop());
                vm.memory.fill(val, addr, addr + count);
                return null;
            }

            case SystemOp.memcpy: {
                const count = vm.pop(), src = vm.resolveAddress(vm.pop()), dest = vm.resolveAddress(vm.pop());
                vm.memory.set(vm.memory.subarray(src, src + count), dest);
                return null;
            }

            case SystemOp.fopen: {
                const m = vm.getStringBytes(vm.pop()), p = vm.getStringBytes(vm.pop());
                if (!p || !m) return 0;
                const dec = new TextDecoder('gbk');
                const handle = vm.vfs.openFile(dec.decode(p), dec.decode(m));
                return handle <= 0 ? 0 : handle;
            }
            case SystemOp.fclose: {
                vm.vfs.closeFile(vm.pop());
                return null;
            }
            case SystemOp.fread: {
                // Stack: [buf, size, count, fp]
                const fp = vm.pop(), count = vm.pop(), size = vm.pop(), buf = vm.resolveAddress(vm.pop());
                const h = vm.vfs.getHandle(fp);
                if (!h) return 0;
                
                // LavaX spec: size is ignored, count is number of bytes
                const toRead = Math.min(count, h.data.length - h.pos);
                if (toRead > 0) {
                    vm.memory.set(h.data.subarray(h.pos, h.pos + toRead), buf);
                    h.pos += toRead;
                    return toRead;
                }
                return 0;
            }
            case SystemOp.fwrite: {
                // Stack: [buf, size, count, fp]
                const fp = vm.pop(), count = vm.pop(), size = vm.pop(), buf = vm.resolveAddress(vm.pop());
                const h = vm.vfs.getHandle(fp);
                if (!h) return 0;

                // LavaX spec: size is ignored, count is number of bytes
                const data = vm.memory.subarray(buf, buf + count);
                return vm.vfs.writeHandleData(fp, data, h.pos);
            }
            case SystemOp.fseek: {
                const whence = vm.pop(), offset = vm.pop(), fp = vm.pop();
                const h = vm.vfs.getHandle(fp);
                if (!h) return -1;
                
                let newPos = h.pos;
                if (whence === 0) newPos = offset;
                else if (whence === 1) newPos += offset;
                else if (whence === 2) newPos = h.data.length + offset;
                
                if (newPos < 0) newPos = 0;
                h.pos = newPos;
                return h.pos; // Return current position
            }
            case SystemOp.ftell: {
                const h = vm.vfs.getHandle(vm.pop());
                return h ? h.pos : -1;
            }
            case SystemOp.feof: {
                const h = vm.vfs.getHandle(vm.pop());
                return h ? (h.pos >= h.data.length ? -1 : 0) : -1;
            }
            case SystemOp.rewind: {
                const h = vm.vfs.getHandle(vm.pop());
                if (h) h.pos = 0;
                return null;
            }
            case SystemOp.getc: {
                const h = vm.vfs.getHandle(vm.pop());
                return (h && h.pos < h.data.length) ? h.data[h.pos++] : -1;
            }
            case SystemOp.putc: {
                const fp = vm.pop(), char = vm.pop();
                const h = vm.vfs.getHandle(fp);
                if (h) {
                    vm.vfs.writeHandleData(fp, new Uint8Array([char]), h.pos);
                    return char;
                }
                return -1;
            }
            case SystemOp.MakeDir: {
                const path = vm.getStringBytes(vm.pop());
                if (path) {
                    const dec = new TextDecoder('gbk');
                    return vm.vfs.mkdir(dec.decode(path)) ? -1 : 0;
                }
                return 0;
            }
            case SystemOp.ChDir: {
                const path = vm.getStringBytes(vm.pop());
                if (path) {
                    const dec = new TextDecoder('gbk');
                    return vm.vfs.chdir(dec.decode(path)) ? -1 : 0;
                }
                return 0;
            }
            case SystemOp.FileList: {
                // Peek ptr, don't pop until done
                const ptr = vm.resolveAddress(vm.stk[vm.sp - 1]);

                // Initialize state if first call
                if (!this.fileListState) {
                    const entries = vm.vfs.getFiles();
                    const currentDir = vm.vfs.cwd.endsWith('/') ? vm.vfs.cwd : vm.vfs.cwd + '/';
                    const localFiles = entries
                        .filter(e => e.path.startsWith(currentDir) && !e.path.slice(currentDir.length).includes('/'))
                        .map(e => e.path.slice(currentDir.length));

                    if (localFiles.length === 0) {
                        vm.pop(); // Consume argument
                        return 0;
                    }

                    this.fileListState = {
                        files: localFiles,
                        fpos: 0,
                        fnum_i: 0,
                        ptr: ptr
                    };
                }

                const s = this.fileListState;
                const fnum = s.files.length;

                // 1. Render UI
                vm.graphics.clearGraphBuffer();
                const fnum_show = Math.min(fnum - s.fnum_i, 5);
                for (let i = 0; i < fnum_show; i++) {
                    const filename = s.files[s.fnum_i + i];
                    const bytes = iconv.encode(filename, 'gbk');
                    // Mode 0x81: Big Font (16px), GBUF, Copy
                    vm.graphics.TextOut(0, i * 16, bytes, 0x81);
                }
                // Highlight block: Mode 2 is XOR in Block
                vm.graphics.Block(0, s.fpos * 16, 159, s.fpos * 16 + 15, 2);
                vm.graphics.flushScreen();

                // 2. Handle Input
                if (vm.keyBuffer.length === 0) {
                    return undefined; // Yield and wait for key
                }

                const key = vm.keyBuffer.shift()!;
                // Standard GVM keys
                const KEY_UP = 20, KEY_DOWN = 21, KEY_LEFT = 23, KEY_RIGHT = 22;
                const KEY_ENTER = 13, KEY_ESC = 27;

                switch (key) {
                    case KEY_UP:
                        if (s.fpos > 0) s.fpos--;
                        else if (s.fnum_i > 0) s.fnum_i--;
                        break;
                    case KEY_DOWN:
                        if (s.fnum_i + s.fpos < fnum - 1) {
                            if (s.fpos < 4) s.fpos++;
                            else s.fnum_i++;
                        }
                        break;
                    case KEY_LEFT:
                        if (s.fnum_i > 5) {
                            s.fnum_i -= 5;
                        } else {
                            s.fnum_i = 0;
                            s.fpos = 0;
                        }
                        break;
                    case KEY_RIGHT:
                        if (s.fnum_i + s.fpos + 5 < fnum) {
                            s.fnum_i += 5;
                        } else if (s.fnum_i + 5 < fnum) {
                            s.fnum_i += 5;
                            s.fpos = fnum - s.fnum_i - 1;
                        }
                        break;
                    case KEY_ENTER: {
                        const selected = s.files[s.fnum_i + s.fpos];
                        const bytes = iconv.encode(selected, 'gbk');
                        vm.memory.set(bytes, s.ptr);
                        vm.memory[s.ptr + bytes.length] = 0;
                        this.fileListState = null;
                        vm.pop(); // Consume argument
                        return 1;
                    }
                    case KEY_ESC:
                        this.fileListState = null;
                        vm.pop(); // Consume argument
                        return 0;
                }

                // If not returned, re-execute for next key/redraw
                return undefined;
            }

            case SystemOp.opendir: {
                const path = vm.getStringBytes(vm.pop());
                if (path) {
                    const dec = new TextDecoder('gbk');
                    return vm.vfs.opendir(dec.decode(path));
                }
                return 0;
            }
            // readdir is 0xD3, shared with System
            case SystemOp.closedir: {
                vm.vfs.closedir(vm.pop());
                return 0;
            }

            case SystemOp.Getms: return this.getMilliseconds256();
            case SystemOp.CheckKey: {
                const keyToCheck = vm.pop(); // Consume key argument
                if (keyToCheck < 128) {
                    return vm.heldKeys[keyToCheck & 0xFF] ? LTRUE : LFALSE;
                }
                return this.getHeldKey() || LFALSE;
            }
            case SystemOp.memmove: {
                const count = vm.pop(), src = vm.resolveAddress(vm.pop()), dest = vm.resolveAddress(vm.pop());
                vm.memory.copyWithin(dest, src, src + count);
                return null;
            }
            case SystemOp.Crc16: {
                const count = vm.pop(), addr = vm.resolveAddress(vm.pop());
                let crc = 0xFFFF;
                for (let i = 0; i < count; i++) {
                    crc ^= vm.memory[addr + i];
                    for (let j = 0; j < 8; j++) {
                        if (crc & 1) crc = (crc >>> 1) ^ 0xA001;
                        else crc >>>= 1;
                    }
                }
                return crc & 0xFFFF;
            }
            case SystemOp.GetTime: {
                const addr = vm.resolveAddress(vm.pop());
                const now = new Date();
                const view = new DataView(vm.memory.buffer);
                view.setUint16(addr, now.getFullYear(), true);
                view.setUint8(addr + 2, (now.getMonth() + 1) & 0xFF);
                view.setUint8(addr + 3, now.getDate() & 0xFF);
                view.setUint8(addr + 4, now.getHours() & 0xFF);
                view.setUint8(addr + 5, now.getMinutes() & 0xFF);
                view.setUint8(addr + 6, now.getSeconds() & 0xFF);
                view.setUint8(addr + 7, now.getDay() & 0xFF);
                return null;
            }
            case SystemOp.SetTime: {
                vm.pop(); // Not supported in mock environment
                return null;
            }
            case SystemOp.GetWord: {
                vm.pop(); // mode argument is ignored by the official C VM path
                if (vm.keyBuffer.length === 0) return undefined;
                return vm.keyBuffer.shift()!;
            }
            case SystemOp.Sin: return this.sin1024(vm.pop());
            case SystemOp.Cos: return this.sin1024((vm.pop() + 90) | 0);
            case SystemOp.PutKey: {
                vm.keyBuffer.push(vm.pop());
                return 0;
            }
            case SystemOp.Secret: {
                const str = vm.pop(), len = vm.pop(), addr = vm.resolveAddress(vm.pop());
                // XOR encryption/decryption using key string
                const keyBytes = vm.getStringBytes(str);
                if (keyBytes && keyBytes.length > 0) {
                    for (let i = 0; i < len; i++) {
                        vm.memory[addr + i] ^= keyBytes[i % keyBytes.length];
                    }
                }
                return null;
            }
            case SystemOp.DeleteFile: {
                const path = vm.getStringBytes(vm.pop());
                if (path) {
                    const dec = new TextDecoder('gbk');
                    vm.vfs.deleteFile(dec.decode(path));
                    return -1; // success
                }
                return 0; // failure
            }
            case SystemOp.FindWord: {
                // Dictionary reverse lookup - not applicable in browser IDE context
                vm.pop(); vm.pop(); vm.pop();
                return 1; // not found
            }
            case SystemOp.PlayInit:
            case SystemOp.PlayStops:
            case SystemOp.PlaySleep:
                // Audio not supported in browser, silently ignore
                // PlayInit takes 1 arg, return success (0)
                if (op === SystemOp.PlayInit) { vm.pop(); return 0; }
                return null;
            case SystemOp.PlayFile: {
                // Audio not supported, consume all 4 args
                vm.pop(); vm.pop(); vm.pop(); vm.pop();
                return 255; // failure = 255 per spec
            }
            case SystemOp.PlayWordVoice: {
                // Dictionary word voice - not supported
                vm.pop(); vm.pop(); vm.pop();
                return null;
            }
            case SystemOp.SetVolume:
                vm.pop();
                return null;
            case SystemOp.ReleaseKey: {
                const key = vm.pop();
                if (key < 128) {
                    vm.heldKeys[key & 0xFF] = 0;
                    if (vm.currentKeyDown === key) {
                        vm.currentKeyDown = this.getHeldKey();
                    }
                    for (let i = vm.keyBuffer.length - 1; i >= 0; i--) {
                        if (vm.keyBuffer[i] === key) {
                            vm.keyBuffer.splice(i, 1);
                        }
                    }
                } else {
                    vm.heldKeys.fill(0);
                    vm.currentKeyDown = 0;
                    vm.keyBuffer.length = 0;
                }
                return null;
            }
            case SystemOp.open_key:
            case SystemOp.close_key:
                // Keyboard lock/unlock - no-op in browser
                return null;
            case SystemOp.open_uart:
                // UART open - not supported in browser
                vm.pop();
                return null;
            case SystemOp.close_uart:
                // UART close
                return null;
            case SystemOp.read_uart:
                // UART read - return >0xFF to indicate no data
                return 0x100;
            case SystemOp.write_uart:
                // UART write - silently discard
                vm.pop();
                return null;
            case SystemOp.sysexecset: {
                // Call assembly program by path - not supported
                vm.pop(); vm.pop(); vm.pop();
                return null;
            }
            case SystemOp.Refresh2: {
                // Refresh top half of screen (160x80) - same as full refresh for us
                const gbuf = (vm.graphics.graphMode === 1) ? GBUF_OFFSET : GBUF_OFFSET_LVM;
                const size = (vm.graphics.graphMode === 8) ? 12800 : (vm.graphics.graphMode === 4 ? 6400 : 1600);
                vm.memory.copyWithin(VRAM_OFFSET, gbuf, gbuf + size);
                vm.graphics.flushScreen();
                return null;
            }

            case SystemOp.System: { // 0xD3
                const sub = vm.pop();
                if (sub > 0 && sub < 100) { // readdir handle range
                    const name = vm.vfs.readdir(sub);
                    if (name) {
                        const bytes = iconv.encode(name, 'gbk');
                        const addr = 0x7500; // Use a dedicated area for readdir results
                        vm.memory.set(bytes, addr);
                        vm.memory[addr + bytes.length] = 0;
                        return addr;
                    }
                    // readdir returned null (end of directory or invalid handle).
                    // Always return NULL here; never fall through to SystemCore, because
                    // the ambiguity between a spent dir handle and a sub-opcode is
                    // unresolvable and leads to incorrect SystemCore dispatches.
                    return 0;
                }

                if (vm.debug) vm.onLog(`System Core Dispatch: 0x${sub.toString(16)}`);
                switch (sub) {
                    case SystemCoreOp.GetPID: return 100;
                    case SystemCoreOp.GetBrightness: return 100;
                    case SystemCoreOp.GetVersion: return 0x0300; // V3.0
                    case SystemCoreOp.Idle: return;
                }
                return 0;
            }

            case SystemOp.Math: { // 0xD4
                const sub = vm.pop();
                // Sub-opcodes 0x02 - 0x11 are MathFrameworkOp
                if (sub >= 0x02 && sub <= 0x11) {
                    switch (sub) {
                        case MathFrameworkOp.fadd: return this.floatOp((a, b) => a + b);
                        case MathFrameworkOp.fsub: return this.floatOp((a, b) => a - b);
                        case MathFrameworkOp.fmul: return this.floatOp((a, b) => a * b);
                        case MathFrameworkOp.fdiv: return this.floatOp((a, b) => a / b);
                        case MathFrameworkOp.sqrt: return this.floatUnary(Math.sqrt);
                        case MathFrameworkOp.f2i: return (vm.popFloat() | 0);
                        case MathFrameworkOp.sin: return this.floatUnary(Math.sin);
                        case MathFrameworkOp.cos: return this.floatUnary(Math.cos);
                        case MathFrameworkOp.tan: return this.floatUnary(Math.tan);
                        case MathFrameworkOp.asin: return this.floatUnary(Math.asin);
                        case MathFrameworkOp.acos: return this.floatUnary(Math.acos);
                        case MathFrameworkOp.atan: return this.floatUnary(Math.atan);
                        case MathFrameworkOp.exp: return this.floatUnary(Math.exp);
                        case MathFrameworkOp.log: return this.floatUnary(Math.log);
                        case MathFrameworkOp.str2f: {
                            const s = vm.getStringBytes(vm.pop());
                            const text = s ? new TextDecoder('gbk').decode(s) : "0";
                            const f = parseFloat(text);
                            const b = new ArrayBuffer(4);
                            new Float32Array(b)[0] = f;
                            return new Int32Array(b)[0];
                        }
                        case MathFrameworkOp.f2str: {
                            const f = vm.popFloat();
                            const addr = vm.resolveAddress(vm.pop());
                            const str = f.toFixed(6);
                            const bytes = iconv.encode(str, 'gbk');
                            vm.memory.set(bytes, addr);
                            vm.memory[addr + bytes.length] = 0;
                            return addr;
                        }
                    }
                } else {
                    // Assume rewinddir(h) where sub is handle
                    vm.vfs.rewinddir(sub);
                    return null;
                }
                return 0; // Return 0 for unknown sub-ops instead of undefined to avoid yield
            }
            default:
                vm.onLog(`[VM Warning] Unhandled Syscall 0x${op.toString(16)}`);
                // Do NOT push a return value so the stack is not polluted.
                return null;
        }
    }

    private floatOp(fn: (a: number, b: number) => number): number {
        const b = this.vm.popFloat(), a = this.vm.popFloat();
        const buf = new ArrayBuffer(4);
        new Float32Array(buf)[0] = fn(a, b);
        return new Int32Array(buf)[0];
    }

    private floatUnary(fn: (v: number) => number): number {
        const v = this.vm.popFloat();
        const buf = new ArrayBuffer(4);
        new Float32Array(buf)[0] = fn(v);
        return new Int32Array(buf)[0];
    }

    private formatVariadicString(formatBytes: Uint8Array, count: number, startIdx: number): string {
        const format = new TextDecoder('gbk').decode(formatBytes);
        let result = "";
        let argIdx = 0;
        const fBuf = new ArrayBuffer(4);
        const fView = new Float32Array(fBuf);
        const iView = new Int32Array(fBuf);

        let i = 0;
        while (i < format.length) {
            if (format[i] !== '%') {
                result += format[i++];
                continue;
            }
            i++; // consume '%'
            if (i >= format.length) break;
            if (format[i] === '%') { result += '%'; i++; continue; }

            // Parse flags: -, +, 0, space, #
            let flagLeft = false, flagPlus = false, flagZero = false, flagSpace = false;
            while (i < format.length) {
                const f = format[i];
                if (f === '-') { flagLeft = true; i++; }
                else if (f === '+') { flagPlus = true; i++; }
                else if (f === '0') { flagZero = true; i++; }
                else if (f === ' ') { flagSpace = true; i++; }
                else if (f === '#') { i++; } // ignore '#' flag
                else break;
            }

            // Parse width (may be '*' for arg)
            let width = 0;
            if (i < format.length && format[i] === '*') {
                width = this.vm.stk[startIdx + argIdx++] | 0;
                if (width < 0) { flagLeft = true; width = -width; }
                i++;
            } else {
                while (i < format.length && format[i] >= '0' && format[i] <= '9') {
                    width = width * 10 + (format[i].charCodeAt(0) - 48);
                    i++;
                }
            }

            // Parse precision (may be '*' for arg)
            let precision = -1;
            if (i < format.length && format[i] === '.') {
                i++;
                if (i < format.length && format[i] === '*') {
                    precision = this.vm.stk[startIdx + argIdx++] | 0;
                    if (precision < 0) precision = 0;
                    i++;
                } else {
                    precision = 0;
                    while (i < format.length && format[i] >= '0' && format[i] <= '9') {
                        precision = precision * 10 + (format[i].charCodeAt(0) - 48);
                        i++;
                    }
                }
            }

            // Skip length modifiers: l, h, ll, etc.
            while (i < format.length && (format[i] === 'l' || format[i] === 'h' || format[i] === 'L')) i++;

            if (i >= format.length) break;
            const spec = format[i++];

            const val = this.vm.stk[startIdx + argIdx++];
            let formatted = "";

            switch (spec) {
                case 'c':
                    formatted = String.fromCharCode(val & 0xFF);
                    break;
                case 'd':
                case 'i': {
                    const n = val | 0;
                    let s = Math.abs(n).toString();
                    if (precision >= 0) s = s.padStart(precision, '0');
                    const sign = n < 0 ? '-' : (flagPlus ? '+' : (flagSpace ? ' ' : ''));
                    formatted = sign + s;
                    break;
                }
                case 'u': {
                    let s = (val >>> 0).toString();
                    if (precision >= 0) s = s.padStart(precision, '0');
                    formatted = s;
                    break;
                }
                case 'o': {
                    let s = (val >>> 0).toString(8);
                    if (precision >= 0) s = s.padStart(precision, '0');
                    formatted = s;
                    break;
                }
                case 'x': {
                    let s = (val >>> 0).toString(16);
                    if (precision >= 0) s = s.padStart(precision, '0');
                    formatted = s;
                    break;
                }
                case 'X': {
                    let s = (val >>> 0).toString(16).toUpperCase();
                    if (precision >= 0) s = s.padStart(precision, '0');
                    formatted = s;
                    break;
                }
                case 's': {
                    const bytes = this.vm.getStringBytes(val);
                    let s = bytes ? new TextDecoder('gbk').decode(bytes) : '';
                    if (precision >= 0 && s.length > precision) s = s.substring(0, precision);
                    formatted = s;
                    break;
                }
                case 'f': {
                    iView[0] = val;
                    const prec = precision >= 0 ? precision : 6;
                    let s = Math.abs(fView[0]).toFixed(prec);
                    const sign = fView[0] < 0 ? '-' : (flagPlus ? '+' : (flagSpace ? ' ' : ''));
                    formatted = sign + s;
                    break;
                }
                case 'e':
                case 'E': {
                    iView[0] = val;
                    const prec = precision >= 0 ? precision : 6;
                    let s = Math.abs(fView[0]).toExponential(prec);
                    if (spec === 'E') s = s.toUpperCase();
                    const sign = fView[0] < 0 ? '-' : (flagPlus ? '+' : (flagSpace ? ' ' : ''));
                    formatted = sign + s;
                    break;
                }
                case 'g':
                case 'G': {
                    iView[0] = val;
                    const prec = precision >= 0 ? Math.max(1, precision) : 6;
                    let s = parseFloat(Math.abs(fView[0]).toPrecision(prec)).toString();
                    if (spec === 'G') s = s.toUpperCase();
                    const sign = fView[0] < 0 ? '-' : (flagPlus ? '+' : (flagSpace ? ' ' : ''));
                    formatted = sign + s;
                    break;
                }
                default:
                    formatted = '%' + spec;
            }

            // Apply width padding
            if (width > 0 && formatted.length < width) {
                const padChar = (!flagLeft && flagZero && spec !== 's') ? '0' : ' ';
                if (flagLeft) {
                    formatted = formatted.padEnd(width, ' ');
                } else {
                    // For zero-padded numbers, pad after sign
                    if (padChar === '0' && (formatted[0] === '-' || formatted[0] === '+' || formatted[0] === ' ')) {
                        formatted = formatted[0] + formatted.slice(1).padStart(width - 1, '0');
                    } else {
                        formatted = formatted.padStart(width, padChar);
                    }
                }
            }

            result += formatted;
        }
        return result;
    }
}
