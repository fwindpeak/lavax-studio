
import React from 'react';

interface EditorProps {
    code: string;
    onChange: (code: string) => void;
    onScroll: (e: React.UIEvent<HTMLTextAreaElement>) => void;
    highlightedCode: React.ReactNode;
    lineCount: number;
}

export const Editor: React.FC<EditorProps> = ({ code, onChange, onScroll, highlightedCode, lineCount }) => {
    return (
        <div className="flex-1 flex overflow-hidden border border-white/10 rounded-xl bg-black/40 backdrop-blur-md relative group">
            <div className="w-12 bg-white/5 border-r border-white/10 flex flex-col items-center py-4 text-white/30 font-mono text-sm select-none">
                {Array.from({ length: lineCount }).map((_, i) => (
                    <div key={i} className="h-6 leading-6">{i + 1}</div>
                ))}
            </div>
            <div className="flex-1 relative overflow-hidden">
                <pre
                    className="absolute inset-0 p-4 font-mono text-sm h-full w-full pointer-events-none overflow-hidden m-0"
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                >
                    {highlightedCode}
                </pre>
                <textarea
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={onScroll}
                    className="absolute inset-0 p-4 font-mono text-sm bg-transparent text-transparent caret-white outline-none resize-none h-full w-full overflow-auto m-0 border-none focus:ring-0"
                    spellCheck={false}
                    style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                />
            </div>
        </div>
    );
};
