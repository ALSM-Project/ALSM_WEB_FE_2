import { apiClient } from '@/services/api/apiClient';
import {
  BankAccount,
  BankAccountsListResponse,
  BankAccountsQueryParams,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from '../types/bankAccount.types';

export const bankAccountApi = {
  list: async (params?: BankAccountsQueryParams): Promise<BankAccountsListResponse> => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    if (params?.currency) query.append('currency', params.currency);
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);

    const queryString = query.toString();
    const url = `/admin/bank-accounts${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<BankAccountsListResponse>(url);
  },

  getById: async (id: string): Promise<BankAccount> => {
    return apiClient.get<BankAccount>(`/admin/bank-accounts/${id}`);
  },

  create: async (data: CreateBankAccountInput): Promise<BankAccount> => {
    return apiClient.post<BankAccount>('/admin/bank-accounts', data);
  },

  update: async (id: string, data: UpdateBankAccountInput): Promise<BankAccount> => {
    return apiClient.patch<BankAccount>(`/admin/bank-accounts/${id}`, data);
  },

  setDefault: async (id: string): Promise<BankAccount> => {
    return apiClient.post<BankAccount>(`/admin/bank-accounts/${id}/set-default`, {});
  },

  deactivate: async (id: string, reason?: string): Promise<BankAccount> => {
    return apiClient.post<BankAccount>(`/admin/bank-accounts/${id}/deactivate`, { reason });
  },

  reactivate: async (id: string): Promise<BankAccount> => {
    return apiClient.post<BankAccount>(`/admin/bank-accounts/${id}/reactivate`, {});
  },

  revealAccountNumber: async (id: string): Promise<{ id: string; accountNumber: string }> => {
    return apiClient.post<{ id: string; accountNumber: string }>(
      `/admin/bank-accounts/${id}/reveal-account-number`,
      {},
    );
  },
};
