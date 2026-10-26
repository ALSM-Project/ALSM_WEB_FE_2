import React from 'react';
import { LogOut, ShieldAlert } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useSupportView } from '../context/SupportViewContext';

export const ImpersonationBanner: React.FC = () => {
  const { isSupportReadOnly, supportOrg, exitSupportView } = useSupportView();

  if (!isSupportReadOnly || !supportOrg) return null;

  return (
    <div
      role="banner"
      aria-label="Support view status banner"
      className="bg-amber-500 text-amber-950 px-6 py-2.5 border-b border-amber-600 flex items-center justify-between text-xs font-semibold shadow-xs z-50 sticky top-0"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <ShieldAlert className="w-4 h-4 text-amber-950 shrink-0 animate-pulse" />
        <span className="truncate">
          <span className="font-mono tracking-wide font-extrabold uppercase">SUPPORT VIEW</span>
          {' — '}
          <span className="underline font-bold">{supportOrg.name}</span>
          {' — '}
          <span className="bg-amber-950/20 px-2 py-0.5 rounded text-[11px] font-extrabold tracking-wider">
            READ ONLY
          </span>
          <span className="hidden md:inline text-amber-950/80 font-normal ml-2">
            (Data modifications, source edits, uploads, and exports are disabled)
          </span>
        </span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={exitSupportView}
        className="bg-amber-950 text-white hover:bg-amber-900 border-none text-[11px] py-1 px-3 h-7 shrink-0 cursor-pointer shadow-xs"
      >
        <LogOut className="w-3.5 h-3.5 mr-1.5" />
        Exit Support View
      </Button>
    </div>
  );
};
