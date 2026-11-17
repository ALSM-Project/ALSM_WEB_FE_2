import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, Download, TrendingUp, DollarSign, Users, 
  ArrowUpRight, Printer, Filter, CheckCircle2, Calendar, 
  Briefcase
} from 'lucide-react';
import { crmApi, SalesReportsDto } from '../api/crm.api';
import { SalesTeamPerformanceView } from '../components/SalesTeamPerformanceView';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { formatVnd } from '@/shared/utils/currency';

export const SalesReportsPage: React.FC<{ initialTab?: 'overview' | 'team' }> = ({ initialTab = 'overview' }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isTeamRoute = location.pathname.includes('team-performance') || initialTab === 'team';
  const [activeTab, setActiveTab] = useState<'overview' | 'team'>(isTeamRoute ? 'team' : 'overview');
  const [reports, setReports] = useState<SalesReportsDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const { hasPermission } = useAuth();

  // Filters
  const [dateRange, setDateRange] = useState<string>('ALL');

  // Synchronize activeTab if initialTab or pathname changes
  useEffect(() => {
    if (location.pathname.includes('team-performance') || initialTab === 'team') {
      setActiveTab('team');
    } else if (location.pathname.includes('sales') || initialTab === 'overview') {
      setActiveTab('overview');
    }
  }, [location.pathname, initialTab]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await crmApi.getReports({ dateRange });
      setReports(data);
    } catch (requestError) {
      const status = (requestError as { response?: { status?: number } })?.response?.status;
      setError(status === 403
        ? 'You do not have permission to view sales reports.'
        : status === 401
          ? 'Your session has expired. Sign in again to view sales reports.'
          : 'Sales reports could not be loaded. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'overview' || hasPermission('sales.reports.view')) {
      fetchReports();
    }
  }, [dateRange, activeTab]);

  const handleTabChange = (tab: 'overview' | 'team') => {
    setActiveTab(tab);
    if (tab === 'team') {
      navigate('/reports/team-performance');
    } else {
      navigate('/sales/reports');
    }
  };

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      setExportError(null);
      const csvData = await crmApi.exportReportsCsv({ dateRange });
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `alsm-sales-report-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setExportError('The report export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const monthlyRevenue = Number(reports?.monthlyRevenue ?? reports?.totalRevenue ?? 0);
  const conversionRate = Number(reports?.conversionRate ?? 0);
  const averageDealSize = Number(reports?.averageDealSize ?? reports?.avgDealSize ?? 0);
  const totalLeads = Number(reports?.totalLeads ?? 0);
  const wonLeads = Number(reports?.wonLeads ?? 0);
  const stageDistribution = reports?.stageDistribution || reports?.pipelineBreakdown || {};
  const sourceDistribution = reports?.sourceDistribution || reports?.leadSources || {};
  const revenueOverTime = reports?.revenueOverTime || [];
  const recentWonDeals = reports?.recentWonDeals || [];

  const maxMonthlyRevenue = Math.max(...revenueOverTime.map((d) => d.revenue), 1);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17263A]">
            {activeTab === 'team' ? 'Team Performance' : 'Sales Reports'}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {activeTab === 'team'
              ? 'Track sales representative performance, quotas, and team output benchmarks.'
              : 'Comprehensive revenue metrics, closed deals, and sales pipeline conversion.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#DCE3EC] bg-white px-3.5 py-2 text-xs font-semibold text-[#17263A] shadow-2xs hover:bg-[#F8FAFC] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-slate-400" />
            Print / PDF Report
          </button>
          <button
            disabled={exporting}
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#244A70] bg-[#244A70] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#1d3c5c] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            {exporting ? 'Exporting...' : 'Export CSV Report'}
          </button>
        </div>
      </div>
      {exportError && <p role="alert" className="text-xs font-medium text-rose-700">{exportError}</p>}

      {/* Navigation View Switcher */}
      <div className="flex items-center gap-2 border-b border-[#DCE3EC]">
        <button
          type="button"
          onClick={() => handleTabChange('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#244A70] text-[#244A70]'
              : 'border-transparent text-slate-500 hover:text-[#17263A]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Sales & Revenue Overview</span>
        </button>
        {hasPermission('sales.team-performance.view') && (
          <button
            type="button"
            onClick={() => handleTabChange('team')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'team'
                ? 'border-[#244A70] text-[#244A70]'
                : 'border-transparent text-slate-500 hover:text-[#17263A]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Team Representative Performance</span>
          </button>
        )}
      </div>

      {/* TAB 1: Sales & Revenue Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#DCE3EC] shadow-2xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-[#17263A]">Report Filters:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date Range Filter */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Date Range:</span>
                <select
                  aria-label="Date Range Filter"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-3 py-1.5 rounded-xl border border-[#DCE3EC] bg-[#F8FAFC] text-xs font-semibold text-[#17263A] focus:outline-none focus:ring-2 focus:ring-[#244A70]/20 focus:border-[#244A70] cursor-pointer shadow-2xs"
                >
                  <option value="ALL">All Time</option>
                  <option value="30D">Last 30 Days</option>
                  <option value="90D">Last 90 Days</option>
                  <option value="YTD">Year to Date (2026)</option>
                </select>
              </div>

            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-slate-500 text-xs font-medium">
              <div className="w-8 h-8 border-2 border-[#244A70] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Aggregating verified sales revenue and conversion records...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center shadow-2xs" role="alert">
              <p className="text-xs font-medium text-rose-800">{error}</p>
              <button onClick={fetchReports} className="mt-3 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-rose-800 border border-rose-200 cursor-pointer shadow-2xs">Retry</button>
            </div>
          ) : (
            <>
              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-[#DCE3EC] bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Sent / Accepted Quote Value</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl sm:text-2xl font-bold text-[#17263A]">
                      {formatVnd(monthlyRevenue)}
                    </div>
                    <p className="text-xs text-emerald-700 flex items-center mt-1 font-medium">
                      <ArrowUpRight className="w-3.5 h-3.5 mr-0.5" /> Sum of sent and accepted quotes
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#DCE3EC] bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Conversion Rate</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-[#244A70]">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl sm:text-2xl font-bold text-[#17263A]">
                      {conversionRate}%
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      {wonLeads} won of {totalLeads} total leads
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#DCE3EC] bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Average Quote Size</span>
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl sm:text-2xl font-bold text-[#17263A]">
                      {formatVnd(averageDealSize)}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Mean value per sent or accepted quote</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#DCE3EC] bg-white p-5 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Leads in Scope</span>
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-xl sm:text-2xl font-bold text-[#17263A]">
                      {totalLeads.toLocaleString()}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 font-medium">Across selected criteria</p>
                  </div>
                </div>
              </div>

              {/* Revenue Over Time Chart */}
              <div className="rounded-2xl border border-[#DCE3EC] bg-white p-5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCE3EC]">
                  <div>
                    <h2 className="text-sm font-bold text-[#17263A]">Revenue Over Time & Booking Cadence</h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Monthly cumulative realized contract value and closed deal volume (VND).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1.5 text-[#244A70] font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#244A70] inline-block" /> Realised Revenue
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {revenueOverTime.map((trend) => {
                    const heightPercent = Math.max(Math.round((trend.revenue / maxMonthlyRevenue) * 100), 8);
                    return (
                      <div key={trend.period} className="flex flex-col items-center justify-end h-48 p-2.5 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC]">
                        <span className="text-xs font-mono font-bold text-[#17263A] mb-1">
                          {formatVnd(trend.revenue)}
                        </span>
                        <div className="w-full flex justify-center items-end h-32">
                          <div
                            className="w-8 rounded-t-md bg-[#244A70] hover:bg-[#1B3856] transition-all duration-300 shadow-2xs"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-600 mt-2 text-center">
                          {trend.period}
                        </span>
                        <span className="text-xs text-slate-500 font-medium font-mono">
                          {trend.dealsCount} {trend.dealsCount === 1 ? 'deal' : 'deals'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Breakdown Grids: Pipeline Stages & Acquisition Sources */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pipeline Stage Breakdown */}
                <div className="rounded-2xl border border-[#DCE3EC] bg-white p-5 shadow-2xs">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 pb-3 border-b border-[#DCE3EC]">
                    Sales Pipeline Stage Breakdown
                  </h2>
                  <div className="mt-4 space-y-3">
                    {Object.keys(stageDistribution).length === 0 ? (
                      <p className="text-xs text-slate-500 font-medium py-4 text-center">No lead stage data available yet.</p>
                    ) : (
                      Object.entries(stageDistribution).map(([st, count]) => {
                        const numCount = Number(count || 0);
                        const pct = totalLeads > 0
                          ? Math.round((numCount / totalLeads) * 100)
                          : 0;
                        return (
                          <div key={st}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-[#17263A]">{st}</span>
                              <span className="text-slate-600 font-medium font-mono">{numCount} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-[#F8FAFC] h-2.5 rounded-full overflow-hidden border border-[#DCE3EC]">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  st === 'WON'
                                    ? 'bg-emerald-600'
                                    : st === 'LOST'
                                    ? 'bg-rose-500'
                                    : 'bg-[#244A70]'
                                }`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Source Distribution */}
                <div className="rounded-2xl border border-[#DCE3EC] bg-white p-5 shadow-2xs">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600 pb-3 border-b border-[#DCE3EC]">
                    Lead Acquisition Source Attribution
                  </h2>
                  <div className="mt-4 space-y-3">
                    {Object.keys(sourceDistribution).length === 0 ? (
                      <p className="text-xs text-slate-500 font-medium py-4 text-center">No source attribution data available yet.</p>
                    ) : (
                      Object.entries(sourceDistribution).map(([src, count]) => {
                        const numCount = Number(count || 0);
                        const pct = totalLeads > 0
                          ? Math.round((numCount / totalLeads) * 100)
                          : 0;
                        return (
                          <div key={src}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-[#17263A]">{src}</span>
                              <span className="text-slate-600 font-medium font-mono">{numCount} leads ({pct}%)</span>
                            </div>
                            <div className="w-full bg-[#F8FAFC] h-2.5 rounded-full overflow-hidden border border-[#DCE3EC]">
                              <div
                                className="bg-indigo-600 h-full rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Won Deals Table (Performance Summary) */}
              <div className="rounded-2xl border border-[#DCE3EC] bg-white overflow-hidden shadow-2xs">
                <div className="p-4 border-b border-[#DCE3EC] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h2 className="text-sm font-bold text-[#17263A]">Recent Closed Won Deals (Audited Revenue)</h2>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {recentWonDeals.length} Contracts Confirmed
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F8FAFC] text-slate-600 font-bold uppercase tracking-wider border-b border-[#DCE3EC]">
                      <tr>
                        <th className="px-4 py-3.5">Account / Company</th>
                        <th className="px-4 py-3.5">Region</th>
                        <th className="px-4 py-3.5">Representative</th>
                        <th className="px-4 py-3.5">Deal Value</th>
                        <th className="px-4 py-3.5">Date Closed</th>
                        <th className="px-4 py-3.5">Contract Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3EC]">
                      {recentWonDeals.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-medium">
                            No closed won deals found matching active filter set.
                          </td>
                        </tr>
                      ) : (
                        recentWonDeals.map((deal) => (
                          <tr key={deal.id} className="hover:bg-[#F9FAFB] transition-colors">
                            <td className="px-4 py-3.5 font-semibold text-[#17263A] flex items-center gap-2">
                              <Briefcase className="w-3.5 h-3.5 text-[#244A70]" />
                              {deal.company}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600">
                              <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                                {deal.region}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-medium text-[#17263A]">{deal.repName}</td>
                            <td className="px-4 py-3.5 font-mono font-bold text-[#17263A]">
                              {formatVnd(deal.dealValue)}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-600 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {new Date(deal.convertedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3" /> Fully Signed & Paid
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* TAB 2: Team Representative Performance */}
      {activeTab === 'team' && (
        <SalesTeamPerformanceView />
      )}
    </div>
  );
};

export default SalesReportsPage;
