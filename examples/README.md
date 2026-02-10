# LavaX Comprehensive Demo Program

## 概述 (Overview)

`fulltest.c` 是一个全面的 LavaX 虚拟机测试程序,旨在测试尽可能多的 VM 指令和系统调用。

This is a comprehensive test program for the LavaX Virtual Machine, designed to exercise as many VM instructions and system calls as possible.

## 如何使用 (How to Use)

### 方法 1: 从文件系统加载 (Load from File System)

1. 在 LavStudio 右侧面板切换到 **FileSystem** 标签
2. 点击 **Import File** 按钮
3. 选择 `examples/fulltest.c` 文件
4. 文件将在编辑器中打开
5. 点击 **BUILD** 编译程序
6. 点击 **START** 运行程序

### 方法 2: 直接复制代码 (Copy Code Directly)

1. 打开 `examples/fulltest.c` 文件
2. 复制全部内容
3. 在 LavStudio 中创建新标签页
4. 粘贴代码
5. 编译并运行

## 测试模块 (Test Modules)

程序包含 7 个测试模块,通过菜单选择:

### 1. Arithmetic Operations (算术运算)
测试的指令:
- `ADD`, `SUB`, `MUL`, `DIV`, `MOD` - 基本算术
- `AND`, `OR`, `XOR`, `NOT` - 位运算
- `SHL`, `SHR` - 移位运算
- `EQ`, `NEQ`, `GT`, `LT`, `GE`, `LE` - 比较运算
- `INC_PRE`, `INC_POST`, `DEC_PRE`, `DEC_POST` - 自增自减
- `NEG` - 取负

### 2. Graphics Primitives (图形绘制)
测试的系统调用:
- `Point` (0x94) - 画点
- `Line` (0x96) - 画线
- `Rectangle` (0x8c) - 矩形
- `Box` (0x97) - 填充矩形
- `Circle` (0x98) - 圆形
- `Ellipse` (0x99) - 椭圆
- `Block` (0x8b) - 填充块
- `ClearScreen` (0x8e) - 清屏
- `Refresh` (0x89) - 刷新显示

### 3. Text Output Tests (文本输出)
测试的系统调用:
- `printf` (0x82) - 格式化输出
- `putchar` (0x80) - 单字符输出
- `TextOut` (0x8a) - 定位文本输出

### 4. Input/Output Tests (输入输出)
测试的系统调用:
- `getchar` (0x81) - 阻塞式按键输入
- `CheckKey` (0xbc) - 非阻塞式按键检测

### 5. Loops & Conditions (循环与条件)
测试的指令:
- `JZ`, `JNZ`, `JMP` - 跳转指令
- `L_AND`, `L_OR`, `L_NOT` - 逻辑运算
- for 循环、while 循环、嵌套循环
- if-else 条件分支

### 6. Memory Operations (内存操作)
测试的系统调用和指令:
- `strcpy` (0x83) - 字符串复制
- `strlen` (0x84) - 字符串长度
- `sprintf` (0xb8) - 格式化字符串
- `memcpy` - 内存复制
- `memmove` (0xbd) - 内存移动
- `memset` - 内存设置
- `STORE`, `LD_IND_B/W/D` - 指针操作

### 7. Floating Point Math (浮点数学)
测试的功能:
- 整数除法
- 定点数模拟
- `abs` - 绝对值
- `rand`, `srand` - 随机数

## 覆盖的指令集 (Instruction Coverage)

### 数据操作 (Data Operations)
- ✅ PUSH_B, PUSH_W, PUSH_D
- ✅ LD_G_B/W/D, LD_L_B/W/D
- ✅ LEA_G_B/W/D, LEA_L_B/W/D
- ✅ STORE, LD_IND_B/W/D
- ✅ STR (字符串常量)

### 算术运算 (Arithmetic)
- ✅ ADD, SUB, MUL, DIV, MOD, NEG
- ✅ INC_PRE, INC_POST, DEC_PRE, DEC_POST
- ✅ ADD_C, SUB_C, MUL_C, DIV_C, MOD_C (常量优化)

### 位运算 (Bitwise)
- ✅ AND, OR, XOR, NOT
- ✅ SHL, SHR

### 比较运算 (Comparison)
- ✅ EQ, NEQ, GT, LT, GE, LE
- ✅ EQ_C, NEQ_C, GT_C, LT_C, GE_C, LE_C (常量优化)

### 逻辑运算 (Logical)
- ✅ L_AND, L_OR, L_NOT

### 控制流 (Control Flow)
- ✅ JZ, JNZ, JMP
- ✅ CALL, FUNC, RET
- ✅ BASE

### 系统调用 (System Calls)
- ✅ putchar, getchar, printf, sprintf
- ✅ strcpy, strlen, memcpy, memmove, memset
- ✅ Point, Line, Rectangle, Box, Circle, Ellipse, Block
- ✅ ClearScreen, Refresh, TextOut, SetScreen
- ✅ Delay, CheckKey
- ✅ abs, rand, srand

## 未覆盖的指令 (Not Covered)

某些高级或特殊指令未在此演示中测试:
- 浮点运算指令 (fadd, fsub, fmul, fdiv, itof, ftoi) - 需要浮点支持
- WriteBlock (0x88) - 位图绘图
- Math (0xd4) - 高级数学函数 (sin, cos, exp)
- System (0xd3) - 系统子函数
- SetPalette (0xd5) - 调色板设置
- 文件系统相关 (fopen, fclose, fread, fwrite 等)

## 注意事项 (Notes)

1. 程序使用菜单驱动界面,通过数字键 1-7 选择测试模块
2. 按 0 或 ESC 键退出程序
3. 每个测试模块结束后需要按任意键返回菜单
4. 图形测试会切换到图形模式,文本测试会切换回文本模式
5. 某些功能可能因 VM 实现差异而表现不同

## 技术细节 (Technical Details)

- **全局变量**: 测试全局变量的初始化和访问
- **函数调用**: 测试 CALL/FUNC/RET 栈帧管理
- **局部变量**: 测试栈上局部变量的分配和访问
- **数组**: 测试数组的声明、初始化和访问
- **指针**: 测试指针的取址、解引用和算术运算
- **字符串**: 测试字符串常量和字符串操作函数

## 预期输出 (Expected Output)

每个测试模块都会输出详细的测试结果,包括:
- 运算的输入值和结果
- 图形绘制的可视化效果
- 用户输入的回显
- 循环和条件的执行流程

## 故障排除 (Troubleshooting)

如果程序无法正常运行:
1. 检查编译器是否支持所有使用的语法
2. 查看系统日志中的错误信息
3. 尝试单独测试每个模块
4. 确认 VM 实现支持所需的系统调用

## 扩展建议 (Extension Ideas)

可以基于此程序扩展更多测试:
- 添加性能基准测试
- 测试边界条件和错误处理
- 添加更复杂的算法演示
- 实现小游戏或应用程序
