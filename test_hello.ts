import { LavaXCompiler } from './src/compiler';
import { LavaXAssembler } from './src/compiler/LavaXAssembler';
import { LavaXVM } from './src/vm';

async function test() {
    console.log("--- START TEST ---");

    const compiler = new LavaXCompiler();
    const assembler = new LavaXAssembler();
    const vm = new LavaXVM();

    vm.onLog = (msg) => console.log("[VM LOG]", msg);

    const source = `void main() {
  int key;
  printf("Hello, LavaX!\\n");
  printf("Waiting for key 'A'...\\n");
  key = getchar();
  printf("Recv: %d\\n", key);
}`;

    console.log("Compiling...");
    const asm = compiler.compile(source);
    console.log("Assembling...");
    const binary = assembler.assemble(asm);
    console.log("Header:", Array.from(binary.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));

    try {
        console.log("Running...");
        vm.load(binary);

        setTimeout(() => {
            console.log("SIMULATE KEY PRESS: A");
            vm.pushKey(65);
        }, 1000);

        await vm.run();
        console.log("--- TEST SUCCESS ---");
    } catch (e: any) {
        console.error("FAIL:", e.message);
        process.exit(1);
    }
}

test().catch(e => {
    console.error("FATAL:", e);
    process.exit(1);
});
