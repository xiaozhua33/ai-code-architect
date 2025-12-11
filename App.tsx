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
  Save
} from 'lucide-react';
import { generateDocFromCode, createChatSession } from './services/geminiService';
import MarkdownViewer from './components/MarkdownViewer';
import ChatInterface from './components/ChatInterface';
import { AppState } from './types';
import { Chat } from "@google/genai";

interface FileItem {
  path: string;
  size: number;
}

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', 'coverage'];
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss', '.html', '.md', '.sql', '.prisma'];

function App() {
  const [code, setCode] = useState<string>('');
  const [fileList, setFileList] = useState<FileItem[]>([]);
  const [docResult, setDocResult] = useState<string>('');
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [copied, setCopied] = useState(false);
  const [isReading, setIsReading] = useState(false);
  
  // API Key State
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<'doc' | 'chat'>('doc');
  const chatSessionRef = useRef<Chat | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check for API Key on mount (Strict BYOK: Only check localStorage)
  useEffect(() => {
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey) {
      setHasApiKey(true);
    }
  }, []);

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
    
    // Retrieve Key Explicitly (Strict BYOK: Only from LocalStorage)
    const apiKey = localStorage.getItem('gemini_api_key');

    // Check key before generating
    if (!apiKey) {
      setIsKeyModalOpen(true);
      return;
    }

    setAppState(AppState.GENERATING);
    setDocResult('');
    chatSessionRef.current = null; // Reset chat session
    
    // Ensure we are viewing doc tab while generating
    setActiveTab('doc');

    try {
      // 1. Generate Documentation
      const markdown = await generateDocFromCode(apiKey, code);
      setDocResult(markdown);
      
      // 2. Create Chat Session immediately with Code + Doc context
      try {
        const session = await createChatSession(apiKey, code, markdown);
        chatSessionRef.current = session;
      } catch (chatErr) {
        console.error("Failed to initialize chat session:", chatErr);
        // We don't fail the whole process if chat init fails, just log it
      }

      setAppState(AppState.SUCCESS);
    } catch (error) {
      console.error(error);
      setDocResult(`**Error generating documentation:** \n\n${error instanceof Error ? error.message : 'Unknown error'}`);
      setAppState(AppState.ERROR);
    }
  }, [code]);

  const handleCopy = () => {
    navigator.clipboard.writeText(docResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setCode('');
    setFileList([]);
    setDocResult('');
    setAppState(AppState.IDLE);
    chatSessionRef.current = null;
    setActiveTab('doc');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
        
        // Skip ignored directories
        if (IGNORED_DIRS.some(dir => path.includes(`/${dir}/`) || path.startsWith(`${dir}/`))) {
          continue;
        }

        // Check extension
        const isAllowed = ALLOWED_EXTENSIONS.some(ext => path.toLowerCase().endsWith(ext));
        if (!isAllowed) continue;

        try {
          const content = await readFileContent(file);
          validFiles.push({ path, size: file.size });
          concatenatedCode += `--- START OF FILE ${path} ---\n${content}\n\n`;
        } catch (err) {
          console.warn(`Failed to read file ${path}`, err);
        }
      }

      setFileList(validFiles);
      setCode(concatenatedCode);
    } catch (error) {
      console.error("Error processing files:", error);
      alert("Failed to process some files.");
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-200">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-[1600px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-600 rounded-lg shadow-lg shadow-sky-900/20">
              <Bot className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight">AI Code Architect</h1>
              <p className="text-xs text-slate-400 hidden sm:block">Deep Spec Generation & Context-Aware Chat</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
             {/* API Key Button */}
             <button
              onClick={() => setIsKeyModalOpen(true)}
              className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                ${hasApiKey 
                  ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20' 
                  : 'bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'}
              `}
            >
              <Key size={14} />
              {hasApiKey ? "API Key Set" : "Set API Key"}
              {hasApiKey && <Check size={12} className="ml-1" />}
            </button>

            <a href="https://github.com" target="_blank" rel="noreferrer" className="text-slate-400 hover:text-white transition-colors">
              <Github size={20} />
            </a>

            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-400">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               Gemini 3.0 Pro Powered
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full p-4 gap-6 flex flex-col lg:flex-row h-[calc(100vh-64px)]">
        
        {/* Left Panel: Code Input */}
        <div className="flex-1 flex flex-col min-h-[500px] lg:h-full bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 text-sky-400 font-medium">
              <FileCode size={18} />
              <h2>Project Files</h2>
            </div>
            <div className="flex gap-2">
               {fileList.length > 0 && (
                 <button 
                  onClick={handleClear}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700/50 rounded-md transition-colors"
                  title="Clear All"
                >
                  <Trash2 size={16} />
                </button>
               )}
            </div>
          </div>
          
          <div className="flex-1 relative group flex flex-col">
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              // @ts-ignore - webkitdirectory is standard
              webkitdirectory=""
              directory=""
              multiple
              onChange={handleFileChange}
            />

            {fileList.length === 0 ? (
              <div 
                onClick={triggerUpload}
                className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-700 hover:border-sky-500/50 hover:bg-slate-800/50 transition-all cursor-pointer m-4 rounded-xl gap-4 group/upload"
              >
                {isReading ? (
                   <div className="flex flex-col items-center gap-3">
                     <Loader2 className="animate-spin text-sky-500" size={48} />
                     <p className="text-slate-400 font-medium">Reading files...</p>
                   </div>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-slate-800 group-hover/upload:bg-sky-900/30 flex items-center justify-center transition-colors">
                      <FolderUp size={32} className="text-slate-400 group-hover/upload:text-sky-400" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-slate-200">Upload Project Folder</h3>
                      <p className="text-sm text-slate-500 mt-1">Click to select your React project root</p>
                    </div>
                    <div className="flex gap-2 mt-2">
                       <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-500">.tsx</span>
                       <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-500">.ts</span>
                       <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-500">.js</span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-2">
                <div className="flex items-center justify-between px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>File Name</span>
                  <span>Size</span>
                </div>
                <div className="space-y-1">
                  {fileList.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between px-4 py-2 bg-slate-800/30 rounded border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText size={14} className="text-sky-500/70 shrink-0" />
                        <span className="text-sm text-slate-300 font-mono truncate" title={file.path}>
                          {file.path}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-mono shrink-0 ml-4">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Action Bar */}
            <div className="absolute bottom-6 right-6 flex items-center gap-3 z-10">
              {fileList.length > 0 && (
                <span className="text-xs text-slate-500 font-mono bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800 backdrop-blur-sm">
                  {fileList.length} files loaded
                </span>
              )}
              <button
                onClick={handleGenerate}
                disabled={fileList.length === 0 || appState === AppState.GENERATING}
                className={`
                  flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-white shadow-lg transition-all
                  ${fileList.length === 0 || appState === AppState.GENERATING
                    ? 'bg-slate-700 cursor-not-allowed text-slate-400' 
                    : 'bg-sky-600 hover:bg-sky-500 hover:shadow-sky-500/25 active:transform active:scale-95'}
                `}
              >
                {appState === AppState.GENERATING ? (
                  <>
                    <Sparkles size={18} className="animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Generate Docs
                    <ArrowRight size={18} className="opacity-75" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Doc / Chat */}
        <div className="flex-1 flex flex-col min-h-[500px] lg:h-full bg-slate-800/30 rounded-xl border border-slate-700 overflow-hidden shadow-sm">
          <div className="px-4 py-2 border-b border-slate-700 bg-slate-800/80 flex items-center justify-between min-h-[52px]">
            {/* Tabs */}
            <div className="flex gap-1">
              <button
                onClick={() => setActiveTab('doc')}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'doc' 
                    ? 'bg-slate-700 text-sky-400 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <BookText size={16} />
                Documentation
              </button>
              <button
                onClick={() => setActiveTab('chat')}
                disabled={appState !== AppState.SUCCESS}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'chat' 
                    ? 'bg-slate-700 text-sky-400 shadow-sm' 
                    : appState !== AppState.SUCCESS 
                      ? 'text-slate-600 cursor-not-allowed' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'
                }`}
              >
                <MessageSquare size={16} />
                Chat with Project
              </button>
            </div>

            {/* Actions (Only visible in Doc tab and when we have result) */}
            {activeTab === 'doc' && docResult && (
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-md transition-colors"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy Markdown'}
              </button>
            )}
          </div>

          <div className="flex-1 overflow-hidden bg-slate-900 relative">
            {/* LOADING STATE */}
            {appState === AppState.GENERATING && (
              <div className="h-full flex flex-col items-center justify-center gap-6 absolute inset-0 z-20 bg-slate-900">
                <div className="relative w-20 h-20">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-800"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-sky-500 border-t-transparent animate-spin"></div>
                  <Bot className="absolute inset-0 m-auto text-sky-500" size={32} />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-medium text-white">Analyzing Code Structure</h3>
                  <p className="text-sm text-slate-400 max-w-xs">
                    Reverse engineering database schema and mapping logic flows...
                  </p>
                </div>
              </div>
            )}

            {/* IDLE STATE */}
            {appState === AppState.IDLE && !docResult && (
               <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                   <ArrowRight size={32} className="opacity-20" />
                </div>
                <p>Upload a project folder to generate documentation</p>
              </div>
            )}

            {/* CONTENT */}
            {activeTab === 'doc' ? (
              <div className="h-full overflow-y-auto p-6 custom-scrollbar">
                {(appState === AppState.SUCCESS || appState === AppState.ERROR) && (
                  <MarkdownViewer content={docResult} />
                )}
              </div>
            ) : (
              <ChatInterface chatSession={chatSessionRef.current} />
            )}
          </div>
        </div>

        {/* API KEY MODAL */}
        {isKeyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6 m-4 relative animate-in zoom-in-95 duration-200">
              <button 
                onClick={() => setIsKeyModalOpen(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-slate-800 rounded-lg">
                  <Key size={24} className="text-sky-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Set Gemini API Key</h3>
                  <p className="text-sm text-slate-400">Enter your key to enable generation.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide">
                    API Key
                  </label>
                  <input 
                    type="password" 
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-slate-200 focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>

                <div className="bg-slate-800/50 rounded-lg p-3 text-xs text-slate-400 flex gap-2">
                   <Check size={14} className="shrink-0 text-sky-500 mt-0.5" />
                   <p>Key is stored locally in your browser's localStorage. It is never sent to any other server.</p>
                </div>

                <button
                  onClick={handleSaveApiKey}
                  className="w-full bg-sky-600 hover:bg-sky-500 text-white font-semibold py-3 rounded-lg shadow-lg shadow-sky-900/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Save API Key
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;