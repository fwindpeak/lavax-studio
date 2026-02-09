import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FolderOpen, Upload, Trash2, FileText, PlayCircle, Download, FolderPlus, ChevronRight, File, Folder, SearchCode } from 'lucide-react';
import { LavaXVM } from '../vm';

export const FileManager: React.FC<{
    vm: LavaXVM,
    onRunLav: (data: Uint8Array) => void,
    onDecompileLav: (data: Uint8Array) => void
}> = ({ vm, onRunLav, onDecompileLav }) => {
    const [allFiles, setAllFiles] = useState<{ path: string, size: number }[]>([]);
    const [currentPath, setCurrentPath] = useState<string>('/');
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshFiles = useCallback(() => {
        setAllFiles(vm.getFiles());
    }, [vm]);

    useEffect(() => {
        refreshFiles();
        const interval = setInterval(refreshFiles, 3000);
        return () => clearInterval(interval);
    }, [refreshFiles]);

    const items = useMemo(() => {
        const normalizedCurrentPath = currentPath === '/' ? '/' : (currentPath.endsWith('/') ? currentPath : currentPath + '/');
        const levelItems = new Map<string, { name: string, isDir: boolean, size: number, fullPath: string }>();

        allFiles.forEach(f => {
            const rel = f.path.startsWith(normalizedCurrentPath) ? f.path.slice(normalizedCurrentPath.length) : (currentPath === '/' && !f.path.startsWith('/') ? f.path : null);
            if (rel === null) return;

            const parts = rel.split('/');
            const name = parts[0];
            if (!name) return;

            const isDir = parts.length > 1;
            const fullPath = normalizedCurrentPath === '/' ? name : normalizedCurrentPath + name;

            if (levelItems.has(name)) {
                if (isDir) levelItems.get(name)!.isDir = true;
            } else {
                levelItems.set(name, { name, isDir, size: f.size, fullPath });
            }
        });

        return Array.from(levelItems.values()).sort((a, b) => {
            if (a.isDir !== b.isDir) return b.isDir ? 1 : -1;
            return a.name.localeCompare(b.name);
        });
    }, [allFiles, currentPath]);

    const handleUpload = async (files: FileList | null) => {
        if (!files) return;
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            const data = new Uint8Array(await f.arrayBuffer());
            const path = currentPath === '/' ? f.name : `${currentPath.replace(/\/$/, '')}/${f.name}`;
            vm.addFile(path, data);
        }
        refreshFiles();
    };

    const createFolder = () => {
        const name = prompt("Enter folder name:");
        if (name) {
            const path = currentPath === '/' ? `${name}/.keep` : `${currentPath.replace(/\/$/, '')}/${name}/.keep`;
            vm.addFile(path, new Uint8Array(0));
            refreshFiles();
        }
    };

    const deleteItem = (item: typeof items[0]) => {
        if (item.isDir) {
            if (confirm(`Delete folder "${item.name}" and all contents?`)) {
                allFiles.filter(f => f.path.startsWith(item.fullPath + '/')).forEach(f => vm.deleteFile(f.path));
                vm.deleteFile(item.fullPath + '/.keep'); // if exists
                refreshFiles();
            }
        } else {
            vm.deleteFile(item.fullPath);
            refreshFiles();
        }
    };

    const downloadFile = (name: string, data: Uint8Array) => {
        const blob = new Blob([data as any], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = name; a.click();
        URL.revokeObjectURL(url);
    };

    const breadcrumbs = useMemo(() => {
        const parts = currentPath.split('/').filter(Boolean);
        return [{ name: 'root', path: '/' }, ...parts.map((p, i) => ({
            name: p,
            path: '/' + parts.slice(0, i + 1).join('/')
        }))];
    }, [currentPath]);

    return (
        <div
            className={`flex flex-col h-full bg-neutral-900/50 rounded-2xl overflow-hidden border transition-all backdrop-blur-sm ${isDragging ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'border-white/5'}`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleUpload(e.dataTransfer.files); }}
        >
            <div className="flex flex-col bg-neutral-800/80 border-b border-white/5">
                <div className="flex justify-between items-center p-4">
                    <h3 className="text-[12px] font-black text-neutral-400 uppercase flex items-center gap-2"><FolderOpen size={16} /> VFS Explorer</h3>
                    <div className="flex gap-2">
                        <button onClick={createFolder} className="p-2 hover:bg-white/10 rounded-lg transition-all text-neutral-400 hover:text-white" title="New Folder">
                            <FolderPlus size={16} />
                        </button>
                        <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/10 rounded-lg transition-all text-blue-400" title="Upload Files">
                            <Upload size={16} /><input type="file" ref={fileInputRef} multiple onChange={(e) => handleUpload(e.target.files)} className="hidden" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center gap-1 px-4 pb-2 overflow-x-auto no-scrollbar">
                    {breadcrumbs.map((b, i) => (
                        <React.Fragment key={b.path}>
                            {i > 0 && <ChevronRight size={12} className="text-neutral-600 shrink-0" />}
                            <button
                                onClick={() => setCurrentPath(b.path)}
                                className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors whitespace-nowrap ${currentPath === b.path ? 'bg-orange-500/20 text-orange-400' : 'text-neutral-500 hover:bg-white/5 hover:text-neutral-300'}`}
                            >
                                {b.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1.5">
                {items.length === 0 && <div className="text-center py-16 text-neutral-600 text-[11px] italic">Directory is empty</div>}
                {items.map(item => {
                    const isLav = item.name.toLowerCase().endsWith('.lav');
                    return (
                        <div key={item.fullPath} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl group text-[11px] transition-all cursor-default border border-transparent hover:border-white/10">
                            <div
                                className="flex items-center gap-3 overflow-hidden flex-1"
                                onClick={() => item.isDir && setCurrentPath(item.fullPath)}
                            >
                                {item.isDir ? <Folder size={16} className="text-blue-400" /> : <File size={16} className={isLav ? "text-orange-500" : "text-neutral-500"} />}
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-neutral-200 truncate font-bold">{item.name}</span>
                                    <span className="text-neutral-500 text-[9px] uppercase">{item.isDir ? 'Directory' : `${item.size} Bytes`}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!item.isDir && isLav && <button onClick={() => { const d = vm.getFile(item.fullPath); if (d) onRunLav(d); }} className="p-1.5 hover:text-emerald-500 transition-colors" title="Run"><PlayCircle size={16} /></button>}
                                {!item.isDir && isLav && <button onClick={() => { const d = vm.getFile(item.fullPath); if (d) onDecompileLav(d); }} className="p-1.5 hover:text-blue-400 transition-colors" title="Decompile"><SearchCode size={16} /></button>}
                                {!item.isDir && <button onClick={() => { const d = vm.getFile(item.fullPath); if (d) downloadFile(item.name, d); }} className="p-1.5 hover:text-blue-400 transition-colors" title="Download"><Download size={16} /></button>}
                                <button onClick={() => deleteItem(item)} className="p-1.5 hover:text-red-500 transition-colors" title="Delete"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
