# 🌋 LavStudio

LavStudio is a modern, high-performance web-based IDE and emulator for the **LavaX** platform. It provides a complete development environment for building, compiling, and running applications targetting classic electronic dictionaries (like WQX/文曲星).

[中文版](README_CN.md)

![LavaX Banner](https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6)

## ✨ Features

- **Integrated IDE**: A sleek, dark-themed editor with syntax highlighting tailored for LavaX C (GVM C).
- **LavaX Compiler**: High-level C-like language compiler that generates optimized assembly.
- **Assembler & Disassembler**: Low-level tools for converting between assembly code and `.lav` binary format.
- **LavaX Virtual Machine (GVM)**: A custom-built, 32-bit stack-based virtual machine that emulates the target hardware environment.
- **VFS (Virtual File System)**: Persistent file storage using IndexedDB/LocalStorage, allowing for file I/O operations within the browser.
- **Decompiler**: Reverse-engineering support to recover source code and assembly from existing `.lav` binaries.
- **Hardware Simulation**: High-fidelity emulation of screen rendering (160x80), sound, and keyboard input.

## 🚀 Tech Stack

- **Framework**: [React 18](https://reactjs.org/)
- **Build Tool**: [Vite 6](https://vitejs.dev/)
- **Package Manager**: [Bun](https://bun.sh/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Polyfills**: `vite-plugin-node-polyfills` for Node.js global support in-browser.

## 📂 Project Structure

```text
LavStudio/
├── src/
│   ├── vm.ts           # LavaX Virtual Machine core implementation
│   ├── compiler.ts     # C-to-ASM Compiler & Assembler
│   ├── decompiler.ts   # Binary-to-Source/ASM Decompiler
│   ├── index.tsx       # Main UI and IDE Orchestration
│   ├── index.css       # Global styles and Tailwind imports
│   ├── types.ts        # Common type definitions (Opcodes, Syscalls)
│   └── Font.ts         # Font rendering logic
├── public/
│   └── fonts.dat       # Binary font assets for the emulator
├── docs/               # Detailed specifications and documentation
└── vite.config.ts      # Vite configuration with Node polyfills
```

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh/) installed on your machine.

### Installation

1. Clone the repository and navigate to the project directory.
2. Install dependencies:
   ```bash
   bun install
   ```

### Running Locally

To start the development server:
```bash
bun run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to start coding.

## 📖 Usage Guide

### Writing Code
The editor supports standard GVM C syntax. Use the **BUILD** button to compile your code into assembly and binary.

### Running Applications
Click the **RUN** button to launch your application in the emulator. You can interact with it using the soft keyboard provided in the UI or your physical keyboard.

### Managing Files
The **Filesystem** tab allows you to manage the Virtual File System (VFS). You can upload existing `.lav` files, download binaries you've built, or delete files.

### Decompilation
If you have a `.lav` file in the VFS, you can click the **RECOVER** button to attempt to decompile it back into source code or assembly.

## 📜 Documentation

For deep technical details, refer to the documents in the `docs/` folder:
- [LAV Format & VM Specs](docs/lav_format.md)
- [LavaX Standard Library Documentation](docs/LavaX-docs.md)

## ⚖️ License

Private Project. All rights reserved.
