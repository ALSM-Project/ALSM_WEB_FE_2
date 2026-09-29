export interface UsagePlan {
  tier: string;
  name: string;
}

export interface QuotaMetric {
  used: number;
  max: number; // -1 for unlimited
}

export interface StorageMetric {
  usedGb: number;
  maxGb: number; // -1 for unlimited
}

export interface MonthlyConversion {
  month: string;
  count: number;
}

export interface UsageStatistics {
  plan: UsagePlan;
  screens: QuotaMetric;
  projects: QuotaMetric;
  storage: StorageMetric;
  monthlyConversions: MonthlyConversion[];
}
