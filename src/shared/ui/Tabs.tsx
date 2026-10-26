import React from 'react';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
  variant?: 'segmented' | 'underline';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'segmented',
}) => {
  if (variant === 'underline') {
    return (
      <div className={`flex border-b border-slate-200 overflow-x-auto ${className}`}>
        <div className="flex gap-4 sm:gap-6 min-w-full sm:min-w-0">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`py-2.5 px-1 border-b-2 text-xs sm:text-sm font-medium transition-colors cursor-pointer flex items-center gap-2 whitespace-nowrap ${
                  isActive
                    ? 'border-[#0652CC] text-[#0652CC] font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {tab.icon && <span className="w-4 h-4 shrink-0">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[11px] rounded font-semibold ${
                      isActive ? 'bg-blue-100 text-[#0652CC]' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-start sm:justify-start ${className}`}>
      <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80 gap-1 overflow-x-auto max-w-full">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                isActive
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-[11px] rounded-md font-semibold ${
                    isActive ? 'bg-blue-50 text-[#0652CC]' : 'bg-slate-200/70 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Tabs;
