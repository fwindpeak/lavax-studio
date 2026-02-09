import React, { useEffect, useRef } from 'react';
import { MessageSquare } from 'lucide-react';

interface LogEntry {
    text: string;
    time: string;
}

interface TerminalProps {
    logs: LogEntry[];
    onClear: () => void;
    onLog: (msg: string) => void;
}

export const Terminal: React.FC<TerminalProps> = ({ logs, onClear, onLog }) => {
    const terminalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [logs]);

    const handleCopyAll = () => {
        const text = logs.map(l => `[${l.time}] ${l.text}`).join('\n');
        navigator.clipboard.writeText(text);
        onLog("System: Logs copied to clipboard.");
    };

    return (
        <div className="h-56 bg-neutral-900/80 border-t border-white/5 flex flex-col shrink-0 backdrop-blur-md">
            <div className="px-6 py-2.5 border-b border-white/5 flex items-center justify-between">
                <span className="text-[11px] font-black text-neutral-500 uppercase flex items-center gap-2.5">
                    <MessageSquare size={14} /> Integrated Terminal
                </span>
                <div className="flex gap-4">
                    <button
                        onClick={handleCopyAll}
                        className="text-[10px] font-black text-neutral-600 hover:text-white transition-colors"
                    >
                        COPY ALL
                    </button>
                    <button
                        onClick={onClear}
                        className="text-[10px] font-black text-neutral-600 hover:text-white transition-colors"
                    >
                        CLEAR
                    </button>
                </div>
            </div>
            <div
                ref={terminalRef}
                className="flex-1 p-5 overflow-y-auto font-mono text-[12px] leading-relaxed custom-scrollbar bg-black/20 select-text"
            >
                <div className="flex flex-col min-h-full">
                    {logs.map((l, i) => (
                        <div key={i} className={`py-0.5 flex gap-4 select-text ${l.text.includes('Error') || l.text.startsWith('ERROR') ? 'text-red-400' : 'text-neutral-400'}`}>
                            <span className="text-neutral-700 shrink-0 font-black select-none">[{l.time}]</span>
                            <span className="whitespace-pre-wrap break-all select-text flex-1">
                                {l.text}
                            </span>
                        </div>
                    ))}
                    {logs.length === 0 && <div className="text-neutral-700 italic">Session logs will appear here...</div>}
                </div>
            </div>
        </div>
    );
};
