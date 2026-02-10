
import { SystemOp, MathOp, BUF_OFFSET, TEXT_OFFSET, MEMORY_SIZE } from '../types';

export interface ILavaXVM {
    pop(): number;
    push(val: number): void;
    popFloat(): number;
    pushFloat(val: number): void;
    resolveAddress(addr: number): number;
    getStringBytes(handle: number): Uint8Array | null;
    onLog(msg: string): void;
    memory: Uint8Array;
    running: boolean;
    debug: boolean;
    keyBuffer: number[];
    startTime: number;
    vfs: any;
    graphics: any;
    stk: Int32Array;
    esp: number;
    currentFontSize?: number;
}

export class SyscallHandler {
    constructor(private vm: ILavaXVM) { }

    public async handle(op: number): Promise<number> {
        let result = 0;
        const vm = this.vm;

        if (vm.debug) {
            vm.onLog(`[SYSCALL] ${SystemOp[op] || '0x' + op.toString(16)} START`);
        }

        switch (op) {
            case SystemOp.putchar: {
                const c = vm.pop();
                const str = String.fromCharCode(c);
                vm.onLog(str);
                vm.graphics.print(str, 0x41); // Default to mode 0x41 (screen + flush)
                break;
            }
            case SystemOp.getchar: {
                vm.graphics.flushScreen();
                console.log("[VM getchar] Waiting for input... Running:", vm.running);
                while (vm.keyBuffer.length === 0 && vm.running) {
                    await new Promise(r => setTimeout(r, 20));
                }
                result = vm.keyBuffer.shift() || 0;
                console.log("[VM getchar] Got:", result);
                break;
            }
            case SystemOp.printf: {
                const count = vm.pop();
                const fmtHandle = vm.stk[vm.esp - count];
                const formatBytes = vm.getStringBytes(fmtHandle);
                if (formatBytes) {
                    const str = this.formatVariadicString(formatBytes, count - 1, vm.esp - count + 1);
                    console.log("[VM Printf]", str);
                    vm.onLog(str);
                    vm.graphics.print(str, 0x41);
                }
                vm.esp -= count;
                break;
            }
            case SystemOp.sprintf: {
                const count = vm.pop();
                const fmtHandle = vm.stk[vm.esp - count];
                const destAddr = vm.resolveAddress(vm.stk[vm.esp - count - 1]);
                const formatBytes = vm.getStringBytes(fmtHandle);
                if (formatBytes) {
                    const str = this.formatVariadicString(formatBytes, count - 1, vm.esp - count + 1);
                    const bytes = new TextEncoder().encode(str);
                    vm.memory.set(bytes, destAddr);
                    vm.memory[destAddr + bytes.length] = 0;
                }
                vm.esp -= (count + 1);
                result = destAddr;
                break;
            }
            case SystemOp.strcpy: {
                const srcAddr = vm.pop();
                const destAddr = vm.resolveAddress(vm.pop());
                const bytes = vm.getStringBytes(srcAddr);
                if (bytes) {
                    vm.memory.set(bytes, destAddr);
                    vm.memory[destAddr + bytes.length] = 0;
                }
                result = destAddr;
                break;
            }
            case SystemOp.strlen: {
                const strHandle = vm.pop();
                const bytes = vm.getStringBytes(strHandle);
                result = bytes ? bytes.length : 0;
                break;
            }
            case SystemOp.SetScreen: {
                const mode = vm.pop();
                // currentFontSize is managed in vm/graphics conceptually
                vm.memory.fill(0, 0, 1600);
                vm.memory.fill(0, BUF_OFFSET, BUF_OFFSET + 1600);
                vm.memory.fill(0, TEXT_OFFSET, TEXT_OFFSET + 160);
                vm.graphics.flushScreen();
                break;
            }
            case SystemOp.UpdateLCD: {
                vm.pop();
                vm.memory.copyWithin(0, BUF_OFFSET, BUF_OFFSET + 1600);
                vm.graphics.flushScreen();
                break;
            }
            case SystemOp.Delay: await new Promise(r => setTimeout(r, vm.pop())); break;
            case SystemOp.WriteBlock: {
                const addr = vm.resolveAddress(vm.pop());
                const mode = vm.pop();
                const h = vm.pop();
                const w = vm.pop();
                const y = vm.pop();
                const x = vm.pop();
                const bytesPerRow = (w + 7) >> 3;
                const copyMode = (mode & 0x07) === 1;

                for (let r = 0; r < h; r++) {
                    for (let c = 0; c < w; c++) {
                        const byte = vm.memory[addr + r * bytesPerRow + (c >> 3)];
                        const bit = (byte >> (7 - (c & 7))) & 1;
                        if (bit) {
                            vm.graphics.setPixel(x + c, y + r, 1, mode);
                        } else if (copyMode) {
                            vm.graphics.setPixel(x + c, y + r, 0, mode);
                        }
                    }
                }
                if (mode & 0x40) vm.graphics.flushScreen();
                break;
            }
            case SystemOp.Refresh: {
                vm.memory.copyWithin(0, BUF_OFFSET, BUF_OFFSET + 1600);
                vm.graphics.flushScreen();
                break;
            }
            case SystemOp.TextOut: {
                const mode = vm.pop();
                const strAddr = vm.pop();
                const y = vm.pop();
                const x = vm.pop();
                const bytes = vm.getStringBytes(strAddr);
                if (bytes) {
                    const size = (mode & 0x80) ? 16 : 12;
                    vm.graphics.drawText(x, y, bytes, size, mode);
                    if (mode & 0x40) vm.graphics.flushScreen();
                }
                break;
            }
            case SystemOp.Block:
            case SystemOp.Rectangle: {
                const mode = vm.pop();
                const y1 = vm.pop();
                const x1 = vm.pop();
                const y0 = vm.pop();
                const x0 = vm.pop();
                const fill = (op === SystemOp.Block);
                if (fill) vm.graphics.drawFillBox(x0, y0, x1 - x0 + 1, y1 - y0 + 1, mode);
                else vm.graphics.drawBox(x0, y0, x1 - x0 + 1, y1 - y0 + 1, mode);
                if (mode & 0x40) vm.graphics.flushScreen();
                break;
            }
            case SystemOp.Exit: vm.pop(); vm.running = false; return 0;
            case SystemOp.ClearScreen: vm.memory.fill(0, BUF_OFFSET, BUF_OFFSET + 1600); break;
            case SystemOp.abs: result = Math.abs(vm.pop()); break;
            case SystemOp.rand: result = (Math.random() * 0x8000) | 0; break;
            case SystemOp.srand: vm.pop(); break;
            case SystemOp.Locate: {
                const y = vm.pop();
                const x = vm.pop();
                vm.graphics.cursorX = x * (vm.graphics.currentFontSize === 16 ? 8 : 6);
                vm.graphics.cursorY = y * (vm.graphics.currentFontSize === 16 ? 16 : 12);
                break;
            }
            case SystemOp.Inkey: result = vm.keyBuffer.length > 0 ? vm.keyBuffer.shift()! : 0; break;
            case SystemOp.Point: {
                const mode = vm.pop();
                const y = vm.pop();
                const x = vm.pop();
                vm.graphics.setPixel(x, y, 1, mode);
                break;
            }
            case SystemOp.GetPoint: {
                const y = vm.pop();
                const x = vm.pop();
                result = vm.graphics.getPixel(x, y);
                break;
            }
            case SystemOp.Line: {
                const mode = vm.pop();
                const y1 = vm.pop();
                const x1 = vm.pop();
                const y0 = vm.pop();
                const x0 = vm.pop();
                vm.graphics.drawLine(x0, y0, x1, y1, mode);
                if (mode & 0x40) vm.graphics.flushScreen();
                break;
            }
            case SystemOp.Box: {
                const mode = vm.pop();
                const fill = vm.pop();
                const y1 = vm.pop();
                const x1 = vm.pop();
                const y0 = vm.pop();
                const x0 = vm.pop();
                if (fill) vm.graphics.drawFillBox(x0, y0, x1 - x0 + 1, y1 - y0 + 1, mode);
                else vm.graphics.drawBox(x0, y0, x1 - x0 + 1, y1 - y0 + 1, mode);
                if (mode & 0x40) vm.graphics.flushScreen();
                break;
            }
            case SystemOp.Circle: {
                const mode = vm.pop();
                const fill = vm.pop();
                const r = vm.pop();
                const y = vm.pop();
                const x = vm.pop();
                if (fill) vm.graphics.drawFillCircle(x, y, r, mode);
                else vm.graphics.drawCircle(x, y, r, mode);
                if (mode & 0x40) vm.graphics.flushScreen();
                break;
            }
            case SystemOp.Ellipse: {
                const mode = vm.pop();
                const fill = vm.pop();
                const ry = vm.pop();
                const rx = vm.pop();
                const y = vm.pop();
                const x = vm.pop();
                vm.graphics.drawEllipse(x, y, rx, ry, !!fill, mode);
                if (mode & 0x40) vm.graphics.flushScreen();
                break;
            }
            case SystemOp.isdigit: result = /\d/.test(String.fromCharCode(vm.pop())) ? 1 : 0; break;
            case SystemOp.isalpha: result = /[a-zA-Z]/.test(String.fromCharCode(vm.pop())) ? 1 : 0; break;
            case SystemOp.isalnum: result = /[a-zA-Z0-9]/.test(String.fromCharCode(vm.pop())) ? 1 : 0; break;
            case SystemOp.tolower: result = String.fromCharCode(vm.pop()).toLowerCase().charCodeAt(0); break;
            case SystemOp.toupper: result = String.fromCharCode(vm.pop()).toUpperCase().charCodeAt(0); break;
            case SystemOp.strcat: {
                const srcAddr = vm.pop();
                const destAddr = vm.resolveAddress(vm.pop());
                const src = vm.getStringBytes(srcAddr);
                const dest = vm.getStringBytes(destAddr);
                if (src && dest) {
                    vm.memory.set(src, destAddr + dest.length);
                    vm.memory[destAddr + dest.length + src.length] = 0;
                }
                result = destAddr;
                break;
            }
            case SystemOp.strcmp: {
                const s2Addr = vm.pop();
                const s1Addr = vm.pop();
                const s1 = vm.getStringBytes(s1Addr) || new Uint8Array(0);
                const s2 = vm.getStringBytes(s2Addr) || new Uint8Array(0);
                const len = Math.max(s1.length, s2.length);
                for (let i = 0; i < len; i++) {
                    if (s1[i] !== s2[i]) { result = s1[i] - s2[i]; break; }
                }
                break;
            }
            case SystemOp.memset: {
                const count = vm.pop();
                const val = vm.pop();
                const addr = vm.resolveAddress(vm.pop());
                vm.memory.fill(val, addr, addr + count);
                break;
            }
            case SystemOp.memcpy: {
                const count = vm.pop();
                const src = vm.resolveAddress(vm.pop());
                const dest = vm.resolveAddress(vm.pop());
                vm.memory.set(vm.memory.slice(src, src + count), dest);
                break;
            }
            case SystemOp.fopen: {
                const modeAddr = vm.pop();
                const pathAddr = vm.pop();
                const pathBytes = vm.getStringBytes(pathAddr);
                const modeBytes = vm.getStringBytes(modeAddr);
                const path = new TextDecoder('gbk').decode(pathBytes!);
                const mode = new TextDecoder('gbk').decode(modeBytes!);
                result = vm.vfs.openFile(path, mode);
                break;
            }
            case SystemOp.fclose: vm.vfs.closeFile(vm.pop()); break;
            case SystemOp.fread: {
                const fp = vm.pop();
                const count = vm.pop();
                const bufAddr = vm.resolveAddress(vm.pop());
                const h = vm.vfs.getHandle(fp);
                if (!h) { result = 0; break; }
                const toRead = Math.min(count, h.data.length - h.pos);
                if (toRead > 0) {
                    vm.memory.set(h.data.slice(h.pos, h.pos + toRead), bufAddr);
                    h.pos += toRead;
                }
                result = toRead;
                break;
            }
            case SystemOp.fwrite: {
                const fp = vm.pop();
                const count = vm.pop();
                const bufAddr = vm.resolveAddress(vm.pop());
                const data = vm.memory.slice(bufAddr, bufAddr + count);
                const h = vm.vfs.getHandle(fp);
                if (h) {
                    vm.vfs.writeHandleData(fp, data, h.pos);
                    result = count;
                } else {
                    result = 0;
                }
                break;
            }
            case SystemOp.fseek: {
                const origin = vm.pop() & 3;
                const offset = vm.pop();
                const fp = vm.pop();
                const h = vm.vfs.getHandle(fp);
                if (!h) { result = -1; break; }
                if (origin === 0) h.pos = offset;
                else if (origin === 1) h.pos += offset;
                else if (origin === 2) h.pos = h.data.length + offset;
                result = 0;
                break;
            }
            case SystemOp.ftell: result = vm.vfs.getHandle(vm.pop())?.pos ?? -1; break;
            case SystemOp.feof: { const h = vm.vfs.getHandle(vm.pop()); result = h ? (h.pos >= h.data.length ? 1 : 0) : 0; break; }
            case SystemOp.Getms: result = (Date.now() & 0x7FFFFFFF); break;
            case SystemOp.CheckKey: {
                const key = vm.pop();
                result = vm.keyBuffer.includes(key === 0 ? vm.keyBuffer[0] : key) ? 1 : 0;
                break;
            }
            case SystemOp.memmove: {
                const count = vm.pop();
                const src = vm.resolveAddress(vm.pop());
                const dest = vm.resolveAddress(vm.pop());
                vm.memory.set(vm.memory.slice(src, src + count), dest);
                break;
            }
            case SystemOp.Sin: result = Math.floor(Math.sin((vm.pop() % 360) * Math.PI / 180) * 256); break;
            case SystemOp.Cos: result = Math.floor(Math.cos((vm.pop() % 360) * Math.PI / 180) * 256); break;
            case SystemOp.System: {
                const sub = vm.pop();
                if (sub === 0x1f) result = (Date.now() - vm.startTime) | 0;
                break;
            }
            case SystemOp.Math: {
                const sub = vm.pop();
                switch (sub) {
                    case MathOp.itof: vm.pushFloat(vm.pop()); return 0;
                    case MathOp.ftoi: result = (vm.popFloat() | 0); break;
                    case MathOp.fadd: vm.pushFloat(vm.popFloat() + vm.popFloat()); return 0;
                    case MathOp.fsub: { const b = vm.popFloat(); const a = vm.popFloat(); vm.pushFloat(a - b); return 0; }
                    case MathOp.fmul: vm.pushFloat(vm.popFloat() * vm.popFloat()); return 0;
                    case MathOp.fdiv: { const b = vm.popFloat(); const a = vm.popFloat(); vm.pushFloat(a / b); return 0; }
                    case MathOp.sin: vm.pushFloat(Math.sin(vm.popFloat())); return 0;
                    case MathOp.cos: vm.pushFloat(Math.cos(vm.popFloat())); return 0;
                    case MathOp.tan: vm.pushFloat(Math.tan(vm.popFloat())); return 0;
                    case MathOp.sqrt: vm.pushFloat(Math.sqrt(vm.popFloat())); return 0;
                    case MathOp.fabs: vm.pushFloat(Math.abs(vm.popFloat())); return 0;
                    default: break;
                }
                break;
            }
            case SystemOp.GetTime: {
                const addr = vm.resolveAddress(vm.pop());
                const now = new Date();
                const view = new DataView(vm.memory.buffer);
                view.setInt16(addr, now.getFullYear(), true);
                view.setUint8(addr + 2, now.getMonth() + 1);
                view.setUint8(addr + 3, now.getDate());
                view.setUint8(addr + 4, now.getHours());
                view.setUint8(addr + 5, now.getMinutes());
                view.setUint8(addr + 6, now.getSeconds());
                view.setUint8(addr + 7, now.getDay());
                break;
            }
            case SystemOp.SetBgColor:
            case SystemOp.SetFgColor:
                vm.pop();
                result = 0;
                break;
            default:
                vm.onLog(`VM Warning: Unimplemented syscall 0x${op.toString(16)} `);
                break;
        }

        if (vm.debug) {
            vm.onLog(`[SYSCALL] END -> Result: ${result}`);
        }
        return result;
    }

    private formatVariadicString(formatBytes: Uint8Array, count: number, startIdx: number): string {
        const format = new TextDecoder('gbk').decode(formatBytes);
        console.log("[VM FmtString]", format, "ArgsCount:", count);
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
                    const val = this.vm.stk[startIdx + argIdx++];
                    if (spec === 'c') {
                        result += String.fromCharCode(val);
                    } else if (spec === 'd') {
                        result += val.toString();
                    } else if (spec === 'f') {
                        const buffer = new ArrayBuffer(4);
                        new Int32Array(buffer)[0] = val;
                        result += new Float32Array(buffer)[0].toFixed(6);
                    } else if (spec === 's') {
                        const bytes = this.vm.getStringBytes(val);
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
}
