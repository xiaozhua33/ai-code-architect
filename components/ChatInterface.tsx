import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, RefreshCw, AlertCircle } from 'lucide-react';
import { Chat } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  chatSession: Chat | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ chatSession }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add initial greeting when session becomes available
  useEffect(() => {
    if (chatSession && messages.length === 0) {
      setMessages([{
        id: 'init',
        role: 'model',
        text: '我已经分析了您的代码和技术文档。您可以问我任何关于项目逻辑、数据结构或代码实现的问题。',
        timestamp: Date.now()
      }]);
    }
  }, [chatSession, messages.length]);

  const handleSend = async () => {
    if (!input.trim() || !chatSession || isSending) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSending(true);

    try {
      const result = await chatSession.sendMessage({ message: userMsg.text });
      const responseText = result.text;

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "无法生成回答，请重试。",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "**错误**: 发送消息失败，请检查网络或 API Key。",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!chatSession) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-4 p-8 text-center">
        <Bot size={48} className="opacity-20" />
        <p>请先生成文档，然后在此处与您的项目代码对话。</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {messages.map((msg) => (
          <div 
            key={msg.id} 
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-white" />
              </div>
            )}
            
            <div 
              className={`
                max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md
                ${msg.role === 'user' 
                  ? 'bg-slate-700 text-white rounded-br-none' 
                  : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-none prose prose-invert prose-sm max-w-none'}
              `}
            >
              {msg.role === 'user' ? (
                msg.text
              ) : (
                <ReactMarkdown
                  components={{
                    code({node, className, children, ...props}) {
                      const match = /language-(\w+)/.exec(className || '')
                      return match ? (
                        <div className="my-2 rounded bg-slate-950 border border-slate-700/50 overflow-hidden">
                          <div className="px-3 py-1 bg-slate-900 border-b border-slate-800 text-xs text-slate-500 font-mono">
                            {match[1]}
                          </div>
                          <code className="block p-3 text-xs overflow-x-auto" {...props}>
                            {children}
                          </code>
                        </div>
                      ) : (
                        <code className="bg-slate-900/50 px-1 py-0.5 rounded text-pink-300 font-mono text-xs" {...props}>
                          {children}
                        </code>
                      )
                    }
                  }}
                >
                  {msg.text}
                </ReactMarkdown>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center shrink-0 mt-1">
                <User size={16} className="text-white" />
              </div>
            )}
          </div>
        ))}
        
        {isSending && (
           <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-sky-600 flex items-center justify-center shrink-0 mt-1">
                <Bot size={16} className="text-white" />
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-bl-none px-4 py-3 flex items-center gap-2">
                 <RefreshCw size={14} className="animate-spin text-sky-400" />
                 <span className="text-xs text-slate-400">正在思考...</span>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-slate-800/50 border-t border-slate-700">
        <div className="relative flex items-end gap-2 bg-slate-900 border border-slate-700 rounded-xl p-2 focus-within:border-sky-500/50 focus-within:ring-1 focus-within:ring-sky-500/20 transition-all">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="问问关于代码实现细节或文档逻辑的问题..."
            className="w-full bg-transparent text-slate-200 text-sm placeholder:text-slate-500 resize-none outline-none max-h-32 min-h-[24px] py-1 px-1 custom-scrollbar"
            rows={Math.min(input.split('\n').length, 4)}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isSending}
            className={`
              p-2 rounded-lg transition-colors shrink-0
              ${!input.trim() || isSending 
                ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
                : 'bg-sky-600 text-white hover:bg-sky-500'}
            `}
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-center mt-2">
           <span className="text-[10px] text-slate-500">
             AI 回答基于文档与源码，仅供参考。
           </span>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
