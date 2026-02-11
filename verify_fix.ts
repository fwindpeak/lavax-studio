import { LavaXVM } from './src/vm';
import { GBUF_OFFSET, VRAM_OFFSET, TEXT_OFFSET } from './src/types';

// Mock ImageData
(globalThis as any).ImageData = class { data = new Uint8ClampedArray(160 * 80 * 4); };

async function verify() {
    try {
        console.log("Initializing VM...");
        const vm = new LavaXVM();

        const countPixels = (offset: number) => {
            let count = 0;
            for (let i = 0; i < 1600; i++) {
                if (vm.memory[offset + i] !== 0) {
                    for (let b = 0; b < 8; b++) {
                        if ((vm.memory[offset + i] >> b) & 1) count++;
                    }
                }
            }
            return count;
        };

        // 1. SetScreen(0)
        vm.push(0);
        // @ts-ignore
        vm.ops[0x85]();

        console.log("Initial VRAM pixels:", countPixels(VRAM_OFFSET));

        // 2. Line(0, 0, 10, 10, 1) - Rule A: bit 6=0 is Direct (VRAM)
        console.log("Calling Line(0, 0, 10, 10, 1)...");
        vm.push(0); vm.push(0); vm.push(10); vm.push(10); vm.push(1);
        // @ts-ignore
        vm.ops[0x96]();

        const vramAfterLine = countPixels(VRAM_OFFSET);
        console.log("VRAM pixels after Line(..., 1):", vramAfterLine);
        if (vramAfterLine > 0) {
            console.log("SUCCESS: Line(..., 1) is direct drawing.");
        } else {
            console.error("FAILURE: Line(..., 1) should be direct!");
        }

        // 3. Refresh() - Should wipe VRAM because GBUF is empty
        console.log("Calling Refresh()...");
        // @ts-ignore
        vm.ops[0x89]();
        console.log("VRAM pixels after Refresh:", countPixels(VRAM_OFFSET));
        if (countPixels(VRAM_OFFSET) === 0) {
            console.log("SUCCESS: Refresh wiped VRAM (as expected since GBUF is empty).");
        } else {
            console.error("FAILURE: Refresh did not wipe VRAM.");
        }

        // 4. UpdateLCD(0) - Refresh from TEXT area
        console.log("Testing UpdateLCD()...");
        const testStr = "GVM";
        for (let i = 0; i < testStr.length; i++) {
            vm.memory[TEXT_OFFSET + i] = testStr.charCodeAt(i);
        }
        vm.memory[TEXT_OFFSET + testStr.length] = 0;

        vm.push(0); // mask 0 (update all)
        // @ts-ignore
        vm.ops[0x86](); // Actually UpdateLCD is 0x86? Wait, types.ts says UpdateLCD=0x86.
        // Wait, the user said UpdateLCD is 0x86? Let's check.
        // Actually SystemOp.UpdateLCD = 0x86. Correct.

        console.log("VRAM pixels after UpdateLCD:", countPixels(VRAM_OFFSET));
        if (countPixels(VRAM_OFFSET) > 0) {
            console.log("SUCCESS: UpdateLCD rendered text buffer to VRAM.");
        } else {
            console.error("FAILURE: UpdateLCD did not render text.");
        }

    } catch (e: any) {
        console.error("CRASHED:", e.message);
    }
}

verify();
