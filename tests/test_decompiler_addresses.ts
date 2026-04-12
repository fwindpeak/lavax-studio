import { LavaXDecompiler } from '../src/decompiler';
import { Op } from '../src/types';

function assertContains(text: string, expected: string) {
  if (!text.includes(expected)) {
    throw new Error(`Expected output to contain: ${expected}\n\nActual output:\n${text}`);
  }
}

function assertNotContains(text: string, unexpected: string) {
  if (text.includes(unexpected)) {
    throw new Error(`Expected output not to contain: ${unexpected}\n\nActual output:\n${text}`);
  }
}

function makeLav(code: number[]) {
  return new Uint8Array([
    0x4C, 0x41, 0x56, 0x12, 0x00, 0x80, 0x00, 0x00,
    0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    ...code,
  ]);
}

function main() {
  const decompiler = new LavaXDecompiler();
  const lav = makeLav([
    Op.JMP, 0x14, 0x00, 0x00,
    Op.FUNC, 0x00, 0x00, 0x00,
    Op.PUSH_D, 0x00, 0x20, 0x00, 0x00,
    Op.CIPTR,
    Op.LD_IND,
    Op.POP,
    Op.PUSH_D, 0x00, 0x20, 0x00, 0x00,
    Op.CLPTR,
    Op.PUSH_B, 0x07,
    Op.STORE,
    Op.POP,
    Op.RET,
    Op.EXIT,
  ]);

  const output = decompiler.decompile(lav);
  console.log(output);

  assertContains(output, 'void main()');
  assertContains(output, '(int *)(g_2000)');
  assertContains(output, '*(long *)(g_2000) = 7;');
  assertNotContains(output, '*(int*)');
  assertNotContains(output, '*(long*)');
  assertNotContains(output, '8192');

  console.log('PASS: decompiler address output uses LavaX-style typed memory access.');
}

main();