# LavaX 编程模式指南

> 常见编程模式的汇编实现，帮助 AI 理解代码生成逻辑

---

## 1. 变量和类型

### 1.1 基本类型大小
| 类型 | 大小 | 指令后缀 |
|------|------|----------|
| char | 1 字节 | _B |
| int | 2 字节 | _W |
| long | 4 字节 | _D |
| addr | 4 字节 | _D (别名) |

### 1.2 变量偏移计算
```
全局变量偏移 = 从 0x2000 开始累加
局部变量偏移 = 从 5 开始 (跳过栈帧头部)
```

### 1.3 变量声明生成
```c
int a;        → SPACE 增加 2
char b;       → SPACE 增加 1
long c;       → SPACE 增加 4
int arr[10];  → SPACE 增加 20 (10 * 2)
```

---

## 2. 表达式求值

### 2.1 简单表达式
```c
a = b + c;
```
汇编：
```asm
  LD_L_W b_offset      ; 加载 b
  LD_L_W c_offset      ; 加载 c
  ADD                  ; 相加
  LEA_L_W a_offset     ; 取 a 的地址
  STORE                ; 存储
  POP                  ; 丢弃 STORE 返回值
```

### 2.2 复合表达式
```c
a = b + c * d;
```
汇编（注意乘法优先级）：
```asm
  LD_L_W c_offset      ; 加载 c
  LD_L_W d_offset      ; 加载 d
  MUL                  ; c * d
  LD_L_W b_offset      ; 加载 b
  ADD                  ; b + (c * d)
  LEA_L_W a_offset
  STORE
  POP
```

### 2.3 带立即数的表达式
```c
a = b * 4;
```
汇编（优化版）：
```asm
  LD_L_W b_offset
  MUL_C 4              ; 立即数乘法，更高效
  LEA_L_W a_offset
  STORE
  POP
```

---

## 3. 控制流

### 3.1 if-else
```c
if (a > b) {
    x = 1;
} else {
    x = 2;
}
```
汇编：
```asm
  LD_L_W a_offset
  LD_L_W b_offset
  GT
  JZ L_else
  
  ; then 分支
  PUSH_B 1
  LEA_L_W x_offset
  STORE
  POP
  JMP L_end

L_else:
  ; else 分支
  PUSH_B 2
  LEA_L_W x_offset
  STORE
  POP

L_end:
```

### 3.2 while 循环
```c
while (i < 10) {
    i++;
}
```
汇编：
```asm
L_while:
  LD_L_W i_offset
  PUSH_B 10
  LT
  JZ L_end

  ; 循环体
  LEA_L_W i_offset
  INC_POS
  POP                  ; 丢弃 ++ 返回值

  JMP L_while
L_end:
```

### 3.3 for 循环
```c
for (i = 0; i < 10; i++) {
    sum += i;
}
```
汇编：
```asm
  ; 初始化
  PUSH_B 0
  LEA_L_W i_offset
  STORE
  POP

L_for:
  ; 条件检查
  LD_L_W i_offset
  PUSH_B 10
  LT
  JZ L_end

  ; 循环体
  LD_L_W sum_offset
  LD_L_W i_offset
  ADD
  LEA_L_W sum_offset
  STORE
  POP

L_step:
  ; 步进
  LEA_L_W i_offset
  INC_POS
  POP
  JMP L_for

L_end:
```

### 3.4 break 和 continue
```c
while (1) {
    if (a == 0) break;
    if (b == 0) continue;
    ...
}
```
汇编：
```asm
L_while:
  LD_L_W a_offset
  PUSH_B 0
  EQ
  JNZ L_break          ; break 跳转到循环后

  LD_L_W b_offset
  PUSH_B 0
  EQ
  JNZ L_continue       ; continue 跳转到步进

  ... (循环体)

L_continue:
  JMP L_while
L_break:
```

---

## 4. 数组操作

### 4.1 一维数组访问
```c
arr[i] = value;
```
汇编（int 数组）：
```asm
  PUSH_D value
  LD_L_W i_offset
  PUSH_B 2             ; 元素大小
  MUL                  ; i * 2
  PUSH_D arr_offset
  ADD                  ; base + i * 2
  LEA_ABS 0            ; 转换为地址
  STORE
  POP
```

### 4.2 二维数组访问
```c
arr[i][j] = value;
```
汇编（int arr[5][10]）：
```asm
  PUSH_D value
  
  ; 计算 i * 列数 + j
  LD_L_W i_offset
  PUSH_B 10            ; 每行 10 个元素
  MUL                  ; i * 10
  LD_L_W j_offset
  ADD                  ; i * 10 + j
  PUSH_B 2             ; 元素大小
  MUL                  ; (i * 10 + j) * 2
  
  PUSH_D arr_offset
  ADD
  LEA_ABS 0
  STORE
  POP
```

### 4.3 数组初始化
```c
int arr[5] = {1, 2, 3, 4, 5};
```
汇编：
```asm
  INIT arr_offset 20 1 0 0 0 2 0 0 0 3 0 0 0 4 0 0 0 5 0 0 0
  ; INIT 地址 总长度 数据...
  ; int = 4 字节存储，但 LavaX 可能使用不同格式
```

---

## 5. 指针操作

### 5.1 取地址
```c
ptr = &a;
```
汇编：
```asm
  LEA_L_D a_offset     ; 取 a 的地址
  LEA_L_D ptr_offset   ; 取 ptr 的地址
  STORE
  POP
```

### 5.2 解引用（读取）
```c
value = *ptr;
```
汇编：
```asm
  LD_L_D ptr_offset    ; 加载 ptr 的值（地址）
  LD_IND               ; 从该地址读取
  LEA_L_W value_offset
  STORE
  POP
```

### 5.3 解引用（写入）
```c
*ptr = value;
```
汇编：
```asm
  PUSH_D value
  LD_L_D ptr_offset    ; 加载 ptr 的值（地址）
  PUSH_D HANDLE_TYPE_DWORD  ; 0x40000
  OR                   ; 组合成句柄
  STORE
  POP
```

### 5.4 指针运算
```c
ptr++;                // 指针自增
*(ptr + i) = value;   // 偏移写入
```
汇编：
```asm
; ptr++ (int* ptr, 所以 +2)
  LD_L_D ptr_offset
  PUSH_B 2
  ADD
  LEA_L_D ptr_offset
  STORE
  POP

; *(ptr + i) = value
  PUSH_D value
  LD_L_D ptr_offset
  LD_L_W i_offset
  PUSH_B 2             ; int 大小
  MUL
  ADD                  ; ptr + i * 2
  PUSH_D HANDLE_TYPE_DWORD
  OR
  STORE
  POP
```

---

## 6. 函数调用

### 6.1 函数定义
```c
int add(int a, int b) {
    return a + b;
}
```
汇编：
```asm
add:
  FUNC frameSize 2     ; 2 个参数
  
  ; 访问参数: 参数在 base + 5, base + 9, ...
  LD_L_W 5             ; a
  LD_L_W 9             ; b
  ADD
  
  RET                  ; 返回值在栈顶
```

### 6.2 函数调用
```c
result = add(3, 5);
```
汇编：
```asm
  PUSH_B 3             ; 参数1
  PUSH_B 5             ; 参数2
  CALL add
  
  ; 返回值在栈顶
  LEA_L_W result_offset
  STORE
  POP
```

### 6.3 递归调用
```c
int fib(int n) {
    if (n <= 1) return n;
    return fib(n - 1) + fib(n - 2);
}
```
汇编要点：
```asm
fib:
  FUNC frameSize 1     ; 1 个参数 n
  
  ; if (n <= 1)
  LD_L_W 5             ; n
  PUSH_B 1
  LE
  JZ L_recursive
  
  ; return n
  LD_L_W 5
  RET

L_recursive:
  ; fib(n - 1)
  LD_L_W 5
  PUSH_B 1
  SUB
  CALL fib             ; 结果在栈顶
  
  ; fib(n - 2)
  LD_L_W 5
  PUSH_B 2
  SUB
  CALL fib             ; 结果在栈顶
  
  ; 相加并返回
  ADD
  RET
```

---

## 7. 字符串操作

### 7.1 字符串复制
```c
strcpy(dest, src);
```
手动实现（如果不用系统调用）：
```asm
  PUSH_D dest_addr
  PUSH_D src_addr
  strcpy               ; 使用系统调用更简单
```

### 7.2 字符串长度计算
```c
len = strlen(str);
```
手动实现：
```asm
  PUSH_B 0             ; 计数器
  
L_loop:
  DUP                  ; 复制计数器
  PUSH_D str_addr
  ADD
  LD_IND               ; 读取字符
  JZ L_end             ; 如果是 0，结束
  
  POP                  ; 丢弃字符
  PUSH_B 1
  ADD                  ; 计数器++
  JMP L_loop

L_end:
  ; 计数器值在栈顶
```

---

## 8. 结构体（简化版）

由于结构体支持有限，通常用偏移量模拟：

```c
struct Point {
    int x;    // offset 0
    int y;    // offset 2
};

struct Point p;
p.x = 10;
p.y = 20;
```
汇编：
```asm
  ; p.x = 10
  PUSH_B 10
  LEA_L_W p_offset     ; offset 0
  STORE
  POP
  
  ; p.y = 20
  PUSH_B 20
  LEA_L_W p_offset+2   ; offset 2
  STORE
  POP
```

---

## 9. 常见优化

### 9.1 立即数运算
```asm
; 低效
  PUSH_W 10
  ADD

; 高效
  ADD_C 10
```

### 9.2 连续存储
```asm
; 低效: 逐个赋值
  PUSH_B 1
  LEA_G_W a
  STORE
  POP
  PUSH_B 2
  LEA_G_W b
  STORE
  POP
  ...

; 高效: 使用 INIT
  INIT global_offset 8 1 0 2 0 3 0 4 0
```

### 9.3 循环展开（小循环）
```asm
; for (i = 0; i < 4; i++) arr[i] = 0;

; 展开版本（更快，更大）
  PUSH_B 0
  LEA_G_W arr+0
  STORE POP
  PUSH_B 0
  LEA_G_W arr+2
  STORE POP
  PUSH_B 0
  LEA_G_W arr+4
  STORE POP
  PUSH_B 0
  LEA_G_W arr+6
  STORE POP
```

---

## 10. 调试技巧

### 10.1 打印寄存器值
```asm
  ; 打印栈顶值
  DUP                  ; 复制要打印的值
  printf "%d\n"        ; 注意格式字符串
```

### 10.2 断点模拟
```asm
  getchar              ; 等待按键，相当于断点
```

### 10.3 栈状态检查
```asm
  ; 检查栈深度
  PUSH_D current_sp    ; 需要知道当前 sp
  SUB                  ; 计算差值
```

---

*本文档提供常见编程模式的汇编实现参考*
*具体实现可能因编译器版本而异*
