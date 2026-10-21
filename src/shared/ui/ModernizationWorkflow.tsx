import React from 'react';
import { Check, ArrowRight } from 'lucide-react';

export type WorkflowStepId =
  | 'upload'
  | 'analyze'
  | 'analysis'
  | 'mapping'
  | 'convert'
  | 'conversion'
  | 'validate'
  | 'validation'
  | 'review'
  | 'result'
  | 'export';

export interface WorkflowStep {
  id: string;
  label: string;
  sublabel: string;
  description: string;
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: 'upload',
    label: 'Upload',
    sublabel: 'Source ingestion',
    description: 'Ingest legacy BMS/DSPF screen maps and COBOL source files.',
  },
  {
    id: 'convert',
    label: 'Convert',
    sublabel: 'Target code generation',
    description: 'The modernization engine generates target React components and DTOs.',
  },
  {
    id: 'validate',
    label: 'Validate',
    sublabel: 'Rule-based validation',
    description: 'Rule-based and semantic validation of generated components and data bindings.',
  },
  {
    id: 'export',
    label: 'Export',
    sublabel: 'Modernization package',
    description: 'Package modernized components and code artifacts for deployment.',
  },
];

function getStepIndex(stepId: WorkflowStepId): number {
  switch (stepId) {
    case 'upload':
      return 0;
    case 'convert':
    case 'conversion':
    case 'analyze':
    case 'analysis':
    case 'mapping':
      return 1;
    case 'validate':
    case 'validation':
    case 'review':
      return 2;
    case 'result':
    case 'export':
      return 3;
    default:
      return 0;
  }
}

export interface ModernizationWorkflowProps {
  currentStep: WorkflowStepId;
  completedSteps?: WorkflowStepId[];
  onStepClick?: (stepId: WorkflowStepId) => void;
  onActionClick?: () => void;
  actionLabel?: string;
  className?: string;
}

export const ModernizationWorkflow: React.FC<ModernizationWorkflowProps> = ({
  currentStep,
  completedSteps = [],
  onStepClick,
  onActionClick,
  actionLabel,
  className = '',
}) => {
  const currentIndex = getStepIndex(currentStep);
  const currentStepInfo = WORKFLOW_STEPS[currentIndex] ?? WORKFLOW_STEPS[0];

  return (
    <div className={`bg-white border border-[#E5EAF0] rounded-xl overflow-hidden shadow-2xs ${className}`}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5EAF0] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#091E42] tracking-tight">
            Modernization Workflow
          </h3>
          <p className="text-xs text-[#6B778C] mt-0.5">
            Deterministic stage progression for legacy assets
          </p>
        </div>
        <div className="text-xs font-semibold text-[#42526E]">
          Stage <span className="text-[#0652CC] font-bold">{currentIndex + 1}</span> of {WORKFLOW_STEPS.length}
        </div>
      </div>

      {/* Stepper Body */}
      <div className="p-5">
        {/* Desktop / Tablet Horizontal Stepper */}
        <div className="hidden md:flex items-center justify-between relative">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex || completedSteps.includes(step.id as WorkflowStepId);
            const isCurrent = idx === currentIndex;

            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => onStepClick?.(step.id as WorkflowStepId)}
                  disabled={!onStepClick}
                  className={`flex items-start space-x-3 text-left transition-all group ${
                    onStepClick ? 'cursor-pointer' : 'cursor-default'
                  }`}
                >
                  {/* Step Indicator */}
                  <div className="shrink-0 mt-0.5">
                    {isCompleted ? (
                      <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center shadow-2xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : isCurrent ? (
                      <div className="w-6 h-6 rounded-full bg-[#0652CC] text-white flex items-center justify-center shadow-2xs">
                        <span className="w-2 h-2 bg-white rounded-full"></span>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-white border border-[#D9E2EC] text-[#6B778C] flex items-center justify-center">
                        <span className="w-2 h-2 rounded-full border border-[#97A0AF]"></span>
                      </div>
                    )}
                  </div>

                  {/* Step Labels */}
                  <div className="leading-tight min-w-0">
                    <p
                      className={`text-xs font-bold transition-colors ${
                        isCurrent
                          ? 'text-[#0652CC]'
                          : isCompleted
                          ? 'text-[#091E42]'
                          : 'text-[#6B778C] group-hover:text-[#091E42]'
                      }`}
                    >
                      {step.label}
                    </p>
                    <p className="text-[11px] font-medium text-[#6B778C] truncate mt-0.5">
                      {step.sublabel}
                    </p>
                  </div>
                </button>

                {/* Connector line */}
                {idx < WORKFLOW_STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] mx-3 transition-colors ${
                      idx < currentIndex ? 'bg-emerald-300' : 'bg-[#E5EAF0]'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Mobile Vertical Stepper */}
        <div className="md:hidden space-y-3">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isCompleted = idx < currentIndex;
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepClick?.(step.id as WorkflowStepId)}
                disabled={!onStepClick}
                className={`w-full flex items-center space-x-3 p-2.5 rounded-lg text-left transition-colors ${
                  isCurrent
                    ? 'bg-[#E8F1FF] text-[#0652CC]'
                    : 'hover:bg-[#F7F9FC] text-[#091E42]'
                }`}
              >
                <div className="shrink-0">
                  {isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-300 text-emerald-600 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : isCurrent ? (
                    <div className="w-6 h-6 rounded-full bg-[#0652CC] text-white flex items-center justify-center">
                      <span className="w-2 h-2 bg-white rounded-full"></span>
                    </div>
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-white border border-[#D9E2EC] flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full border border-[#97A0AF]"></span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold">{step.label}</p>
                  <p className="text-[11px] text-[#6B778C]">{step.sublabel}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer Stage Summary */}
      <div className="bg-[#F7F9FC] border-t border-[#E5EAF0] px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <p className="text-[#091E42] font-semibold">
            Current stage: <span className="text-[#0652CC] font-bold">{currentStepInfo.label}</span>
          </p>
          <p className="text-[#6B778C] text-[11px]">{currentStepInfo.description}</p>
        </div>

        {(onActionClick || actionLabel) && (
          <button
            type="button"
            onClick={onActionClick}
            className="inline-flex items-center space-x-1 font-semibold text-[#0652CC] hover:text-[#0655FF] hover:underline shrink-0 cursor-pointer"
          >
            <span>{actionLabel ?? 'Open Project'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default ModernizationWorkflow;
