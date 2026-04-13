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

function extractRange(disasm: string, startAddr: number, length: number): string[] {
  const lines = disasm.split('\n');
  const result: string[] = [];
  for (const line of lines) {
    const m = line.match(/^([0-9a-fA-F]+):/);
    if (m) {
      const addr = parseInt(m[1], 16);
      if (addr >= startAddr && addr < startAddr + length) {
        result.push(line);
      }
    }
  }
  return result;
}

console.log("=== COMPILED func_1125 (init_game) ===");
const cLines = extractRange(compiledDisasm, 0x1125, 0x200);
cLines.forEach(l => console.log(l));

console.log("\n=== OFFICIAL func_112d (init_game) ===");
const oLines = extractRange(officialDisasm, 0x112d, 0x200);
oLines.forEach(l => console.log(l));

console.log("\n=== Compiler ASM for init_game ===");
const asmLines = asm.split('\n');
const startIdx = asmLines.findIndex(l => l.includes('init_game'));
if (startIdx >= 0) {
  asmLines.slice(startIdx, startIdx + 80).forEach(l => console.log(l));
}
