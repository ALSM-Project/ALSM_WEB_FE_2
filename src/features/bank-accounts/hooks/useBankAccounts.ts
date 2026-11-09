import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { bankAccountApi } from '../api/bankAccountApi';
import {
  BankAccountsQueryParams,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from '../types/bankAccount.types';

export const BANK_ACCOUNTS_QUERY_KEY = ['admin', 'bank-accounts'];

export function useBankAccounts(params?: BankAccountsQueryParams) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...BANK_ACCOUNTS_QUERY_KEY, params],
    queryFn: () => bankAccountApi.list(params),
    staleTime: 1000 * 30, // 30s
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: BANK_ACCOUNTS_QUERY_KEY });
  };

  const createMutation = useMutation({
    mutationFn: (input: CreateBankAccountInput) => bankAccountApi.create(input),
    onSuccess: () => invalidate(),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateBankAccountInput }) =>
      bankAccountApi.update(id, input),
    onSuccess: () => invalidate(),
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => bankAccountApi.setDefault(id),
    onSuccess: () => invalidate(),
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      bankAccountApi.deactivate(id, reason),
    onSuccess: () => invalidate(),
  });

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => bankAccountApi.reactivate(id),
    onSuccess: () => invalidate(),
  });

  const revealMutation = useMutation({
    mutationFn: (id: string) => bankAccountApi.revealAccountNumber(id),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
    createAccount: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    createError: createMutation.error as Error | null,
    updateAccount: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    updateError: updateMutation.error as Error | null,
    setDefault: setDefaultMutation.mutateAsync,
    isSettingDefault: setDefaultMutation.isPending,
    deactivateAccount: deactivateMutation.mutateAsync,
    isDeactivating: deactivateMutation.isPending,
    reactivateAccount: reactivateMutation.mutateAsync,
    isReactivating: reactivateMutation.isPending,
    revealAccountNumber: revealMutation.mutateAsync,
    isRevealing: revealMutation.isPending,
  };
}
