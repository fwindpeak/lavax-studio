import { LavaXDecompiler } from "../../src/decompiler";
import { readFileSync } from "fs";
import * as path from "path";

const root = path.resolve(import.meta.dir, "../..");
const officialLav = new Uint8Array(readFileSync(path.join(root, "examples/boshi.lav")));
const decompiler = new LavaXDecompiler();
const officialDisasm = decompiler.disassemble(officialLav);

// Find LEA_G_B followed by LD_IND (read pattern) in official
const lines = officialDisasm.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('LEA_G_B') && i+1 < lines.length && lines[i+1].includes('LD_IND')) {
    console.log("=== Official READ LEA_G_B pattern ===");
    for (let j = Math.max(0, i-10); j <= Math.min(lines.length-1, i+3); j++) {
      console.log(`  ${lines[j]}`);
    }
    console.log();
    break;
  }
}

// Also check: what's the read path in official that's NOT LEA_G_B?
// Look for CALL L_1082 and show what comes before it
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('CALL L_1082')) {
    console.log("=== Official: before CALL L_1082 (DrawGraphic) ===");
    for (let j = Math.max(0, i-20); j <= i; j++) {
      console.log(`  ${lines[j]}`);
    }
    console.log();
    break;
  }
}
