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
}

export const Tabs: React.FC<TabsProps> = ({ tabs, activeTab, onChange, className = '' }) => {
  return (
    <div className={`flex justify-start sm:justify-center ${className}`}>
      <div className="inline-flex p-1.5 bg-white rounded-full gap-1 border border-[#D9E2EC] shadow-2xs overflow-x-auto max-w-full">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center space-x-2 shrink-0 ${
                isActive
                  ? 'bg-[#0652CC] text-white shadow-[0_4px_15px_rgba(6,82,204,0.3)]'
                  : 'text-[#42526E] hover:text-[#091E42] hover:bg-gray-100'
              }`}
            >
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
                    isActive ? 'bg-white/20 text-white font-bold' : 'bg-gray-200 text-[#091E42]'
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
