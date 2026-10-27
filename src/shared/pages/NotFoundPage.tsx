import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[550px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-[#DFE3E8] rounded-2xl p-8 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 bg-[#E8F1FF] border border-[#0652CC]/20 text-[#0652CC] rounded-2xl flex items-center justify-center mx-auto">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <span className="font-mono text-xs font-bold text-[#0652CC] uppercase tracking-wider">
            HTTP 404 — Not Found
          </span>
          <h1 className="text-xl font-bold text-[#172B4D]">Page Does Not Exist</h1>
          <p className="text-xs text-[#5E6C84]">
            The route or resource you requested is unavailable or has been relocated within the ALSM Administration Platform.
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
