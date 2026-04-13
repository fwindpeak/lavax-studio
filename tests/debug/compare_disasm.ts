/**
 * Compare disassembly of:
 *   1. boshi.c → compile → assemble → disassemble
 *   2. official boshi.lav → disassemble directly
 *
 * Output both disassemblies to files and show the diff summary.
 */
import { readFileSync, writeFileSync } from 'fs';
import { LavaXCompiler } from '../../src/compiler';
import { LavaXAssembler } from '../../src/compiler/LavaXAssembler';
import { LavaXDecompiler } from '../../src/decompiler';

const boshiC = readFileSync('examples/boshi.c'); // Read as Buffer, not string — compiler detects GBK
const officialLav = new Uint8Array(readFileSync('examples/boshi.lav'));

// Step 1: Compile boshi.c → assembly → .lav binary
const compiler = new LavaXCompiler();
const asmText = compiler.compile(boshiC);
if (asmText.startsWith('ERROR')) {
  console.error('Compilation failed:', asmText);
  process.exit(1);
}

// Save compiler assembly output
writeFileSync('tmp/boshi_compiled.asm', asmText);
console.log(`Compiler output: ${asmText.split('\n').length} lines of assembly`);

const assembler = new LavaXAssembler();
const compiledLav = assembler.assemble(asmText);
console.log(`Assembled .lav: ${compiledLav.length} bytes`);
console.log(`Official .lav:  ${officialLav.length} bytes`);

// Step 2: Disassemble both
const decompiler = new LavaXDecompiler();
const compiledDisasm = decompiler.disassemble(compiledLav);
const officialDisasm = decompiler.disassemble(officialLav);

// Save disassembly outputs
writeFileSync('tmp/boshi_compiled_disasm.txt', compiledDisasm);
writeFileSync('tmp/boshi_official_disasm.txt', officialDisasm);

const compiledLines = compiledDisasm.split('\n');
const officialLines = officialDisasm.split('\n');

console.log(`\nCompiled disasm:  ${compiledLines.length} lines`);
console.log(`Official disasm:  ${officialLines.length} lines`);

// Step 3: Compare headers
console.log('\n=== Header Comparison ===');
console.log('Compiled header:', Array.from(compiledLav.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));
console.log('Official header:', Array.from(officialLav.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join(' '));

// Step 4: Compare instruction sequences (ignoring labels and addresses)
// Extract just the instructions (remove labels, normalize addresses)
function extractInstructions(disasm: string): string[] {
  return disasm.split('\n')
    .filter(l => l.trimStart().startsWith(' ') || l.trimStart().match(/^[A-Z]/))
    .map(l => l.trim())
    .filter(l => !l.endsWith(':'));  // skip labels
}

const compiledInstrs = extractInstructions(compiledDisasm);
const officialInstrs = extractInstructions(officialDisasm);

console.log(`\nCompiled instructions: ${compiledInstrs.length}`);
console.log(`Official instructions: ${officialInstrs.length}`);

// Step 5: Find first difference
console.log('\n=== First 20 Differences ===');
let diffCount = 0;
const maxLines = Math.max(compiledLines.length, officialLines.length);
for (let i = 0; i < maxLines && diffCount < 20; i++) {
  const cl = compiledLines[i] || '<EOF>';
  const ol = officialLines[i] || '<EOF>';
  if (cl !== ol) {
    console.log(`Line ${i + 1}:`);
    console.log(`  compiled: ${cl}`);
    console.log(`  official: ${ol}`);
    diffCount++;
  }
}

// Step 6: Count total differences
let totalDiff = 0;
for (let i = 0; i < maxLines; i++) {
  if ((compiledLines[i] || '') !== (officialLines[i] || '')) totalDiff++;
}
console.log(`\nTotal differing lines: ${totalDiff} / ${maxLines}`);

// Step 7: Instruction opcode histogram comparison
function opcodeHistogram(disasm: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const line of disasm.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.endsWith(':') || trimmed === '') continue;  // skip labels
    const opName = trimmed.split(/\s+/)[0];
    if (opName) m.set(opName, (m.get(opName) || 0) + 1);
  }
  return m;
}

const compiledHist = opcodeHistogram(compiledDisasm);
const officialHist = opcodeHistogram(officialDisasm);

console.log('\n=== Opcode Histogram Differences ===');
const allOps = new Set([...compiledHist.keys(), ...officialHist.keys()]);
for (const op of [...allOps].sort()) {
  const c = compiledHist.get(op) || 0;
  const o = officialHist.get(op) || 0;
  if (c !== o) {
    console.log(`  ${op.padEnd(15)} compiled: ${c}, official: ${o}, diff: ${c - o}`);
  }
}

console.log('\nDisassembly files saved to:');
console.log('  tmp/boshi_compiled_disasm.txt');
console.log('  tmp/boshi_official_disasm.txt');
console.log('  tmp/boshi_compiled.asm');
