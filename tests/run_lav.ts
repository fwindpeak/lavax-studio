/**
 * Run a real .lav file with bounded diagnostics.
 *
 * Example:
 *   bun tests/run_lav.ts examples/shenzhou/神州.lav --timeout-ms=2000 --json
 */
import path from 'path';

import {
  createDiagnosticVm,
  formatSummary,
  runVmBounded,
} from './verify/vm_diagnostic_utils';

interface CliOptions {
  lavPath: string;
  timeoutMs: number;
  autoKeyDelayMs: number;
  json: boolean;
}

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    lavPath: 'docs/ref_prjs/编译器/资料/通过/1.lav',
    timeoutMs: 2500,
    autoKeyDelayMs: 120,
    json: false,
  };

  for (const arg of argv) {
    if (arg === '--json') {
      opts.json = true;
      continue;
    }
    if (arg.startsWith('--timeout-ms=')) {
      opts.timeoutMs = Number(arg.slice('--timeout-ms='.length)) || opts.timeoutMs;
      continue;
    }
    if (arg.startsWith('--auto-key-delay-ms=')) {
      opts.autoKeyDelayMs = Number(arg.slice('--auto-key-delay-ms='.length)) || opts.autoKeyDelayMs;
      continue;
    }
    if (!arg.startsWith('--')) {
      opts.lavPath = arg;
    }
  }

  return opts;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const vm = createDiagnosticVm();

  const result = await runVmBounded(vm, {
    lavPath: options.lavPath,
    timeoutMs: options.timeoutMs,
    autoKeyDelayMs: options.autoKeyDelayMs,
    maxLogs: 120,
    maxEvents: 80,
  });

  const summary = formatSummary(result);
  const resolvedPath = path.isAbsolute(options.lavPath)
    ? options.lavPath
    : path.join(process.cwd(), options.lavPath);

  if (options.json) {
    console.log(JSON.stringify({ lavPath: resolvedPath, ...summary }, null, 2));
  } else {
    console.log(`Running: ${options.lavPath}`);
    console.log(`Bounded diagnostic status: ${summary.status}`);
    console.log(`Duration: ${summary.durationMs}ms`);
    console.log(`Startup PC: ${summary.startup.pc === null ? 'n/a' : `0x${summary.startup.pc.toString(16)}`}`);
    console.log(`Final PC: ${summary.final.pc === null ? 'n/a' : `0x${summary.final.pc.toString(16)}`}`);
    console.log(`Lifecycle: ${summary.final.lifecycleState}`);
    if (summary.pause) {
      console.log(`Pause provenance: reason=${summary.pause.reason ?? 'n/a'} pc=${summary.pause.pc === null ? 'n/a' : `0x${summary.pause.pc.toString(16)}`}`);
    }
    if (summary.errorMessage) {
      console.log(`Fault provenance: ${summary.errorMessage}`);
    }
    console.log('--- syscall trace checkpoints ---');
    for (const line of summary.syscallTrace.slice(0, 20)) {
      console.log(line);
    }
    console.log('--- VFS diagnostics ---');
    for (const line of summary.vfsTrace.slice(0, 20)) {
      console.log(line);
    }
    console.log('--- recent logs ---');
    for (const line of summary.recentLogs.slice(-20)) {
      console.log(line);
    }
  }

  const acceptableIntermediate = summary.status === 'paused' || summary.status === 'faulted';
  const acceptableProgress = summary.status === 'finished' && summary.startup.pc === 0x10;
  if (!acceptableIntermediate && !acceptableProgress) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
