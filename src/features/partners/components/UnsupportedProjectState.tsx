import React from 'react';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui/Button';

interface UnsupportedProjectStateProps {
  conversionType?: string | null;
  backUrl?: string;
  backLabel?: string;
}

export const UnsupportedProjectState: React.FC<UnsupportedProjectStateProps> = ({
  conversionType,
  backUrl = '/partners/projects',
  backLabel = 'Back to Projects List',
}) => {
  return (
    <div className="min-h-[500px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-sm">
        <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600">
          <AlertCircle className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-bold text-slate-900 tracking-tight mb-2">
          Unsupported Project Conversion Type
        </h2>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          {conversionType ? (
            <>
              This project has an unrecognized or unsupported conversion type:{' '}
              <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                {conversionType}
              </span>
              . Workspaces and conversion pipelines are restricted to authorized and recognized project types only.
            </>
          ) : (
            'This project does not have a valid conversion type assigned. Workspaces and conversion actions cannot be displayed for unconfigured projects.'
          )}
        </p>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-500 text-left mb-6 space-y-1">
          <div className="font-semibold text-slate-700">Supported conversion pipelines:</div>
          <div>• <span className="font-medium text-slate-700">BMS_DSPF_TO_REACT</span> — Screens Workspace</div>
          <div>• <span className="font-medium text-slate-700">COBOL_TO_JAVA</span> — Programs Workspace</div>
        </div>

        <Button
          onClick={() => {
            window.location.href = backUrl;
          }}
          className="w-full inline-flex items-center justify-center space-x-2 text-xs font-semibold bg-[#244A70] hover:bg-[#1E3E5E] text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{backLabel}</span>
        </Button>
      </div>
    </div>
  );
};
