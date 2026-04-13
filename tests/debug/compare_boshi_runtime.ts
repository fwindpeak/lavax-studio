import { readFileSync } from 'fs';
import iconv from 'iconv-lite';
import { LavaXCompiler } from '../../src/compiler';
import { LavaXAssembler } from '../../src/compiler/LavaXAssembler';
import { LavaXVM } from '../../src/vm';
import { LocalStorageDriver } from '../../src/vm/VFSStorageDriver';

type Event = {
  i: number;
  step: number;
  pc: number;
  op: number;
  sp: number;
  top: number[];
};

function traceSyscalls(bin: Uint8Array, fontData: Uint8Array, maxEvents = 120): Event[] {
  const vm = new LavaXVM(new LocalStorageDriver());
  vm.setInternalFontData(fontData);
  vm.load(bin);
  vm.running = true;

  const events: Event[] = [];
  const keySeq = [13, 23, 22, 20, 21, 27, 25, 13, 27, 13, 23, 23, 21, 21, 13, 27, 13, 27];
  let keyIdx = 0;
  let steps = 0;

  while (vm.running && steps < 200000 && events.length < maxEvents) {
    const pc = (vm as any).pc as number;
    const op = ((vm as any).fd as Uint8Array)[pc];

    if (op >= 0x80) {
      const top: number[] = [];
      for (let i = 0; i < 6; i++) {
        const idx = vm.sp - 1 - i;
        if (idx >= 0) top.push(vm.stk[idx]);
      }
      events.push({ i: events.length, step: steps, pc, op, sp: vm.sp, top });
    }

    (vm as any).stepSync();
    steps++;

    const resolver = (vm as any).resolveKeySignal as (() => void) | null;
    if (resolver) {
      const key = keySeq[keyIdx++] ?? 27;
      vm.keyBuffer.push(key);
      resolver();
      (vm as any).resolveKeySignal = null;
    }
  }

  return events;
}

function buildFromSource(): Uint8Array {
  const source = iconv.decode(readFileSync('./examples/boshi.c'), 'gbk');
  const asm = new LavaXCompiler().compile(source);
  if (asm.startsWith('ERROR:')) {
    throw new Error(`compile failed: ${asm}`);
  }
  return new LavaXAssembler().assemble(asm);
}

function main() {
  const fontBuf = readFileSync('./public/fonts.dat');
  const fontData = new Uint8Array(fontBuf.buffer, fontBuf.byteOffset, fontBuf.byteLength);

  const officialBuf = readFileSync('./examples/boshi.lav');
  const official = new Uint8Array(officialBuf.buffer, officialBuf.byteOffset, officialBuf.byteLength);
  const rebuilt = buildFromSource();

  const officialEvents = traceSyscalls(official, fontData, 180);
  const rebuiltEvents = traceSyscalls(rebuilt, fontData, 180);

  let div = -1;
  const n = Math.min(officialEvents.length, rebuiltEvents.length);
  for (let i = 0; i < n; i++) {
    if (officialEvents[i].op !== rebuiltEvents[i].op) {
      div = i;
      break;
    }
  }

  console.log(
    JSON.stringify(
      {
        officialEvents: officialEvents.length,
        rebuiltEvents: rebuiltEvents.length,
        firstDivergenceIndex: div,
      },
      null,
      2,
    ),
  );

  if (div >= 0) {
    const start = Math.max(0, div - 8);
    const end = Math.min(n, div + 8);

    console.log('\n[OFFICIAL WINDOW]');
    for (let i = start; i < end; i++) {
      console.log(JSON.stringify(officialEvents[i]));
    }

    console.log('\n[REBUILT WINDOW]');
    for (let i = start; i < end; i++) {
      console.log(JSON.stringify(rebuiltEvents[i]));
    }
  }
}

main();
