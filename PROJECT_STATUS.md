# 🌋 LavStudio 项目状态文档

> 文档更新时间: 2026-04-13
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
- [x] **初步结构体支持** (支持基础定义和成员访问)

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
- [x] **栈保护机制** (`pop()` 在栈空时返回 `lastValue` 以兼容特定编程模式)

### 4. 图形引擎 (`src/vm/GraphicsEngine.ts`)
- [x] 160x80 黑白屏幕模拟
- [x] 基本绘图原语（Point、Line、Circle、Rectangle、Box、Ellipse）
- [x] 文字输出（TextOut）
- [x] 屏幕刷新（Refresh、ClearScreen）
- [x] 块操作（Block、WriteBlock、GetBlock）
- [x] **调色板和多显存模式支持** (1-bit, 4-bit, 8-bit 模式)

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

---

## ⚠️ 已知问题和限制

### 编译器问题
1. **结构体嵌套支持缺失** - 无法在结构体中使用结构体作为成员
2. **函数指针未实现** - 无法使用函数指针
3. **浮点数字面量** - 编译时浮点数处理不完整
4. **复杂表达式** - 某些复杂嵌套表达式可能解析错误
5. **类型转换** - 显式类型转换 (int)x 实现不完整

### 虚拟机问题
1. **栈溢出检查** - 尚缺少主动的栈上界检查
2. **音频系统调用未实现** - 如 PlayFile、PlayWordVoice 等

### IDE 问题
1. **调试功能** - 缺少断点、单步执行等高级调试功能

---

## 🎯 目标优先级

### 🔴 高优先级
1. **完善反编译器** - 实现控制流结构化，生成可读性更高的 C 代码
2. **编译器兼容性** - 确保生成的 .lav 文件与官方环境完全兼容

---

## 📁 项目结构

```
LavStudio/
├── src/
│   ├── vm.ts                    # 虚拟机核心实现
│   ├── compiler.ts              # C-to-ASM 编译器
│   ├── decompiler.ts            # 反编译器
│   └── ...
├── tests/                       # 测试脚本
│   └── verify/                  # 验证脚本
├── package.json                 # 项目配置 (包含测试脚本)
└── README.md / README_CN.md     # 项目说明
```

---

## 🔧 技术栈

- **框架**: React 18
- **构建工具**: Vite 6
- **包管理器**: Bun
- **样式**: Tailwind CSS 4
- **语言**: TypeScript 5.8

---

## 🚀 运行项目

```bash
bun install
bun run dev
```

---

## 📝 测试

```bash
# 执行测试脚本
bun run test:simple
bun run test:compiler
bun run test:vm
bun run test:graphics
bun run test:full
```

---

## 📚 参考资料

1. [LavaX 语言编程手册](docs/LavaX-docs.md)
2. [LAV 文件格式与指令集全手册](docs/lav_format.md)
3. [问题分析报告](docs/PROBLEM_ANALYSIS.md)
