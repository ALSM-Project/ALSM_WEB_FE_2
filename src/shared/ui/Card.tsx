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
  const baseStyles = 'bg-white rounded-xl transition-all duration-200';

  const variants = {
    default: 'border border-[#D9E2EC] shadow-[0_2px_4px_rgba(9,30,66,0.04)]',
    outline: 'border border-[#E5EAF0]',
    flat: 'bg-[#F7F9FC] border border-[#E5EAF0]',
    interactive: 'border border-[#D9E2EC] shadow-sm hover:border-[#0652CC] hover:shadow-md cursor-pointer',
  };

  const paddings = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
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
