import { Op, SystemOp } from '../../src/types';
import {
  assert,
  createDiagnosticVm,
  makeProgram,
  runVmBounded,
} from './vm_diagnostic_utils';

function requireContract(vm: ReturnType<typeof createDiagnosticVm>) {
  const anyVm = vm as any;
  assert(typeof anyVm.pause === 'function', 'VM must expose pause(reason) for watchdog diagnostics');
  assert(typeof anyVm.resume === 'function', 'VM must expose resume() for paused recovery');

  const lifecycleState = anyVm.lifecycleState ?? anyVm.runningState ?? anyVm.state ?? anyVm.status;
  assert(typeof lifecycleState === 'string', 'VM must expose a lifecycle state string for diagnostics');
}

async function verifyWatchdogPause() {
  const vm = createDiagnosticVm();
  requireContract(vm);

  const program = makeProgram([
    Op.JMP, 0x10, 0x00, 0x00,
  ]);

  const result = await runVmBounded(vm, {
    program,
    timeoutMs: 1500,
    pollMs: 10,
  });

  assert(result.status === 'paused', `watchdog runaway loop must pause, got ${result.status}`);
  assert(result.durationMs < 1500, `watchdog pause must return control before timeout budget, took ${result.durationMs}ms`);
  assert(result.pauseSnapshot, 'watchdog pause must preserve a pause snapshot');
  const reason = result.pauseSnapshot?.reason;
  const reasonMessage = typeof reason === 'object' ? reason?.message : reason;
  assert(typeof reasonMessage === 'string' && reasonMessage.length > 0, 'pause snapshot must include a reason');
  assert(typeof result.pauseSnapshot?.pc === 'number', 'pause snapshot must include pc');
  assert(typeof result.pauseSnapshot?.sp === 'number', 'pause snapshot must include sp');

  const immutableCopy = JSON.parse(JSON.stringify(result.pauseSnapshot));
  if (result.pauseSnapshot && typeof result.pauseSnapshot === 'object') {
    (result.pauseSnapshot as any).reason = 'mutated-by-test';
  }
  assert(immutableCopy.reason !== 'mutated-by-test', 'pause snapshot returned to diagnostics must be immutable/copy-safe');
}

async function verifyBusySlicesYieldViaAnimationFrameWhenAvailable() {
  const vm = createDiagnosticVm();
  requireContract(vm);

  const originalRaf = (globalThis as { requestAnimationFrame?: (cb: () => void) => unknown }).requestAnimationFrame;
  let rafCalls = 0;
  (globalThis as { requestAnimationFrame?: (cb: () => void) => unknown }).requestAnimationFrame = (cb: () => void) => {
    rafCalls++;
    return setTimeout(cb, 0);
  };

  try {
    const program = makeProgram([
      Op.JMP, 0x10, 0x00, 0x00,
    ]);

    const result = await runVmBounded(vm, {
      program,
      timeoutMs: 1500,
      pollMs: 10,
    });

    assert(result.status === 'paused', `busy-loop regression must still pause, got ${result.status}`);
    assert(rafCalls > 0, 'busy slices should yield through requestAnimationFrame when the host provides it');
  } finally {
    (globalThis as { requestAnimationFrame?: (cb: () => void) => unknown }).requestAnimationFrame = originalRaf;
  }
}

async function verifyWaitingDoesNotFalsePause() {
  const vm = createDiagnosticVm();
  requireContract(vm);

  const program = makeProgram([
    SystemOp.getchar,
    Op.EXIT,
  ]);

  const result = await runVmBounded(vm, {
    program,
    timeoutMs: 1200,
    autoKeyDelayMs: 80,
  });

  assert(result.waitingObserved, 'waiting-state sample must observe waiting before key injection');
  assert(result.status === 'finished', `legitimate waiting should resume and finish, got ${result.status}`);
  const waitingPauseReason = result.pauseSnapshot?.reason;
  const waitingReason = typeof waitingPauseReason === 'object' ? waitingPauseReason?.kind : waitingPauseReason;
  assert(waitingReason !== 'watchdog_budget_exceeded' && waitingReason !== 'watchdog', 'legitimate waiting must not be misclassified as watchdog pause');
}

async function verifyEmptyInkeyPollingRequestsHostYield() {
  const vm = createDiagnosticVm();
  requireContract(vm);

  const requested: number[] = [];
  const originalRequestHostYield = (vm as any).requestHostYield?.bind(vm);
  (vm as any).requestHostYield = (ms: number) => {
    requested.push(ms);
    return originalRequestHostYield?.(ms);
  };

  const program = makeProgram([
    SystemOp.Inkey,
    Op.POP,
    SystemOp.Getms,
    Op.POP,
    Op.JMP, 0x10, 0x00, 0x00,
  ]);

  const result = await runVmBounded(vm, {
    program,
    timeoutMs: 1500,
    pollMs: 10,
  });

  assert(result.status === 'paused', `empty Inkey/Getms loop must still pause eventually, got ${result.status}`);
  assert(requested.some(ms => ms >= 8), 'empty input polling should request host-yield pacing before the watchdog fires');
}

async function main() {
  await verifyWatchdogPause();
  await verifyBusySlicesYieldViaAnimationFrameWhenAvailable();
  await verifyWaitingDoesNotFalsePause();
  await verifyEmptyInkeyPollingRequestsHostYield();
  console.log('PASS: watchdog pause contract and waiting exclusion regressions verified.');
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
