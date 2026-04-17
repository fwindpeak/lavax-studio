import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LavaXVM } from '../vm';
import { LavaXCompiler } from '../compiler';
import { LavaXAssembler } from '../compiler/LavaXAssembler';
import type { LavaVmWorkerEvent, LavaVmWorkerRequest, RuntimeFilePayload } from '../workers/lavaVmRuntimeProtocol';

export type VmLifecycleState = 'idle' | 'running' | 'waiting' | 'paused' | 'faulted' | 'stopped';

export interface VmPauseDiagnostics {
    reason: string;
    message?: string;
    details?: string;
    pc?: number;
    sp?: number;
    base?: number;
    opcode?: number;
    raw?: unknown;
}

interface VmLifecycleSnapshot {
    reason?: string | { kind?: string; message?: string };
    message?: string;
    details?: string;
    pc?: number;
    sp?: number;
    base?: number;
    opcode?: number;
}

const ACTIVE_VM_STATES = new Set<VmLifecycleState>(['running', 'waiting', 'paused']);
const INPUT_READY_STATES = new Set<VmLifecycleState>(['running', 'waiting']);

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const normalizeLifecycleState = (value: unknown): VmLifecycleState | null => {
    if (typeof value !== 'string') return null;
    switch (value.toLowerCase()) {
        case 'idle':
        case 'running':
        case 'waiting':
        case 'paused':
        case 'faulted':
        case 'stopped':
            return value.toLowerCase() as VmLifecycleState;
        default:
            return null;
    }
};

const formatLifecycleState = (value: VmLifecycleState) => value.charAt(0).toUpperCase() + value.slice(1);

const normalizeDiagnostics = (payload: unknown, fallbackReason: string): VmPauseDiagnostics => {
    if (isRecord(payload)) {
        const snapshot = payload as VmLifecycleSnapshot;
        const nestedReason = isRecord(snapshot.reason) ? snapshot.reason : null;
        const normalizedReason = typeof snapshot.reason === 'string'
            ? snapshot.reason
            : typeof nestedReason?.kind === 'string'
                ? nestedReason.kind
                : fallbackReason;
        const normalizedMessage = typeof snapshot.message === 'string'
            ? snapshot.message
            : typeof nestedReason?.message === 'string'
                ? nestedReason.message
                : undefined;
        return {
            reason: normalizedReason,
            message: normalizedMessage,
            details: typeof snapshot.details === 'string' ? snapshot.details : undefined,
            pc: typeof snapshot.pc === 'number' ? snapshot.pc : undefined,
            sp: typeof snapshot.sp === 'number' ? snapshot.sp : undefined,
            base: typeof snapshot.base === 'number' ? snapshot.base : undefined,
            opcode: typeof snapshot.opcode === 'number' ? snapshot.opcode : undefined,
            raw: payload,
        };
    }

    if (typeof payload === 'string' && payload.trim()) {
        return { reason: fallbackReason, message: payload, raw: payload };
    }

    return { reason: fallbackReason, raw: payload };
};

export function useLavaVM(onLog: (msg: string) => void) {
    const [logs, setLogs] = useState<string[]>([]);
    const [screen, setScreen] = useState<ImageData | null>(null);
    const [lifecycleState, setLifecycleState] = useState<VmLifecycleState>('idle');
    const [pauseDiagnostics, setPauseDiagnostics] = useState<VmPauseDiagnostics | null>(null);

    const lifecycleRef = useRef<VmLifecycleState>('idle');
    const blockedInputStateRef = useRef<VmLifecycleState | null>(null);
    const workerRef = useRef<Worker | null>(null);
    const workerReadyRef = useRef(false);
    const workerReadyPromiseRef = useRef<Promise<void> | null>(null);
    const fontBytesRef = useRef<Uint8Array | null>(null);
    const onLogRef = useRef(onLog);

    useEffect(() => {
        onLogRef.current = onLog;
    }, [onLog]);

    const vm = useMemo(() => new LavaXVM(), []);
    const compiler = useMemo(() => new LavaXCompiler(), []);
    const assembler = useMemo(() => new LavaXAssembler(), []);

    const baseUrl = ((import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/');

    const setVmState = useCallback((next: VmLifecycleState, payload?: unknown) => {
        lifecycleRef.current = next;
        setLifecycleState(next);

        if (next === 'paused' || next === 'faulted') {
            setPauseDiagnostics(normalizeDiagnostics(payload, next));
            return;
        }

        setPauseDiagnostics(null);
    }, []);

    const inferLifecycleFromLog = useCallback((msg: string) => {
        const normalized = msg.trim().toLowerCase();

        if (normalized.includes('[vm fatal error]')) {
            setVmState('faulted', msg);
            return;
        }

        if (normalized.includes('vm paused') || normalized.includes('system: vm paused') || normalized.includes('watchdog pause')) {
            setVmState('paused', msg);
            return;
        }

        if (normalized.includes('vm waiting') || normalized.includes('waiting for key') || normalized.includes('system: vm waiting')) {
            setVmState('waiting');
            return;
        }

        if (normalized.includes('vm resumed') || normalized.includes('system: vm resumed') || normalized.includes('system: vm started')) {
            setVmState('running');
            return;
        }

        if (normalized.includes('system: vm stopped')) {
            if (lifecycleRef.current !== 'faulted') {
                setVmState('stopped');
            }
        }
    }, [setVmState]);

    const log = useCallback((msg: string) => {
        setLogs(prev => [...prev.slice(-99), msg]);
        inferLifecycleFromLog(msg);
        if (msg.includes('Error') || msg.includes('FATAL') || msg.includes('Warning')) {
            console.error(msg);
        } else {
            console.log(msg);
        }
        onLogRef.current(msg);
    }, [inferLifecycleFromLog]);

    const snapshotRuntimeFiles = useCallback(async (sourcePath?: string) => {
        await vm.vfs.ready;
        const runtimeFiles = new Map<string, Uint8Array>();

        for (const file of vm.vfs.getFiles()) {
            const data = vm.vfs.getFile(file.path);
            if (!data) continue;
            runtimeFiles.set(file.path, new Uint8Array(data));
        }

        let stagedCount = 0;
        if (sourcePath && sourcePath.includes('/')) {
            const sourceDir = sourcePath.slice(0, sourcePath.lastIndexOf('/')) || '/';
            const siblingLavaDataPrefix = `${sourceDir === '/' ? '' : sourceDir}/LavaData/`;
            for (const [path, data] of runtimeFiles.entries()) {
                if (!path.startsWith(siblingLavaDataPrefix)) continue;
                const relativePath = path.slice(siblingLavaDataPrefix.length);
                if (!relativePath) continue;
                runtimeFiles.set(`/LavaData/${relativePath}`, new Uint8Array(data));
                stagedCount++;
            }
            if (stagedCount > 0) {
                log(`System: Staged ${stagedCount} runtime asset${stagedCount === 1 ? '' : 's'} from ${siblingLavaDataPrefix} into /LavaData.`);
            }
        }

        return Array.from(runtimeFiles.entries()).map<RuntimeFilePayload>(([path, data]) => ({
            path,
            data: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
        }));
    }, [vm, log]);

    const handleWorkerEvent = useCallback((event: MessageEvent<LavaVmWorkerEvent>) => {
        const message = event.data;
        switch (message.type) {
            case 'ready':
                workerReadyRef.current = true;
                return;
            case 'log':
                log(message.message);
                return;
            case 'screen': {
                const rgba = new Uint8ClampedArray(message.data);
                setScreen(new ImageData(rgba, message.width, message.height));
                return;
            }
            case 'lifecycle': {
                const normalized = normalizeLifecycleState(message.state);
                if (normalized) {
                    setVmState(normalized, message.payload);
                }
                return;
            }
            case 'finished':
                if (lifecycleRef.current !== 'faulted') {
                    setVmState('stopped');
                }
                return;
            case 'error':
                setVmState('faulted', message.payload ?? message.message);
                log(`[VM Worker Error] ${message.message}`);
                return;
        }
    }, [log, setVmState]);

    const ensureWorker = useCallback(() => {
        if (workerRef.current) {
            if (!workerReadyPromiseRef.current) {
                workerReadyPromiseRef.current = Promise.resolve();
            }
            return workerReadyPromiseRef.current;
        }

        workerReadyRef.current = false;
        const worker = new Worker(new URL('../workers/lavaVmWorker.ts', import.meta.url), { type: 'module' });
        worker.addEventListener('message', handleWorkerEvent);
        workerRef.current = worker;

        workerReadyPromiseRef.current = new Promise<void>((resolve) => {
            const onMessage = (event: MessageEvent<LavaVmWorkerEvent>) => {
                if (event.data.type === 'ready') {
                    worker.removeEventListener('message', onMessage);
                    workerReadyRef.current = true;
                    resolve();
                }
            };
            worker.addEventListener('message', onMessage);
        });

        const initMessage: LavaVmWorkerRequest = {
            type: 'init',
            fontData: fontBytesRef.current
                ? fontBytesRef.current.buffer.slice(
                    fontBytesRef.current.byteOffset,
                    fontBytesRef.current.byteOffset + fontBytesRef.current.byteLength,
                )
                : null,
        };
        const transfers = initMessage.fontData ? [initMessage.fontData] : [];
        worker.postMessage(initMessage, transfers);
        return workerReadyPromiseRef.current;
    }, [handleWorkerEvent]);

    useEffect(() => {
        fetch(baseUrl + 'fonts.dat')
            .then(r => r.arrayBuffer())
            .then(buf => {
                const fontBytes = new Uint8Array(buf);
                fontBytesRef.current = fontBytes;
                vm.setInternalFontData(fontBytes);
                if (workerRef.current) {
                    const fontCopy = fontBytes.buffer.slice(fontBytes.byteOffset, fontBytes.byteOffset + fontBytes.byteLength);
                    workerRef.current.postMessage({ type: 'init', fontData: fontCopy } satisfies LavaVmWorkerRequest, [fontCopy]);
                }
            })
            .catch(e => log('Error loading fonts: ' + e.message));

        return () => {
            if (workerRef.current) {
                workerRef.current.removeEventListener('message', handleWorkerEvent);
                workerRef.current.terminate();
                workerRef.current = null;
                workerReadyPromiseRef.current = null;
                workerReadyRef.current = false;
            }
        };
    }, [baseUrl, handleWorkerEvent, log, vm]);

    useEffect(() => {
        if (lifecycleState !== 'paused') {
            blockedInputStateRef.current = null;
        }
    }, [lifecycleState]);

    const compile = useCallback((code: string) => {
        log('Compiling...');
        const asm = compiler.compile(code);
        if (asm.startsWith('ERROR')) {
            log(asm);
            return { asm, bin: null };
        }
        log('Assembling...');
        try {
            const bin = assembler.assemble(asm);
            log(`Success! Binary size: ${bin.length} bytes`);
            return { asm, bin };
        } catch (e: any) {
            log('Assembly Error: ' + e.message);
            return { asm, bin: null };
        }
    }, [compiler, assembler, log]);

    const run = useCallback(async (bin: Uint8Array, sourcePath?: string) => {
        setPauseDiagnostics(null);
        const runtimeFiles = await snapshotRuntimeFiles(sourcePath);
        const worker = workerRef.current;
        await ensureWorker();
        const activeWorker = workerRef.current ?? worker;
        if (!activeWorker) {
            throw new Error('VM worker failed to initialize');
        }

        setScreen(null);
        setVmState('running');

        const programBuffer = bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength);
        const transfers: Transferable[] = [programBuffer];
        for (const file of runtimeFiles) {
            transfers.push(file.data);
        }

        activeWorker.postMessage({
            type: 'run',
            program: programBuffer,
            files: runtimeFiles,
            debug: vm.debug,
        } satisfies LavaVmWorkerRequest, transfers);
    }, [ensureWorker, snapshotRuntimeFiles, vm, setVmState]);

    const stop = useCallback(() => {
        workerRef.current?.postMessage({ type: 'stop' } satisfies LavaVmWorkerRequest);
        setVmState('stopped');
    }, [setVmState]);

    const resume = useCallback(async () => {
        if (!workerRef.current) return;
        setVmState('running');
        workerRef.current.postMessage({ type: 'resume' } satisfies LavaVmWorkerRequest);
    }, [setVmState]);

    const canAcceptInput = INPUT_READY_STATES.has(lifecycleState);
    const running = ACTIVE_VM_STATES.has(lifecycleState);
    const canResume = lifecycleState === 'paused';

    const pushKey = useCallback((code: number) => {
        if (!INPUT_READY_STATES.has(lifecycleRef.current)) {
            if (blockedInputStateRef.current !== lifecycleRef.current) {
                blockedInputStateRef.current = lifecycleRef.current;
                log(`System: Ignoring input while VM is ${formatLifecycleState(lifecycleRef.current)}.`);
            }
            return;
        }

        blockedInputStateRef.current = null;
        workerRef.current?.postMessage({ type: 'pushKey', code } satisfies LavaVmWorkerRequest);
    }, [log]);

    const releaseKey = useCallback((code: number) => {
        if (!INPUT_READY_STATES.has(lifecycleRef.current)) {
            return;
        }
        workerRef.current?.postMessage({ type: 'releaseKey', code } satisfies LavaVmWorkerRequest);
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    return {
        running,
        canAcceptInput,
        canResume,
        lifecycleState,
        pauseDiagnostics,
        logs,
        screen,
        compile,
        run,
        stop,
        resume,
        pushKey,
        releaseKey,
        vm,
        compiler,
        assembler,
        setLogs,
        clearLogs
    };
}
