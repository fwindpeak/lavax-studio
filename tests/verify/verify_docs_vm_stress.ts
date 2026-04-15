import { readFileSync } from 'fs';
import { join } from 'path';

import { LavaXCompiler } from '../../src/compiler';
import { LavaXAssembler } from '../../src/compiler/LavaXAssembler';
import { LavaXDecompiler } from '../../src/decompiler';
import { LavaXVM } from '../../src/vm';
import { getEffectiveEntryPoint, parseLavHeader, readInstruction } from '../../src/lav/format';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function suppressVfsLogs<T>(fn: () => Promise<T> | T): Promise<T> {
  const originalLog = console.log;
  console.log = (...args: any[]) => {
    if (String(args[0] ?? '').startsWith('[VFS]')) return;
    originalLog(...args);
  };
  try {
    return await fn();
  } finally {
    console.log = originalLog;
  }
}

function collectCoverage(bin: Uint8Array) {
  const header = parseLavHeader(bin);
  const entry = getEffectiveEntryPoint(header);
  const mnemonics = new Set<string>();
  const syscalls = new Set<string>();

  for (let offset = entry; offset < bin.length;) {
    const ins = readInstruction(bin, offset);
    mnemonics.add(ins.mnemonic);
    if (ins.opcode >= 0x80 && ins.mnemonic !== 'DB') {
      syscalls.add(ins.mnemonic);
    }
    offset += Math.max(ins.length, 1);
  }

  return { mnemonics, syscalls };
}

async function runVm(bin: Uint8Array) {
  const vm = new LavaXVM();

  try {
    const fontPath = join(process.cwd(), 'public', 'fonts.dat');
    const fontData = readFileSync(fontPath);
    vm.setInternalFontData(new Uint8Array(fontData.buffer, fontData.byteOffset, fontData.byteLength));
  } catch {
    // Headless verification can still proceed without font data.
  }

  vm.load(bin);
  vm.keyBuffer.push(65, 66, 67);
  vm.currentKeyDown = 23;

  const timeoutMs = 2500;
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    vm.stop();
  }, timeoutMs);

  await vm.run();
  clearTimeout(timeout);

  assert(!timedOut, `VM timed out after ${timeoutMs}ms`);

  const report = vm.vfs.getFile('/LavaData/vm_report.txt');
  assert(report, 'vm_report.txt was not produced');

  return {
    vm,
    reportText: new TextDecoder().decode(report),
  };
}

function assertReport(reportText: string) {
  const lines = reportText.trim().split('\n');
  assert(lines[0] === 'START', 'report must start with START');
  assert(lines.some(line => line.startsWith('AR:')), 'report missing arithmetic section');
  assert(lines.some(line => line.startsWith('STR:')), 'report missing string section');
  assert(lines.some(line => line.includes('Secret')), 'report missing Secret/XOR section');
  assert(lines.some(line => line.startsWith('FILE:')), 'report missing file section');
  assert(lines.some(line => line.startsWith('FILEC:')), 'report missing file-char section');
  assert(lines.some(line => line.startsWith('DEL:')), 'report missing delete-file section');
  assert(lines.some(line => line.startsWith('DIR:')), 'report missing directory section');
  assert(lines.some(line => line.startsWith('GRAPH:')), 'report missing graphics section');
  assert(lines.some(line => line.startsWith('IN:65:66:67:23:')), 'report missing deterministic input section');
  assert(lines.some(line => line.startsWith('MATH:346:130:1024:-1024:')), 'report missing math/rng/trig section');
  assert(lines[lines.length - 1] === 'DONE', 'report must end with DONE');
}

async function main() {
  const sourcePath = join(process.cwd(), 'examples', 'docs_vm_stress.c');
  const source = readFileSync(sourcePath, 'utf8');

  const compiler = new LavaXCompiler();
  const assembler = new LavaXAssembler();
  const decompiler = new LavaXDecompiler();

  const asm = compiler.compile(source);
  assert(!asm.startsWith('ERROR'), `source compile failed:\n${asm}`);
  const bin = assembler.assemble(asm);
  const coverage = collectCoverage(bin);

  const requiredMnemonics = [
    'CALL', 'RET', 'STORE', 'LD_IND', 'NOT', 'NEG', 'L_NOT', 'AND', 'OR', 'XOR',
    'SHL_C', 'SHR_C', 'EQ_C', 'LT_C', 'GT', 'JZ', 'JNZ', 'PUSH_STR',
  ];
  const requiredSyscalls = [
    'MakeDir', 'fopen', 'fwrite', 'rewind', 'fread', 'ftell', 'feof', 'getc', 'DeleteFile',
    'opendir', 'readdir', 'rewinddir', 'closedir',
    'SetScreen', 'ClearScreen', 'Point', 'Line', 'Rectangle', 'Box', 'Circle', 'Ellipse',
    'Block', 'WriteBlock', 'GetBlock', 'FillArea', 'XDraw', 'Refresh',
    'SetGraphMode', 'SetPalette', 'SetBgColor', 'SetFgColor', 'TextOut',
    'Delay', 'Getms', 'GetTime', 'getchar', 'Inkey', 'GetWord', 'CheckKey', 'ReleaseKey',
    'srand', 'rand', 'Sin', 'Cos', 'abs',
    'sprintf', 'strlen', 'strcpy', 'strcat', 'strcmp', 'strchr', 'memset', 'memcpy', 'memmove', 'Secret', 'exit',
  ];

  for (const mnemonic of requiredMnemonics) {
    assert(coverage.mnemonics.has(mnemonic), `compiled stress program is missing opcode coverage for ${mnemonic}`);
  }
  for (const syscall of requiredSyscalls) {
    assert(coverage.syscalls.has(syscall), `compiled stress program is missing syscall coverage for ${syscall}`);
  }

  const originalRun = await suppressVfsLogs(() => runVm(bin));
  assertReport(originalRun.reportText);

  const decompiled = decompiler.decompile(bin);
  assert(decompiled.length > 0, 'decompile output was empty');

  const roundtripAsm = compiler.compile(decompiled);
  assert(!roundtripAsm.startsWith('ERROR'), `roundtrip compile failed:\n${roundtripAsm}`);
  const roundtripBin = assembler.assemble(roundtripAsm);
  const roundtripRun = await suppressVfsLogs(() => runVm(roundtripBin));
  assertReport(roundtripRun.reportText);

  console.log(
    `PASS: docs_vm_stress compile/decompile/run succeeded. ` +
    `Opcodes=${coverage.mnemonics.size}, Syscalls=${coverage.syscalls.size}, ` +
    `reportLines=${originalRun.reportText.trim().split('\n').length}.`,
  );
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
