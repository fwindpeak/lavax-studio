
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './index.css';
import { createRoot } from 'react-dom/client';
import {
  Play, Square, FileCode, Monitor, FolderOpen, Terminal as TerminalIcon,
  Settings, KeyRound, Save, Download, Trash2, Cpu, Braces, Binary, SearchCode, Zap, Bug
} from 'lucide-react';
import { FileManager } from './components/FileManager';
import { Terminal as LavaTerminal } from './components/Terminal';
import { useLavaVM } from './hooks/useLavaVM';
import { Editor } from './components/Editor';
import { Device } from './components/Device';
import { LavaXDecompiler } from './decompiler';

function highlightCode(code: string) {
  const keywords = /\b(int|char|long|void|if|else|while|for|return|goto|break|continue|addr)\b/g;
  const strings = /("[^"]*")/g;
  const comments = /(\/\/.*|\/\*[\s\S]*?\*\/)/g;
  const sysfuncs = /\b(putchar|getchar|printf|strcpy|strlen|SetScreen|UpdateLCD|Delay|WriteBlock|Refresh|TextOut|Block|Rectangle|Exit|ClearScreen|abs|rand|srand|Locate|Inkey|Point|GetPoint|Line|Box|Circle|Ellipse|Beep|isalnum|isalpha|iscntrl|isdigit|isgraph|islower|isprint|ispunct|isspace|isupper|isxdigit|strcat|strchr|strcmp|strstr|tolower|toupper|memset|memcpy|fopen|fclose|fread|fwrite|fseek|ftell|feof|rewind|fgetc|fputc|sprintf|MakeDir|DeleteFile|Getms|CheckKey|memmove|Sin|Cos|FillArea|SetGraphMode|SetBgColor|SetFgColor|GetTime|Math)\b/g;

  return (
    <span dangerouslySetInnerHTML={{
      __html: code
        .replace(comments, '<span class="text-gray-500">$1</span>')
        .replace(strings, '<span class="text-green-400">$1</span>')
        .replace(keywords, '<span class="text-purple-400 font-bold">$1</span>')
        .replace(sysfuncs, '<span class="text-blue-300">$1</span>')
    }} />
  );
}

const DEFAULT_CODE = `void main() {
  SetScreen(1);
  printf(1, "Hello, LavaX!\\n");
  int i;
  for (i = 0; i < 5; i = i + 1) {
    printf(1, "Loop: %d\\n", i);
  }
  
  Line(0, 0, 159, 79, 1);
  Circle(80, 40, 30, 0, 1);
  
  printf(1, "Press any key...\\n");
  getchar();
}`;

export function App() {
  const [code, setCode] = useState(() => localStorage.getItem('lavax_code') || DEFAULT_CODE);
  const [asm, setAsm] = useState("");
  const [lav, setLav] = useState<Uint8Array>(new Uint8Array(0));
  const [activeTab, setActiveTab] = useState<'editor' | 'asm' | 'hex' | 'vfs'>('editor');
  const [rightTab, setRightTab] = useState<'emulator' | 'files'>('emulator');
  const [debugMode, setDebugMode] = useState(false);

  const { running, logs, screen, compile, run, stop, pushKey, vm, setLogs, clearLogs } = useLavaVM(() => { });
  const decompiler = useMemo(() => new LavaXDecompiler(), []);

  useEffect(() => {
    localStorage.setItem('lavax_code', code);
  }, [code]);

  useEffect(() => {
    vm.debug = debugMode;
  }, [debugMode, vm]);

  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    const pre = target.previousSibling as HTMLPreElement;
    if (pre) {
      pre.scrollTop = target.scrollTop;
      pre.scrollLeft = target.scrollLeft;
    }
  };

  const lineCount = code.split('\n').length;
  const highlightedCode = useMemo(() => highlightCode(code), [code]);

  const build = useCallback(() => {
    const res = compile(code);
    if (res.bin) {
      setAsm(res.asm);
      setLav(res.bin);
    }
    return res.bin;
  }, [code, compile]);

  const handleRun = async () => {
    const bin = build();
    if (bin) {
      setRightTab('emulator');
      await run(bin);
    }
  };

  const handleDecompile = (data?: Uint8Array) => {
    const target = data || lav;
    if (!target || target.length === 0) { setLogs(p => [...p, "Error: No binary to decompile."]); return; }
    if (data) setLav(data);
    const recoveredCode = decompiler.decompile(target);
    const disassembledAsm = decompiler.disassemble(target);
    setCode(recoveredCode);
    setAsm(disassembledAsm);
    setActiveTab('editor');
    setLogs(p => [...p, "Decompiler: Source recovered."]);
  };

  const terminalLogs = useMemo(() => logs.map(l => ({ text: l, time: new Date().toLocaleTimeString() })), [logs]);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0c] text-slate-100 font-sans selection:bg-purple-500/30 overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-white/5 bg-black/40 backdrop-blur-xl flex items-center justify-between px-6 z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Cpu className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              LavStudio <span className="text-xs font-mono text-purple-400/80 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 ml-1">v0x12</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest leading-none mt-1">LavaX VM Integrated Environment</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button onClick={() => handleDecompile()} className="text-[11px] font-bold text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-400/20 bg-blue-400/5 transition-all active:scale-95 flex items-center gap-2">
            <SearchCode size={14} /> RECOVER
          </button>
          <div className="flex items-center gap-2">
            {!running ? (
              <button
                onClick={handleRun}
                className="flex items-center gap-2 px-5 py-2 bg-white text-black rounded-xl font-bold hover:bg-slate-200 active:scale-95 transition-all shadow-lg shadow-white/5 group"
              >
                <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" /> START
              </button>
            ) : (
              <button
                onClick={stop}
                className="flex items-center gap-2 px-5 py-2 bg-red-500/10 text-red-400 rounded-xl font-bold hover:bg-red-500/20 active:scale-95 transition-all border border-red-500/20"
              >
                <Square className="w-4 h-4 fill-current animate-pulse" /> STOP
              </button>
            )}
            <button
              onClick={() => setDebugMode(!debugMode)}
              className={`p-2 rounded-xl border transition-all ${debugMode ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'text-slate-400 hover:text-white hover:bg-white/5 border-transparent'}`}
              title="Debug Mode"
            >
              <Bug className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Panel: Editor & Tabs */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-white/5">
          {/* Editor Tabs */}
          <div className="h-12 border-b border-white/5 bg-black/20 flex items-center px-4 gap-1">
            <button onClick={() => setActiveTab('editor')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'editor' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              Source
            </button>
            <button onClick={() => setActiveTab('asm')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'asm' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              Assembly
            </button>
            <button onClick={() => setActiveTab('hex')} className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'hex' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              Binary
            </button>
          </div>

          {/* Editor Content Area */}
          <div className="flex-1 overflow-hidden p-6 relative">
            {activeTab === 'editor' && (
              <Editor
                code={code}
                onChange={setCode}
                onScroll={handleEditorScroll}
                highlightedCode={highlightedCode}
                lineCount={lineCount}
              />
            )}
            {activeTab === 'asm' && (
              <div className="h-full overflow-auto bg-black/40 border border-white/10 rounded-xl p-8 font-mono text-sm text-blue-300 leading-relaxed custom-scrollbar">
                {asm || "// Compile or Recover to see assembly"}
              </div>
            )}
            {activeTab === 'hex' && (
              <div className="h-full overflow-auto bg-black/40 border border-white/10 rounded-xl p-6 font-mono text-[12px] custom-scrollbar">
                {lav.length === 0 ? <div className="text-slate-500 italic p-10 text-center uppercase tracking-widest font-black opacity-30">No binary data available</div> :
                  <div className="grid grid-cols-[5rem_repeat(16,2.2rem)_1fr] gap-x-1 gap-y-1.5">
                    <span className="text-slate-600 font-black">OFFSET</span>
                    {[...Array(16)].map((_, i) => <span key={i} className="text-slate-500 font-black text-center">{i.toString(16).toUpperCase()}</span>)}
                    <span className="text-slate-600 ml-8">ASCII</span>
                    {(Array.from(lav) as number[]).reduce((acc: any[], b: number, i: number) => {
                      if (i % 16 === 0) acc.push(<span key={`off-${i}`} className="text-purple-500/50 font-black">{(i).toString(16).padStart(4, '0').toUpperCase()}</span>);
                      acc.push(<span key={`hex-${i}`} className="text-slate-400 hover:text-white transition-colors cursor-default text-center">{b.toString(16).padStart(2, '0').toUpperCase()}</span>);
                      if ((i + 1) % 16 === 0 || i === lav.length - 1) {
                        const startIdx = i - (i % 16);
                        const chunk = lav.slice(startIdx, i + 1);
                        const ascii = (Array.from(chunk) as number[]).map((byte: number) => (byte >= 32 && byte <= 126) ? String.fromCharCode(byte) : '.').join('');
                        acc.push(<span key={`asc-${i}`} className="text-slate-600 ml-8 tracking-widest">{ascii}</span>);
                      }
                      return acc;
                    }, [])}
                  </div>}
              </div>
            )}
          </div>

          {/* Bottom Console */}
          <div className="h-64 border-t border-white/5 flex flex-col overflow-hidden">
            <div className="h-10 bg-black/40 border-b border-white/5 flex items-center px-6 justify-between shrink-0">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-500">
                <TerminalIcon size={12} /> System Console
              </div>
              <button onClick={clearLogs} className="text-[10px] font-black text-white/20 hover:text-red-400 transition-colors uppercase tracking-widest">
                Clear
              </button>
            </div>
            <div className="flex-1 overflow-hidden flex flex-col">
              <LavaTerminal logs={terminalLogs} onClear={clearLogs} onLog={(msg) => setLogs(p => [...p, msg])} />
            </div>
          </div>
        </div>

        {/* Right Panel: Device & VFS */}
        <div className="w-[500px] flex flex-col bg-black/20 shrink-0">
          {/* Sidebar Tabs */}
          <div className="h-12 border-b border-white/5 bg-black/20 flex items-center px-4 gap-1">
            <button onClick={() => setRightTab('emulator')} className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${rightTab === 'emulator' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              Hardware
            </button>
            <button onClick={() => setRightTab('files')} className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${rightTab === 'files' ? 'bg-white/10 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}>
              FileSystem
            </button>
          </div>

          <div className="flex-1 overflow-auto p-8 flex flex-col relative custom-scrollbar">
            {rightTab === 'emulator' ? (
              <Device
                screen={screen}
                onKeyPress={pushKey}
                onStop={stop}
                isRunning={running}
              />
            ) : (
              <FileManager
                vm={vm}
                onRunLav={async (data) => {
                  setLav(data);
                  setRightTab('emulator');
                  await run(data);
                }}
                onDecompileLav={handleDecompile}
              />
            )}
          </div>
        </div>
      </main>

      <footer className="h-10 border-t border-white/5 bg-black/80 px-8 flex items-center justify-between text-[10px] text-slate-500 font-mono tracking-wider">
        <div className="flex gap-8">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${running ? 'bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-neutral-700'}`}></div>
            {running ? 'SYSTEM RUNNING' : 'SYSTEM IDLE'}
          </div>
          <div>LEN: {lineCount}</div>
          <div>MODE: {debugMode ? 'DEBUG' : 'PROD'}</div>
        </div>
        <div className="flex gap-6">
          <div className="flex items-center gap-1.5"><Monitor size={12} /> 160x80 MONO</div>
          <div className="flex items-center gap-1.5"><Cpu size={12} /> LAVA CORE v1.2</div>
        </div>
      </footer>
    </div>
  );
}

const container = document.getElementById('root');
if (container) {
  const root = (container as any)._reactRoot || createRoot(container);
  (container as any)._reactRoot = root;
  root.render(<App />);
}
