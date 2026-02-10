/**
 * LavaVM.ts
 * 基于 lvm.c 的 1:1 完整移植 (Hex Opcode Edition)
 * 目标环境: Browser / Node.js
 */

// --- 1. 外部系统接口定义 (必须由宿主实现) ---
export interface LavaSystem {
    // Console I/O
    putchar(c: number): void;
    getchar(): number; // 阻塞式字符输入 (建议宿主通过 async/await 或缓冲区实现)

    // Graphics (0x85 - 0x99, 0xC5 etc)
    setScreen(mode: number): void;
    updateLCD(buffer: Uint8Array): void; // buffer 是 RAM 中的一部分
    writeBlock(x: number, y: number, w: number, h: number, type: number, data: Uint8Array): void;
    textOut(x: number, y: number, text: string, mode: number): void;
    block(x1: number, y1: number, x2: number, y2: number, mode: number): void;
    rectangle(x1: number, y1: number, x2: number, y2: number, mode: number): void;
    clearScreen(): void;
    refresh(): void;
    locate(x: number, y: number): void;
    point(x: number, y: number, mode: number): void;
    getPoint(x: number, y: number): number;
    line(x1: number, y1: number, x2: number, y2: number, mode: number): void;
    box(x1: number, y1: number, x2: number, y2: number, mode: number, fill: number): void;
    circle(x: number, y: number, r: number, mode: number,type: number): void;
    ellipse(x: number, y: number, a: number, b: number, mode: number, fill: number): void;
    xDraw(mode: number): void;
    getBlock(x: number, y: number, w: number, h: number, mode: number, dataPtr: number, ram: Uint8Array): void;
    fillArea(x: number, y: number, mode: number): void; // 0xCA

    // File System (0xAE - 0xB7, 0xB9, 0xBA, 0xC0, 0xC1)
    fopen(filename: string, mode: string): number;
    fclose(fp: number): void;
    fread(bufferPtr: number, size: number, count: number, fp: number, ram: Uint8Array): number;
    fwrite(bufferPtr: number, size: number, count: number, fp: number, ram: Uint8Array): number;
    fseek(fp: number, offset: number, origin: number): number;
    ftell(fp: number): number;
    feof(fp: number): number;
    rewind(fp: number): void;
    getc(fp: number): number;
    putc(ch: number, fp: number): number;
    makeDir(path: string): number;
    deleteFile(path: string): number;
    chDir(path: string): number;
    fileList(pattern: string): number;

    // System / Misc
    delay(ms: number): void;
    getMs(): number;
    checkKey(key: number): number;
    crc16(dataPtr: number, len: number, ram: Uint8Array): number;
    secret(bufPtr: number, len: number, ram: Uint8Array): void;
    getTime(timePtr: number, ram: Uint8Array): void;
    setTime(timePtr: number, ram: Uint8Array): void;
    releaseKey(key: number): void;
    inkey(): number;
    rand(): number;
    srand(seed: number): void;
    beep(): void;
    
    // Math
    sin(v: number): number;
    cos(v: number): number;
}

// --- 2. 虚拟机常量定义 ---
const LVM_STACK_SIZE = 0x500;
const LVM_DAT_SIZE   = 0x8000;
const LVM_STRBUF_START = 0x7000;
const LVM_STRBUF_END   = 0x74FF;
const LVM_GRAPH_BUF    = 0x8000;

export class LavaVM {
    // 寄存器与内存
    private pc: number = 0;              // lvm_pi
    private sp: number = 0;              // lvm_stk_p
    private base: number = 0;            // lvm_dat_pb
    private base2: number = 0;           // lvm_dat_pb2
    private strBufPtr: number = LVM_STRBUF_START; 

    // 内存区域
    private rom: Uint8Array;             // 模拟 .lav 文件内容
    private romView: DataView;
    private romSize: number = 0;

    public ram: Uint8Array;              // lvm_dat
    private ramView: DataView;

    private stack: Int32Array;           // lvm_stk
    private regBuf: Int32Array;          // lvm_buf

    // 状态
    public isHalted: boolean = true;
    private sys: LavaSystem;

    constructor(system: LavaSystem) {
        this.sys = system;
        this.ram = new Uint8Array(0x10000); 
        this.ramView = new DataView(this.ram.buffer);
        this.stack = new Int32Array(LVM_STACK_SIZE);
        this.regBuf = new Int32Array(32);
        
        this.rom = new Uint8Array(0);
        this.romView = new DataView(this.rom.buffer);
    }

    // --- 辅助函数 ---

    public load(buffer: ArrayBuffer): boolean {
        this.rom = new Uint8Array(buffer);
        this.romView = new DataView(buffer);
        this.romSize = buffer.byteLength;
        
        // Check "LAV" header
        if (this.readRom8(0) === 0x4C && this.readRom8(1) === 0x41 && this.readRom8(2) === 0x56) {
             this.reset();
             this.pc = 0x10;
             this.isHalted = false;
             return true;
        }
        return false;
    }

    public reset() {
        this.pc = 0;
        this.sp = 0;
        this.base = 0;
        this.base2 = 0;
        this.strBufPtr = LVM_STRBUF_START;
        this.ram.fill(0);
        this.stack.fill(0);
        this.regBuf.fill(0);
    }

    private readNext8(): number {
        if (this.pc >= this.romSize) return 0xFF;
        return this.rom[this.pc++];
    }

    private readNext16(): number {
        if (this.pc + 1 >= this.romSize) return 0;
        const val = this.romView.getUint16(this.pc, true);
        this.pc += 2;
        return val;
    }

    private readNext32(): number {
        if (this.pc + 3 >= this.romSize) return 0;
        const val = this.romView.getUint32(this.pc, true);
        this.pc += 4;
        return val;
    }

    private readNextBytes(n: number): number {
        let val = 0;
        for (let i = 0; i < n; i++) {
            val |= (this.readNext8() << (i * 8));
        }
        return val;
    }

    private readToRam(destAddr: number, len: number) {
        for (let i = 0; i < len; i++) {
            if (this.pc < this.romSize) {
                this.ram[destAddr + i] = this.rom[this.pc++];
            }
        }
    }

    private readRom8(addr: number): number {
        if (addr >= this.romSize) return 0;
        return this.rom[addr];
    }

    private stkPush(n: number) {
        const m = n;
        while ((--n) >= 0) {
            this.stack[this.sp + n] = this.regBuf[n];
        }
        this.sp += m;
    }

    private stkPop(n: number) {
        this.sp -= n;
        let cnt = n;
        while ((--cnt) >= 0) {
            this.regBuf[cnt] = this.stack[this.sp + cnt];
        }
    }

    private push(val: number) {
        this.stack[this.sp++] = val | 0;
    }

    private pop(): number {
        return this.stack[--this.sp];
    }

    private getAbsAddr(lp: number): number {
        if (lp & 0x800000) {
            lp = (lp + this.base) & 0xFFFF;
        }
        return lp & 0xFFFF;
    }

    private setValue(lp: number, n: number) {
        let m = 0;
        switch (lp & 0x70000) {
            case 0x10000: m = 1; break;
            case 0x20000: m = 2; break;
            case 0x40000: m = 4; break;
            default: return;
        }
        const addr = this.getAbsAddr(lp);
        
        if (m === 1) {
            this.ram[addr] = n & 0xFF;
        } else if (m === 2) {
            this.ramView.setInt16(addr, n, true);
        } else if (m === 4) {
            this.ramView.setInt32(addr, n, true);
        }
    }

    private readString(addr: number): string {
        let str = "";
        let i = addr;
        while (i < this.ram.length && this.ram[i] !== 0) {
            str += String.fromCharCode(this.ram[i]);
            i++;
        }
        return str;
    }

    private itoa(value: number): string {
        return value.toString(10);
    }

    private vmPrintf(fmtAddr: number, stkStart: number) {
        let dataPtr = fmtAddr;
        let stkIdx = stkStart;
        
        while (this.ram[dataPtr] !== 0) {
            let ch = this.ram[dataPtr];
            if (ch === 0x5C) { // '\'
                dataPtr++;
                ch = this.ram[dataPtr];
                if (ch === 0x72) { // 'r'
                    this.sys.putchar(0x0D);
                } else if (ch === 0x6E) { // 'n'
                    this.sys.putchar(0x0A);
                }
                dataPtr++;
            } else if (ch === 0x25) { // '%'
                dataPtr++;
                ch = this.ram[dataPtr];
                if (ch === 0x73) { // 's'
                    const sAddr = this.stack[stkIdx++];
                    const s = this.readString(sAddr);
                    for (let k = 0; k < s.length; k++) this.sys.putchar(s.charCodeAt(k));
                    dataPtr++;
                } else if (ch === 0x63) { // 'c'
                    const c = this.stack[stkIdx++] & 0xFF;
                    this.sys.putchar(c);
                    dataPtr++;
                } else if (ch === 0x64) { // 'd'
                    const d = this.stack[stkIdx++];
                    const s = this.itoa(d);
                    for (let k = 0; k < s.length; k++) this.sys.putchar(s.charCodeAt(k));
                    dataPtr++;
                } else {
                    dataPtr++;
                }
            } else {
                this.sys.putchar(ch);
                dataPtr++;
            }
        }
        this.sys.putchar(0);
    }

    private vmSprintf(strAddr: number, fmtAddr: number, stkStart: number) {
        let dest = strAddr;
        let dataPtr = fmtAddr;
        let stkIdx = stkStart;

        const appendChar = (c: number) => { this.ram[dest++] = c; };
        const appendStr = (s: string) => { for(let k=0; k<s.length; k++) this.ram[dest++] = s.charCodeAt(k); };

        while (this.ram[dataPtr] !== 0) {
            let ch = this.ram[dataPtr];
            if (ch === 0x5C) { // '\'
                dataPtr++;
                ch = this.ram[dataPtr];
                if (ch === 0x72) appendChar(0x0D);
                else if (ch === 0x6E) appendChar(0x0A);
                dataPtr++;
            } else if (ch === 0x25) { // '%'
                dataPtr++;
                ch = this.ram[dataPtr];
                if (ch === 0x73) { // 's'
                    const sAddr = this.stack[stkIdx++];
                    appendStr(this.readString(sAddr));
                    dataPtr++;
                } else if (ch === 0x63) { // 'c'
                    appendChar(this.stack[stkIdx++] & 0xFF);
                    dataPtr++;
                } else if (ch === 0x64) { // 'd'
                    const d = this.stack[stkIdx++];
                    appendStr(this.itoa(d));
                    dataPtr++;
                } else {
                    dataPtr++;
                }
            } else {
                appendChar(ch);
                dataPtr++;
            }
        }
        appendChar(0);
    }

    private implStrcpy(dest: number, src: number) {
        let i = 0;
        while (true) {
            const c = this.ram[src + i];
            this.ram[dest + i] = c;
            if (c === 0) break;
            i++;
        }
    }

    private implStrlen(str: number): number {
        let i = 0;
        while (this.ram[str + i] !== 0) i++;
        return i;
    }

    private implStrcat(dest: number, src: number) {
        let destEnd = 0;
        while (this.ram[dest + destEnd] !== 0) destEnd++;
        this.implStrcpy(dest + destEnd, src);
    }

    private implStrcmp(s1: number, s2: number): number {
        let i = 0;
        while (true) {
            const c1 = this.ram[s1 + i];
            const c2 = this.ram[s2 + i];
            if (c1 !== c2) return c1 - c2;
            if (c1 === 0) return 0;
            i++;
        }
    }

    private implStrstr(s1: number, s2: number): number {
        const len1 = this.implStrlen(s1);
        const len2 = this.implStrlen(s2);
        if (len2 === 0) return s1;
        for (let i = 0; i <= len1 - len2; i++) {
            let match = true;
            for (let j = 0; j < len2; j++) {
                if (this.ram[s1 + i + j] !== this.ram[s2 + j]) {
                    match = false;
                    break;
                }
            }
            if (match) return s1 + i;
        }
        return 0;
    }
    
    private implStrchr(s: number, c: number): number {
        let i = 0;
        while(true) {
            const cur = this.ram[s + i];
            if (cur === c) return s + i;
            if (cur === 0) return 0;
            i++;
        }
    }

    // --- 核心执行 Step (Hex Version) ---
    public step(): number {
        if (this.isHalted || this.pc >= this.romSize) return 0;

        let code = this.readNext8();
        let op = code;

        let i = 0, j = 0, address = 0, m = 0;
        let val = 0;
        
        switch(op) {
            case 0x00: // nop
            case 0xFF: 
            case 0x44: // #loadall (68 -> 0x44)
                break;
            case 0x41: // init (65 -> 0x41)
                i = this.readNext16();
                j = this.readNext16();
                this.readToRam(i, j);
                break;
            case 0x40: // end (64 -> 0x40)
                this.isHalted = true;
                return 0;
            
            // --- Push ---
            case 0x01: // push1b
                this.push(this.readNext8());
                break;
            case 0x02: // push2b
                val = this.readNext16();
                val = (val << 16) >> 16;
                this.push(val);
                break;
            case 0x03: // push4b
                val = this.readNext32();
                this.push(val | 0); 
                break;

            // --- Load Variable ---
            // 14(0x0E), 15(0x0F), 16(0x10) -> Global
            // 4(0x04), 5(0x05), 6(0x06) -> Local
            case 0x0E: case 0x0F: case 0x10: 
                i = this.base;
                op -= 0x0A; // 10
                // fallthrough
            case 0x04: case 0x05: case 0x06:
                i += this.readNext16();
                if (op === 0x04) this.push(this.ram[i & 0xFFFF]);
                else if (op === 0x05) this.push(this.ramView.getInt16(i & 0xFFFF, true));
                else this.push(this.ramView.getInt32(i & 0xFFFF, true));
                break;

            // --- Load Indirect ---
            // 17(0x11), 18(0x12), 19(0x13) -> Global
            // 7(0x07), 8(0x08), 9(0x09) -> Local
            case 0x11: case 0x12: case 0x13:
                i = this.base;
                op -= 0x0A;
                // fallthrough
            case 0x07: case 0x08: case 0x09:
                const offset = this.stack[this.sp - 1];
                i += this.readNext16() + offset;
                if (op === 0x07) this.stack[this.sp - 1] = this.ram[i & 0xFFFF];
                else if (op === 0x08) this.stack[this.sp - 1] = this.ramView.getInt16(i & 0xFFFF, true);
                else this.stack[this.sp - 1] = this.ramView.getInt32(i & 0xFFFF, true);
                break;

            // --- LEA (Load Effective Address) ---
            // 20(0x14), 21(0x15), 22(0x16) -> Global (Type2)
            // 10(0x0A), 11(0x0B), 12(0x0C) -> Local (Type1)
            case 0x14: case 0x15: case 0x16:
                i = 0x800000;
                op -= 0x0A;
                // fallthrough
            case 0x0A: case 0x0B: case 0x0C:
                const addrCalc = (this.readNext16() + this.stack[this.sp - 1]) & 0xFFFF;
                i |= addrCalc;
                // op is 0x0A, 0x0B, 0x0C (10, 11, 12)
                this.stack[this.sp - 1] = i | (64 << op);
                break;

            // --- String Literal ---
            case 0x0D: // 13
                i = this.strBufPtr;
                while (true) {
                    let c = this.readNext8();
                    this.ram[i] = c;
                    i++;
                    if (c === 0) break;
                }
                let len = i - this.strBufPtr;
                if (this.strBufPtr + len > LVM_STRBUF_END) {
                    this.pc -= len; 
                    this.strBufPtr = LVM_STRBUF_START;
                    this.readToRam(this.strBufPtr, len);
                    i = this.strBufPtr + len;
                }
                this.push(this.strBufPtr);
                this.strBufPtr += len;
                break;

            // --- Address Math ---
            case 0x17: // 23
                this.stack[this.sp - 1] = (this.readNext16() + this.stack[this.sp - 1]) & 0xFFFF;
                break;
            case 0x18: // 24
                this.stack[this.sp - 1] = (this.readNext16() + this.stack[this.sp - 1] + this.base) & 0xFFFF;
                break;
            case 0x19: // 25
                this.push((this.readNext16() + this.base) & 0xFFFF);
                break;
            
            // --- Special Buffers ---
            case 0x1A: this.push(0x8000); break; // TBUF (26)
            case 0x1B: this.push(LVM_GRAPH_BUF); break; // GRAPH (27)
            case 0x42: this.push(0x8000); break; // GBUF (66 -> 0x42)

            // --- Arithmetic on Stack Top (69-81 -> 0x45-0x51) ---
            case 0x45: this.stack[this.sp - 1] += (this.readNext16() << 16) >> 16; break;
            case 0x46: this.stack[this.sp - 1] -= (this.readNext16() << 16) >> 16; break;
            case 0x47: this.stack[this.sp - 1] *= (this.readNext16() << 16) >> 16; break;
            case 0x48: 
                const d72 = (this.readNext16() << 16) >> 16;
                this.stack[this.sp - 1] = (this.stack[this.sp - 1] / d72) | 0; 
                break;
            case 0x49: this.stack[this.sp - 1] %= (this.readNext16() << 16) >> 16; break;
            case 0x4A: this.stack[this.sp - 1] <<= this.readNext16(); break;
            case 0x4B: this.stack[this.sp - 1] >>= this.readNext16(); break;
            case 0x4C: this.stack[this.sp - 1] = (this.stack[this.sp - 1] == ((this.readNext16()<<16)>>16)) ? -1 : 0; break;
            case 0x4D: this.stack[this.sp - 1] = (this.stack[this.sp - 1] != ((this.readNext16()<<16)>>16)) ? -1 : 0; break;
            case 0x4E: this.stack[this.sp - 1] = (this.stack[this.sp - 1] >  ((this.readNext16()<<16)>>16)) ? -1 : 0; break;
            case 0x4F: this.stack[this.sp - 1] = (this.stack[this.sp - 1] <  ((this.readNext16()<<16)>>16)) ? -1 : 0; break;
            case 0x50: this.stack[this.sp - 1] = (this.stack[this.sp - 1] >= ((this.readNext16()<<16)>>16)) ? -1 : 0; break;
            case 0x51: this.stack[this.sp - 1] = (this.stack[this.sp - 1] <= ((this.readNext16()<<16)>>16)) ? -1 : 0; break;

            // --- Binary Ops (Pop 2, Push 1) (33-52 -> 0x21-0x34) ---
            case 0x21: this.sp--; this.stack[this.sp - 1] += this.stack[this.sp]; break;
            case 0x22: this.sp--; this.stack[this.sp - 1] -= this.stack[this.sp]; break;
            case 0x23: this.sp--; this.stack[this.sp - 1] &= this.stack[this.sp]; break;
            case 0x24: this.sp--; this.stack[this.sp - 1] |= this.stack[this.sp]; break;
            case 0x25: this.stack[this.sp - 1] = ~this.stack[this.sp - 1]; break; // Unary Not (37)
            case 0x26: this.sp--; this.stack[this.sp - 1] ^= this.stack[this.sp]; break;
            case 0x27: this.sp--; this.stack[this.sp - 1] = (this.stack[this.sp - 1] && this.stack[this.sp]) ? -1 : 0; break;
            case 0x28: this.sp--; this.stack[this.sp - 1] = (this.stack[this.sp - 1] || this.stack[this.sp]) ? -1 : 0; break;
            case 0x29: this.stack[this.sp - 1] = this.stack[this.sp - 1] ? 0 : -1; break; // Logical Not (41)
            case 0x2A: this.sp--; this.stack[this.sp - 1] *= this.stack[this.sp]; break;
            case 0x2B: this.sp--; this.stack[this.sp - 1] = (this.stack[this.sp - 1] / this.stack[this.sp]) | 0; break;
            case 0x2C: this.sp--; this.stack[this.sp - 1] %= this.stack[this.sp]; break;
            case 0x2D: this.sp--; this.stack[this.sp - 1] = (this.stack[this.sp - 1] << this.stack[this.sp]) | 0; break;
            case 0x2E: this.sp--; this.stack[this.sp - 1] >>>= this.stack[this.sp]; break;
            
            // Comparisons
            case 0x2F: this.sp--; this.stack[this.sp - 1] = (this.stack[this.sp - 1] == this.stack[this.sp]) ? -1 : 0; break;
            case 0x30: this.sp--; this.stack[this.sp - 1] = (this.stack[this.sp - 1] != this.stack[this.sp]) ? -1 : 0; break;
            case 0x31: this.sp--; this.stack[this.sp - 1] = (this.stack[this.sp - 1] <= this.stack[this.sp]) ? -1 : 0; break;
            case 0x32: this.sp--; this.stack[this.sp - 1] = (this.stack[this.sp - 1] >= this.stack[this.sp]) ? -1 : 0; break;
            case 0x33: this.sp--; this.stack[this.sp - 1] = (this.stack[this.sp - 1] >  this.stack[this.sp]) ? -1 : 0; break;
            case 0x34: this.sp--; this.stack[this.sp - 1] = (this.stack[this.sp - 1] <  this.stack[this.sp]) ? -1 : 0; break;

            // --- Assignment ---
            case 0x35: // 53
                this.sp--;
                this.setValue(this.stack[this.sp - 1], this.stack[this.sp]);
                this.stack[this.sp - 1] = this.stack[this.sp];
                break;
            
            case 0x36: // 54 (a = (char *)b)
                address = this.stack[this.sp - 1] & 0xFFFF;
                this.stack[this.sp - 1] = this.ram[address];
                break;
            case 0x37: // 55
                this.stack[this.sp - 1] = (this.stack[this.sp - 1] & 0xFFFF) | 0x10000;
                break;
            case 0x38: // 56 (pop)
                this.sp--;
                break;
            
            case 0x1C: // 28 (Negate)
                this.stack[this.sp - 1] = -this.stack[this.sp - 1];
                break;

            // --- Inc/Dec (29-32 -> 0x1D-0x20) ---
            case 0x1D: case 0x1E: case 0x1F: case 0x20:
                i = this.stack[this.sp - 1];
                j = this.getAbsAddr(i);
                let typeMask = i & 0x70000;
                
                // Read
                if (typeMask === 0x10000) val = this.ram[j];
                else if (typeMask === 0x20000) val = this.ramView.getInt16(j, true);
                else val = this.ramView.getInt32(j, true);
                
                let newVal = val;
                let retVal = val;

                if (op === 0x1D) { newVal++; retVal = newVal; } // ++a
                else if (op === 0x1E) { newVal--; retVal = newVal; } // --a
                else if (op === 0x1F) { newVal++; retVal = val; } // a++
                else if (op === 0x20) { newVal--; retVal = val; } // a--

                // Write Back
                if (typeMask === 0x10000) this.ram[j] = newVal & 0xFF;
                else if (typeMask === 0x20000) this.ramView.setInt16(j, newVal, true);
                else this.ramView.setInt32(j, newVal, true);

                this.stack[this.sp - 1] = retVal;
                break;

            // --- Jumps ---
            case 0x39: // 57 (jz)
                address = this.readNextBytes(3);
                if (this.stack[this.sp - 1] === 0) this.pc = address & 0xFFFFFF;
                break;
            case 0x3A: // 58 (jnz)
                address = this.readNextBytes(3);
                if (this.stack[this.sp - 1] !== 0) this.pc = address & 0xFFFFFF;
                break;
            case 0x3B: // goto
                address = this.readNextBytes(3);
                this.pc = address & 0xFFFFFF;
                break;

            // --- Function Calls ---
            case 0x3C: // base (60 -> 0x3C)
                m = this.readNext16();
                this.base = m;
                this.base2 = m;
                break;
            case 0x3D: // call (61 -> 0x3D)
                address = this.readNextBytes(3);
                this.ramView.setUint32(this.base2, this.pc, true);
                this.ramView.setUint16(this.base2 + 3, this.base, true);
                this.base = this.base2;
                this.pc = address & 0xFFFFFF;
                break;
            case 0x3E: // prologue (62 -> 0x3E)
                m = this.readNext16();
                this.base2 += m;
                let argCount = this.readNext8();
                if (argCount > 0) {
                    this.sp -= argCount;
                    for (let k = 0; k < argCount; k++) {
                        this.ramView.setInt32(this.base + 5 + (k * 4), this.stack[this.sp + k], true);
                    }
                }
                break;
            case 0x3F: // return (63 -> 0x3F)
                this.base2 = this.base;
                this.pc = this.ramView.getUint32(this.base2, true) & 0xFFFFFF;
                this.base = this.ramView.getUint16(this.base2 + 3, true);
                break;

            // --- GVM Unknowns ---
            case 0x52: // 82
                this.stack[this.sp - 1] = this.ramView.getInt16(this.stack[this.sp - 1] & 0xFFFF, true);
                break;
            case 0x53: // 83
                this.stack[this.sp - 1] = this.ramView.getInt32(this.stack[this.sp - 1] & 0xFFFF, true);
                break;

            // --- SYSCALLS (0x80 - 0xCA) ---
            case 0x80: // putchar
                this.stkPop(1);
                this.sys.putchar(this.regBuf[0]);
                break;
            case 0x81: // getchar
                this.regBuf[0] = this.sys.getchar();
                this.stkPush(1);
                break;
            case 0x82: // printf
                i = this.stack[this.sp - 1] & 0xFF; 
                this.sp -= (i + 1);
                j = this.stack[this.sp] & 0xFFFF;
                this.vmPrintf(j, this.sp + 1);
                break;
            case 0x83: // strcpy
                this.stkPop(2);
                this.implStrcpy(this.regBuf[0], this.regBuf[1]);
                break;
            case 0x84: // strlen
                this.stkPop(1);
                this.regBuf[0] = this.implStrlen(this.regBuf[0]);
                this.stkPush(1);
                break;
            case 0x85: // SetScreen
                this.stkPop(1);
                this.sys.setScreen(this.regBuf[0]);
                break;
            case 0x86: // UpdateLCD
                this.stkPop(1);
                this.sys.updateLCD(this.ram.subarray(this.regBuf[0]));
                break;
            case 0x87: // Delay
                this.stkPop(1);
                this.sys.delay(this.regBuf[0]);
                break;
            case 0x88: // WriteBlock
                this.stkPop(6);
                this.sys.writeBlock(this.regBuf[0], this.regBuf[1], this.regBuf[2], this.regBuf[3], this.regBuf[4], this.ram.subarray(this.regBuf[5]));
                break;
            case 0x89: // Refresh
                this.sys.refresh();
                break;
            case 0x8A: // TextOut
                this.stkPop(4);
                this.sys.textOut(this.regBuf[0], this.regBuf[1], this.readString(this.regBuf[2]), this.regBuf[3]);
                break;
            case 0x8B: // Block
                this.stkPop(5);
                this.sys.block(this.regBuf[0], this.regBuf[1], this.regBuf[2], this.regBuf[3], this.regBuf[4]);
                break;
            case 0x8C: // Rectangle
                this.stkPop(5);
                this.sys.rectangle(this.regBuf[0], this.regBuf[1], this.regBuf[2], this.regBuf[3], this.regBuf[4]);
                break;
            case 0x8D: // exit
                this.stkPop(1);
                this.isHalted = true;
                return 0;
            case 0x8E: // ClearScreen
                this.sys.clearScreen();
                break;
            case 0x8F: // abs
                this.stkPop(1);
                this.regBuf[0] = Math.abs(this.regBuf[0]);
                this.stkPush(1);
                break;
            case 0x90: // rand
                this.regBuf[0] = this.sys.rand();
                this.stkPush(1);
                break;
            case 0x91: // srand
                this.stkPop(1);
                this.sys.srand(this.regBuf[0]);
                break;
            case 0x92: // Locate
                this.stkPop(2);
                this.sys.locate(this.regBuf[0], this.regBuf[1]);
                break;
            case 0x93: // Inkey
                this.regBuf[0] = this.sys.inkey();
                this.stkPush(1);
                break;
            case 0x94: // Point
                this.stkPop(3);
                this.sys.point(this.regBuf[0], this.regBuf[1], this.regBuf[2]);
                break;
            case 0x95: // GetPoint
                this.stkPop(2);
                this.regBuf[0] = this.sys.getPoint(this.regBuf[0], this.regBuf[1]);
                this.stkPop(1); 
                break;
            case 0x96: // Line
                this.stkPop(5);
                this.sys.line(this.regBuf[0], this.regBuf[1], this.regBuf[2], this.regBuf[3], this.regBuf[4]);
                break;
            case 0x97: // Box
                this.stkPop(6);
                this.sys.box(this.regBuf[0], this.regBuf[1], this.regBuf[2], this.regBuf[3], this.regBuf[4], this.regBuf[5]);
                break;
            case 0x98: // Circle
                this.stkPop(5);
                this.sys.circle(this.regBuf[0], this.regBuf[1], this.regBuf[2], this.regBuf[3], this.regBuf[4]);
                break;
            case 0x99: // Ellipse
                this.stkPop(6);
                this.sys.ellipse(this.regBuf[0], this.regBuf[1], this.regBuf[2], this.regBuf[3], this.regBuf[4], this.regBuf[5]);
                break;
            case 0x9A: // Beep
                this.sys.beep();
                break;

            // Character Checks
            case 0x9B: // isalnum
                this.stkPop(1); this.regBuf[0] = /[a-zA-Z0-9]/.test(String.fromCharCode(this.regBuf[0])) ? 1 : 0; this.stkPush(1); break;
            case 0x9C: // isalpha
                this.stkPop(1); this.regBuf[0] = /[a-zA-Z]/.test(String.fromCharCode(this.regBuf[0])) ? 1 : 0; this.stkPush(1); break;
            case 0x9D: // iscntrl
                this.stkPop(1); this.regBuf[0] = (this.regBuf[0] < 32 || this.regBuf[0] === 127) ? 1 : 0; this.stkPush(1); break;
            case 0x9E: // isdigit
                this.stkPop(1); this.regBuf[0] = /[0-9]/.test(String.fromCharCode(this.regBuf[0])) ? 1 : 0; this.stkPush(1); break;
            case 0x9F: // isgraph
                this.stkPop(1); this.regBuf[0] = (this.regBuf[0] > 32 && this.regBuf[0] < 127) ? 1 : 0; this.stkPush(1); break;
            case 0xA0: // islower
                this.stkPop(1); this.regBuf[0] = /[a-z]/.test(String.fromCharCode(this.regBuf[0])) ? 1 : 0; this.stkPush(1); break;
            case 0xA1: // isprint
                this.stkPop(1); this.regBuf[0] = (this.regBuf[0] >= 32 && this.regBuf[0] < 127) ? 1 : 0; this.stkPush(1); break;
            case 0xA2: // ispunct
                this.stkPop(1); 
                const chP = String.fromCharCode(this.regBuf[0]);
                this.regBuf[0] = (/[!-/:-@[-`{-~]/.test(chP)) ? 1 : 0; 
                this.stkPush(1); 
                break;
            case 0xA3: // isspace
                this.stkPop(1); this.regBuf[0] = /\s/.test(String.fromCharCode(this.regBuf[0])) ? 1 : 0; this.stkPush(1); break;
            case 0xA4: // isupper
                this.stkPop(1); this.regBuf[0] = /[A-Z]/.test(String.fromCharCode(this.regBuf[0])) ? 1 : 0; this.stkPush(1); break;
            case 0xA5: // isxdigit
                this.stkPop(1); this.regBuf[0] = /[0-9a-fA-F]/.test(String.fromCharCode(this.regBuf[0])) ? 1 : 0; this.stkPush(1); break;

            case 0xA6: // strcat
                this.stkPop(2);
                this.implStrcat(this.regBuf[0], this.regBuf[1]);
                break;
            case 0xA7: // strchr
                this.stkPop(2);
                this.regBuf[0] = this.implStrchr(this.regBuf[0], this.regBuf[1]);
                this.stkPush(1);
                break;
            case 0xA8: // strcmp
                this.stkPop(2);
                this.regBuf[0] = this.implStrcmp(this.regBuf[0], this.regBuf[1]);
                this.stkPush(1);
                break;
            case 0xA9: // strstr
                this.stkPop(2);
                this.regBuf[0] = this.implStrstr(this.regBuf[0], this.regBuf[1]);
                this.stkPush(1);
                break;
            case 0xAA: // tolower
                this.stkPop(1);
                this.regBuf[0] = String.fromCharCode(this.regBuf[0]).toLowerCase().charCodeAt(0);
                this.stkPush(1);
                break;
            case 0xAB: // toupper
                this.stkPop(1);
                this.regBuf[0] = String.fromCharCode(this.regBuf[0]).toUpperCase().charCodeAt(0);
                this.stkPush(1);
                break;
            case 0xAC: // memset
                this.stkPop(3); 
                this.ram.fill(this.regBuf[1], this.regBuf[0], this.regBuf[0] + this.regBuf[2]);
                break;
            case 0xAD: // memcpy
                this.stkPop(3);
                this.ram.set(this.ram.subarray(this.regBuf[1], this.regBuf[1] + this.regBuf[2]), this.regBuf[0]);
                break;
            
            // --- File System ---
            case 0xAE: // fopen
                this.stkPop(2);
                const fname = this.readString(this.regBuf[0]);
                const fmode = this.readString(this.regBuf[1]);
                this.regBuf[0] = this.sys.fopen(fname, fmode);
                this.stkPush(1);
                break;
            case 0xAF: // fclose
                this.stkPop(1);
                this.sys.fclose(this.regBuf[0]);
                break;
            case 0xB0: // fread
                this.stkPop(4);
                this.regBuf[0] = this.sys.fread(this.regBuf[0], this.regBuf[1], this.regBuf[2], this.regBuf[3], this.ram);
                this.stkPush(1);
                break;
            case 0xB1: // fwrite
                this.stkPop(4);
                this.regBuf[0] = this.sys.fwrite(this.regBuf[0], this.regBuf[1], this.regBuf[2], this.regBuf[3], this.ram);
                this.stkPush(1);
                break;
            case 0xB2: // fseek
                this.stkPop(3);
                this.regBuf[0] = this.sys.fseek(this.regBuf[0], this.regBuf[1], this.regBuf[2]);
                this.stkPush(1);
                break;
            case 0xB3: // ftell
                this.stkPop(1);
                this.regBuf[0] = this.sys.ftell(this.regBuf[0]);
                this.stkPush(1);
                break;
            case 0xB4: // feof
                this.stkPop(1);
                this.regBuf[0] = this.sys.feof(this.regBuf[0]);
                this.stkPush(1);
                break;
            case 0xB5: // rewind
                this.stkPop(1);
                this.sys.rewind(this.regBuf[0]);
                break;
            case 0xB6: // getc
                this.stkPop(1);
                this.regBuf[0] = this.sys.getc(this.regBuf[0]);
                this.stkPush(1);
                break;
            case 0xB7: // putc
                this.stkPop(2);
                this.regBuf[0] = this.sys.putc(this.regBuf[0], this.regBuf[1]);
                this.stkPush(1);
                break;
            
            case 0xB8: // sprintf
                i = this.stack[this.sp - 1] & 0xFF;
                this.sp -= (i + 1);
                j = this.stack[this.sp];
                const k = this.stack[this.sp + 1];
                this.vmSprintf(j, k, this.sp + 2);
                break;
            
            case 0xB9: // MakeDir
                this.stkPop(1);
                this.regBuf[0] = this.sys.makeDir(this.readString(this.regBuf[0]));
                this.stkPush(1);
                break;
            case 0xBA: // DeleteFile
                this.stkPop(1);
                this.regBuf[0] = this.sys.deleteFile(this.readString(this.regBuf[0]));
                this.stkPush(1);
                break;
            case 0xBB: // GetMs
                this.regBuf[0] = this.sys.getMs();
                this.stkPush(1);
                break;
            case 0xBC: // CheckKey
                this.stkPop(1);
                this.regBuf[0] = this.sys.checkKey(this.regBuf[0]);
                this.stkPush(1);
                break;
            case 0xBD: // memmove
                this.stkPop(3);
                this.ram.copyWithin(this.regBuf[0], this.regBuf[1], this.regBuf[1] + this.regBuf[2]);
                break;
            case 0xBE: // Crc16
                this.stkPop(2);
                this.regBuf[0] = this.sys.crc16(this.regBuf[0], this.regBuf[1], this.ram);
                this.stkPush(1);
                break;
            case 0xBF: // Secret
                this.stkPop(3);
                this.sys.secret(this.regBuf[0], this.regBuf[1], this.ram);
                break;
            case 0xC0: // ChDir
                this.stkPop(1);
                this.regBuf[0] = this.sys.chDir(this.readString(this.regBuf[0]));
                this.stkPush(1);
                break;
            case 0xC1: // FileList
                this.stkPop(1);
                this.regBuf[0] = this.sys.fileList(this.readString(this.regBuf[0]));
                this.stkPush(1);
                break;
            case 0xC2: // GetTime
                this.stkPop(1);
                this.sys.getTime(this.regBuf[0], this.ram);
                break;
            case 0xC3: // SetTime
                this.stkPop(1);
                this.sys.setTime(this.regBuf[0], this.ram);
                break;
            case 0xC4: // GetWord
                this.stkPop(1);
                this.regBuf[0] = this.sys.getchar();
                this.stkPush(1);
                break;
            case 0xC5: // XDraw
                this.stkPop(1);
                this.sys.xDraw(this.regBuf[0]);
                break;
            case 0xC6: // ReleaseKey
                this.stkPop(1);
                this.sys.releaseKey(this.regBuf[0]);
                break;
            case 0xC7: // GetBlock
                this.stkPop(6);
                this.sys.getBlock(this.regBuf[0], this.regBuf[1], this.regBuf[2], this.regBuf[3], this.regBuf[4], this.regBuf[5], this.ram);
                break;
            case 0xC8: // sin
                this.stkPop(1);
                this.regBuf[0] = Math.floor(this.sys.sin(this.regBuf[0]));
                this.stkPush(1);
                break;
            case 0xC9: // cos
                this.stkPop(1);
                this.regBuf[0] = Math.floor(this.sys.cos(this.regBuf[0]));
                this.stkPush(1);
                break;
            case 0xCA: // FillArea
                this.stkPop(3);
                this.sys.fillArea(this.regBuf[0], this.regBuf[1], this.regBuf[2]);
                break;
            
            default:
                break;
        }

        return 0;
    }
}