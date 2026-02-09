# 🌋 LavStudio

LavStudio 是一个现代、高性能的基于 Web 的集成开发环境 (IDE) 和 **LavaX** 平台模拟器。它为针对经典电子词典（如文曲星/WQX）的应用程序开发、编译和运行提供了完整环境。

[English Version](README.md)

![LavaX Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## ✨ 特性

- **集成 IDE**: 专为 LavaX C (GVM C) 设计，具有语法高亮功能的简洁深色主题编辑器。
- **LavaX 编译器**: 高级类 C 语言编译器，可生成优化的汇编代码。
- **汇编与反汇编器**: 用于在汇编代码和 `.lav` 二进制格式之间转换的低级工具。
- **LavaX 虚拟机 (GVM)**: 自定义的 32 位基于栈的虚拟机，模拟目标硬件环境。
- **VFS (虚拟文件系统)**: 使用 IndexedDB/LocalStorage 的持久化文件存储，支持浏览器内的文件 I/O 操作。
- **反编译器**: 支持从现有的 `.lav` 二进制文件恢复源代码和汇编代码。
- **硬件仿真**: 高保真模拟屏幕渲染 (160x80)、声音和键盘输入。

## 🚀 技术栈

- **框架**: [React 18](https://reactjs.org/)
- **构建工具**: [Vite 6](https://vitejs.dev/)
- **包管理器**: [Bun](https://bun.sh/)
- **样式**: [Tailwind CSS 4](https://tailwindcss.com/)
- **图标**: [Lucide React](https://lucide.dev/)
- **Polyfills**: 使用 `vite-plugin-node-polyfills` 在浏览器中支持 Node.js 全局变量。

## 📂 项目结构

```text
LavStudio/
├── src/
│   ├── vm.ts           # LavaX 虚拟机核心实现
│   ├── compiler.ts     # C 到汇编的编译器和汇编器
│   ├── decompiler.ts   # 二进制到源码/汇编的反编译器
│   ├── index.tsx       # 主 UI 和 IDE 编排
│   ├── index.css       # 全局样式和 Tailwind 导入
│   ├── types.ts        # 通用类型定义 (Opcodes, Syscalls)
├── public/
│   └── fonts.dat       # 模拟器使用的二进制字体资源
├── docs/               # 详细规范和文档
└── vite.config.ts      # 包含 Node polyfills 的 Vite 配置
```

## 🛠️ 入门指南

### 前置条件

- 机器上已安装 [Bun](https://bun.sh/)。

### 安装

1. 克隆仓库并进入项目目录。
2. 安装依赖：
   ```bash
   bun install
   ```

### 本地运行

启动开发服务器：
```bash
bun run dev
```
在浏览器中打开 [http://localhost:5173](http://localhost:5173) 开始编码。

## 📖 使用指南

### 编写代码
编辑器支持标准 GVM C 语法。使用 **BUILD** 按钮将代码编译为汇编和二进制文件。

### 运行程序
点击 **RUN** 按钮在模拟器中启动程序。你可以使用 UI 中提供的软键盘或物理键盘与之交互。

### 管理文件
**Filesystem** 标签页允许你管理虚拟文件系统 (VFS)。你可以上传现有的 `.lav` 文件，下载你构建的二进制文件，或删除文件。

### 反编译
如果你在 VFS 中有 `.lav` 文件，可以点击 **RECOVER** 按钮尝试将其反编译回源代码或汇编。

## 📜 相关文档

有关更深层级的技术细节，请参阅 `docs/` 文件夹中的文档：
- [LAV 格式与虚拟机规范](docs/lav_format.md)
- [LavaX 标准库文档](docs/LavaX-docs.md)

## ⚖️ 许可证

私有项目。保留所有权利。
