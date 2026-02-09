import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FolderOpen, Upload, Trash2, FileText, PlayCircle, Download } from 'lucide-react';
import { LavaXVM } from '../vm';

export const FileManager: React.FC<{ vm: LavaXVM, onRunLav: (data: Uint8Array) => void, onDecompileLav: (data: Uint8Array) => void }> = ({ vm, onRunLav, onDecompileLav }) => {
    const [files, setFiles] = useState<{ path: string, size: number }[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshFiles = useCallback(() => setFiles(vm.getFiles()), [vm]);

    useEffect(() => {
        refreshFiles();
        const interval = setInterval(refreshFiles, 3000);
        return () => clearInterval(interval);
    }, [refreshFiles]);

    const downloadFile = (name: string, data: Uint8Array) => {
        const blob = new Blob([data as any], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full bg-neutral-900/50 rounded-2xl overflow-hidden border border-white/5 backdrop-blur-sm">
            <div className="flex justify-between items-center p-4 bg-neutral-800/80 border-b border-white/5">
                <h3 className="text-[12px] font-black text-neutral-400 uppercase flex items-center gap-2"><FolderOpen size={16} /> VFS Explorer</h3>
                <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/10 rounded-lg transition-all" title="Upload to Virtual File System">
                    <Upload size={16} className="text-blue-400" /><input type="file" ref={fileInputRef} onChange={(e) => {
                        const f = e.target.files?.[0]; if (f) {
                            const r = new FileReader(); r.onload = (ev) => {
                                vm.addFile(f.name, new Uint8Array(ev.target?.result as ArrayBuffer));
                                refreshFiles();
                            }; r.readAsArrayBuffer(f);
                        }
                    }} className="hidden" />
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1.5">
                {files.length === 0 && <div className="text-center py-16 text-neutral-600 text-[11px] italic">FileSystem is empty</div>}
                {files.map(f => {
                    const isLav = f.path.toLowerCase().endsWith('.lav');
                    return (
                        <div key={f.path} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl group text-[11px] transition-all cursor-default border border-transparent hover:border-white/10">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <FileText size={16} className={isLav ? "text-orange-500" : "text-neutral-500"} />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-neutral-200 truncate font-bold">{f.path}</span>
                                    <span className="text-neutral-500 text-[9px] uppercase">{f.size} Bytes</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isLav && <button onClick={() => { const d = vm.getFile(f.path); if (d) onRunLav(d); }} className="p-1.5 hover:text-emerald-500 transition-colors" title="Run"><PlayCircle size={16} /></button>}
                                <button onClick={() => { const d = vm.getFile(f.path); if (d) downloadFile(f.path, d); }} className="p-1.5 hover:text-blue-400 transition-colors" title="Download"><Download size={16} /></button>
                                <button onClick={() => { vm.deleteFile(f.path); refreshFiles(); }} className="p-1.5 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
