import { LavaXCompiler } from "../../src/compiler";
import { LavaXAssembler } from "../../src/compiler/LavaXAssembler";
import { LavaXDecompiler } from "../../src/decompiler";
import { readFileSync } from "fs";
import * as path from "path";

const root = path.resolve(import.meta.dir, "../..");

// 1. Compile boshi.c
const src = readFileSync(path.join(root, "examples/boshi.c"));
const compiler = new LavaXCompiler();
const asm = compiler.compile(src as any);
if (asm.startsWith("ERROR")) { console.log(asm); process.exit(1); }
const assembler = new LavaXAssembler();
const compiledLav = assembler.assemble(asm);
console.log("=== Compiled .lav size:", compiledLav.length);

// 2. Decompile compiled output
const decompiler = new LavaXDecompiler();
const decompiledC = decompiler.decompile(compiledLav);
console.log("=== Decompiled compiled boshi.c (first 100 lines):");
const lines = decompiledC.split('\n');
lines.slice(0, 100).forEach((l: string, i: number) => console.log(`${i+1}: ${l}`));

// 3. Decompile official boshi.lav
const officialLav = readFileSync(path.join(root, "examples/boshi.lav"));
const officialC = decompiler.decompile(new Uint8Array(officialLav));
console.log("\n=== Decompiled official boshi.lav (first 100 lines):");
const oLines = officialC.split('\n');
oLines.slice(0, 100).forEach((l: string, i: number) => console.log(`${i+1}: ${l}`));
