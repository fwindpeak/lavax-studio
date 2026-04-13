import { readFileSync } from 'fs';
import iconv from 'iconv-lite';
import { LavaXCompiler } from '../src/compiler';
import { LavaXAssembler } from '../src/compiler/LavaXAssembler';
import { LavaXDecompiler } from '../src/decompiler';
import { LavaXVM } from '../src/vm';
import { LocalStorageDriver } from '../src/vm/VFSStorageDriver';

type RunResult = {
  label: string;
  status: 'completed' | 'timeout';
  sp: number;
};

async function runWithVm(label: string, bin: Uint8Array, fontData: Uint8Array): Promise<RunResult> {
  const vm = new LavaXVM(new LocalStorageDriver());
  vm.setInternalFontData(fontData);
  vm.load(bin);

  let status: 'completed' | 'timeout' = 'completed';
  const timeout = setTimeout(() => {
    status = 'timeout';
    vm.stop();
  }, 3000);

  // Feed ESC to unblock getchar-driven game loops.
  setTimeout(() => {
    vm.keyBuffer.push(0x1b);
    const maybeResolve = (vm as any).resolveKeySignal;
    if (typeof maybeResolve === 'function') {
      maybeResolve();
    }
  }, 100);

  try {
    await vm.run();
    clearTimeout(timeout);
    return { label, status, sp: vm.sp };
  } catch (error: any) {
    clearTimeout(timeout);
    throw new Error(`${label} VM run failed: ${error.message}`);
  }
}

async function main() {
  console.log('========== boshi full roundtrip ==========');

  const compiler = new LavaXCompiler();
  const assembler = new LavaXAssembler();
  const decompiler = new LavaXDecompiler();

  const fontBuf = readFileSync('./public/fonts.dat');
  const fontData = new Uint8Array(fontBuf.buffer, fontBuf.byteOffset, fontBuf.byteLength);

  const officialLavBuf = readFileSync('./examples/boshi.lav');
  const officialLav = new Uint8Array(officialLavBuf.buffer, officialLavBuf.byteOffset, officialLavBuf.byteLength);

  // boshi.c is GBK-encoded; decode explicitly to avoid mojibake-driven regressions.
  const sourceBuf = readFileSync('./examples/boshi.c');
  const source = iconv.decode(sourceBuf, 'gbk');

  console.log('1) compile source (GBK)');
  const asmFromSource = compiler.compile(source);
  if (asmFromSource.startsWith('ERROR:')) {
    throw new Error(`compile source failed: ${asmFromSource}`);
  }

  console.log('2) assemble source output');
  const lavFromSource = assembler.assemble(asmFromSource);

  console.log('3) run official .lav in VM');
  const officialRun = await runWithVm('official', officialLav, fontData);
  console.log(JSON.stringify(officialRun));

  console.log('4) run source-built .lav in VM');
  const sourceRun = await runWithVm('from_source', lavFromSource, fontData);
  console.log(JSON.stringify(sourceRun));

  console.log('5) decompile official .lav');
  const decompiledSource = decompiler.decompile(officialLav);
  if (!decompiledSource || decompiledSource.trim().length === 0) {
    throw new Error('decompile produced empty source');
  }

  console.log('6) recompile decompiled source');
  const asmRoundtrip = compiler.compile(decompiledSource);
  if (asmRoundtrip.startsWith('ERROR:')) {
    throw new Error(`recompile decompiled source failed: ${asmRoundtrip}`);
  }

  console.log('7) assemble roundtrip output');
  const lavRoundtrip = assembler.assemble(asmRoundtrip);

  console.log('8) run roundtrip .lav in VM');
  const roundtripRun = await runWithVm('roundtrip', lavRoundtrip, fontData);
  console.log(JSON.stringify(roundtripRun));

  console.log('PASS: boshi compile/run/decompile/recompile/run full loop succeeded.');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
