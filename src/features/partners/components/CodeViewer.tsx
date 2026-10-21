import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CodeViewerProps {
  code: string;
  language?: string;
  filename?: string;
  maxHeight?: string;
}

export const CodeViewer: React.FC<CodeViewerProps> = ({
  code,
  language = 'text',
  filename,
  maxHeight = '420px',
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split('\n');

  return (
    <div className="rounded-xl border border-[#D9E2EC] bg-[#091E42] text-[#F4F5F7] overflow-hidden font-mono text-xs shadow-sm">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#020817] border-b border-white/10">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          {filename && <span className="text-gray-300 font-medium ml-2">{filename}</span>}
          <span className="text-[10px] text-gray-400 uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10">
            {language}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center space-x-1 text-xs text-gray-300 hover:text-white bg-white/5 hover:bg-white/15 px-2.5 py-1 rounded transition-colors"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-sans">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body with Line Numbers */}
      <div
        className="overflow-auto p-4 flex text-xs leading-relaxed"
        style={{ maxHeight }}
      >
        <div className="select-none text-gray-500 text-right pr-4 border-r border-white/10 min-w-[32px]">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <pre className="pl-4 text-[#E2E8F0] overflow-x-auto font-mono flex-1">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
