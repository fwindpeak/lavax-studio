# LavaX 语言编程手册

---

## 前言

> **本手册是LavaXIde软件的一部分，受著作权法和国际公约的保护。作者允许自由传播和复制本手册，但禁止未经授权的任何形式的增减修改行为，违者必究。**

LavaX语言是一种主要面向（但不限于）手持计算设备（包括掌上电脑，电子词典等）的跨平台高级语言。

LavaX语言基于C语言的语法，并做了适当的改善，以适应LavaX语言跨平台、安全、易于掌握的特点。

由于时间和精力关系，作者不打算把这个手册写成一个详尽的入门教程。读者最好有C语言基础。没有C语言基础的读者可参考《C程序设计》这本书（或任何一本C语言入门书，C++的知识对学习LavaX语言是没有必要的）。

---

## LavaX语言的历史

LavaX语言是一种特别适合于手持计算设备（包括掌上电脑，电子词典等）的跨平台高级语言。

LavaX语言的前身是LAVA语言。此前，手持计算设备的操作系统花样繁多，为手持计算设备编写程序的语言从汇编，BASIC，到C，C++等。这些语言的一个共同缺点是：为一种系统或机器编写的程序，换到别的系统或机器上就无法运行。为不同的机器开发或移植同一软件，对程序员来说是很苦恼的。2003年9月，我打算编写一种面向手持计算设备的跨平台语言。因为我的英文名字的首字母是L，所以我把这个语言命名为LAVA语言。利用国庆节和业余时间，我完成了LAVA的基本架构和编译器设计。为实现跨平台运行，LAVA语言包括一个统一的编译器和不同手持计算设备平台上的虚拟机。10月12日，文曲星（注：一种电子词典的品牌）上的LAVA虚拟机完成，同时发表了第一个LAVA程序《博士失踪记》（移植自C语言同名作）。此后，陆续开发了电脑上的LAVA虚拟机和文曲星不同型号的LAVA虚拟机。由于LAVA语言的跨平台特性，深受广大编程爱好者欢迎，目前据不完全统计，网上已经有几十种LAVA编程爱好者开发的LAVA语言程序。

早期的LAVA语言只支持黑白图形显示。2004年9月，支持16级灰度图形显示的LAVA2发表。

为了LAVA语言的持续稳定发展，我决定将LAVA语言更名为LavaX语言。LavaX语言在保持对LAVA，LAVA2的兼容基础上，增加了一些新特性，并修改了一些不利于跨平台的旧有规则。

---

## LavaX语言的优点

LavaX语言在手持计算设备开发领域的优点：

1. **跨平台**：由源代码编译的lav文件不做任何修改即可直接在任何有LavaX虚拟机的硬件平台上执行，无须再次编译。

2. **开发效率高**：在一些低性能CPU（如6502）上一般使用汇编语言开发。使用LavaX这种类C语言开发，效率远高于用汇编语言来开发。有人可能担心LavaX语言的运行效率问题。任何高级语言的运行效率都要低于汇编，这是毫无疑问的。LavaX虚拟机的大部分与速度相关的代码都是用汇编直接编写的，凡是对速度要求高的运算，LavaX虚拟机都提供高效的用汇编语言编写的函数供程序员调用。这就既满足了开发的高效率，又满足了运行的高效率。

3. **更安全**：在LavaX虚拟机上只能运行虚拟机语言代码，目标机器代码是不允许直接运行的，这就避免了恶意代码的执行。在LavaX虚拟机上运行的程序只能使用虚拟机给定的内存，这也避免了非法内存访问对系统的破坏。

4. **更容易维护和移植**：如果用汇编或C编程，硬件更换了，操作系统更换了，原有软件都需要做大幅度的修改或移植。跨平台特性保证在系统升级后，原有软件可以几乎原封不动直接拿来运行。

---

## 数据类型

### 基本类型

| 类型 | 说明 | 范围 |
|------|------|------|
| `char` | 8位无符号整数 | 0～255 |
| `int` | 16位有符号整数 | -32768～32767 |
| `long` | 32位有符号整数 | -2147483648～2147483647 |
| `float` | 32位IEEE浮点数 | -3.4e38～3.4e38 |
| `addr` | 32位内存地址（实际使用24位） | - |

### 构造类型

- **数组**：包括char数组，int数组，long数组，float数组
- **结构体**

### 常量

- **整型常量**：例如 `-1`, `100`, `0x4000`, `'a'`
- **浮点型常量**：例如 `-1.23`, `88.`, `3.2e-15`
- **字符串常量**：例如 `"LavaX"`

### 变量

- 变量名只能由字母、数字和下划线三种字符组成，且第一个字符必须为字母或下划线。
- 变量名长度不限，但编译器只取前31个字符，超出部分被截去。

> **注意**：
> - LavaX本质上是无类型的语言。
> - 实际上addr只是long的别名，都代表一个32位的数据。至于数据的内容，可以是整数，也可以是内存地址。

---

## 运算符和优先级

| 优先级 | 运算符 | 含义 |
|:------:|--------|------|
| 1 | `()` | 圆括号 |
| | `[]` | 下标运算符 |
| | `.` | 结构体成员运算符 |
| 2 | `!` | 逻辑非运算符 |
| | `~` | 按位取反运算符 |
| | `++` | 自增运算符 |
| | `--` | 自减运算符 |
| | `-` | 负号运算符 |
| | `(类型)` | 类型转换运算符 |
| | `*` | 地址运算符 |
| | `&` | 取地址运算符 |
| | `sizeof` | 长度运算符 |
| 3 | `*` | 乘法运算符 |
| | `/` | 除法运算符 |
| | `%` | 求余运算符 |
| 4 | `+` | 加法运算符 |
| | `-` | 减法运算符 |
| 5 | `<<` | 左移运算符 |
| | `>>` | 右移运算符 |
| 6 | `==` `!=` `>=` `<=` `>` `<` | 关系运算符 |
| 7 | `&` | 按位与运算符 |
| | `\|` | 按位或运算符 |
| | `^` | 按位异或运算符 |
| 8 | `&&` | 逻辑与运算符 |
| | `\|\|` | 逻辑或运算符 |
| 9 | `=` | 赋值运算符 |

所有2级运算符都是单目运算符，其余都是双目运算符。除2、9级运算符外，所有运算的结合方向都是自左至右。

> 注意：支持`a=b=c`这样的赋值形式。

---

## 语句

### 1. 控制语句

```c
if () ~ else ~
for () ~
while () ~
do ~ while ()
continue
break
goto
return
```

上面8种语句中的括号`()`表示其中是一个条件，`~`表示内嵌的语句。

### 2. 函数调用语句

例如：
```c
printf("This is LAVAX.");
```

### 3. 表达式语句

例如：
```c
a=3;
i++;
```

### 4. 空语句

下面是一个空语句：
```c
;
```

### 5. 复合语句

可以用`{}`把一些语句括起来成为复合语句。

---

## 函数

下面仅指出LavaX函数与C函数的不同之处。

函数定义**必须**有类型标识符。下面语句是错误的：
```c
main() {语句}
```

应该写成：
```c
void main() {语句}
```

**return语句**不因函数返回值的类型而进行类型转换。例如：
```c
int add(int x,int y)
{
    return x+y;
}
```

尽管定义的返回值是int，但仍返回long值。如一定要返回int，请自行转换，如：
```c
return (int)(x+y);
```

**调用函数时**参数不因形参类型而进行类型转换。例如：
```c
float add(float x,float y)
{
    return x+y;
}
...
x=add(a,1);
...
```

这里形参是float而实参是long，显然无法取得预期结果，应改为：
```c
x=add(a,1.0);
```

或者：
```c
x=add(a,(float)1);
```

---

## 编译预处理

### （一）定义符号常量

```c
#define 标识符 常量表达式
```

例如：
```c
#define DELAY_TIME 200
```

系统已经定义好了以下常量：
```c
#define NULL 0
#define SEEK_SET 0
#define SEEK_CUR 1
#define SEEK_END 2
#define EOF -1
#define TRUE -1
#define FALSE 0
```

这些常量不需要在LavaX程序中定义了。

```c
#undef 标识符
```
取消符号常量定义

### （二）文件包含

```c
#include "文件名"
```

例如：
```c
#include "time.h"
```

### （三）条件编译

条件编译命令有以下三种形式：

**1.**
```c
#ifdef 标识符
    程序段1
#else
    程序段2
#endif
```

**2.**
```c
#ifndef 标识符
    程序段1
#else
    程序段2
#endif
```

**3.**
```c
#if 常量表达式
    程序段1
#else
    程序段2
#endif
```

---

## 指针

LavaX没有专门的指针类型，但是LavaX有指针。

LavaX的long类型可以容纳下一个内存地址，所以当一个long变量的内容是一个内存地址时，这个变量就是事实上的指针。

例如：
```c
int a;
long b;
b=&a;
```

这时b就是一个指向变量a的指针。

为了使指针更容易一目了然，增加了一个新数据类型：`addr`。实际上addr是long的别名，二者的性质是完全相同的。只是，我们用addr的好处是，可以一眼看出某个变量是指针。

上例写成这样看起来就清晰多了：
```c
int a;
addr b;
b=&a;
```

**如何取指针指向的内容呢？** 具体到上例：
- `(int *)b` 就是b指向的int型变量的值。

> **注意这里和C语言的区别**：
> - 在C语言里`(int *)`是把后面的指针强制转换为int指针。
> - 在LavaX语言里`(int *)`是从后面的地址里取一个int类型的数据。
> - 此外，`(char *)`可以简写为`*`，这点也是与C语言不同的。

LavaX有`(char *)`, `(int *)`, `(long *)`, `(float *)`四种指针，都是指向简单变量的指针，如果需要对数组或结构进行操作，可以使用LavaX的"引用"。

---

## 引用

引用是LavaX语言的重要内容，正确、灵活地使用引用，可以使程序简洁、高效。

LavaX语言的引用与C++的引用概念有很大的不同，所以有C++基础的用户更要认真阅读本节内容。

**引用就是某一数据结构的一个别名**，对引用的操作与对数据结构操作完全一样。

引用可以是函数的形参，可以定义在函数内部，但不可以定义为全局变量。

一个引用既可以指向简单变量，也可以指向数组和结构。

下面的定义都是合法的：
```c
int &a;
float &b;
char &s[]
struct TIME &tm;
```

### 引用的赋值

在使用引用前需要对引用进行赋值。

引用若是函数的形参，通过实参传递就自动赋值了。

引用不同于一般变量，对其赋值的方法如下：
```c
&引用名=地址表达式
```

例如：
```c
int t;
int &a;
&a=&t;
```

### 引用的使用

对引用进行赋值后，引用就可以象一般数据一样使用了。

对于上例：
```c
a=5
```

和 `t=5` 的效果是完全一样的。

引用的作用远不止于此。由于LavaX的引用可以指向构造类型，弥补了LavaX指针只能指向简单变量的不足，在实现函数调用时大块数据传递以及实现链表操作方面简洁而高效。

可以说，**指针和引用是LavaX语言的重要特色**，掌握并能熟练使用指针和引用，才算真正掌握了LavaX语言。

---

# 函数参考手册

---

## abs

**原型**
```c
long abs(long x);
```

**功能**：求x的绝对值

**说明**：计算|x|，当x为负数时返回-x，否则返回x

**举例**
```c
void main()
{
    int x;
    
    SetScreen(0);
    x=-5;
    printf("|%d|=%d\n",x,abs(x));
    x=0;
    printf("|%d|=%d\n",x,abs(x));
    x=+5;
    printf("|%d|=%d\n",x,abs(x));
    getchar();
}
```

---

## Sin

**原型**
```c
int Sin(int deg);
```

**功能**：计算Sin(deg)的值

**说明**：deg的单位是度，取0～32767之间的整数。返回值是sin(deg)的小数值乘以1024（范围为-1024～1024）

**举例**
```c
void main()
{
    int i,x1,y1,x2,y2;
    
    x1=20;
    y1=40;
    Line(15,40,145,40,1);
    Line(20,0,20,79,1);
    for (i=3;i<=360;i=i+3) {
        x2=x1+1;
        y2=40-Sin(i)/27;
        Line(x1,y1,x2,y2,1);
        x1=x2;
        y1=y2;
    }
    getchar();
}
```

---

## Cos

**原型**
```c
int Cos(int deg);
```

**功能**：计算Cos(deg)的值

**说明**：deg的单位是度，取0～32767之间的整数。返回值是cos(deg)的小数值乘以1024（范围为-1024～1024）

**举例**
```c
void main()
{
    int i,x1,y1,x2,y2;
    
    x1=20;
    y1=40;
    Line(15,40,145,40,1);
    Line(20,0,20,79,1);
    for (i=3;i<=360;i=i+3) {
        x2=x1+1;
        y2=40-Cos(i)/27;
        Line(x1,y1,x2,y2,1);
        x1=x2;
        y1=y2;
    }
    getchar();
}
```

---

## rand

**原型**
```c
int rand();
```

**功能**：取得一个随机数值

**说明**：返回值的范围是0～32767

**举例**
```c
void main()
{
    SetScreen(0);
    printf("%d\n",rand());
    printf("%d\n",rand());
    printf("%d\n",rand());
    getchar();
}
```

---

## srand

**原型**
```c
void srand(long x);
```

**功能**：用x初始化随机数发生器

**举例**
```c
void main()
{
    int x;
    
    SetScreen(0);
    srand(0);
    printf("%d %d %d\n",rand(),rand(),rand());
    x=Getms();
    srand(x);
    printf("%d %d %d\n",rand(),rand(),rand());
    srand(x);
    printf("%d %d %d\n",rand(),rand(),rand());
    getchar();
}
```

---

## isalnum

**原型**
```c
int isalnum(char c);
```

**功能**：判断字符c是否为字母或数字

**说明**：当c为数字0-9或字母a-z及A-Z时，返回非零值，否则返回零

**举例**
```c
void alnum(char c)
{
    if (isalnum(c)) printf("%c:是字母或数字\n",c);
    else printf("%c:不是字母或数字\n",c);
}

void main()
{
    SetScreen(0);
    alnum('a');
    alnum('7');
    alnum('@');
    getchar();
}
```

---

## isalpha

**原型**
```c
int isalpha(char c);
```

**功能**：判断字符c是否为英文字母

**说明**：当c为英文字母a-z或A-Z时，返回非零值，否则返回零

**举例**
```c
void main()
{
    int c;
    
    SetScreen(0);
    printf("Press a key");
    for(;;) {
        c=getchar();
        if (isalpha(c)) printf("\n%c:是英文字母",c);
        else printf("\n%c:不是英文字母",c);
    }
}
```

---

## iscntrl

**原型**
```c
int iscntrl(char c);
```

**功能**：判断字符c是否为控制字符

**说明**：当c在0x00-0x1F之间或等于0x7F(DEL)时，返回非零值，否则返回零

**举例**
```c
void cntrl(char c)
{
    if (iscntrl(c)) printf("%d:是控制字符\n",c);
    else printf("%d:不是控制字符\n",c);
}

void main()
{
    SetScreen(0);
    cntrl('a');
    cntrl(0x0d);
    cntrl(0x7f);
    getchar();
}
```

---

## isdigit

**原型**
```c
int isdigit(char c);
```

**功能**：判断字符c是否为数字

**说明**：当c为数字0-9时，返回非零值，否则返回零

**举例**
```c
void digit(char c)
{
    if (isdigit(c)) printf("%c:是数字\n",c);
    else printf("%c:不是数字\n",c);
}

void main()
{
    SetScreen(0);
    digit('a');
    digit('9');
    digit('*');
    getchar();
}
```

---

## isgraph

**原型**
```c
int isgraph(char c);
```

**功能**：判断字符c是否为除空格外的可打印字符

**说明**：当c为可打印字符（0x21-0x7e）时，返回非零值，否则返回零

**举例**
```c
void graph(char c)
{
    if (isgraph(c)) printf("%c:是可见字符\n",c);
    else printf("%c:不是可见字符\n",c);
}

void main()
{
    SetScreen(0);
    graph('a');
    graph(' ');
    graph(0x7f);
    getchar();
}
```

---

## islower

**原型**
```c
int islower(char c);
```

**功能**：判断字符c是否为小写英文字母

**说明**：当c为小写英文字母(a-z)时，返回非零值，否则返回零

**举例**
```c
void lower(char c)
{
    if (islower(c)) printf("%c:是小写英文字母\n",c);
    else printf("%c:不是小写英文字母\n",c);
}

void main()
{
    SetScreen(0);
    lower('a');
    lower('A');
    lower('7');
    getchar();
}
```

---

## isprint

**原型**
```c
int isprint(char c);
```

**功能**：判断字符c是否为可打印字符（含空格）

**说明**：当c为可打印字符（0x20-0x7e）时，返回非零值，否则返回零

**举例**
```c
void print(char c)
{
    if (isprint(c)) printf("%c:是可打印字符\n",c);
    else printf("%c:不是可打印字符\n",c);
}

void main()
{
    SetScreen(0);
    print('a');
    print(' ');
    print(0x7f);
    getchar();
}
```

---

## ispunct

**原型**
```c
int ispunct(char c);
```

**功能**：判断字符c是否为标点符号

**说明**：当c为标点符号时，返回非零值，否则返回零。标点符号指那些既不是字母数字，也不是空格的可打印字符。

**举例**
```c
void punct(char c)
{
    if (ispunct(c)) printf("%c:是标点符号\n",c);
    else printf("%c:不是标点符号\n",c);
}

void main()
{
    SetScreen(0);
    punct('0');
    punct(',');
    punct('.');
    getchar();
}
```

---

## isspace

**原型**
```c
int isspace(char c);
```

**功能**：判断字符c是否为空白符

**说明**：当c为空白符时，返回非零值，否则返回零。空白符指空格、水平制表、垂直制表、换页、回车和换行符。

**举例**
```c
void space(char c)
{
    if (isspace(c)) printf("%d:是空白符\n",c);
    else printf("%d:不是空白符\n",c);
}

void main()
{
    SetScreen(0);
    space('a');
    space(' ');
    space(0x0d);
    getchar();
}
```

---

## isupper

**原型**
```c
int isupper(char c);
```

**功能**：判断字符c是否为大写英文字母

**说明**：当c为大写英文字母(A-Z)时，返回非零值，否则返回零

**举例**
```c
void upper(char c)
{
    if (isupper(c)) printf("%c:是大写英文字母\n",c);
    else printf("%c:不是大写英文字母\n",c);
}

void main()
{
    SetScreen(0);
    upper('a');
    upper('A');
    upper('7');
    getchar();
}
```

---

## isxdigit

**原型**
```c
int isxdigit(char c);
```

**功能**：判断字符c是否为十六进制数字

**说明**：当c为A-F,a-f或0-9之间的十六进制数字时，返回非零值，否则返回零

**举例**
```c
void xdigit(char c)
{
    if (isxdigit(c)) printf("%c:是十六进制数字\n",c);
    else printf("%c:不是十六进制数字\n",c);
}

void main()
{
    SetScreen(0);
    xdigit('a');
    xdigit('9');
    xdigit('*');
    getchar();
}
```

---

## tolower

**原型**
```c
char tolower(char c);
```

**功能**：将字符c转换为小写英文字母

**说明**：如果c为大写英文字母，则返回对应的小写字母；否则返回原来的值

**举例**
```c
char s[]="Hello,World!";

void main()
{
    int i;
    
    SetScreen(0);
    printf("%s\n",s);
    for(i=0;i<strlen(s);i++)
        putchar(tolower(s[i]));
    getchar();
}
```

---

## toupper

**原型**
```c
char toupper(char c);
```

**功能**：将字符c转换为大写英文字母

**说明**：如果c为小写英文字母，则返回对应的大写字母；否则返回原来的值

**举例**
```c
char s[]="Hello,World!";

void main()
{
    int i;
    
    SetScreen(0);
    printf("%s\n",s);
    for(i=0;i<strlen(s);i++)
        putchar(toupper(s[i]));
    getchar();
}
```

---

## strcat

**原型**
```c
void strcat(addr dest,addr src);
```

**功能**：把src指向的字符串附加到dest结尾

**举例**
```c
char d[20]="Made in";
char s[]=" China";

void main()
{
    SetScreen(0);
    strcat(d,s);
    printf("%s",d);
    getchar();
}
```

---

## strchr

**原型**
```c
addr strchr(addr str,char c);
```

**功能**：找出str指向的字符串中第一次出现字符c的位置

**说明**：返回该位置的地址，如果str中不存在c则返回0

**举例**
```c
char s[30]="Made in China";

void main()
{
    addr p;
    
    SetScreen(0);
    printf("%s\n",s);
    p=strchr(s,'i');
    if (p)
        printf("%s",p);
    else
        printf("Not Found!");
    getchar();
}
```

---

## strcmp

**原型**
```c
int strcmp(addr str1,addr str2);
```

**功能**：比较字符串str1和str2

**说明**：当str1<str2时，返回负数

**举例**
```c
char s1[]="Hello,LavaX!";
char s2[]="Hello,lavax!";

void main()
{
    int r;
    
    SetScreen(0);
    r=strcmp(s1,s2);
    if (!r)
        printf("s1等于s2");
    else if (r<0)
        printf("s1小于s2");
    else
        printf("s1大于s2");
    getchar();
}
```

---

## strcpy

**原型**
```c
void strcpy(addr str1,addr str2);
```

**功能**：把str2指向的字符串复制到str1中去

**举例**
```c
char s[]="Made in China";

void main()
{
    char d[20];
    
    SetScreen(0);
    strcpy(d,s);
    printf("%s",d);
    getchar();
}
```

---

## strlen

**原型**
```c
int strlen(addr str);
```

**功能**：统计字符串str中字符的个数

**说明**：返回字符个数

**举例**
```c
char s[]="Made in China";

void main()
{
    SetScreen(0);
    printf("%s has %d chars",s,strlen(s));
    getchar();
}
```

---

## strstr

**原型**
```c
addr strstr(addr str1,addr str2);
```

**功能**：从字符串str1中找出str2第一次出现的位置

**说明**：返回该位置的地址，如果没找到则返回0

**举例**
```c
char s[]="Made in China";
char l[]="in";

void main()
{
    addr p;
    
    SetScreen(0);
    p=strstr(s,l);
    if (p)
        printf("%s",p);
    else
        printf("Not Found!");
    getchar();
}
```

---

## memset

**原型**
```c
void memset(addr buffer,char c,int count);
```

**功能**：把buffer所指内存区域的count个字节设置成字符c

**举例**
```c
char s[]="Made in China";

void main()
{
    SetScreen(0);
    memset(s,'M',4);
    printf("%s",s);
    getchar();
}
```

---

## memcpy

**原型**
```c
void memcpy(addr dest,addr src,int count);
```

**功能**：由src所指内存区域复制count个字节到dest所指内存区域

**说明**：src和dest所指内存区域不能重叠

**举例**
```c
char s[]="Made in China";

void main()
{
    char d[20];
    
    SetScreen(0);
    memcpy(d,s,strlen(s));
    d[strlen(s)]=0;
    printf("%s",d);
    getchar();
}
```

---

## memmove

**原型**
```c
void memmove(addr dest,addr src,int count);
```

**功能**：由src所指内存区域复制count个字节到dest所指内存区域

**说明**：与memcpy不同的是，src和dest所指内存区域可以重叠

**举例**
```c
char s[]="Made in China";

void main()
{
    SetScreen(0);
    memmove(s+5,s,strlen(s)-5);
    printf("%s",s+5);
    getchar();
}
```

---

## putchar

**原型**
```c
void putchar(char ch);
```

**功能**：把字符ch输出到屏幕

**举例**
```c
void main()
{
    SetScreen(0);
    putchar('l');
    putchar('e');
    putchar('e');
    getchar();
}
```

---

## printf

**原型**
```c
void printf(addr format,...);
```

**功能**：把字符串输出到屏幕

**说明**：format指定输出格式，后面跟要输出的变量。目前printf支持以下格式：
- `%c` 单个字符
- `%d` 十进制整数
- `%f` 浮点数
- `%s` 字符串
- `%%` 输出百分号%

**举例**
```c
char s[]="Hello";

void main()
{
    SetScreen(0);
    printf("%s有%d个字符\n",s,strlen(s));
    printf("首字母是%c\n",s[0]);
    printf("100%%\n");
    getchar();
}
```

---

## sprintf

**原型**
```c
void sprintf(addr str,addr format,...);
```

**功能**：把一个格式字符串输出到str所指内存区域

**说明**：与printf不同的是，输出到字符串而不是屏幕

**举例**
```c
char s[]="Hello";

void main()
{
    char t[20];
    
    SetScreen(0);
    sprintf(t,"%s有%d个字符\n",s,strlen(s));
    printf(t);
    getchar();
}
```

---

## Locate

**原型**
```c
void Locate(int y,int x);
```

**功能**：光标定位

**说明**：把字符显示的光标定位在y行x列(x,y均从0开始计算)

**举例**
```c
void main()
{
    SetScreen(0);
    Locate(2,8);
    printf("Good!");
    getchar();
}
```

---

## SetScreen

**原型**
```c
void SetScreen(char mode);
```

**功能**：清屏并设置字体大小

**说明**：
- mode=0: 大字体（8x16点阵）
- mode=1: 小字体（6x12点阵）

**举例**
```c
void main()
{
    SetScreen(1);
    printf("现在是小字体\n");
    printf("按任意键继续\n");
    getchar();
    SetScreen(0);
    printf("现在是大字体\n");
    getchar();
}
```

---

## Point

**原型**
```c
void Point(int x,int y,int type);
```

**功能**：画点

**说明**：(x,y)为点的坐标，type值含义如下：
- type=0: 2色模式下画白点，16色和256色模式下用背景色画点
- type=1: 2色模式下画黑点，16色和256色模式下用前景色画点
- type=2: 点的颜色取反

> type的bit6=1时向图形缓冲区作图，否则直接在屏幕作图

**举例**
```c
void main()
{
    for (;;)
        Point(rand()%160,rand()%80,2);
}
```

---

## GetPoint

**原型**
```c
int GetPoint(int x,int y);
```

**功能**：取点的颜色

**说明**：(x,y)为点的坐标
- 2色模式下如果是白点返回零，黑点返回非零值
- 16色和256色模式下返回颜色索引值

**举例**
```c
void main()
{
    int i,j;
    
    SetScreen(0);
    printf("V");
    for (i=0;i<8;i++)
        for (j=0;j<16;j++) {
            if (GetPoint(i,j))
                Point(10+i,10+j,1);
            else
                Point(10+i,10+j,0);
        }
    getchar();
}
```

---

## Line

**原型**
```c
void Line(int x0,int y0,int x1,int y1,int type);
```

**功能**：画直线

**说明**：(x0,y0)和(x1,y1)指定直线的两个端点坐标。type决定画图方式，其值含义如下：
- type=0: 2色模式下画白线，16色和256色模式下用背景色画线
- type=1: 2色模式下画黑线，16色和256色模式下用前景色画线
- type=2: 线的所有点取反

> type的bit6=1时向图形缓冲区作图，否则直接在屏幕作图

**举例**
```c
void main()
{
    Box(20,10,100,40,1,1);
    Line(1,1,111,47,1);      // from top left to bottom right
    Line(1,47,111,1,0);      // from bottom left to top right
    Line(112/2,1,112/2,47,2); // line vertically at the middle of the LCD
    getchar();
}
```

---

## Box

**原型**
```c
void Box(int x0,int y0,int x1,int y1,int fill,int type);
```

**功能**：画矩形

**说明**：(x0,y0)指定左上角坐标，(x1,y1)指定右下角坐标。

type决定画图方式，其值含义如下：
- type=0: 2色模式下画白矩形，16色和256色模式下用背景色画矩形
- type=1: 2色模式下画黑矩形，16色和256色模式下用前景色画矩形
- type=2: 矩形的所有点取反

fill参数：
- fill=0: 不填充矩形
- fill=1: 填充矩形

**举例**
```c
void main()
{
    Box(1,0,111,47,1,1);
    getchar();
    Box(20,10,100,30,0,0);
    getchar();
    Box(40,0,80,47,1,2);
    getchar();
}
```

---

## Circle

**原型**
```c
void Circle(int x,int y,int r,int fill,int type);
```

**功能**：画圆

**说明**：(x,y)指定圆心，r指定半径。

type决定画图方式，其值含义如下：
- type=0: 2色模式下画白圆，16色和256色模式下用背景色画圆
- type=1: 2色模式下画黑圆，16色和256色模式下用前景色画圆
- type=2: 圆的所有点取反

fill参数：
- fill=0: 不填充
- fill=1: 填充

**举例**
```c
void main()
{
    Circle(80,40,36,0,1);
    Circle(80,40,20,1,1);
    getchar();
}
```

---

## Ellipse

**原型**
```c
void Ellipse(int x,int y,int a,int b,int fill,int type);
```

**功能**：画椭圆

**说明**：(x,y)指定圆心，a为横半轴长度，b为纵半轴长度。

type决定画图方式，其值含义如下：
- type=0: 2色模式下画白椭圆，16色和256色模式下用背景色画椭圆
- type=1: 2色模式下画黑椭圆，16色和256色模式下用前景色画椭圆
- type=2: 椭圆的所有点取反

fill参数：
- fill=0: 不填充
- fill=1: 填充

**举例**
```c
void main()
{
    Ellipse(80,40,60,30,0,1);
    Ellipse(80,40,20,30,1,1);
    getchar();
}
```

---

## WriteBlock

**原型**
```c
void WriteBlock(int x,int y,int width,int height,int type,addr data);
```

**功能**：把位图绘制到屏幕缓冲区

**说明**：在屏幕的(x,y)坐标处绘图，图的宽为width，高为height，图形的数据地址为data

- type的bit6为1时直接在屏幕上绘图
- bit3为1时图形的所有点取反
- bit2-0: 1:copy 2:not 3:or 4:and 5:xor 6:透明copy(仅用于256色模式)

**举例**
```c
char fa[]={
    0xff,0xe0,0x80,0x20,0xbb,0xa0,0x8a,0x20,
    0x91,0x20,0xa0,0xa0,0xbb,0xa0,0x8a,0xa0,
    0xba,0xa0,0xa0,0x20,0xbb,0xa0,0x8a,0xa0,
    0x89,0x20,0xba,0xa0,0x80,0x20,0xff,0xe0};

void main()
{
    ClearScreen();
    WriteBlock(60,30,11,16,1,fa);
    WriteBlock(80,30,11,16,2,fa);
    Refresh();
    getchar();
}
```

---

## GetBlock

**原型**
```c
void GetBlock(int x,int y,int width,int height,int type,addr data);
```

**功能**：取屏幕图形

**说明**：把屏幕或图形缓冲区的(x,y)坐标处的宽为width高height的矩形区域保存到内存地址data处。
- type=0: 从图形缓冲区取图形
- type=0x40: 从屏幕取图形

> 注意：x和width忽略bit0-bit2。

**举例**
```c
void main()
{
    char data[16];
    
    Locate(0,1);
    putchar('V');
    GetBlock(8,0,8,16,0x40,data);
    WriteBlock(80,40,8,16,0x41,data);
    getchar();
}
```

---

## Block

**原型**
```c
void Block(int x0,int y0,int x1,int y1,int type);
```

**功能**：在屏幕缓冲区画一实心矩形

**说明**：(x0,y0)指定左上角坐标，(x1,y1)指定右下角坐标。

type决定画图方式，其值含义如下：
- type=0: 黑白模式下画白矩形，灰度模式下用背景色画矩形
- type=1: 黑白模式下画黑矩形，灰度模式下用前景色画矩形
- type=2: 矩形的所有点取反

**举例**
```c
void main()
{
    ClearScreen();
    Block(10,20,100,60,1);
    Refresh();
    getchar();
    Block(30,10,80,70,2);
    Refresh();
    getchar();
}
```

---

## Rectangle

**原型**
```c
void Rectangle(int x0,int y0,int x1,int y1,int type);
```

**功能**：在屏幕缓冲区画一空心矩形

**说明**：(x0,y0)指定左上角坐标，(x1,y1)指定右下角坐标。

type决定画图方式，其值含义如下：
- type=0: 黑白模式下画白矩形，灰度模式下用背景色画矩形
- type=1: 黑白模式下画黑矩形，灰度模式下用前景色画矩形
- type=2: 矩形的所有点取反

**举例**
```c
void main()
{
    ClearScreen();
    Block(10,20,100,60,1);
    Rectangle(30,10,80,70,2);
    Refresh();
    getchar();
}
```

---

## TextOut

**原型**
```c
void TextOut(int x,int y,addr string,int type);
```

**功能**：把字符串绘制到屏幕缓冲区

**说明**：在屏幕的(x,y)坐标处绘制字符串，string为字符串的地址

- type的bit7=1: 大字体，bit7=0: 小字体
- bit6为1时直接在屏幕上绘图
- bit3为1时字形取反
- bit2-0: 1:copy 2:not 3:or 4:and 5:xor

**举例**
```c
void main()
{
    ClearScreen();
    TextOut(2,0,"大字体",0x81);
    TextOut(2,16,"小字体",1);
    TextOut(2,32,"反显",9);
    Refresh();
    getchar();
}
```

---

## XDraw

**原型**
```c
void XDraw(int mode);
```

**功能**：全屏特效

**说明**：
- mode=0: 缓冲区的图形全体左移一个点
- mode=1: 缓冲区的图形全体右移一个点
- mode=2: 缓冲区的图形全体上移一个点
- mode=3: 缓冲区的图形全体下移一个点
- mode=4: 缓冲区的图形左右反转
- mode=5: 缓冲区的图形上下反转
- mode=6: 屏幕图形保存到缓冲区

**举例**
```c
void main()
{
    int i;
    
    TextOut(144,32,"←",0x81);
    for (i=0;i<144;i++) {
        XDraw(0);
        Refresh();
        Delay(10);
    }
    getchar();
}
```

---

## Fade

**原型**
```c
void Fade(int bright);
```

**功能**：淡入淡出特效

**说明**：缓冲区的图形以指定的最大亮度在屏幕上显示。仅灰度模式下有效。

**举例**
```c
void main()
{
    int i;
    
    SetGraphMode(4);
    SetFgColor(3);
    SetBgColor(15);
    ClearScreen();
    TextOut(52,32,"LeeSoft",0x81);
    for (i=0;i<16;i++) {
        Fade(i);
        Delay(50);
    }
    Delay(2000);
    for (i=15;i>=0;i--) {
        Fade(i);
        Delay(50);
    }
    getchar();
}
```

---

## Refresh

**原型**
```c
void Refresh();
```

**功能**：把缓冲区内的图象刷新到屏幕上显示

**说明**：通过使用缓冲区绘图，可以实现无闪烁绘图

**举例**
```c
void main()
{
    ClearScreen();
    Block(10,20,100,60,1);  //在缓冲区绘图，屏幕没有显示
    getchar();
    Refresh();              //把缓冲区图象刷新到屏幕，现在可以看到了
    getchar();
}
```

---

## ClearScreen

**原型**
```c
void ClearScreen();
```

**功能**：把屏幕缓冲区内的图象清除

**说明**：黑白模式下用白色清除，灰度模式下用背景色清除

**举例**
```c
void main()
{
    ClearScreen();
    Block(10,20,100,60,1);
    Refresh();
    getchar();
    ClearScreen();
    Refresh();
    getchar();
}
```

---

## getchar

**原型**
```c
char getchar();
```

**功能**：从键盘输入一个字符

**举例**
```c
void main()
{
    char c;
    
    SetScreen(0);
    printf("Press key...");
    while ((c=getchar())!='q') {
        SetScreen(0);
        printf("key: %c\nvalue: %d",c,c);
    }
}
```

---

## Inkey

**原型**
```c
char Inkey();
```

**功能**：从键盘缓冲区中读取按键

**说明**：不等待按键，直接取键盘缓冲区，如果没有键值则直接返回0。

**举例**
```c
void main()
{
    long i;
    
    i=0;
    SetScreen(0);
    while (!Inkey()) {
        SetScreen(0);
        printf("%d",i++);
    }
    printf("\nEnd.");
    getchar();
}
```

---

## ReleaseKey

**原型**
```c
void ReleaseKey(char key);
```

**功能**：释放按键

**说明**：把指定的按键状态改为释放状态（即使该键正按下）。getchar和Inkey对于持续按下的键只得到一个键值，使用ReleaseKey可以产生连续按键。

> 注意：当key>=128时，释放所有按键。

**举例**
```c
void main()
{
    SetScreen(0);
    printf("请按键：");
    for (;;) {
        putchar(getchar());
        ReleaseKey(128);
        Delay(50);
    }
}
```

---

## CheckKey

**原型**
```c
int CheckKey(char key);
```

**功能**：检测按键

**说明**：检测指定的按键是否处于按下状态，按下返回非0，否则返回0。

> 注意：当key>=128时，检测所有按键，有键按下返回按键值，否则返回0。

**举例**
```c
#define UP_KEY 0x14
#define DOWN_KEY 0x15
#define LEFT_KEY 0x17
#define RIGHT_KEY 0x16

void main()
{
    int x,y;
    char c;
    
    x=80;
    y=40;
    ClearScreen();
    Block(x,y,x+7,y+7,1);
    Refresh();
    for (;;) {
        c=CheckKey(128);
        if (c==UP_KEY && y>0) y--;
        else if (c==DOWN_KEY && y<72) y++;
        else if (c==LEFT_KEY && x>0) x--;
        else if (c==RIGHT_KEY && x<152) x++;
        if (c) {
            ClearScreen();
            Block(x,y,x+7,y+7,1);
            Refresh();
            Delay(10);
        }
    }
    getchar();
}
```

---

## fopen

**原型**
```c
char fopen(addr filename,addr mode);
```

**功能**：打开文件

**说明**：以mode指定的方式打开名为filename的文件。成功，返回一个文件句柄，否则返回0

**举例**
```c
void main()
{
    char fp;
    
    if ((fp=fopen("/LavaData/tmp.dat","w"))==0)
        printf("创建文件失败!");
    else {
        fclose(fp);
        printf("创建文件成功!");
    }
    getchar();
}
```

---

## fclose

**原型**
```c
void fclose(char fp);
```

**功能**：关闭文件

**说明**：关闭句柄为fp的文件

**举例**
```c
void main()
{
    char fp;
    
    if ((fp=fopen("/LavaData/tmp.dat","w"))==0)
        printf("创建文件失败!");
    else {
        fclose(fp);
        printf("创建文件成功!");
    }
    getchar();
}
```

---

## fread

**原型**
```c
int fread(addr pt,int size,int n,char fp);
```

**功能**：读文件

**说明**：从句柄为fp的文件中读取n个字节，存到pt所指向的内存区。返回所读的字节数，如遇文件结束或出错返回0。

> 注意：fread和fwrite的参数size会被忽略，实际读写的字节数是参数n。之所以保留size是为了与c兼容。建议size值取1。

**举例**
```c
char s[]="www.lavax.net";

void main()
{
    char fp;
    char t[20];
    
    if ((fp=fopen("/LavaData/tmp.dat","w+"))==0)
        printf("创建文件失败!");
    else {
        printf("创建文件成功!");
        fwrite(s,1,strlen(s)+1,fp);
        rewind(fp);
        fread(t,1,strlen(s)+1,fp);
        printf("\n%s",t);
        fclose(fp);
    }
    getchar();
}
```

---

## fwrite

**原型**
```c
int fwrite(addr pt,int size,int n,char fp);
```

**功能**：写文件

**说明**：把pt所指向的n个字节输出到句柄为fp的文件中。返回写到fp文件中的字节数。

> 注意：fread和fwrite的参数size会被忽略，实际读写的字节数是参数n。之所以保留size是为了与c兼容。建议size值取1。

**举例**
```c
char s[]="www.lavax.net";

void main()
{
    char fp;
    char t[20];
    
    if ((fp=fopen("/LavaData/tmp.dat","w+"))==0)
        printf("创建文件失败!");
    else {
        printf("创建文件成功!");
        fwrite(s,1,strlen(s)+1,fp);
        rewind(fp);
        fread(t,1,strlen(s)+1,fp);
        printf("\n%s",t);
        fclose(fp);
    }
    getchar();
}
```

---

## getc

**原型**
```c
int getc(char fp);
```

**功能**：从文件读一个字符

**说明**：从句柄为fp的文件中读入一个字符。返回所读的字符。若文件结束或出错，返回-1。

**举例**
```c
void main()
{
    char fp;
    
    if ((fp=fopen("/LavaData/tmp.dat","w+"))==0)
        printf("创建文件失败!");
    else {
        printf("创建文件成功!");
        putc('A',fp);
        rewind(fp);
        printf("\n%c",getc(fp));
        fclose(fp);
    }
    getchar();
}
```

---

## putc

**原型**
```c
int putc(char ch,char fp);
```

**功能**：写一个字符到文件

**说明**：把一个字符ch输出到句柄为fp的文件中。返回输出的字符ch。若出错，返回-1。

**举例**
```c
void main()
{
    char fp;
    
    if ((fp=fopen("/LavaData/tmp.dat","w+"))==0)
        printf("创建文件失败!");
    else {
        printf("创建文件成功!");
        putc('A',fp);
        rewind(fp);
        printf("\n%c",getc(fp));
        fclose(fp);
    }
    getchar();
}
```

---

## rewind

**原型**
```c
void rewind(char fp);
```

**功能**：文件指针复位

**说明**：将句柄为fp的文件中的位置指针置于文件开头位置

**举例**
```c
char s[]="www.lavax.net";

void main()
{
    char fp;
    char t[20];
    
    if ((fp=fopen("/LavaData/tmp.dat","w+"))==0)
        printf("创建文件失败!");
    else {
        printf("创建文件成功!");
        fwrite(s,1,strlen(s)+1,fp);
        rewind(fp);
        fread(t,1,strlen(s)+1,fp);
        printf("\n%s",t);
        fclose(fp);
    }
    getchar();
}
```

---

## fseek

**原型**
```c
long fseek(char fp,long offset,char base);
```

**功能**：文件指针定位

**说明**：将句柄为fp的文件的位置指针移到以base所指出的位置为基准，以offset为位移量的位置。返回当前位置。若出错，返回-1。

**举例**
```c
char s[]="www.lavax.net";

void main()
{
    char fp;
    char t[20];
    
    if ((fp=fopen("/LavaData/tmp.dat","w+"))==0)
        printf("创建文件失败!");
    else {
        printf("创建文件成功!");
        fwrite(s,1,strlen(s)+1,fp);
        fseek(fp,4,0);
        fread(t,1,strlen(s)+1,fp);
        printf("\n%s",t);
        fclose(fp);
    }
    getchar();
}
```

---

## ftell

**原型**
```c
long ftell(char fp);
```

**功能**：取文件指针

**说明**：返回句柄为fp的文件中的读写位置

**举例**
```c
char s[]="www.lavax.net";

void main()
{
    char fp;
    char t[20];
    
    if ((fp=fopen("/LavaData/tmp.dat","w+"))==0)
        printf("创建文件失败!");
    else {
        printf("创建文件成功!");
        fwrite(s,1,strlen(s)+1,fp);
        rewind(fp);
        fread(t,1,strlen(s)+1,fp);
        printf("\n%s\n%d",t,ftell(fp));
        fclose(fp);
    }
    getchar();
}
```

---

## feof

**原型**
```c
int feof(char fp);
```

**功能**：检查文件是否结束

**说明**：遇文件结束符返回非0值，否则返回0

**举例**
```c
char s[]="www.lavax.net";

void main()
{
    char fp;
    char c;
    
    if ((fp=fopen("/LavaData/tmp.dat","w+"))==0)
        printf("创建文件失败!");
    else {
        printf("创建文件成功!\n");
        fwrite(s,1,strlen(s)+1,fp);
        rewind(fp);
        for (;;) {
            if (feof(fp)) break;
            c=getc(fp);
            if (isprint(c)) putchar(c);
        }
        fclose(fp);
    }
    getchar();
}
```

---

## ChDir

**原型**
```c
int ChDir(addr path);
```

**功能**：改变当前工作目录

**说明**：成功返回非0值，失败返回0

**举例**
```c
void main()
{
    if (ChDir(s))
        printf("目录已经存在!");
    else if (MakeDir(s))
        printf("创建目录成功!");
    else
        printf("创建目录失败!");
    getchar();
}
```

---

## MakeDir

**原型**
```c
int MakeDir(addr path);
```

**功能**：创建子目录

**说明**：成功返回非0值，失败返回0

**举例**
```c
char s[]="/移动硬盘";

void main()
{
    if (ChDir(s))
        printf("目录已经存在!");
    else if (MakeDir(s))
        printf("创建目录成功!");
    else
        printf("创建目录失败!");
    getchar();
}
```

---

## DeleteFile

**原型**
```c
int DeleteFile(addr filename);
```

**功能**：删除文件

**说明**：成功返回非0值，失败返回0

**举例**
```c
char s[]="www.lavax.net";

void main()
{
    char fp;
    
    if ((fp=fopen("/LavaData/tmp.dat","w+"))==0)
        printf("创建文件失败!");
    else {
        printf("创建文件成功!\n");
        fwrite(s,1,strlen(s)+1,fp);
        fclose(fp);
        if (DeleteFile("/LavaData/tmp.dat"))
            printf("删除文件成功!");
        else
            printf("删除文件失败!");
    }
    getchar();
}
```

---

## GetFileNum

**原型**
```c
int GetFileNum(addr path);
```

**功能**：取指定目录下的文件数

**举例**
```c
void main()
{
    printf("根目录下有%d个文件\n",GetFileNum("/"));
    getchar();
}
```

---

## FindFile

**原型**
```c
int FindFile(int from,int num,addr buf);
```

**功能**：取当前目录下的文件名

**说明**：
- from为第一个文件在目录中的序号
- num为要取的文件名的个数
- buf为内存地址，保存返回的文件名，每16个字节保存一个文件名
- 返回值为实际取得的文件名数

**举例**
```c
void main()
{
    char namebuf[5][16];
    int i,num;
    
    num=FindFile(1,5,namebuf);
    for (i=0;i<num;i++)
        printf("\n%s",namebuf[i]);
    getchar();
}
```

---

## SetGraphMode

**原型**
```c
int SetGraphMode(int mode);
```

**功能**：设置系统图形模式

**说明**：
- mode=1，2色模式
- mode=4，16色模式
- mode=8，256色模式
- mode=0，不改变图形模式，仅获取当前图形模式

成功时返回原来的图形模式。试图设置硬件不支持的图形模式，会返回0。

**举例**
```c
char g16[]={
    35,35,35,35,35,35,35,35,35,50,50,50,50,50,50,
    // ... (数据省略)
};

void main()
{
    SetGraphMode(4);
    WriteBlock(20,20,30,30,1,g16);
    Refresh();
    getchar();
}
```

---

## SetPalette

**原型**
```c
int SetPalette(int start,int num,addr pal);
```

**功能**：设置调色板

**说明**：
- start指定开始颜色序号
- num指定要设置的颜色数
- pal指向颜色表

颜色表每4字节定义一种颜色：
- byte0-byte2依次为RGB值
- byte3保留，应设为0

返回值为成功设置的颜色数

**举例**
```c
char palette[]={255,0,0,0,0,0,255,0};

void main()
{
    SetGraphMode(8);
    SetFgColor(205);
    TextOut(60,30,"LavaX",0x81);
    SetFgColor(206);
    TextOut(40,50,"请按任意键",0x81);
    Refresh();
    getchar();
    SetPalette(205,2,palette);
    getchar();
}
```

---

## SetBgColor

**原型**
```c
void SetBgColor(int color);
```

**功能**：设置背景颜色

**说明**：2色模式下无效

**举例**
```c
void main()
{
    SetGraphMode(4);
    SetBgColor(5);
    SetFgColor(10);
    TextOut(56,20,"LeeSoft",1);
    Refresh();
    getchar();
}
```

---

## SetFgColor

**原型**
```c
void SetFgColor(int color);
```

**功能**：设置前景颜色

**说明**：2色模式下无效

**举例**
```c
void main()
{
    SetGraphMode(4);
    SetBgColor(5);
    SetFgColor(10);
    TextOut(56,20,"LeeSoft",1);
    Refresh();
    getchar();
}
```

---

## exit

**原型**
```c
void exit(int exitcode);
```

**功能**：结束程序

**举例**
```c
void main()
{
    int i;
    
    SetScreen(0);
    for (i=0;i<10;i++) {
        if (i==5) exit(0);
        else {
            SetScreen(0);
            printf("%d",i);
            getchar();
        }
    }
    getchar();
}
```

---

## Exec

**原型**
```c
int Exec(addr AppName,addr param,int set);
```

**功能**：运行程序

**说明**：
- AppName，要运行的程序名
- param，传递给运行程序的参数
- set的bit7为1则要运行的程序不能再运行程序
- 返回运行的程序的退出码

**举例**
```c
#bigram

void main()
{
    Exec("/ProgramFiles/中国麻将.lav",0,0);
    getchar();
}
```

---

## GetCommandLine

**原型**
```c
void GetCommandLine(addr CmdLine);
```

**功能**：取得当前运行程序的命令行字符串

**说明**：命令行最长256个字符，需要为CmdLine预留足够空间

**举例**
```c
#bigram

void main()
{
    char s[256];
    
    GetCommandLine(s);
    printf(s);
    getchar();
}
```

---

## Beep

**原型**
```c
void Beep();
```

**功能**：响铃

**举例**
```c
void main()
{
    char c;
    
    SetScreen(0);
    printf("press any key\n");
    c=getchar();
    while (c!=0x1b) {
        Beep();
        c=getchar();
    }
    printf("Thank you!");
    getchar();
}
```

---

## Delay

**原型**
```c
void Delay(int ms);
```

**功能**：延时

**说明**：延时ms个毫秒，ms最大取值32767（即：32.7秒）

**举例**
```c
char s[]="www.lavax.net";

void main()
{
    int i;
    char c;
    
    SetScreen(0);
    for (i=0;;i++) {
        c=s[i];
        if (c) putchar(c);
        else break;
        if (c!=' ') Delay(200);
    }
    getchar();
}
```

---

## Getms

**原型**
```c
char Getms();
```

**功能**：取系统时间的tick数

**说明**：1tick=1/256秒，返回值的范围为0～255

**举例**
```c
void main()
{
    for (;;) {
        printf("\n%d",Getms());
        getchar();
    }
    getchar();
}
```

---

## GetTime

**原型**
```c
void GetTime(struct Time t);
```

**功能**：取系统日期和时间

**说明**：使用GetTime, SetTime，请在程序里加上如下结构定义：

```c
struct TIME
{
    int year;
    char month;
    char day;
    char hour;
    char minute;
    char second;
    char week;
};
```

**举例**
```c
struct TIME
{
    int year;
    char month;
    char day;
    char hour;
    char minute;
    char second;
    char week;
};

struct TIME time;

void main()
{
    GetTime(time);
    printf("%d年%d月%d日\n",time.year,time.month,time.day);
    printf("%d:%d:%d\n",time.hour,time.minute,time.second);
    printf("星期%d",time.week);
    getchar();
}
```

---

## SetTime

**原型**
```c
void SetTime(struct Time t);
```

**功能**：设置系统日期和时间

**说明**：使用GetTime, SetTime，请在程序里加上如下结构定义：

```c
struct TIME
{
    int year;
    char month;
    char day;
    char hour;
    char minute;
    char second;
    char week;
};
```

**举例**
```c
struct TIME
{
    int year;
    char month;
    char day;
    char hour;
    char minute;
    char second;
    char week;
};

struct TIME time;

void main()
{
    time.year=2020;
    time.month=12;
    time.day=25;
    time.hour=23;
    time.minute=55;
    time.second=1;
    SetTime(time);
    printf("设置完毕!");
    getchar();
}
```

---

## Crc16

**原型**
```c
long Crc16(addr mem,int len);
```

**功能**：求内存地址mem开始的len个字节的CRC16校验值

**举例**
```c
char s[]="Made in China";

void main()
{
    SetScreen(0);
    printf("%d",Crc16(s,strlen(s)));
    s[0]='m';
    printf("\n%d",Crc16(s,strlen(s)));
    getchar();
}
```

---

## Secret

**原型**
```c
void Secret(addr mem,int len,addr string);
```

**功能**：数据加密

**说明**：用一个字符串string对mem开始的len个字节加密。解密时同样使用此函数。

**举例**
```c
char s[]="Hello,world!";

void main()
{
    int t;
    
    t=strlen(s);
    SetScreen(0);
    Secret(s,t,"LavaX");    //加密
    printf(s);
    Secret(s,t,"LavaX");    //解密
    printf("\n%s",s);
    getchar();
}
```

---

## Math.abs

**原型**
```c
float Math.abs(float x);
```

**功能**：求x的绝对值

**举例**
```c
void main()
{
    float x;
    
    SetScreen(0);
    x=-1.2;
    printf("|%f|=%f\n",x,Math.abs(x));
    x=0;
    printf("|%f|=%f\n",x,Math.abs(x));
    x=+1.2;
    printf("|%f|=%f\n",x,Math.abs(x));
    getchar();
}
```

---

## Math.sin

**原型**
```c
float Math.sin(float x);
```

**功能**：正弦

**举例**
```c
#define Pi 3.14159265

void main()
{
    int i,x1,y1,x2,y2;
    x1=20;
    y1=40;
    Line(15,40,145,40,1);
    Line(20,0,20,79,1);
    for (i=3;i<=360;i=i+3) {
        x2=x1+1;
        y2=40-Math.sin(i*Pi/180)*36+0.5;
        Line(x1,y1,x2,y2,1);
        x1=x2;
        y1=y2;
    }
    getchar();
}
```

---

## Math.cos

**原型**
```c
float Math.cos(float x);
```

**功能**：余弦

**举例**
```c
#define Pi 3.14159265

void main()
{
    int i,x1,y1,x2,y2;
    x1=20;
    y1=40;
    Line(15,40,145,40,1);
    Line(20,0,20,79,1);
    for (i=3;i<=360;i=i+3) {
        x2=x1+1;
        y2=40-Math.cos(i*Pi/180)*36+0.5;
        Line(x1,y1,x2,y2,1);
        x1=x2;
        y1=y2;
    }
    getchar();
}
```

---

## Math.tan

**原型**
```c
float Math.tan(float x);
```

**功能**：正切

**举例**
```c
#define Pi 3.14159265

void main()
{
    int i,x1,y1,x2,y2;
    x1=20;
    y1=40;
    Line(15,75,145,75,1);
    Line(20,0,20,79,1);
    for (i=1;i<=80;i++) {
        x2=x1+1;
        y2=75-Math.tan(i*Pi/180)*13+0.5;
        Line(x1,y1,x2,y2,1);
        x1=x2;
        y1=y2;
    }
    getchar();
}
```

---

## Math.asin

**原型**
```c
float Math.asin(float x);
```

**功能**：反正弦

**举例**
```c
void main()
{
    printf("%f",Math.asin(0.5)*6);
    getchar();
}
```

---

## Math.acos

**原型**
```c
float Math.acos(float x);
```

**功能**：反余弦

**举例**
```c
void main()
{
    printf("%f",Math.acos(0.5)*3);
    getchar();
}
```

---

## Math.atan

**原型**
```c
float Math.atan(float x);
```

**功能**：反正切

**举例**
```c
void main()
{
    printf("%f",Math.atan(1.0)*4);
    getchar();
}
```

---

## Math.sqrt

**原型**
```c
float Math.sqrt(float x);
```

**功能**：开方

**举例**
```c
//利用圆心在原点的圆的几何公式x*x+y*y=r*r求单位圆的面积

#define JINGDU 0.001    //精度

float f(float x)
{
    return Math.sqrt(1-x*x);
}

void main()
{
    float i,s;
    
    s=0;
    for (i=-1;i<1;i=i+JINGDU) {
        s=s+f(i);
    }
    printf("%f",s*JINGDU*2);
    getchar();
}
```

---

## Math.exp

**原型**
```c
float Math.exp(float x);
```

**功能**：指数

**举例**
```c
void main()
{
    printf("1/7=%f",Math.exp(Math.log(1.0)-Math.log(7.0)));
    getchar();
}
```

---

## Math.log

**原型**
```c
float Math.log(float x);
```

**功能**：对数

**举例**
```c
void main()
{
    printf("1/7=%f",Math.exp(Math.log(1.0)-Math.log(7.0)));
    getchar();
}
```

---

## System.PY2GB

**原型**
```c
long System.PY2GB(int id,addr str,addr buf);
```

**功能**：根据拼音取汉字

**说明**：
- str指向拼音字符串
- id为汉字的序号（从0开始）
- buf为存储符合条件的汉字的缓冲区

返回值为-1表示没有符合条件的汉字，否则：
- 返回值的低字表示符合条件的汉字数（一次最多取9个）
- 返回值的高字表示该拼音下的所有汉字数

**举例**
```c
#define LEFT_KEY 0x17
#define UP_KEY 0x14
#define DOWN_KEY 0x15

void main()
{
    char i,c,pinyin[10];
    char s[20];
    int id,sum;
    long t;
    
    pinyin[0]=0;
    i=0;
    id=0;
    sum=0;
    ClearScreen();
    TextOut(2,67,"拼",1);
    Block(1,66,13,78,2);
    Refresh();
    for (;;) {
        c=getchar();
        if (c==LEFT_KEY) {
            if (i) {
                pinyin[--i]=0;
                id=0;
                sum=0;
            }
        } else if (c==DOWN_KEY) {
            if (id+9<sum) id=id+9;
        } else if (c==UP_KEY) {
            if (id>9) id=id-9;
            else id=0;
        } else if (c>='a' && c<='z') {
            if (i<6) {
                pinyin[i++]=c;
                pinyin[i]=0;
                id=0;
                sum=0;
            }
        }
        Block(15,67,159,79,0);
        TextOut(15,67,pinyin,1);
        t=System.PY2GB(id,pinyin,s);
        if (t!=-1) {
            sum=t>>16;
            TextOut(52,67,s,1);
        }
        Refresh();
    }
}
```

---

*文档结束*
