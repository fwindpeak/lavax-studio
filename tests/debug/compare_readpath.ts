import { LavaXCompiler } from "../../src/compiler";
import { LavaXAssembler } from "../../src/compiler/LavaXAssembler";
import { LavaXDecompiler } from "../../src/decompiler";
import { readFileSync } from "fs";
import * as path from "path";

const root = path.resolve(import.meta.dir, "../..");

const src = readFileSync(path.join(root, "examples/boshi.c"));
const compiler = new LavaXCompiler();
const asm = compiler.compile(src as any);
const assembler = new LavaXAssembler();
const compiledLav = assembler.assemble(asm);
const officialLav = new Uint8Array(readFileSync(path.join(root, "examples/boshi.lav")));

const decompiler = new LavaXDecompiler();
const compiledDisasm = decompiler.disassemble(compiledLav);
const officialDisasm = decompiler.disassemble(officialLav);

// Find DrawMap function - it's func_10ae/func_10af. Search for the LEA_G_B in both
function findFuncWithLEA(disasm: string, label: string) {
  const lines = disasm.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('LEA_G_B') && lines[i].includes('LD_IND') === false) {
      // Found LEA_G_B, print context
      const start = Math.max(0, i - 20);
      const end = Math.min(lines.length - 1, i + 5);
      console.log(`=== ${label}: LEA_G_B at line ${i} ===`);
      for (let j = start; j <= end; j++) {
        console.log(`  ${lines[j]}`);
      }
      console.log();
      return; // only first
    }
  }
}

// Actually, find all LEA_G_B in both disasms
function findAllLEA(disasm: string, label: string) {
  const lines = disasm.split('\n');
  let count = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('LEA_G_B')) {
      count++;
      if (count <= 3) {
        console.log(`${label} LEA_G_B #${count}: ${lines[i].trim()}`);
        // Show 3 lines before
        for (let j = Math.max(0, i-5); j < i; j++) {
          console.log(`  pre: ${lines[j].trim()}`);
        }
        // Show 2 lines after
        for (let j = i+1; j <= Math.min(lines.length-1, i+2); j++) {
          console.log(`  post: ${lines[j].trim()}`);
        }
        console.log();
      }
    }
  }
  console.log(`${label}: Total LEA_G_B count = ${count}\n`);
}

findAllLEA(compiledDisasm, "COMPILED");
findAllLEA(officialDisasm, "OFFICIAL");
