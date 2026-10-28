import React, { useState, useRef } from 'react';
import { Copy, Check, RotateCcw, Save } from 'lucide-react';

export interface CodeEditorProps {
  code: string;
  onChange: (newCode: string) => void;
  onReset?: () => void;
  onSave?: () => void;
  isModified?: boolean;
  filename?: string;
  language?: string;
  readOnly?: boolean;
  height?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onReset,
  onSave,
  isModified = false,
  filename,
  language = 'tsx',
  readOnly = false,
  height = '560px',
}) => {
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const lines = code.split('\n');
  const lineCount = lines.length;

  // Synchronize vertical scroll between textarea and line numbers gutter
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (readOnly) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      onSave?.();
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const val = textarea.value;
      const nextCode = val.substring(0, start) + '  ' + val.substring(end);
      onChange(nextCode);

      // Restore cursor position after state re-render
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs flex flex-col shadow-inner">
      {/* Editor Header Bar */}
      <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex justify-between items-center text-slate-400 select-none flex-wrap gap-2">
        <div className="flex items-center space-x-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-brand-500"></span>
          <span className="font-semibold text-slate-200">
            {filename || `generated-screen.${language}`}
          </span>
          {isModified && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-2 py-0.5 rounded font-mono font-medium">
              Modified
            </span>
          )}
          <span className="text-[11px] text-emerald-400/90 flex items-center space-x-1 pl-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Live Sync Active</span>
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-[#244A70] hover:bg-[#244A70] text-white font-semibold transition-colors shadow-sm"
              title="Save TSX code"
            >
              <Save className="w-4 h-4" />
              <span>Save Code</span>
            </button>
          )}

          {isModified && onReset && (
            <button
              onClick={onReset}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 border border-slate-700 transition-colors"
              title="Reset code back to the initial conversion output"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Code Editor Body */}
      <div className="relative flex flex-grow overflow-hidden" style={{ height }}>
        {/* Line Numbers Gutter */}
        <div
          ref={lineNumbersRef}
          aria-hidden="true"
          className="w-12 bg-slate-900/60 border-r border-slate-800/80 py-3 pr-2.5 select-none text-right font-mono text-slate-600 text-xs overflow-hidden"
          style={{ lineHeight: '1.5rem' }}
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className="h-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Editable Textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          readOnly={readOnly}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className="flex-grow p-3 bg-transparent text-slate-100 font-mono text-xs resize-none focus:outline-none overflow-auto leading-6 whitespace-pre tab-size-2 select-text"
          style={{
            lineHeight: '1.5rem',
            tabSize: 2,
          }}
          placeholder="// Paste or edit React TSX component here..."
        />
      </div>

      {/* Editor Footer Bar */}
      <div className="bg-slate-900/80 px-4 py-1.5 border-t border-slate-800 flex justify-between items-center text-[11px] text-slate-500 font-mono">
        <div className="flex items-center space-x-3">
          <span>Lines: {lineCount}</span>
          <span>Chars: {code.length}</span>
        </div>
        <div className="text-slate-400">
          Press <kbd className="px-1.5 py-0.5 bg-slate-800 rounded border border-slate-700 text-[10px]">Tab</kbd> for 2 spaces
        </div>
      </div>
    </div>
  );
};

export default CodeEditor;
