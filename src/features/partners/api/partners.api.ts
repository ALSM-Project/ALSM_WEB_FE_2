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

export interface PartnerUploadedFileDto {
  name: string;
  sizeBytes: number;
}

export interface PartnerProjectSourceDto {
  id: string;
  name: string;
  status: string;
}

export interface UploadPartnerProjectSourceResult {
  inputReference: string;
  files: PartnerUploadedFileDto[];
  screens: PartnerProjectSourceDto[];
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

  uploadProjectSource: async (
    partnerId: string,
    projectId: string,
    files: File[],
  ): Promise<UploadPartnerProjectSourceResult> => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return apiClient.post<UploadPartnerProjectSourceResult>(
      `/partners/${partnerId}/projects/${projectId}/source`,
      form,
    );
  },
};
