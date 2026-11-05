import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/shared/ui';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-[550px] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white border border-[#DCE3EC] rounded-2xl p-8 shadow-sm text-center space-y-4">
        <div className="w-14 h-14 bg-[#EEF1F6] border border-[#244A70]/20 text-[#244A70] rounded-2xl flex items-center justify-center mx-auto">
          <Compass className="w-7 h-7" />
        </div>

        <div className="space-y-1.5">
          <span className="font-mono text-xs font-bold text-[#244A70] uppercase tracking-wider">
            HTTP 404 — Not Found
          </span>
          <h1 className="text-xl font-bold text-[#17263A]">Page Does Not Exist</h1>
          <p className="text-xs text-[#8491A3]">
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
            className="bg-[#244A70] hover:bg-[#244A70] text-white text-xs"
          >
            <Home className="w-3.5 h-3.5 mr-1.5" />
            <span>Return to Dashboard</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
