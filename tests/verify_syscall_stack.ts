import { LavaXVM } from '../src/vm';
import { Op, SystemOp, GBUF_OFFSET } from '../src/types';

async function testSyscallStack() {
    const vm = new LavaXVM();
    
    // Create a minimal .lav binary
    // Header: LAV (3B), v18 (1B), Reserved (1B), mask (1B), loadall (2B), pc (3B), reserved (5B)
    const header = new Uint8Array(16);
    header.set([0x4C, 0x41, 0x56], 0);
    header[3] = 0x12;
    header[8] = 0x10; // Entry point at 0x10
    
    // Code: 
    // PUSH_B 10 (x)
    // PUSH_B 10 (y)
    // PUSH_B 0  (str - ptr to empty string at 0x7000 but we'll use literal)
    // PUSH_B 1  (mode)
    // SYSCALL TextOut (0x8A)
    // POP (Compiler expects return value for hasReturn: true)
    // EXIT
    const code = new Uint8Array([
        Op.PUSH_B, 10,  // x
        Op.PUSH_B, 10,  // y
        Op.PUSH_STR, 0, // s (empty string ""\0)
        Op.PUSH_B, 1,   // mode
        SystemOp.TextOut,
        Op.POP,         // Should pop the 0 returned by TextOut
        Op.EXIT
    ]);
    
    const binary = new Uint8Array(header.length + code.length);
    binary.set(header);
    binary.set(code, 16);
    
    vm.load(binary);
    
    console.log("Initial SP:", vm.sp);
    
    // Run until EXIT
    let steps = 0;
    while (vm.running && steps < 100) {
        (vm as any).stepSync();
        steps++;
    }
    
    console.log("Final SP:", vm.sp);
    if (vm.sp === 0) {
        console.log("SUCCESS: Stack is balanced after TextOut + POP");
    } else {
        console.error("FAILURE: Stack is NOT balanced! SP:", vm.sp);
    }
}

testSyscallStack().catch(console.error);
