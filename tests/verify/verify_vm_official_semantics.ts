import { LavaXVM } from '../../src/vm';
import { Op, SystemOp } from '../../src/types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function makeProgram(code: number[]): Uint8Array {
  return new Uint8Array([
    0x4c, 0x41, 0x56, 0x12,
    0x00, 0x00, 0x00, 0x00,
    0x10, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    ...code,
  ]);
}

async function testShiftSemantics() {
  const vm = new LavaXVM();

  vm.load(makeProgram([
    Op.PUSH_D, 0xf8, 0xff, 0xff, 0xff, // -8
    Op.PUSH_B, 0x01,
    Op.SHR,
    Op.EXIT,
  ]));
  await vm.run();
  assert(vm.pop() === 0x7ffffffc, 'SHR must follow official unsigned-right-shift semantics');

  vm.load(makeProgram([
    Op.PUSH_D, 0xf8, 0xff, 0xff, 0xff, // -8
    Op.SHR_C, 0x01, 0x00,
    Op.EXIT,
  ]));
  await vm.run();
  assert(vm.pop() === 0x7ffffffc, 'SHR_C must follow official unsigned-right-shift semantics');
}

function testRandSeed() {
  const vm = new LavaXVM();

  vm.push(0);
  vm.syscall.handleSync(SystemOp.srand);

  const first = vm.syscall.handleSync(SystemOp.rand);
  const second = vm.syscall.handleSync(SystemOp.rand);
  const third = vm.syscall.handleSync(SystemOp.rand);

  assert(first === 0, `rand #1 drifted: expected 0, got ${first}`);
  assert(second === 346, `rand #2 drifted: expected 346, got ${second}`);
  assert(third === 130, `rand #3 drifted: expected 130, got ${third}`);
}

function testGetmsUsesCurrentMillisecond() {
  const vm = new LavaXVM();
  const RealDate = Date;
  const fakeNow = new RealDate('2026-04-15T12:34:56.500Z').getTime();

  class FakeDate extends RealDate {
    constructor(...args: any[]) {
      super(args.length === 0 ? fakeNow : (args[0] as any));
    }
    static now() {
      return fakeNow;
    }
  }

  try {
    (globalThis as any).Date = FakeDate;
    const value = vm.syscall.handleSync(SystemOp.Getms);
    assert(value === 128, `Getms must scale the current millisecond into 0..255, got ${value}`);
  } finally {
    (globalThis as any).Date = RealDate;
  }
}

function testCheckKeyAndReleaseKey() {
  const vm = new LavaXVM();
  vm.currentKeyDown = 13;
  vm.heldKeys[13] = 1;
  vm.keyBuffer.push(13, 13, 27);

  vm.push(13);
  const heldEnter = vm.syscall.handleSync(SystemOp.CheckKey);
  assert(heldEnter === -1, `CheckKey(13) must return -1 while held, got ${heldEnter}`);

  vm.push(128);
  const anyHeld = vm.syscall.handleSync(SystemOp.CheckKey);
  assert(anyHeld === 13, `CheckKey(128) must return the held key code, got ${anyHeld}`);

  vm.push(13);
  const releaseSpecific = vm.syscall.handleSync(SystemOp.ReleaseKey);
  assert(releaseSpecific === null, 'ReleaseKey must not push a return value');
  assert(vm.currentKeyDown === 0, 'ReleaseKey(specific) must clear the held-key state');
  assert(vm.keyBuffer.length === 1 && vm.keyBuffer[0] === 27, 'ReleaseKey(specific) must drop queued repeats for that key');
}

function testHeldKeyDedupAndGetWord() {
  const vm = new LavaXVM();

  vm.pushKey(20);
  vm.pushKey(20);
  assert(vm.keyBuffer.length === 1, `repeated keydown should not enqueue duplicates while held, got ${vm.keyBuffer.length}`);

  vm.push(0);
  const word = vm.syscall.handleSync(SystemOp.GetWord);
  assert(word === 20, `GetWord should follow official single-key getchar semantics, got ${word}`);

  vm.releaseKey(20);
  vm.pushKey(20);
  assert(vm.keyBuffer.length === 1 && vm.keyBuffer[0] === 20, 'key should enqueue again after release');
}

function testDelayTickRounding() {
  const vm = new LavaXVM();
  vm.push(1);
  const result = vm.syscall.handleSync(SystemOp.Delay);
  assert(result === null, `Delay(1) should round down to zero official ticks and return immediately, got ${result}`);
  assert(vm.sp === 0, `Delay(1) should consume its argument when it does not actually wait, sp=${vm.sp}`);
}

function testPaletteOrderAndColorMasking() {
  const vm = new LavaXVM();
  vm.graphics.graphMode = 8;

  const paletteAddr = 0x2000;
  vm.memory.set([0x11, 0x22, 0x33, 0x00], paletteAddr); // B G R reserved
  vm.push(0);
  vm.push(1);
  vm.push(paletteAddr);
  const updated = vm.syscall.handleSync(SystemOp.SetPalette);
  assert(updated === 1, `SetPalette must return updated color count, got ${updated}`);
  assert(vm.graphics.palette[0] === 0x33, 'SetPalette must map source R channel from byte 2');
  assert(vm.graphics.palette[1] === 0x22, 'SetPalette must map source G channel from byte 1');
  assert(vm.graphics.palette[2] === 0x11, 'SetPalette must map source B channel from byte 0');

  vm.graphics.graphMode = 4;
  vm.push(0xff);
  vm.syscall.handleSync(SystemOp.SetFgColor);
  assert(vm.graphics.fgColor === 0x0f, `SetFgColor must clamp to 4-bit in 16-color mode, got ${vm.graphics.fgColor}`);
}

function testTrigLookupTable() {
  const vm = new LavaXVM();

  vm.push(90);
  assert(vm.syscall.handleSync(SystemOp.Sin) === 1024, 'Sin(90) must equal 1024');

  vm.push(180);
  assert(vm.syscall.handleSync(SystemOp.Cos) === -1024, 'Cos(180) must equal -1024');
}

async function main() {
  await testShiftSemantics();
  testRandSeed();
  testGetmsUsesCurrentMillisecond();
  testCheckKeyAndReleaseKey();
  testHeldKeyDedupAndGetWord();
  testDelayTickRounding();
  testPaletteOrderAndColorMasking();
  testTrigLookupTable();
  console.log('PASS: VM official-C compatibility regressions verified.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
