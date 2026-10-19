export type UsageHealthStatus =
  | 'HEALTHY'
  | 'NEAR_LIMIT'
  | 'AT_LIMIT'
  | 'EXCEEDED'
  | 'CONTRACT_EXPIRING'
  | 'CONTRACT_EXPIRED'
  | 'SUSPENDED'
  | 'DATA_UNAVAILABLE';

export interface UsageThresholds {
  nearLimitPct: number;
  atLimitPct: number;
  exceededPct: number;
  expiringDays: number;
}

export interface OrganizationUsageSummary {
  totalOrganizations: number;
  activeOrganizations: number;
  nearQuotaOrganizations: number;
  exceededQuotaOrganizations: number;
  suspendedOrganizations?: number;
  contractsExpiringSoonCount: number;
  totalAllocatedScreenCapacity: number;
  totalConsumedScreenCapacity: number;
  totalAllocatedStorageGb: number;
  totalConsumedStorageGb: number;
  thresholds: UsageThresholds;
  lastSyncTime: string;
}

export interface OrganizationUsageItem {
  organizationId: string;
  name: string;
  normalizedName?: string;
  companyName?: string;
  contactEmail?: string;
  domain?: string;
  organizationType?: string;
  serviceMode: 'ALSM_MANAGED' | 'CUSTOMER_SELF_SERVICE';
  subscriptionPlan: string;
  contractStatus: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'SUSPENDED' | 'NO_CONTRACT';
  contractNumber?: string;
  contractExpiresAt?: string;
  daysUntilContractExpiry?: number;
  screenCapacity: number;
  screenUsage: number;
  remainingScreens: number;
  overQuotaScreens?: number;
  isOverQuota?: boolean;
  isConversionBlocked?: boolean;
  screenUsagePct: number;
  projectCapacity: number;
  activeProjects: number;
  remainingProjects: number;
  storageCapacityGb: number;
  storageUsageGb: number;
  remainingStorageGb: number;
  concurrentJobsLimit: number;
  activeJobs: number;
  health: UsageHealthStatus;
  orgStatus: 'ACTIVE' | 'SUSPENDED' | 'TRIAL';
  createdAt: string;
  lastActivityAt?: string;
}

export interface ListOrganizationUsageResponse {
  items: OrganizationUsageItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  thresholds: UsageThresholds;
  lastSyncTime: string;
}

export interface MonthlyUsageTrend {
  year: number;
  month: number;
  monthLabel: string;
  screensConverted: number;
  successfulJobs: number;
  failedJobs: number;
}

export interface ConversionActivityItem {
  id: string;
  projectId: string;
  projectName?: string;
  screenId?: string;
  screenName?: string;
  conversionType: string;
  status: string;
  priority: string;
  attemptCount: number;
  startedAt?: string;
  completedAt?: string;
  durationSeconds?: number;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}

export interface OrganizationUsageDetail extends OrganizationUsageItem {
  membersCount: number;
  monthlyTrends: MonthlyUsageTrend[];
  recentActivities: ConversionActivityItem[];
  contractHistory?: {
    contractNumber?: string;
    contractId?: string;
    status?: string;
    effectiveDate?: string;
    expiresAt?: string;
  };
  auditHistory: Array<{
    action: string;
    actorUserId?: string;
    actorEmail?: string;
    createdAt?: string;
    metadata?: Record<string, string>;
  }>;
}

export interface QuotaAmendmentPayload {
  amendmentType: 'CAPACITY_UPGRADE' | 'ADDITIONAL_SCREENS' | 'STORAGE_EXPANSION' | 'CONTRACT_RENEWAL' | 'INCREASE' | 'DECREASE' | 'TEMPORARY_INCREASE';
  screenCapacityDelta?: number;
  storageGbDelta?: number;
  projectCapacityDelta?: number;
  targetScreenCapacity?: number;
  targetStorageGb?: number;
  targetProjectCapacity?: number;
  targetConcurrentJobs?: number;
  targetMembers?: number;
  contractReference: string;
  justification: string;
  effectiveDate?: string;
  expirationDate?: string;
}
