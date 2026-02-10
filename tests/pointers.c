
void main() {
    int a = 0x12345678;
    int *ip = &a;
    char *cp = &a;
    
    printf("int: %x\n", *ip);      // Expect 12345678
    printf("char: %x\n", *cp);     // Expect 78 (little endian) or as equivalent
    
    // LavaX explicit syntax
    addr p = &a;
    printf("addr int: %x\n", (int *)p); // Expect 12345678
    printf("addr char: %x\n", (char *)p); // Expect 78
    
    // Shorthand
    printf("shorthand: %x\n", *p); // Expect 78
}
