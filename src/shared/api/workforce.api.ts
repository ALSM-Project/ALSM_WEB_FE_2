import { apiClient } from '@/services/api/apiClient';

export type PortalType = 'WEB2' | 'WEB3';
export type MemberType = 'INTERNAL_EMPLOYEE' | 'PARTNER_EMPLOYEE' | 'CUSTOMER_MEMBER';
export type EmploymentStatus = 'ACTIVE' | 'OFFBOARDED' | 'SUSPENDED' | 'ALL';

export interface WorkforceEmployee {
  id: string;
  membershipId: string;
  userId: string;
  fullName: string;
  email: string;
  employeeCode: string;
  department: string;
  teamId?: string;
  teamName?: string;
  role: string;
  memberType: MemberType;
  status: string;
  employmentStatus: string;
  organizationId: string;
  organizationName?: string;
  activeWorkload: number;
  maxCapacity: number;
  avatarUrl?: string;
  roles?: string[];
}

export interface WorkforceSearchQuery {
  q?: string;
  portal?: PortalType;
  organizationId?: string;
  memberType?: MemberType;
  status?: EmploymentStatus;
  page?: number;
  limit?: number;
}

export interface WorkforceSearchResponse {
  items: WorkforceEmployee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const workforceApi = {
  searchWorkforce: async (query: WorkforceSearchQuery): Promise<WorkforceSearchResponse> => {
    const params = new URLSearchParams();
    if (query.q) params.append('q', query.q);
    if (query.portal) params.append('portal', query.portal);
    if (query.organizationId) params.append('organizationId', query.organizationId);
    if (query.memberType) params.append('memberType', query.memberType);
    if (query.status) params.append('status', query.status);
    if (query.page) params.append('page', String(query.page));
    if (query.limit) params.append('limit', String(query.limit));

    const queryString = params.toString();
    const url = `/workforce/search${queryString ? `?${queryString}` : ''}`;
    return apiClient.get<WorkforceSearchResponse>(url);
  },

  getInternalStaff: async (): Promise<WorkforceEmployee[]> => {
    return apiClient.get<WorkforceEmployee[]>('/workforce/internal-staff');
  },
};
