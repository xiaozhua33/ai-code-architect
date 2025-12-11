import React from 'react';
import ReactMarkdown from 'react-markdown';
import MermaidDiagram from './MermaidDiagram';

interface MarkdownViewerProps {
  content: string;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ content }) => {
  return (
    <div className="prose prose-invert prose-slate max-w-none">
      <ReactMarkdown
        components={{
          code(props) {
            const { children, className, node, ...rest } = props;
            const match = /language-(\w+)/.exec(className || '');
            const isMermaid = match && match[1] === 'mermaid';

            if (isMermaid) {
              return <MermaidDiagram chart={String(children).replace(/\n$/, '')} />;
            }

            return match ? (
              <div className="bg-slate-950 rounded-lg overflow-hidden my-4 border border-slate-800">
                <div className="px-4 py-1 bg-slate-900 border-b border-slate-800 text-xs text-slate-400 font-mono">
                  {match[1]}
                </div>
                <div className="p-4 overflow-x-auto">
                  <code {...rest} className={`${className} bg-transparent p-0 text-sm`}>
                    {children}
                  </code>
                </div>
              </div>
            ) : (
              <code {...rest} className={`${className} bg-slate-800 px-1 py-0.5 rounded text-sm text-pink-300`}>
                {children}
              </code>
            );
          },
          // Custom styling for other elements
          h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-sky-400 mt-8 mb-4 border-b border-slate-700 pb-2" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-2xl font-semibold text-sky-300 mt-8 mb-4" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-xl font-medium text-sky-200 mt-6 mb-3" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc list-outside ml-6 space-y-1 text-slate-300" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-6 space-y-1 text-slate-300" {...props} />,
          p: ({node, ...props}) => <p className="leading-7 text-slate-300 mb-4" {...props} />,
          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-sky-500 pl-4 italic text-slate-400 my-4" {...props} />,
          table: ({node, ...props}) => <div className="overflow-x-auto my-6"><table className="min-w-full divide-y divide-slate-700 border border-slate-700" {...props} /></div>,
          thead: ({node, ...props}) => <thead className="bg-slate-800" {...props} />,
          th: ({node, ...props}) => <th className="px-4 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider" {...props} />,
          td: ({node, ...props}) => <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-400 border-b border-slate-700" {...props} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownViewer;