import React from 'react';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
}) => {
  const switchWidth = size === 'sm' ? 'w-8 h-4' : 'w-11 h-6';
  const dotSize = size === 'sm' ? 'w-3 h-3' : 'w-5 h-5';
  const translate = size === 'sm' ? (checked ? 'translate-x-4' : 'translate-x-0.5') : (checked ? 'translate-x-5' : 'translate-x-0.5');

  return (
    <label className={`inline-flex items-center space-x-3 cursor-pointer ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative inline-flex ${switchWidth} shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#0652CC] focus:ring-offset-2 ${
          checked ? 'bg-[#0652CC]' : 'bg-[#D9E2EC]'
        }`}
      >
        <span className={`inline-block ${dotSize} transform rounded-full bg-white transition-transform duration-200 shadow-xs ${translate}`} />
      </button>
      {label && <span className="text-sm font-medium text-[#091E42]">{label}</span>}
    </label>
  );
};

export default Toggle;
