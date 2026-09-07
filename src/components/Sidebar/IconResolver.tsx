import React from 'react';
import * as Icons from 'lucide-react';

export interface DynamicIconProps extends React.SVGProps<SVGSVGElement> {
  name?: string;
  className?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = 'w-4 h-4', ...props }) => {
  if (!name) {
    return <Icons.FileText className={className} {...props} />;
  }

  const IconComponent = (Icons as any)[name] || Icons.FileText;
  return <IconComponent className={className} {...props} />;
};

export default DynamicIcon;
