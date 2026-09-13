import React from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Cpu,
  Activity,
  Users,
  Settings2,
  Settings,
  ListTree,
  ShieldCheck,
  Shield,
  Workflow,
  KeyRound,
  Globe,
  LucideProps,
} from 'lucide-react';

const iconRegistry: Record<string, React.FC<LucideProps>> = {
  // Navigation Mappings
  dashboard: LayoutDashboard,
  LayoutDashboard: LayoutDashboard,
  layoutdashboard: LayoutDashboard,

  projects: FolderKanban,
  FolderKanban: FolderKanban,
  folderkanban: FolderKanban,

  conversion: Cpu,
  conversionengine: Cpu,
  Cpu: Cpu,
  cpu: Cpu,
  workflow: Workflow,

  diagnostics: Activity,
  systemdiagnostics: Activity,
  Activity: Activity,
  activity: Activity,

  users: Users,
  usermanagement: Users,
  Users: Users,

  administration: Settings2,
  admin: Settings2,
  Settings2: Settings2,
  settings2: Settings2,

  settings: Settings,
  systemsettings: Settings,
  Settings: Settings,

  'menu-builder': ListTree,
  menubuilder: ListTree,
  ListTree: ListTree,
  listtree: ListTree,

  roles: ShieldCheck,
  rolespermissions: ShieldCheck,
  permissions: KeyRound,
  Shield: Shield,
  ShieldCheck: ShieldCheck,

  globe: Globe,
  Globe: Globe,
};

export interface DynamicIconProps extends LucideProps {
  name?: string;
  className?: string;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = 'w-4 h-4', ...props }) => {
  if (!name) {
    return <Settings2 className={className} {...props} />;
  }

  const cleanName = name.toLowerCase().replace(/[-_]/g, '');
  const IconComponent =
    iconRegistry[name] ||
    iconRegistry[cleanName] ||
    (name.length > 2 && (name.charAt(0).toUpperCase() + name.slice(1)) in iconRegistry
      ? iconRegistry[name.charAt(0).toUpperCase() + name.slice(1)]
      : null);

  const FinalIcon = IconComponent || Settings2;

  return <FinalIcon className={className} {...props} />;
};

export default DynamicIcon;
