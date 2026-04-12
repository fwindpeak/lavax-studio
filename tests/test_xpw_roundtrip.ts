import { readFileSync } from 'fs';
import { LavaXDecompiler } from '../src/decompiler';
import { LavaXCompiler } from '../src/compiler';
import { LavaXAssembler } from '../src/compiler/LavaXAssembler';
import { LavaXVM } from '../src/vm';
import { LocalStorageDriver } from '../src/vm/VFSStorageDriver';

async function runBinary(label: string, bin: Uint8Array, fontData: Buffer) {
  const driver = new LocalStorageDriver();
  const vm = new LavaXVM(driver);
  vm.setInternalFontData(new Uint8Array(fontData.buffer, fontData.byteOffset, fontData.byteLength));
  vm.load(bin);

  let status = 'completed';
  const timeout = setTimeout(() => {
    status = 'timeout';
    vm.stop();
  }, 3000);

  setTimeout(() => {
    vm.keyBuffer.push(0x1B);
    if ((vm as any).resolveKeySignal) (vm as any).resolveKeySignal();
  }, 100);

  try {
    await vm.run();
    clearTimeout(timeout);
    console.log(JSON.stringify({ label, ok: true, status, sp: vm.sp }));
  } catch (error: any) {
    clearTimeout(timeout);
    throw new Error(`${label} run failed: ${error.message}`);
  }
}

async function main() {
  const fontData = readFileSync('./public/fonts.dat');
  const original = new Uint8Array(readFileSync('./examples/xpw.lav'));

  const decompiler = new LavaXDecompiler();
  const compiler = new LavaXCompiler();
  const assembler = new LavaXAssembler();

  const source = decompiler.decompile(original);
  if (source.includes('__lavptr_')) throw new Error('decompiled source leaked internal pointer markers');
  if (source.includes('if("")') || source.includes('if ("")')) throw new Error('decompiled source contains empty-string conditions');

  const asm = compiler.compile(source);
  if (asm.startsWith('ERROR:')) throw new Error(`recompile failed: ${asm}`);

  const rebuilt = assembler.assemble(asm);

  await runBinary('original', original, fontData);
  await runBinary('rebuilt', rebuilt, fontData);

  console.log('PASS: xpw.lav decompile/compile/run round-trip succeeded.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});