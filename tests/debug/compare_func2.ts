import { LavaXCompiler } from "../../src/compiler";
import { LavaXAssembler } from "../../src/compiler/LavaXAssembler";
import { LavaXDecompiler } from "../../src/decompiler";
import { readFileSync } from "fs";
import * as path from "path";

const root = path.resolve(import.meta.dir, "../..");

const src = readFileSync(path.join(root, "examples/boshi.c"));
const compiler = new LavaXCompiler();
const asm = compiler.compile(src as any);

// Find the init_game function in the asm
const asmLines = asm.split('\n');
// Search for MapData pattern  
let found = false;
for (let i = 0; i < asmLines.length; i++) {
  const l = asmLines[i];
  if (l.includes('MapData') || l.includes('0x49') || (l.includes('STORE') && !found)) continue;
  if (l.includes('73') || l.includes('0x49')) {
    // Look around this area
    console.log(`Found at line ${i}: ${l}`);
    found = true;
  }
}

// Let's look for the first function label and the PUSH_B 73 / STORE pattern
console.log("\n=== Search for PUSH 73 (0x49) in ASM ===");
for (let i = 0; i < asmLines.length; i++) {
  if (asmLines[i].includes('PUSH_B 73') || asmLines[i].includes('PUSH_B 0x49')) {
    console.log(`Line ${i}: ${asmLines[i]}`);
    // Print context
    for (let j = Math.max(0, i-10); j <= Math.min(asmLines.length-1, i+5); j++) {
      console.log(`  ${j}: ${asmLines[j]}`);
    }
    console.log();
    break;
  }
}

// Now find the same in official disasm
const assembler = new LavaXAssembler();
const compiledLav = assembler.assemble(asm);
const officialLav = new Uint8Array(readFileSync(path.join(root, "examples/boshi.lav")));

const decompiler = new LavaXDecompiler();
const compiledDisasm = decompiler.disassemble(compiledLav);
const officialDisasm = decompiler.disassemble(officialLav);

// Search for PUSH_B 73 in both disasms
function findPattern(disasm: string, label: string) {
  const lines = disasm.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('PUSH_B 73') || lines[i].includes('PUSH_B 0x49')) {
      console.log(`=== ${label}: Found PUSH_B 73 at line ${i} ===`);
      for (let j = Math.max(0, i-15); j <= Math.min(lines.length-1, i+10); j++) {
        console.log(`  ${lines[j]}`);
      }
      console.log();
      break;
    }
  }
}

findPattern(compiledDisasm, "COMPILED disasm");
findPattern(officialDisasm, "OFFICIAL disasm");
