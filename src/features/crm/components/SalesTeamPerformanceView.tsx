import React, { useState, useEffect } from 'react';
import {
  Users,
  Award,
  DollarSign,
  TrendingUp,
  Clock,
  ArrowUpDown,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  BarChart2,
  Filter,
} from 'lucide-react';
import { crmApi, SalesTeamPerformanceDto } from '../api/crm.api';
import { useAuth } from '@/features/auth/hooks/useAuth';

interface Props {
  initialDateRange?: string;
  initialRegion?: string;
  initialMember?: string;
}

type SortField = 'leadsAssigned' | 'wonDeals' | 'revenueGenerated' | 'conversionRate';

export const SalesTeamPerformanceView: React.FC<Props> = ({
  initialDateRange = 'ALL',
  initialRegion = 'ALL',
  initialMember = 'ALL',
}) => {
  const { user } = useAuth();
  const [data, setData] = useState<SalesTeamPerformanceDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters
  const [dateRange, setDateRange] = useState<string>(initialDateRange);
  const [region, setRegion] = useState<string>(initialRegion);
  const [teamMember, setTeamMember] = useState<string>(initialMember);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('revenueGenerated');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Chart Metric Selection
  const [chartMetric, setChartMetric] = useState<SortField>('revenueGenerated');

  const fetchPerformance = async () => {
    try {
      setLoading(true);
      const perf = await crmApi.getTeamPerformance({
        dateRange,
        region,
        teamMember,
        userRole: (user as any)?.role || 'ADMIN',
        userEmail: (user as any)?.email,
      });
      setData(perf);
    } catch (err: any) {
      console.error('Failed to load team performance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformance();
  }, [dateRange, region, teamMember]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-[#6B778C]">
        <div className="w-8 h-8 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Calculating sales representative metrics and performance vs. team average...
      </div>
    );
  }

  const members = [...(data?.members || [])].sort((a, b) => {
    const valA = a[sortField];
    const valB = b[sortField];
    return sortAsc ? (valA > valB ? 1 : -1) : valA < valB ? 1 : -1;
  });

  // Calculate highest metric for bar chart scaling
  const maxMetricVal = Math.max(
    ...members.map((m) => m[chartMetric] as number),
    1
  );

  return (
    <div className="space-y-6">
      {/* Role Scoping Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#F4F6F8] border border-[#E5EAF0]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-100 text-[#0652CC]">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#091E42] uppercase tracking-wide">
              Data Scope: {data?.teamName}
            </h4>
            <p className="text-[11px] text-[#6B778C]">
              Managed by <strong className="text-[#091E42]">{data?.managerName}</strong>. 
              Sales Managers have visibility across all representatives on the team.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6B778C]">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Live Output Tracking
          </span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#E5EAF0] shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-[#6B778C]" />
          <span className="text-xs font-semibold text-[#091E42]">Filters:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date Range */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#6B778C]">Period:</span>
            <select
              aria-label="Period Filter"
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

          {/* Region */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#6B778C]">Region:</span>
            <select
              aria-label="Region Filter"
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

          {/* Team Member */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-[#6B778C]">Representative:</span>
            <select
              aria-label="Representative Filter"
              value={teamMember}
              onChange={(e) => setTeamMember(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#E5EAF0] bg-[#F7F9FC] text-xs font-medium text-[#091E42] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
            >
              <option value="ALL">All Team Members</option>
              <option value="Sarah Jenkins">Sarah Jenkins</option>
              <option value="David Nguyen">David Nguyen</option>
              <option value="Elena Rostova">Elena Rostova</option>
            </select>
          </div>
        </div>
      </div>

      {/* Team Aggregated KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C]">Total Team Revenue</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#091E42]">
              ${(data?.teamTotalRevenue || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-[#6B778C] mt-1">Closed won deals</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C]">Team Conversion Rate</span>
            <div className="p-2 rounded-xl bg-blue-50 text-[#0652CC]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#091E42]">
              {data?.teamConversionRate}%
            </div>
            <p className="text-[11px] text-[#6B778C] mt-1">Team benchmark average</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C]">Team Avg Deal Size</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#091E42]">
              ${(data?.teamAvgDealSize || 0).toLocaleString()}
            </div>
            <p className="text-[11px] text-[#6B778C] mt-1">Average contract size</p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B778C]">Avg Response Time</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-[#091E42]">
              {data?.teamAvgResponseTimeHours} hrs
            </div>
            <p className="text-[11px] text-[#6B778C] mt-1">First outreach latency</p>
          </div>
        </div>
      </div>

      {/* Visual Comparison Chart */}
      <div className="rounded-2xl border border-[#E5EAF0] bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#0652CC]" />
            <h3 className="text-sm font-bold text-[#091E42]">Representative Comparison Chart</h3>
          </div>

          <div className="flex items-center gap-1.5 bg-[#F4F6F8] p-1 rounded-xl text-xs">
            <button
              onClick={() => setChartMetric('revenueGenerated')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                chartMetric === 'revenueGenerated'
                  ? 'bg-white text-[#091E42] shadow-xs font-semibold'
                  : 'text-[#6B778C] hover:text-[#091E42]'
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setChartMetric('wonDeals')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                chartMetric === 'wonDeals'
                  ? 'bg-white text-[#091E42] shadow-xs font-semibold'
                  : 'text-[#6B778C] hover:text-[#091E42]'
              }`}
            >
              Deals Won
            </button>
            <button
              onClick={() => setChartMetric('conversionRate')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                chartMetric === 'conversionRate'
                  ? 'bg-white text-[#091E42] shadow-xs font-semibold'
                  : 'text-[#6B778C] hover:text-[#091E42]'
              }`}
            >
              Conversion %
            </button>
            <button
              onClick={() => setChartMetric('leadsAssigned')}
              className={`px-3 py-1 rounded-lg font-medium transition-all ${
                chartMetric === 'leadsAssigned'
                  ? 'bg-white text-[#091E42] shadow-xs font-semibold'
                  : 'text-[#6B778C] hover:text-[#091E42]'
              }`}
            >
              Leads
            </button>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {members.length === 0 ? (
            <p className="text-xs text-center py-6 text-[#6B778C]">No representatives match current filter selection.</p>
          ) : (
            members.map((rep) => {
              const val = rep[chartMetric] as number;
              const pct = Math.max(Math.round((val / maxMetricVal) * 100), 5);
              const formattedVal =
                chartMetric === 'revenueGenerated'
                  ? `$${val.toLocaleString()}`
                  : chartMetric === 'conversionRate'
                  ? `${val}%`
                  : val;

              return (
                <div key={rep.repId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#091E42]">{rep.repName}</span>
                      <span className="text-[11px] text-[#6B778C]">({rep.region})</span>
                    </div>
                    <span className="font-mono font-bold text-[#0652CC]">{formattedVal}</span>
                  </div>
                  <div className="w-full bg-[#F7F9FC] h-3 rounded-full overflow-hidden border border-[#E5EAF0]">
                    <div
                      className="bg-[#0652CC] h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Representatives Performance Table */}
      <div className="rounded-2xl border border-[#E5EAF0] bg-white overflow-hidden shadow-xs">
        <div className="p-4 border-b border-[#E5EAF0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0652CC]" />
            <h3 className="text-sm font-bold text-[#091E42]">Representative Scorecard & Output</h3>
          </div>
          <span className="text-xs text-[#6B778C]">Click column header to sort</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FC] text-[#6B778C] font-semibold uppercase tracking-wider border-b border-[#E5EAF0]">
              <tr>
                <th className="px-4 py-3">Representative</th>
                <th className="px-4 py-3">Region</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-[#091E42]"
                  onClick={() => handleSort('leadsAssigned')}
                >
                  <div className="flex items-center gap-1">
                    <span>Leads Assigned</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3">Qualified</th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-[#091E42]"
                  onClick={() => handleSort('wonDeals')}
                >
                  <div className="flex items-center gap-1">
                    <span>Deals Won</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-[#091E42]"
                  onClick={() => handleSort('conversionRate')}
                >
                  <div className="flex items-center gap-1">
                    <span>Conversion %</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th
                  className="px-4 py-3 cursor-pointer hover:text-[#091E42]"
                  onClick={() => handleSort('revenueGenerated')}
                >
                  <div className="flex items-center gap-1">
                    <span>Revenue</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="px-4 py-3">Avg Deal Size</th>
                <th className="px-4 py-3">Avg Response</th>
                <th className="px-4 py-3">vs. Team Average</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-[#6B778C]">
                    No sales representative records found matching filter criteria.
                  </td>
                </tr>
              ) : (
                members.map((rep) => {
                  const isPositive = rep.diffFromTeamAvgPercent >= 0;
                  return (
                    <tr key={rep.repId} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3.5 font-medium text-[#091E42]">
                        <div className="font-semibold">{rep.repName}</div>
                        <div className="text-[11px] text-[#6B778C] font-normal">{rep.repEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 text-[#6B778C]">
                        <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {rep.region}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#091E42]">{rep.leadsAssigned}</td>
                      <td className="px-4 py-3.5 font-mono text-[#6B778C]">{rep.qualifiedLeads}</td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-emerald-700">{rep.wonDeals}</td>
                      <td className="px-4 py-3.5 font-mono font-semibold text-[#091E42]">
                        {rep.conversionRate}%
                      </td>
                      <td className="px-4 py-3.5 font-mono font-bold text-[#091E42]">
                        ${rep.revenueGenerated.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#6B778C]">
                        ${rep.averageDealSize.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[#6B778C]">
                        {rep.avgResponseTimeHours} hrs
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-mono font-medium text-[11px] ${
                            isPositive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isPositive ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {isPositive ? `+${rep.diffFromTeamAvgPercent}%` : `${rep.diffFromTeamAvgPercent}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
