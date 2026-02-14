# LavStudio 已知问题追踪

> 所有问题按优先级排序，修复后标记为 ✅ 并注明修复版本

---

## 🔴 P0 - 阻塞性问题（导致崩溃或无法使用）

### VM-001: 栈下溢无保护
- **状态**: ❌ 未修复
- **模块**: VM (`src/vm.ts`)
- **现象**: 程序莫名其妙退出，无错误信息
- **原因**: `pop()` 在栈空时返回 `lastValue` 而不是抛出错误
- **代码位置**: 
```typescript
public pop(): number {
  if (this.sp <= 0) {
    if (this.debug) this.onLog(`[VM Warning] Stack Underflow...`);
    return this.lastValue;  // ← 应该抛出错误
  }
  // ...
}
```
- **修复方案**: 
```typescript
public pop(): number {
  if (this.sp <= 0) {
    throw new Error(`Stack Underflow at PC=0x${(this.pc - 1).toString(16)}`);
  }
  // ...
}
```
- **测试验证**: 运行 `tests/repro_underflow.ts`

---

### GFX-001: 绘图缓冲区规则实现错误
- **状态**: ❌ 未修复
- **模块**: GraphicsEngine, SyscallHandler
- **现象**: 图形不显示或显示到错误位置
- **根本原因**: 各函数 mode 参数的 bit 6 含义**确实不同**，但当前实现可能混淆了这些规则

**根据文档的正确规则表**:

| 函数 | bit 6 = 0 | bit 6 = 1 | 备注 |
|------|-----------|-----------|------|
| Point | 直接屏幕 | 图形缓冲区 | bit 6 控制目标 |
| Line | 直接屏幕 | 图形缓冲区 | bit 6 控制目标 |
| Box/Circle/Ellipse | (未提及) | (未提及) | 可能只支持 GBUF |
| Block | (未提及) | (未提及) | 文档未说明 |
| Rectangle | (未提及) | (未提及) | 文档未说明 |
| TextOut | **图形缓冲区** | **直接屏幕** | **bit 6 相反！** |
| WriteBlock | 图形缓冲区 | 直接屏幕 | bit 6 相反！ |
| GetBlock | 从图形缓冲区取 | 从屏幕取 | type=0 或 0x40 |

- **关键点**:
  1. Point、Line: bit 6 = 0 → 屏幕, bit 6 = 1 → GBUF
  2. TextOut、WriteBlock: bit 6 = 0 → GBUF, bit 6 = 1 → 屏幕（相反！）
  3. GetBlock: 使用 type 值 0 或 0x40 区分来源

- **修复方案**: 为每个函数实现正确的 mode 解析逻辑
```typescript
// GraphicsEngine.ts 中每个函数应独立处理 mode
// 示例：
function setPixel(x, y, color, mode) {
  const toGBUF = (mode & 0x40) !== 0;  // Point/Line 规则
  // ...
}

function drawText(x, y, str, mode) {
  const toScreen = (mode & 0x40) !== 0;  // TextOut 规则相反！
  // ...
}
```
- **测试验证**: 运行 `tests/verify_graphics_rules.ts`

---

## 🟡 P1 - 高优先级（影响功能完整性）

### DC-001: 反编译器无法处理数组定义
- **状态**: ❌ 未修复
- **模块**: Decompiler (`src/decompiler.ts`)
- **现象**: 反编译后的源码缺少变量声明和数组定义
- **原因**: 当前是栈式反编译，无控制流分析
- **当前输出示例**:
```c
// 输入
int arr[5] = {1, 2, 3, 4, 5};

// 反编译输出（错误）
// 缺少数组定义
var_at_8192 = 1;  // 无意义的变量名
var_at_8196 = 2;
// ...
```
- **修复方案**: 重写为控制流分析型反编译器
  1. 识别基本块和函数边界
  2. 识别变量生命周期
  3. 恢复类型信息
  4. 生成可编译的 C 代码

---

### CMP-001: 生成的 LAV 在正式 VM 上无法运行
- **状态**: ❌ 待调查
- **模块**: Compiler, Assembler
- **现象**: 编译生成的 .lav 文件在文曲星真机或官方模拟器上无法运行
- **可能原因**:
  - [ ] 文件头格式差异
  - [ ] 字节序问题
  - [ ] 某些指令实现差异
  - [ ] 内存布局不同
- **调查步骤**:
  1. 对比原始文曲星文件的 hex dump
  2. 检查入口地址计算
  3. 验证指令编码
- **测试文件**: `examples/boshi.c`（博士失踪记游戏）

---

### VM-002: 栈溢出检查不完整
- **状态**: ❌ 未修复
- **模块**: VM (`src/vm.ts`)
- **现象**: 递归太深时可能破坏内存
- **代码位置**: `push()` 方法
- **修复方案**: 添加栈上限检查

---

## 🟢 P2 - 中优先级（影响体验）

### CMP-002: 结构体支持不完善
- **状态**: ❌ 未修复
- **模块**: Compiler
- **现象**: struct 定义和访问有问题
- **当前状态**: 基本未实现

---

### CMP-003: 浮点数字面量处理不完整
- **状态**: ❌ 未修复
- **模块**: Compiler
- **现象**: 编译时浮点数处理不正确

---

### CMP-004: 复杂表达式解析错误
- **状态**: ❌ 未修复
- **模块**: Compiler
- **现象**: 某些复杂嵌套表达式解析失败

---

### GFX-002: 中文字体渲染问题
- **状态**: ⚠️ 部分修复
- **模块**: GraphicsEngine
- **现象**: 中文显示可能有乱码或位置偏移
- **依赖**: 需要 `fonts.dat` 文件

---

### VM-003: 浮点运算精度差异
- **状态**: ⚠️ 已知
- **模块**: VM
- **现象**: 与原生 LavaX 浮点行为可能有差异
- **原因**: JavaScript 浮点数 vs 原生实现

---

## ✅ 已修复问题

### ~~VM-101: main 函数入口点错误~~
- **状态**: ✅ 已修复 (2026-02-11)
- **修复内容**: 
  - 之前: `CALL main` + `RET`，导致 main 返回到无效地址
  - 现在: `JMP main` + `EXIT`，main 直接作为程序入口

### ~~VM-102: 栈帧计算错误~~
- **状态**: ✅ 已修复 (2026-02-11)
- **修复内容**:
  - 之前: `frameSize = localVarsSize + 5`，未考虑参数空间
  - 现在: `frameSize = 5 + (params.length * 4) + localVarsSize`

### ~~ASM-101: 标签格式错误~~
- **状态**: ✅ 已修复 (2026-02-11)
- **修复内容**:
  - 之前: 标签有尾随空格（如 `L_ELSE_0 : `）
  - 现在: 正确格式（如 `L_ELSE_0:`）

---

## 🎯 修复优先级建议

### 第一阶段：稳定性（立即）
1. VM-001: 栈下溢保护
2. GFX-001: 绘图缓冲区规则

### 第二阶段：功能完整性（本周）
3. DC-001: 反编译器重写
4. CMP-001: LAV 兼容性调查

### 第三阶段：完善（后续）
5. VM-002: 栈溢出保护
6. CMP-002: 结构体支持
7. 其他编译器改进

---

## 🧪 回归测试清单

修复后需要验证的测试用例：
- [ ] `tests/simple_test.ts` - 基础功能
- [ ] `tests/verify_fix.ts` - 修复验证
- [ ] `tests/verify_graphics_rules.ts` - 绘图规则
- [ ] `tests/test_syscalls.ts` - 系统调用
- [ ] `examples/boshi.c` - 完整游戏
- [ ] 闭环测试：源码 → 编译 → 运行 → 反编译 → 编译 → 运行

---
*最后更新：2026-02-14*
