export type NavigationLevel = 'global' | 'primary' | 'secondary' | 'contextual';
export type MenuPosition = 'top' | 'left' | 'right' | 'bottom';

export interface MenuItem {
  id: string;
  label: string;
  icon?: string;
  path?: string;
  level?: NavigationLevel;
  position?: MenuPosition;
  children?: MenuItem[];
  parentId?: string;

  permissions?: string[];
  isPinnable?: boolean;
  isHidden?: boolean;
  isPinned?: boolean;
  usageCount?: number;
  lastUsedAt?: string;

  order?: number;
  isVisible: boolean;
  badge?: string;
  badgeColor?: string;

  groupName?: string;
  description?: string;
  target?: '_blank' | '_self';
}

export interface NavigationData {
  topNav: MenuItem[];
  sidebarNav: MenuItem[];
  secondaryNav: Record<string, MenuItem[]>;
  contextualNav: MenuItem[];
  personalization: {
    pinnedItems: MenuItem[];
    recentItems: MenuItem[];
    suggestedItems: MenuItem[];
  };
  metadata: {
    totalItems: number;
    isDefault: boolean;
    lastUpdated: string;
  };
}
