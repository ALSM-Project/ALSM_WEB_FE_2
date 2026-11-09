import { apiClient } from '@/services/api/apiClient';
import type {
  ListOrganizationUsageResponse,
  OrganizationUsageDetail,
  OrganizationUsageSummary,
  QuotaAmendmentPayload,
  UsageHealthStatus,
} from '../types/organization-usage';

export const organizationUsageApi = {
  getUsageSummary: (params?: { scope?: string; organizationType?: string }): Promise<OrganizationUsageSummary> => {
    const qs = new URLSearchParams();
    if (params?.scope) qs.append('scope', params.scope);
    if (params?.organizationType) qs.append('organizationType', params.organizationType);
    const query = qs.toString();
    return apiClient.get<OrganizationUsageSummary>(`/admin/organization-usage/summary${query ? `?${query}` : ''}`);
  },

  listOrganizationUsage: (params?: {
    search?: string;
    serviceMode?: 'ALSM_MANAGED' | 'CUSTOMER_SELF_SERVICE';
    contractStatus?: string;
    health?: UsageHealthStatus;
    organizationType?: string;
    scope?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<ListOrganizationUsageResponse> => {
    const qs = new URLSearchParams();
    if (params?.search) qs.append('search', params.search);
    if (params?.serviceMode) qs.append('serviceMode', params.serviceMode);
    if (params?.contractStatus) qs.append('contractStatus', params.contractStatus);
    if (params?.health) qs.append('health', params.health);
    if (params?.organizationType) qs.append('organizationType', params.organizationType);
    if (params?.scope) qs.append('scope', params.scope);
    if (params?.page) qs.append('page', String(params.page));
    if (params?.limit) qs.append('limit', String(params.limit));
    if (params?.sortBy) qs.append('sortBy', params.sortBy);
    if (params?.sortOrder) qs.append('sortOrder', params.sortOrder);
    const query = qs.toString();
    return apiClient.get<ListOrganizationUsageResponse>(
      `/admin/organization-usage${query ? `?${query}` : ''}`
    );
  },

  getOrganizationUsageDetail: (id: string): Promise<OrganizationUsageDetail> =>
    apiClient.get<OrganizationUsageDetail>(`/admin/organization-usage/${id}`),

  applyQuotaAmendment: (
    id: string,
    payload: QuotaAmendmentPayload
  ): Promise<OrganizationUsageDetail> =>
    apiClient.post<OrganizationUsageDetail>(
      `/admin/organization-usage/${id}/quota-amendment`,
      payload
    ),

  updateServiceStatus: (
    id: string,
    payload: { action: 'SUSPEND' | 'REACTIVATE'; reason: string }
  ): Promise<{ organizationId: string; name: string; status: string; message: string }> =>
    apiClient.post<{ organizationId: string; name: string; status: string; message: string }>(
      `/admin/organization-usage/${id}/service-status`,
      payload
    ),
};
