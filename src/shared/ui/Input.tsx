import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, disabled, ...props }, ref) => {
    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label className="text-xs font-semibold text-[#091E42] tracking-wide">
            {label}
          </label>
        )}
        <input
          ref={ref}
          disabled={disabled}
          className={twMerge(
            clsx(
              'w-full px-3.5 py-2 text-sm bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] placeholder-[#6B778C] shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#0652CC] focus:border-[#0652CC] disabled:bg-[#F7F9FC] disabled:cursor-not-allowed',
              error && 'border-rose-500 focus:ring-rose-500 focus:border-rose-500',
              className
            )
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs text-rose-600 font-medium">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-[#6B778C]">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
