#!/usr/bin/env bun

// Test script to compile hello.c and examine the generated assembly
import { LavaXCompiler } from './src/compiler';
import { LavaXAssembler } from './src/compiler/LavaXAssembler';

const testCode = `void main() {
  printf("Hello, LavaX!\\n");
  printf("Press any key...\\n");
  getchar();
}`;

console.log("=== Test Code ===");
console.log(testCode);
console.log();

const compiler = new LavaXCompiler();
const asm = compiler.compile(testCode);

console.log("=== Generated Assembly ===");
console.log(asm);
console.log();

if (asm.startsWith('ERROR')) {
    console.error("Compilation failed!");
    process.exit(1);
}

// Check if getchar is present in the assembly
if (asm.includes('getchar')) {
    console.log("✓ getchar syscall found in assembly");
} else {
    console.error("✗ getchar syscall NOT found in assembly!");
}

// Assemble to binary
const assembler = new LavaXAssembler();
try {
    const bin = assembler.assemble(asm);
    console.log(`\n✓ Assembly successful! Binary size: ${bin.length} bytes`);

    // Check for getchar opcode (0x81) in binary
    const hasGetchar = Array.from(bin).includes(0x81);
    if (hasGetchar) {
        console.log("✓ getchar opcode (0x81) found in binary");
    } else {
        console.error("✗ getchar opcode (0x81) NOT found in binary!");
    }
} catch (e) {
    console.error("Assembly failed:", e.message);
    process.exit(1);
}
