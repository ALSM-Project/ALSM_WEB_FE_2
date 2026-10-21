import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Download, TrendingUp, DollarSign, Users, 
  ArrowUpRight, Printer, Filter, CheckCircle2, Calendar, 
  Briefcase
} from 'lucide-react';
import { crmApi, SalesReportsDto } from '../api/crm.api';
import { SalesTeamPerformanceView } from '../components/SalesTeamPerformanceView';

export const SalesReportsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'team'>('overview');
  const [reports, setReports] = useState<SalesReportsDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  // Filters
  const [dateRange, setDateRange] = useState<string>('ALL');
  const [teamMember, setTeamMember] = useState<string>('ALL');
  const [region, setRegion] = useState<string>('ALL');

  const fetchReports = async () => {
    try {
      setLoading(true);
      const data = await crmApi.getReports({
        dateRange,
        teamMember,
        region,
      });
      setReports(data);
    } catch (err: any) {
      console.error('Failed to load sales reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [dateRange, teamMember, region]);

  const handleExportCsv = async () => {
    try {
      setExporting(true);
      const csvData = await crmApi.exportReportsCsv({
        dateRange,
        teamMember,
        region,
      });
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `alsm-sales-report-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Export failed:', err);
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E5EAF0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42]">Commercial Sales & Performance</h1>
          <p className="text-xs text-[#6B778C] mt-1">
            Section 3.12: Executive revenue accounting, pipeline stage efficiency, and team output tracking.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#091E42] shadow-xs hover:bg-[#F4F6F8] transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-[#6B778C]" />
            Print / PDF Report
          </button>
          <button
            disabled={exporting}
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#0652CC] bg-[#0652CC] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0543A8] transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            {exporting ? 'Exporting...' : 'Export CSV Report'}
          </button>
        </div>
      </div>

      {/* Navigation View Switcher */}
      <div className="flex items-center gap-2 border-b border-[#E5EAF0]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'border-[#0652CC] text-[#0652CC]'
              : 'border-transparent text-[#6B778C] hover:text-[#091E42]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Sales & Revenue Overview</span>
        </button>
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'team'
              ? 'border-[#0652CC] text-[#0652CC]'
              : 'border-transparent text-[#6B778C] hover:text-[#091E42]'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Representative Performance</span>
        </button>
      </div>

      {/* TAB 1: Sales & Revenue Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#6B778C]" />
              <span className="text-xs font-semibold text-[#091E42]">Report Filters:</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Date Range Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#6B778C]">Date Range:</span>
                <select
                  aria-label="Date Range Filter"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#E5EAF0] bg-[#F7F9FC] text-xs font-medium text-[#091E42] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
                >
                  <option value="ALL">All Time</option>
                  <option value="30D">Last 30 Days</option>
                  <option value="90D">Last 90 Days</option>
                  <option value="YTD">Year to Date (2026)</option>
                </select>
              </div>

              {/* Team Member Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#6B778C]">Representative:</span>
                <select
                  aria-label="Sales Rep Filter"
                  value={teamMember}
                  onChange={(e) => setTeamMember(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#E5EAF0] bg-[#F7F9FC] text-xs font-medium text-[#091E42] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
                >
                  <option value="ALL">All Representatives</option>
                  <option value="Sarah Jenkins">Sarah Jenkins</option>
                  <option value="David Nguyen">David Nguyen</option>
                  <option value="Elena Rostova">Elena Rostova</option>
                </select>
              </div>

              {/* Region Filter */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#6B778C]">Region:</span>
                <select
                  aria-label="Sales Region Filter"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-[#E5EAF0] bg-[#F7F9FC] text-xs font-medium text-[#091E42] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
                >
                  <option value="ALL">All Regions</option>
                  <option value="North America">North America</option>
                  <option value="EMEA">EMEA</option>
                  <option value="APAC">APAC</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-[#6B778C]">
              <div className="w-8 h-8 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Aggregating verified sales revenue and conversion records...
            </div>
          ) : (
            <>
              {/* KPI Stat Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C]">Realised Revenue</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <DollarSign className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-[#091E42]">
                      ${monthlyRevenue.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-emerald-700 flex items-center mt-1 font-medium">
                      <ArrowUpRight className="w-3 h-3 mr-0.5" /> Confirmed closed contracts
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C]">Conversion Rate</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-[#0652CC]">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-[#091E42]">
                      {conversionRate}%
                    </div>
                    <p className="text-[11px] text-[#6B778C] mt-1 font-medium">
                      {wonLeads} won of {totalLeads} total leads
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C]">Average Deal Size</span>
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-[#091E42]">
                      ${averageDealSize.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-[#6B778C] mt-1 font-medium">Mean value per closed deal</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C]">Total Leads in Scope</span>
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="text-2xl font-bold text-[#091E42]">
                      {totalLeads.toLocaleString()}
                    </div>
                    <p className="text-[11px] text-[#6B778C] mt-1 font-medium">Across selected criteria</p>
                  </div>
                </div>
              </div>

              {/* Revenue Over Time Chart */}
              <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5EAF0]">
                  <div>
                    <h3 className="text-sm font-bold text-[#091E42]">Revenue Over Time & Booking Cadence</h3>
                    <p className="text-xs text-[#6B778C] mt-0.5">
                      Monthly cumulative realized contract value and closed deal volume (USD).
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 text-[#0652CC] font-semibold">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#0652CC] inline-block" /> Realised Revenue
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                  {revenueOverTime.map((trend) => {
                    const heightPercent = Math.max(Math.round((trend.revenue / maxMonthlyRevenue) * 100), 8);
                    return (
                      <div key={trend.period} className="flex flex-col items-center justify-end h-48 p-2 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0]">
                        <span className="text-[11px] font-mono font-bold text-[#091E42] mb-1">
                          ${(trend.revenue / 1000).toFixed(0)}k
                        </span>
                        <div className="w-full flex justify-center items-end h-32">
                          <div
                            className="w-8 rounded-t-lg bg-gradient-to-t from-[#0652CC] to-blue-400 transition-all duration-500 shadow-xs"
                            style={{ height: `${heightPercent}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-medium text-[#6B778C] mt-2 text-center">
                          {trend.period}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
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
                <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C] pb-3 border-b border-[#E5EAF0]">
                    Sales Pipeline Stage Breakdown
                  </h3>
                  <div className="mt-4 space-y-3">
                    {Object.keys(stageDistribution).length === 0 ? (
                      <p className="text-xs text-[#6B778C] py-4 text-center">No lead stage data available yet.</p>
                    ) : (
                      Object.entries(stageDistribution).map(([st, count]) => {
                        const numCount = Number(count || 0);
                        const pct = totalLeads > 0
                          ? Math.round((numCount / totalLeads) * 100)
                          : 0;
                        return (
                          <div key={st}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-[#091E42]">{st}</span>
                              <span className="text-[#6B778C] font-mono">{numCount} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-[#F7F9FC] h-2.5 rounded-full overflow-hidden border border-[#E5EAF0]">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  st === 'WON'
                                    ? 'bg-emerald-600'
                                    : st === 'LOST'
                                    ? 'bg-rose-500'
                                    : 'bg-[#0652CC]'
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
                <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C] pb-3 border-b border-[#E5EAF0]">
                    Lead Acquisition Source Attribution
                  </h3>
                  <div className="mt-4 space-y-3">
                    {Object.keys(sourceDistribution).length === 0 ? (
                      <p className="text-xs text-[#6B778C] py-4 text-center">No source attribution data available yet.</p>
                    ) : (
                      Object.entries(sourceDistribution).map(([src, count]) => {
                        const numCount = Number(count || 0);
                        const pct = totalLeads > 0
                          ? Math.round((numCount / totalLeads) * 100)
                          : 0;
                        return (
                          <div key={src}>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="font-semibold text-[#091E42]">{src}</span>
                              <span className="text-[#6B778C] font-mono">{numCount} leads ({pct}%)</span>
                            </div>
                            <div className="w-full bg-[#F7F9FC] h-2.5 rounded-full overflow-hidden border border-[#E5EAF0]">
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
              <div className="rounded-2xl border border-[#E5EAF0] bg-white overflow-hidden shadow-xs">
                <div className="p-4 border-b border-[#E5EAF0] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-bold text-[#091E42]">Recent Closed Won Deals (Audited Revenue)</h3>
                  </div>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {recentWonDeals.length} Contracts Confirmed
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F7F9FC] text-[#6B778C] font-semibold uppercase tracking-wider border-b border-[#E5EAF0]">
                      <tr>
                        <th className="px-4 py-3">Account / Company</th>
                        <th className="px-4 py-3">Region</th>
                        <th className="px-4 py-3">Representative</th>
                        <th className="px-4 py-3">Deal Value</th>
                        <th className="px-4 py-3">Date Closed</th>
                        <th className="px-4 py-3">Contract Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5EAF0]">
                      {recentWonDeals.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-[#6B778C]">
                            No closed won deals found matching active filter set.
                          </td>
                        </tr>
                      ) : (
                        recentWonDeals.map((deal) => (
                          <tr key={deal.id} className="hover:bg-[#F9FAFB] transition-colors">
                            <td className="px-4 py-3.5 font-semibold text-[#091E42] flex items-center gap-2">
                              <Briefcase className="w-3.5 h-3.5 text-[#0652CC]" />
                              {deal.company}
                            </td>
                            <td className="px-4 py-3.5 text-[#6B778C]">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                                {deal.region}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 font-medium text-[#091E42]">{deal.repName}</td>
                            <td className="px-4 py-3.5 font-mono font-bold text-[#091E42]">
                              ${deal.dealValue.toLocaleString()}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-[#6B778C] flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-[#6B778C]" />
                              {new Date(deal.convertedAt).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
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

      {/* TAB 2: Sales Team Performance */}
      {activeTab === 'team' && (
        <SalesTeamPerformanceView
          initialDateRange={dateRange}
          initialRegion={region}
          initialMember={teamMember}
        />
      )}
    </div>
  );
};

export default SalesReportsPage;
