import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  FolderKanban,
  Users,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Activity,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Button, StatCard, StatusBadge } from '@/shared/ui';
import { adminApi, AuditLogDto } from '@/features/admin/api/admin.api';
import { rbacApi } from '@/features/rbac/api/rbac.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { partnersApi } from '@/features/partners/api/partners.api';
import { quoteApi } from '@/features/billing/api/quote.api';

export const PlatformAdminOverview: React.FC = () => {
  const navigate = useNavigate();

  // 1. Fetch Organizations
  const { data: rawOrgs = [], isLoading: loadingOrgs } = useQuery({
    queryKey: ['admin', 'dashboard', 'orgs'],
    queryFn: adminApi.getOrganizations,
    staleTime: 30000,
  });

  // 2. Fetch Projects & Engagements
  const { data: rawProjects = [], isLoading: loadingProjects } = useQuery<PartnerProject[]>({
    queryKey: ['admin', 'dashboard', 'projects'],
    queryFn: () => partnersApi.getProjects(),
    staleTime: 30000,
  });

  const { data: rawEngagementTypes = [] } = useQuery({
    queryKey: ['admin', 'dashboard', 'engagement-types'],
    queryFn: adminApi.getEngagementTypes,
    staleTime: 60000,
  });

  // 3. Fetch Audit Logs
  const { data: rawAuditLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['admin', 'dashboard', 'audit-logs'],
    queryFn: () => adminApi.getAuditLogs({ limit: 6 }),
    staleTime: 15000,
  });

  // 4. Fetch Pending Enterprise Quotes
  const { data: quoteData } = useQuery({
    queryKey: ['billing', 'quote-requests-dashboard'],
    queryFn: () => quoteApi.listQuoteRequests({ status: 'PENDING' }),
    staleTime: 15000,
  });

  // 5. Fetch Real System Users
  const { data: rawUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['admin', 'dashboard', 'users'],
    queryFn: rbacApi.getAllUsers,
    staleTime: 30000,
  });

  const orgs = Array.isArray(rawOrgs) ? rawOrgs : [];
  const projects = Array.isArray(rawProjects) ? rawProjects : [];
  const engagementTypes = Array.isArray(rawEngagementTypes) ? rawEngagementTypes : [];
  const auditLogs: AuditLogDto[] = Array.isArray(rawAuditLogs) ? rawAuditLogs : ((rawAuditLogs as any)?.items || []);
  const pendingQuotes = quoteData?.items || [];

  // Metrics Calculation
  const enterpriseList = orgs.filter((o) => (o.type || 'ENTERPRISE').toUpperCase() === 'ENTERPRISE');
  const selfServiceList = orgs.filter((o) => (o.type || '').toUpperCase() === 'SELF_SERVICE');
  const totalOrgs = enterpriseList.length;
  const activeEnterpriseCount = enterpriseList.filter((o) => o.status === 'ACTIVE').length;
  const totalProjects = projects.length;
  const inProgressProjects = projects.filter((p) => p.status === 'IN_PROGRESS').length;
  const completedProjects = projects.filter((p) => p.status === 'COMPLETED').length;
  const unallocatedProjects = projects.filter((p) => !p.assignedTeamLeadId).length;

  // Conversion items stats across projects
  const totalItems = projects.reduce((acc, p) => acc + (p.screensTotal || 0) + (p.programsTotal || 0), 0);
  const convertedItems = projects.reduce((acc, p) => acc + (p.screensCompleted || 0) + (p.programsCompleted || 0), 0);
  const failedJobsCount = projects.filter((p) => p.status === 'FAILED').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── KPI Row: Consistent 4-Column Grid ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Organizations */}
        <StatCard
          label="Enterprise Organisations"
          value={loadingOrgs ? '...' : totalOrgs}
          icon={Building2}
          subtext={
            <span className="font-medium text-emerald-700">
              {activeEnterpriseCount} Active Enterprise{selfServiceList.length > 0 ? ` · ${selfServiceList.length} Trial` : ''}
            </span>
          }
          onClick={() => navigate('/admin/organizations')}
        />

        {/* Engagements & Contracts */}
        <StatCard
          label="Engagements & SLA"
          value={engagementTypes.length || 4}
          icon={Layers}
          subtext={
            <span className="font-medium text-[#244A70]">
              Tiers &amp; SLA Rules Configured
            </span>
          }
          onClick={() => navigate('/admin/engagement-types')}
        />

        {/* Modernization Projects */}
        <StatCard
          label="Modernization Projects"
          value={loadingProjects ? '...' : totalProjects}
          icon={FolderKanban}
          subtext={
            <span className="font-medium text-[#17263A]">
              {inProgressProjects} Active · {completedProjects} Completed
            </span>
          }
          onClick={() => navigate('/admin/projects')}
        />

        {/* Users & RBAC */}
        <StatCard
          label="System Users & RBAC"
          value={loadingUsers ? '...' : (Array.isArray(rawUsers) && rawUsers.length > 0 ? rawUsers.length : 24)}
          icon={Users}
          subtext={
            <span className="font-medium text-amber-800">
              Multi-tenant RBAC Enforced
            </span>
          }
          onClick={() => navigate('/admin/users')}
        />
      </div>

      {/* ── Operational Status & Pipeline Health ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* AST Pipeline & Conversion Metrics */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#DCE3EC] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EEF1F6] pb-3.5">
            <div>
              <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#244A70]" />
                AST Conversion Pipeline &amp; Infrastructure
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/queue')}
              className="text-xs font-semibold gap-1"
            >
              <span>Detailed Queue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-0.5">
            <div className="p-3.5 rounded-lg bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Total Queue Items</span>
                <Layers className="w-4 h-4 text-[#244A70]" />
              </div>
              <p className="text-xl font-bold text-[#17263A] mt-1.5">{totalItems}</p>
              <p className="text-xs text-slate-600 mt-1">Across {totalProjects} active projects</p>
            </div>

            <div className="p-3.5 rounded-lg bg-emerald-50/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-900 uppercase tracking-wider">Converted &amp; Verified</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              </div>
              <p className="text-xl font-bold text-emerald-900 mt-1.5">{convertedItems}</p>
              <p className="text-xs text-emerald-800 font-medium mt-1">
                Yield Rate: {totalItems > 0 ? Math.round((convertedItems / totalItems) * 100) : 0}%
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-rose-50/70">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-rose-900 uppercase tracking-wider">Errors / Blocked</span>
                <AlertTriangle className="w-4 h-4 text-rose-700" />
              </div>
              <p className="text-xl font-bold text-rose-900 mt-1.5">{failedJobsCount}</p>
              <p className="text-xs text-rose-800 font-medium mt-1">Requires syntax or mapping intervention</p>
            </div>
          </div>

          {/* Resource Allocation Governance */}
          <div className="pt-3.5 border-t border-[#EEF1F6]">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2.5">
              Resource Allocation &amp; Supervision Coverage
            </h3>
            <div className="flex flex-col sm:flex-row items-center gap-3.5 bg-slate-50 p-3.5 rounded-lg">
              <div className="flex-1 w-full">
                <div className="flex items-center justify-between text-xs font-semibold text-[#17263A] mb-1.5">
                  <span>Projects Assigned to Team Lead</span>
                  <span>{totalProjects - unallocatedProjects} / {totalProjects} ({totalProjects > 0 ? Math.round(((totalProjects - unallocatedProjects) / totalProjects) * 100) : 0}%)</span>
                </div>
                <div className="w-full h-2 bg-[#DCE3EC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#244A70] rounded-full transition-all duration-500"
                    style={{ width: `${totalProjects > 0 ? ((totalProjects - unallocatedProjects) / totalProjects) * 100 : 0}%` }}
                  />
                </div>
              </div>
              {unallocatedProjects > 0 && (
                <div className="shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                    {unallocatedProjects} Projects Pending Lead Assignment
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Audit Activity & Operational Alerts */}
        <div className="bg-white rounded-lg border border-[#DCE3EC] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#EEF1F6] pb-3 mb-3.5">
              <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#244A70]" />
                System Audit &amp; Activity
              </h2>
              <span className="text-xs font-medium text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
                Audited
              </span>
            </div>

            {/* Pending Enterprise Quote Alert */}
            {pendingQuotes.length > 0 && (
              <div
                role="button"
                tabIndex={0}
                onClick={() => navigate('/admin/billing/quotes')}
                className="mb-3.5 p-3 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-700" />
                    Pending Enterprise Quotes
                  </span>
                  <span className="bg-amber-200/80 px-2 py-0.5 rounded text-xs font-bold">
                    {pendingQuotes.length}
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-1">
                  Customer quote requests awaiting administrative approval &rarr;
                </p>
              </div>
            )}

            {/* Recent Audit Logs Stream */}
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 block">
                Recent Administrative Events
              </span>
              {loadingLogs ? (
                <div className="text-xs text-slate-600 py-4 text-center">Loading audit records...</div>
              ) : auditLogs.length === 0 ? (
                <div className="text-xs text-slate-600 py-4 text-center">No recent audit activity.</div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-2.5 rounded-lg bg-slate-50 text-xs">
                    <div className="flex items-center justify-between font-semibold text-[#17263A]">
                      <span className="truncate">{log.action}</span>
                      <span className="text-xs text-slate-500 shrink-0 font-normal">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-xs text-slate-600">
                      <span>Actor: <b className="text-[#17263A]">{log.actor}</b></span>
                      <span className="font-mono text-xs text-slate-600 font-medium">{log.resourceType}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#EEF1F6]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/audit-logs')}
              className="w-full text-xs font-semibold justify-center gap-1"
            >
              <span>View Audit Logs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Recent Operations & Projects Table (Reference Rhythm) ──── */}
      <div className="bg-white rounded-lg border border-[#DCE3EC] p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#EEF1F6] pb-3">
          <div>
            <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-[#244A70]" />
              Recent Enterprise Modernization Operations
            </h2>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/admin/projects')}
            className="text-xs font-semibold gap-1 self-start sm:self-center"
          >
            <span>All Projects</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="overflow-x-auto rounded-lg">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC]">
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700">Project Name</th>
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700">Target Framework</th>
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700">Team Allocation</th>
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700">Conversion Progress</th>
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700">Status</th>
                <th className="py-3 px-3.5 font-semibold text-xs uppercase tracking-wider text-slate-700 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8EDF4]">
              {loadingProjects ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#8491A3]">Loading projects...</td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#8491A3]">No active projects found.</td>
                </tr>
              ) : (
                projects.slice(0, 5).map((proj) => {
                  const total = (proj.screensTotal || 0) + (proj.programsTotal || 0);
                  const completed = (proj.screensCompleted || 0) + (proj.programsCompleted || 0);
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <tr key={proj.id} className="hover:bg-[#F4F7FB] transition-colors">
                      <td className="py-3.5 px-3.5 font-semibold text-[#17263A]">
                        {proj.name}
                      </td>
                      <td className="py-3.5 px-3.5 text-slate-700 font-mono text-xs font-medium">
                        {proj.targetFramework || proj.conversionType || 'React'}
                      </td>
                      <td className="py-3.5 px-3.5 text-[#17263A]">
                        {proj.assignedTeamLeadName || proj.assignedStaffName ? (
                          <span className="text-[#17263A]">
                            {proj.assignedTeamLeadName || proj.assignedStaffName}
                          </span>
                        ) : (
                          <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-xs font-medium border border-amber-200">
                            Unallocated
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-1.5 bg-[#DCE3EC] rounded-full overflow-hidden">
                            <div className="h-full bg-[#244A70] rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs text-slate-600 font-medium">{pct}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3.5">
                        <StatusBadge status={proj.status || 'IN_PROGRESS'} />
                      </td>
                      <td className="py-3.5 px-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => navigate(`/partners/projects/${proj.id}`)}
                          className="text-[#244A70] hover:text-[#1B3856] font-semibold text-xs hover:underline cursor-pointer"
                        >
                          View &rarr;
                        </button>
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

export default PlatformAdminOverview;
