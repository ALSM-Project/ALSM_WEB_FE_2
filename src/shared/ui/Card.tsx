import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'outline' | 'flat' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}) => {
  const baseStyles = 'bg-white rounded-lg transition-all duration-150';

  const variants = {
    default: 'border border-[#DCE3EC] shadow-xs',
    outline: 'border border-[#DCE3EC]',
    flat: 'bg-[#F4F7FB] border border-[#DCE3EC]',
    interactive: 'border border-[#DCE3EC] shadow-xs hover:border-[#244A70] hover:shadow-sm cursor-pointer',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6',
  };

  return (
    <div
      className={twMerge(clsx(baseStyles, variants[variant], paddings[padding], className))}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
