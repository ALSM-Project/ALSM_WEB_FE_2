import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase, FolderKanban, CheckCircle2, AlertCircle,
  ExternalLink, ArrowRight, Building2, Code2, RefreshCw,
  Search, Shield, Layers, FileCode, Sparkles
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject, PartnerConversionItem } from '@/features/partners/types/partner.types';
import { StatusBadge } from '@/shared/ui/Badge';
import { Input } from '@/shared/ui';

interface WorkItemWithProject extends PartnerConversionItem {
  projectName: string;
  partnerName: string;
  targetFramework: string;
  teamLeadName?: string;
}

export const EmployeeWorkQueuePage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [projects, setProjects] = useState<PartnerProject[]>([]);
  const [workItems, setWorkItems] = useState<WorkItemWithProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'PROJECTS' | 'ITEMS'>('PROJECTS');
  const [queueFilter, setQueueFilter] = useState<'MY_QUEUE' | 'ALL'>('MY_QUEUE');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchWorkQueue = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const allProjects = await partnersApi.getProjects();
      setProjects(allProjects || []);

      // Load all conversion items across all projects
      const itemPromises = allProjects.map(async (p) => {
        try {
          const items = await partnersApi.getProjectItems(p.id);
          return items.map((item) => ({
            ...item,
            projectName: p.name,
            partnerName: p.partnerName,
            targetFramework: p.targetFramework,
            teamLeadName: p.assignedTeamLeadName,
          }));
        } catch {
          return [];
        }
      });

      const nestedItems = await Promise.all(itemPromises);
      setWorkItems(nestedItems.flat());
    } catch (err: any) {
      console.error('Failed to load work queue:', err);
      setErrorMsg(err.message || 'Failed to load employee work queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkQueue();
  }, []);

  // Filter projects by current user
  const isAssignedToUser = (p: PartnerProject) => {
    if (!user) return true;
    // Direct staff id or staff name match
    const matchesStaffId = p.assignedStaffId === user.id;
    const matchesStaffName =
      p.assignedStaffName &&
      p.assignedStaffName.toLowerCase().includes(user.fullName.toLowerCase());
    return matchesStaffId || matchesStaffName;
  };

  const displayedProjects = projects.filter((p) => {
    const matchesScope =
      queueFilter === 'ALL' || isAssignedToUser(p) || user?.isPlatformAdmin;

    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.partnerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.assignedTeamLeadName && p.assignedTeamLeadName.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesScope && matchesSearch;
  });

  const displayedItems = workItems.filter((item) => {
    const parentProject = projects.find((p) => p.id === item.projectId);
    const matchesScope =
      queueFilter === 'ALL' || (parentProject && isAssignedToUser(parentProject)) || user?.isPlatformAdmin;

    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sourceFile.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.partnerName.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesScope && matchesSearch;
  });

  // Metrics
  const assignedProjectsCount = displayedProjects.length;
  const totalItemsCount = displayedItems.length;
  const passedValidationCount = displayedItems.filter(
    (i) => i.validationStatus === 'PASSED'
  ).length;
  const completedCount = displayedItems.filter(
    (i) => i.status === 'COMPLETED' || i.status === 'READY_FOR_EXPORT'
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF2FC] text-[#0652CC] uppercase tracking-wider">
              Execution Workbench
            </span>
            <span className="text-[11px] text-[#6B778C]">Stage 3: Interactive Full-Width Modernization</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42] mt-1">
            My Assigned Work Queue
          </h1>
          <p className="text-xs text-[#6B778C] mt-1 max-w-3xl">
            Modernization tasks assigned to you by your Team Lead. Select any project to open the full-width Web 1 Conversion Workspace to parse ASTs, configure field mappings, and review generated code.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/team-lead/projects"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#091E42] shadow-2xs hover:bg-[#F4F6F8] transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-[#0652CC]" />
            Team Lead View
          </Link>
          <button
            onClick={fetchWorkQueue}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-3.5 py-2 text-xs font-semibold text-[#091E42] shadow-2xs hover:bg-[#F4F6F8] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin text-[#0652CC]' : ''}`} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Metric Cards - Clickable to toggle views & filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setViewMode('PROJECTS');
            setQueueFilter('MY_QUEUE');
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-[#0652CC] hover:shadow-md group ${
            viewMode === 'PROJECTS' ? 'border-[#0652CC] ring-2 ring-[#0652CC]/20' : 'border-[#E5EAF0]'
          }`}
          title="Click to view assigned projects in card view"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B778C] group-hover:text-[#0652CC] transition-colors">Assigned Projects</span>
            <FolderKanban className="w-4 h-4 text-[#0652CC]" />
          </div>
          <div className="text-2xl font-bold text-[#091E42] mt-2">{assignedProjectsCount}</div>
          <div className="flex items-center justify-between text-[11px] text-[#6B778C] mt-1">
            <span>Under your active conversion queue</span>
            <span className="text-[#0652CC] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Cards view →</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setViewMode('ITEMS');
          }}
          className={`bg-white rounded-xl border p-4 shadow-2xs cursor-pointer transition-all hover:border-amber-500 hover:shadow-md group ${
            viewMode === 'ITEMS' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-[#E5EAF0]'
          }`}
          title="Click to inspect individual screens and batch programs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B778C] group-hover:text-amber-700 transition-colors">Screens & Programs</span>
            <Layers className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-[#091E42] mt-2">{totalItemsCount}</div>
          <div className="flex items-center justify-between text-[11px] text-[#6B778C] mt-1">
            <span>Total assets across assigned projects</span>
            <span className="text-amber-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Asset list →</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setViewMode('ITEMS');
          }}
          className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-2xs cursor-pointer transition-all hover:border-purple-500 hover:shadow-md group"
          title="Click to inspect validation passed items"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B778C] group-hover:text-purple-700 transition-colors">Passed AI & AST Rules</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-purple-700 mt-2">{passedValidationCount}</div>
          <div className="flex items-center justify-between text-[11px] text-[#6B778C] mt-1">
            <span>Passed automated validation checks</span>
            <span className="text-purple-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Inspect →</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setViewMode('ITEMS');
          }}
          className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-2xs cursor-pointer transition-all hover:border-emerald-500 hover:shadow-md group"
          title="Click to inspect completed items"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B778C] group-hover:text-emerald-700 transition-colors">Completed / Converted</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 mt-2">{completedCount}</div>
          <div className="flex items-center justify-between text-[11px] text-[#6B778C] mt-1">
            <span>Ready for Lead review & bundle export</span>
            <span className="text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Inspect →</span>
          </div>
        </div>
      </div>

      {/* Filter and View Toggle Toolbar */}
      <div className="space-y-3 bg-white p-4 rounded-xl border border-[#E5EAF0] shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-64 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#6B778C]" />
            <Input
              placeholder="Search assigned files, projects, or partners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          {/* Queue Filter */}
          <div className="flex items-center gap-1.5 bg-[#F4F6F8] p-1 rounded-xl border border-[#E5EAF0]">
            <button
              onClick={() => setQueueFilter('MY_QUEUE')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                queueFilter === 'MY_QUEUE'
                  ? 'bg-[#0652CC] text-white shadow-2xs'
                  : 'text-[#6B778C] hover:text-[#091E42]'
              }`}
            >
              My Direct Queue
            </button>
            <button
              onClick={() => setQueueFilter('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                queueFilter === 'ALL'
                  ? 'bg-white text-[#091E42] shadow-2xs'
                  : 'text-[#6B778C] hover:text-[#091E42]'
              }`}
            >
              All Projects ({projects.length})
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center justify-between pt-3 border-t border-[#E5EAF0]">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#6B778C]">Display View:</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('PROJECTS')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'PROJECTS'
                    ? 'bg-[#091E42] text-white'
                    : 'bg-white border border-[#E5EAF0] text-[#6B778C] hover:text-[#091E42]'
                }`}
              >
                By Project ({displayedProjects.length})
              </button>
              <button
                onClick={() => setViewMode('ITEMS')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  viewMode === 'ITEMS'
                    ? 'bg-[#091E42] text-white'
                    : 'bg-white border border-[#E5EAF0] text-[#6B778C] hover:text-[#091E42]'
                }`}
              >
                By Individual Asset ({displayedItems.length})
              </button>
            </div>
          </div>

          <span className="text-[11px] text-[#6B778C]">
            Logged in as: <strong className="text-[#091E42]">{user?.fullName || 'Conversion Engineer'}</strong>
          </span>
        </div>
      </div>

      {/* View Mode 1: By Project Cards */}
      {viewMode === 'PROJECTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-[#6B778C] bg-white rounded-xl border border-[#E5EAF0]">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-6 h-6 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin" />
                <span>Loading assigned projects...</span>
              </div>
            </div>
          ) : displayedProjects.length === 0 ? (
            <div className="col-span-full py-12 text-center text-[#6B778C] bg-white rounded-xl border border-[#E5EAF0]">
              <Briefcase className="w-8 h-8 mx-auto text-[#6B778C]/40 mb-2" />
              <p className="font-semibold text-[#091E42]">No active projects assigned in this view</p>
              <p className="text-xs text-[#6B778C] mt-1">
                Toggle to "All Projects" or check in with your Team Lead to have modernization tasks allocated to you.
              </p>
            </div>
          ) : (
            displayedProjects.map((p) => {
              const totalItems = (p.screensTotal || 0) + (p.programsTotal || 0);
              const completedItems = (p.screensCompleted || 0) + (p.programsCompleted || 0);
              const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

              return (
                <div
                  key={p.id}
                  onClick={() => navigate(`/partners/projects/${p.id}/workspace`)}
                  className="bg-white rounded-xl border border-[#E5EAF0] p-5 shadow-2xs hover:border-[#0652CC] hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Top Tag & Partner */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-700 truncate max-w-[180px]">
                          {p.partnerName}
                        </span>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>

                    {/* Project Title & Description */}
                    <h3 className="text-sm font-bold text-[#091E42] group-hover:text-[#0652CC] transition-colors line-clamp-1">{p.name}</h3>
                    <p className="text-xs text-[#6B778C] mt-1 line-clamp-2">
                      {p.description || 'Enterprise legacy migration project.'}
                    </p>

                    {/* Stack & Team Lead */}
                    <div className="mt-4 p-3 bg-[#F7F9FC] rounded-lg border border-[#E5EAF0] space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B778C]">Target Stack:</span>
                        <span className="font-mono font-semibold text-[#091E42] text-[11px]">
                          {p.targetFramework}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B778C]">Supervising Lead:</span>
                        <span className="font-medium text-[#091E42]">
                          {p.assignedTeamLeadName || 'Sarah Jenkins'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-[#6B778C]">
                        <span>Conversion Progress</span>
                        <strong className="text-[#091E42]">{progressPct}% ({completedItems}/{totalItems})</strong>
                      </div>
                      <div className="w-full h-2 bg-[#E5EAF0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0652CC] rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-5 pt-4 border-t border-[#E5EAF0] flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/partners/projects/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-semibold text-[#6B778C] hover:text-[#0652CC] transition-colors"
                    >
                      Project Overview
                    </Link>
                    <Link
                      to={`/partners/projects/${p.id}/workspace`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0652CC] text-white hover:bg-[#0543A8] text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <span>Open Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* View Mode 2: By Individual Asset Table */}
      {viewMode === 'ITEMS' && (
        <div className="rounded-xl border border-[#E5EAF0] bg-white shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                  <th className="py-3 px-4">Asset & Source File</th>
                  <th className="py-3 px-4">Project & Partner</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Conversion Status</th>
                  <th className="py-3 px-4">Validation State</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5EAF0]">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#6B778C]">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-6 h-6 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin" />
                        <span>Loading assigned conversion items...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#6B778C]">
                      <FileCode className="w-8 h-8 mx-auto text-[#6B778C]/40 mb-2" />
                      No individual items found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/partners/projects/${item.projectId}/items/${item.id}/review`)}
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#091E42] group-hover:text-[#0652CC] transition-colors flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-[#0652CC]" />
                          {item.name}
                        </div>
                        <div className="font-mono text-[10px] text-[#6B778C]">{item.sourceFile}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-[#091E42]">{item.projectName}</div>
                        <div className="text-[10px] text-purple-700">{item.partnerName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#F4F6F8] border border-[#E5EAF0]">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.validationStatus === 'PASSED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : item.validationStatus === 'WARNINGS'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.validationStatus}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/partners/projects/${item.projectId}/items/${item.id}/review`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#E5EAF0] bg-white text-xs font-semibold text-[#091E42] hover:bg-[#F4F6F8] transition-colors"
                          >
                            <span>Review Code</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/partners/projects/${item.projectId}/workspace`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#0652CC] text-white hover:bg-[#0543A8] text-xs font-semibold shadow-2xs transition-colors"
                          >
                            <span>Workspace</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
export default EmployeeWorkQueuePage;
