
import { LavaXCompiler } from '../src/compiler';
import { LavaXAssembler } from '../src/compiler/LavaXAssembler';
import { LavaXVM } from '../src/vm';

async function main() {
    const compiler = new LavaXCompiler();
    const assembler = new LavaXAssembler();
    const vm = new LavaXVM();

    const source = `
    void printNum(int n) {
        printf("%d ", n);
    }
    void main() {
        int i;
        for (i = 0; i < 5; i++) {
            printNum(i);
        }
        printf("\\nLoop finished\\n");
    }
    `;

    console.log("--- Compiling ---");
    const asm = compiler.compile(source);
    if (asm.startsWith('ERROR')) {
        console.error(asm);
        process.exit(1);
    }

    console.log("--- Assembling ---");
    const bin = assembler.assemble(asm);
    console.log(`Binary size: ${bin.length} bytes`);

    console.log("--- Running ---");
    vm.onLog = (msg) => process.stdout.write(msg);
    vm.load(bin);
    // vm.debug = true;
    await vm.run();

    console.log("\n--- Verification ---");
    console.log("Final SP:", vm.sp);
    if (vm.sp === 0) {
        console.log("SUCCESS: Stack is balanced.");
    } else {
        console.error(`FAIL: Stack is NOT balanced! SP: ${vm.sp}`);
        // process.exit(1); // Allow to continue to see results
    }
}

main().catch(console.error);
