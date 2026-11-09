import React, { useMemo } from 'react';
import {
  analyseCobolTransformation,
  tokenizeCobolLine,
  type CobolTokenKind,
} from '../utils/cobolTransformation';
import { CodeViewer } from './CodeViewer';

export interface CobolTransformationFile {
  relativePath: string;
  content: string;
}

export interface CobolTransformationViewProps {
  /** Original COBOL source. When the server did not provide it, only the Java side is shown. */
  cobolSource?: string;
  cobolName: string;
  files: CobolTransformationFile[];
  selectedIndex: number;
  onSelectFile: (index: number) => void;
}

const TOKEN_CLASS: Record<CobolTokenKind, string> = {
  comment: 'text-slate-500 italic',
  string: 'text-emerald-300',
  number: 'text-amber-300',
  keyword: 'text-sky-300 font-semibold',
  plain: 'text-slate-200',
};

const CobolSourcePane: React.FC<{ name: string; source?: string }> = ({ name, source }) => {
  const lines = useMemo(() => (source ? source.split(/\r?\n/) : []), [source]);
  return (
    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs flex flex-col h-full shadow-inner">
      <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 text-slate-300 font-semibold flex items-center space-x-2">
        <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
        <span>{name} (COBOL)</span>
      </div>
      {source ? (
        <div className="p-4 overflow-auto max-h-[500px]">
          <table className="w-full border-collapse">
            <tbody>
              {lines.map((line, index) => (
                <tr key={index} className="leading-relaxed hover:bg-slate-900/60">
                  <td className="w-10 select-none py-0.5 pr-4 text-right text-slate-600">{index + 1}</td>
                  <td className="whitespace-pre py-0.5">
                    {tokenizeCobolLine(line).map((token, i) => (
                      <span key={i} className={TOKEN_CLASS[token.kind]}>
                        {token.text}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-6 text-slate-400 whitespace-normal font-sans text-sm">
          The original COBOL source is not available from the server for this program, so only the
          generated Java is shown and the tables below stay empty.
        </div>
      )}
    </div>
  );
};

const SectionTable: React.FC<{
  title: string;
  subtitle: string;
  headers: string[];
  empty: string;
  rows: React.ReactNode[][];
}> = ({ title, subtitle, headers, empty, rows }) => (
  <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
      <h3 className="text-sm font-bold text-slate-900">{title}</h3>
      <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
    </div>
    {rows.length === 0 ? (
      <p className="p-4 text-xs text-slate-500">{empty}</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-100">
              {headers.map((header) => (
                <th key={header} className="px-4 py-2 font-semibold">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-b border-slate-50 last:border-0 align-top">
                {row.map((cell, i) => (
                  <td key={i} className="px-4 py-2 font-mono text-slate-800">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const NONE = <span className="text-slate-400">-</span>;

export const CobolTransformationView: React.FC<CobolTransformationViewProps> = ({
  cobolSource,
  cobolName,
  files,
  selectedIndex,
  onSelectFile,
}) => {
  const selectedFile = files[selectedIndex] ?? files[0];
  const javaCode = useMemo(() => files.map((file) => file.content).join('\n'), [files]);
  const transformation = useMemo(
    () => analyseCobolTransformation(cobolSource ?? '', javaCode),
    [cobolSource, javaCode],
  );

  return (
    <div className="space-y-4" data-testid="cobol-transformation-view">
      <div className="flex flex-wrap gap-2">
        {files.map((file, index) => (
          <button
            key={file.relativePath}
            onClick={() => onSelectFile(index)}
            className={`text-xs font-mono px-2.5 py-1 rounded-lg border ${
              index === selectedIndex
                ? 'bg-brand-50 border-brand-300 text-brand-700 font-semibold'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {file.relativePath.split('/').pop()}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
        <CobolSourcePane name={cobolName} source={cobolSource} />
        {selectedFile && (
          <CodeViewer code={selectedFile.content} language="java" filename={selectedFile.relativePath} />
        )}
      </div>

      <SectionTable
        title="Data Division → Java Model"
        subtitle="Each data item of the program and the Java field it became."
        headers={['Level', 'COBOL item', 'PICTURE / USAGE', 'Java type', 'Generated field']}
        empty="No data items could be read."
        rows={transformation.dataItems.map((item) => [
          item.level,
          item.cobolName,
          [item.picture ? `PIC ${item.picture}` : null, item.usage].filter(Boolean).join(' ') || NONE,
          item.inferredType,
          item.javaDeclaration ?? NONE,
        ])}
      />

      <SectionTable
        title="Procedure Division → Java Methods"
        subtitle="Each COBOL paragraph and the Java method it was turned into."
        headers={['COBOL paragraph', 'Java method']}
        empty="No paragraphs could be read."
        rows={transformation.paragraphs.map((paragraph) => [
          paragraph.cobolName,
          paragraph.javaMethod ?? NONE,
        ])}
      />

      <SectionTable
        title="Statements Mapping"
        subtitle="How the COBOL statements used by this program are written in Java."
        headers={['COBOL statement', 'Uses', 'Becomes in Java', 'First use in the program']}
        empty="No statements could be read."
        rows={transformation.statements.map((statement) => [
          statement.cobol,
          statement.count,
          statement.java,
          statement.example,
        ])}
      />
    </div>
  );
};

export default CobolTransformationView;
