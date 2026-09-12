import { useNavigationContext } from '@/context/NavigationContext';

export function useNavigation() {
  const ctx = useNavigationContext();

  return {
    pageTitle: ctx.pageTitle,
    sectionTitle: ctx.sectionTitle,
    breadcrumbs: ctx.breadcrumbs,
    currentItem: ctx.currentItem,
    sidebarNav: ctx.sidebarNav,
    navigation: ctx.navigation,
    loading: ctx.loading,
    error: null,
    selectedItemId: ctx.selectedItemId,
    setSelectedItemId: ctx.setSelectedItemId,
    addItem: ctx.addItem,
    updateItem: ctx.updateItem,
    deleteItem: ctx.deleteItem,
    moveItem: ctx.moveItem,
    reorderSibling: ctx.reorderSibling,
    duplicateItem: ctx.duplicateItem,
    resetToDefault: ctx.resetToDefault,
    saveChanges: ctx.saveChanges,
    isDirty: ctx.isDirty,
    refreshNavigation: ctx.saveChanges,
  };
}

export default useNavigation;
