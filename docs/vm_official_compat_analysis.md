# LavaXVM 官方 C 版对照分析

日期：2026-04-15  
参考实现：`docs/ref_prjs/LavaXVM/*.c`

## 目标

把 `src/vm.ts`、`src/vm/SyscallHandler.ts`、`src/vm/GraphicsEngine.ts` 的关键运行时语义，重新对齐到官方 C 虚拟机，而不是只追求“仓库内现有测试通过”。

## 本轮核对到的关键差异

### 1. 位运算

- 官方：
  - `cal_rshift()` 使用 `(unsigned long)a1 >> a3`
  - `cal_qrshift()` 也是无符号右移
- 旧 TS：
  - `SHR` / `SHR_C` 使用了 JS 有符号右移

影响：负数位运算、掩码运算、某些图形/状态压缩逻辑会跑偏。

### 2. 随机数

- 官方：
  - `rand`: `seed = seed * 0x15a4e35 + 1`
  - 返回 `(seed >> 16) & 0x7fff`
- 旧 TS：
  - `Math.random()`

影响：游戏事件、战斗/掉落/迷宫等依赖固定随机序列的行为不稳定，`srand()` 失效。

### 3. Getms

- 官方：返回当前秒内毫秒压缩到 `0..255`
- 旧 TS：返回自程序启动后的累计毫秒

影响：依赖官方节拍的动画、轮询、超时控制可能异常。

### 4. CheckKey / ReleaseKey

- 官方：
  - `CheckKey(key<128)` -> `-1/0`
  - `CheckKey(128)` -> 当前按住的键值
  - `ReleaseKey()` 真实清理状态
- 旧 TS：
  - 返回键值本身
  - `ReleaseKey()` 基本是空操作

影响：菜单、移动、长按/连发处理异常，容易表现成“按键卡住”或“像死循环”。

### 5. 调色板

- 官方 `lav_setpalette()` 从内存按 `B,G,R,保留` 读取。
- 旧 TS 把源内存按 `R,G,B,保留` 解释。

影响：彩色游戏最明显，颜色直接错位。

### 6. Sin / Cos

- 官方：整数查表，范围 `-1024..1024`
- 旧 TS：浮点 `Math.sin/Math.cos`

影响：依赖官方离散三角值的运动/路径/碰撞逻辑会出现漂移。

## 本轮落地修改

### 代码

- `src/vm.ts`
  - 修正 `SHR`
  - 修正 `SHR_C`
  - 新增/重置官方兼容随机种子

- `src/vm/SyscallHandler.ts`
  - 按官方 LCG 修正 `rand/srand`
  - 按官方节拍修正 `Getms`
  - 按官方语义修正 `CheckKey/ReleaseKey`
  - 按官方字节序修正 `SetPalette`
  - 在 16/256 色模式下约束 `SetFgColor/SetBgColor`
  - 按官方查表修正 `Sin/Cos`
  - 模式切换时恢复官方默认前景/背景色

### 回归

新增：

- `tests/verify/verify_vm_official_semantics.ts`

覆盖：

- `SHR / SHR_C`
- `rand / srand`
- `Getms`
- `CheckKey / ReleaseKey`
- `SetPalette / SetFgColor`
- `Sin / Cos`

## 仍未在本轮彻底改完的点

这些问题已经确认值得继续推进，但本轮先优先修最容易导致“游戏跑偏/卡住/颜色错”的部分：

1. **`.lav` 头部字段文档长期被误写**
   - 旧文档把 `0x08..0x0A` 当 entrypoint
   - 官方 C VM 实际把它们当平台/屏幕参数
2. **LavStudio 自己的字符串掩码头字段与官方 C VM 历史实现并不完全一致**
3. **更完整的 24-bit / 32-bit RAMBits 兼容路径仍需单独清理**

## 建议后续检查顺序

1. 用真实 `.lav`（尤其是彩色、输入密集型游戏）做 smoke run
2. 逐个比对剩余 syscall：文件系统、图形块操作、目录枚举
3. 再处理 `.lav` 头部/地址宽度文档与实现的统一化
