# LAV 指令速查表

> 常用指令快速查找，按使用场景分类

---

## 📊 常用指令速查

### 数据操作
| 操作 | 指令 | 操作码 | 示例 |
|------|------|--------|------|
| 压入字节 | PUSH_B | 0x01 | `PUSH_B 10` → 压入 0x0000000A |
| 压入字 | PUSH_W | 0x02 | `PUSH_W 1000` → 压入 0x000003E8 |
| 压入双字 | PUSH_D | 0x03 | `PUSH_D 0x2000` → 压入地址 |
| 弹出丢弃 | POP | 0x38 | 栈顶丢弃 |
| 复制栈顶 | DUP (模拟) | - | `LD_IND` + `PUSH_D` |

### 变量访问
| 操作 | 全局变量 | 局部变量 |
|------|----------|----------|
| 读取 char | `LD_G_B offset` | `LD_L_B offset` |
| 读取 int | `LD_G_W offset` | `LD_L_W offset` |
| 读取 long | `LD_G_D offset` | `LD_L_D offset` |
| 数组读取 | `LD_G_O_B offset` | `LD_L_O_B offset` |
| 取地址 | `LEA_G_D offset` | `LEA_L_D offset` |
| 间接读取 | `LD_IND` | - |
| 存储 | `STORE` | - |

### 算术运算
| 操作 | 指令 | 栈变化 | 说明 |
|------|------|--------|------|
| a + b | ADD | pop b, pop a, push a+b | |
| a - b | SUB | pop b, pop a, push a-b | 注意顺序 |
| a * b | MUL | pop b, pop a, push a*b | |
| a / b | DIV | pop b, pop a, push a/b | 整数除法 |
| a % b | MOD | pop b, pop a, push a%b | |
| -a | NEG | pop a, push -a | |
| ~a | NOT | pop a, push ~a | 按位取反 |
| !a | L_NOT | pop a, push !a | 逻辑非 |
| ++a | INC_PRE | pop addr, inc, push val | |
| a++ | INC_POS | pop addr, push val, inc | |

### 比较运算
| 比较 | 指令 | 结果 |
|------|------|------|
| a == b | EQ | 真=-1, 假=0 |
| a != b | NEQ | 真=-1, 假=0 |
| a < b | LT | 真=-1, 假=0 |
| a > b | GT | 真=-1, 假=0 |
| a <= b | LE | 真=-1, 假=0 |
| a >= b | GE | 真=-1, 假=0 |

### 位运算
| 操作 | 指令 |
|------|------|
| a & b | AND |
| a | b | OR |
| a ^ b | XOR |
| a << b | SHL |
| a >> b | SHR |

### 逻辑运算
| 操作 | 指令 | 说明 |
|------|------|------|
| a && b | L_AND | 短路求值 |
| a || b | L_OR | 短路求值 |

---

## 🔄 控制流

### 条件跳转
```asm
; if (a == 0) goto label
  ... (计算a)
  JZ label      ; 0x39 + u24地址

; if (a != 0) goto label
  ... (计算a)
  JNZ label     ; 0x3A + u24地址
```

### 无条件跳转
```asm
  JMP label     ; 0x3B + u24地址
```

### 函数调用
```asm
; 调用函数
  CALL func     ; 0x3D + u24地址

; 函数定义
func:
  FUNC frameSize paramCount  ; 0x3E + u16 + u8
  ... (函数体)
  RET           ; 0x3F

; 程序入口
  SPACE globalSize  ; 0x3C + u16
  JMP main

main:
  FUNC ...
  ...
  EXIT          ; 0x40
```

### 循环模式
```asm
; while (condition) { ... }
L_start:
  ... (condition)
  JZ L_end      ; 条件假则退出
  ... (循环体)
  JMP L_start
L_end:

; for (init; condition; step) { ... }
  ... (init)
L_start:
  ... (condition)
  JZ L_end
  ... (循环体)
L_step:
  ... (step)
  JMP L_start
L_end:

; break (跳出循环)
  JMP L_end

; continue (跳到 step)
  JMP L_step
```

---

## 💾 内存操作

### 数组访问模式
```asm
; global_array[i] = value
  PUSH_D value
  PUSH_D i
  PUSH_D elementSize    ; 1, 2, or 4
  MUL
  PUSH_D global_array_offset
  ADD
  LEA_ABS 0             ; 转换为地址
  STORE
  POP

; value = global_array[i]
  PUSH_D i
  PUSH_D elementSize
  MUL
  PUSH_D global_array_offset
  ADD
  LD_IND                ; 读取值
```

### 指针操作
```asm
; *ptr = value
  PUSH_D value
  PUSH_D ptr
  STORE
  POP

; value = *ptr
  PUSH_D ptr
  LD_IND

; ptr = &var
  LEA_G_D var_offset    ; 或 LEA_L_D
```

---

## 🎨 图形操作

### 基本绘图
```asm
; SetScreen(mode)  0=大字体, 1=小字体
  PUSH_B mode
  SetScreen

; Point(x, y, type)
  PUSH_D x
  PUSH_D y
  PUSH_B type           ; bit6: 0=屏幕, 1=GBUF
  Point

; Line(x0, y0, x1, y1, type)
  PUSH_D x0
  PUSH_D y0
  PUSH_D x1
  PUSH_D y1
  PUSH_B type
  Line

; Circle(x, y, r, fill, type)
  PUSH_D x
  PUSH_D y
  PUSH_D r
  PUSH_B fill           ; 0=空心, 1=实心
  PUSH_B type
  Circle
```

### 文本输出
```asm
; TextOut(x, y, string, type)
  PUSH_D x
  PUSH_D y
  PUSH_D string_addr
  PUSH_B type           ; bit7: 字体大小, bit6: 0=GBUF, 1=屏幕
  TextOut
```

### 屏幕刷新
```asm
  Refresh               ; 刷新 GBUF 到屏幕
```

**注意 type 参数**: 
- Point/Line: bit6=0 → 屏幕, bit6=1 → GBUF
- TextOut: bit6=0 → GBUF, bit6=1 → 屏幕（相反！）

---

## 📝 字符串操作

### 常用字符串函数
```asm
; putchar(c)
  PUSH_B c
  putchar

; printf(format, ...)
  PUSH_D format_addr
  ... (其他参数)
  printf                ; 参数个数由 format 中的 % 决定

; strlen(str)
  PUSH_D str_addr
  strlen
  ; 返回值在栈顶

; strcpy(dest, src)
  PUSH_D dest_addr
  PUSH_D src_addr
  strcpy

; strcat(dest, src)
  PUSH_D dest_addr
  PUSH_D src_addr
  strcat

; strcmp(s1, s2)
  PUSH_D s1_addr
  PUSH_D s2_addr
  strcmp
  ; 返回值: <0 s1<s2, =0 s1==s2, >0 s1>s2
```

---

## 📁 文件操作

```asm
; fp = fopen(filename, mode)
  PUSH_D filename_addr
  PUSH_D mode_addr      ; "r", "w", "rb", "wb"
  fopen
  ; 返回值: 文件句柄

; fclose(fp)
  PUSH_W fp
  fclose

; count = fread(buffer, size, count, fp)
  PUSH_D buffer_addr
  PUSH_D size
  PUSH_D count
  PUSH_W fp
  fread
  ; 返回值: 实际读取个数

; count = fwrite(buffer, size, count, fp)
  PUSH_D buffer_addr
  PUSH_D size
  PUSH_D count
  PUSH_W fp
  fwrite

; fseek(fp, offset, whence)
  PUSH_W fp
  PUSH_D offset
  PUSH_B whence         ; 0=SEEK_SET, 1=SEEK_CUR, 2=SEEK_END
  fseek
```

---

## 🔢 立即数运算

当操作数是常量时，使用立即数版本更高效：

```asm
; a + 10
  ADD_C 10              ; vs PUSH_W 10 + ADD

; a - 5
  SUB_C 5

; a * 4
  MUL_C 4

; a == 0
  EQ_C 0

; a > 100
  GT_C 100
```

---

## 🧩 常见编程模式

### 变量声明和初始化
```asm
  SPACE 100             ; 分配 100 字节全局空间

; int a = 10;
  PUSH_B 10
  LEA_G_W a_offset
  STORE
  POP

; int arr[5] = {1,2,3,4,5};
  INIT arr_offset 20 1 0 0 0 2 0 0 0 3 0 0 0 4 0 0 0 5 0 0 0
```

### 函数调用
```asm
; int result = add(3, 5);
  PUSH_B 3              ; 参数1
  PUSH_B 5              ; 参数2
  CALL add
  ; 返回值在栈顶
  LEA_L_W result_offset ; 存储到局部变量
  STORE
  POP

; void func(int a, int b) { ... }
func:
  FUNC frameSize 2      ; 2个参数
  ; 参数可通过 LD_L_D 访问
  RET
```

### 条件表达式
```asm
; a = (b > c) ? 1 : 0
  LD_L_D b_offset
  LD_L_D c_offset
  GT
  JZ L_else
  PUSH_B 1
  JMP L_end
L_else:
  PUSH_B 0
L_end:
  LEA_L_W a_offset
  STORE
  POP
```

---

## ⚠️ 常见陷阱

1. **SUB 顺序**: `a - b` 是 push a, push b, SUB → 结果是 a - b ✓
2. **DIV/MOD 除零**: 除数为 0 时结果未定义
3. **栈平衡**: 系统调用后注意返回值处理，有些有返回值，有些没有
4. **字符串地址**: PUSH_STR 压入的是临时缓冲区地址，可能需要立即复制
5. **mode 参数**: 不同函数的 bit 6 含义可能不同！

---

*本文档提供常用指令的快速参考*
*详细指令说明见 LAV_FORMAT_REFERENCE.md*
