import React, { useState, useEffect } from 'react';
import { 
  DollarSign, TrendingUp, Building, ArrowUpRight, 
  RefreshCw, Landmark, CreditCard, Calendar, CheckCircle2, Info, } from 'lucide-react';
import { adminApi, RevenueSummaryDto } from '../api/admin.api';
import { Card } from '@/shared/ui';

interface FinancialTransaction {
  id: string;
  client: string;
  engagementType: string;
  contractValue: number;
  paymentMethod: 'BANK_TRANSFER' | 'CORPORATE_WIRE' | 'PURCHASE_ORDER' | 'DIRECT_DEBIT';
  settlementDate: string;
  status: 'CONFIRMED' | 'SETTLED';
  bankReference?: string;
}

const MOCK_FINANCIAL_TRANSACTIONS: FinancialTransaction[] = [
  {
    id: 'TXN-2026-101',
    client: 'Acme Corporation',
    engagementType: 'Enterprise Tier 1',
    contractValue: 72000,
    paymentMethod: 'BANK_TRANSFER',
    settlementDate: '2026-10-15',
    status: 'CONFIRMED',
    bankReference: 'MB-899886249-ACME-01',
  },
  {
    id: 'TXN-2026-102',
    client: 'Fintech Nexus International',
    engagementType: 'Enterprise Tier 2',
    contractValue: 54000,
    paymentMethod: 'BANK_TRANSFER',
    settlementDate: '2026-10-02',
    status: 'CONFIRMED',
    bankReference: 'MB-899886249-FNX-02',
  },
  {
    id: 'TXN-2026-103',
    client: 'Tokyo Marine Global Insurance',
    engagementType: 'Enterprise Tier 1',
    contractValue: 60000,
    paymentMethod: 'CORPORATE_WIRE',
    settlementDate: '2026-09-18',
    status: 'CONFIRMED',
  },
  {
    id: 'TXN-2026-104',
    client: 'Global Transit Logistics',
    engagementType: 'Managed Partner',
    contractValue: 150000,
    paymentMethod: 'BANK_TRANSFER',
    settlementDate: '2026-09-01',
    status: 'CONFIRMED',
    bankReference: 'MB-899886249-GTL-03',
  },
  {
    id: 'TXN-2026-105',
    client: 'MetLife Modernization Labs',
    engagementType: 'Enterprise Tier 2',
    contractValue: 38000,
    paymentMethod: 'PURCHASE_ORDER',
    settlementDate: '2026-08-20',
    status: 'CONFIRMED',
  },
  {
    id: 'TXN-2026-106',
    client: 'Zurich Financial Tech Labs',
    engagementType: 'Standard Tier',
    contractValue: 24000,
    paymentMethod: 'DIRECT_DEBIT',
    settlementDate: '2026-07-15',
    status: 'CONFIRMED',
  },
];

export const RevenueDashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<RevenueSummaryDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<'ALL_TIME' | 'YTD' | 'LAST_90D' | 'LAST_30D'>('ALL_TIME');

  const fetchRevenue = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getRevenueSummary().catch(() => null);
      if (data && data.totalRevenue > 0) {
        setSummary(data);
      } else {
        // Fallback default mock metrics reflecting strictly confirmed transactions ($398,000)
        setSummary({
          totalRevenue: 398000,
          annualRecurringRevenue: 286000,
          activeContractsCount: 6,
          revenueByEngagementType: {
            'Enterprise Tier 1': 132000,
            'Enterprise Tier 2': 92000,
            'Managed Partner': 150000,
            'Standard Tier': 24000,
          },
          topClients: [
            { organizationId: 'org-gtl', organizationName: 'Global Transit Logistics', plan: 'Managed Partner', annualValue: 150000 },
            { organizationId: 'org-acme', organizationName: 'Acme Corporation', plan: 'Enterprise Tier 1', annualValue: 72000 },
            { organizationId: 'org-tokyo', organizationName: 'Tokyo Marine Global Insurance', plan: 'Enterprise Tier 1', annualValue: 60000 },
            { organizationId: 'org-fnx', organizationName: 'Fintech Nexus International', plan: 'Enterprise Tier 2', annualValue: 54000 },
          ],
        });
      }
    } catch {
      setSummary({
        totalRevenue: 398000,
        annualRecurringRevenue: 286000,
        activeContractsCount: 6,
        revenueByEngagementType: {
          'Enterprise Tier 1': 132000,
          'Enterprise Tier 2': 92000,
          'Managed Partner': 150000,
          'Standard Tier': 24000,
        },
        topClients: [
          { organizationId: 'org-gtl', organizationName: 'Global Transit Logistics', plan: 'Managed Partner', annualValue: 150000 },
          { organizationId: 'org-acme', organizationName: 'Acme Corporation', plan: 'Enterprise Tier 1', annualValue: 72000 },
          { organizationId: 'org-tokyo', organizationName: 'Tokyo Marine Global Insurance', plan: 'Enterprise Tier 1', annualValue: 60000 },
          { organizationId: 'org-fnx', organizationName: 'Fintech Nexus International', plan: 'Enterprise Tier 2', annualValue: 54000 },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  // Filter transactions based on selected date range
  const filteredTransactions = MOCK_FINANCIAL_TRANSACTIONS.filter((txn) => {
    const txnDate = new Date(txn.settlementDate).getTime();
    const now = new Date('2026-10-21').getTime();
    if (dateRange === 'LAST_30D') return now - txnDate <= 30 * 24 * 60 * 60 * 1000;
    if (dateRange === 'LAST_90D') return now - txnDate <= 90 * 24 * 60 * 60 * 1000;
    if (dateRange === 'YTD') return txn.settlementDate.startsWith('2026');
    return true;
  });

  // Derived calculations from filtered transactions
  const totalRealisedRevenue = filteredTransactions.reduce((acc, t) => acc + t.contractValue, 0);
  const activeContractsCount = filteredTransactions.length;

  // Breakdown by Payment Method
  const paymentMethodTotals = filteredTransactions.reduce((acc, t) => {
    acc[t.paymentMethod] = (acc[t.paymentMethod] || 0) + t.contractValue;
    return acc;
  }, {} as Record<string, number>);

  const bankTransferTotal = paymentMethodTotals['BANK_TRANSFER'] || 0;
  const bankTransferCount = filteredTransactions.filter((t) => t.paymentMethod === 'BANK_TRANSFER').length;
  const bankTransferPercent = totalRealisedRevenue > 0 ? Math.round((bankTransferTotal / totalRealisedRevenue) * 100) : 0;

  // Breakdown by Engagement Type
  const engagementTotals = filteredTransactions.reduce((acc, t) => {
    acc[t.engagementType] = (acc[t.engagementType] || 0) + t.contractValue;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="py-20 text-center text-[#6B778C]">
        <div className="w-8 h-8 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Calculating platform commercial revenue from confirmed contracts...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F1FF] text-[#0652CC] uppercase tracking-wider">
              Finance & Commercial Oversight
            </span>
            <span className="text-[11px] text-[#6B778C]">Strict Audited Realised Billings</span>
          </div>
          <h1 className="text-2xl font-bold text-[#091E42] tracking-tight mt-1">
            Total Commercial Revenue
          </h1>
          <p className="text-xs text-[#6B778C] mt-1">
            Executive financial dashboard tracking modernization enterprise contracts, ARR, and payment methods.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Date Filter */}
          <div className="flex items-center gap-1.5 bg-white border border-[#D9E2EC] rounded-xl px-3 py-1.5 shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-[#0652CC]" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="text-xs font-semibold text-[#091E42] bg-transparent outline-none cursor-pointer"
            >
              <option value="ALL_TIME">All Time (Audited)</option>
              <option value="YTD">Year to Date (2026)</option>
              <option value="LAST_90D">Last 90 Days</option>
              <option value="LAST_30D">Last 30 Days</option>
            </select>
          </div>

          <button
            onClick={fetchRevenue}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-[#D9E2EC] text-[#091E42] rounded-xl text-xs font-semibold hover:bg-[#F7F9FC] transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw className="w-4 h-4 text-[#0652CC]" />
            Refresh Financials
          </button>
        </div>
      </div>

      {/* Prominent Simulated Data Notice (Requirement E) */}
      <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-300 text-amber-950 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Info className="w-4 h-4 text-amber-700 shrink-0" />
          <span>
            <strong>Simulated Financial Environment:</strong> Total revenue accounting is strictly derived from <strong>simulated signed contracts and confirmed payments</strong>. Pending drafts, quotes, and trial accounts are excluded from realised totals.
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-200 text-amber-900 shrink-0">
          Audited Mock Ledger
        </span>
      </div>

      {/* KPI Stats (Requirement E) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Realised Revenue */}
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-[#6B778C]">Total Realised Revenue</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-[#091E42]">
              ${totalRealisedRevenue.toLocaleString()} <span className="text-xs font-normal text-slate-500">USD</span>
            </div>
            <p className="text-[11px] text-emerald-700 flex items-center mt-1">
              <ArrowUpRight className="w-3 h-3 mr-0.5" /> 100% Confirmed and Paid Contracts
            </p>
          </div>
        </Card>

        {/* ARR */}
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-[#6B778C]">Annual Recurring (ARR)</span>
            <div className="p-2 rounded-lg bg-blue-50 text-[#0652CC]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-[#091E42]">
              ${(summary?.annualRecurringRevenue ?? Math.round(totalRealisedRevenue * 0.72)).toLocaleString()}
            </div>
            <p className="text-[11px] text-[#6B778C] mt-1">Active enterprise annual commitments</p>
          </div>
        </Card>

        {/* Bank Transfer Share */}
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-[#6B778C]">Bank Transfer Volume</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-[#091E42]">
              ${bankTransferTotal.toLocaleString()}
            </div>
            <p className="text-[11px] text-indigo-700 flex items-center mt-1">
              {bankTransferPercent}% of platform settlements ({bankTransferCount} transfers)
            </p>
          </div>
        </Card>

        {/* Active Executed Contracts */}
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-[#6B778C]">Executed Contracts</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-bold text-[#091E42]">
              {activeContractsCount}
            </div>
            <p className="text-[11px] text-[#6B778C] mt-1">Confirmed enterprise tenant agreements</p>
          </div>
        </Card>
      </div>

      {/* Grid: Revenue by Engagement Type & Revenue by Payment Method (Requirement E) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Breakdown by Engagement Type */}
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#091E42] pb-3 border-b border-[#E5EAF0]">
            Revenue by Engagement Tier
          </h3>
          <div className="mt-4 space-y-3.5">
            {Object.keys(engagementTotals).length === 0 ? (
              <p className="text-xs text-[#6B778C] py-6 text-center">No active contracts for selected date range.</p>
            ) : (
              Object.entries(engagementTotals).map(([tier, rev]) => {
                const pct = totalRealisedRevenue > 0 ? Math.round((rev / totalRealisedRevenue) * 100) : 0;
                return (
                  <div key={tier}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-[#091E42]">{tier}</span>
                      <span className="font-mono text-[#6B778C]">
                        ${rev.toLocaleString()} USD ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-[#F7F9FC] h-2.5 rounded-full overflow-hidden border border-[#E5EAF0]">
                      <div
                        className="bg-[#0652CC] h-full rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Breakdown by Payment Method (Requirement E) */}
        <Card variant="default" padding="md" className="bg-white border-[#E5EAF0]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#091E42] pb-3 border-b border-[#E5EAF0]">
            Revenue by Payment Method
          </h3>
          <div className="mt-4 space-y-3.5">
            {Object.entries(paymentMethodTotals).map(([method, amount]) => {
              const pct = totalRealisedRevenue > 0 ? Math.round((amount / totalRealisedRevenue) * 100) : 0;
              const formatLabel =
                method === 'BANK_TRANSFER'
                  ? 'Direct Bank Transfer (MB Bank)'
                  : method === 'CORPORATE_WIRE'
                  ? 'International Corporate Wire'
                  : method === 'PURCHASE_ORDER'
                  ? 'Enterprise Purchase Order (Net 30)'
                  : 'Automated Direct Debit';

              const barColor =
                method === 'BANK_TRANSFER'
                  ? 'bg-emerald-600'
                  : method === 'CORPORATE_WIRE'
                  ? 'bg-[#0652CC]'
                  : 'bg-purple-600';

              return (
                <div key={method}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-[#091E42]">{formatLabel}</span>
                    <span className="font-mono text-[#6B778C]">
                      ${amount.toLocaleString()} USD ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#F7F9FC] h-2.5 rounded-full overflow-hidden border border-[#E5EAF0]">
                    <div
                      className={`${barColor} h-full rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Bank Transfer Payment Statistics Card (Requirement E) */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <Landmark className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#091E42]">
              Bank Transfer Payment Infrastructure Statistics
            </h3>
          </div>
          <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Designated Corporate Account: MB Bank (STK: 0899886249)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500">Total Bank Volume</span>
            <div className="text-xl font-bold text-[#091E42] mt-1">${bankTransferTotal.toLocaleString()} USD</div>
            <p className="text-[11px] text-slate-500 mt-0.5 font-mono">≈ 9,950,000,000 VND</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500">Confirmed Bank Payments</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">{bankTransferCount} Transfers</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Automated webhook matched</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500">Avg Settlement Speed</span>
            <div className="text-xl font-bold text-blue-700 mt-1">1.4 Hours</div>
            <p className="text-[11px] text-slate-500 mt-0.5">VietQR / Interbank fast transfer</p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] uppercase font-bold text-slate-500">Reconciliation Rate</span>
            <div className="text-xl font-bold text-emerald-700 mt-1">100.0%</div>
            <p className="text-[11px] text-slate-500 mt-0.5">Zero unallocated suspense funds</p>
          </div>
        </div>
      </div>

      {/* Confirmed Contracts & Payment Ledger Table (Requirement E) */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#E5EAF0] flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#091E42]">
              Confirmed Contracts & Realised Payment Ledger
            </h3>
            <p className="text-[11px] text-[#6B778C] mt-0.5">
              Simulated ledger of executed enterprise agreements and verified settlement receipts.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-700 font-bold">
            {filteredTransactions.length} Settled Transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                <th className="py-3 px-4">Transaction Reference</th>
                <th className="py-3 px-4">Enterprise Account</th>
                <th className="py-3 px-4">Engagement Tier</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4">Settlement Date</th>
                <th className="py-3 px-4">Contract Value</th>
                <th className="py-3 px-4 text-right">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {filteredTransactions.map((t) => (
                <tr key={t.id} className="hover:bg-[#F9FBFF] transition-colors">
                  <td className="py-3 px-4 font-mono font-semibold text-[#091E42]">
                    {t.id}
                    {t.bankReference && (
                      <div className="text-[10px] text-slate-500 font-normal">{t.bankReference}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 font-bold text-[#091E42]">{t.client}</td>
                  <td className="py-3 px-4 text-[#091E42]">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0652CC]">
                      {t.engagementType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#6B778C]">
                    <div className="flex items-center gap-1.5 font-medium text-[#091E42]">
                      {t.paymentMethod === 'BANK_TRANSFER' ? (
                        <Landmark className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <CreditCard className="w-3.5 h-3.5 text-[#0652CC]" />
                      )}
                      <span>{t.paymentMethod.replace(/_/g, ' ')}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#6B778C] font-mono">
                    {new Date(t.settlementDate).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-700">
                    ${t.contractValue.toLocaleString()} USD
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      CONFIRMED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevenueDashboardPage;
