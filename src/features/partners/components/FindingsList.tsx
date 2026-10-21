import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle, Info, Check, X, MinusCircle, Sparkles } from 'lucide-react';
import { ValidationFinding } from '../types/partner.types';
import { PartnerStatusBadge } from './PartnerStatusBadge';

interface FindingsListProps {
  findings: ValidationFinding[];
  isStaff?: boolean;
  onUpdateStatus?: (findingId: string, status: 'CONFIRMED' | 'REJECTED' | 'NOT_APPLICABLE') => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  isStaff = false,
  onUpdateStatus,
}) => {
  if (findings.length === 0) {
    return (
      <div className="p-6 text-center rounded-xl border border-dashed border-[#D9E2EC] bg-[#F7F9FC]">
        <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-[#091E42]">Zero Validation Issues</h4>
        <p className="text-xs text-[#6B778C] mt-1">
          Automated syntax and semantic checks completed with zero warnings or errors.
        </p>
      </div>
    );
  }

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
            <AlertCircle className="w-3 h-3 text-rose-500" /> High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3 text-amber-500" /> Medium
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3 h-3 text-blue-500" /> Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded bg-gray-50 text-gray-700 border border-gray-200">
            <Info className="w-3 h-3" /> Info
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      {findings.map((finding) => (
        <div
          key={finding.id}
          className="p-4 rounded-xl border border-[#E5EAF0] bg-white shadow-2xs hover:border-[#D9E2EC] transition-all space-y-2.5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                {getSeverityBadge(finding.severity)}
                {finding.ruleCode && (
                  <span className="text-[11px] font-mono text-[#6B778C] bg-gray-100 px-1.5 py-0.5 rounded">
                    {finding.ruleCode}
                  </span>
                )}
                {finding.isAiAssisted && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    <Sparkles className="w-3 h-3 text-purple-600" /> AI Verified
                  </span>
                )}
                <PartnerStatusBadge status={finding.status} type="validation" />
              </div>
              <h4 className="text-sm font-semibold text-[#091E42] mt-1">{finding.title}</h4>
            </div>
          </div>

          {finding.fieldOrMethod && (
            <div className="text-xs font-mono text-[#6B778C] bg-[#F7F9FC] px-2.5 py-1 rounded inline-block">
              Target: {finding.fieldOrMethod}
            </div>
          )}

          <p className="text-xs text-[#4A5568] leading-relaxed">{finding.explanation}</p>

          {/* Internal Staff Action Controls */}
          {isStaff && onUpdateStatus && (
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0F4F8]">
              <span className="text-[11px] text-[#6B778C] mr-auto">Staff Action:</span>
              <button
                onClick={() => onUpdateStatus(finding.id, 'CONFIRMED')}
                className={`text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                  finding.status === 'CONFIRMED'
                    ? 'bg-teal-600 text-white font-medium'
                    : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                }`}
                title="Confirm finding as valid"
              >
                <Check className="w-3 h-3" /> Confirm
              </button>
              <button
                onClick={() => onUpdateStatus(finding.id, 'NOT_APPLICABLE')}
                className={`text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                  finding.status === 'NOT_APPLICABLE'
                    ? 'bg-slate-700 text-white font-medium'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
                title="Mark as Not Applicable (False Positive)"
              >
                <MinusCircle className="w-3 h-3" /> Mark N/A
              </button>
              <button
                onClick={() => onUpdateStatus(finding.id, 'REJECTED')}
                className={`text-xs px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                  finding.status === 'REJECTED'
                    ? 'bg-rose-600 text-white font-medium'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
                title="Reject finding"
              >
                <X className="w-3 h-3" /> Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
