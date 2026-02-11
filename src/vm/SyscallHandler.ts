import { SystemOp, MathOp, BUF_OFFSET, TEXT_OFFSET, MEMORY_SIZE } from '../types';

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
    vfs: any;
    graphics: any;
    stk: Int32Array;
    sp: number;
    currentFontSize?: number;
}

/**
 * 优化后的 Syscall 处理器
 * 核心思路：将同步指令与异步指令分离，提升执行效率
 */
export class SyscallHandler {
    constructor(private vm: ILavaXVM) { }

    /**
     * 同步处理入口
     * 返回 number 表示正常返回结果；返回 void 表示无返回值；
     * 返回 undefined 且 op 为阻塞指令时，告知 VM 切换到异步等待逻辑。
     */
    public handleSync(op: number): number | void | undefined {
        const vm = this.vm;
        let result: number | void = 0;

        // 某些指令无法在同步循环中完成，需要返回 undefined 告知 VM 挂起
        if (op === SystemOp.getchar || op === SystemOp.GetWord) {
            if (vm.keyBuffer.length === 0) return undefined; // 触发 VM 异步等待
        }
        if (op === SystemOp.Delay) return undefined; // 触发 VM 异步延迟

        switch (op) {
            case SystemOp.putchar: {
                const c = vm.pop();
                const str = String.fromCharCode(c);
                vm.onLog(str);
                vm.graphics.print(str, 0x41);
                return;
            }

            case SystemOp.printf: {
                const count = vm.pop();
                const startIdx = vm.sp - count;
                const fmtHandle = vm.stk[startIdx];
                const formatBytes = vm.getStringBytes(fmtHandle);
                if (formatBytes) {
                    const str = this.formatVariadicString(formatBytes, count - 1, startIdx + 1);
                    vm.onLog(str);
                    vm.graphics.print(str, 0x41);
                }
                vm.sp -= count;
                return;
            }

            case SystemOp.sprintf: {
                const count = vm.pop();
                const startIdx = vm.sp - count;
                const fmtHandle = vm.stk[startIdx];
                const destAddr = vm.resolveAddress(vm.stk[startIdx - 1]);
                const formatBytes = vm.getStringBytes(fmtHandle);
                if (formatBytes) {
                    const str = this.formatVariadicString(formatBytes, count - 1, startIdx + 1);
                    const bytes = new TextEncoder().encode(str);
                    vm.memory.set(bytes, destAddr);
                    vm.memory[destAddr + bytes.length] = 0;
                }
                vm.sp -= (count + 1);
                return destAddr;
            }

            case SystemOp.strcpy: {
                const srcAddr = vm.pop();
                const destAddr = vm.resolveAddress(vm.pop());
                const bytes = vm.getStringBytes(srcAddr);
                if (bytes) {
                    vm.memory.set(bytes, destAddr);
                    vm.memory[destAddr + bytes.length] = 0;
                }
                return destAddr;
            }

            case SystemOp.strlen: {
                const bytes = vm.getStringBytes(vm.pop());
                return bytes ? bytes.length : 0;
            }

            case SystemOp.SetScreen: {
                const mode = vm.pop();
                vm.graphics.currentFontSize = (mode === 0) ? 16 : 12;
                vm.memory.fill(0, BUF_OFFSET, BUF_OFFSET + 1600);
                vm.graphics.clearBuffer();
                vm.graphics.flushScreen();
                return;
            }

            case SystemOp.UpdateLCD:
                vm.pop();
                vm.memory.copyWithin(0, BUF_OFFSET, BUF_OFFSET + 1600);
                vm.graphics.flushScreen();
                return;

            case SystemOp.WriteBlock: {
                const addr = vm.resolveAddress(vm.pop());
                const mode = vm.pop(), h = vm.pop(), w = vm.pop(), y = vm.pop(), x = vm.pop();
                const bytesPerRow = (w + 7) >> 3;
                const copyMode = (mode & 0x07) === 1;

                for (let r = 0; r < h; r++) {
                    const rowOffset = addr + r * bytesPerRow;
                    for (let c = 0; c < w; c++) {
                        const bit = (vm.memory[rowOffset + (c >> 3)] >> (7 - (c & 7))) & 1;
                        if (bit) vm.graphics.setPixel(x + c, y + r, 1, mode);
                        else if (copyMode) vm.graphics.setPixel(x + c, y + r, 0, mode);
                    }
                }
                if (mode & 0x40) vm.graphics.flushScreen();
                return;
            }

            case SystemOp.TextOut: {
                const mode = vm.pop(), strAddr = vm.pop(), y = vm.pop(), x = vm.pop();
                const bytes = vm.getStringBytes(strAddr);
                if (bytes) {
                    vm.graphics.drawText(x, y, bytes, (mode & 0x80) ? 16 : 12, mode);
                    if (mode & 0x40) vm.graphics.flushScreen();
                }
                return;
            }

            case SystemOp.Block:
            case SystemOp.Rectangle: {
                const mode = vm.pop(), y1 = vm.pop(), x1 = vm.pop(), y0 = vm.pop(), x0 = vm.pop();
                if (op === SystemOp.Block) vm.graphics.drawFillBox(x0, y0, x1 - x0 + 1, y1 - y0 + 1, mode);
                else vm.graphics.drawBox(x0, y0, x1 - x0 + 1, y1 - y0 + 1, mode);
                if (mode & 0x40) vm.graphics.flushScreen();
                return;
            }

            case SystemOp.abs: return Math.abs(vm.pop());
            case SystemOp.rand: return (Math.random() * 0x8000) | 0;
            case SystemOp.Inkey: return vm.keyBuffer.length > 0 ? vm.keyBuffer.shift()! : 0;

            case SystemOp.Math: {
                const sub = vm.pop();
                switch (sub) {
                    case MathOp.itof: return vm.pop(); // 保持位模式不变
                    case MathOp.ftoi: return (vm.popFloat() | 0);
                    case MathOp.fadd: return this.floatOp((a, b) => a + b);
                    case MathOp.fsub: return this.floatOp((a, b) => a - b);
                    case MathOp.fmul: return this.floatOp((a, b) => a * b);
                    case MathOp.fdiv: return this.floatOp((a, b) => a / b);
                    case MathOp.sqrt: return this.floatUnary(Math.sqrt);
                    case MathOp.fabs: return this.floatUnary(Math.abs);
                    case MathOp.sin: return this.floatUnary(Math.sin);
                    case MathOp.cos: return this.floatUnary(Math.cos);
                    case MathOp.tan: return this.floatUnary(Math.tan);
                }
                return;
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
                return;
            }

            case SystemOp.memset: {
                const count = vm.pop(), val = vm.pop(), addr = vm.resolveAddress(vm.pop());
                vm.memory.fill(val, addr, addr + count);
                return;
            }

            case SystemOp.memcpy: {
                const count = vm.pop(), src = vm.resolveAddress(vm.pop()), dest = vm.resolveAddress(vm.pop());
                vm.memory.set(vm.memory.subarray(src, src + count), dest);
                return;
            }

            case SystemOp.Exit: vm.running = false; return;

            // 如果是文件系统操作，目前 VFS 大多为同步实现，直接调用
            case SystemOp.fopen: {
                const m = vm.getStringBytes(vm.pop()), p = vm.getStringBytes(vm.pop());
                const dec = new TextDecoder('gbk');
                return vm.vfs.openFile(dec.decode(p!), dec.decode(m!));
            }
            // ... 补全其他 VFS 同步操作
            case SystemOp.fread: {
                const fp = vm.pop(), count = vm.pop(), size = vm.pop(), buf = vm.resolveAddress(vm.pop());
                const h = vm.vfs.getHandle(fp);
                if (!h) return 0;
                const toRead = Math.min(count * size, h.data.length - h.pos);
                if (toRead > 0) {
                    vm.memory.set(h.data.subarray(h.pos, h.pos + toRead), buf);
                    h.pos += toRead;
                }
                return (toRead / size) | 0;
            }

            default:
                // 对于未优化的指令，回退到原始逻辑或警告
                return this.handleFallback(op);
        }
    }

    /**
     * 辅助方法：处理 32 位浮点运算并返回整数位模式
     */
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

    /**
     * 格式化字符串优化：减少对象创建
     */
    private formatVariadicString(formatBytes: Uint8Array, count: number, startIdx: number): string {
        const format = new TextDecoder('gbk').decode(formatBytes);
        let result = "";
        let argIdx = 0;
        const fBuf = new ArrayBuffer(4);
        const fView = new Float32Array(fBuf);
        const iView = new Int32Array(fBuf);

        for (let i = 0; i < format.length; i++) {
            if (format[i] === '%' && i + 1 < format.length) {
                const spec = format[++i];
                if (spec === '%') { result += "%"; continue; }
                const val = this.vm.stk[startIdx + argIdx++];
                switch (spec) {
                    case 'c': result += String.fromCharCode(val); break;
                    case 'd': case 'i': result += (val | 0).toString(); break;
                    case 'u': result += (val >>> 0).toString(); break;
                    case 'x': result += (val >>> 0).toString(16); break;
                    case 'X': result += (val >>> 0).toString(16).toUpperCase(); break;
                    case 's': {
                        const s = this.vm.getStringBytes(val);
                        if (s) result += new TextDecoder('gbk').decode(s);
                        break;
                    }
                    case 'f': {
                        iView[0] = val;
                        result += fView[0].toFixed(6);
                        break;
                    }
                    default: result += "%" + spec;
                }
            } else {
                result += format[i];
            }
        }
        return result;
    }

    private handleFallback(op: number): void {
        if (this.vm.debug) this.vm.onLog(`Warn: Syscall 0x${op.toString(16)} using fallback`);
    }
}