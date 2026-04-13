# 🌋 LavStudio | AI Agent Instructions

Welcome to the **LavStudio** project. This file provides foundational context, architectural mandates, and operational guidelines for AI agents working on this codebase.

## 📋 Project Overview
LavStudio is a modern, web-based IDE and emulator for the **LavaX** platform. It enables a complete development lifecycle in the browser: write, compile, run, and reverse-engineer LavaX programs.

- **Primary Stack:** React 18, Vite 6, TypeScript 5.8, Bun, Tailwind CSS 4.
- **Core Domain:** Compilers, Virtual Machines (GVM), Graphics Emulation, and Binary Analysis.

## 📂 Architectural Mapping

| Module | Responsibility | Key Files |
| :--- | :--- | :--- |
| **Compiler** | LavaX C → Assembly | `src/compiler.ts` |
| **Assembler** | Assembly → `.lav` Binary | `src/compiler/LavaXAssembler.ts` |
| **VM (GVM)** | 32-bit Stack VM execution | `src/vm.ts` |
| **Graphics** | 160x80 Display & Primitives | `src/vm/GraphicsEngine.ts` |
| **Syscalls** | Hardware/OS API implementation | `src/vm/SyscallHandler.ts` |
| **Decompiler** | `.lav` → Assembly/C Source | `src/decompiler.ts` |
| **VFS** | Virtual File System (IndexedDB) | `src/vm/VirtualFileSystem.ts` |

## 🛠 Development Workflow

### 1. Mandatory Reading (AI Priority)
Before performing any task, follow this reading order:
1. `PROJECT_STATUS.md`: Current state, roadmap, and high-priority bugs.
2. `docs/ai/INDEX.md`: Entry point for AI-specific documentation.
3. `docs/ai/QUICK_START.md`: Debugging tips, core issues, and module interfaces.

### 2. The "Closed-Loop" Mandate
All changes to the compiler or decompiler must maintain the **Loop Closure**:
`C Source` → `Compile` → `Assemble` → `Execute in VM` → `Decompile` → `C Source`.
The final C source should be behaviorally identical and ideally re-compilable.

### 3. Testing & Validation
Tests are managed via `package.json` scripts and executed with **Bun**.
- **Run simple test:** `bun run test:simple`
- **Run compiler tests:** `bun run test:compiler`
- **Run full suite:** `bun run test:full`

## 📜 Technical Conventions

- **Encoding:** LavaX uses **GBK** for Chinese characters. Use `iconv-lite` for conversion.
- **Graphics Mode:** The `mode` parameter uses bitmasking (Bit 0-2: Op, Bit 3: Reverse, Bit 6: Buffer select).
- **VM Stack:** `pop()` returns `lastValue` when empty to support legacy LavaX programming patterns (e.g., `EQ` followed by `POP` then `JZ`).
- **LAV Header:** 16-byte fixed header. Magic: `LAV` (0x4C 0x41 0x56), Version: 0x12 (V3.0).

## ⚠️ Known Constraints & Risks

- **Struct Support:** Basic support implemented; nested structs and complex struct arrays are NOT yet supported.
- **Decompiler:** Currently focuses on disassembly; control-flow recovery for C source is experimental.
- **VFS:** Certain legacy applications expect specific data files (e.g., `/LavaData/RichPic.dat`) to be present in the virtual filesystem.

## 🤖 AI Operational Rules
- **Interface First:** Refer to `docs/ai/MODULE_INTERFACES.md` before modifying cross-module logic.
- **Surgical Edits:** Avoid large-scale refactoring; prioritize focused fixes and feature implementations.
- **Validation:** Every change should be verified using existing test scripts in `package.json`.

---
*Reference the `docs/` folder for full specifications of the LAV format and LavaX language.*
