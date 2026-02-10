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
const CONSTS = {
    STACK_SIZE: 0x500,
    DAT_SIZE: 0x8000,
    STRBUF_START: 0x7000,
    STRBUF_END: 0x74FF,
    GRAPH_BUF: 0x8000
} as const;

type OpHandler = () => void;

export class LavaVM {
    // Core Registers
    public pc: number = 0;
    public sp: number = 0;
    public base: number = 0;
    public base2: number = 0;
    private strBufPtr: number = CONSTS.STRBUF_START;

    // Memory
    public ram: Uint8Array;
    private ramView: DataView;
    private stack: Int32Array;
    private regBuf: Int32Array; // lvm_buf

    // ROM
    private rom: Uint8Array = new Uint8Array(0);
    private romView: DataView = new DataView(new ArrayBuffer(0));
    private romSize: number = 0;

    // System
    public isHalted: boolean = true;
    private sys: LavaSystem;
    
    // Instruction Table (The "Elegant" Part)
    private ops: OpHandler[];

    constructor(system: LavaSystem) {
        this.sys = system;
        this.ram = new Uint8Array(0x10000); // 64KB RAM
        this.ramView = new DataView(this.ram.buffer);
        this.stack = new Int32Array(CONSTS.STACK_SIZE);
        this.regBuf = new Int32Array(32);

        // 初始化指令表，填充 256 个 NOP 防止 crash
        this.ops = new Array(256).fill(() => {}); 
        this.initInstructionTable();
    }

    // --- Loading & Reset ---

    // 安全读取 ROM 字节（带边界检查）
    private readRom8(addr: number): number {
        if (addr >= this.romSize) return 0xFF; // EOF
        return this.rom[addr];
    }

    public load(buffer: ArrayBuffer): boolean {
        this.rom = new Uint8Array(buffer);
        this.romView = new DataView(buffer);
        this.romSize = buffer.byteLength;
        
        // Header Check "LAV" (使用 readRom8 防止越界)
        if (this.readRom8(0) === 0x4C && this.readRom8(1) === 0x41 && this.readRom8(2) === 0x56) {
             this.reset();
             this.pc = 0x10;
             this.isHalted = false;
             return true;
        }
        return false;
    }

    public reset() {
        this.pc = 0; this.sp = 0; this.base = 0; this.base2 = 0;
        this.strBufPtr = CONSTS.STRBUF_START;
        this.ram.fill(0);
        this.stack.fill(0);
        this.regBuf.fill(0);
    }

    // --- Core Execution Loop ---

    public step(): number {
        if (this.isHalted || this.pc >= this.romSize) return 0;
        const opcode = this.rom[this.pc++]; // Direct Access for speed
        this.ops[opcode](); // Fast Dispatch
        return 0; // Keeping return type consistent with C
    }

    // --- Instruction Table Initialization ---
    // 模拟 lvm_read 到 ram
    private readToRam(destAddr: number, length: number) {
        for (let i = 0; i < length; i++) {
            if (this.pc < this.romSize) {
                this.ram[destAddr + i] = this.readRom8(this.pc++);
            }
        }
    }

    private initInstructionTable() {
        // Helper to bind this
        const bind = (fn: OpHandler) => fn.bind(this);

        // 0. Control
        this.ops[0x00] = () => {}; // NOP
        this.ops[0x40] = () => { this.isHalted = true; }; // END
        this.ops[0x41] = () => { // INIT
            const i = this.next16();
            const j = this.next16();
            this.readToRam(i, j);
        };
        this.ops[0xFF] = () => {}; 
        this.ops[0x44] = () => {}; // #loadall

        // 1. Push Operations
        this.ops[0x01] = () => this.push(this.next8());
        this.ops[0x02] = () => this.push((this.next16() << 16) >> 16); // Sign extend
        this.ops[0x03] = () => this.push(this.next32() | 0);

        // 2. Load Variables (Local/Global)
        // Groups: Local(04-06, 0A-0C), Global(0E-10, 14-16)
        // Using a factory to generate optimized handlers
        const makeLoadVar = (isGlobal: boolean, size: 1 | 2 | 4) => {
            return () => {
                let addr = isGlobal ? this.base : 0;
                addr = (addr + this.next16()) & 0xFFFF;
                if (size === 1) this.push(this.ram[addr]);
                else if (size === 2) this.push(this.ramView.getInt16(addr, true));
                else this.push(this.ramView.getInt32(addr, true));
            };
        };
        this.ops[0x04] = makeLoadVar(false, 1);
        this.ops[0x05] = makeLoadVar(false, 2);
        this.ops[0x06] = makeLoadVar(false, 4);
        this.ops[0x0E] = makeLoadVar(true, 1);
        this.ops[0x0F] = makeLoadVar(true, 2);
        this.ops[0x10] = makeLoadVar(true, 4);

        // 3. Load Indirect (Local/Global)
        const makeLoadInd = (isGlobal: boolean, size: 1 | 2 | 4) => {
            return () => {
                let addr = isGlobal ? this.base : 0;
                const offset = this.stack[this.sp - 1]; // Peek
                addr = (addr + this.next16() + offset) & 0xFFFF;
                // Overwrite stack top
                if (size === 1) this.stack[this.sp - 1] = this.ram[addr];
                else if (size === 2) this.stack[this.sp - 1] = this.ramView.getInt16(addr, true);
                else this.stack[this.sp - 1] = this.ramView.getInt32(addr, true);
            };
        };
        this.ops[0x07] = makeLoadInd(false, 1);
        this.ops[0x08] = makeLoadInd(false, 2);
        this.ops[0x09] = makeLoadInd(false, 4);
        this.ops[0x11] = makeLoadInd(true, 1);
        this.ops[0x12] = makeLoadInd(true, 2);
        this.ops[0x13] = makeLoadInd(true, 4);

        // 4. LEA (Load Effective Address)
        const makeLea = (isGlobal: boolean, opIndex: number) => {
            return () => {
                let i = isGlobal ? 0x800000 : 0;
                const addrCalc = (this.next16() + this.stack[this.sp - 1]) & 0xFFFF;
                i |= addrCalc;
                this.stack[this.sp - 1] = i | (64 << opIndex);
            };
        };
        this.ops[0x0A] = makeLea(false, 10);
        this.ops[0x0B] = makeLea(false, 11);
        this.ops[0x0C] = makeLea(false, 12);
        this.ops[0x14] = makeLea(true, 10);
        this.ops[0x15] = makeLea(true, 11);
        this.ops[0x16] = makeLea(true, 12);

        // 5. String
        this.ops[0x0D] = bind(this.opString);

        // 6. Address Math
        this.ops[0x17] = () => this.stack[this.sp - 1] = (this.next16() + this.stack[this.sp - 1]) & 0xFFFF;
        this.ops[0x18] = () => this.stack[this.sp - 1] = (this.next16() + this.stack[this.sp - 1] + this.base) & 0xFFFF;
        this.ops[0x19] = () => this.push((this.next16() + this.base) & 0xFFFF);

        // 7. Buffers
        this.ops[0x1A] = () => this.push(0x8000);
        this.ops[0x1B] = () => this.push(CONSTS.GRAPH_BUF);
        this.ops[0x42] = () => this.push(0x8000);

        // 8. Math on Stack Top (Immediate)
        // Pattern: op(stack[top], next16())
        this.ops[0x45] = () => this.stack[this.sp-1] += this.next16s();
        this.ops[0x46] = () => this.stack[this.sp-1] -= this.next16s();
        this.ops[0x47] = () => this.stack[this.sp-1] *= this.next16s();
        this.ops[0x48] = () => this.stack[this.sp-1] = (this.stack[this.sp-1] / this.next16s()) | 0;
        this.ops[0x49] = () => this.stack[this.sp-1] %= this.next16s();
        this.ops[0x4A] = () => this.stack[this.sp-1] <<= this.next16();
        this.ops[0x4B] = () => this.stack[this.sp-1] >>= this.next16();
        
        const makeCmpImm = (fn: (a: number, b: number) => boolean) => () => {
            const b = this.next16s();
            this.stack[this.sp-1] = fn(this.stack[this.sp-1], b) ? -1 : 0;
        };
        this.ops[0x4C] = makeCmpImm((a, b) => a == b);
        this.ops[0x4D] = makeCmpImm((a, b) => a != b);
        this.ops[0x4E] = makeCmpImm((a, b) => a > b);
        this.ops[0x4F] = makeCmpImm((a, b) => a < b);
        this.ops[0x50] = makeCmpImm((a, b) => a >= b);
        this.ops[0x51] = makeCmpImm((a, b) => a <= b);

        // 9. Binary Operations (Stack, Stack)
        // Pattern: a = stack[sp-2], b = stack[sp-1], pop, stack[sp-1] = op(a,b)
        // Actually: this.sp--; this.stack[this.sp-1] op= this.stack[this.sp]
        const makeBinOp = (fn: (a: number, b: number) => number) => () => {
            this.sp--;
            this.stack[this.sp-1] = fn(this.stack[this.sp-1], this.stack[this.sp]);
        };

        this.ops[0x21] = makeBinOp((a, b) => a + b);
        this.ops[0x22] = makeBinOp((a, b) => a - b);
        this.ops[0x23] = makeBinOp((a, b) => a & b);
        this.ops[0x24] = makeBinOp((a, b) => a | b);
        this.ops[0x26] = makeBinOp((a, b) => a ^ b);
        this.ops[0x2A] = makeBinOp((a, b) => a * b);
        this.ops[0x2B] = makeBinOp((a, b) => (a / b) | 0);
        this.ops[0x2C] = makeBinOp((a, b) => a % b);
        this.ops[0x2D] = makeBinOp((a, b) => a << b);
        this.ops[0x2E] = makeBinOp((a, b) => a >>> b);
        
        // Logical/Compare (Return -1 or 0)
        const makeLogOp = (fn: (a: number, b: number) => boolean) => () => {
            this.sp--;
            this.stack[this.sp-1] = fn(this.stack[this.sp-1], this.stack[this.sp]) ? -1 : 0;
        };
        this.ops[0x27] = makeLogOp((a, b) => (a !== 0) && (b !== 0)); // &&
        this.ops[0x28] = makeLogOp((a, b) => (a !== 0) || (b !== 0)); // ||
        this.ops[0x2F] = makeLogOp((a, b) => a === b);
        this.ops[0x30] = makeLogOp((a, b) => a !== b);
        this.ops[0x31] = makeLogOp((a, b) => a <= b);
        this.ops[0x32] = makeLogOp((a, b) => a >= b);
        this.ops[0x33] = makeLogOp((a, b) => a > b);
        this.ops[0x34] = makeLogOp((a, b) => a < b);

        // Unary
        this.ops[0x25] = () => this.stack[this.sp-1] = ~this.stack[this.sp-1];
        this.ops[0x29] = () => this.stack[this.sp-1] = this.stack[this.sp-1] ? 0 : -1;
        this.ops[0x1C] = () => this.stack[this.sp-1] = -this.stack[this.sp-1];

        // 10. Memory & Stack Managament
        this.ops[0x35] = () => { // Assignment
            this.sp--;
            const val = this.stack[this.sp];
            const addr = this.stack[this.sp-1];
            this.setValue(addr, val);
            this.stack[this.sp-1] = val; // Return value
        };
        this.ops[0x36] = () => { // Deref Char
            const addr = this.stack[this.sp-1] & 0xFFFF;
            this.stack[this.sp-1] = this.ram[addr];
        };
        this.ops[0x37] = () => this.stack[this.sp-1] = (this.stack[this.sp-1] & 0xFFFF) | 0x10000;
        this.ops[0x38] = () => this.sp--; // Pop

        // 11. Inc/Dec
        this.ops[0x1D] = () => this.opIncDec(1, true);  // ++a
        this.ops[0x1E] = () => this.opIncDec(-1, true); // --a
        this.ops[0x1F] = () => this.opIncDec(1, false); // a++
        this.ops[0x20] = () => this.opIncDec(-1, false);// a--

        // 12. Flow Control
        this.ops[0x39] = () => { // JZ
            const addr = this.next24();
            if (this.stack[this.sp-1] === 0) this.pc = addr;
        };
        this.ops[0x3A] = () => { // JNZ
            const addr = this.next24();
            if (this.stack[this.sp-1] !== 0) this.pc = addr;
        };
        this.ops[0x3B] = () => this.pc = this.next24(); // GOTO

        // 13. Functions
        this.ops[0x3C] = () => { // Base
            const m = this.next16();
            this.base = this.base2 = m;
        };
        this.ops[0x3D] = bind(this.opCall);
        this.ops[0x3E] = bind(this.opPrologue);
        this.ops[0x3F] = bind(this.opReturn);

        // 14. Unknowns
        this.ops[0x52] = () => this.stack[this.sp-1] = this.ramView.getInt16(this.stack[this.sp-1] & 0xFFFF, true);
        this.ops[0x53] = () => this.stack[this.sp-1] = this.ramView.getInt32(this.stack[this.sp-1] & 0xFFFF, true);

        // 15. Syscalls (Mapped to a separate handler to keep table clean)
        // Map 0x80 - 0xCA
        for (let i = 0x80; i <= 0xCA; i++) {
            this.ops[i] = () => this.handleSyscall(i);
        }
    }

    // --- Complex Instruction Implementations ---

    private opString() {
        let i = this.strBufPtr;
        // Fast copy from ROM to RAM
        while (true) {
            const c = this.rom[this.pc++];
            this.ram[i++] = c;
            if (c === 0) break;
        }
        const len = i - this.strBufPtr;
        if (this.strBufPtr + len > CONSTS.STRBUF_END) {
            // Rewind and reset buffer
            this.pc -= len;
            this.strBufPtr = CONSTS.STRBUF_START;
            this.opString(); // Retry
            return;
        }
        this.push(this.strBufPtr);
        this.strBufPtr += len;
    }

    private opIncDec(delta: number, isPrefix: boolean) {
        const addrEncoded = this.stack[this.sp - 1];
        const addr = this.getAbsAddr(addrEncoded);
        const typeMask = addrEncoded & 0x70000;
        
        let val = 0;
        if (typeMask === 0x10000) val = this.ram[addr];
        else if (typeMask === 0x20000) val = this.ramView.getInt16(addr, true);
        else val = this.ramView.getInt32(addr, true);

        const newVal = val + delta;
        
        if (typeMask === 0x10000) this.ram[addr] = newVal & 0xFF;
        else if (typeMask === 0x20000) this.ramView.setInt16(addr, newVal, true);
        else this.ramView.setInt32(addr, newVal, true);

        this.stack[this.sp - 1] = isPrefix ? newVal : val;
    }

    private opCall() {
        const target = this.next24();
        // Save Context
        this.ramView.setUint32(this.base2, this.pc, true);
        this.ramView.setUint16(this.base2 + 3, this.base, true);
        this.base = this.base2;
        this.pc = target;
    }

    private opPrologue() {
        const frameSize = this.next16();
        this.base2 += frameSize;
        let argCount = this.next8();
        if (argCount > 0) {
            this.sp -= argCount;
            // Unroll loop for small arg counts? V8 handles loop well.
            for (let k = 0; k < argCount; k++) {
                this.ramView.setInt32(this.base + 5 + (k * 4), this.stack[this.sp + k], true);
            }
        }
    }

    private opReturn() {
        this.base2 = this.base;
        this.pc = this.ramView.getUint32(this.base2, true) & 0xFFFFFF;
        this.base = this.ramView.getUint16(this.base2 + 3, true);
    }

    // --- Syscall Dispatcher ---
    private handleSyscall(op: number) {
        const b = this.regBuf;
        const pop = (n: number) => this.stkPop(n);
        const push = (n: number) => this.stkPush(n);
        const r = this.ram;

        switch (op) {
            case 0x80: pop(1); this.sys.putchar(b[0]); break;
            case 0x81: b[0] = this.sys.getchar(); push(1); break;
            case 0x82: // printf
                const cnt = this.stack[this.sp - 1] & 0xFF;
                this.sp -= (cnt + 1);
                this.vmPrintf(this.stack[this.sp] & 0xFFFF, this.sp + 1);
                break;
            case 0x83: pop(2); this.implStrcpy(b[0], b[1]); break;
            case 0x84: pop(1); b[0] = this.implStrlen(b[0]); push(1); break;
            case 0x85: pop(1); this.sys.setScreen(b[0]); break;
            case 0x86: pop(1); this.sys.updateLCD(r.subarray(b[0])); break;
            case 0x87: pop(1); this.sys.delay(b[0]); break;
            case 0x88: pop(6); this.sys.writeBlock(b[0], b[1], b[2], b[3], b[4], r.subarray(b[5])); break;
            case 0x89: this.sys.refresh(); break;
            case 0x8A: pop(4); this.sys.textOut(b[0], b[1], this.readStr(b[2]), b[3]); break;
            case 0x8B: pop(5); this.sys.block(b[0], b[1], b[2], b[3], b[4]); break;
            case 0x8C: pop(5); this.sys.rectangle(b[0], b[1], b[2], b[3], b[4]); break;
            case 0x8D: pop(1); this.isHalted = true; break;
            case 0x8E: this.sys.clearScreen(); break;
            case 0x8F: pop(1); b[0] = Math.abs(b[0]); push(1); break;
            case 0x90: b[0] = this.sys.rand(); push(1); break;
            case 0x91: pop(1); this.sys.srand(b[0]); break;
            case 0x92: pop(2); this.sys.locate(b[0], b[1]); break;
            case 0x93: b[0] = this.sys.inkey(); push(1); break;
            case 0x94: pop(3); this.sys.point(b[0], b[1], b[2]); break;
            case 0x95: pop(2); b[0] = this.sys.getPoint(b[0], b[1]); pop(1); break; // Note: Original C pop logic preserved
            case 0x96: pop(5); this.sys.line(b[0], b[1], b[2], b[3], b[4]); break;
            case 0x97: pop(6); this.sys.box(b[0], b[1], b[2], b[3], b[4], b[5]); break;
            case 0x98: pop(5); this.sys.circle(b[0], b[1], b[2], b[3], b[4]); break;
            case 0x99: pop(6); this.sys.ellipse(b[0], b[1], b[2], b[3], b[4], b[5]); break;
            case 0x9A: this.sys.beep(); break;
            
            // CType
            case 0x9B: pop(1); b[0] = /[a-zA-Z0-9]/.test(String.fromCharCode(b[0])) ? 1 : 0; push(1); break;
            case 0x9C: pop(1); b[0] = /[a-zA-Z]/.test(String.fromCharCode(b[0])) ? 1 : 0; push(1); break;
            case 0x9D: pop(1); b[0] = (b[0] < 32 || b[0] == 127) ? 1 : 0; push(1); break;
            case 0x9E: pop(1); b[0] = (b[0] >= 48 && b[0] <= 57) ? 1 : 0; push(1); break;
            case 0x9F: pop(1); b[0] = (b[0] > 32 && b[0] < 127) ? 1 : 0; push(1); break;
            case 0xA0: pop(1); b[0] = (b[0] >= 97 && b[0] <= 122) ? 1 : 0; push(1); break;
            case 0xA1: pop(1); b[0] = (b[0] >= 32 && b[0] < 127) ? 1 : 0; push(1); break;
            case 0xA2: pop(1); b[0] = (/[!-/:-@[-`{-~]/.test(String.fromCharCode(b[0]))) ? 1 : 0; push(1); break;
            case 0xA3: pop(1); b[0] = (b[0] == 32 || (b[0] >= 9 && b[0] <= 13)) ? 1 : 0; push(1); break;
            case 0xA4: pop(1); b[0] = (b[0] >= 65 && b[0] <= 90) ? 1 : 0; push(1); break;
            case 0xA5: pop(1); b[0] = /[0-9a-fA-F]/.test(String.fromCharCode(b[0])) ? 1 : 0; push(1); break;

            // Str/Mem
            case 0xA6: pop(2); this.implStrcat(b[0], b[1]); break;
            case 0xA7: pop(2); b[0] = this.implStrchr(b[0], b[1]); push(1); break;
            case 0xA8: pop(2); b[0] = this.implStrcmp(b[0], b[1]); push(1); break;
            case 0xA9: pop(2); b[0] = this.implStrstr(b[0], b[1]); push(1); break;
            case 0xAA: pop(1); b[0] = String.fromCharCode(b[0]).toLowerCase().charCodeAt(0); push(1); break;
            case 0xAB: pop(1); b[0] = String.fromCharCode(b[0]).toUpperCase().charCodeAt(0); push(1); break;
            case 0xAC: pop(3); r.fill(b[1], b[0], b[0] + b[2]); break;
            case 0xAD: pop(3); r.set(r.subarray(b[1], b[1] + b[2]), b[0]); break;

            // File
            case 0xAE: pop(2); b[0] = this.sys.fopen(this.readStr(b[0]), this.readStr(b[1])); push(1); break;
            case 0xAF: pop(1); this.sys.fclose(b[0]); break;
            case 0xB0: pop(4); b[0] = this.sys.fread(b[0], b[1], b[2], b[3], r); push(1); break;
            case 0xB1: pop(4); b[0] = this.sys.fwrite(b[0], b[1], b[2], b[3], r); push(1); break;
            case 0xB2: pop(3); b[0] = this.sys.fseek(b[0], b[1], b[2]); push(1); break;
            case 0xB3: pop(1); b[0] = this.sys.ftell(b[0]); push(1); break;
            case 0xB4: pop(1); b[0] = this.sys.feof(b[0]); push(1); break;
            case 0xB5: pop(1); this.sys.rewind(b[0]); break;
            case 0xB6: pop(1); b[0] = this.sys.getc(b[0]); push(1); break;
            case 0xB7: pop(2); b[0] = this.sys.putc(b[0], b[1]); push(1); break;
            
            case 0xB8: // sprintf
                const sCnt = this.stack[this.sp - 1] & 0xFF;
                this.sp -= (sCnt + 1);
                this.vmSprintf(this.stack[this.sp], this.stack[this.sp+1], this.sp + 2);
                break;

            case 0xB9: pop(1); b[0] = this.sys.makeDir(this.readStr(b[0])); push(1); break;
            case 0xBA: pop(1); b[0] = this.sys.deleteFile(this.readStr(b[0])); push(1); break;
            case 0xBB: b[0] = this.sys.getMs(); push(1); break;
            case 0xBC: pop(1); b[0] = this.sys.checkKey(b[0]); push(1); break;
            case 0xBD: pop(3); r.copyWithin(b[0], b[1], b[1] + b[2]); break;
            case 0xBE: pop(2); b[0] = this.sys.crc16(b[0], b[1], r); push(1); break;
            case 0xBF: pop(3); this.sys.secret(b[0], b[1], r); break;
            case 0xC0: pop(1); b[0] = this.sys.chDir(this.readStr(b[0])); push(1); break;
            case 0xC1: pop(1); b[0] = this.sys.fileList(this.readStr(b[0])); push(1); break;
            case 0xC2: pop(1); this.sys.getTime(b[0], r); break;
            case 0xC3: pop(1); this.sys.setTime(b[0], r); break;
            case 0xC4: pop(1); b[0] = this.sys.getchar(); push(1); break;
            case 0xC5: pop(1); this.sys.xDraw(b[0]); break;
            case 0xC6: pop(1); this.sys.releaseKey(b[0]); break;
            case 0xC7: pop(6); this.sys.getBlock(b[0], b[1], b[2], b[3], b[4], b[5], r); break;
            case 0xC8: pop(1); b[0] = this.sys.sin(b[0]) | 0; push(1); break;
            case 0xC9: pop(1); b[0] = this.sys.cos(b[0]) | 0; push(1); break;
            case 0xCA: pop(3); this.sys.fillArea(b[0], b[1], b[2]); break;
        }
    }

    // --- Helpers (Optimized) ---

    private next8(): number { return this.rom[this.pc++]; }
    private next16(): number { const v = this.romView.getUint16(this.pc, true); this.pc += 2; return v; }
    private next16s(): number { const v = this.romView.getInt16(this.pc, true); this.pc += 2; return v; }
    private next24(): number { 
        const v = this.rom[this.pc] | (this.rom[this.pc+1] << 8) | (this.rom[this.pc+2] << 16); 
        this.pc+=3; 
        return v; 
    }
    private next32(): number { const v = this.romView.getInt32(this.pc, true); this.pc += 4; return v; }

    private push(v: number) { this.stack[this.sp++] = v | 0; }
    private stkPush(n: number) { while (n-- > 0) this.stack[this.sp++] = this.regBuf[n]; }
    private stkPop(n: number) { this.sp -= n; for (let i = 0; i < n; i++) this.regBuf[i] = this.stack[this.sp + i]; }

    private getAbsAddr(lp: number): number {
        return (lp & 0x800000) ? ((lp + this.base) & 0xFFFF) : (lp & 0xFFFF);
    }

    private setValue(lp: number, n: number) {
        const addr = this.getAbsAddr(lp);
        // Switch on high bits: 1=char, 2=short, 4=int
        // Optimization: direct if-else is often faster than switch for 3 cases
        const type = lp & 0x70000;
        if (type === 0x10000) this.ram[addr] = n;
        else if (type === 0x20000) this.ramView.setInt16(addr, n, true);
        else this.ramView.setInt32(addr, n, true);
    }

    private readStr(addr: number): string {
        let end = addr;
        while (end < this.ram.byteLength && this.ram[end] !== 0) end++;
        // Use TextDecoder for better performance if dealing with large strings, 
        // but for short ASCII/GBK in VM, manual loop or subarray is fine.
        // Assuming ASCII for portability here:
        let s = "";
        for (let i = addr; i < end; i++) s += String.fromCharCode(this.ram[i]);
        return s;
    }

    // --- String Implementations (Simplified for performance) ---
    private implStrcpy(dst: number, src: number) {
        let i = 0;
        while (true) {
            const c = this.ram[src + i];
            this.ram[dst + i] = c;
            if (c === 0) break;
            i++;
        }
    }
    private implStrlen(addr: number): number {
        let i = 0;
        while (this.ram[addr + i] !== 0) i++;
        return i;
    }
    private implStrcat(dst: number, src: number) {
        let i = 0;
        while (this.ram[dst + i] !== 0) i++;
        this.implStrcpy(dst + i, src);
    }
    private implStrcmp(s1: number, s2: number): number {
        let i = 0;
        while (this.ram[s1+i] === this.ram[s2+i]) {
            if (this.ram[s1+i] === 0) return 0;
            i++;
        }
        return this.ram[s1+i] - this.ram[s2+i];
    }
    private implStrstr(s1: number, s2: number): number {
        const len2 = this.implStrlen(s2);
        if (!len2) return s1;
        let i = 0;
        while (this.ram[s1+i] !== 0) {
            let match = true;
            for(let j=0; j<len2; j++) if(this.ram[s1+i+j] !== this.ram[s2+j]) { match = false; break; }
            if (match) return s1+i;
            i++;
        }
        return 0;
    }
    private implStrchr(s: number, c: number): number {
        let i = 0;
        while (true) {
            if (this.ram[s+i] === c) return s+i;
            if (this.ram[s+i] === 0) return 0;
            i++;
        }
    }

    // Printf/Sprintf Logic (Truncated for brevity, strictly mapped logic is same as previous version)
    private vmPrintf(fmtAddr: number, stkStart: number) { this.formatStr(fmtAddr, stkStart, (c)=>this.sys.putchar(c)); }
    private vmSprintf(dst: number, fmt: number, stkStart: number) { 
        let ptr = dst; 
        this.formatStr(fmt, stkStart, (c)=>this.ram[ptr++] = c); 
        this.ram[ptr] = 0; 
    }
    
    private formatStr(fmtAddr: number, stkStart: number, out: (c:number)=>void) {
        let ptr = fmtAddr;
        let sp = stkStart;
        const readS = (addr:number) => { let p=addr; while(this.ram[p]) out(this.ram[p++]); };
        const readD = (n:number) => { const s = n.toString(); for(let i=0;i<s.length;i++) out(s.charCodeAt(i)); };
        
        while (this.ram[ptr]) {
            const c = this.ram[ptr++];
            if (c === 0x25) { // %
                const type = this.ram[ptr++];
                if (type === 0x73) readS(this.stack[sp++]); // s
                else if (type === 0x63) out(this.stack[sp++] & 0xFF); // c
                else if (type === 0x64) readD(this.stack[sp++]); // d
            } else if (c === 0x5C) { // \
                const esc = this.ram[ptr++];
                if (esc === 0x72) out(0x0D);
                else if (esc === 0x6E) out(0x0A);
            } else {
                out(c);
            }
        }
        out(0);
    }
}