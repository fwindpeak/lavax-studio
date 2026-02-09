
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import { Cpu, Terminal, Play, Square, Code, Binary, Zap, FolderOpen, Upload, Trash2, FileText, PlayCircle, Info, MessageSquare, SearchCode, HelpCircle, Download, FilePlus, Save } from 'lucide-react';
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
  const tokens = code.split(/(\s+|[(){}[\];,]|\/\*[\s\S]*?\*\/|\/\/.*|"[^"]*"|\b(?:void|int|char|if|else|while|return|for)\b)/g);
  return tokens.map((t, i) => {
    if (!t) return null;
    if (t.match(/\b(?:void|int|char|if|else|while|return|for)\b/)) return <span key={i} className="text-pink-400 font-bold">{t}</span>;
    if (t.match(/^\/\/.*$/)) return <span key={i} className="text-neutral-500 italic">{t}</span>;
    if (t.match(/^".*"$/)) return <span key={i} className="text-emerald-300">{t}</span>;
    if (t.match(/^[0-9]+$/)) return <span key={i} className="text-orange-400">{t}</span>;
    if (t.match(/^[a-zA-Z_]\w*$/)) {
      const sysCalls = ["ClearScreen", "Refresh", "TextOut", "getchar", "delay", "Box", "Line", "FillBox", "Circle", "SetFontSize", "Inkey", "SetColor", "GetMS"];
      if (sysCalls.includes(t)) return <span key={i} className="text-yellow-400">{t}</span>;
      return <span key={i} className="text-blue-300">{t}</span>;
    }
    return <span key={i} className="text-neutral-300">{t}</span>;
  });
};

const SoftKeyboard: React.FC<{ onKeyPress: (key: string) => void }> = ({ onKeyPress }) => (
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

const FileManager: React.FC<{ vm: LavaXVM, onRunLav: (data: Uint8Array) => void, onDecompileLav: (data: Uint8Array) => void }> = ({ vm, onRunLav, onDecompileLav }) => {
  const [files, setFiles] = useState<{ path: string, size: number }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refreshFiles = useCallback(() => setFiles(vm.getFiles()), [vm]);

  useEffect(() => {
    refreshFiles();
    const interval = setInterval(refreshFiles, 3000);
    return () => clearInterval(interval);
  }, [refreshFiles]);

  const downloadFile = (name: string, data: Uint8Array) => {
    const blob = new Blob([data], { type: 'application/octet-stream' });
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

const App: React.FC = () => {
  const [source, setSource] = useState<string>(`void main() {
    ClearScreen();
    SetFontSize(16);
    TextOut(35, 10, "LavaX IDE");
    
    SetFontSize(12);
    TextOut(20, 35, "系统就绪，欢迎使用");
    
    // 绘制装饰框
    Box(5, 5, 150, 70);
    Line(10, 30, 150, 30);
    Refresh();
    
    getchar(); // 等待按键
    
    // 动画示例
    int i;
    for (i = 0; i < 40; i = i + 2) {
        ClearScreen();
        Box(5, 5, 150, 70);
        Circle(80, 40, i);
        Refresh();
        delay(20);
    }
    
    TextOut(10, 10, "按任意键退出...");
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

  const editorRef = useRef<HTMLTextAreaElement>(null);
  const highlighterRef = useRef<HTMLDivElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((msg: string) => setLogs(p => [msg, ...p].slice(0, 100)), []);

  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const { scrollTop, scrollLeft } = e.currentTarget;
    if (highlighterRef.current) {
      highlighterRef.current.scrollTop = scrollTop;
      highlighterRef.current.scrollLeft = scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = scrollTop;
    }
  };

  useEffect(() => {
    const fetchFonts = async () => {
      try {
        const response = await fetch('/fonts.dat');
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          vmRef.current.setInternalFontData(new Uint8Array(buffer));
          addLog("System: Internal fonts initialized.");
        }
      } catch (e) { addLog("System: Font assets missing."); }
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
    vm.onFinished = () => { setIsRunning(false); addLog("Program: Execution terminated normally."); };
  }, [addLog]);

  const handleCompile = () => {
    addLog("Compiler: Starting build...");
    const res = compiler.current.compile(source);
    if (res.startsWith('ERROR')) { addLog(res); return; }
    setAsm(res);
    const binary = assembler.current.assemble(res);
    setLav(binary);
    vmRef.current.load(binary);
    vmRef.current.addFile('out.lav', binary);
    addLog(`Compiler: Build Success. Binary size: ${binary.length} bytes.`);
    return binary;
  };

  const handleRun = async () => {
    if (isRunning) { vmRef.current.stop(); setIsRunning(false); return; }
    let binary = lav;
    if (binary.length === 0) binary = handleCompile() || new Uint8Array(0);
    if (binary.length === 0) return;
    setSideTab('emu');
    setIsRunning(true);
    addLog("Program: Launching...");
    await vmRef.current.run();
  };

  const handleDecompile = (data: Uint8Array = lav) => {
    if (!data || data.length === 0) { addLog("Error: No binary to decompile."); return; }
    setSource(decompiler.current.decompile(data));
    setAsm(decompiler.current.disassemble(data));
    setActiveTab('code');
    addLog("Decompiler: Source recovered.");
  };

  const lineNumbers = useMemo(() => {
    return source.split('\n').map((_, i) => i + 1);
  }, [source]);

  return (
    <div className="flex flex-col h-screen bg-[#080808] text-neutral-300 font-mono overflow-hidden select-none">
      {/* Navbar */}
      <header className="flex items-center justify-between px-8 py-4 bg-neutral-900/80 backdrop-blur-md border-b border-white/5 shrink-0 z-10">
        <div className="flex items-center gap-5">
          <div className="bg-gradient-to-tr from-orange-500 to-amber-600 p-2.5 rounded-2xl shadow-xl shadow-orange-500/10 border border-white/10">
            <Cpu size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-white font-black text-sm uppercase tracking-[0.3em]">LavaX Studio</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="text-[9px] text-neutral-500 font-black uppercase tracking-widest">{isRunning ? 'Running' : 'Ready'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => handleDecompile()} className="flex items-center gap-2 px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-[11px] font-black rounded-xl border border-white/5 transition-all text-blue-400 active:scale-95">
            <SearchCode size={16} /> RECOVER
          </button>
          <button onClick={handleCompile} className="flex items-center gap-2 px-5 py-2 bg-neutral-800 hover:bg-neutral-700 text-[11px] font-black rounded-xl border border-white/5 transition-all text-amber-500 active:scale-95">
            <Zap size={16} /> BUILD
          </button>
          <button onClick={handleRun} className={`flex items-center gap-2 px-8 py-2 ${isRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white text-[11px] font-black rounded-xl shadow-2xl transition-all active:scale-95`}>
            {isRunning ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />} {isRunning ? 'STOP' : 'RUN'}
          </button>
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        {/* Editor Area */}
        <div className="flex flex-col flex-1 min-w-0 border-r border-white/5 bg-neutral-950 relative">
          <div className="flex bg-neutral-900/30 h-12 items-center px-6 gap-10 shrink-0 border-b border-white/5">
            {[
              { id: 'code', icon: Code, label: 'Source' },
              { id: 'asm', icon: Terminal, label: 'Assembly' },
              { id: 'bin', icon: Binary, label: 'Hex' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`text-[11px] font-black uppercase h-full border-b-2 transition-all flex items-center gap-2.5 ${activeTab === t.id ? 'border-orange-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 relative overflow-hidden flex bg-[#0c0c0c]">
            {activeTab === 'code' && (
              <>
                <div
                  ref={gutterRef}
                  className="w-14 bg-neutral-900/20 border-r border-white/5 flex flex-col pt-10 text-right pr-4 select-none text-neutral-700 text-[12px] font-mono leading-relaxed shrink-0 overflow-hidden no-scrollbar"
                >
                  {lineNumbers.map(n => (
                    <div key={n} className="h-[22px]">{n}</div>
                  ))}
                </div>

                <div className="flex-1 relative overflow-hidden">
                  <div
                    ref={highlighterRef}
                    className="absolute inset-0 p-10 pt-10 pl-6 pointer-events-none whitespace-pre text-[14px] font-mono leading-relaxed overflow-hidden no-scrollbar text-neutral-300"
                  >
                    {highlightCode(source)}
                  </div>
                  <textarea
                    ref={editorRef}
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    onScroll={handleEditorScroll}
                    className="absolute inset-0 p-10 pt-10 pl-6 bg-transparent text-transparent caret-orange-500 outline-none resize-none whitespace-pre text-[14px] font-mono leading-relaxed overflow-auto custom-scrollbar scroll-smooth"
                    spellCheck={false}
                    autoCapitalize="off"
                  />
                </div>
              </>
            )}
            {activeTab === 'asm' && (
              <div className="p-10 text-blue-400/80 text-[14px] whitespace-pre overflow-auto h-full font-mono custom-scrollbar w-full leading-loose">
                {asm || "// No assembly generated yet. Click BUILD to compile."}
              </div>
            )}
            {activeTab === 'bin' && (
              <div className="p-10 overflow-auto h-full font-mono custom-scrollbar w-full">
                <div className="grid grid-cols-[5rem_repeat(16,2.2rem)_1fr] gap-x-1 gap-y-1.5 text-[12px]">
                  <span className="text-neutral-600 font-black">OFFSET</span>
                  {[...Array(16)].map((_, i) => <span key={i} className="text-neutral-500 font-black">{i.toString(16).toUpperCase()}</span>)}
                  <span className="text-neutral-600 ml-8">ASCII</span>
                  {lav.length === 0 ? <div className="col-span-full py-20 text-center text-neutral-700 italic">No binary data</div> :
                    Array.from(lav).reduce((acc: any[], b, i) => {
                      if (i % 16 === 0) acc.push(<span key={`off-${i}`} className="text-orange-500/50 font-black">{(i).toString(16).padStart(4, '0').toUpperCase()}</span>);
                      acc.push(<span key={`hex-${i}`} className="text-neutral-400 hover:text-orange-400 transition-colors cursor-default text-center">{b.toString(16).padStart(2, '0').toUpperCase()}</span>);
                      if ((i + 1) % 16 === 0 || i === lav.length - 1) {
                        const lastIdx = i === lav.length - 1 ? i + 1 : i + 1;
                        const startIdx = i - (i % 16);
                        const chunk = lav.slice(startIdx, lastIdx);
                        const ascii = Array.from(chunk).map(byte => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.').join('');
                        acc.push(<span key={`asc-${i}`} className="text-neutral-600 ml-8 tracking-widest">{ascii}</span>);
                      }
                      return acc;
                    }, [])}
                </div>
              </div>
            )}
          </div>

          {/* Console Area */}
          <div className="h-56 bg-neutral-900/80 border-t border-white/5 flex flex-col shrink-0 backdrop-blur-md">
            <div className="px-6 py-2.5 border-b border-white/5 flex items-center justify-between">
              <span className="text-[11px] font-black text-neutral-500 uppercase flex items-center gap-2.5"><MessageSquare size={14} /> Integrated Terminal</span>
              <div className="flex gap-4">
                <button onClick={() => setLogs([])} className="text-[10px] font-black text-neutral-600 hover:text-white transition-colors">CLEAR</button>
              </div>
            </div>
            <div className="flex-1 p-5 overflow-y-auto font-mono text-[12px] leading-relaxed flex flex-col-reverse custom-scrollbar bg-black/20">
              {logs.map((l, i) => (
                <div key={i} className={`py-1 flex gap-6 ${l.includes('Error') || l.startsWith('ERROR') ? 'text-red-400' : 'text-neutral-400'}`}>
                  <span className="text-neutral-700 shrink-0 font-black">[{new Date().toLocaleTimeString()}]</span>
                  <span className="break-all">{l}</span>
                </div>
              ))}
              {logs.length === 0 && <div className="text-neutral-700 italic">Session logs will appear here...</div>}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-[480px] flex flex-col bg-[#0a0a0a] shrink-0 border-l border-white/5">
          <div className="flex h-12 border-b border-white/5 px-4 gap-6 items-center bg-neutral-900/30">
            {['emu', 'vfs'].map(t => (
              <button
                key={t}
                onClick={() => setSideTab(t as any)}
                className={`px-4 text-[11px] font-black uppercase h-full border-b-2 transition-all ${sideTab === t ? 'border-orange-500 text-white' : 'border-transparent text-neutral-500 hover:text-neutral-300'}`}
              >
                {t === 'emu' ? 'Emulator' : 'Filesystem'}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-hidden p-8 flex flex-col gap-8">
            {sideTab === 'emu' && (
              <div className="flex flex-col items-center h-full gap-10">
                <div className="bg-[#1a1a1a] rounded-[3.5rem] p-10 border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full relative group">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-neutral-800 px-6 py-1.5 rounded-full border border-white/5 text-[10px] font-black text-neutral-500 uppercase tracking-widest shadow-lg">LavaX Hardware v2.0</div>
                  <div className="bg-black p-6 rounded-3xl shadow-[inset_0_4px_30px_rgba(0,0,0,1)] border-b-4 border-black/50">
                    <div className="bg-[#94a187] rounded-md p-1.5 shadow-[inset_0_2px_15px_rgba(0,0,0,0.4)]">
                      <canvas ref={canvasRef} width={SCREEN_WIDTH} height={SCREEN_HEIGHT} className="pixelated w-full aspect-[2/1] brightness-[1.05] contrast-[1.1]" />
                    </div>
                  </div>
                  <div className="mt-10 flex justify-center"><SoftKeyboard onKeyPress={(k) => isRunning && vmRef.current.pushKey(k)} /></div>
                </div>

                <div className="grid grid-cols-2 gap-5 w-full mt-auto">
                  <div className="p-5 bg-white/5 rounded-3xl border border-white/5 flex flex-col gap-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2.5 text-[11px] font-black text-neutral-400 uppercase tracking-wider"><Info size={14} className="text-blue-400" /> HW Specs</div>
                    <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                      Screen: 160x80 Mono<br />
                      RAM: 64KB Managed<br />
                      CPU: 32-bit RISC Stack<br />
                      VFS: Persistent Storage
                    </p>
                  </div>
                  <div className="p-5 bg-white/5 rounded-3xl border border-white/5 flex flex-col gap-3 backdrop-blur-sm">
                    <div className="flex items-center gap-2.5 text-[11px] font-black text-neutral-400 uppercase tracking-wider"><HelpCircle size={14} className="text-amber-400" /> Controls</div>
                    <p className="text-[11px] text-neutral-500 font-medium leading-relaxed">
                      Enter: ↵ (0x0D)<br />
                      Esc: ESC (0x1B)<br />
                      Arrow keys mapped<br />
                      F1-F4: Extra Input
                    </p>
                  </div>
                </div>
              </div>
            )}
            {sideTab === 'vfs' && (
              <FileManager
                vm={vmRef.current}
                onRunLav={async (d) => {
                  vmRef.current.stop();
                  await new Promise(r => setTimeout(r, 150));
                  vmRef.current.load(d);
                  setSideTab('emu');
                  setIsRunning(true);
                  await vmRef.current.run();
                }}
                onDecompileLav={handleDecompile}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
