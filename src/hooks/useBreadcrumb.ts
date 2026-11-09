import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useNavigation } from './useNavigation';
import { BreadcrumbNode } from '@/shared/navigation/breadcrumbUtils';

/**
 * Hook to dynamically bind an entity's real name (e.g. Org Name, Lead Name, Project Name, Partner Name)
 * into the platform's breadcrumb and page title.
 * Automatically cleans up when unmounted.
 *
 * @param entityName The business name of the entity fetched from API (e.g. org?.name)
 * @param customKey Optional key. Defaults to current path's last segment (ID) or 'entity'.
 */
export function useBreadcrumbEntity(entityName?: string | null, customKey?: string) {
  const { setDynamicLabel, removeDynamicLabel } = useNavigation();
  const location = useLocation();

  useEffect(() => {
    if (!entityName || typeof entityName !== 'string') return;
    const trimmed = entityName.trim();
    if (!trimmed) return;

    // Determine the key: provided customKey, or last URL segment, or 'entity'
    const segments = location.pathname.split('/').filter(Boolean);
    const key = customKey || segments[segments.length - 1] || 'entity';

    setDynamicLabel(key, trimmed);
    // Also set fallback generic key if customKey wasn't explicit
    if (!customKey) {
      setDynamicLabel('entity', trimmed);
    }

    return () => {
      removeDynamicLabel(key);
      if (!customKey) {
        removeDynamicLabel('entity');
      }
    };
  }, [entityName, customKey, location.pathname, setDynamicLabel, removeDynamicLabel]);
}

/**
 * Hook to set custom breadcrumbs directly for a page, with automatic cleanup on unmount.
 */
export function useSetBreadcrumbs(crumbs: BreadcrumbNode[] | null) {
  const { setCustomBreadcrumbs } = useNavigation();

  useEffect(() => {
    if (crumbs) {
      setCustomBreadcrumbs(crumbs);
    }
    return () => {
      setCustomBreadcrumbs(null);
    };
  }, [crumbs, setCustomBreadcrumbs]);
}

/**
 * Hook to access current navigation breadcrumbs and dynamic controls.
 */
export function useBreadcrumb() {
  const nav = useNavigation();
  return {
    breadcrumbs: nav.breadcrumbs,
    pageTitle: nav.pageTitle,
    sectionTitle: nav.sectionTitle,
    setDynamicLabel: nav.setDynamicLabel,
    removeDynamicLabel: nav.removeDynamicLabel,
    setCustomBreadcrumbs: nav.setCustomBreadcrumbs,
  };
}

export default useBreadcrumb;
