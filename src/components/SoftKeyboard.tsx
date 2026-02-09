import React from 'react';

const KEYBOARD_LAYOUT = [
    ['ON/OFF', '', '', '', '', '', 'F1', 'F2', 'F3', 'F4'],
    ['Q', 'W', 'E', 'R', 'T\n7', 'Y\n8', 'U\n9', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G\n4', 'H\n5', 'J\n6', 'K', 'L', '↵'],
    ['Z', 'X', 'C', 'V', 'B\n1', 'N\n2', 'M\n3', '⇈', '↑', '⇊'],
    ['HELP', 'SHIFT', 'CAPS', 'ESC', '0', '.', '', '←', '↓', '→']
];

export const SoftKeyboard: React.FC<{ onKeyPress: (key: string) => void }> = ({ onKeyPress }) => (
    <div className="grid gap-1 p-2 bg-neutral-900/90 rounded-2xl border border-white/5 backdrop-blur-xl shadow-inner">
        {KEYBOARD_LAYOUT.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1 justify-center">
                {row.map((key, keyIndex) => {
                    if (key === '') return <div key={keyIndex} className="w-8 h-8" />;
                    const displayKey = key.split('\n');
                    const isSpecial = ['ON/OFF', 'HELP', 'SHIFT', 'CAPS', 'ESC', '↵', '↑', '↓', '←', '→', '⇈', '⇊', 'F1', 'F2', 'F3', 'F4'].includes(displayKey[0]);
                    return (
                        <button key={keyIndex} onClick={() => onKeyPress(displayKey[0])}
                            className={`w-8 h-8 flex flex-col items-center justify-center ${isSpecial ? 'bg-neutral-800 text-neutral-400 hover:bg-neutral-750' : 'bg-neutral-700 text-white hover:bg-neutral-600'} active:scale-90 active:brightness-75 text-[9px] font-black rounded-lg shadow-lg transition-all border-b-[3px] border-black/40`}
                        >
                            <span>{displayKey[0]}</span>
                            {displayKey[1] && <span className="text-[6px] text-neutral-400 mt-0.5">{displayKey[1]}</span>}
                        </button>
                    );
                })}
            </div>
        ))}
    </div>
);
