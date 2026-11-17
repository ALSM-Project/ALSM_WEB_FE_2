import React from 'react';
import { Search, X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue?: (val: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onChangeValue,
  onClear,
  placeholder = 'Search records...',
  className = '',
  inputClassName = '',
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    onChangeValue?.(e.target.value);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChangeValue) {
      onChangeValue('');
    }
  };

  return (
    <div className={twMerge('relative flex items-center min-w-[200px] max-w-sm', className)}>
      <Search className="w-4 h-4 text-[#8491A3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
      <input
        type="text"
        {...props}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={twMerge(
          clsx(
            'w-full h-8 pl-9 pr-8 text-xs bg-white border border-[#DCE3EC] rounded-md text-[#17263A] placeholder-[#8491A3] outline-none transition-colors focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] shadow-2xs',
            inputClassName
          )
        )}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8491A3] hover:text-[#17263A] rounded transition-colors inline-flex items-center justify-center cursor-pointer"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
