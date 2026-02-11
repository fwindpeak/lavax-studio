
import { LavaXVM } from '../src/vm.ts';
import { SystemOp } from '../src/types.ts';

console.log("Test Script Starting...");

try {
    const vm = new LavaXVM();

    // Test printf
    console.log("Testing printf...");
    const fmt = "Hello %s %d\n";
    const strArg = "World";
    const intArg = 123;

    // Push args in reverse order (or as expected by stack)
    // sprintf implementation expects: [buf, fmt, arg1, arg2...]
    // printf implementation: [fmt, arg1, arg2...] (startIdx calculation)
    // Wait, let's check SyscallHandler.ts printf logic again.
    // printf: count = vm.pop(). startIdx = sp - count. fmt = stk[startIdx].
    // So stack should be: [fmt, arg1, arg2, count] -> pop count.

    const fmtAddr = 0x1000;
    const strAddr = 0x2000;

    vm.memory.set(new TextEncoder().encode(fmt + "\0"), fmtAddr);
    vm.memory.set(new TextEncoder().encode(strArg + "\0"), strAddr);

    vm.push(fmtAddr); // fmt
    vm.push(strAddr); // arg1 (string)
    vm.push(intArg);  // arg2 (int)
    vm.push(3);       // count (fmt + 2 args)

    const printfOp = (vm as any).ops[SystemOp.printf];
    if (!printfOp) throw new Error("printf op not found");

    printfOp();

    console.log("printf executed. Checking TEXT_OFFSET...");

    // Check TEXT_OFFSET for output "Hello World 123\n"
    // TEXT_OFFSET = 0xC80
    // We expect ASCII bytes there.
    const textOffset = 0xC80;
    const expected = "Hello World 123";
    let match = true;
    for (let i = 0; i < expected.length; i++) {
        if (vm.memory[textOffset + i] !== expected.charCodeAt(i)) {
            match = false;
            console.error(`Mismatch at ${i}: expected ${expected.charCodeAt(i)}, got ${vm.memory[textOffset + i]}`);
            break;
        }
    }

    if (match) console.log("printf Verification Passed!");
    else console.error("printf Verification Failed!");

} catch (e) {
    console.error("Test Failed:", e);
    process.exit(1);
}
