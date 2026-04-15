# VM 问题分析（2026-04-15 修订）

本文件替代旧的“仅仅是 VFS 缺文件”结论。结合官方 C 版 `docs/ref_prjs/LavaXVM` 重新核对后，当前 TypeScript VM 的主要偏差是 **运行时语义漂移**，不只是资源文件问题。

## 已确认的官方语义偏差

1. **右移语义错误**
   - 官方 C VM：`SHR/SHR_C` 走无符号右移。
   - 旧 TS VM：使用了有符号右移，负数位运算会跑偏。

2. **随机数实现错误**
   - 官方 C VM：`seed = seed * 0x15a4e35 + 1`，返回 `(seed >> 16) & 0x7fff`。
   - 旧 TS VM：直接调用 `Math.random()`，`srand()` 也没有真正控制序列。

3. **按键检测语义错误**
   - 官方 C VM：`CheckKey(key)` 对指定键返回 `-1/0`，`CheckKey(128)` 返回当前按住的键值。
   - 旧 TS VM：对指定键返回键码本身；`ReleaseKey()` 也没有真正清除状态。

4. **计时器语义错误**
   - 官方 C VM：`Getms()` 返回当前秒内毫秒映射到 `0..255`。
   - 旧 TS VM：返回“自启动以来经过的毫秒数”，会影响依赖官方时序的游戏逻辑。

5. **调色板字节序错误**
   - 官方 C VM `SetPalette()` 从内存按 `B,G,R,保留` 读取。
   - 旧 TS VM 当成 `R,G,B,保留`，会直接导致颜色失真。

6. **三角函数精度/离散化错误**
   - 官方 C VM：`Sin/Cos` 使用固定查表，范围 `-1024..1024`。
   - 旧 TS VM：直接用 `Math.sin/Math.cos` 浮点近似，结果并不等价。

## 结论

- **VFS 缺资源文件仍然可能让某些游戏无法完整进入内容**，但这不是这轮问题的唯一根因。
- 更关键的是：**VM 核心指令和 syscall 的若干行为与官方 C VM 不一致**，这会表现为：
  - 绘图颜色不对
  - 输入逻辑异常
  - 定时/动画异常
  - 随机流程不稳定
  - 某些游戏“看起来像卡死”

## 对应修复

本轮已按官方 C 版补齐并回归验证：

- `SHR / SHR_C`
- `rand / srand`
- `Getms`
- `CheckKey / ReleaseKey`
- `SetPalette / SetFgColor / SetBgColor`
- `Sin / Cos`

附：更详细的逐项对照见 `docs/vm_official_compat_analysis.md`。
