import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { LavaXAssembler } from '../../src/compiler/LavaXAssembler';
import { LavParser } from '../../src/vst/LavParser';
import { getEffectiveEntryPoint } from '../../src/lav/format';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function collectSampleFiles(): string[] {
  const root = process.cwd();
  const officialDir = path.join(root, 'docs/ref_prjs/编译器/资料/通过');
  const exampleDir = path.join(root, 'examples');

  const official = readdirSync(officialDir)
    .filter(name => name.endsWith('.lav'))
    .map(name => path.join(officialDir, name));

  const examples = readdirSync(exampleDir)
    .filter(name => name.endsWith('.lav'))
    .map(name => path.join(exampleDir, name));

  return [...official, ...examples];
}

function firstDiff(a: Uint8Array, b: Uint8Array): string {
  const limit = Math.min(a.length, b.length);
  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) {
      return `offset=0x${i.toString(16)} expected=0x${a[i].toString(16).padStart(2, '0')} actual=0x${b[i].toString(16).padStart(2, '0')}`;
    }
  }
  if (a.length !== b.length) {
    return `length expected=${a.length} actual=${b.length}`;
  }
  return 'no diff';
}

function verifyFile(filePath: string) {
  const input = new Uint8Array(readFileSync(filePath));
  const program = LavParser.parse(input);
  const rebuilt = new LavaXAssembler().assembleProgram(program);

  assert(program.header.magic === 'LAV', `${filePath}: invalid magic`);
  assert(program.header.version === 0x12, `${filePath}: unexpected version 0x${program.header.version.toString(16)}`);
  assert(program.header.entryPointField === 0, `${filePath}: header bytes 0x08-0x0A expected 0`);
  assert(getEffectiveEntryPoint(program.header) === 0x10, `${filePath}: effective entry point expected 0x10`);
  assert(program.instructions.length > 0, `${filePath}: parsed no instructions`);
  assert(Buffer.compare(Buffer.from(input), Buffer.from(rebuilt)) === 0, `${filePath}: parse->assembleProgram mismatch ${firstDiff(input, rebuilt)}`);
}

function main() {
  const files = collectSampleFiles();
  assert(files.length > 0, 'no .lav samples found');

  for (const filePath of files) {
    verifyFile(filePath);
  }

  console.log(`PASS: ${files.length} official/example .lav samples round-trip exactly through LavParser + assembleProgram.`);
}

main();
