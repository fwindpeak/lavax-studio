# LavStudio AI 文档索引

> **优先读取顺序**：AI 处理 LavStudio 相关任务时，按以下顺序读取文档

## 📖 文档结构

```
docs/
├── ai/
│   ├── INDEX.md              ← 你在这里（入口文档）
│   ├── QUICK_START.md        ← 快速参考（处理问题时先读）
│   ├── MODULE_INTERFACES.md  ← 模块接口规范
│   ├── KNOWN_ISSUES.md       ← 已知问题追踪
│   └── TEST_CASES.md         ← 测试用例集
├── lav_format.md             ← LAV 字节码格式规范
├── LavaX-docs.md             ← LavaX 语言手册
└── PROJECT_STATUS.md         ← 项目整体状态
```

## 🎯 使用指南

### 场景 1：修复特定模块问题
1. 先读 `QUICK_START.md` 了解当前状态
2. 读 `KNOWN_ISSUES.md` 查看是否已知问题
3. 读 `MODULE_INTERFACES.md` 查看目标模块接口
4. 按需读取具体实现代码

### 场景 2：实现新功能
1. 读 `MODULE_INTERFACES.md` 了解模块边界
2. 查看相关模块的接口定义
3. 实现后更新 `TEST_CASES.md`

### 场景 3：调试运行问题
1. 读 `QUICK_START.md` 的「调试技巧」
2. 读 `KNOWN_ISSUES.md` 的「常见问题」
3. 使用 `TEST_CASES.md` 的测试用例验证

## 🔧 模块概览

| 模块 | 文件路径 | 职责 | 状态 |
|------|----------|------|------|
| **Compiler** | `src/compiler.ts` | C 源码 → 汇编中间码 | ⚠️ 数组/结构体问题 |
| **Assembler** | `src/compiler/LavaXAssembler.ts` | 汇编 → LAV 字节码 | ✅ 基本稳定 |
| **VM** | `src/vm.ts` | 执行 LAV 字节码 | ⚠️ 栈下溢保护缺失 |
| **Graphics** | `src/vm/GraphicsEngine.ts` | 绘图函数实现 | ⚠️ 缓冲区规则混乱 |
| **Syscall** | `src/vm/SyscallHandler.ts` | 系统调用处理 | ✅ 基本完整 |
| **Decompiler** | `src/decompiler.ts` | LAV → 汇编/源码 | ❌ 需重写 |
| **VFS** | `src/vm/VirtualFileSystem.ts` | 虚拟文件系统 | ✅ 可用 |

## 🚨 关键限制（AI 注意）

1. **上下文限制**：不要一次性读取多个模块的实现细节
2. **接口优先**：优先通过接口理解模块，而非实现
3. **测试驱动**：修改后必须更新/添加测试用例
4. **闭环验证**：确保 源码→编译→运行→反编译→源码 完整流程

## 📚 外部参考

- LAV 格式规范：`docs/lav_format.md`
- LavaX 语言手册：`docs/LavaX-docs.md`
- 原始资料：`docs/ref_prjs/`

---
*最后更新：2026-02-14*
