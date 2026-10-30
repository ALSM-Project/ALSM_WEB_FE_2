import { apiClient } from '@/services/api/apiClient';

export interface OrganizationDto {
  id: string;
  name: string;
  domain?: string;
  contactEmail?: string;
  type?: 'SELF_SERVICE' | 'ENTERPRISE' | 'INTERNAL' | 'STANDARD' | 'PARTNER';
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
  engagementType?: string;
  memberCount?: number;
  trialExpiresAt?: string;
  limits?: {
    maxProjects: number;
    maxConversionsPerMonth: number;
    maxStorageGb: number;
    aiValidationEnabled: boolean;
    trialScreens?: number;
    trialPrograms?: number;
    trialStorageGb?: number;
    usageScreens?: number;
    usagePrograms?: number;
    usageStorageGb?: number;
  };
  usageStats?: {
    totalScreensConverted: number;
    activeProjects: number;
    storageUsedGb: number;
    conversionsThisMonth: number;
  };
  billingHistory?: Array<{
    id: string;
    invoiceNumber: string;
    date: string;
    plan: string;
    amount: number;
    paymentMethod: string;
    status: 'PAID' | 'PENDING' | 'OVERDUE';
  }>;
  members?: Array<{
    userId: string;
    fullName?: string;
    email: string;
    role: string;
    joinedDate?: string;
    status?: 'ACTIVE' | 'INVITED' | 'INACTIVE';
  }>;
  projectCount?: number;
  conversionJobCount?: number;
  projects?: Array<{
    id: string;
    name: string;
    conversionType: string;
    status: string;
    isDemo?: boolean;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface EngagementTypeDto {
  id: string;
  name: string;
  code: string;
  description?: string;
  features: string[];
  supportTier: string;
  slaHours: number;
  isActive: boolean;
  createdAt: string;
}

export interface RevenueSummaryDto {
  totalRevenue: number;
  annualRecurringRevenue: number;
  activeContractsCount: number;
  revenueByEngagementType: Record<string, number>;
  topClients: Array<{
    organizationId: string;
    organizationName: string;
    annualValue: number;
    plan: string;
  }>;
}

export interface AuditLogDto {
  id: string;
  actor: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  metadata?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
}

export const adminApi = {
  getOrganizations: async (): Promise<OrganizationDto[]> => {
    return apiClient.get<OrganizationDto[]>('/admin/organizations');
  },

  getOrganizationById: async (id: string): Promise<OrganizationDto> => {
    return apiClient.get<OrganizationDto>(`/admin/organizations/${id}`);
  },

  createEnterpriseOrganization: async (data: {
    name: string;
    domain: string;
    adminEmail: string;
    engagementType?: string;
    trialDays?: number;
  }): Promise<{ organization: OrganizationDto; temporaryPassword?: string }> => {
    return apiClient.post<{ organization: OrganizationDto; temporaryPassword?: string }>(
      '/admin/organizations/enterprise',
      data
    );
  },

  updateEngagement: async (
    id: string,
    data: {
      engagementType?: string;
      status?: 'ACTIVE' | 'TRIAL' | 'SUSPENDED';
      limits?: Partial<OrganizationDto['limits']>;
    }
  ): Promise<OrganizationDto> => {
    return apiClient.patch<OrganizationDto>(`/admin/organizations/${id}/engagement`, data);
  },

  getEngagementTypes: async (): Promise<EngagementTypeDto[]> => {
    return apiClient.get<EngagementTypeDto[]>('/admin/engagement-types');
  },

  createEngagementType: async (data: {
    name: string;
    code: string;
    description?: string;
    features?: string[];
    supportTier?: string;
    slaHours?: number;
  }): Promise<EngagementTypeDto> => {
    return apiClient.post<EngagementTypeDto>('/admin/engagement-types', data);
  },

  updateEngagementType: async (
    id: string,
    data: Partial<EngagementTypeDto>
  ): Promise<EngagementTypeDto> => {
    return apiClient.patch<EngagementTypeDto>(`/admin/engagement-types/${id}`, data);
  },

  getRevenueSummary: async (): Promise<RevenueSummaryDto> => {
    return apiClient.get<RevenueSummaryDto>('/admin/revenue/summary');
  },

  lockUserAccount: async (userId: string, reason: string): Promise<{ ok: boolean; message: string }> => {
    return apiClient.post<{ ok: boolean; message: string }>(`/admin/users/${userId}/lock`, { reason });
  },

  unlockUserAccount: async (userId: string): Promise<{ ok: boolean; message: string }> => {
    return apiClient.post<{ ok: boolean; message: string }>(`/admin/users/${userId}/unlock`, {});
  },

  offboardUser: async (
    userId: string,
    data: { transferToUserId: string; reason: string }
  ): Promise<{ ok: boolean; message: string }> => {
    return apiClient.post<{ ok: boolean; message: string }>(`/admin/users/${userId}/offboard`, data);
  },

  transferResource: async (data: {
    fromUserId: string;
    toUserId: string;
    resourceType: 'PROJECT' | 'JOB';
    resourceId: string;
  }): Promise<{ ok: boolean; message: string }> => {
    return apiClient.post<{ ok: boolean; message: string }>('/admin/resources/transfer', data);
  },

  getAuditLogs: async (params?: {
    actor?: string;
    action?: string;
    resourceType?: string;
    limit?: number;
  }): Promise<AuditLogDto[]> => {
    const res = await apiClient.get<any>('/admin/audit-logs', { params });
    const rawItems: any[] = Array.isArray(res) ? res : (Array.isArray(res?.items) ? res.items : []);
    return rawItems.map((log: any) => ({
      id: log._id?.toString() || log.id || String(Math.random()),
      actor: typeof log.actorUserId === 'object' && log.actorUserId !== null
        ? (log.actorUserId.fullName || log.actorUserId.email || 'System')
        : (log.actor || 'System'),
      action: log.action || 'Unknown Action',
      resourceType: log.resourceType || 'SYSTEM',
      resourceId: log.resourceId,
      metadata: log.metadata,
      timestamp: log.createdAt || log.timestamp || new Date().toISOString(),
      ipAddress: log.ipAddress || log.metadata?.ip || '',
    }));
  },

  exportAuditLogsCsv: async (): Promise<string> => {
    return apiClient.get<string>('/admin/audit-logs/export');
  },

  createDemoProject: async (data: {
    name: string;
    organizationId: string;
    sourcePlatform: string;
    targetPlatform: string;
  }): Promise<{ id: string; name: string; isDemo: boolean }> => {
    return apiClient.post<{ id: string; name: string; isDemo: boolean }>('/projects/demo', data);
  },

  allocateProject: async (projectId: string, data: { teamLeadId: string; teamLeadName?: string }): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`/projects/${projectId}/assign-team-lead`, {
      teamLeadId: data.teamLeadId,
      teamLeadUserId: data.teamLeadId,
    });
  },

  assignTeamLead: async (projectId: string, teamLeadUserId: string): Promise<{ success: boolean }> => {
    return apiClient.post<{ success: boolean }>(`/projects/${projectId}/assign-team-lead`, {
      teamLeadId: teamLeadUserId,
      teamLeadUserId,
    });
  },
};
