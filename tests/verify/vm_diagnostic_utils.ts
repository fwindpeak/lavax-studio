import fs from 'fs';
import path from 'path';

import { LavaXVM } from '../../src/vm';
import { LocalStorageDriver } from '../../src/vm/VFSStorageDriver';
import { SystemOp } from '../../src/types';

export function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function makeProgram(code: number[]): Uint8Array {
  return new Uint8Array([
    0x4c, 0x41, 0x56, 0x12,
    0x00, 0x00, 0x00, 0x00,
    0x10, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    ...code,
  ]);
}

export type VmStatus = 'finished' | 'paused' | 'faulted' | 'timeout-stopped' | 'stopped';

export interface DiagnosticSnapshot {
  reason?: string | { kind?: string | null; message?: string | null } | null;
  timestamp?: number | string;
  pc?: number;
  sp?: number;
  base?: number;
  base2?: number;
  currentOpcode?: number | string;
  lastOpcode?: number | string;
  runningState?: string;
  stack?: number[];
  recentLogs?: string[];
  counters?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface BoundedRunResult {
  status: VmStatus;
  durationMs: number;
  startupPc: number | null;
  startupOpcode: number | null;
  lastPc: number | null;
  lastOpcode: number | null;
  finalPc: number | null;
  finalSp: number | null;
  lifecycleState: string;
  waitingObserved: boolean;
  timeoutTriggered: boolean;
  pauseSnapshot: DiagnosticSnapshot | null;
  recentLogs: string[];
  syscallTrace: string[];
  vfsTrace: string[];
  errorMessage: string | null;
}

function tryReadFont(vm: LavaXVM) {
  try {
    const fontPath = path.join(process.cwd(), 'public', 'fonts.dat');
    const fontData = fs.readFileSync(fontPath);
    vm.setInternalFontData(new Uint8Array(fontData.buffer, fontData.byteOffset, fontData.byteLength));
  } catch {
    // Headless diagnostics can proceed without a font.
  }
}

export function createDiagnosticVm() {
  const vm = new LavaXVM(new LocalStorageDriver());
  tryReadFont(vm);
  return vm;
}

async function preloadSiblingLavaData(vm: LavaXVM, lavPath?: string) {
  if (!lavPath) return 0;
  await vm.vfs.ready;

  const resolvedLavPath = path.isAbsolute(lavPath) ? lavPath : path.join(process.cwd(), lavPath);
  const siblingLavaData = path.join(path.dirname(resolvedLavPath), 'LavaData');
  if (!fs.existsSync(siblingLavaData) || !fs.statSync(siblingLavaData).isDirectory()) {
    return 0;
  }

  vm.vfs.mkdir('/LavaData');
  let stagedCount = 0;
  for (const entry of fs.readdirSync(siblingLavaData, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const assetPath = path.join(siblingLavaData, entry.name);
    const data = fs.readFileSync(assetPath);
    vm.vfs.addFile(`/LavaData/${entry.name}`, new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
    stagedCount++;
  }
  return stagedCount;
}

function getNumber(vm: LavaXVM, key: string): number | null {
  const value = (vm as any)[key];
  return typeof value === 'number' ? value : null;
}

function maybeLifecycleState(vm: LavaXVM): string {
  const anyVm = vm as any;
  const candidate = anyVm.lifecycleState ?? anyVm.runningState ?? anyVm.state ?? anyVm.status;
  if (typeof candidate === 'string' && candidate.length > 0) {
    return candidate;
  }
  if (anyVm.resolveKeySignal) {
    return 'waiting';
  }
  if (vm.running) {
    return 'running';
  }
  return 'stopped';
}

function cloneSnapshot(snapshot: unknown): DiagnosticSnapshot | null {
  if (!snapshot || typeof snapshot !== 'object') {
    return null;
  }
  return JSON.parse(JSON.stringify(snapshot));
}

function maybePauseSnapshot(vm: LavaXVM, recentLogs: string[]): DiagnosticSnapshot | null {
  const anyVm = vm as any;
  const snapshot = (typeof anyVm.getPauseSnapshot === 'function' ? anyVm.getPauseSnapshot() : null)
    ?? anyVm.pauseSnapshot
    ?? anyVm.lastPauseSnapshot
    ?? anyVm.snapshot
    ?? anyVm.lastSnapshot;

  const cloned = cloneSnapshot(snapshot);
  if (cloned) {
    return cloned;
  }

  if (maybeLifecycleState(vm) !== 'paused') {
    return null;
  }

  return {
    reason: typeof anyVm.pauseReason === 'string' ? anyVm.pauseReason : undefined,
    timestamp: Date.now(),
    pc: getNumber(vm, 'pc') ?? undefined,
    sp: getNumber(vm, 'sp') ?? undefined,
    base: getNumber(vm, 'base') ?? undefined,
    base2: getNumber(vm, 'base2') ?? undefined,
    currentOpcode: typeof anyVm.currentOpcode === 'number' ? anyVm.currentOpcode : undefined,
    lastOpcode: typeof anyVm.lastOpcode === 'number' ? anyVm.lastOpcode : undefined,
    runningState: maybeLifecycleState(vm),
    recentLogs: recentLogs.slice(-20),
  };
}

function wrapMethod<T extends object, K extends keyof T & string>(obj: T, key: K, wrapper: (original: any) => any) {
  const original = (obj as any)[key];
  if (typeof original !== 'function') {
    return () => {};
  }
  (obj as any)[key] = wrapper(original.bind(obj));
  return () => {
    (obj as any)[key] = original;
  };
}

function renderTraceArg(value: unknown): string {
  if (value instanceof Uint8Array) {
    return `Uint8Array(len=${value.length})`;
  }
  if (ArrayBuffer.isView(value)) {
    const viewWithLength = value as ArrayBufferView & { length?: number };
    return `${value.constructor.name}(len=${viewWithLength.length ?? value.byteLength ?? 'n/a'})`;
  }
  if (typeof value === 'string') {
    return JSON.stringify(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function installVmTracing(vm: LavaXVM, limits: { maxLogs?: number; maxEvents?: number } = {}) {
  const maxLogs = limits.maxLogs ?? 120;
  const maxEvents = limits.maxEvents ?? 80;
  const logs: string[] = [];
  const syscallTrace: string[] = [];
  const vfsTrace: string[] = [];
  let lastPc: number | null = null;
  let lastOpcode: number | null = null;

  const cleanup: Array<() => void> = [];

  const originalOnLog = vm.onLog;
  vm.onLog = (message: string) => {
    if (logs.length < maxLogs) {
      logs.push(String(message));
    }
  };
  cleanup.push(() => {
    vm.onLog = originalOnLog;
  });

  cleanup.push(wrapMethod(vm as any, 'stepSync', (original: () => void) => () => {
    lastPc = getNumber(vm, 'pc');
    const fd = (vm as any).fd as Uint8Array | undefined;
    lastOpcode = fd && lastPc !== null && lastPc >= 0 && lastPc < fd.length ? fd[lastPc] : null;
    return original();
  }));

  cleanup.push(wrapMethod(vm.syscall as any, 'handleSync', (original: (opcode: number) => unknown) => (opcode: number) => {
    if (syscallTrace.length < maxEvents) {
      const pc = getNumber(vm, 'pc');
      const name = SystemOp[opcode as any] ?? `0x${opcode.toString(16)}`;
      syscallTrace.push(`pc=${pc === null ? 'n/a' : `0x${pc.toString(16)}`} syscall=${name}`);
    }
    return original(opcode);
  }));

  const vfsMethods = ['resolvePath', 'getFile', 'addFile', 'deleteFile', 'mkdir', 'chdir', 'opendir', 'readdir', 'openFile', 'closeFile', 'writeHandleData'] as const;
  for (const method of vfsMethods) {
    cleanup.push(wrapMethod(vm.vfs as any, method as any, (original: (...args: any[]) => unknown) => (...args: any[]) => {
      if (vfsTrace.length < maxEvents) {
        const renderedArgs = args.map(renderTraceArg).join(', ');
        vfsTrace.push(`${method}(${renderedArgs})`);
      }
      return original(...args);
    }));
  }

  return {
    logs,
    syscallTrace,
    vfsTrace,
    getLastPc: () => lastPc,
    getLastOpcode: () => lastOpcode,
    cleanup: () => cleanup.reverse().forEach(fn => fn()),
  };
}

export interface BoundedRunOptions {
  lavPath?: string;
  program?: Uint8Array;
  timeoutMs?: number;
  pollMs?: number;
  autoKeyCode?: number;
  autoKeyDelayMs?: number;
  maxLogs?: number;
  maxEvents?: number;
}

export async function runVmBounded(vm: LavaXVM, options: BoundedRunOptions): Promise<BoundedRunResult> {
  const timeoutMs = options.timeoutMs ?? 1500;
  const pollMs = options.pollMs ?? 10;
  const autoKeyCode = options.autoKeyCode ?? 0x1b;
  const autoKeyDelayMs = options.autoKeyDelayMs ?? 120;

  const trace = installVmTracing(vm, { maxLogs: options.maxLogs, maxEvents: options.maxEvents });
  try {
    let program = options.program;
    if (!program && options.lavPath) {
      const filePath = path.isAbsolute(options.lavPath) ? options.lavPath : path.join(process.cwd(), options.lavPath);
      const buf = fs.readFileSync(filePath);
      program = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    assert(program, 'runVmBounded requires either a program or lavPath');

    await preloadSiblingLavaData(vm, options.lavPath);

    vm.load(program);

    const startupPc = getNumber(vm, 'pc');
    const startupOpcode = startupPc !== null && startupPc < program.length ? program[startupPc] : null;
    const startedAt = Date.now();

    let settled = false;
    let errorMessage: string | null = null;
    let timeoutTriggered = false;
    let waitingObserved = false;
    let detectedPauseSnapshot: DiagnosticSnapshot | null = null;
    let detectedStatus: VmStatus | null = null;

    const runPromise = vm.run()
      .catch((error: Error) => {
        errorMessage = error.message;
      })
      .finally(() => {
        settled = true;
      });

    while (!settled && Date.now() - startedAt < timeoutMs) {
      const state = maybeLifecycleState(vm);
      if (state === 'waiting') {
        waitingObserved = true;
        if (Date.now() - startedAt >= autoKeyDelayMs) {
          vm.pushKey(autoKeyCode);
        }
      }
      if (state === 'paused') {
        detectedPauseSnapshot = maybePauseSnapshot(vm, trace.logs);
        detectedStatus = 'paused';
        vm.stop();
      } else if (state === 'faulted') {
        detectedStatus = 'faulted';
        vm.stop();
      }
      await sleep(pollMs);
    }

    if (!settled) {
      timeoutTriggered = true;
      vm.stop();
    }

    await Promise.race([
      runPromise,
      sleep(200),
    ]);

    const lifecycleState = maybeLifecycleState(vm);
    const pauseSnapshot = detectedPauseSnapshot ?? maybePauseSnapshot(vm, trace.logs);
    const status: VmStatus = detectedStatus
      ?? (errorMessage ? 'faulted' : timeoutTriggered ? 'timeout-stopped' : lifecycleState === 'paused' ? 'paused' : vm.running ? 'stopped' : 'finished');

    return {
      status,
      durationMs: Date.now() - startedAt,
      startupPc,
      startupOpcode,
      lastPc: trace.getLastPc(),
      lastOpcode: trace.getLastOpcode(),
      finalPc: getNumber(vm, 'pc'),
      finalSp: getNumber(vm, 'sp'),
      lifecycleState,
      waitingObserved,
      timeoutTriggered,
      pauseSnapshot,
      recentLogs: trace.logs,
      syscallTrace: trace.syscallTrace,
      vfsTrace: trace.vfsTrace,
      errorMessage,
    };
  } finally {
    trace.cleanup();
  }
}

export function formatSummary(result: BoundedRunResult) {
  const pause = result.pauseSnapshot;
  const pauseReason = pause?.reason;
  const pauseSummary = pause ? {
    reason: (typeof pauseReason === 'object' ? pauseReason?.message : pauseReason) ?? null,
    reasonKind: (typeof pauseReason === 'object' ? pauseReason?.kind : null) ?? null,
    pc: pause.pc ?? null,
    sp: pause.sp ?? null,
    base: pause.base ?? null,
    base2: pause.base2 ?? null,
    currentOpcode: pause.currentOpcode ?? pause.lastOpcode ?? null,
  } : null;

  return {
    status: result.status,
    durationMs: result.durationMs,
    startup: {
      pc: result.startupPc,
      opcode: result.startupOpcode,
    },
    final: {
      pc: result.finalPc,
      sp: result.finalSp,
      lifecycleState: result.lifecycleState,
      waitingObserved: result.waitingObserved,
      timeoutTriggered: result.timeoutTriggered,
    },
    pause: pauseSummary,
    errorMessage: result.errorMessage,
    syscallTrace: result.syscallTrace,
    vfsTrace: result.vfsTrace,
    recentLogs: result.recentLogs,
  };
}
