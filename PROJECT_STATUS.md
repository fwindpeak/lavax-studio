# 🌋 LavStudio 项目状态文档

> 文档生成时间: 2026-02-11
> 项目路径: /Users/guokai/code/myprj/LavStudio

---

## 📋 项目概述

LavStudio 是一个基于 Web 的 LavaX 平台集成开发环境 (IDE) 和模拟器。LavaX 是一种面向经典电子词典（如文曲星/WQX）的跨平台高级语言，类似于 C 语言。

### 核心功能模块

1. **LavaX 编译器** (`src/compiler.ts`) - 将类 C 源码编译为汇编中间码
2. **汇编器** (`src/compiler/LavaXAssembler.ts`) - 将汇编中间码编译为 .lav 二进制文件
3. **虚拟机** (`src/vm.ts`) - 32位栈式虚拟机，执行 .lav 文件
4. **反编译器** (`src/decompiler.ts`) - 将 .lav 文件反编译为汇编和源码
5. **Web IDE** (`src/index.tsx`) - React 开发的集成开发环境

---

## ✅ 已实现功能

### 1. 编译器 (`src/compiler.ts`)
- [x] 基础 C 语法解析（变量声明、函数定义）
- [x] 算术运算（+、-、*、/、%、&、|、^、~、<<、>>）
- [x] 逻辑运算（&&、||、!）
- [x] 比较运算（==、!=、>、<、>=、<=）
- [x] 条件语句（if-else）
- [x] 循环语句（while、for）
- [x] 跳转语句（break、goto）
- [x] 自增自减（++、--，前缀和后缀）
- [x] 数组声明和访问（支持多维数组）
- [x] 指针基础支持（取地址 &、解引用 *）
- [x] 复合赋值运算符（+=、-= 等）
- [x] #define 宏定义预处理
- [x] 字符串初始化（支持 GBK 编码）
- [x] 数组初始化列表

### 2. 汇编器 (`src/compiler/LavaXAssembler.ts`)
- [x] 汇编指令到字节码的转换
- [x] 标签解析和地址计算
- [x] LAV 文件头生成（16字节标准头）
- [x] 字符串编码（GBK）
- [x] INIT 数据初始化指令

### 3. 虚拟机 (`src/vm.ts`)
- [x] 完整的指令集实现（0x00-0x68 基础指令）
- [x] 系统调用支持（0x80-0xDF，共96个系统调用）
- [x] 栈帧管理（CALL/RET/FUNC）
- [x] 全局/局部变量寻址
- [x] 数组索引寻址
- [x] 浮点运算支持（F_ADD、F_SUB、F_MUL、F_DIV 等）
- [x] 内存布局模拟（VRAM、GBUF、TEXT 区域）
- [x] 字符串掩码解密（V3.0 特性）

### 4. 图形引擎 (`src/vm/GraphicsEngine.ts`)
- [x] 160x80 黑白屏幕模拟
- [x] 基本绘图原语（Point、Line、Circle、Rectangle、Box、Ellipse）
- [x] 文字输出（TextOut）
- [x] 屏幕刷新（Refresh、ClearScreen）
- [x] 块操作（Block、WriteBlock、GetBlock）

### 5. 系统调用处理 (`src/vm/SyscallHandler.ts`)
- [x] 标准 I/O（printf、putchar、getchar、sprintf）
- [x] 字符串操作（strcpy、strlen、strcat、strcmp 等）
- [x] 内存操作（memcpy、memmove、memset）
- [x] 文件系统（fopen、fclose、fread、fwrite、fseek 等）
- [x] 图形操作（SetScreen、UpdateLCD、Locate）
- [x] 输入处理（Inkey、CheckKey、PutKey）
- [x] 数学函数（abs、rand、srand、Sin、Cos）
- [x] 字符分类（isalnum、isalpha、isdigit 等）
- [x] 时间函数（Delay、Getms）
- [x] 目录操作（opendir、readdir、closedir）

### 6. 虚拟文件系统 (`src/vm/VirtualFileSystem.ts`)
- [x] 内存中的文件存储
- [x] IndexedDB 持久化（通过 VFSStorageDriver）
- [x] 文件上传/下载
- [x] 目录遍历支持

### 7. Web IDE (`src/index.tsx`)
- [x] 多标签页编辑器
- [x] 代码/汇编/二进制视图切换
- [x] 语法高亮（基础实现）
- [x] 集成终端输出
- [x] 示例代码库
- [x] 文件管理器（VFS 集成）
- [x] 调试模式开关

### 8. 反编译器 (`src/decompiler.ts`)
- [x] 字节码反汇编
- [x] 标签识别
- [x] 基础源码恢复（实验性）

---

## ⚠️ 已知问题和限制

### 编译器问题
1. **结构体支持不完善** - struct 定义和访问有问题
2. **函数指针未实现** - 无法使用函数指针
3. **浮点数字面量** - 编译时浮点数处理不完整
4. **复杂表达式** - 某些复杂嵌套表达式可能解析错误
5. **类型转换** - 显式类型转换 (int)x 实现不完整
6. **引用类型** - LavaX 特有的引用类型(&)未实现

### 虚拟机问题
1. **栈溢出检查** - 需要更完善的栈边界检查
2. **内存越界** - 某些情况下可能访问非法内存地址
3. **浮点精度** - 与原生 LavaX 浮点行为可能有差异
4. **某些系统调用未完全实现** - 如 PlayFile、PlayWordVoice 等音频相关

### IDE 问题
1. **中文输入** - 编辑器中文输入体验待优化
2. **语法高亮** - 需要更完善的 LavaX 语法高亮
3. **调试功能** - 缺少断点、单步执行等调试功能
4. **错误定位** - 编译错误行号定位不够精确

### 文档和示例
1. **示例程序** - 需要更多完整的示例程序
2. **API 文档** - 系统调用文档需要完善
3. **教程** - 缺少新手入门教程

---

## 🎯 目标优先级

### 🔴 高优先级（核心功能完善）
1. **修复编译器结构体支持** - 使结构体能正确定义和访问
2. **完善错误处理** - 更好的错误信息和定位
3. **栈安全** - 添加栈溢出/下溢保护
4. **测试覆盖** - 为核心模块添加单元测试

### 🟡 中优先级（功能增强）
1. **调试器功能** - 断点、单步执行、变量查看
2. **代码补全** - IDE 智能提示
3. **更多示例程序** - 特别是完整的游戏示例
4. **性能优化** - 虚拟机执行效率优化

### 🟢 低优先级（锦上添花）
1. **主题切换** - 支持亮色/暗色主题
2. **代码格式化** - 自动代码格式化
3. **导入/导出项目** - 支持项目级别的导入导出
4. **多语言支持** - IDE 界面国际化

---

## 📁 项目结构

```
LavStudio/
├── src/
│   ├── vm.ts                    # 虚拟机核心实现
│   ├── compiler.ts              # C-to-ASM 编译器
│   ├── decompiler.ts            # 反编译器
│   ├── types.ts                 # 类型定义和常量
│   ├── index.tsx                # 主 UI (React)
│   ├── index.css                # 全局样式
│   ├── compiler/
│   │   └── LavaXAssembler.ts    # 汇编器
│   ├── vm/
│   │   ├── GraphicsEngine.ts    # 图形引擎
│   │   ├── SyscallHandler.ts    # 系统调用处理
│   │   ├── VirtualFileSystem.ts # 虚拟文件系统
│   │   └── VFSStorageDriver.ts  # 存储驱动
│   ├── components/              # React 组件
│   │   ├── Editor.tsx           # 代码编辑器
│   │   ├── Device.tsx           # 设备模拟器
│   │   ├── FileManager.tsx      # 文件管理器
│   │   ├── SoftKeyboard.tsx     # 软键盘
│   │   ├── Terminal.tsx         # 终端
│   │   └── dialogs/             # 对话框组件
│   ├── hooks/
│   │   └── useLavaVM.ts         # VM Hook
│   └── vst/
│       └── LavParser.ts         # VST 解析器
├── tests/                       # 测试文件
│   ├── simple_test.ts           # 基础测试
│   ├── test_vm_ops.ts           # VM 操作测试
│   ├── test_linkage.ts          # 链接测试
│   ├── test_syscalls.ts         # 系统调用测试
│   ├── test_errors.ts           # 错误处理测试
│   ├── verify_fix.ts            # 修复验证
│   ├── full_test.ts             # 综合测试
│   └── ...
├── examples/                    # 示例代码
│   ├── boshi.c                  # 《博士失踪记》游戏源码
│   ├── fulltest.c               # 综合测试程序
│   └── test_ptr_arg.c           # 指针参数测试
├── docs/                        # 文档
│   ├── lav_format.md            # LAV 文件格式规范
│   ├── LavaX-docs.md            # LavaX 语言手册
│   ├── target.md                # 项目目标
│   └── ref_prjs/                # 参考项目
│       ├── 编译器/               # 原始编译器资料
│       ├── MyGVM/               # C++ 参考实现
│       └── star_lav/            # JS 参考实现
├── public/
│   └── fonts.dat                # 字体数据
├── package.json                 # 项目配置
├── vite.config.ts               # Vite 配置
├── tsconfig.json                # TypeScript 配置
└── README.md / README_CN.md     # 项目说明
```

---

## 🔧 技术栈

- **框架**: React 18.2.0
- **构建工具**: Vite 6.2.0
- **包管理器**: Bun
- **样式**: Tailwind CSS 4.1.18
- **图标**: Lucide React
- **编码**: iconv-lite (GBK 支持)
- **语言**: TypeScript 5.8.2

---

## 🚀 运行项目

```bash
# 安装依赖
bun install

# 开发模式
bun run dev

# 构建
bun run build

# 预览
bun run preview
```

---

## 📝 测试

```bash
# 运行简单测试
bun run test:simple

# 运行编译器测试
bun run test:compiler

# 运行 VM 测试
bun run test:vm
```

---

## 🐛 最近的修复

### 2026-02-11 重大修复

1. **函数调用修复** - 修复了 main 函数的入口点生成
   - 之前: `CALL main` + `RET`，导致 main 尝试返回到无效地址
   - 现在: `JMP main` + `EXIT`，main 直接作为程序入口

2. **栈帧计算修复** - 修复了 FUNC 指令的 frameSize 计算
   - 之前: `frameSize = localVarsSize + 5`，没有考虑参数空间
   - 现在: `frameSize = 5 + (params.length * 4) + localVarsSize`，正确包含参数和局部变量

3. **标签生成修复** - 修复了编译器生成的汇编标签格式
   - 之前: 所有标签和指令都有尾随空格（如 `L_ELSE_0 : `），导致汇编器无法正确识别标签
   - 现在: 正确格式（如 `L_ELSE_0:`），汇编器能正确解析

4. **FUNC 指令修复** - 修复了 VM 中 FUNC 指令的 base2 计算
   - 之前: `base2 += frameSize`（累加）
   - 现在: `base2 = base + frameSize`（正确设置）

5. **栈平衡修复** - 修复了系统调用后栈不平衡的问题
6. **sprintf 修复** - 修复了 sprintf 导致的栈损坏
7. **数组初始化** - 修复了隐式维度数组的初始化问题
8. **复合赋值** - 修复了 +=、-= 等复合赋值运算符

---

## 📚 参考资料

1. [LavaX 语言编程手册](docs/LavaX-docs.md)
2. [LAV 文件格式与指令集全手册](docs/lav_format.md)
3. [原始编译器资料](docs/ref_prjs/编译器/)
4. [MyGVM C++ 实现](docs/ref_prjs/MyGVM/)

---

## 💡 下一步建议

1. **立即修复**: 结构体支持是最高优先级，很多实际程序需要它
2. **测试完善**: 建立自动化测试套件，确保每次修改不会破坏现有功能
3. **示例程序**: 完成《博士失踪记》的移植，作为展示项目
4. **文档完善**: 编写用户手册和开发文档

---

*文档由 AI 助手生成，如有遗漏请以实际代码为准。*
