import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  FileCode, 
  Bot, 
  Sparkles, 
  ArrowRight, 
  Copy, 
  Check, 
  Trash2,
  BookText,
  FolderUp,
  Loader2,
  FileText,
  MessageSquare,
  Key,
  X,
  Github,
  Save,
  Layers,
  Zap,
  Command,
  ChevronRight,
  Code2
} from 'lucide-react';
import { generateDocFromCode, createChatSession } from './services/geminiService';
import MarkdownViewer from './components/MarkdownViewer';
import ChatInterface from './components/ChatInterface';
import { AppState } from './types';
import { Chat } from "@google/genai";

// --- Types & Constants ---
interface FileItem {
  path: string;
  size: number;
}

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.idea', '.vscode'];
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.html', '.md', '.sql', '.prisma', '.py', '.go', '.rs'];

// --- Main Component ---
function App() {
  // Data State
  const [code, setCode] = useState<string>('');
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [docResult, setDocResult] = useState<string>('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  // UI State
  const [copied, setCopied] = useState(false);
  const [isReading, setIsReading] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'doc' | 'chat'>('doc');

  // Refs
  const chatSessionRef = useRef<Chat | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed
  const hasFiles = fileList.length > 0;

  // --- Effects ---
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) setHasApiKey(true);
  }, []);

  // --- Handlers ---

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      localStorage.setItem('gemini_api_key', apiKeyInput.trim());
      setHasApiKey(true);
      setIsKeyModalOpen(false);
      setApiKeyInput('');
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!code.trim()) return;
    
    const apiKey = localStorage.getItem('gemini_api_key');
    if (!apiKey) {
      setIsKeyModalOpen(true);
      return;
    }

    setAppState(AppState.GENERATING);
    setDocResult('');
    chatSessionRef.current = null;
    setActiveTab('doc');

    try {
      const markdown = await generateDocFromCode(apiKey, code);
      setDocResult(markdown);
      
      try {
        const session = await createChatSession(apiKey, code, markdown);
        chatSessionRef.current = session;
      } catch (chatErr) {
        console.error("Chat init warning:", chatErr);
      }

      setAppState(AppState.SUCCESS);
    } catch (error) {
      console.error(error);
      setDocResult(`**System Error:** \n\n${error instanceof Error ? error.message : 'Unknown error occurred.'}`);
      setAppState(AppState.ERROR);
    }
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(docResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClearWorkspace = () => {
    if (window.confirm("Are you sure you want to clear the workspace? This will remove all loaded files.")) {
      setCode('');
      setFileList([]);
      setDocResult('');
      setAppState(AppState.IDLE);
      chatSessionRef.current = null;
      setActiveTab('doc');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const processFiles = async (files: FileList) => {
    setIsReading(true);
    const validFiles: FileItem[] = [];
    let concatenatedCode = "";

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const path = file.webkitRelativePath || file.name;
        
        if (IGNORED_DIRS.some(dir => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`))) continue;
        const isAllowed = ALLOWED_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext));
        if (!isAllowed) continue;

        try {
          const content = await readFileContent(file);
          validFiles.push({ path, size: file.size });
          concatenatedCode += `--- START OF FILE ${path} ---\n${content}\n\n`;
        } catch (err) {
          console.warn(`Skipped ${path}`, err);
        }
      }

      setFileList(validFiles);
      setCode(concatenatedCode);
    } catch (error) {
      console.error("File processing failed:", error);
    } finally {
      setIsReading(false);
    }
  };

  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // --- Sub-Components (Render Helpers) ---

  const Header = () => (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 glass-panel border-b-0 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg shadow-lg shadow-indigo-500/20">
          <Layers className="text-white" size={20} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white tracking-tight leading-none">AI Code Architect</h1>
          <span className="text-[10px] text-slate-400 font-mono">v2.0 • Gemini 3.0 Pro</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => setIsKeyModalOpen(true)}
          className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all
            ${hasApiKey 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20' 
              : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'}
          `}
        >
          <Key size={12} />
          {hasApiKey ? "API Ready" : "Set API Key"}
        </button>
        <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-500 hover:text-white transition-colors">
          <Github size={20} />
        </a>
      </div>
    </header>
  );

  const LandingView = () => (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)] p-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="relative z-10 max-w-2xl w-full text-center space-y-8 animate-in fade-in zoom-in-95 duration-500">
        <div className="space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Turn Code into <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Architecture</span>
          </h2>
          <p className="text-slate-400 text-lg leading-relaxed max-w-lg mx-auto">
            Upload your React project. Get instant Mermaid diagrams, logic flows, and technical specs powered by Gemini 3.0.
          </p>
        </div>

        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group relative w-full h-64 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-900/50 hover:bg-slate-800/50 hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col items-center justify-center gap-4 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          
          {isReading ? (
            <div className="flex flex-col items-center gap-3">
               <Loader2 className="animate-spin text-indigo-400" size={40} />
               <span className="text-slate-400 font-medium">Scanning Project...</span>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-slate-800 group-hover:bg-indigo-600 group-hover:scale-110 transition-all duration-300 flex items-center justify-center shadow-2xl">
                <FolderUp size={28} className="text-slate-400 group-hover:text-white transition-colors" />
              </div>
              <div className="space-y-1">
                <p className="text-white font-semibold text-lg">Click to Upload Folder</p>
                <p className="text-slate-500 text-sm">Supports .ts, .tsx, .js, .css, .md</p>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-8 text-slate-500 text-xs font-medium uppercase tracking-widest">
           <span className="flex items-center gap-2"><Zap size={14} /> Instant Parse</span>
           <span className="flex items-center gap-2"><Bot size={14} /> AI Analysis</span>
           <span className="flex items-center gap-2"><Command size={14} /> Secure</span>
        </div>
      </div>
    </div>
  );

  const WorkbenchView = () => (
    <div className="flex h-[calc(100vh-64px)] w-full max-w-[1920px] mx-auto overflow-hidden animate-in fade-in duration-300">
      
      {/* Sidebar (VS Code Style) */}
      <aside className="w-80 bg-slate-950 border-r border-white/5 flex flex-col shrink-0 z-20">
        {/* Sidebar Header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-white/5 bg-slate-900/30">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Explorer</span>
          <div className="flex items-center gap-1">
             <button 
                onClick={handleClearWorkspace}
                className="p-1.5 hover:bg-red-500/20 text-slate-500 hover:text-red-400 rounded transition-colors"
                title="Clear Workspace"
              >
               <Trash2 size={14} />
             </button>
          </div>
        </div>

        {/* File List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
           <div className="space-y-0.5">
             {fileList.map((file, idx) => (
               <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-white/5 text-slate-400 hover:text-slate-200 cursor-default group transition-colors">
                  <FileCode size={14} className="text-indigo-500/70 shrink-0" />
                  <span className="text-xs font-mono truncate flex-1 opacity-80 group-hover:opacity-100">{file.path}</span>
                  <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100">{formatFileSize(file.size)}</span>
               </div>
             ))}
           </div>
        </div>

        {/* Sidebar Footer / Action */}
        <div className="p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-sm">
           <div className="flex items-center justify-between mb-3 text-xs text-slate-500">
             <span>{fileList.length} files loaded</span>
             <span>{formatFileSize(code.length)} total</span>
           </div>
           
           <button
             onClick={handleGenerate}
             disabled={appState === AppState.GENERATING}
             className={`
               w-full py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm transition-all shadow-lg
               ${appState === AppState.GENERATING
                 ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                 : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-indigo-500/25 active:scale-95'}
             `}
           >
             {appState === AppState.GENERATING ? (
               <>
                 <Loader2 size={16} className="animate-spin" />
                 Thinking...
               </>
             ) : (
               <>
                 <Sparkles size={16} />
                 Generate Specs
               </>
             )}
           </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col bg-slate-900 min-w-0 relative">
        {/* Top Tab Bar */}
        <div className="h-12 border-b border-white/5 bg-slate-950 flex items-center px-4 justify-between shrink-0">
          <div className="flex items-center bg-slate-900 rounded-lg p-1 border border-white/5">
            <button
              onClick={() => setActiveTab('doc')}
              className={`
                flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all
                ${activeTab === 'doc' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
              `}
            >
              <BookText size={14} />
              Documentation
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              disabled={appState !== AppState.SUCCESS}
              className={`
                flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-medium transition-all
                ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}
                ${appState !== AppState.SUCCESS ? 'opacity-50 cursor-not-allowed' : ''}
              `}
            >
              <MessageSquare size={14} />
              Assistant
            </button>
          </div>

          {activeTab === 'doc' && docResult && (
             <button onClick={handleCopy} className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded hover:bg-white/5 transition-colors">
               {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
               {copied ? 'Copied' : 'Copy'}
             </button>
          )}
        </div>

        {/* Viewport */}
        <div className="flex-1 overflow-hidden relative">
          {/* Empty State / Placeholder */}
          {appState === AppState.IDLE && !docResult && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 opacity-50 pointer-events-none">
                <Code2 size={64} strokeWidth={1} />
                <p className="mt-4 text-sm font-medium">Ready to Analyze</p>
             </div>
          )}

          {/* Loading Overlay */}
          {appState === AppState.GENERATING && (
             <div className="absolute inset-0 z-30 bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <div className="relative">
                   <div className="w-20 h-20 border-4 border-slate-800 rounded-full"></div>
                   <div className="absolute inset-0 w-20 h-20 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                   <Bot className="absolute inset-0 m-auto text-indigo-400" size={32} />
                </div>
                <p className="mt-6 text-indigo-300 font-medium animate-pulse">Deconstructing React Architecture...</p>
             </div>
          )}

          {/* Content */}
          {activeTab === 'doc' ? (
             <div className="h-full overflow-y-auto custom-scrollbar p-8 lg:px-12 bg-slate-900">
               {docResult ? <MarkdownViewer content={docResult} /> : null}
             </div>
          ) : (
             <ChatInterface chatSession={chatSessionRef.current} />
          )}
        </div>
      </main>
    </div>
  );

  const ApiKeyModal = () => {
    if (!isKeyModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 overflow-hidden">
          {/* Decor */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

          <button onClick={() => setIsKeyModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
            <X size={20} />
          </button>

          <div className="flex items-center gap-4 mb-6 relative z-10">
             <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                <Key size={24} className="text-indigo-400" />
             </div>
             <div>
                <h3 className="text-lg font-bold text-white">API Configuration</h3>
                <p className="text-xs text-slate-400">Gemini Pro 1.5/3.0 Access</p>
             </div>
          </div>

          <div className="space-y-4 relative z-10">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Google AI Studio Key</label>
              <input 
                type="password"
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full mt-2 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-700"
              />
            </div>
            
            <div className="flex items-start gap-2 p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
               <Zap size={14} className="text-indigo-400 mt-0.5 shrink-0" />
               <p className="text-[10px] leading-relaxed text-indigo-200/70">
                 Your key is stored strictly in your browser's <code>localStorage</code>. It is never transmitted to our servers, only directly to Google's API.
               </p>
            </div>

            <button 
              onClick={handleSaveApiKey}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    );
  };

  // --- Render ---
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-200 selection:bg-indigo-500/30">
      
      {/* Hidden Input for File Upload */}
      <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) processFiles(e.target.files);
          }}
      />

      <Header />

      <div className="pt-16 h-screen">
        {!hasFiles ? <LandingView /> : <WorkbenchView />}
      </div>

      <ApiKeyModal />
    </div>
  );
}

export default App;