# LavStudio 模块接口规范

> 各模块的内部实现细节**不应**依赖其他模块的实现，只应通过接口交互

---

## 1. 编译器模块 (Compiler)

**文件**: `src/compiler.ts`

### 职责
将 LavaX C 源码编译为汇编中间代码

### 核心接口
```typescript
export class LavaXCompiler {
    /**
     * 编译 C 源码为汇编代码
     * @param source LavaX C 源码
     * @returns 汇编代码字符串，或 "ERROR: ..." 错误信息
     */
    compile(source: string): string;
}
```

### 输入格式
- LavaX C 子集（类似 C 语言）
- 支持的类型：`int`, `char`, `long`, `void`, `addr`
- 支持指针、数组、函数

### 输出格式
- 汇编中间代码（文本格式）
- 每行一条指令或标签
- 例如：`PUSH_B 10`, `CALL foo`, `L_0:`

### 依赖模块
- **无**（纯文本处理）

### 已知限制
- 结构体支持不完整
- 浮点数字面量处理不完整
- 复杂嵌套表达式可能解析错误

---

## 2. 汇编器模块 (Assembler)

**文件**: `src/compiler/LavaXAssembler.ts`

### 职责
将汇编中间代码转换为 LAV 字节码

### 核心接口
```typescript
export class LavaXAssembler {
    /**
     * 汇编汇编代码为 LAV 字节码
     * @param asm 汇编代码字符串
     * @returns LAV 字节码 (Uint8Array)
     * @throws 汇编错误时抛出异常
     */
    assemble(asm: string): Uint8Array;
}
```

### 输入格式
- 汇编中间代码（Compiler 的输出）
- 支持的指令：见 `docs/lav_format.md`

### 输出格式
- LAV 字节码（二进制格式）
- 16 字节文件头 + 代码段

### 文件头结构（16 bytes）
| 偏移 | 大小 | 说明 |
|------|------|------|
| 0x00 | 3 | 魔数 'LAV' |
| 0x03 | 1 | 版本号 0x12 |
| 0x05 | 1 | 内存限制标记 0x74/0x80 |
| 0x08 | 3 | 入口地址（24-bit） |

### 依赖模块
- **无**（纯文本/二进制处理）

---

## 3. 虚拟机模块 (VM)

**文件**: `src/vm.ts`

### 职责
执行 LAV 字节码，提供程序运行环境

### 核心接口
```typescript
export class LavaXVM {
    /** 内存（1MB） */
    memory: Uint8Array;
    /** 栈 */
    stk: Int32Array;
    /** 栈指针 */
    sp: number;
    /** 是否正在运行 */
    running: boolean;
    /** 调试模式（打印每条指令） */
    debug: boolean;
    
    constructor(vfsDriver?: VFSStorageDriver);
    
    /**
     * 加载 LAV 字节码
     * @param lav LAV 字节码
     */
    load(lav: Uint8Array): void;
    
    /**
     * 运行程序
     */
    run(): Promise<void>;
    
    /**
     * 停止程序
     */
    stop(): void;
    
    /**
     * 重置状态
     */
    reset(): void;
    
    /**
     * 压栈操作
     */
    push(val: number): void;
    
    /**
     * 出栈操作
     * @returns 栈顶值
     * @throws 栈下溢时应抛出错误
     */
    pop(): number;
    
    /** 屏幕更新回调 */
    onUpdateScreen: (imageData: ImageData) => void;
    /** 日志回调 */
    onLog: (msg: string) => void;
    /** 程序结束回调 */
    onFinished: () => void;
}
```

### 内存布局
```
0x0000 - 0x063F: VRAM (160x80 屏幕数据)
0x0640 - 0x0C7F: GBUF (绘图缓冲区)
0x0C80 - 0x0FFF: TEXT (文本缓冲区)
0x2000+       : 全局变量
```

### 依赖模块
- **GraphicsEngine**: 绘图操作
- **SyscallHandler**: 系统调用
- **VirtualFileSystem**: 文件操作

### 已知问题
- `pop()` 在栈空时不报错（应抛出异常）
- 栈溢出检查可能不完整

---

## 4. 图形引擎模块 (GraphicsEngine)

**文件**: `src/vm/GraphicsEngine.ts`

### 职责
处理所有图形绘制操作

### 核心接口
```typescript
export class GraphicsEngine {
    constructor(
        memory: Uint8Array,
        onUpdateScreen: (imageData: ImageData) => void
    );
    
    // 基本绘图
    setPixel(x: number, y: number, color: number, mode: number): void;
    getPixel(x: number, y: number, mode: number): number;
    
    // 图形绘制
    drawLine(x1: number, y1: number, x2: number, y2: number, mode: number): void;
    drawCircle(xc: number, yc: number, r: number, mode: number): void;
    drawFillCircle(xc: number, yc: number, r: number, mode: number): void;
    drawBox(x: number, y: number, w: number, h: number, mode: number): void;
    drawFillBox(x: number, y: number, w: number, h: number, mode: number): void;
    drawEllipse(xc: number, yc: number, rx: number, ry: number, fill: boolean, mode: number): void;
    
    // 文本绘制
    drawText(x: number, y: number, bytes: Uint8Array, size: number, mode: number): void;
    drawChar(x: number, y: number, code: number, size: number, mode: number): void;
    drawChinese(x: number, y: number, b1: number, b2: number, size: number, mode: number): void;
    
    // 缓冲区操作
    flushScreen(): void;
    clearVRAM(): void;
    clearGraphBuffer(): void;
    fullReset(): void;
}
```

### Mode 参数规范
- **bit 0-2**: 绘图模式（0=清除, 1=设置, 2=取反, 3=或, 4=与, 5=异或）
- **bit 3**: 反转标志
- **bit 6**: 缓冲区选择（需要统一！）
  - 0x00-0x3F: VRAM
  - 0x40-0x7F: GBUF
  - 0x80-0xBF: VRAM（带 0x80 字体大小标志）

### 依赖模块
- **无**（纯内存操作）

### 已知问题
- 各函数对 bit 6 的处理不一致
- TextOut 的规则与其他函数相反

---

## 5. 系统调用处理器 (SyscallHandler)

**文件**: `src/vm/SyscallHandler.ts`

### 职责
处理所有系统调用（0x80-0xFF）

### 核心接口
```typescript
export class SyscallHandler {
    constructor(vm: LavaXVM);
    
    /**
     * 同步处理系统调用
     * @param op 系统调用操作码 (0x80-0xFF)
     * @returns 返回值（如果有），undefined 表示需要等待输入，null 表示无返回值
     */
    handleSync(op: number): number | null | undefined;
}
```

### 系统调用分类
- **I/O**: putchar, getchar, printf, sprintf
- **字符串**: strcpy, strlen, strcat, strcmp
- **图形**: SetScreen, Refresh, TextOut, Line, Circle, etc.
- **文件**: fopen, fclose, fread, fwrite, fseek
- **输入**: Inkey, CheckKey, GetPoint
- **数学**: abs, rand, Sin, Cos

### 依赖模块
- **GraphicsEngine**: 图形相关调用
- **VirtualFileSystem**: 文件相关调用

---

## 6. 反编译器模块 (Decompiler)

**文件**: `src/decompiler.ts`

### 职责
将 LAV 字节码反编译为汇编或 C 源码

### 核心接口
```typescript
export class LavaXDecompiler {
    /**
     * 反汇编为汇编代码
     * @param lav LAV 字节码
     * @returns 汇编代码字符串
     */
    disassemble(lav: Uint8Array): string;
    
    /**
     * 反编译为 C 源码（实验性）
     * @param lav LAV 字节码
     * @returns C 源码字符串
     */
    decompile(lav: Uint8Array): string;
}
```

### 当前限制
- `disassemble`: 只能生成汇编，无法识别函数边界
- `decompile`: 只是简单的栈模拟，无法恢复：
  - 变量声明
  - 数组定义
  - 函数定义
  - 高级控制流

### 需要实现
- 控制流分析（识别基本块、循环、条件）
- 数据流分析（恢复变量类型和作用域）
- 结构恢复（识别数组、结构体）

### 依赖模块
- **无**（纯分析）

---

## 7. 虚拟文件系统 (VFS)

**文件**: `src/vm/VirtualFileSystem.ts`

### 职责
提供文件操作的抽象层

### 核心接口
```typescript
export class VirtualFileSystem {
    constructor(driver?: VFSStorageDriver);
    
    /** 添加文件 */
    addFile(name: string, data: Uint8Array): void;
    
    /** 打开文件 */
    openFile(name: string, mode: string): number;  // 返回文件句柄
    
    /** 关闭文件 */
    closeFile(fd: number): void;
    
    /** 读文件 */
    readFile(fd: number, buffer: Uint8Array, size: number): number;
    
    /** 写文件 */
    writeFile(fd: number, buffer: Uint8Array, size: number): number;
    
    /** 定位 */
    seekFile(fd: number, offset: number, whence: number): number;
    
    /** 清除所有句柄 */
    clearHandles(): void;
}
```

### 依赖模块
- **VFSStorageDriver**（可选）: 持久化存储

---

## 模块依赖图

```
Compiler ──> Assembler ──> LAV Bytecode
                              ↓
                         VM (核心)
                          ├─ GraphicsEngine
                          ├─ SyscallHandler
                          │     └─ GraphicsEngine
                          │     └─ VirtualFileSystem
                          └─ VirtualFileSystem
                              
Decompiler <── LAV Bytecode (独立模块)
```

---
*最后更新：2026-02-14*
