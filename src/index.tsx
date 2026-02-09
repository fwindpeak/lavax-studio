
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { Cpu, Terminal, Play, Square, Code, Binary, Zap, RotateCcw, FolderOpen, Upload, Trash2, FileText, Download, ChevronRight, Folder, PlayCircle, Info, MessageSquare, SearchCode, Settings, HelpCircle } from 'lucide-react';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './types';
import { LavaXCompiler, LavaXAssembler } from './compiler';
import { LavaXDecompiler } from './decompiler';
import { LavaXVM } from './vm';

const KEYBOARD_LAYOUT = [
  ['ON/OFF', '', '', '', '', '', 'F1', 'F2', 'F3', 'F4'],
  ['Q', 'W', 'E', 'R', 'T\n7', 'Y\n8', 'U\n9', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G\n4', 'H\n5', 'J\n6', 'K', 'L', '↵'],
  ['Z', 'X', 'C', 'V', 'B\n1', 'N\n2', 'M\n3', '⇈', '↑', '⇊'],
  ['HELP', 'SHIFT', 'CAPS', 'ESC', '0', '.', '', '←', '↓', '→']
];

const highlightCode = (code: string) => {
  const tokens = code.split(/(\s+|[(){}[\];,]|\/\*[\s\S]*?\*\/|\/\/.*|"[^"]*"|\b(?:void|int|char|if|else|while|return)\b)/g);
  return tokens.map((t, i) => {
    if (!t) return null;
    if (t.match(/\b(?:void|int|char|if|else|while|return)\b/)) return <span key={i} className="text-pink-400 font-bold">{t}</span>;
    if (t.match(/^\/\/.*$/)) return <span key={i} className="text-neutral-500 italic">{t}</span>;
    if (t.match(/^".*"$/)) return <span key={i} className="text-emerald-300">{t}</span>;
    if (t.match(/^[0-9]+$/)) return <span key={i} className="text-orange-400">{t}</span>;
    if (t.match(/^[a-zA-Z_]\w*$/)) {
      const sysCalls = ["ClearScreen", "Refresh", "TextOut", "getchar", "delay", "Box", "Line"];
      if (sysCalls.includes(t)) return <span key={i} className="text-yellow-400">{t}</span>;
      return <span key={i} className="text-blue-300">{t}</span>;
    }
    return <span key={i} className="text-neutral-300">{t}</span>;
  });
};

const SoftKeyboard: React.FC<{ onKeyPress: (key: string) => void }> = ({ onKeyPress }) => (
  <div className="grid gap-1.5 p-3 bg-neutral-900/80 rounded-xl border border-white/5 backdrop-blur-sm shadow-2xl">
    {KEYBOARD_LAYOUT.map((row, rowIndex) => (
      <div key={rowIndex} className="flex gap-1.5 justify-center">
        {row.map((key, keyIndex) => {
          if (key === '') return <div key={keyIndex} className="w-9 h-9" />;
          const displayKey = key.split('\n');
          const isSpecial = ['ON/OFF', 'HELP', 'SHIFT', 'CAPS', 'ESC', '↵', '↑', '↓', '←', '→', '⇈', '⇊', 'F1', 'F2', 'F3', 'F4'].includes(displayKey[0]);
          return (
            <button key={keyIndex} onClick={() => onKeyPress(displayKey[0])}
              className={`w-9 h-9 flex flex-col items-center justify-center ${isSpecial ? 'bg-neutral-800 text-neutral-400' : 'bg-neutral-700 text-white'} hover:brightness-125 active:scale-95 text-[9px] font-bold rounded-lg shadow-md transition-all border-b-2 border-black/40`}
            >
              <span>{displayKey[0]}</span>
              {displayKey[1] && <span className="text-[7px] text-neutral-400 mt-0.5">{displayKey[1]}</span>}
            </button>
          );
        })}
      </div>
    ))}
  </div>
);

const FileManager: React.FC<{ vm: LavaXVM, onRunLav: (data: Uint8Array) => void, onDecompileLav: (data: Uint8Array) => void }> = ({ vm, onRunLav, onDecompileLav }) => {
  const [files, setFiles] = useState<{ path: string, size: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshFiles = useCallback(() => setFiles(vm.getFiles()), [vm]);

  useEffect(() => {
    refreshFiles();
    const interval = setInterval(refreshFiles, 3000);
    return () => clearInterval(interval);
  }, [refreshFiles]);

  return (
    <div className="flex flex-col h-full bg-neutral-900/50 rounded-xl overflow-hidden border border-white/5">
      <div className="flex justify-between items-center p-3 bg-neutral-800/50 border-b border-white/5">
        <h3 className="text-[11px] font-bold text-neutral-400 uppercase flex items-center gap-2"><FolderOpen size={14} /> VFS Explorer</h3>
        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 hover:bg-white/10 rounded-md transition-colors" title="Upload to VFS">
          <Upload size={14} className="text-blue-400" /><input type="file" ref={fileInputRef} onChange={(e) => {
            const f = e.target.files?.[0]; if (f) {
              const r = new FileReader(); r.onload = (ev) => {
                vm.addFile(f.name, new Uint8Array(ev.target?.result as ArrayBuffer));
                refreshFiles();
              }; r.readAsArrayBuffer(f);
            }
          }} className="hidden" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
        {files.length === 0 && <div className="text-center py-10 text-neutral-600 text-[10px] italic">FileSystem is empty</div>}
        {files.map(f => {
          const isLav = f.path.toLowerCase().endsWith('.lav');
          return (
            <div key={f.path} className="flex items-center justify-between p-2 hover:bg-white/5 rounded-lg group text-[11px] transition-colors">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={14} className={isLav ? "text-orange-500" : "text-neutral-500"} />
                <span className="text-neutral-300 truncate font-medium">{f.path}</span>
                <span className="text-neutral-600 shrink-0">{f.size}B</span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {isLav && <button onClick={() => { const d = vm.getFile(f.path); if (d) onRunLav(d); }} className="p-1 hover:text-emerald-500" title="Run"><PlayCircle size={14} /></button>}
                {isLav && <button onClick={() => { const d = vm.getFile(f.path); if (d) onDecompileLav(d); }} className="p-1 hover:text-blue-400" title="Decompile"><SearchCode size={14} /></button>}
                <button onClick={() => { vm.deleteFile(f.path); refreshFiles(); }} className="p-1 hover:text-red-500" title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [source, setSource] = useState<string>(`void main() {
    ClearScreen();
    SetFontSize(16);
    TextOut(20, 10, "LavaX Studio");
    SetFontSize(12);
    TextOut(35, 35, "系统初始化成功");
    Box(5, 5, 150, 70);
    Refresh();
    
    getchar();
    
    ClearScreen();
    TextOut(10, 10, "正在生成文件...");
    Refresh();
    
    int h = fopen("test.txt", 1);
    fwrite("Hello", h);
    fclose(h);
    
    TextOut(10, 30, "文件 test.txt 已创建");
    Refresh();
    getchar();
}`);
  const [asm, setAsm] = useState("");
  const [lav, setLav] = useState<Uint8Array>(new Uint8Array(0));
  const [logs, setLogs] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'code' | 'asm' | 'bin'>('code');
  const [sideTab, setSideTab] = useState<'emu' | 'vfs'>('emu');
  const [isRunning, setIsRunning] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const vmRef = useRef(new LavaXVM());
  const compiler = useRef(new LavaXCompiler());
  const assembler = useRef(new LavaXAssembler());
  const decompiler = useRef(new LavaXDecompiler());

  const addLog = useCallback((msg: string) => setLogs(p => [msg, ...p].slice(0, 50)), []);

  useEffect(() => {
    const fetchFonts = async () => {
      try {
        const response = await fetch('/fonts.dat');
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          vmRef.current.setInternalFontData(new Uint8Array(buffer));
          addLog("System: Fonts initialized.");
        }
      } catch (e) { addLog("System: Font load failed."); }
    };
    fetchFonts();
  }, [addLog]);

  useEffect(() => {
    const vm = vmRef.current;
    vm.onLog = addLog;
    vm.onUpdateScreen = (img) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.putImageData(img, 0, 0);
    };
    vm.onFinished = () => { setIsRunning(false); addLog("Program halted."); };
  }, [addLog]);

  const handleCompile = () => {
    const res = compiler.current.compile(source);
    if (res.startsWith('ERROR')) { addLog(res); return; }
    setAsm(res);
    const binary = assembler.current.assemble(res);
    setLav(binary);
    vmRef.current.load(binary);
    vmRef.current.addFile('out.lav', binary);
    addLog(`Build Success: ${binary.length} bytes.`);
    return binary;
  };

  const handleRun = async () => {
    if (isRunning) { vmRef.current.stop(); setIsRunning(false); return; }
    let binary = lav;
    if (binary.length === 0) binary = handleCompile() || new Uint8Array(0);
    if (binary.length === 0) return;
    setSideTab('emu');
    setIsRunning(true);
    await vmRef.current.run();
  };

  const handleDecompile = (data: Uint8Array = lav) => {
    if (!data || data.length === 0) { addLog("ERROR: No binary."); return; }
    setSource(decompiler.current.decompile(data));
    setAsm(decompiler.current.disassemble(data));
    setActiveTab('code');
    addLog("Decompiled.");
  };

  return (
    <div className="flex flex-col h-screen bg-[#050505] text-neutral-300 font-mono overflow-hidden select-none">
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 py-3 bg-neutral-900 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-xl shadow-lg shadow-orange-500/20">
            <Cpu size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-black text-xs uppercase tracking-[0.2em]">LavaX Studio</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] text-neutral-500 font-bold uppercase">Online IDE</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleDecompile()} className="flex items-center gap-2 px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-[10px] font-black rounded-lg border border-white/5 transition-all text-blue-400">
            <SearchCode size={14} /> DECOMPILE
          </button>
          <button onClick={handleCompile} className="flex items-center gap-2 px-4 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-[10px] font-black rounded-lg border border-white/5 transition-all text-yellow-500">
            <Zap size={14} /> BUILD
          </button>
          <button onClick={handleRun} className={`flex items-center gap-2 px-6 py-1.5 ${isRunning ? 'bg-red-600' : 'bg-emerald-600'} text-white text-[10px] font-black rounded-lg shadow-xl shadow-emerald-500/10 transition-all active:scale-95`}>
            {isRunning ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />} {isRunning ? 'STOP' : 'RUN'}
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Editor Area */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-white/5 bg-neutral-950">
          <div className="flex bg-neutral-900/50 h-10 items-center px-4 gap-8 shrink-0 border-b border-white/5">
            {['code', 'asm', 'bin'].map(t => (
              <button key={t} onClick={() => setActiveTab(t as any)} className={`text-[10px] font-black uppercase h-full border-b-2 transition-all flex items-center gap-2 ${activeTab === t ? 'border-orange-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}>
                {t === 'code' && <Code size={14} />}
                {t === 'asm' && <Terminal size={14} />}
                {t === 'bin' && <Binary size={14} />}
                {t}
              </button>
            ))}
          </div>

          <div className="flex-1 relative overflow-hidden">
            {activeTab === 'code' && (
              <div className="absolute inset-0">
                <div className="absolute inset-0 p-8 pointer-events-none whitespace-pre-wrap text-sm leading-relaxed overflow-auto custom-scrollbar">{highlightCode(source)}</div>
                <textarea value={source} onChange={(e) => setSource(e.target.value)} className="absolute inset-0 p-8 bg-transparent text-transparent caret-white outline-none resize-none whitespace-pre-wrap text-sm leading-relaxed overflow-auto custom-scrollbar scroll-smooth" spellCheck={false} />
              </div>
            )}
            {activeTab === 'asm' && <div className="p-8 text-blue-400/90 text-[13px] whitespace-pre overflow-auto h-full font-mono custom-scrollbar">{asm || "// Assembly View"}</div>}
            {activeTab === 'bin' && (
              <div className="p-8 overflow-auto h-full font-mono custom-scrollbar">
                <div className="grid grid-cols-[4rem_repeat(16,1.8rem)_1fr] gap-x-1 gap-y-1 text-[11px]">
                  <span className="text-neutral-600 font-bold">OFFSET</span>
                  {[...Array(16)].map((_, i) => <span key={i} className="text-neutral-500 font-bold">{i.toString(16).toUpperCase()}</span>)}
                  <span className="text-neutral-600 ml-6">ASCII</span>
                  {Array.from(lav).reduce((acc: any[], b: number, i: number) => {
                    if (i % 16 === 0) acc.push(<span key={`off-${i}`} className="text-orange-500/40">{(i).toString(16).padStart(4, '0').toUpperCase()}</span>);
                    acc.push(<span key={`hex-${i}`} className="text-neutral-400 hover:text-white transition-colors cursor-default">{b.toString(16).padStart(2, '0').toUpperCase()}</span>);
                    if ((i + 1) % 16 === 0 || i === lav.length - 1) {
                      const chunk = lav.slice(i - (i % 16), i + 1);
                      const ascii = Array.from(chunk).map((byte: number) => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.').join('');
                      acc.push(<span key={`asc-${i}`} className="text-neutral-500/60 ml-6 tracking-widest">{ascii}</span>);
                    }
                    return acc;
                  }, [])}
                </div>
              </div>
            )}
          </div>

          <div className="h-44 bg-neutral-900 border-t border-white/10 flex flex-col shrink-0">
            <div className="px-5 py-2 border-b border-white/5 flex items-center justify-between bg-neutral-900">
              <span className="text-[10px] font-black text-neutral-500 uppercase flex items-center gap-2"><MessageSquare size={14} /> Console</span>
              <button onClick={() => setLogs([])} className="text-[9px] font-bold text-neutral-600 hover:text-white transition-colors">CLEAR</button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed flex flex-col-reverse custom-scrollbar bg-black/40">
              {logs.map((l, i) => (
                <div key={i} className={`py-1 flex gap-4 ${l.startsWith('ERROR') ? 'text-red-400' : 'text-neutral-400'}`}>
                  <span className="text-neutral-700 shrink-0">{new Date().toLocaleTimeString()}</span>
                  <span className="break-all">{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[420px] flex flex-col bg-[#080808] shrink-0 border-l border-white/5">
          <div className="flex h-10 border-b border-white/5 px-2 gap-4 items-center bg-neutral-900/50">
            {['emu', 'vfs'].map(t => (
              <button key={t} onClick={() => setSideTab(t as any)} className={`px-4 text-[10px] font-black uppercase h-full border-b-2 transition-all ${sideTab === t ? 'border-orange-500 text-white' : 'border-transparent text-neutral-500'}`}>{t === 'emu' ? 'Emulator' : 'Files'}</button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden p-6 flex flex-col gap-6">
            {sideTab === 'emu' && (
              <div className="flex flex-col items-center gap-8 h-full">
                <div className="bg-[#1a1a1a] rounded-[3rem] p-8 border border-white/10 shadow-2xl w-full relative group">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-neutral-800 px-4 py-1 rounded-full border border-white/5 text-[9px] font-black text-neutral-500">WQX EMULATOR 1.0</div>
                  <div className="bg-black p-5 rounded-3xl shadow-[inset_0_4px_20px_rgba(0,0,0,1)] border-b-4 border-black/50">
                    <div className="bg-[#94a187] rounded-sm p-1 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)]">
                      <canvas ref={canvasRef} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} className="pixelated w-full aspect-[2/1] brightness-[1.1] contrast-[1.2]" />
                    </div>
                  </div>
                  <div className="mt-8 flex justify-center"><SoftKeyboard onKeyPress={(k) => isRunning && vmRef.current.pushKey(k)} /></div>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full mt-auto">
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase"><Info size={12} /> Info</div>
                    <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                      Res: 160x80 Mono<br />
                      VFS: IndexedDB Persistent<br />
                      Font: GB2312 Loaded
                    </p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-2xl border border-white/5 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-neutral-400 uppercase"><HelpCircle size={12} /> Keyboard</div>
                    <p className="text-[10px] text-neutral-500 font-medium leading-relaxed">
                      Arrow keys mapping<br />
                      Enter: ↵ / Escape: ESC<br />
                      ON/OFF: System Reset
                    </p>
                  </div>
                </div>
              </div>
            )}
            {sideTab === 'vfs' && <FileManager vm={vmRef.current} onRunLav={async (d) => { vmRef.current.stop(); await new Promise(r => setTimeout(r, 100)); vmRef.current.load(d); setSideTab('emu'); setIsRunning(true); await vmRef.current.run(); }} onDecompileLav={handleDecompile} />}
          </div>
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
