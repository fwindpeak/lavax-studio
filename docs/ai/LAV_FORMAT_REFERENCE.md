# LAV 格式与指令集详细参考

> 本文档是 `docs/lav_format.md` 的 AI 精简版，包含所有关键指令的详细说明

---

## 1. LAV 文件格式

### 1.1 文件头 (16 Bytes)

| 偏移 | 大小 | 名称 | 说明 |
|------|------|------|------|
| 0x00 | 3 | Magic | 'LAV' (0x4C 0x41 0x56) |
| 0x03 | 1 | Version | 0x12 (18) |
| 0x04 | 1 | Reserved | 0x00 |
| 0x05 | 1 | MemoryLimit | 0x74 或 0x80 |
| 0x06 | 2 | ArrayInitSize | 数组初始化空间 (LE) |
| 0x08 | 3 | EntryPoint | 程序入口地址 (24-bit) |
| 0x0B | 4 | Reserved | 0x00 |
| 0x0F | 1 | Reserved | 0x00 |

### 1.2 代码段
- 紧跟文件头，从偏移 0x10 开始
- 包含 INIT 数据初始化和程序指令

---

## 2. 基础指令集 (0x00 - 0x68)

### 2.1 数据推送 (0x01-0x03, 0x0D)

| 指令 | 操作码 | 操作数 | 描述 |
|------|--------|--------|------|
| NOP | 0x00 | - | 空操作 |
| PUSH_B | 0x01 | u8 | 压入 1 字节，补零为 4 字节 |
| PUSH_W | 0x02 | i16 | 压入 2 字节，补零为 4 字节 |
| PUSH_D | 0x03 | i32 | 压入 4 字节 |
| PUSH_STR | 0x0D | str\0 | 压入字符串地址，受 strMask 影响 |

### 2.2 全局寻址 (0x04-0x0C)

| 指令 | 操作码 | 操作数 | 描述 |
|------|--------|--------|------|
| LD_G_B | 0x04 | u16 | 加载全局 1 字节 (char) |
| LD_G_W | 0x05 | u16 | 加载全局 2 字节 (int) |
| LD_G_D | 0x06 | u16 | 加载全局 4 字节 (long) |
| LD_G_O_B | 0x07 | u16 | 全局数组 1 字节: addr = (u16 + pop) |
| LD_G_O_W | 0x08 | u16 | 全局数组 2 字节 |
| LD_G_O_D | 0x09 | u16 | 全局数组 4 字节 |
| LEA_G_B | 0x0A | u16 | 全局数组头 1: push(u16 + pop \| 0x0100) |
| LEA_G_W | 0x0B | u16 | 全局数组头 2: push(u16 + pop \| 0x0200) |
| LEA_G_D | 0x0C | u16 | 全局数组头 4: push(u16 + pop \| 0x0400) |

### 2.3 局部寻址 (0x0E-0x18)

| 指令 | 操作码 | 操作数 | 描述 |
|------|--------|--------|------|
| LD_L_B | 0x0E | i16 | 加载局部 1 字节: addr = (i16 + BASE) |
| LD_L_W | 0x0F | i16 | 加载局部 2 字节 |
| LD_L_D | 0x10 | i16 | 加载局部 4 字节 |
| LD_L_O_B | 0x11 | i16 | 局部数组 1 字节 |
| LD_L_O_W | 0x12 | i16 | 局部数组 2 字节 |
| LD_L_O_D | 0x13 | i16 | 局部数组 4 字节 |
| LEA_L_B | 0x14 | i16 | 局部数组头 1: push(0x8100) |
| LEA_L_W | 0x15 | i16 | 局部数组头 2: push(0x8200) |
| LEA_L_D | 0x16 | i16 | 局部数组头 4: push(0x8400) |
| LEA_OFT | 0x17 | u16 | 地址偏移: push(pop + u16) |
| LEA_L_PH | 0x18 | u16 | 局部数组 a[0] 寻址 |
| LEA_ABS | 0x19 | u16 | 压入绝对地址 |

### 2.4 内存寻址 (0x1A-0x1B, 0x42)

| 指令 | 操作码 | 描述 |
|------|--------|------|
| LD_TEXT | 0x1A | 压入 _TEXT 地址 (0x0C80) |
| LD_GRAP | 0x1B | 压入 _GRAPH 地址 (VRAM) |
| LD_GBUF | 0x42 | 压入 _GBUF 地址 (0x0640) |

### 2.5 算术逻辑 (0x1C-0x37)

#### 一元运算
| 指令 | 操作码 | 描述 |
|------|--------|------|
| NEG | 0x1C | 取反 (-a) |
| INC_PRE | 0x1D | 前置 ++x |
| DEC_PRE | 0x1E | 前置 --x |
| INC_POS | 0x1F | 后置 x++ |
| DEC_POS | 0x20 | 后置 x-- |
| NOT | 0x25 | 按位取反 (~) |
| L_NOT | 0x29 | 逻辑非 (!) |

#### 二元运算
| 指令 | 操作码 | 描述 |
|------|--------|------|
| ADD | 0x21 | 加法 |
| SUB | 0x22 | 减法 |
| AND | 0x23 | 按位与 |
| OR | 0x24 | 按位或 |
| XOR | 0x26 | 按位异或 |
| L_AND | 0x27 | 逻辑与 |
| L_OR | 0x28 | 逻辑或 |
| MUL | 0x2A | 乘法 |
| DIV | 0x2B | 除法 |
| MOD | 0x2C | 取模 |
| SHL | 0x2D | 左移 |
| SHR | 0x2E | 右移 |

#### 比较运算
| 指令 | 操作码 | 描述 |
|------|--------|------|
| EQ | 0x2F | 等于 (==) |
| NEQ | 0x30 | 不等于 (!=) |
| LE | 0x31 | 小于等于 (<=) |
| GE | 0x32 | 大于等于 (>=) |
| GT | 0x33 | 大于 (>) |
| LT | 0x34 | 小于 (<) |

#### 数据操作
| 指令 | 操作码 | 描述 |
|------|--------|------|
| STORE | 0x35 | 赋值: 栈顶值存入次栈顶地址 |
| LD_IND | 0x36 | 间接加载: push([pop]) |
| LD_IND_W | 0x52 | 间接加载 2 字节 |
| LD_IND_D | 0x53 | 间接加载 4 字节 |
| POP | 0x38 | 弹出栈顶并丢弃 |

### 2.6 控制流 (0x39-0x41, 0x43-0x44)

| 指令 | 操作码 | 操作数 | 描述 |
|------|--------|--------|------|
| JZ | 0x39 | u24 | 栈顶为 0 则跳转 |
| JNZ | 0x3A | u24 | 栈顶非 0 则跳转 |
| JMP | 0x3B | u24 | 无条件跳转 |
| SPACE | 0x3C | u16 | 程序入口起点标记 |
| CALL | 0x3D | u24 | 调用函数 (保存 PC, BASE) |
| FUNC | 0x3E | u16, u8 | 函数定义: frameSize, paramCount |
| RET | 0x3F | - | 函数返回 |
| EXIT | 0x40 | - | 程序结束 |
| INIT | 0x41 | 变长 | 数据初始化: addr(2B) + len(2B) + data |
| MASK | 0x43 | u8 | 设置 strMask |
| LOADALL | 0x44 | - | #loadall 标记 |

### 2.7 立即数运算 (0x45-0x51)

格式: `OP reg, imm16`

| 指令 | 操作码 | 描述 |
|------|--------|------|
| ADD_C | 0x45 | push(pop + imm16) |
| SUB_C | 0x46 | push(pop - imm16) |
| MUL_C | 0x47 | push(pop * imm16) |
| DIV_C | 0x48 | push(pop / imm16) |
| MOD_C | 0x49 | push(pop % imm16) |
| SHL_C | 0x4A | push(pop << imm16) |
| SHR_C | 0x4B | push(pop >> imm16) |
| EQ_C | 0x4C | push(pop == imm16) |
| NEQ_C | 0x4D | push(pop != imm16) |
| GT_C | 0x4E | push(pop > imm16) |
| LT_C | 0x4F | push(pop < imm16) |
| GE_C | 0x50 | push(pop >= imm16) |
| LE_C | 0x51 | push(pop <= imm16) |

### 2.8 浮点运算 (0x54-0x68)

| 指令 | 操作码 | 描述 |
|------|--------|------|
| F_ITOF | 0x54 | int to float |
| F_FTOI | 0x55 | float to int |
| F_ADD | 0x56 | 浮点加 |
| F_ADD_FI | 0x57 | float + int |
| F_ADD_IF | 0x58 | int + float |
| F_SUB | 0x59 | 浮点减 |
| F_SUB_FI | 0x5A | float - int |
| F_SUB_IF | 0x5B | int - float |
| F_MUL | 0x5C | 浮点乘 |
| F_MUL_FI | 0x5D | float * int |
| F_MUL_IF | 0x5E | int * float |
| F_DIV | 0x5F | 浮点除 |
| F_DIV_FI | 0x60 | float / int |
| F_DIV_IF | 0x61 | int / float |
| F_NEG | 0x62 | 浮点取反 |
| F_LT | 0x63 | 浮点小于 |
| F_GT | 0x64 | 浮点大于 |
| F_EQ | 0x65 | 浮点等于 |
| F_NEQ | 0x66 | 浮点不等于 |
| F_LE | 0x67 | 浮点小于等于 |
| F_GE | 0x68 | 浮点大于等于 |

---

## 3. 系统调用 (0x80-0xDF)

### 3.1 I/O 函数

| 指令 | 操作码 | 参数 | 返回 | 描述 |
|------|--------|------|------|------|
| putchar | 0x80 | 1 | 0 | 输出字符 |
| getchar | 0x81 | 0 | 1 | 读取字符 |
| printf | 0x82 | 变长 | 0 | 格式化输出 |
| sprintf | 0xB8 | 变长 | 0 | 格式化到字符串 |

### 3.2 字符串函数

| 指令 | 操作码 | 参数 | 返回 | 描述 |
|------|--------|------|------|------|
| strcpy | 0x83 | 2 | 0 | 复制字符串 |
| strlen | 0x84 | 1 | 1 | 字符串长度 |
| strcat | 0xA6 | 2 | 0 | 连接字符串 |
| strchr | 0xA7 | 2 | 1 | 查找字符 |
| strcmp | 0xA8 | 2 | 1 | 比较字符串 |
| strstr | 0xA9 | 2 | 1 | 查找子串 |

### 3.3 字符分类

| 指令 | 操作码 | 描述 |
|------|--------|------|
| isalnum | 0x9B | 字母或数字 |
| isalpha | 0x9C | 字母 |
| isdigit | 0x9E | 数字 |
| islower | 0xA0 | 小写字母 |
| isupper | 0xA4 | 大写字母 |
| isspace | 0xA3 | 空白字符 |
| tolower | 0xAA | 转小写 |
| toupper | 0xAB | 转大写 |

### 3.4 内存操作

| 指令 | 操作码 | 参数 | 描述 |
|------|--------|------|------|
| memset | 0xAC | 3 | 填充内存 |
| memcpy | 0xAD | 3 | 复制内存 |
| memmove | 0xBD | 3 | 移动内存（可重叠） |

### 3.5 文件操作

| 指令 | 操作码 | 参数 | 返回 | 描述 |
|------|--------|------|------|------|
| fopen | 0xAE | 2 | 1 | 打开文件 |
| fclose | 0xAF | 1 | 0 | 关闭文件 |
| fread | 0xB0 | 4 | 1 | 读取文件 |
| fwrite | 0xB1 | 4 | 1 | 写入文件 |
| fseek | 0xB2 | 3 | 1 | 定位文件 |
| ftell | 0xB3 | 1 | 1 | 获取位置 |
| feof | 0xB4 | 1 | 1 | 检查文件尾 |

### 3.6 图形函数

| 指令 | 操作码 | 参数 | 描述 |
|------|--------|------|------|
| SetScreen | 0x85 | 1 | 设置屏幕模式 (0=大字体, 1=小字体) |
| UpdateLCD | 0x86 | 1 | 更新 LCD |
| Refresh | 0x89 | 0 | 刷新屏幕 |
| ClearScreen | 0x8E | 0 | 清屏 |
| Point | 0x94 | 3 | 画点 (x, y, type) |
| GetPoint | 0x95 | 2 | 取点颜色 |
| Line | 0x96 | 5 | 画线 (x0,y0,x1,y1,type) |
| Box | 0x97 | 6 | 画矩形框 (x0,y0,x1,y1,fill,type) |
| Circle | 0x98 | 5 | 画圆 (x,y,r,fill,type) |
| Ellipse | 0x99 | 6 | 画椭圆 (x,y,a,b,fill,type) |
| Block | 0x8B | 5 | 画实心矩形 |
| Rectangle | 0x8C | 5 | 画空心矩形 |
| TextOut | 0x8A | 4 | 文本输出 (x,y,string,type) |
| WriteBlock | 0x88 | 6 | 写位图 |
| GetBlock | 0xC7 | 6 | 取屏幕图形 |
| FillArea | 0xCA | 3 | 填充区域 |
| XDraw | 0xC5 | 1 | 全屏特效 |

**type 参数说明**:
- bit 0-2: 绘图模式 (0=清除, 1=设置, 2=取反, 3=或, 4=与, 5=异或)
- bit 3: 反转标志
- bit 6: 缓冲区选择（各函数行为不同！）
  - Point/Line: bit6=0 屏幕, bit6=1 GBUF
  - TextOut/WriteBlock: bit6=0 GBUF, bit6=1 屏幕（相反！）
- bit 7 (TextOut): 字体大小 (0=小字体, 1=大字体)

### 3.7 输入函数

| 指令 | 操作码 | 参数 | 返回 | 描述 |
|------|--------|------|------|------|
| Inkey | 0x93 | 0 | 1 | 读取按键 |
| CheckKey | 0xBC | 1 | 1 | 检查按键 |
| PutKey | 0xF1 | 1 | 1 | 模拟按键 |
| ReleaseKey | 0xC6 | 1 | 0 | 释放按键 |

### 3.8 数学函数

| 指令 | 操作码 | 参数 | 返回 | 描述 |
|------|--------|------|------|------|
| abs | 0x8F | 1 | 1 | 绝对值 |
| rand | 0x90 | 0 | 1 | 随机数 |
| srand | 0x91 | 1 | 0 | 随机数种子 |
| Sin | 0xC8 | 1 | 1 | 正弦 (返回值*1024) |
| Cos | 0xC9 | 1 | 1 | 余弦 (返回值*1024) |

### 3.9 时间和延迟

| 指令 | 操作码 | 参数 | 返回 | 描述 |
|------|--------|------|------|------|
| Delay | 0x87 | 1 | 0 | 延迟 |
| Getms | 0xBB | 0 | 1 | 获取毫秒数 |
| GetTime | 0xC2 | 1 | 0 | 获取时间 |
| SetTime | 0xC3 | 1 | 0 | 设置时间 |

### 3.10 目录操作

| 指令 | 操作码 | 参数 | 返回 | 描述 |
|------|--------|------|------|------|
| opendir | 0xD2 | 1 | 1 | 打开目录 |
| readdir | 0xD3 | 1 | 1 | 读取目录 |
| closedir | 0xD5 | 1 | 1 | 关闭目录 |
| ChDir | 0xC0 | 1 | 1 | 改变目录 |
| FileList | 0xC1 | 1 | 1 | 文件列表 |
| MakeDir | 0xB9 | 1 | 1 | 创建目录 |
| DeleteFile | 0xBA | 1 | 1 | 删除文件 |

---

## 4. 内存布局

```
0x0000 - 0x063F: VRAM (160x80 黑白屏幕, 1600 bytes)
0x0640 - 0x0C7F: GBUF (绘图缓冲区, 1600 bytes)
0x0C80 - 0x0FFF: TEXT (文本缓冲区, ~512 bytes)
0x1000 - 0x1FFF: HEAP (堆)
0x2000+       : GLOBAL RAM (全局变量)
0x7000 - 0x74FF: STRBUF (字符串缓冲区)
0x8000+       : GBUF_OFFSET_LVM (兼容偏移)
```

---

## 5. 句柄编码 (Handle Encoding)

用于 STORE, INC, DEC 等指令的地址编码：

```
Bits 0-15:  地址偏移量
Bits 16-18: 类型 (0x1=byte, 0x2=word, 0x4=dword)
Bit 23:     基址标记 (1=局部变量 ebp+offset, 0=全局变量)
```

常量定义：
```typescript
HANDLE_TYPE_BYTE  = 0x010000  // 1 << 16
HANDLE_TYPE_WORD  = 0x020000  // 2 << 16
HANDLE_TYPE_DWORD = 0x040000  // 4 << 16
HANDLE_BASE_EBP   = 0x800000  // 1 << 23
```

---

## 6. 字符串掩码 (strMask)

V3.0 特性，用于字符串加密：

1. 指令 `0x43 [byte]` 设置当前 strMask
2. 指令 `0x0D` 读取字符串时，每个字节与 strMask 异或

```
存储: plain_char ^ strMask
读取: (stored_char ^ strMask) = plain_char
```

默认 strMask = 0（无加密）

---

## 7. 栈帧布局

函数调用时的栈帧结构：

```
[base+0]  返回地址低字节 (PC & 0xFF)
[base+1]  返回地址中字节 ((PC >> 8) & 0xFF)
[base+2]  返回地址高字节 ((PC >> 16) & 0xFF)
[base+3]  旧 BASE 低字节
[base+4]  旧 BASE 高字节
[base+5+] 参数和局部变量...
```

FUNC 指令参数：
- frameSize: 5 (header) + params*4 + locals
- paramCount: 参数个数

---

## 8. 扩展命名空间

### 8.1 0xD3 System Core
通过 `PUSH sub_opcode; CALL_D3` 调用

| Sub-op | 函数 |
|--------|------|
| 0x00 | GetPID |
| 0x01 | SetBrightness |
| 0x02 | GetBrightness |
| 0x14 | PY2GB |
| 0x1B | Idle |
| 0x1C | GetVersion |

### 8.2 0xD4 Math Framework
通过 `PUSH sub_opcode; CALL_D4` 调用

| Sub-op | 函数 |
|--------|------|
| 0x02 | fadd |
| 0x03 | fsub |
| 0x04 | fmul |
| 0x05 | fdiv |
| 0x06 | f2i |
| 0x07 | sin |
| 0x08 | cos |
| 0x09 | tan |
| 0x0D | sqrt |
| 0x0E | exp |
| 0x0F | log |

---

*本文档包含完整的 LAV 格式和指令集信息，供 AI 快速参考*
*详细原始文档见 `docs/lav_format.md` 和 `docs/LavaX-docs.md`*
