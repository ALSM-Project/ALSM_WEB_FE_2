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
import { useBackgroundRefresh } from '@/shared/hooks/useBackgroundRefresh';

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

  // A silent refresh runs in the background and keeps what is on screen while it loads.
  const fetchWorkQueue = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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

  // A project a Team Lead gives or takes away shows up here without reloading the page.
  useBackgroundRefresh(() => void fetchWorkQueue(true));

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-[#0652CC] border border-blue-200/60 uppercase tracking-wider">
              Execution Workbench
            </span>
            <span className="text-xs text-slate-500 font-mono">Stage 3: Interactive Modernization</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] mt-1.5">
            My Assigned Work Queue
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Modernization tasks assigned to you by your Team Lead. Select any project to open the Web 1 Conversion Workspace to parse ASTs, configure field mappings, and review generated code.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/team-lead/projects"
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-[#0652CC]" />
            <span>Team Lead View</span>
          </Link>
          <button
            onClick={() => fetchWorkQueue()}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#0652CC]' : 'text-slate-500'}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setViewMode('PROJECTS');
            setQueueFilter('MY_QUEUE');
          }}
          className={`bg-white rounded-lg border p-4 shadow-xs cursor-pointer transition-all hover:border-[#0652CC] group ${
            viewMode === 'PROJECTS' ? 'border-[#0652CC] ring-1 ring-[#0652CC]' : 'border-slate-200'
          }`}
          title="Click to view assigned projects in card view"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 group-hover:text-[#0652CC] transition-colors">Assigned Projects</span>
            <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200/60 flex items-center justify-center">
              <FolderKanban className="w-3.5 h-3.5 text-[#0652CC]" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mt-2">{assignedProjectsCount}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Under your active queue</span>
            <span className="text-[#0652CC] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Cards →</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setViewMode('ITEMS');
          }}
          className={`bg-white rounded-lg border p-4 shadow-xs cursor-pointer transition-all hover:border-amber-500 group ${
            viewMode === 'ITEMS' ? 'border-amber-500 ring-1 ring-amber-500' : 'border-slate-200'
          }`}
          title="Click to inspect individual screens and batch programs"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 group-hover:text-amber-700 transition-colors">Screens & Programs</span>
            <div className="w-7 h-7 rounded-md bg-amber-50 border border-amber-200/60 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-slate-900 mt-2">{totalItemsCount}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Total assets across projects</span>
            <span className="text-amber-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Asset list →</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setViewMode('ITEMS');
          }}
          className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs cursor-pointer transition-all hover:border-purple-500 group"
          title="Click to inspect validation passed items"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 group-hover:text-purple-700 transition-colors">Passed AI & AST Rules</span>
            <div className="w-7 h-7 rounded-md bg-purple-50 border border-purple-200/60 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-purple-700 mt-2">{passedValidationCount}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Automated checks passed</span>
            <span className="text-purple-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Inspect →</span>
          </div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => {
            setViewMode('ITEMS');
          }}
          className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs cursor-pointer transition-all hover:border-emerald-500 group"
          title="Click to inspect completed items"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 group-hover:text-emerald-700 transition-colors">Completed / Converted</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-200/60 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold tracking-tight text-emerald-700 mt-2">{completedCount}</div>
          <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
            <span>Ready for Lead review & export</span>
            <span className="text-emerald-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Inspect →</span>
          </div>
        </div>
      </div>

      {/* Filter and View Toggle Toolbar */}
      <div className="space-y-3 bg-white p-3.5 rounded-lg border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-64 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              placeholder="Search assigned files, projects, or partners..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs h-9 border-slate-200 rounded-md"
            />
          </div>

          {/* Queue Filter Segmented Control */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
            <button
              onClick={() => setQueueFilter('MY_QUEUE')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                queueFilter === 'MY_QUEUE'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              My Direct Queue
            </button>
            <button
              onClick={() => setQueueFilter('ALL')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                queueFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Projects ({projects.length})
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center justify-between pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Display View:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80">
              <button
                onClick={() => setViewMode('PROJECTS')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'PROJECTS'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Project ({displayedProjects.length})
              </button>
              <button
                onClick={() => setViewMode('ITEMS')}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                  viewMode === 'ITEMS'
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/60 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Individual Asset ({displayedItems.length})
              </button>
            </div>
          </div>

          <span className="text-xs text-slate-500">
            Logged in as: <strong className="text-slate-900 font-medium">{user?.fullName || 'Conversion Engineer'}</strong>
          </span>
        </div>
      </div>

      {/* View Mode 1: By Project Cards */}
      {viewMode === 'PROJECTS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-5 h-5 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Loading assigned projects...</span>
              </div>
            </div>
          ) : displayedProjects.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
              <Briefcase className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-slate-900 text-sm">No active projects assigned in this view</p>
              <p className="text-xs text-slate-500 mt-1">
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
                  className="bg-white rounded-lg border border-slate-200 p-4 shadow-xs hover:border-[#0652CC] hover:shadow-sm transition-all flex flex-col justify-between cursor-pointer group"
                >
                  <div>
                    {/* Top Tag & Partner */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Building2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="text-xs font-semibold text-purple-700 truncate">
                          {p.partnerName}
                        </span>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>

                    {/* Project Title & Description */}
                    <h3 className="text-sm font-semibold text-slate-900 group-hover:text-[#0652CC] transition-colors line-clamp-1">{p.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                      {p.description || 'Enterprise legacy migration project.'}
                    </p>

                    {/* Stack & Team Lead */}
                    <div className="mt-3.5 p-2.5 bg-slate-50 rounded-md border border-slate-200/80 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Target Stack:</span>
                        <span className="font-mono font-medium text-slate-900 text-[11px] px-1.5 py-0.5 rounded bg-white border border-slate-200">
                          {p.targetFramework}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Supervising Lead:</span>
                        <span className="font-medium text-slate-900">
                          {p.assignedTeamLeadName || 'Sarah Jenkins'}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3.5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>Conversion Progress</span>
                        <strong className="text-slate-900 font-semibold">{progressPct}% ({completedItems}/{totalItems})</strong>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#0652CC] rounded-full transition-all duration-500"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                    <Link
                      to={`/partners/projects/${p.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs font-medium text-slate-500 hover:text-[#0652CC] transition-colors"
                    >
                      Project Overview
                    </Link>
                    <Link
                      to={`/partners/projects/${p.id}/workspace`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0652CC] text-white hover:bg-[#0544AB] text-xs font-medium shadow-xs transition-colors"
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
        <div className="alsm-table-container rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="alsm-table w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3.5">Asset & Source File</th>
                  <th className="py-2.5 px-3.5">Project & Partner</th>
                  <th className="py-2.5 px-3.5">Type</th>
                  <th className="py-2.5 px-3.5">Conversion Status</th>
                  <th className="py-2.5 px-3.5">Validation State</th>
                  <th className="py-2.5 px-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="w-5 h-5 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin" />
                        <span className="text-xs">Loading assigned conversion items...</span>
                      </div>
                    </td>
                  </tr>
                ) : displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      <FileCode className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                      No individual items found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  displayedItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => navigate(`/partners/projects/${item.projectId}/items/${item.id}/review`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-2.5 px-3.5">
                        <div className="font-medium text-slate-900 group-hover:text-[#0652CC] transition-colors flex items-center gap-1.5">
                          <Code2 className="w-3.5 h-3.5 text-[#0652CC] shrink-0" />
                          <span>{item.name}</span>
                        </div>
                        <div className="font-mono text-[10px] text-slate-400 mt-0.5">{item.sourceFile}</div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <div className="font-medium text-slate-800">{item.projectName}</div>
                        <div className="text-[10px] text-purple-700">{item.partnerName}</div>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 text-slate-700 border border-slate-200">
                          {item.type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="py-2.5 px-3.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            item.validationStatus === 'PASSED'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : item.validationStatus === 'WARNINGS'
                              ? 'bg-amber-50 text-amber-800 border border-amber-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {item.validationStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/partners/projects/${item.projectId}/items/${item.id}/review`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                          >
                            <span>Review Code</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/partners/projects/${item.projectId}/workspace`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#0652CC] text-white hover:bg-[#0544AB] text-xs font-medium shadow-xs transition-colors"
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
