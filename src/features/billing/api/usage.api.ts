import { apiClient } from '@/services/api/apiClient';
import type { UsageStatistics } from '../types/usage';

export const usageApi = {
  getUsageStats: (): Promise<UsageStatistics> =>
    apiClient.get<UsageStatistics>('/billing/usage'),
};
