
import { LavaXCompiler } from './src/compiler';

function testCompile(code: string) {
    try {
        const compiler = new LavaXCompiler();
        const assemblyStr = compiler.compile(code);
        const assembly = assemblyStr.split('\n');
        console.log("Assembly generated successfully:");
        console.log(assemblyStr);
        return true;
    } catch (e) {
        console.error("Compilation failed:", e.message);
        return false;
    }
}

const testCases = [
    {
        name: "Array with empty brackets",
        code: `
    void main() {
        char testStr[] = "Hello";
    }
    `
    },
    {
        name: "Bitwise NOT and XOR",
        code: `
    void main() {
        int a = 1, b = 2;
        int r1 = ~a;
        int r2 = a ^ b;
    }
    `
    },
    {
        name: "Compound assignment",
        code: `
    void main() {
        int i = 0;
        i += 5;
    }
    `
    },
    {
        name: "Break statement",
        code: `
    void main() {
        while(1) {
            break;
        }
    }
    `
    },
    {
        name: "Multi-variable declaration",
        code: `
    void main() {
        int i, j;
        i = 1;
        j = 2;
    }
    `
    },
    {
        name: "Pointer assignment",
        code: `
    void main() {
        int val = 100;
        int *ptr = &val;
        *ptr = 200;
    }
    `
    },
    {
        name: "Pointer argument to printf",
        code: `
    void main() {
        int val = 100;
        int *ptr = &val;
        printf("val=%d\\n", val);
        printf("*ptr=%d\\n", *ptr);
        *ptr = 200;
        printf("After *ptr=200, val=%d\\n", val);
    }
    `
    }
];

let failed = 0;
for (const tc of testCases) {
    console.log(`\nRunning test: ${tc.name}`);
    if (!testCompile(tc.code)) {
        failed++;
    }
}

if (failed === 0) {
    console.log("\nAll tests passed!");
} else {
    console.log(`\n${failed} tests failed.`);
    process.exit(1);
}
