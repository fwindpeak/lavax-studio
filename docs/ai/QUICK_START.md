# LavStudio 快速参考

> 处理问题时**优先读取**本文档

## 🎯 当前核心问题（按优先级）

### P0 - 阻塞性问题（立即修复）
1. **VM 栈下溢保护** ✅ 已修复
   - 现象：程序莫名其妙退出
   - 修复：`pop()` 现在会在栈空时抛出错误
   - 错误信息：`Stack Underflow at PC=0xXXXX`

2. **绘图函数 mode 参数** ⚠️ 待验证
   - 现象：图形不显示或显示到错误位置
   - 状态：代码实现看起来正确，需要测试验证
   - 测试：运行 `tests/verify_graphics_rules.ts`

### P1 - 高优先级
3. **反编译器改进** ⚠️ 部分完成
   - 现象：反编译后的源码缺少数组定义
   - 已改进：变量收集、数组识别、函数边界、指令处理
   - 待完善：控制流分析（if/else/while/for）

4. **编译器生成的 LAV 兼容性问题**
   - 现象：生成的 .lav 在正式 VM 上无法运行
   - 可能原因：文件头格式、字节序、某些指令实现差异
   - 验证方法：对比原始文曲星文件的 hex dump

### P2 - 中优先级
5. **结构体支持不完善**
6. **浮点数字面量处理不完整**
7. **复杂表达式解析错误**

---

## 🔍 调试技巧

### 启用 VM 调试模式
```typescript
const vm = new LavaXVM();
vm.debug = true;  // 会打印每条指令的执行
```

### 运行测试用例
```bash
# 基础 VM 测试
bun run test:simple

# 绘图规则验证
bun run test:graphics

# 完整测试套件
bun run test:full
```

### 检查生成的汇编
```typescript
const compiler = new LavaXCompiler();
const asm = compiler.compile(source);
console.log(asm);  // 查看生成的汇编代码
```

### 验证 LAV 文件格式
```typescript
const fs = require('fs');
const lav = fs.readFileSync('test.lav');
console.log('Magic:', lav.slice(0, 3).toString('hex'));  // 应为 4c4156
console.log('Version:', lav[3]);  // 应为 18 (0x12)
console.log('Entry:', lav[8] | (lav[9] << 8) | (lav[10] << 16));  // 入口地址
```

---

## 🧪 关键测试用例

### 测试 1：栈边界检查
```c
void main() {
    int a;
    // 这里如果栈管理有问题会崩溃
    a = 123;
    printf("%d", a);
}
```

### 测试 2：绘图函数
```c
void main() {
    SetScreen(0);
    Line(0, 0, 159, 79, 1);     // 应该画到 VRAM
    Circle(80, 40, 30, 0, 1);   // 应该画到 VRAM
    Refresh();                   // 刷新显示
    getchar();
}
```

### 测试 3：数组定义和反编译闭环
```c
void main() {
    int arr[5] = {1, 2, 3, 4, 5};
    int i;
    for (i = 0; i < 5; i++) {
        printf("%d ", arr[i]);
    }
}
```
编译 → 运行 → 反编译 → 再次编译 → 运行（结果应一致）

---

## 📦 模块快速接口

### Compiler
```typescript
class LavaXCompiler {
    compile(source: string): string  // 返回汇编代码或 "ERROR: ..."
}
```

### Assembler
```typescript
class LavaXAssembler {
    assemble(asm: string): Uint8Array  // 返回 LAV 字节码
}
```

### VM
```typescript
class LavaXVM {
    load(lav: Uint8Array): void      // 加载 LAV 文件
    run(): Promise<void>             // 运行程序
    reset(): void                    // 重置状态
    debug: boolean                   // 启用调试输出
}
```

### Decompiler
```typescript
class LavaXDecompiler {
    disassemble(lav: Uint8Array): string  // 反汇编为汇编代码
    decompile(lav: Uint8Array): string    // 反编译为 C 源码（实验性）
}
```

---

## 🔄 闭环验证流程

```
C 源码 ──编译器──> 汇编代码 ──汇编器──> LAV 字节码
    ↑                                          ↓
    └────────反编译器（需完善）────────── 虚拟机执行
```

验证要点：
1. 编译不报错
2. VM 执行不崩溃
3. 反编译出的源码能再次编译
4. 重新编译后的程序行为一致

---

## 📝 常见错误代码

| 错误 | 可能原因 |
|------|----------|
| "Stack Overflow" | 递归太深或局部变量太多 |
| "Unknown opcode" | 遇到了未实现的指令 |
| "Invalid magic" | LAV 文件损坏或格式错误 |
| 图形不显示 | mode 参数 bit 6 设置错误 |
| 反编译后无法编译 | 反编译器丢失类型信息 |

---
*最后更新：2026-02-14*
