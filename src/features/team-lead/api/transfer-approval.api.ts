import { apiClient } from '@/services/api/apiClient';

export type TransferRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface ResourceTransferRequestDto {
  id: string;
  organizationId: string;
  projectId: string;
  projectName: string;
  currentAssigneeId?: string;
  currentAssigneeName?: string;
  targetAssigneeId: string;
  targetAssigneeName: string;
  targetAssigneeEmail?: string;
  requestedById: string;
  requestedByName: string;
  reason: string;
  note: string;
  status: TransferRequestStatus;
  reviewedById?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNote?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransferRequestDetailResponse {
  request: ResourceTransferRequestDto;
  isValid: boolean;
  validationErrors: string[];
  liveProject: {
    id: string;
    name: string;
    status: string;
    conversionType?: string;
    assignedStaffId?: string;
    assignedStaffName?: string;
    assignedTeamLeadId?: string;
  } | null;
}

export interface ApproveTransferResponse {
  success: boolean;
  request: ResourceTransferRequestDto;
  project: any;
}

export const transferApprovalApi = {
  listRequests: async (params?: {
    status?: TransferRequestStatus;
    search?: string;
  }): Promise<ResourceTransferRequestDto[]> => {
    return apiClient.get<ResourceTransferRequestDto[]>('/resource-transfers/requests', {
      params,
    });
  },

  getRequestDetails: async (id: string): Promise<TransferRequestDetailResponse> => {
    return apiClient.get<TransferRequestDetailResponse>(`/resource-transfers/requests/${id}`);
  },

  createRequest: async (data: {
    projectId: string;
    targetStaffId: string;
    reason?: string;
    note?: string;
  }): Promise<ResourceTransferRequestDto> => {
    return apiClient.post<ResourceTransferRequestDto>('/resource-transfers/requests', data);
  },

  approveRequest: async (
    id: string,
    data?: { note?: string },
  ): Promise<ApproveTransferResponse> => {
    return apiClient.post<ApproveTransferResponse>(
      `/resource-transfers/requests/${id}/approve`,
      data || {},
    );
  },

  rejectRequest: async (
    id: string,
    data: { reason: string },
  ): Promise<{ success: boolean; request: ResourceTransferRequestDto }> => {
    return apiClient.post<{ success: boolean; request: ResourceTransferRequestDto }>(
      `/resource-transfers/requests/${id}/reject`,
      data,
    );
  },
};
