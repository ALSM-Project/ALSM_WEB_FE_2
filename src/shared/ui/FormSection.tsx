import React from 'react';

export interface FormSectionProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  actions,
  children,
  className = '',
}) => {
  return (
    <div className={`bg-white border border-[#DCE3EC] rounded-lg p-5 sm:p-6 shadow-xs ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 mb-4 border-b border-[#EEF1F6] gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#17263A] tracking-tight">{title}</h3>
          {description && <p className="text-xs text-[#8491A3] mt-0.5">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
};

export default FormSection;
