#!/usr/bin/env bun

import { LavaXCompiler } from '../src/compiler';
import { LavaXAssembler } from '../src/compiler/LavaXAssembler';
import { LavaXDecompiler } from '../src/decompiler';

const graphicsCSource = `
void main() {
  ClearScreen();
  Line(0, 0, 159, 79, 1);
  Circle(80, 40, 30, 0, 1);
  getchar();
  ClearScreen();
  char fa[]={
    0xff,0xe0,0x80,0x20,0xbb,0xa0,0x8a,0x20,
    0x91,0x20,0xa0,0xa0,0xbb,0xa0,0x8a,0xa0,
    0xba,0xa0,0xa0,0x20,0xbb,0xa0,0x8a,0xa0,
    0x89,0x20,0xba,0xa0,0x80,0x20,0xff,0xe0};
  WriteBlock(60, 30, 11, 16, 1, fa);
  WriteBlock(80, 30, 11, 16, 2, fa);
  WriteBlock(96, 30, 16, 16, 0x21, fa);
  Refresh();
  getchar();
}
`;

console.log('=== Test: Graphics Array Decompile ===\n');
console.log('Step 1: Compiling graphics.c...');
const compiler = new LavaXCompiler();
const asm = compiler.compile(graphicsCSource);

if (asm.startsWith('ERROR:')) {
  console.error('Compilation failed:', asm);
  process.exit(1);
}

console.log('✓ Compilation successful\n');
console.log('Step 2: Assembling to .lav binary...');
const assembler = new LavaXAssembler();
const lav = assembler.assemble(asm);
console.log(`✓ Assembly successful, binary size: ${lav.length} bytes\n`);

console.log('Step 3: Disassembling...');
const decompiler = new LavaXDecompiler();
const disasm = decompiler.disassemble(lav);

// Find INIT instruction to verify array data is present
const initMatch = disasm.match(/INIT\s+(\d+)\s+(\d+)\s+(.*)/);
if (!initMatch) {
  console.warn('⚠ No INIT instruction found in disassembly');
} else {
  const [, addr, len, dataStr] = initMatch;
  console.log(`✓ Found INIT at address ${addr}, length ${len} bytes`);
  const dataBytes = dataStr.split(/\s+/).slice(0, parseInt(len)).join(' ');
  console.log(`  Data: ${dataBytes.substring(0, 60)}...`);
}

console.log('\nStep 4: Decompiling to C source...');
const decompiled = decompiler.decompile(lav);

console.log('=== Decompiled Source ===\n');
console.log(decompiled);
console.log('\n=== Verification ===\n');

// Check for array declaration
const arrayDeclMatch = decompiled.match(/char\s+(\w+)\[\]\s*=\s*\{\s*0x/);
if (arrayDeclMatch) {
  console.log(`✓ Array declaration found: char ${arrayDeclMatch[1]}[]`);
} else {
  console.error('✗ No array declaration found in decompiled source');
}

// Check for WriteBlock calls with array name (not just numbers)
const writeBlockMatches = decompiled.match(/WriteBlock\([^)]+\)/g);
if (writeBlockMatches) {
  console.log(`\n✓ Found ${writeBlockMatches.length} WriteBlock calls:`);
  writeBlockMatches.forEach(call => {
    console.log(`  ${call}`);
    // Check if the last parameter is an array name (not just a number like "5")
    const lastParam = call.match(/,\s*(\w+)\s*\)$/)?.[1];
    if (lastParam && !(/^\d+$/.test(lastParam))) {
      console.log(`    ✓ Last parameter is '${lastParam}' (variable reference)`);
    } else {
      console.log(`    ✗ Last parameter is numeric (should be array variable)`);
    }
  });
} else {
  console.error('✗ No WriteBlock calls found');
}

// Check for INIT block structure (address, size, bytes)
const initInArray = decompiled.match(/char\s+\w+\[\]\s*=\s*\{\s*(0x[0-9A-Fa-f]+[,\s]+)+\}/);
if (initInArray) {
  console.log('\n✓ Array initialization structure is correct');
  const firstAlignedCheck = decompiled.match(/0xFF/i) || decompiled.match(/0xff/);
  if (firstAlignedCheck) {
    console.log('✓ First byte (0xFF) found in decompiled array');
  }
} else {
  console.log('\n✗ Array initialization structure not found');
}

process.exit(0);
