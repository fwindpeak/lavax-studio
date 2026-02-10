
import { LavaXVM } from '../src/vm';
import { Op } from '../src/types';

async function testOps() {
    const vm = new LavaXVM();
    vm.onLog = (msg) => console.log(msg);

    // Manual bytecode for testing:
    // Op.LEA_ABS (0x19) + 4-byte 1234
    // Op.PUSH_B (0x01) + 1-byte 42
    // Op.ADD (0x21)
    // Op.EXIT (0x40)
    const code = new Uint8Array([
        0x4C, 0x41, 0x56, 0x12, 0x00, 0x80, 0x00, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x19, 0x34, 0x12, 0x00, 0x00, // LEA_ABS 0x1234 (4 bytes)
        0x01, 0x2A,                   // PUSH_B 42
        0x21,                         // ADD
        0x40                          // EXIT
    ]);

    vm.load(code);
    await vm.run();

    console.log("SP:", vm.sp);
    if (vm.sp > 0) {
        const result = vm.pop();
        console.log("Result (0x1234 + 42 = 4704):", result);
        if (result === 4660 + 42) {
            console.log("TEST PASSED: LEA_ABS 4-byte operand handled correctly.");
        } else {
            console.log("TEST FAILED: result is", result);
        }
    } else {
        console.log("TEST FAILED: Stack is empty.");
    }
}

testOps().catch(e => console.error(e));
