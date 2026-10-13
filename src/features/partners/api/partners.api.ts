import { apiClient } from '@/services/api/apiClient';

export type PartnerStatus = 'ACTIVE' | 'INACTIVE';

export interface PartnerDto {
  id: string;
  name: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  notes?: string;
  status: PartnerStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerRequest {
  name: string;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  address?: string;
  notes?: string;
}

export type ConversionType = 'BMS_DSPF_TO_FRONTEND' | 'COBOL_TO_JAVA';
export type ProjectStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface PartnerProjectDto {
  id: string;
  organizationId: string;
  name: string;
  description?: string;
  conversionType: ConversionType;
  status: ProjectStatus;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePartnerProjectRequest {
  name: string;
  description?: string;
  conversionType: ConversionType;
}

export const partnersApi = {
  list: async (): Promise<PartnerDto[]> => {
    return apiClient.get<PartnerDto[]>('/partners');
  },

  create: async (data: CreatePartnerRequest): Promise<PartnerDto> => {
    return apiClient.post<PartnerDto>('/partners', data);
  },

  getById: async (id: string): Promise<PartnerDto> => {
    return apiClient.get<PartnerDto>(`/partners/${id}`);
  },

  listProjects: async (partnerId: string): Promise<PartnerProjectDto[]> => {
    return apiClient.get<PartnerProjectDto[]>(`/partners/${partnerId}/projects`);
  },

  createProject: async (partnerId: string, data: CreatePartnerProjectRequest): Promise<PartnerProjectDto> => {
    return apiClient.post<PartnerProjectDto>(`/partners/${partnerId}/projects`, data);
  },
};
