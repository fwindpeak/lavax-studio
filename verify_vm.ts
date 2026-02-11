
import { LavaXVM } from './src/vm';
import { Op } from './src/types';

async function verify() {
    console.log("Initializing VM...");
    const vm = new LavaXVM();
    vm.onLog = (msg) => console.log("VM Log:", msg);

    // Simple script: PUSH 10, PUSH 20, ADD, EXIT
    const code = new Uint8Array([
        0x4C, 0x41, 0x56, 18, 0, 0x80, 0, 0, 0x10, 0, 0, 0, 0, 0, 0, 0,
        Op.PUSH_B, 10,
        Op.PUSH_B, 20,
        Op.ADD,
        Op.EXIT
    ]);

    try {
        console.log("Loading code...");
        vm.load(code);
        console.log("Running...");
        await vm.run();
        console.log("SP after execution:", vm.sp);
        if (vm.sp > 0) {
            const result = vm.pop();
            console.log("Result (expected 30):", result);
            if (result === 30) {
                console.log("VERIFICATION SUCCESSFUL");
            } else {
                console.error("VERIFICATION FAILED: Expected 30, got", result);
            }
        } else {
            console.error("VERIFICATION FAILED: Stack empty");
        }
    } catch (e) {
        console.error("ERROR during verification:", e);
    }
}

verify();
