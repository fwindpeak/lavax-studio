# LAV 文件格式与虚拟机规范

本文档描述了 `.lav` 文件结构和 LavaX 虚拟机 (GVM) 指令集。

## 1. 虚拟机架构概述

LavaX 虚拟机是一个基于栈的虚拟机。

### 内存模型

GVM 的内存空间是统一编址的线性空间，通常通过 `ramManager` 进行管理。主要区域包括：

*   **数据区 (Runtime RAM)**: 存放全局变量、静态变量等。
*   **字符串堆 (String RAM)**: 存放字符串常量。
*   **栈区 (Stack)**: 存放临时变量、函数调用栈帧。
*   **显存 (Graph RAM)**: 对应屏幕显示内容 (通常起始于 `0x0000`)。
*   **缓冲显存 (Buffer RAM)**: 用于双缓冲绘图 (通常起始于 `0x0640`)。
*   **文本显存 (Text RAM)**: 用于文本模式显示 (通常起始于 `0x0C80`)。

### 寄存器与状态

虚拟机内部维护若干关键寄存器：

*   **PC (Program Counter)**: 当前执行指令的偏移量 (`offset` 在 `LavApp` 中)。
*   **SP (Stack Pointer)**: 栈顶指针。
*   **RegionStart / RegionEnd**: 当前内存区域的起始和结束地址，用于函数调用时的栈帧管理和局部变量访问。
*   **Seed**: 随机数种子。

## 2. 文件结构

一个 `.lav` 文件由 16 字节的文件头和随后的程序数据组成。

### 文件头 (16 字节)

| 偏移量 | 大小 | 值 | 描述 |
| :--- | :--- | :--- | :--- |
| 0x00 | 1 | `0x4C` ('L') | 魔数第 1 部分 |
| 0x01 | 1 | `0x41` ('A') | 魔数第 2 部分 |
| 0x02 | 1 | `0x56` ('V') | 魔数第 3 部分 |
| 0x03 | 1 | `0x12` (18) | 版本标识 |
| 0x04-0x07 | 4 | - | 保留 |
| 0x08 | 1 | flags | 标志字节 (见下文详细说明) |
| 0x09 | 1 | width/16 | 屏幕宽度除以 16 (实际宽度 = 值 × 16) |
| 0x0A | 1 | height/16 | 屏幕高度除以 16 (实际高度 = 值 × 16) |
| 0x0B-0x0F | 5 | - | 保留 |

#### 标志字节 (偏移 0x08)

| 位 | 掩码 | 说明 |
| :--- | :--- | :--- |
| 0 | `0x01` | 输入设备：1 = 触摸屏，0 = 键盘 |
| 4 | `0x10` | 内存模式：32 位地址空间 |
| 5-6 | `0x60` | 图形模式：`0x00` = 1 色，`0x40` = 4 色，`0x60` = 8 色 |
| 7 | `0x80` | 内存模式：24 位地址空间 |

*注：内存模式优先级为 bit 4 > bit 7 > 默认 16 位。*

### 程序数据

程序执行从文件头之后的偏移量 `0x10` (16) 处立即开始。

**数据类型映射:**

| LavaX 类型 | 大小 | GVM 存储 | 说明 |
| :--- | :--- | :--- | :--- |
| `char` | 1 字节 | 1 字节 | 无符号整数 (0-255) |
| `int` | 2 字节 | 2 字节 | 有符号整数 (-32768 ~ 32767) |
| `long` | 4 字节 | 4 字节 | 有符号整数 |
| `float` | 4 字节 | 4 字节 | IEEE 754 浮点数 (GVM 视为 4 字节数据) |
| `addr` | 4 字节 | 4 字节 | 内存地址 (实质与 `long` 相同) |

*注意：多字节数据均采用**小端序** (Little-Endian) 存储。*

## 3. 指令集详解

指令由 1 字节操作码 (Opcode) 和可选操作数组成。

**实现说明：** 指令集分为两个表：
- **基本指令** (`codes[]`): 0x00-0x74 (共 117 条指令)
- **系统函数** (`codes2[]`): 0x80-0xD6 (共 87 条指令)

虚拟机通过检查操作码的最高位 (bit 7) 来决定使用哪个指令表：
- 如果 `opcode & 0x80` 为真，则使用 `codes2[opcode & 0x7F]`
- 否则使用 `codes[opcode]`

### 基本指令 (0x00 - 0x7F)

这些指令主要处理栈操作、算术运算、逻辑运算和流程控制。

#### 数据加载与存储
| Opcode | 助记符 | 操作数 | 栈操作 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `0x01` | **PUSH_CHAR** | `char` imm | `push(imm)` | 推入 1 字节立即数 |
| `0x02` | **PUSH_INT** | `int` imm | `push(imm)` | 推入 2 字节立即数 |
| `0x03` | **PUSH_LONG** | `long` imm | `push(imm)` | 推入 4 字节立即数 |
| `0x04` | **PUSH_ADDR_CHAR** | `addr` imm | `push([imm])` | 推入地址 `imm` 处的 char |
| `0x05` | **PUSH_ADDR_INT** | `addr` imm | `push([imm])` | 推入地址 `imm` 处的 int |
| `0x06` | **PUSH_ADDR_LONG** | `addr` imm | `push([imm])` | 推入地址 `imm` 处的 long |
| `0x07` | **PUSH_OFFSET_CHAR** | `offset` (2) | `addr=pop(); push([addr+offset])` | 推入基址(栈顶)+偏移量处的 char |
| `0x08` | **PUSH_OFFSET_INT** | `offset` (2) | `addr=pop(); push([addr+offset])` | 推入基址(栈顶)+偏移量处的 int |
| `0x09` | **PUSH_OFFSET_LONG** | `offset` (2) | `addr=pop(); push([addr+offset])` | 推入基址(栈顶)+偏移量处的 long |
| `0x0d` | **ADD_STRING** |String (SZ) | `push(str_addr | 0x100000)` | 将内嵌字符串加载到 StringRam，推入其地址(带类型标记) |
| `0x35` | **STORE** | - | `addr=pop(); val=pop(); [addr]=val; push(val)` | 将 `val` 存入 `addr`，并保留 `val` 在栈顶 (支持连续赋值 `a=b=c`) |
| `0x36` | **LOAD_CHAR** | - | `addr=pop(); push([addr])` | 加载栈顶地址处的 char |
| `0x41` | **LOAD_BYTES** | `addr`(2), `len`(2) | - | 从程序流中读取 `len` 字节写入内存 `addr` (用于初始化数组) |

#### 区域/局部变量访问 (Region Access)
GVM 使用 Region 指令来访问相对于当前栈帧 (`RegionStart`) 的变量，通常用于局部变量。

| Opcode | 助记符 | 操作数 | 栈操作 | 描述 |
| :--- | :--- | :--- | :--- | :--- |
| `0x0e` | **LOAD_R1_CHAR** | `offset` (2) | `push([RegionStart+offset])` | 加载局部 char |
| `0x0f` | **LOAD_R1_INT** | `offset` (2) | `push([RegionStart+offset])` | 加载局部 int |
| `0x10` | **LOAD_R1_LONG** | `offset` (2) | `push([RegionStart+offset])` | 加载局部 long |
| `0x14` | **CALC_R_ADDR_1** | `val` (2) | `base=pop(); push(...)` | 计算区域地址 (类型 1) |
| `0x19` | **PUSH_R_ADDR** | `val` (2) | `push(RegionStart+val)` | 推入局部变量地址 (`&var`) |

#### 算术与逻辑运算
均从栈顶弹出操作数，结果推回栈顶。双目运算顺序通常为 `b=pop(); a=pop(); op(a, b)`。

| Opcode | 助记符 | 对应 C 运算 | 描述 |
| :--- | :--- | :--- | :--- |
| `0x1c` | **NEG** | `-a` | 取反 |
| `0x1d` | **INC_PRE** | `++a` | 前置自增 (栈顶为地址) |
| `0x1e` | **DEC_PRE** | `--a` | 前置自减 |
| `0x1f` | **INC_POST** | `a++` | 后置自增 |
| `0x20` | **DEC_POST** | `a--` | 后置自减 |
| `0x21` | **ADD** | `a + b` | 加法 |
| `0x22` | **SUB** | `a - b` | 减法 |
| `0x23` | **AND** | `a & b` | 按位与 |
| `0x24` | **OR** | `a | b` | 按位或 |
| `0x25` | **NOT** | `~a` | 按位取反 |
| `0x26` | **XOR** | `a ^ b` | 按位异或 |
| `0x27` | **LOGIC_AND** | `a && b` | 逻辑与 (返回 -1 或 0) |
| `0x28` | **LOGIC_OR** | `a || b` | 逻辑或 |
| `0x29` | **LOGIC_NOT** | `!a` | 逻辑非 |
| `0x2a` | **MUL** | `a * b` | 乘法 |
| `0x2b` | **DIV** | `a / b` | 除法 |
| `0x2c` | **MOD** | `a % b` | 取模 |
| `0x2d` | **SHL** | `a << b` | 左移 |
| `0x2e` | **SHR** | `a >> b` | 右移 |
| `0x2f` | **EQ** | `a == b` | 等于 (结果 -1/0) |
| `0x30` | **NEQ** | `a != b` | 不等于 |
| `0x31` | **LE** | `a <= b` | 小于等于 |
| `0x32` | **GE** | `a >= b` | 大于等于 |
| `0x33` | **GT** | `a > b` | 大于 |
| `0x34` | **LT** | `a < b` | 小于 |

*注：常量优化指令如 `ADD_CONST` (0x45) 等包含一个立即数操作数，功能同上。*

#### 流程控制
| Opcode | 助记符 | 操作数 | 描述 |
| :--- | :--- | :--- | :--- |
| `0x39` | **JZ** | `addr` (3) | 栈顶为 0 则跳转至 `addr` |
| `0x3a` | **JNZ** | `addr` (3) | 栈顶非 0 则跳转至 `addr` |
| `0x3b` | **JMP** | `addr` (3) | 无条件跳转至 `addr` |
| `0x3d` | **CALL** | `addr` (3) | 函数调用 |
| `0x3e` | **ENTER** | `size`(2), `cnt`(1) | 进入函数：建立新栈帧，分配局部变量空间(`size`)，处理参数(`cnt`) |
| `0x3f` | **RET** | - | 函数返回：恢复旧栈帧 |
| `0x40` | **EXIT** | - | 终止程序 |

### 系统函数 (0x80 - 0xFF)

这些指令直接对应 LavaX 语言标准库中的函数。

#### 文本与输入
| Opcode | 原型 (参考) | 描述 |
| :--- | :--- | :--- |
| `0x80` | `void putchar(char c)` | 输出字符，并更新 LCD |
| `0x81` | `int getchar()` | 等待并获取按键 ASCII 码 |
| `0x82` | `void printf(string format, ...)` | 格式化输出 (支持 `%d`, `%c`, `%s`) |
| `0x85` | `void SetTextMode(int mode)` | 设置文本显示模式 |
| `0x86` | `void UpdateLCD(int buffer)` | 更新屏幕 (0: 正常) |
| `0x92` | `void Locate(int row, int col)` | 设置光标位置 (行, 列) |
| `0x93` | `int CheckKey(char key)` | (GVM 实现为 `inkey`?) 获取按键状态 |
| `0xbc` | `int CheckKey(char key)` | 检查特定按键是否按下 |
| `0xc4` | `int GetWord(int mode)` | 获取输入词 (拼音/五笔等输入法) |
| `0xc6` | `void ReleaseKey(char key)` | 释放按键模拟 |

#### 图形绘制
| Opcode | 原型 (参考) | 描述 |
| :--- | :--- | :--- |
| `0x88` | `void DrawRegion(int x, y, w, h, int mode)` | 绘制区域 (BitBlt) |
| `0x89` | `void Refresh()` | 刷新屏幕缓冲到物理屏幕 |
| `0x8a` | `void TextOut(int x, int y, string str, int mode)` | 在指定坐标绘制字符串 |
| `0x8b` | `void Block(int x, y, w, h, int mode)` | 绘制填充矩形块 |
| `0x8c` | `void Rectangle(int x, y, w, h, int mode)` | 绘制矩形框 |
| `0x8e` | `void ClearScreen()` | 清除屏幕缓冲 (ClearBuffer) |
| `0x94` | `void Point(int x, int y, int mode)` | 画点 |
| `0x95` | `int GetPoint(int x, int y)` | 获取点颜色 |
| `0x96` | `void Line(int x1, y1, x2, y2, int mode)` | 画线 |
| `0x97` | `void Box(int x, y, w, h, int fill, int mode)` | 画盒 (可能对应 `drawRect` 变体) |
| `0x98` | `void Circle(int x, y, r, int mode)` | 画圆 |
| `0x99` | `void FillCircle(int x, y, r, int mode)` | 画填充圆 |
| `0xc5` | `void XDraw(int mode)` | 扩展绘制模式设置 |
| `0xc7` | `void GetBlock(int x, y, w, h, int mode, addr buf)` | 获取屏幕区域图像数据 |
| `0xca` | `void FillArea(...)` | 填充区域 (GVM未实现) |

#### 字符串与内存操作
| Opcode | 原型 (参考) | 描述 |
| :--- | :--- | :--- |
| `0x83` | `void strcpy(addr dest, addr src)` | 字符串复制 |
| `0x84` | `int strlen(addr str)` | 字符串长度 |
| `0xa6` | `void strcat(addr dest, addr src)` | 字符串连接 |
| `0xa7` | `int strchr(addr str, char c)` | 查找字符 |
| `0xa8` | `int strcmp(addr s1, addr s2)` | 字符串比较 |
| `0xa9` | `int strstr(addr s1, addr s2)` | 查找子串 |
| `0xac` | `void memset(addr buf, int c, int len)` | 内存设置 |
| `0xad` | `void memcpy(addr dest, addr src, int len)` | 内存复制 |
| `0xbd` | `void memmove(addr dest, addr src, int len)` | 内存移动 (处理重叠) |

#### 字符判断 (ctype)
| Opcode | 原型 | 描述 |
| :--- | :--- | :--- |
| `0x9b` | `isalnum` | 字母或数字 |
| `0x9c` | `isalpha` | 字母 |
| `0x9d` | `iscntrl` | 控制字符 |
| `0x9e` | `isdigit` | 数字 |
| `0x9f` | `isgraph` | 可打印 (非空) |
| `0xaa` | `tolower` | 转小写 |
| `0xab` | `toupper` | 转大写 |
| ... | ... | (其他 ctype 函数 `0xa1`-`0xa5`, `0xae`) |

#### 文件 I/O
| Opcode | 原型 (参考) | 描述 |
| :--- | :--- | :--- |
| `0xae` | `int fopen(string path, string mode)` | 打开文件 |
| `0xaf` | `void fclose(int fp)` | 关闭文件 |
| `0xb0` | `int fread(addr buf, int size, int count, int fp)` | 读取文件 |
| `0xb1` | `int fwrite(addr buf, int size, int count, int fp)` | 写入文件 |
| `0xb2` | `int fseek(int fp, long offset, int origin)` | 文件定位 (`SEEK_SET`:0, `SEEK_CUR`:1, `SEEK_END`:2) |
| `0xb3` | `long ftell(int fp)` | 获取文件位置 |
| `0xb4` | `int feof(int fp)` | 文件结束检测 |
| `0xb5` | `void rewind(int fp)` | 重置文件指针 |
| `0xb6` | `int fgetc(int fp)` | 读取字符 |
| `0xb7` | `int fputc(int ch, int fp)` | 写入字符 |
| `0xb9` | `int MakeDir(string path)` | 创建目录 |
| `0xba` | `int DeleteFile(string path)` | 删除文件 |
| `0xc0` | `int ChDir(string path)` | 改变当前目录 |
| `0xc1` | `int FileList(addr filename_buf)` | 列出文件 (交互界面) |

#### 数学与系统
| Opcode | 原型 (参考) | 描述 |
| :--- | :--- | :--- |
| `0x87` | `void Delay(int ms)` | 延时 (`val * 3/4` ms) |
| `0x8f` | `long abs(long x)` | 绝对值 |
| `0x90` | `int rand()` | 随机数 (0-32767) |
| `0x91` | `void srand(long seed)` | 设置随机种子 |
| `0xbb` | `long Getms()` | 获取系统毫秒数 |
| `0xbe` | `int CRC16(addr buf, int len)` | 计算 CRC16 |
| `0xc2` | `void GetTime(struct TIME *t)` | 获取系统时间 |
| `0xc8` | `int Cos(int deg)` | 余弦 (返回值 * 1024) |
| `0xc9` | `int Sin(int deg)` | 正弦 (返回值 * 1024) |

---
*注：本文档中的函数原型采用 C 风格表示，以辅助理解 LavaX 语言用法。具体参数传递顺序由 GVM 栈操作决定 (通常是参数逆序入栈)。*
