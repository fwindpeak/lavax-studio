#!/usr/bin/env bun

// Test script to compile hello.c and examine the generated assembly
import { LavaXCompiler } from './src/compiler.ts';
import { LavaXAssembler } from './src/compiler/LavaXAssembler.ts';

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

    // Hex Dump
    console.log("Binary Dump (Hex):");
    for (let i = 0; i < bin.length; i += 16) {
        const chunk = bin.slice(i, i + 16);
        const hex = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ');
        console.log(`${i.toString(16).padStart(4, '0')}: ${hex}`);
    }

    // Check for header
    if (bin[0] === 0x4C && bin[1] === 0x41 && bin[2] === 0x56) {
        console.log("✓ Header magic 'LAV' found");
        console.log(`✓ Version: 0x${bin[3].toString(16)}`);
        console.log(`✓ Memory limit: 0x${bin[5].toString(16)}`);
        const jpVar = bin[8] | (bin[9] << 8);
        console.log(`✓ jp_var: 0x${jpVar.toString(16)}`);
    } else {
        console.error("✗ Invalid Header magic!");
    }

} catch (e: any) {
    console.error("Assembly failed:", e.message);
    process.exit(1);
}
