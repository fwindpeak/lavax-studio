void test(int val) {
    printf("val=%d\n", val);
}

void main() {
    int a = 10;
    int *ptr = &a;
    test(*ptr);
    printf("ptr=%d\n", *ptr);
}
