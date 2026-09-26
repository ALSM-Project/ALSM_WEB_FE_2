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

export const partnersApi = {
  list: async (): Promise<PartnerDto[]> => {
    return apiClient.get<PartnerDto[]>('/partners');
  },

  create: async (data: CreatePartnerRequest): Promise<PartnerDto> => {
    return apiClient.post<PartnerDto>('/partners', data);
  },
};
