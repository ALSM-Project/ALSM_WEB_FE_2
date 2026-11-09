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
  variant?: 'segmented' | 'underline' | 'pill';
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  className = '',
  variant = 'segmented',
}) => {
  if (variant === 'pill') {
    return (
      <div className={`flex justify-center ${className}`}>
        <div className="inline-flex p-1 bg-white rounded-lg gap-1 border border-[#DCE3EC] shadow-xs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`px-4 py-1.5 rounded-md text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center space-x-2 ${
                  isActive
                    ? 'bg-[#244A70] text-white shadow-xs'
                    : 'text-[#8491A3] hover:text-[#17263A] hover:bg-[#EEF1F6]'
                }`}
              >
                {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1.5 px-2 py-0.5 text-xs rounded font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#EEF1F6] text-[#17263A]'
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

  if (variant === 'underline') {
    return (
      <div className={`flex border-b border-[#DCE3EC] overflow-x-auto ${className}`}>
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
                    ? 'border-[#244A70] text-[#244A70] font-semibold'
                    : 'border-transparent text-[#8491A3] hover:text-[#17263A] hover:border-[#DCE3EC]'
                }`}
              >
                {tab.icon && <span className="w-4 h-4 shrink-0">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 text-[11px] rounded font-semibold ${
                      isActive ? 'bg-[#EEF1F6] text-[#244A70]' : 'bg-[#F4F7FB] text-[#8491A3]'
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
      <div className="inline-flex p-1 bg-[#EEF1F6] rounded-md border border-[#DCE3EC] gap-1 overflow-x-auto max-w-full">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`px-3 sm:px-3.5 py-1.5 rounded text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center space-x-1.5 shrink-0 ${
                isActive
                  ? 'bg-white text-[#17263A] shadow-xs border border-[#DCE3EC] font-semibold'
                  : 'text-[#8491A3] hover:text-[#17263A] hover:bg-white/60'
              }`}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`ml-1 px-1.5 py-0.5 text-[11px] rounded font-semibold ${
                    isActive ? 'bg-[#EEF1F6] text-[#244A70]' : 'bg-[#DCE3EC] text-[#8491A3]'
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
