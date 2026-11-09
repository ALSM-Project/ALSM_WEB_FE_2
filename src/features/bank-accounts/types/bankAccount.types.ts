export interface BankAccount {
  id: string;
  bankName: string;
  bankCode: string | null;
  bin?: string | null;
  accountHolderName: string;
  accountNumberMasked: string;
  accountNumberLast4: string;
  currency: string;
  country: string;
  branchName: string | null;
  swiftBic: string | null;
  bankAddress: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  isDefault: boolean;
  createdAt?: string;
  updatedAt?: string;
  deactivatedAt?: string | null;
  deactivationReason?: string | null;
}

export interface BankAccountsSummary {
  total: number;
  active: number;
  inactive: number;
  defaultCount: number;
}

export interface BankAccountsListResponse {
  items: BankAccount[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: BankAccountsSummary;
}

export interface CreateBankAccountInput {
  bankName: string;
  bankCode?: string;
  bin?: string;
  accountHolderName: string;
  accountNumber: string;
  currency: string;
  country?: string;
  branchName?: string;
  swiftBic?: string;
  bankAddress?: string;
  description?: string;
  status?: 'active' | 'inactive';
  isDefault?: boolean;
}

export interface UpdateBankAccountInput {
  bankName?: string;
  bankCode?: string;
  bin?: string;
  accountHolderName?: string;
  accountNumber?: string;
  currency?: string;
  country?: string;
  branchName?: string;
  swiftBic?: string;
  bankAddress?: string;
  description?: string;
  status?: 'active' | 'inactive';
  isDefault?: boolean;
}

export interface BankAccountsQueryParams {
  search?: string;
  status?: 'active' | 'inactive' | 'all';
  currency?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
