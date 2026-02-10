
import React from 'react';

interface EditorProps {
    code: string;
    onChange: (code: string) => void;
    onScroll: (e: React.UIEvent<HTMLTextAreaElement>) => void;
    highlightedCode: React.ReactNode;
    lineCount: number;
}

export const Editor: React.FC<EditorProps> = ({ code, onChange, onScroll, highlightedCode, lineCount }) => {
    const lineNumbersRef = React.useRef<HTMLDivElement>(null);
    const preRef = React.useRef<HTMLPreElement>(null);

    const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
        const target = e.currentTarget;
        if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = target.scrollTop;
        if (preRef.current) {
            preRef.current.scrollTop = target.scrollTop;
            preRef.current.scrollLeft = target.scrollLeft;
        }
        onScroll(e);
    };

    return (
        <div className="flex-1 flex overflow-hidden border border-white/10 rounded-xl bg-black/40 backdrop-blur-md relative group h-full">
            <div
                ref={lineNumbersRef}
                className="w-12 bg-white/5 border-r border-white/10 flex flex-col items-center py-4 text-white/30 font-mono text-sm select-none overflow-hidden"
            >
                {Array.from({ length: lineCount }).map((_, i) => (
                    <div key={i} className="h-6 leading-6">{i + 1}</div>
                ))}
            </div>
            <div className="flex-1 relative overflow-hidden h-full">
                <pre
                    ref={preRef}
                    className="absolute inset-0 p-4 font-mono text-sm h-full w-full pointer-events-none overflow-hidden m-0 box-border border-none"
                    style={{ whiteSpace: 'pre', wordBreak: 'normal', lineHeight: '1.5rem' }}
                >
                    {highlightedCode}
                </pre>
                <textarea
                    value={code}
                    onChange={(e) => onChange(e.target.value)}
                    onScroll={handleScroll}
                    className="absolute inset-0 p-4 font-mono text-sm bg-transparent text-transparent caret-white outline-none resize-none h-full w-full overflow-auto m-0 border-none focus:ring-0 box-border leading-6"
                    spellCheck={false}
                    style={{ whiteSpace: 'pre', wordBreak: 'normal', lineHeight: '1.5rem' }}
                />
            </div>
        </div>
    );
};
