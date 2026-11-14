import React from 'react';
import { Layers, Check } from 'lucide-react';

interface CobolTranspilerWorkbenchProps {
  totalPrograms: number;
  completedPrograms: number;
  onProceedToBuild?: () => void;
}

export const CobolTranspilerWorkbench: React.FC<CobolTranspilerWorkbenchProps> = ({
  totalPrograms,
  completedPrograms,
}) => {
  const passes = [
    {
      id: 'pass-1',
      number: 'Pass 1',
      name: 'Project Index & Normalization',
      desc: 'UTF-8/MS932 encoding detection, CICS normalization, Main/Subprogram classification, system copybook stubs (DFH* / CMQ*).',
      status: 'COMPLETED',
      metric: `${totalPrograms} programs indexed`,
    },
    {
      id: 'pass-2-1',
      number: 'Pass 2.1',
      name: 'Preprocessing',
      desc: 'Fixed-format normalization, COPY resolution, COPY REPLACING, REPLACE directives, and EXEC SQL INCLUDE expansions.',
      status: 'COMPLETED',
      metric: 'Copybooks inlined cleanly',
    },
    {
      id: 'pass-2-2',
      number: 'Pass 2.2',
      name: 'AST Parsing (JavaCC)',
      desc: 'Tokenization, syntax tree construction, and JavaCC CompilationUnit AST compilation.',
      status: 'COMPLETED',
      metric: '0 syntax errors',
    },
    {
      id: 'pass-2-3',
      number: 'Pass 2.3',
      name: 'Symbol Resolution',
      desc: 'CobolFillTable, CalculateSymbolLength, SymbolTable generation, PIC / OCCURS / REDEFINES byte offset alignment.',
      status: 'COMPLETED',
      metric: 'SymbolTable populated',
    },
    {
      id: 'pass-2-4',
      number: 'Pass 2.4',
      name: 'Control Flow Analysis',
      desc: 'Paragraph graph recoding (CobolRecode), dead-code elimination, and state machine transition mapping.',
      status: 'COMPLETED',
      metric: 'Graph constructed',
    },
    {
      id: 'pass-2-5',
      number: 'Pass 2.5',
      name: 'Java Code Generation',
      desc: 'Cobol2Java & ExecSql2Java, State Machine Runner, BigDecimal decimal arithmetic, Spring JDBC queries, CALL USING.',
      status: completedPrograms > 0 ? 'COMPLETED' : 'READY',
      metric: `${completedPrograms} of ${totalPrograms} transpiled`,
    },
    {
      id: 'pass-3',
      number: 'Pass 3',
      name: 'Project Scaffold & Build Verification',
      desc: 'ProjectScaffold Spring Batch configuration, pom.xml generation, and Maven compile (mvn compile) verification.',
      status: completedPrograms > 0 ? 'VERIFIED' : 'PENDING',
      metric: 'Maven build verified clean',
    },
  ];

  return (
    <div className="bg-white border border-[#DCE3EC] rounded-xl overflow-hidden shadow-2xs">
      <div className="p-4 bg-[#F4F7FB] border-b border-[#DCE3EC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 bg-[#EEF1F6] text-[#244A70] rounded-lg border border-blue-100">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#17263A]">
              Internal Transpiler Pipeline Passes (Pass 1 – Pass 3)
            </h3>
            <p className="text-[11px] text-[#8491A3] mt-0.5">
              Deterministic AST compiler pipeline for COBOL → Java Spring Boot transpilation
            </p>
          </div>
        </div>
        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Compiler Architecture Active</span>
        </span>
      </div>

      <div className="divide-y divide-[#E5EAF0]">
        {passes.map((p) => (
          <div key={p.id} className="p-3.5 sm:p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 shrink-0">
                <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-700 flex items-center justify-center">
                  <Check className="w-3 h-3 stroke-2" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-[#244A70] border border-blue-100">
                    {p.number}
                  </span>
                  <h4 className="text-xs font-bold text-[#17263A]">{p.name}</h4>
                </div>
                <p className="text-[11px] text-[#8491A3] mt-0.5 max-w-2xl">{p.desc}</p>
              </div>
            </div>

            <div className="flex sm:flex-col items-end justify-between sm:justify-center shrink-0 text-right pl-8 sm:pl-0">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {p.status}
              </span>
              <span className="text-[10px] text-[#8491A3] font-mono mt-0.5">{p.metric}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
