import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { LavaXVM } from '../vm';
import { LavaXCompiler } from '../compiler';
import { LavaXAssembler } from '../compiler/LavaXAssembler';

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

type LifecycleVmAugment = {
    onLifecycleChange?: (state: VmLifecycleState, payload?: unknown) => void;
    onPaused?: (payload?: unknown) => void;
    onWaiting?: (payload?: unknown) => void;
    onRunning?: (payload?: unknown) => void;
    onResumed?: (payload?: unknown) => void;
    onFault?: (payload?: unknown) => void;
    lifecycleState?: string;
    state?: string;
    resume?: () => Promise<void> | void;
    getPauseSnapshot?: () => unknown;
    pauseSnapshot?: unknown;
    lastPauseSnapshot?: unknown;
};

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

    const vm = useMemo(() => new LavaXVM(), []);
    const compiler = useMemo(() => new LavaXCompiler(), []);
    const assembler = useMemo(() => new LavaXAssembler(), []);
    const lifecycleVm = vm as any as LifecycleVmAugment;

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

    const readPauseSnapshot = useCallback(() => {
        if (typeof lifecycleVm.getPauseSnapshot === 'function') {
            return lifecycleVm.getPauseSnapshot();
        }
        return lifecycleVm.pauseSnapshot ?? lifecycleVm.lastPauseSnapshot;
    }, [lifecycleVm]);

    const maybeCapturePauseSnapshot = useCallback((fallbackReason: string) => {
        const snapshot = readPauseSnapshot();
        if (snapshot !== undefined) {
            setPauseDiagnostics(normalizeDiagnostics(snapshot, fallbackReason));
        }
    }, [readPauseSnapshot]);

    const inferLifecycleFromLog = useCallback((msg: string) => {
        const normalized = msg.trim().toLowerCase();

        if (normalized.includes('[vm fatal error]')) {
            setVmState('faulted', msg);
            return;
        }

        if (normalized.includes('vm paused') || normalized.includes('system: vm paused') || normalized.includes('watchdog pause')) {
            setVmState('paused', readPauseSnapshot() ?? msg);
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
    }, [readPauseSnapshot, setVmState]);

    const log = useCallback((msg: string) => {
        setLogs(prev => [...prev.slice(-99), msg]);
        inferLifecycleFromLog(msg);
        if (msg.includes('Error') || msg.includes('FATAL') || msg.includes('Warning')) {
            console.error(msg);
        } else {
            console.log(msg);
        }
        onLog(msg);
    }, [inferLifecycleFromLog, onLog]);

    const stageRuntimeAssets = useCallback(async (sourcePath?: string) => {
        if (!sourcePath || !sourcePath.includes('/')) {
            return 0;
        }

        await vm.vfs.ready;

        const sourceDir = sourcePath.slice(0, sourcePath.lastIndexOf('/')) || '/';
        const siblingLavaDataPrefix = `${sourceDir === '/' ? '' : sourceDir}/LavaData/`;
        const files = vm.vfs.getFiles();
        const siblingAssets = files.filter(file => file.path.startsWith(siblingLavaDataPrefix));
        if (siblingAssets.length === 0) {
            return 0;
        }

        vm.vfs.mkdir('/LavaData');
        let stagedCount = 0;
        for (const asset of siblingAssets) {
            const data = vm.vfs.getFile(asset.path);
            if (!data) continue;
            const relativePath = asset.path.slice(siblingLavaDataPrefix.length);
            if (!relativePath) continue;
            const targetPath = `/LavaData/${relativePath}`;
            vm.vfs.addFile(targetPath, data);
            stagedCount++;
        }

        if (stagedCount > 0) {
            log(`System: Staged ${stagedCount} runtime asset${stagedCount === 1 ? '' : 's'} from ${siblingLavaDataPrefix} into /LavaData.`);
        }
        return stagedCount;
    }, [vm, log]);

    useEffect(() => {
        vm.onLog = log;
        vm.onUpdateScreen = setScreen;
        vm.onFinished = () => {
            if (lifecycleRef.current !== 'faulted') {
                setVmState('stopped');
            }
        };

        lifecycleVm.onLifecycleChange = (state, payload) => {
            const normalized = normalizeLifecycleState(state);
            if (normalized) {
                setVmState(normalized, payload);
            }
        };
        lifecycleVm.onPaused = (payload) => setVmState('paused', payload);
        lifecycleVm.onWaiting = (payload) => setVmState('waiting', payload);
        lifecycleVm.onRunning = () => setVmState('running');
        lifecycleVm.onResumed = () => setVmState('running');
        lifecycleVm.onFault = (payload) => setVmState('faulted', payload);

        const initialState = normalizeLifecycleState(lifecycleVm.lifecycleState ?? lifecycleVm.state);
        if (initialState) {
            setVmState(initialState, readPauseSnapshot());
        }

        fetch(baseUrl + 'fonts.dat')
            .then(r => r.arrayBuffer())
            .then(buf => vm.setInternalFontData(new Uint8Array(buf)))
            .catch(e => log('Error loading fonts: ' + e.message));
    }, [baseUrl, lifecycleVm, vm, log, readPauseSnapshot, setVmState]);

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
        setVmState('running');
        await stageRuntimeAssets(sourcePath);
        vm.load(bin);
        await vm.run();
    }, [vm, setVmState, stageRuntimeAssets]);

    const stop = useCallback(() => {
        vm.stop();
        setVmState('stopped');
    }, [vm, setVmState]);

    const resume = useCallback(async () => {
        if (typeof lifecycleVm.resume !== 'function') {
            log('Warning: Resume requested, but this VM build does not expose resume().');
            return;
        }

        maybeCapturePauseSnapshot('paused');
        setVmState('running');
        await lifecycleVm.resume();
    }, [lifecycleVm, log, maybeCapturePauseSnapshot, setVmState]);

    const canAcceptInput = INPUT_READY_STATES.has(lifecycleState);
    const running = ACTIVE_VM_STATES.has(lifecycleState);
    const canResume = lifecycleState === 'paused' && typeof lifecycleVm.resume === 'function';

    const pushKey = useCallback((code: number) => {
        if (!INPUT_READY_STATES.has(lifecycleRef.current)) {
            if (blockedInputStateRef.current !== lifecycleRef.current) {
                blockedInputStateRef.current = lifecycleRef.current;
                log(`System: Ignoring input while VM is ${formatLifecycleState(lifecycleRef.current)}.`);
            }
            return;
        }

        blockedInputStateRef.current = null;
        vm.pushKey(code);
    }, [vm, log]);

    const releaseKey = useCallback((code: number) => {
        if (!INPUT_READY_STATES.has(lifecycleRef.current)) {
            return;
        }
        vm.releaseKey(code);
    }, [vm]);

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
