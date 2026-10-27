import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui';

export const ForbiddenPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[550px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-[#DFE3E8] rounded-2xl p-8 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <span className="font-mono text-xs font-bold text-amber-800 uppercase tracking-wider">
            HTTP 403 — Access Restricted
          </span>
          <h1 className="text-xl font-bold text-[#172B4D]">Insufficient Privileges</h1>
          <p className="text-xs text-[#5E6C84]">
            Your current assigned enterprise role lacks the required granular permission to access this administrative module. Contact a Platform Administrator if you require elevated clearance.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
            <span>Go Back</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/')}
            className="bg-[#0652CC] hover:bg-[#0543A8] text-white text-xs"
          >
            <Home className="w-3.5 h-3.5 mr-1.5" />
            <span>Return to Dashboard</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
