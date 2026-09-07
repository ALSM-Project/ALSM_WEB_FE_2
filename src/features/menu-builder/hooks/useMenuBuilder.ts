import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { menuItemsApi, CreateMenuItemInput, UpdateMenuItemInput } from '../api/menu-items.api';
import { BackendNavItem } from '../../navigation/api/navigation.api';

export const useMenuBuilder = (application: 'WEB_2' | 'WEB_3' = 'WEB_2') => {
  const queryClient = useQueryClient();

  const menuTreeQuery = useQuery<BackendNavItem[]>({
    queryKey: ['adminMenuTree', application],
    queryFn: () => menuItemsApi.getAdminMenuTree(application),
  });

  const createMutation = useMutation({
    mutationFn: menuItemsApi.createMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMenuTree'] });
      queryClient.invalidateQueries({ queryKey: ['navigation'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMenuItemInput }) =>
      menuItemsApi.updateMenuItem(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMenuTree'] });
      queryClient.invalidateQueries({ queryKey: ['navigation'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: menuItemsApi.deleteMenuItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMenuTree'] });
      queryClient.invalidateQueries({ queryKey: ['navigation'] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: ({ id, parentId, targetOrder }: { id: string; parentId: string | null; targetOrder?: number }) =>
      menuItemsApi.moveMenuItem(id, parentId, targetOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminMenuTree'] });
      queryClient.invalidateQueries({ queryKey: ['navigation'] });
    },
  });

  return {
    menuTree: menuTreeQuery.data || [],
    isLoading: menuTreeQuery.isLoading,
    createMenuItem: createMutation.mutateAsync,
    updateMenuItem: updateMutation.mutateAsync,
    deleteMenuItem: deleteMutation.mutateAsync,
    moveMenuItem: moveMutation.mutateAsync,
  };
};
