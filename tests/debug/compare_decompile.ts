import { LavaXCompiler } from "../../src/compiler";
import { LavaXAssembler } from "../../src/compiler/LavaXAssembler";
import { LavaXDecompiler } from "../../src/decompiler";
import { readFileSync, writeFileSync } from "fs";
import * as path from "path";

const root = path.resolve(import.meta.dir, "../..");

const src = readFileSync(path.join(root, "examples/boshi.c"));
const compiler = new LavaXCompiler();
const asm = compiler.compile(src as any);
const assembler = new LavaXAssembler();
const compiledLav = assembler.assemble(asm);

const officialLav = new Uint8Array(readFileSync(path.join(root, "examples/boshi.lav")));

const decompiler = new LavaXDecompiler();
const compiledC = decompiler.decompile(compiledLav);
const officialC = decompiler.decompile(officialLav);

writeFileSync("/tmp/compiled_decompiled.c", compiledC);
writeFileSync("/tmp/official_decompiled.c", officialC);

// Show diff (skip global arrays which are huge)
const cLines = compiledC.split('\n').filter(l => !l.startsWith('char g_') && !l.startsWith('int g_0'));
const oLines = officialC.split('\n').filter(l => !l.startsWith('char g_') && !l.startsWith('int g_'));

let diffCount = 0;
const maxLen = Math.max(cLines.length, oLines.length);
for (let i = 0; i < maxLen; i++) {
  const c = cLines[i] || '';
  const o = oLines[i] || '';
  if (c !== o) {
    diffCount++;
    if (diffCount <= 50) {
      console.log(`DIFF at line ${i+1}:`);
      console.log(`  COMPILED: ${c}`);
      console.log(`  OFFICIAL: ${o}`);
    }
  }
}
console.log(`\nTotal diffs: ${diffCount} / ${maxLen} lines`);
