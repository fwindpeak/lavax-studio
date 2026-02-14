# LavStudio 测试用例集

> 所有测试用例按模块分类，包含输入、预期输出和验证方法

---

## 🧪 VM 测试

### VM-TEST-001: 栈操作基础
**文件**: `tests/test_vm_ops.ts`

```typescript
const vm = new LavaXVM();

// 测试 push/pop
vm.push(10);
vm.push(20);
assert(vm.pop() === 20);
assert(vm.pop() === 10);
assert(vm.sp === 0);
```

**预期**: 栈操作正确，SP 归零

---

### VM-TEST-002: 栈下溢检测
**文件**: `tests/repro_underflow.ts`

```c
void main() {
    // 会导致栈下溢的代码
    int a;
    // 某些操作...
}
```

**预期**: 抛出 "Stack Underflow" 错误，而不是默默返回 lastValue

---

### VM-TEST-003: 算术运算
**字节码**:
```
PUSH_B 5
PUSH_B 3
ADD
EXIT
```

**预期**: 栈顶 = 8

---

### VM-TEST-004: 比较运算
**文件**: `tests/verify_fix.ts::testGeLe`

**验证**:
- 5 >= 3 应该返回 1 (true)
- 3 >= 5 应该返回 0 (false)
- 3 <= 5 应该返回 1 (true)
- 5 <= 3 应该返回 0 (false)

---

## 🎨 图形测试

### GFX-TEST-001: Line 绘图规则
**文件**: `tests/verify_graphics_rules.ts`

```c
void main() {
    // Line 到 VRAM (bit 6 = 0)
    Line(0, 0, 159, 79, 1);      // mode = 1
    // 预期: VRAM 有数据, GBUF 无数据
    
    // Line 到 GBUF (bit 6 = 1)
    Line(0, 0, 159, 79, 0x41);   // mode = 0x41 (1 | 0x40)
    // 预期: GBUF 有数据
}
```

---

### GFX-TEST-002: TextOut 绘图规则
**文件**: `tests/verify_graphics_rules.ts`

```c
void main() {
    // TextOut 到 GBUF (bit 6 = 0)
    TextOut(20, 20, "Test", 1);      // mode = 1
    
    // TextOut 到 VRAM (bit 6 = 1)
    TextOut(20, 20, "Test", 0x41);   // mode = 0x41
}
```

**注意**: TextOut 的规则与其他函数相反！

---

### GFX-TEST-003: 完整绘图流程
**文件**: `test_drawing.ts`

```c
void main() {
    SetScreen(0);
    Line(0, 0, 159, 79, 1);
    Circle(80, 40, 30, 0, 1);
    Refresh();
    getchar();
}
```

**预期**: 屏幕上显示斜线和圆形

---

## 🔧 编译器测试

### CMP-TEST-001: 基础变量声明
**输入**:
```c
void main() {
    int a = 10;
    char b = 'x';
}
```

**预期输出** (汇编):
```
SPACE ...
PUSH_B 10
LEA_L_W ...
STORE
POP
```

---

### CMP-TEST-002: 数组声明和初始化
**输入**:
```c
void main() {
    int arr[5] = {1, 2, 3, 4, 5};
    int i;
    for (i = 0; i < 5; i++) {
        printf("%d ", arr[i]);
    }
}
```

**预期**: 
1. 编译成功
2. 运行输出: `1 2 3 4 5 `
3. 反编译后能恢复数组定义

---

### CMP-TEST-003: 函数调用
**输入**:
```c
int add(int a, int b) {
    return a + b;
}

void main() {
    int result = add(3, 5);
    printf("%d", result);
}
```

**预期**: 输出 `8`

---

### CMP-TEST-004: 指针操作
**输入**:
```c
void main() {
    int a = 10;
    int *p = &a;
    *p = 20;
    printf("%d", a);  // 应该输出 20
}
```

---

## 🔄 闭环测试

### LOOP-TEST-001: 简单程序闭环
**目标**: 验证 源码 → 编译 → 运行 → 反编译 → 编译 → 运行 的完整性

**步骤**:
1. **原始源码**:
```c
void main() {
    int i;
    for (i = 0; i < 3; i++) {
        printf("%d ", i);
    }
}
```

2. **编译为汇编**:
```typescript
const asm = compiler.compile(source1);
```

3. **汇编为 LAV**:
```typescript
const lav = assembler.assemble(asm);
```

4. **运行验证**:
```typescript
vm.load(lav);
await vm.run();  // 预期输出: "0 1 2 "
```

5. **反编译**:
```typescript
const source2 = decompiler.decompile(lav);
```

6. **再次编译和运行**:
```typescript
const asm2 = compiler.compile(source2);
const lav2 = assembler.assemble(asm2);
vm.load(lav2);
await vm.run();  // 预期输出: "0 1 2 "
```

**通过标准**: 两次运行的输出完全一致

---

### LOOP-TEST-002: 数组闭环
**目标**: 验证数组定义在闭环中的保持

**原始源码**:
```c
void main() {
    int arr[3] = {10, 20, 30};
    printf("%d %d %d", arr[0], arr[1], arr[2]);
}
```

**通过标准**: 
1. 反编译后的源码包含 `int arr[3] = {...}`
2. 重新编译后运行输出相同

**当前状态**: ❌ 反编译器无法恢复数组定义

---

## 📊 性能测试

### PERF-TEST-001: 递归深度
**输入**:
```c
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}

void main() {
    printf("%d", fib(10));
}
```

**预期**: 正确计算 fib(10) = 55

**边界**: 测试最大递归深度（栈溢出保护）

---

### PERF-TEST-002: 大量绘图操作
**输入**:
```c
void main() {
    int i;
    SetScreen(0);
    for (i = 0; i < 1000; i++) {
        Point(rand() % 160, rand() % 80, 1);
    }
    Refresh();
}
```

**预期**: 1000 个点在合理时间内绘制完成

---

## 🐛 回归测试

修复问题后，必须运行以下测试确保没有引入新问题：

```bash
# 运行所有测试
bun run test:all

# 或单独运行
bun run test:simple      # 基础测试
bun run test:vm          # VM 测试
bun run test:compiler    # 编译器测试
bun run test:graphics    # 图形测试
bun run test:syscalls    # 系统调用测试
bun run test:integration # 集成测试
```

---

## 📝 添加新测试用例

当添加新功能或修复 bug 时，请添加对应的测试用例：

1. 在 `tests/` 目录创建测试文件
2. 命名格式: `test_<功能>.ts` 或 `repro_<bug编号>.ts`
3. 包含清晰的输入、预期输出和验证方法
4. 更新本文档

---
*最后更新：2026-02-14*
