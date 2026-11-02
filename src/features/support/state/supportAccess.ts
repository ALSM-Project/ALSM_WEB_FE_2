import type { UserProfile } from '@/features/auth/api/auth.api';

// Presentation only; no Platform Admin expansion. Server authority remains mandatory.
export const canUseSupport = (user: UserProfile | null | undefined): boolean =>
  user?.isActive === true &&
  user.roles?.includes('INTERNAL_SUPPORT') === true &&
  user.effectivePermissions?.includes('organizations.impersonate') === true;
