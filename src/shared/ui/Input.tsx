import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, disabled, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full flex flex-col space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-semibold text-[#17263A] tracking-tight">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={twMerge(
            clsx(
              'w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#DCE3EC] rounded-md text-[#17263A] placeholder-[#8491A3] shadow-2xs transition-all focus:outline-none focus:ring-1 focus:ring-[#244A70] focus:border-[#244A70] disabled:bg-[#EEF1F6] disabled:text-[#8491A3] disabled:cursor-not-allowed',
              error && 'border-rose-500 focus:ring-rose-500 focus:border-rose-500',
              className
            )
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs text-rose-700 font-medium">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-[#8491A3]">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
