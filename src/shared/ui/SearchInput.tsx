import React from 'react';
import { Search, X } from 'lucide-react';

export interface SearchInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value: string;
  onChangeValue?: (val: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onChangeValue,
  onClear,
  placeholder = 'Search records...',
  className = '',
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
    <div className={`relative flex items-center min-w-[200px] max-w-sm ${className}`}>
      <Search className="w-4 h-4 text-[#8491A3] absolute left-3 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-9 pr-8 py-1.5 text-xs bg-white border border-[#DCE3EC] rounded-md text-[#17263A] placeholder-[#8491A3] outline-none transition-colors focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] shadow-2xs"
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 p-1 text-[#8491A3] hover:text-[#17263A] rounded transition-colors"
          aria-label="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default SearchInput;
