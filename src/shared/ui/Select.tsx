import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, className, disabled, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label className="text-xs font-semibold text-[#17263A] tracking-tight">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            disabled={disabled}
            className={twMerge(
              clsx(
                'w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#DCE3EC] rounded-md text-[#17263A] shadow-2xs transition-all focus:outline-none focus:ring-1 focus:ring-[#244A70] focus:border-[#244A70] disabled:bg-[#EEF1F6] disabled:text-[#8491A3] disabled:cursor-not-allowed appearance-none pr-8',
                error && 'border-rose-500 focus:ring-rose-500 focus:border-rose-500',
                className
              )
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#8491A3]">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <span className="text-xs text-rose-700 font-medium">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-[#8491A3]">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Select.displayName = 'Select';
export default Select;
