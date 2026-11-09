import { apiClient } from '@/services/api/apiClient';

export interface SignatoryConfig {
  signerName: string;
  signerTitle: string;
  signerEmail: string;
  digitalCertificateProvider?: string;
  certificateSerialNumber?: string;
  autoCounterSignEnabled?: boolean;
  signatureImageUrl?: string;
  companySealUrl?: string;
  signatureType?: 'drawn' | 'uploaded' | 'typed';
  stampPosition?: 'overlap' | 'side_by_side' | 'signature_only';
  signingMethod?: 'cloud_ca' | 'usb_token' | 'hsm';
  certificateStatus?: 'active' | 'expiring_soon' | 'expired' | 'unverified';
  certificateValidUntil?: string;
}

export interface ProviderCompanyProfile {
  _id?: string;
  version: number;
  isActive: boolean;
  legalName: string;
  taxId: string;
  registeredAddress: string;
  businessRegistrationNumber?: string;
  representativeName: string;
  representativeTitle: string;
  contactEmail: string;
  contactPhone?: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountHolder: string;
  companyLogo?: string;
  signatoryConfig: SignatoryConfig;
  changeReason?: string;
  updatedByEmail?: string;
  updatedAt?: string;
}

export const companyProfileApi = {
  getActiveProfile: async (): Promise<ProviderCompanyProfile> => {
    return apiClient.get<ProviderCompanyProfile>('/admin/company-profile');
  },
  getProfileVersions: async (): Promise<ProviderCompanyProfile[]> => {
    return apiClient.get<ProviderCompanyProfile[]>('/admin/company-profile/versions');
  },
  updateProfile: async (dto: Partial<ProviderCompanyProfile>): Promise<ProviderCompanyProfile> => {
    return apiClient.put<ProviderCompanyProfile>('/admin/company-profile', dto);
  },
};
