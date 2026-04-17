import fs from 'fs';

import { parseLavHeader } from '../../src/lav/format';
import {
  assert,
  createDiagnosticVm,
  runVmBounded,
} from './vm_diagnostic_utils';

async function main() {
  const lavPath = `${process.cwd()}/examples/shenzhou/神州.lav`;
  const lavBytes = fs.readFileSync(lavPath);
  const lavProgram = new Uint8Array(lavBytes.buffer, lavBytes.byteOffset, lavBytes.byteLength);
  const header = parseLavHeader(lavProgram);

  assert(header.entryPointField === 0x050a00, `expected 神州.lav header bytes 0x08..0x0A to equal 0x050a00, got 0x${header.entryPointField.toString(16)}`);

  const vm = createDiagnosticVm();
  vm.load(lavProgram);

  const startupPc = (vm as any).pc as number;
  assert(startupPc === 0x10, `real .lav runtime must start at 0x10, not header-derived 0x${startupPc.toString(16)}`);

  const result = await runVmBounded(vm, {
    lavPath,
    timeoutMs: 1200,
    autoKeyDelayMs: 100,
  });

  assert(result.startupPc === 0x10, `bounded runner startup PC drifted to 0x${result.startupPc?.toString(16) ?? 'n/a'}`);
  assert(result.status !== 'finished' || result.durationMs > 50, `神州.lav should no longer silently finish immediately after startup; duration=${result.durationMs}ms status=${result.status}`);
  assert(result.status !== 'timeout-stopped' || result.lastPc !== 0x050a00, 'bounded runner still appears to execute from the bogus header-derived PC');
  assert(result.syscallTrace.some(entry => entry.includes('fread')), 'expected staged sibling LavaData assets to let 神州.lav read game data');
  assert(result.syscallTrace.some(entry => entry.includes('WriteBlock')), 'expected 神州.lav to progress far enough to render a resource-backed frame');

  console.log(`PASS: 神州.lav startup stays at 0x10 with bounded diagnostics. status=${result.status} duration=${result.durationMs}ms finalPc=${result.finalPc === null ? 'n/a' : `0x${result.finalPc.toString(16)}`}`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
