import React, { useEffect, useMemo, useRef } from 'react';
import { Monitor, PauseCircle, Play, Square, Trash2 } from 'lucide-react';
import { SoftKeyboard, getKeyCode } from './SoftKeyboard';
import { useI18n } from '../i18n';
import type { VmLifecycleState, VmPauseDiagnostics } from '../hooks/useLavaVM';

interface DeviceProps {
    screen: ImageData | null;
    onKeyPress: (code: number) => void;
    onKeyRelease?: (code: number) => void;
    onStop: () => void;
    onResume: () => void;
    isRunning: boolean;
    canResume: boolean;
    canAcceptInput: boolean;
    lifecycleState: VmLifecycleState;
    pauseDiagnostics: VmPauseDiagnostics | null;
}

const PHYSICAL_KEY_MAP: Record<string, string> = {
    'ArrowUp': '↑',
    'ArrowDown': '↓',
    'ArrowLeft': '←',
    'ArrowRight': '→',
    'Enter': '↵',
    'Escape': 'ESC',
    'PageUp': '⇈',
    'PageDown': '⇊',
    ' ': 'SPACE',
    'Shift': 'SHIFT',
    'CapsLock': 'CAPS',
    'Alt': 'HELP',
    'Control': 'SHIFT',
};

export const Device: React.FC<DeviceProps> = ({
    screen,
    onKeyPress,
    onKeyRelease,
    onStop,
    onResume,
    isRunning,
    canResume,
    canAcceptInput,
    lifecycleState,
    pauseDiagnostics,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const { t } = useI18n();

    const statusLabel = useMemo(() => {
        switch (lifecycleState) {
            case 'running':
                return t('systemRunning');
            case 'waiting':
                return t('systemWaiting');
            case 'paused':
                return t('systemPaused');
            case 'faulted':
                return t('systemFaulted');
            case 'stopped':
                return t('systemStopped');
            default:
                return t('systemIdle');
        }
    }, [lifecycleState, t]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!canAcceptInput) return;

            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                return;
            }

            let key = e.key;
            if (PHYSICAL_KEY_MAP[key]) {
                key = PHYSICAL_KEY_MAP[key];
            }

            const code = getKeyCode(key);
            if (code !== null) {
                e.preventDefault();
                onKeyPress(code);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (!canAcceptInput || !onKeyRelease) return;
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;

            let key = e.key;
            if (PHYSICAL_KEY_MAP[key]) key = PHYSICAL_KEY_MAP[key];

            const code = getKeyCode(key);
            if (code !== null) {
                e.preventDefault();
                onKeyRelease(code);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [canAcceptInput, onKeyPress, onKeyRelease]);

    return (
        <div
            ref={containerRef}
            className="flex flex-col items-center h-full gap-3 md:gap-8 outline-none"
            tabIndex={0}
            onClick={() => containerRef.current?.focus()}
        >
            <div className="bg-[#1a1a1a] rounded-[1.5rem] md:rounded-[3.5rem] p-2.5 md:p-10 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-full relative group">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neutral-800 px-4 md:px-6 py-1 rounded-full border border-white/5 text-[9px] md:text-[10px] font-black text-neutral-500 uppercase tracking-widest shadow-lg whitespace-nowrap">
                    {t('hwTitle')}
                </div>

                <div className="bg-black p-2 md:p-6 rounded-2xl md:rounded-3xl shadow-[inset_0_4px_30px_rgba(0,0,0,1)] border-b-4 border-black/50 relative">
                    
                    {/* <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-neutral-200 backdrop-blur-sm">
                        <span className={`h-2 w-2 rounded-full ${lifecycleState === 'running' ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]' : lifecycleState === 'waiting' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]' : lifecycleState === 'paused' ? 'bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]' : lifecycleState === 'faulted' ? 'bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]' : 'bg-neutral-600'}`}></span>
                        {statusLabel}
                    </div> */}

                    <div className="bg-[#94a187] rounded-md p-1 shadow-[inset_0_2px_15px_rgba(0,0,0,0.4)] relative overflow-hidden">
                        <canvas
                            width={160}
                            height={80}
                            className="pixelated w-full aspect-[2/1] brightness-[1.05] contrast-[1.1]"
                            ref={(canvas) => {
                                if (canvas && screen) {
                                    const ctx = canvas.getContext('2d');
                                    if (ctx) ctx.putImageData(screen, 0, 0);
                                }
                            }}
                        />
                        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-white/10 via-transparent to-black/20"></div>
                        <div className="absolute inset-0 pointer-events-none opacity-[0.05] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,118,0.06))] bg-[length:100%_4px,3px_100%] shadow-[inset_0_0_100px_rgba(0,0,0,0.2)]"></div>
                    </div>

                    {(lifecycleState === 'idle' || lifecycleState === 'stopped' || lifecycleState === 'paused' || lifecycleState === 'faulted') && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-[2px] rounded-2xl md:rounded-3xl z-10">
                            <div className="max-w-[85%] text-center text-[10px] font-black uppercase tracking-widest border border-white/10 px-4 py-3 rounded-2xl bg-black/50 text-neutral-200 flex flex-col gap-2">
                                <span>{statusLabel}</span>
                                {(lifecycleState === 'paused' || lifecycleState === 'faulted') && pauseDiagnostics?.message && (
                                    <span className="text-[9px] text-neutral-400 normal-case tracking-normal font-semibold leading-relaxed">
                                        {pauseDiagnostics.message}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* <div className={`mt-3 rounded-2xl border px-4 py-3 text-[11px] ${lifecycleState === 'paused' ? 'border-orange-500/20 bg-orange-500/5 text-orange-100' : lifecycleState === 'faulted' ? 'border-red-500/20 bg-red-500/5 text-red-100' : lifecycleState === 'waiting' ? 'border-amber-500/20 bg-amber-500/5 text-amber-100' : 'border-white/5 bg-white/5 text-neutral-300'}`}>
                    <div className="flex items-center justify-between gap-3">
                        <span className="font-black uppercase tracking-[0.18em] text-[10px] text-neutral-400">{t('vmStatus')}</span>
                        <span className="font-black uppercase tracking-[0.18em]">{statusLabel}</span>
                    </div>
                    {pauseDiagnostics && (pauseDiagnostics.message || pauseDiagnostics.reason || pauseDiagnostics.pc !== undefined) && (
                        <div className="mt-2 space-y-1 text-[10px] leading-relaxed text-neutral-300">
                            {pauseDiagnostics.message && <div>{pauseDiagnostics.message}</div>}
                            <div className="flex flex-wrap gap-x-3 gap-y-1 text-neutral-400">
                                {pauseDiagnostics.reason && <span>{t('pauseReason')}: {pauseDiagnostics.reason}</span>}
                                {pauseDiagnostics.pc !== undefined && <span>PC: 0x{pauseDiagnostics.pc.toString(16).toUpperCase()}</span>}
                                {pauseDiagnostics.sp !== undefined && <span>SP: {pauseDiagnostics.sp}</span>}
                                {pauseDiagnostics.base !== undefined && <span>BASE: 0x{pauseDiagnostics.base.toString(16).toUpperCase()}</span>}
                                {pauseDiagnostics.opcode !== undefined && <span>OP: 0x{pauseDiagnostics.opcode.toString(16).toUpperCase()}</span>}
                            </div>
                        </div>
                    )}
                    {lifecycleState === 'waiting' && (
                        <div className="mt-2 text-[10px] text-neutral-400">{t('waitingForInput')}</div>
                    )}
                </div> */}

                <div
                    className={`mt-3 md:mt-10 flex justify-center w-full transition-opacity ${canAcceptInput ? 'opacity-100' : 'opacity-50'}`}
                    role="region"
                    aria-label="Virtual Keyboard"
                >
                    <SoftKeyboard
                        onKeyPress={(code) => {
                            if (!canAcceptInput) return;
                            onKeyPress(code);
                        }}
                        onKeyRelease={onKeyRelease ? (code) => {
                            if (!canAcceptInput) return;
                            onKeyRelease(code);
                        } : undefined}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5 w-full mt-auto">
                <div className="hidden md:flex p-3 md:p-5 bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 flex-col gap-2 md:gap-3 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-2.5 text-[11px] font-black text-neutral-400 uppercase tracking-wider relative">
                        <Monitor size={14} className="text-blue-400" /> {t('hwSpecs')}
                    </div>
                    <p className="text-[10px] md:text-[11px] text-neutral-500 font-medium leading-relaxed relative">
                        {t('hwScreen')}<br />
                        {t('hwRam')}<br />
                        {t('hwCpu')}
                    </p>
                </div>
                <div className="p-3 md:p-5 bg-white/5 rounded-2xl md:rounded-3xl border border-white/5 flex flex-col gap-2 md:gap-3 backdrop-blur-sm relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-2.5 text-[11px] font-black text-neutral-400 uppercase tracking-wider relative">
                        <Trash2 size={14} className="text-amber-400" /> {t('actions')}
                    </div>
                    {lifecycleState === 'paused' && (
                        <button
                            onClick={onResume}
                            disabled={!canResume}
                            className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-emerald-300 hover:text-emerald-200 disabled:opacity-30 transition-colors text-left"
                        >
                            <Play size={12} /> {t('resume')}
                        </button>
                    )}
                    {lifecycleState === 'waiting' && (
                        <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-amber-300/90">
                            <PauseCircle size={12} /> {t('waitingForInput')}
                        </div>
                    )}
                    <button
                        onClick={onStop}
                        disabled={!isRunning && lifecycleState !== 'faulted'}
                        className="inline-flex items-center gap-2 text-[10px] font-black uppercase text-red-400/80 hover:text-red-400 disabled:opacity-30 transition-colors text-left"
                    >
                        <Square size={12} /> {t('forceShutdown')}
                    </button>
                </div>
            </div>
        </div>
    );
};
