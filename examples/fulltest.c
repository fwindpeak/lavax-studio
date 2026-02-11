// LavaX 综合测试程序 - Comprehensive Demo
// 本程序尽可能测试所有 LavaX VM 指令

// 全局变量测试
int globalCounter = 0;
char globalChar = 'A';
long globalLong = 123456;

// 函数声明
void testArithmetic();
void testGraphics();
void testTextOutput();
void testInputOutput();
void testLoops();
void testMemory();
void testFPoint();
void showMenu();

void main() {
    int choice;
    int running = 1;
    
    ClearScreen();
    SetScreen(0);
    
    while(running) {
        showMenu();
        choice = getchar();
        
        ClearScreen();
        
        if(choice == 'b') {
            testArithmetic();
        }
        else if(choice == 'n') {
            testGraphics();
        }
        else if(choice == 'm') {
            testTextOutput();
        }
        else if(choice == 'g') {
            testInputOutput();
        }
        else if(choice == 'h') {
            testLoops();
        }
        else if(choice == 'j') {
            testMemory();
        }
        else if(choice == 't') {
            testFPoint();
        }
        else if(choice == '0' || choice == 27) {
            running = 0;
        }
        else {
            printf("Invalid choice!\n");
            Delay(1000);
        }
    }
    
    ClearScreen();
    printf("Goodbye!\n");
    Delay(500);
}

void showMenu() {
    ClearScreen();
    SetScreen(1);
    printf("=== LavaX Comprehensive Demo ===\n\n");
    printf("1. Arithmetic Operations\n");
    printf("2. Graphics Primitives\n");
    printf("3. Text Output Tests\n");
    // printf("4. Input/Output Tests\n");
    // printf("5. Loops & Conditions\n");
    // printf("6. Memory Operations\n");
    // printf("7. Floating Point Math\n");
    printf("0. Exit (ESC)\n");
    printf("Select: ");
}

// 测试算术运算指令
void testArithmetic() {
    int a = 100;
    int b = 25;
    int result;
    
    printf("=== Arithmetic Tests ===\n\n");
    
    // 加法 (ADD)
    result = a + b;
    printf("ADD: %d + %d = %d\n", a, b, result);
    
    // 减法 (SUB)
    result = a - b;
    printf("SUB: %d - %d = %d\n", a, b, result);
    
    // 乘法 (MUL)
    result = a * b;
    printf("MUL: %d * %d = %d\n", a, b, result);
    
    // 除法 (DIV)
    result = a / b;
    printf("DIV: %d / %d = %d\n", a, b, result);
    
    // 取模 (MOD)
    result = a % b;
    printf("MOD: %d %% %d = %d\n", a, b, result);
    
    // 位运算
    printf("\n--- Bitwise Ops ---\n");
    result = a & b;
    printf("AND: %d & %d = %d\n", a, b, result);
    
    result = a | b;
    printf("OR:  %d | %d = %d\n", a, b, result);
    
    result = a ^ b;
    printf("XOR: %d ^ %d = %d\n", a, b, result);
    
    result = ~a;
    printf("NOT: ~%d = %d\n", a, result);
    
    // 移位运算 (SHL, SHR)
    result = a << 2;
    printf("SHL: %d << 2 = %d\n", a, result);
    
    result = a >> 2;
    printf("SHR: %d >> 2 = %d\n", a, result);
    
    // 比较运算
    printf("\n--- Comparisons ---\n");
    printf("%d == %d: %d\n", a, b, a == b);
    printf("%d != %d: %d\n", a, b, a != b);
    printf("%d > %d: %d\n", a, b, a > b);
    printf("%d < %d: %d\n", a, b, a < b);
    printf("%d >= %d: %d\n", a, b, a >= b);
    printf("%d <= %d: %d\n", a, b, a <= b);
    
    // 自增自减 (INC_PRE, INC_POST, DEC_PRE, DEC_POST)
    printf("\n--- Inc/Dec ---\n");
    int x = 10;
    printf("x = %d\n", x);
    printf("++x = %d\n", ++x);
    printf("x++ = %d\n", x++);
    printf("x = %d\n", x);
    printf("--x = %d\n", --x);
    printf("x-- = %d\n", x--);
    printf("x = %d\n", x);
    
    // 取负 (NEG)
    result = -a;
    printf("\nNEG: -%d = %d\n", a, result);
    
    printf("\nPress any key...");
    getchar();
}

// 测试图形指令
void testGraphics() {
    printf("=== Graphics Tests ===\n");
    printf("Drawing...\n");
    Delay(500);
    
    SetScreen(0);
    ClearScreen();
    
    // 画点 (Point)
    int i;
    for(i = 0; i < 160; i = i + 5) {
        Point(i, 10, 1);
    }
    
    // 画线 (Line)
    Line(0, 0, 159, 79, 1);
    Line(0, 79, 159, 0, 1);
    Line(80, 0, 80, 79, 1);
    Line(0, 40, 159, 40, 1);
    
    // 画矩形 (Rectangle, Box)
    Rectangle(10, 10, 30, 20, 1);
    Box(30, 30, 60, 50, 0, 1);
    Box(50, 50, 80, 70, 1, 1);
    
    // 画圆 (Circle)
    Circle(40, 120, 15, 0, 1);
    Circle(40, 120, 10, 1, 1);
    
    // 画椭圆 (Ellipse)
    Ellipse(60, 100, 20, 30, 0, 1);
    
    // 填充块 (Block)
    Block(10, 10, 130, 65, 1);
    
    Refresh();
    
    printf("Graphics complete!\n");
    printf("Press any key...");
    getchar();
}

char testStr[] = "Hello, LavaX!";

// 测试文本输出
void testTextOutput() {
    int i;

    
    printf("=== Text Output Tests ===\n\n");
    
    // printf 格式化输出
    printf("String: %s\n", testStr);
    printf("Integer: %d\n", 12345);
    printf("Hex: 0x%x\n", 255);
    printf("Char: %c\n", 'X');
    
    // 多参数格式化
    printf("Multi: %d + %d = %d\n", 10, 20, 30);
    
    // putchar 单字符输出
    printf("\nputchar test: ");
    for(i = 65; i < 75; i++) {
        putchar(i);
    }
    printf("\n");
    
    // TextOut 定位输出
    SetScreen(0);
    ClearScreen();
    TextOut(0, 0, "Top Left", 1);
    TextOut(40, 60, "Middle", 1);
    TextOut(70, 100, "Bottom", 1);
    Refresh();
    
    Delay(2000);
    SetScreen(1);
    
    printf("\nPress any key...");
    getchar();
}

// 测试输入输出
void testInputOutput() {
    int key;
    char buffer[50];
    int count = 0;
    
    printf("=== Input/Output Tests ===\n\n");
    
    // getchar 阻塞输入
    printf("Press any key: ");
    key = getchar();
    printf("\nYou pressed: %d (0x%x)\n", key, key);
    
    // CheckKey 非阻塞检测
    printf("\nCheckKey test (5 sec):\n");
    printf("Press keys...\n");
    
    int startTime = 0;
    while(startTime < 50) {
        if(CheckKey(13)) {  // Enter
            printf("Enter detected!\n");
            break;
        }
        if(CheckKey(32)) {  // Space
            printf("Space detected!\n");
        }
        Delay(100);
        startTime++;
    }
    
    // 字符串输入模拟
    printf("\nType chars (ESC to end):\n");
    count = 0;
    while(1) {
        key = getchar();
        if(key == 27) break;  // ESC
        if(count < 49) {
            buffer[count++] = key;
            putchar(key);
        }
    }
    buffer[count] = 0;
    printf("\n\nYou typed: %s\n", buffer);
    
    printf("\nPress any key...");
    getchar();
}

// 测试循环和条件
void testLoops() {
    int i, j;
    int sum = 0;
    
    printf("=== Loops & Conditions ===\n\n");
    
    // for 循环
    printf("For loop (1-10):\n");
    for(i = 1; i <= 10; i++) {
        printf("%d ", i);
        sum = sum + i;
    }
    printf("\nSum: %d\n", sum);
    
    // while 循环
    printf("\nWhile loop countdown:\n");
    i = 5;
    while(i > 0) {
        printf("%d... ", i);
        i--;
        Delay(200);
    }
    printf("Go!\n");
    
    // 嵌套循环
    printf("\nNested loops (3x3):\n");
    for(i = 0; i < 3; i++) {
        for(j = 0; j < 3; j++) {
            printf("[%d,%d] ", i, j);
        }
        printf("\n");
    }
    
    // 条件分支
    printf("\nConditional tests:\n");
    int value = 50;
    if(value > 100) {
        printf("Large\n");
    }
    else if(value > 50) {
        printf("Medium\n");
    }
    else if(value == 50) {
        printf("Exactly 50!\n");
    }
    else {
        printf("Small\n");
    }
    
    // 逻辑运算 (L_AND, L_OR, L_NOT)
    printf("\nLogical ops:\n");
    int a = 1, b = 0;
    printf("1 && 0 = %d\n", a && b);
    printf("1 || 0 = %d\n", a || b);
    printf("!1 = %d\n", !a);
    printf("!0 = %d\n", !b);
    
    printf("\nPress any key...");
    getchar();
}

char str1[20] = "Hello";

// 测试内存操作
void testMemory() {
    char str2[20];
    char str3[40];
    int arr[10];
    int i;
    
    printf("=== Memory Operations ===\n\n");
    
    // strcpy 字符串复制
    strcpy(str2, str1);
    printf("strcpy: %s\n", str2);
    
    // strlen 字符串长度
    int len;
    len = strlen(str1);
    printf("strlen: %d\n", len);
    
    // sprintf 格式化到字符串
    sprintf(str3, "Num: %d, Str: %s", 42, str1);
    printf("sprintf: %s\n", str3);
    
    // memcpy 内存复制
    for(i = 0; i < 5; i++) {
        arr[i] = i * 10;
    }
    memcpy(&arr[0], &arr[5], 5 * 4);
    printf("\nmemcpy result:\n");
    for(i = 5; i < 10; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");
    
    // memmove 内存移动
    memmove(&arr[0], &arr[2], 3 * 4);
    printf("\nmemmove result:\n");
    for(i = 0; i < 5; i++) {
        printf("%d ", arr[i]);
    }
    printf("\n");
    
    // memset 内存设置
    memset(str2, 'X', 10);
    str2[10] = 0;
    printf("\nmemset: %s\n", str2);
    
    // 指针操作
    printf("\nPointer tests:\n");
    int val = 100;
    int *ptr = &val;
    printf("val = %d\n", val);
    printf("*ptr = %d\n", *ptr);
    *ptr = 200;
    printf("After *ptr=200, val = %d\n", val);
    
    // 数组指针
    int *arrPtr = &arr;
    printf("\nArray via pointer:\n");
    for(i = 0; i < 5; i++) {
        printf("%d ", *(arrPtr + i));
    }
    printf("\n");
    
    printf("\nPress any key...");
    getchar();
}

// 测试浮点运算
void testFPoint() {
    // 注意: 某些 LavaX 实现可能不完全支持浮点
    printf("=== Floating Point Tests ===\n\n");
    
    // 整数运算模拟浮点
    int a = 100;
    int b = 3;
    
    printf("Integer division:\n");
    printf("%d / %d = %d\n", a, b, a / b);
    printf("Remainder: %d\n", a % b);
    
    // 定点数模拟 (x100)
    printf("\nFixed-point (x100):\n");
    int fp1 = 314;  // 3.14
    int fp2 = 200;  // 2.00
    int fpResult;
    fpResult = (fp1 * fp2) / 100;
    printf("3.14 * 2.00 = %d.%d\n", fpResult / 100, fpResult % 100);
    
    // 三角函数测试 (如果支持)
    printf("\nMath functions:\n");
    printf("abs(-42) = %d\n", abs(-42));
    
    // 随机数
    printf("\nRandom numbers:\n");
    srand(12345);
    int i;
    for(i = 0; i < 5; i++) {
        printf("%d ", rand() % 100);
    }
    printf("\n");
    
    printf("\nPress any key...");
    getchar();
}
