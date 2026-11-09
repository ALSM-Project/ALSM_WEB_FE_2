import React, { useState, useMemo } from 'react';
import { parseConvertedTsx } from '../utils/screenGenerator';
import { Sliders, Terminal, RotateCcw } from 'lucide-react';

interface LiveTsxRendererProps {
  tsxCode: string;
  screenName: string;
  onEditMapping?: () => void;
  metadata?: any;
}

interface TerminalLabel {
  row: number;
  col: number;
  length?: number;
  initial?: string;
  name?: string;
  color?: string;
  isBright?: boolean;
}

interface TerminalInput {
  row: number;
  col: number;
  length?: number;
  name: string;
  defaultValue?: string;
  color?: string;
  isDark?: boolean;
  readOnly?: boolean;
}

interface TerminalData {
  gridRows: number;
  gridCols: number;
  labels: TerminalLabel[];
  inputs: TerminalInput[];
  functionKeys: string[];
}

function get3270ColorClass(_color?: string, isBright?: boolean): string {
  // Authentic IBM 3270 Monochrome Green Phosphor (Zero multi-color noise)
  if (isBright) {
    return 'text-[#86efac] font-bold drop-shadow-[0_0_2px_rgba(74,222,128,0.4)]';
  }
  return 'text-[#00dd00]';
}

/**
 * Formats label or output placeholder text so it NEVER overflows its available
 * column space on the 3270 character grid. For bracketed placeholders like "[AUTHRSP]",
 * it abbreviates using the distinguishing suffix (e.g. "[R]", "[MTC]", "[ST]") to fit
 * cleanly within available space without overlapping adjacent screen elements.
 */
function formatLabelDisplayText(rawText: string, maxSpace: number): string {
  if (!rawText || maxSpace <= 0) return '';
  if (rawText.length <= maxSpace) return rawText;

  // Leave 1 space gap if maxSpace > 2
  const targetLen = maxSpace > 2 ? maxSpace - 1 : maxSpace;

  if (rawText.startsWith('[') && rawText.endsWith(']') && rawText.length > 2) {
    const inner = rawText.slice(1, -1);
    const availableInner = targetLen - 2; // room for '[' and ']'
    if (availableInner >= 1) {
      // Mainframe naming convention: distinguishing suffix (e.g. AUTHRSP -> R, AUTHMTC -> MTC, MERST -> ST)
      const shortInner = inner.length > availableInner ? inner.slice(-availableInner) : inner;
      return `[${shortInner}]`;
    }
    return inner.slice(0, targetLen);
  }

  return rawText.slice(0, targetLen);
}

/**
 * Extracts grid layout (rows, columns, spans), labels, input controls,
 * attributes (readonly, password, length), and function keys directly
 * from converted or user-edited React TSX code.
 */
function parseTerminalFromTsx(
  tsxCode: string,
  bundle?: { fields: Array<{ name: string; label: string; defaultValue?: string }> }
): TerminalData {
  const labels: TerminalLabel[] = [];
  const inputs: TerminalInput[] = [];
  const functionKeys: string[] = [];

  const parseStyle = (styleStr: string): { row?: number; col?: number; length?: number } => {
    let row: number | undefined;
    let col: number | undefined;
    let length: number | undefined;

    const rowMatch = styleStr.match(/gridRow\s*:\s*['"]?(\d+)['"]?/);
    if (rowMatch) row = parseInt(rowMatch[1], 10);

    const colMatch = styleStr.match(/gridColumn\s*:\s*['"]?(\d+)(?:\s*\/\s*span\s*(\d+))?['"]?/);
    if (colMatch) {
      col = parseInt(colMatch[1], 10);
      if (colMatch[2]) length = parseInt(colMatch[2], 10);
    }
    return { row, col, length };
  };

  const extractColor = (attrStr: string): string => {
    if (attrStr.includes('text-blue')) return 'BLUE';
    if (attrStr.includes('text-yellow')) return 'YELLOW';
    if (attrStr.includes('text-red')) return 'RED';
    if (attrStr.includes('text-cyan') || attrStr.includes('text-turquoise')) return 'CYAN';
    if (attrStr.includes('text-pink')) return 'PINK';
    if (attrStr.includes('text-slate') || attrStr.includes('text-neutral') || attrStr.includes('text-white')) return 'NEUTRAL';
    if (attrStr.includes('text-green') || attrStr.includes('text-emerald')) return 'GREEN';
    return 'GREEN';
  };

  // 1. Parse all <span ...>...</span>
  const spanTagRegex = /<span\s+([^>]*?)>([\s\S]*?)<\/span>/gi;
  let spanMatch: RegExpExecArray | null;
  while ((spanMatch = spanTagRegex.exec(tsxCode)) !== null) {
    const rawAttrs = spanMatch[1];
    const rawContent = spanMatch[2];

    const styleMatch = rawAttrs.match(/style=\{\{([\s\S]*?)\}\}/);
    if (!styleMatch) continue;

    const { row, col, length } = parseStyle(styleMatch[1]);
    if (!row || !col) continue;

    // Extract text content
    let initial = '';
    const literalMatch = rawContent.match(/\{['"]([\s\S]*?)['"]\}/);
    const exprMatch = rawContent.match(/\{\s*(?:[a-zA-Z0-9_.]+\.)?([a-zA-Z0-9_]+)\s*(?:\?\?|\|\|)[\s\S]*?\}/);
    if (literalMatch) {
      initial = literalMatch[1];
    } else if (exprMatch) {
      // Dynamic output fields (e.g. receivedData.curdate, receivedData.curtime, receivedData.fname)
      // In authentic BMS terminal: dynamic runtime fields are ALWAYS blank on the screen map
      initial = '';
    } else {
      const varMatch = rawContent.match(/\{([a-zA-Z0-9_.]+)\}/);
      if (varMatch) {
        // Simple variable reference without fallback — blank on real BMS terminal
        initial = '';
      } else {
        initial = rawContent.replace(/<[^>]+>/g, '').trim();
      }
    }

    const color = extractColor(rawAttrs);
    const isBright =
      rawAttrs.includes('font-semibold') ||
      rawAttrs.includes('font-bold') ||
      rawAttrs.includes('text-slate') ||
      rawAttrs.includes('text-neutral') ||
      rawAttrs.includes('text-white') ||
      color === 'NEUTRAL' ||
      color === 'WHITE' ||
      initial === 'Delete User' ||
      (initial.startsWith('===') && initial.endsWith('==='));

    // Keep all spans in labels so they render with exact positions, colors, and line tracks
    labels.push({ row, col, length: length || initial.length || 1, initial, color, isBright });

    if (
      initial.includes('=') &&
      (initial.includes('ENTER') ||
        initial.includes('F') ||
        initial.includes('PF') ||
        initial.includes('PA') ||
        initial.includes('CLEAR'))
    ) {
      functionKeys.push(initial);
    }
  }

  // 2. Parse all <input ... /> or <input ...>
  const inputTagRegex = /<input\s+([^>]*?)(?:\/>|>)/gi;
  let inputMatch: RegExpExecArray | null;
  while ((inputMatch = inputTagRegex.exec(tsxCode)) !== null) {
    const rawAttrs = inputMatch[1];

    const styleMatch = rawAttrs.match(/style=\{\{([\s\S]*?)\}\}/);
    if (!styleMatch) continue;

    const { row, col, length: styleLength } = parseStyle(styleMatch[1]);
    if (!row || !col) continue;

    const idMatch = rawAttrs.match(/(?:id|name)=['"]([^'"]+)['"]/i);
    const name = idMatch ? idMatch[1].toLowerCase() : `field_${row}_${col}`;

    const maxLenMatch = rawAttrs.match(/maxLength=\{?['"]?(\d+)['"]?\}?/i);
    const length = maxLenMatch ? parseInt(maxLenMatch[1], 10) : (styleLength || 10);

    const isPassword = /type=['"]password['"]/i.test(rawAttrs);
    const isReadOnly = /\breadOnly\b/i.test(rawAttrs) || /\bdisabled\b/i.test(rawAttrs);
    const color = extractColor(rawAttrs);

    inputs.push({
      row,
      col,
      length,
      name,
      isDark: isPassword,
      readOnly: isReadOnly,
      color,
    });
  }

  // 3. Fallback to bundle fields if neither span nor input with styles were found
  if (labels.length === 0 && inputs.length === 0 && bundle && bundle.fields.length > 0) {
    labels.push({
      row: 1,
      col: 28,
      length: 24,
      initial: '=== BMS 3270 TERMINAL ===',
      color: 'YELLOW',
    });
    bundle.fields.forEach((f, idx) => {
      const r = 3 + idx;
      labels.push({
        row: r,
        col: 4,
        length: f.label.length,
        initial: `${f.label}:`,
        color: 'BLUE',
      });
      inputs.push({
        row: r,
        col: 4 + f.label.length + 2,
        length: 20,
        name: f.name.toLowerCase(),
        defaultValue: f.defaultValue,
      });
    });
    functionKeys.push('ENTER=Process   F3=Exit');
  }

  return {
    gridRows: 24,
    gridCols: 80,
    labels,
    inputs,
    functionKeys,
  };
}

export const LiveTsxRenderer: React.FC<LiveTsxRendererProps> = ({
  tsxCode,
  screenName,
  onEditMapping,
  metadata,
}) => {
  
  const bundle = useMemo(() => parseConvertedTsx(tsxCode, screenName), [tsxCode, screenName]);

  const terminalData = useMemo<TerminalData>(() => {
    // 1. Parse directly from tsxCode (so user modifications reflect immediately)
    const parsed = parseTerminalFromTsx(tsxCode, bundle);

    // 2. If metadata overrides are provided (e.g. from FieldMappingPage liveMetadata), apply them to matching inputs & labels!
    if (metadata) {
      if (metadata.inputs && Array.isArray(metadata.inputs)) {
        metadata.inputs.forEach((mInput: any) => {
          const mName = mInput.name?.trim()?.toLowerCase();
          if (!mName) return;
          const target = parsed.inputs.find((i) => i.name.toLowerCase() === mName);
          if (target) {
            if (mInput.row && mInput.row > 0) target.row = mInput.row;
            if (mInput.col && mInput.col > 0) target.col = mInput.col;
            if (mInput.length && mInput.length > 0) target.length = mInput.length;
          }
        });
      }
      if (metadata.labels && Array.isArray(metadata.labels)) {
        metadata.labels.forEach((mLabel: any) => {
          const mName = mLabel.name?.trim()?.toLowerCase();
          const mInitial = mLabel.initial?.trim();

          let target: TerminalLabel | undefined;
          if (mName) {
            target = parsed.labels.find((l) => l.name && l.name.toLowerCase() === mName);
          }
          if (!target && mInitial) {
            // Unnamed static label: match by position or exact initial text, NEVER empty string!
            target = parsed.labels.find(
              (l) =>
                !l.name &&
                ((mLabel.row && l.row === mLabel.row && mLabel.col && l.col === mLabel.col) ||
                  l.initial?.trim() === mInitial)
            );
          }

          if (target) {
            if (mLabel.row && mLabel.row > 0) target.row = mLabel.row;
            if (mLabel.col && mLabel.col > 0) target.col = mLabel.col;
            // In authentic BMS screen: only static unnamed labels have initial text.
            // Named output fields (like CURDATE, CURTIME, FNAME, etc.) are blank on screen map.
            if (!mName) {
              if (mLabel.initial) target.initial = mLabel.initial;
            } else {
              target.initial = '';
            }
            if (mLabel.color) target.color = mLabel.color;
          }
        });
      }
    }

    if (parsed.labels.length > 0 || parsed.inputs.length > 0) {
      return parsed;
    }

    // 2. Fallback to metadata if tsxCode did not have 3270 CSS grid spans yet
    if (metadata) {
      if (metadata.labels && metadata.inputs) {
        return {
          gridRows: metadata.gridRows || 24,
          gridCols: metadata.gridCols || 80,
          labels: metadata.labels,
          inputs: metadata.inputs,
          functionKeys: metadata.functionKeys || [],
        };
      }
      if (metadata.fields && Array.isArray(metadata.fields)) {
        return {
          gridRows: metadata.gridRows || 24,
          gridCols: metadata.gridCols || 80,
          labels: metadata.fields
            .filter((f: any) => f.kind === 'label' || f.kind === 'output')
            .map((f: any) => ({
              ...f,
              initial: f.kind === 'label' && !f.name ? f.initial || '' : '',
              color: (f.color || 'GREEN').toLowerCase(),
            })),
          inputs: metadata.fields
            .filter((f: any) => f.kind === 'input')
            .map((f: any) => ({
              ...f,
              name: (f.name || '').toLowerCase(),
              color: (f.color || 'GREEN').toLowerCase(),
              isDark: f.isDark || false,
            })),
          functionKeys: metadata.functionKeys || [],
        };
      }
    }

    return parsed;
  }, [tsxCode, bundle, metadata]);

  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    terminalData.inputs.forEach((i) => {
      initial[i.name.toLowerCase()] = i.defaultValue || '';
    });
    bundle.fields.forEach((f) => {
      if (!initial[f.name.toLowerCase()]) {
        initial[f.name.toLowerCase()] = f.defaultValue || '';
      }
    });
    return initial;
  });

  const handleInputChange = (fieldName: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldName.toLowerCase()]: value }));
  };

  const handleReset = () => {
    const initial: Record<string, string> = {};
    terminalData.inputs.forEach((i) => {
      initial[i.name.toLowerCase()] = '';
    });
    setFormData(initial);
  };

  const getNextColOnRow = (row: number, col: number): number => {
    let minCol = (terminalData.gridCols || 80) + 1;
    terminalData.labels.forEach((other) => {
      if (other.row === row && other.col > col && other.col < minCol) {
        minCol = other.col;
      }
    });
    terminalData.inputs.forEach((other) => {
      if (other.row === row && other.col > col && other.col < minCol) {
        minCol = other.col;
      }
    });
    return minCol;
  };

  return (
    <div className="w-full rounded-xl shadow-xl overflow-hidden font-mono bg-[#030d05] border border-green-800/60 ring-1 ring-green-900/30">
      {/* Clean Control Bar */}
      <div className="px-4 py-2.5 border-b bg-[#07170a] border-green-900/60 flex items-center justify-between gap-4 text-xs select-none">
        <div className="flex items-center space-x-2.5">
          <Terminal className="w-4 h-4 text-green-400" />
          <span className="font-bold text-slate-200">{screenName}</span>
          <span className="text-[11px] font-mono text-green-500/80">
            {terminalData.gridCols}x{terminalData.gridRows} Terminal Grid
          </span>
          <span className="bg-green-950/80 border border-green-700/60 text-green-300 text-[10px] px-2 py-0.5 rounded font-mono font-medium">
            IBM 3270 Green Screen
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {onEditMapping && (
            <button
              onClick={onEditMapping}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-xs px-2.5 py-1 rounded font-semibold flex items-center space-x-1 transition-colors"
            >
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Edit Mapping</span>
            </button>
          )}
          <button
            onClick={handleReset}
            className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-600 text-xs px-2.5 py-1 rounded flex items-center space-x-1 transition-colors"
            title="Reset Inputs"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* 3270 Character Grid Canvas */}
      <div className="p-4 sm:p-6 overflow-x-auto flex justify-center bg-black shadow-[inset_0_0_100px_rgba(0,35,0,0.35)]">
        <div
          className="relative font-mono select-text"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${terminalData.gridCols || 80}, 1ch)`,
            gridTemplateRows: `repeat(${terminalData.gridRows || 24}, 1.35em)`,
            width: 'max-content',
            minWidth: '80ch',
            fontSize: '13px',
            lineHeight: 1.35,
            backgroundColor: '#000000',
          }}
        >
          {/* Labels & Outputs */}
          {terminalData.labels
            .filter((l) => (l.row || 0) > 0 && (l.col || 0) > 0)
            .map((l, idx) => {
              const colorClass = get3270ColorClass(l.color, l.isBright);
              const maxSpace = Math.max(getNextColOnRow(l.row, l.col) - l.col, 1);
              const rawText = l.initial || '';
              const displayText = formatLabelDisplayText(rawText, maxSpace);
              const spanLength = Math.min(
                Math.max(l.length || 1, displayText.length || 1),
                maxSpace
              );
              return (
                <span
                  key={`lbl-${idx}`}
                  style={{
                    gridRow: l.row,
                    gridColumn: `${l.col} / span ${spanLength}`,
                    maxWidth: `${maxSpace}ch`,
                    overflow: 'hidden',
                  }}
                  className={`whitespace-pre select-text font-mono inline-block ${colorClass}`}
                  title={rawText !== displayText ? rawText : undefined}
                >
                  {displayText}
                </span>
              );
            })}

          {/* Inputs */}
          {terminalData.inputs
            .filter((i) => (i.row || 0) > 0 && (i.col || 0) > 0)
            .map((i, idx) => {
              const inputLen = Math.max(i.length || 1, 1);
              const inputKey = i.name.toLowerCase();
              return (
                <input
                  key={`inp-${idx}`}
                  type={i.isDark ? 'password' : 'text'}
                  name={inputKey}
                  id={inputKey}
                  maxLength={inputLen}
                  readOnly={i.readOnly}
                  disabled={i.readOnly}
                  value={formData[inputKey] ?? (i.defaultValue || '')}
                  onChange={(e) => handleInputChange(inputKey, e.target.value)}
                  style={{
                    gridRow: i.row,
                    gridColumn: `${i.col} / span ${inputLen}`,
                    width: `${inputLen}ch`,
                  }}
                  className={`bg-black font-mono px-0 py-0 leading-none h-[1.35em] ${
                    i.readOnly
                      ? 'text-[#00dd00] border-0 cursor-not-allowed opacity-90'
                      : 'text-[#00ff00] underline border-0 border-b border-dotted border-green-600 focus:outline-none focus:border-solid focus:border-green-400 focus:text-[#86efac]'
                  }`}
                  autoComplete="off"
                  spellCheck={false}
                />
              );
            })}

          {/* Function Keys at Row 24 (rendered only if not already present as positioned labels on row 24) */}
          {terminalData.functionKeys &&
            terminalData.functionKeys.length > 0 &&
            !terminalData.labels.some(
              (l) =>
                Number(l.row) === (terminalData.gridRows || 24) &&
                Boolean(
                  l.initial &&
                    l.initial.includes('=') &&
                    (l.initial.includes('F') ||
                      l.initial.includes('PF') ||
                      l.initial.includes('ENTER') ||
                      l.initial.includes('CLEAR'))
                )
            ) && (
              <div
                style={{
                  gridRow: terminalData.gridRows || 24,
                  gridColumn: `1 / span ${terminalData.gridCols || 80}`,
                }}
                className="text-[#00dd00] font-mono text-[13px] leading-[1.35] whitespace-pre"
              >
                {terminalData.functionKeys
                  .map((fk: any) => {
                    if (typeof fk === 'string') return fk;
                    if (fk && typeof fk === 'object') {
                      const key = fk.key || fk.action || '';
                      const label = fk.label || fk.name || '';
                      return label ? `${key}=${label}` : key;
                    }
                    return String(fk);
                  })
                  .join('   ')}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default LiveTsxRenderer;
