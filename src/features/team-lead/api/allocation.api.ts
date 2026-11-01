import { apiClient } from '@/services/api/apiClient';
import { PartnerProject } from '@/features/partners/types/partner.types';

export interface EligibleStaffMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  activeWorkload: number;
  maxCapacity: number;
  availableCapacity: number;
  availability: 'AVAILABLE' | 'MODERATE' | 'BUSY' | 'OVERLOADED';
  technicalSkills: string[];
  isAssignedToThisProject: boolean;
}

export interface AssignedStaffDetail {
  id: string;
  fullName: string;
  email: string;
  role: string;
  activeWorkload: number;
  maxCapacity: number;
  technicalSkills: string[];
  assignedAt?: string;
  assignedBy?: string;
  assignedByName?: string;
  note?: string;
}

export interface ProjectAllocationDetails {
  project: PartnerProject;
  assignedStaff: AssignedStaffDetail[];
  teamLead?: {
    id: string;
    fullName: string;
    email: string;
  } | null;
  metrics: {
    requiredStaffCount: number;
    assignedStaffCount: number;
    workloadStatus: 'OPTIMAL' | 'MODERATE' | 'OVERLOADED';
    allocationHealth: 'HEALTHY' | 'ACTION_REQUIRED';
  };
}

export interface AllocationHistoryItem {
  id: string;
  action: string;
  timestamp: string;
  actorId?: string;
  actorName: string;
  actorEmail?: string;
  staffId?: string;
  staffName?: string;
  note?: string;
  reason?: string;
}

export const allocationApi = {
  async getProjectAllocation(projectId: string): Promise<ProjectAllocationDetails> {
    const data = await apiClient.get<ProjectAllocationDetails>(`/projects/${projectId}/allocation`);
    return data;
  },

  async getEligibleStaff(projectId: string): Promise<EligibleStaffMember[]> {
    const data = await apiClient.get<EligibleStaffMember[]>(`/projects/${projectId}/eligible-staff`);
    return Array.isArray(data) ? data : [];
  },

  async allocateStaff(
    projectId: string,
    payload: {
      staffId: string;
      note?: string;
      reason?: string;
      role?: string;
      responsibility?: string;
      priority?: string;
    }
  ): Promise<any> {
    return apiClient.post(`/projects/${projectId}/assign-staff`, {
      staffId: payload.staffId,
      note: payload.note,
      reason: payload.reason,
      role: payload.role,
      responsibility: payload.responsibility,
      priority: payload.priority,
    });
  },

  async removeStaffAllocation(projectId: string, staffId: string, reason?: string): Promise<any> {
    return apiClient.delete(`/projects/${projectId}/allocations/${staffId}`, {
      data: { reason },
    });
  },

  async getAllocationHistory(projectId: string): Promise<AllocationHistoryItem[]> {
    const data = await apiClient.get<AllocationHistoryItem[]>(`/projects/${projectId}/allocation-history`);
    return Array.isArray(data) ? data : [];
  },
};
