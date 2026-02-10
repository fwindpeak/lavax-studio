
import { LavaXCompiler } from '../src/compiler';
import { LavaXVM } from '../src/vm';
import { Op } from '../src/types';

async function testIntegration() {
    const code = `
    int add(int a, int b) {
        return a + b;
    }
    void main() {
        int x = 10, y = 20;
        int z = add(x, y);
        putchar('0' + z / 10);
        putchar('0' + z % 10);
    }
    `;

    console.log("Compiling...");
    const compiler = new LavaXCompiler();
    const assembly = compiler.compile(code);

    // We need to assemble it. The compiler returns a string of assembly.
    // The current project seems to have a separate assembler or index.tsx handles it?
    // Let's check src/index.tsx for how it converts assembly to bytecode.
    console.log("Assembly generated.");
    // ...
}
