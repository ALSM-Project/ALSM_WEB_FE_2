import { apiClient } from '@/services/api/apiClient';

export type ServiceMode = 'SELF_SERVICE_CONVERSION' | 'SELF_SERVICE' | 'WE_CONVERT_FOR_YOU' | 'HYBRID';

export type ContractType =
  | 'SELF_SERVICE_SUBSCRIPTION'
  | 'MANAGED_CONVERSION_SOW'
  | 'ENTERPRISE_HYBRID_MSA'
  | 'NON_DISCLOSURE_AGREEMENT'
  | 'ORDER_FORM'
  | 'CONTRACT_AMENDMENT';

export interface CustomerDetails {
  companyName: string;
  taxId: string;
  businessAddress: string;
  representativeName: string;
  representativeTitle: string;
  contactEmail: string;
  contactPhone?: string;
  powerOfAttorneyRef?: string;
}

export interface ServiceScope {
  screensQuota: number;
  programsQuota: number;
  storageGb: number;
  targetTechnology?: string;
  sourceCodeType?: string;
  supportTier?: string;
  slaCommitment?: string;
  deliverables?: string[];
}

export interface CommercialTerms {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  vatRate: number;
  vatAmount: number;
  totalValue: number;
  currency: string;
  paymentStructure: 'ONE_TIME' | 'MILESTONE_BASED' | 'MONTHLY_SUBSCRIPTION';
  bankAccountInfo?: string;
  paymentTermsDays?: string;
}

export interface ContractClause {
  category: string;
  title: string;
  description: string;
  titleEn?: string;
  titleVi?: string;
  descriptionEn?: string;
  descriptionVi?: string;
  legalReference?: string;
  isMandatory?: boolean;
}

export interface ContractMilestone {
  id?: string;
  title: string;
  description: string;
  targetDate: string;
  paymentPercentage: number;
  deliverables: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'APPROVED';
}

export interface PaymentScheduleItem {
  installment: string;
  title: string;
  dueDate: string;
  percentage: number;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE';
}

export interface ContractSigner {
  name: string;
  title: string;
  email: string;
  signedAt: string;
  signatureHash: string;
  ipAddress?: string;
  certificateReference?: string;
  authMethod?: string;
}

export interface ContractSigningProcess {
  providerSigningStatus: 'NOT_SIGNED' | 'SIGNED';
  customerSigningStatus: 'NOT_SIGNED' | 'SIGNED';
  providerName?: string;
  documentSha256?: string;
  alsmSigner?: ContractSigner | null;
  customerSigner?: ContractSigner | null;
}

export interface ContractAuditLogItem {
  id: string;
  action: string;
  actorUserId?: string;
  actorName?: string;
  timestamp: string;
  details: string;
}

export interface ContractAmendmentItem {
  id: string;
  amendmentNumber: string;
  title: string;
  effectiveDate: string;
  changesSummary: string;
  additionalValue?: number;
  additionalScreensQuota?: number;
  status: string;
  createdAt: string;
}

export interface EnterpriseContract {
  id: string;
  contractNumber: string;
  title: string;
  organizationId: string;
  organizationName: string;
  serviceMode: ServiceMode;
  contractType: ContractType;
  status: 'ACTIVE' | 'DRAFT' | 'SIGNED' | 'SUSPENDED' | 'EXPIRED' | 'TERMINATED' | 'COMPLETED' | string;
  contractStatus?: string;
  paymentStatus?: string;
  lifecycleStatus: string;
  reviewStatus?: string;
  activationStatus?: string;
  plan: string;
  effectiveDate: string;
  endDate: string;
  signedDate?: string;
  customer: CustomerDetails;
  parties?: {
    provider: {
      legalName: string;
      brandName: string;
      taxId: string;
      headquarters: string;
      signatoryName: string;
      signatoryTitle: string;
      contactEmail: string;
    };
    customer: CustomerDetails;
  };
  scope: ServiceScope;
  commercialTerms: CommercialTerms;
  clauses: ContractClause[];
  milestones: ContractMilestone[];
  paymentSchedule: PaymentScheduleItem[];
  signingProcess: ContractSigningProcess;
  serviceUsage?: {
    screensQuota: number;
    usedScreens: number;
    remainingScreens: number;
    programsQuota: number;
    usedPrograms: number;
    storageQuotaGb: number;
    usedStorageGb: number;
  };
  screensQuota?: number;
  signingStatus?: {
    alsm: boolean;
    customer: boolean;
  };
  usedScreens?: number;
  maxScreens?: number;
  remainingScreens?: number;
  totalValue: number;
  currency: string;
  amendments: ContractAmendmentItem[];
  renewals: any[];
  auditTrail: ContractAuditLogItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ContractDashboardStats {
  total: number;
  draft: number;
  underReview: number;
  pendingSignature: number;
  active: number;
  expiringSoon: number;
  terminated: number;
  totalValueVnd: number;
}

export interface CreateContractPayload {
  title: string;
  serviceMode: ServiceMode;
  contractType: ContractType;
  organizationId: string;
  leadId?: string;
  planTier: string;
  effectiveDate: string;
  endDate: string;
  customer: CustomerDetails;
  scope: ServiceScope;
  commercialTerms: {
    totalValue: number;
    currency?: string;
    discountPercent?: number;
    vatRate?: number;
    paymentStructure?: 'ONE_TIME' | 'MILESTONE_BASED' | 'MONTHLY_SUBSCRIPTION';
    bankAccountInfo?: string;
    paymentTermsDays?: string;
  };
  clauses?: ContractClause[];
  milestones?: ContractMilestone[];
}

export const contractsApi = {
  getDashboardStats: async (): Promise<ContractDashboardStats> => {
    try {
      return await apiClient.get<ContractDashboardStats>('/enterprise-contracts/stats');
    } catch {
      return {
        total: 1,
        draft: 0,
        underReview: 0,
        pendingSignature: 0,
        active: 1,
        expiringSoon: 0,
        terminated: 0,
        totalValueVnd: 75000,
      };
    }
  },

  listContracts: async (params?: {
    tab?: string;
    serviceMode?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: EnterpriseContract[]; pagination: any }> => {
    try {
      const query = new URLSearchParams();
      if (params?.tab) query.set('tab', params.tab);
      if (params?.serviceMode) query.set('serviceMode', params.serviceMode);
      if (params?.search) query.set('search', params.search);
      if (params?.page) query.set('page', params.page.toString());
      if (params?.limit) query.set('limit', params.limit.toString());
      const qs = query.toString();
      const url = `/enterprise-contracts${qs ? `?${qs}` : ''}`;
      const res = await apiClient.get<any>(url);
      if (res && Array.isArray(res.items)) return res;
      if (Array.isArray(res)) return { items: res, pagination: { total: res.length, page: 1, limit: 15 } };
      return { items: [], pagination: { total: 0, page: 1, limit: 15 } };
    } catch {
      return { items: [], pagination: { total: 0, page: 1, limit: 15 } };
    }
  },

  getContracts: async (): Promise<EnterpriseContract[]> => {
    try {
      const response = await apiClient.get<any>('/enterprise-contracts');
      if (response && Array.isArray(response.items)) return response.items;
      if (Array.isArray(response)) return response;
      return [];
    } catch (err) {
      console.error('Failed to fetch contracts:', err);
      return [];
    }
  },

  getContractById: async (contractId: string): Promise<EnterpriseContract | null> => {
    try {
      const res = await apiClient.get<EnterpriseContract>(`/enterprise-contracts/${contractId}`);
      if (res && res.contractNumber) return res;
      return null;
    } catch {
      return null;
    }
  },

  createContract: async (payload: CreateContractPayload): Promise<EnterpriseContract> => {
    return apiClient.post<EnterpriseContract>('/enterprise-contracts', payload);
  },

  updateContract: async (contractId: string, updates: Partial<CreateContractPayload>): Promise<EnterpriseContract> => {
    return apiClient.put<EnterpriseContract>(`/enterprise-contracts/${contractId}`, updates);
  },

  submitForReview: async (contractId: string): Promise<EnterpriseContract> => {
    return apiClient.post<EnterpriseContract>(`/enterprise-contracts/${contractId}/submit-review`, {});
  },

  reviewContract: async (contractId: string, action: 'APPROVE' | 'REQUEST_CHANGES' | 'REJECT', reason?: string): Promise<EnterpriseContract> => {
    return apiClient.post<EnterpriseContract>(`/enterprise-contracts/${contractId}/review`, { action, reason });
  },

  sendToCustomer: async (contractId: string): Promise<{ success: boolean; signingLink: string }> => {
    return apiClient.post<{ success: boolean; signingLink: string }>(`/enterprise-contracts/${contractId}/send`, {});
  },

  customerDecision: async (contractId: string, action: 'ACCEPT' | 'REQUEST_CHANGES' | 'DECLINE', comments?: string): Promise<EnterpriseContract> => {
    return apiClient.post<EnterpriseContract>(`/enterprise-contracts/${contractId}/decision`, { action, comments });
  },

  signContract: async (contractId: string, payload: {
    signerRole: 'ALSM_PROVIDER' | 'CUSTOMER';
    signerName: string;
    signerTitle: string;
    signerEmail: string;
    authMethod?: string;
  }): Promise<EnterpriseContract> => {
    return apiClient.post<EnterpriseContract>(`/enterprise-contracts/${contractId}/sign`, payload);
  },

  retryProvisioning: async (contractId: string): Promise<any> => {
    return apiClient.post(`/enterprise-contracts/${contractId}/retry-provisioning`, {});
  },

  getContractInvoice: async (contractId: string): Promise<any> => {
    return apiClient.get(`/enterprise-contracts/${contractId}/invoice`);
  },

  activateContract: async (contractId: string): Promise<EnterpriseContract> => {
    return apiClient.post<EnterpriseContract>(`/enterprise-contracts/${contractId}/activate`, {});
  },

  amendContract: async (contractId: string, payload: {
    amendmentTitle: string;
    effectiveDate: string;
    changesSummary: string;
    additionalValue?: number;
    additionalScreensQuota?: number;
  }): Promise<EnterpriseContract> => {
    return apiClient.post<EnterpriseContract>(`/enterprise-contracts/${contractId}/amend`, payload);
  },

  renewContract: async (contractId: string, renewalMonths: number = 12): Promise<EnterpriseContract> => {
    return apiClient.post<EnterpriseContract>(`/enterprise-contracts/${contractId}/renew`, { renewalMonths });
  },

  terminateContract: async (contractId: string, payload: {
    reason: string;
    effectiveTerminationDate: string;
  }): Promise<EnterpriseContract> => {
    return apiClient.post<EnterpriseContract>(`/enterprise-contracts/${contractId}/terminate`, payload);
  },

  getTemplatesAndClauses: async (): Promise<{ templates: any[]; clauses: ContractClause[] }> => {
    return apiClient.get<{ templates: any[]; clauses: ContractClause[] }>('/enterprise-contracts/templates');
  },

  getSelectableCustomers: async (): Promise<{ organizations: any[]; leads: any[] }> => {
    return apiClient.get<{ organizations: any[]; leads: any[] }>('/enterprise-contracts/customers');
  },

  getPdfUrl: (contractId: string): string => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    return `${base}/enterprise-contracts/${contractId}/pdf`;
  },
};
