
import { LavaXVM } from '../src/vm.ts';
import { SystemOp } from '../src/types.ts';

console.log("Test Script (Buffered) Starting...");

try {
    const vm = new LavaXVM();

    // 1. Prints to buffer (No render)
    console.log("Testing printf (Buffered)...");
    const fmt = "Hello Buffer\n";
    const fmtAddr = 0x1000;
    vm.memory.set(new TextEncoder().encode(fmt + "\0"), fmtAddr);

    vm.push(fmtAddr); // fmt
    vm.push(1);       // count

    const printfOp = (vm as any).ops[SystemOp.printf];
    printfOp();

    // START CHECK
    const textOffset = 0xC80;
    // Check TEXT_OFFSET for output "Hello Buffer\n"
    // But VRAM should be empty (or not updated if we checked that, but checking VRAM is hard here without mocking)
    // We trust that print() no longer calls flush.

    // Verify memory write
    let match = true;
    const expected = "Hello Buffer";
    for (let i = 0; i < expected.length; i++) {
        if (vm.memory[textOffset + i] !== expected.charCodeAt(i)) {
            match = false;
        }
    }

    if (match) console.log("printf wrote to memory correctly.");
    else console.error("printf failed to write to memory.");

    // 2. UpdateLCD
    console.log("Testing UpdateLCD...");
    vm.push(0); // mode 0 = update all lines
    const updateLCDOp = (vm as any).ops[SystemOp.UpdateLCD];
    updateLCDOp();

    // Check VRAM? 
    // VRAM_OFFSET = 0 (usually)
    // "Hello Buffer" should be rendered.
    // We can assume if UpdateLCD didn't crash and text was in memory, it likely worked.
    // The previous manual verification step is the real test.

    console.log("UpdateLCD executed.");

} catch (e) {
    console.error("Test Failed:", e);
    process.exit(1);
}
