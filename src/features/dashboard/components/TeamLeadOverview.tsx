import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  FolderKanban,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  UserPlus,
} from 'lucide-react';
import { Button, StatCard } from '@/shared/ui';
import { partnersApi } from '@/features/partners/api/partners.api';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { useAuth } from '@/features/auth/hooks/useAuth';

export const TeamLeadOverview: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch Projects & Staff Roster
  const { data: rawProjects = [], isLoading: loadingProjects } = useQuery<PartnerProject[]>({
    queryKey: ['team-lead', 'dashboard', 'projects'],
    queryFn: () => partnersApi.getProjects(),
    staleTime: 20000,
  });

  const { data: rawStaff = [], isLoading: loadingStaff } = useQuery({
    queryKey: ['team-lead', 'dashboard', 'staff'],
    queryFn: () => partnersApi.getAssignableStaff(),
    staleTime: 30000,
  });

  const allProjects = Array.isArray(rawProjects) ? rawProjects : [];
  const staffRoster = Array.isArray(rawStaff) ? rawStaff : [];

  // Filter projects in this team's scope
  const isDedicatedLead = allProjects.some((p) => p.assignedTeamLeadId === user?.id);
  const teamProjects = isDedicatedLead
    ? allProjects.filter((p) => p.assignedTeamLeadId === user?.id)
    : allProjects;

  const inProgressCount = teamProjects.filter((p) => p.status === 'IN_PROGRESS').length;
  const blockedCount = teamProjects.filter((p) => p.status === 'FAILED').length;
  const unassignedProjects = teamProjects.filter((p) => !p.assignedStaffId && p.status !== 'COMPLETED');

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── KPI Row: Consistent 4-Column Grid ──────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Team Projects */}
        <StatCard
          label="Team Projects"
          value={loadingProjects ? '...' : teamProjects.length}
          icon={FolderKanban}
          subtext={
            <span className="font-medium text-[#244A70]">
              {inProgressCount} In Progress
            </span>
          }
          onClick={() => navigate('/team-lead/projects')}
        />

        {/* Work Awaiting Assignment */}
        <StatCard
          label="Awaiting Allocation"
          value={unassignedProjects.length}
          icon={Clock}
          subtext={
            <span className="font-medium text-amber-800">
              Requires engineer allocation
            </span>
          }
          onClick={() => navigate('/team-lead/projects')}
        />

        {/* Team Staff Members */}
        <StatCard
          label="Team Roster"
          value={loadingStaff ? '...' : staffRoster.length}
          icon={Users}
          subtext={
            <span className="font-medium text-[#17263A]">
              Conversion Staff &amp; Reviewers
            </span>
          }
          onClick={() => navigate('/team-lead/projects')}
        />

        {/* Blocked / Failed Jobs */}
        <StatCard
          label="Issues &amp; Delays"
          value={blockedCount}
          icon={AlertTriangle}
          subtext={
            <span className="font-medium text-rose-800">
              Technical review required
            </span>
          }
          onClick={() => navigate('/team-lead/projects')}
        />
      </div>

      {/* ── Main Section: Staff & Conversion Progress ─────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Staff & Workload */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-[#DCE3EC] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#EEF1F6] pb-3.5">
            <div>
              <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#244A70]" />
                Engineer Workload &amp; Conversion Progress
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/team-lead/projects')}
              className="text-xs font-semibold gap-1"
            >
              <span>Allocate Projects</span>
              <UserPlus className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-2.5">
            {loadingStaff ? (
              <div className="text-xs text-slate-600 py-6 text-center">Loading team members...</div>
            ) : staffRoster.length === 0 ? (
              <div className="text-xs text-slate-600 py-6 text-center">No engineers assigned to team roster</div>
            ) : (
              staffRoster.map((staff) => (
                <div
                  key={staff.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-[#EEF1F6] text-[#244A70] border border-[#DCE3EC] flex items-center justify-center font-bold text-xs shrink-0">
                      {staff.fullName ? staff.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[#17263A]">{staff.fullName}</p>
                      <p className="text-xs text-slate-600">{staff.email} • <span className="font-mono text-xs">{staff.role}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5">
                    <div className="text-right">
                      <span className="text-xs font-medium text-[#17263A]">
                        {staff.activeWorkload} Projects
                      </span>
                      <div className="w-24 h-1.5 bg-[#DCE3EC] rounded-full mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            staff.activeWorkload > 3 ? 'bg-amber-600' : 'bg-[#244A70]'
                          }`}
                          style={{ width: `${Math.min(staff.activeWorkload * 25, 100)}%` }}
                        />
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-0.5 rounded border ${
                        staff.activeWorkload === 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : staff.activeWorkload > 3
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-[#244A70] border-blue-200'
                      }`}
                    >
                      {staff.activeWorkload === 0 ? 'Available' : 'Active'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Unassigned Tasks & Assistance Needed */}
        <div className="bg-white rounded-lg border border-[#DCE3EC] p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-[#EEF1F6] pb-3 mb-3.5">
              <h2 className="text-base font-bold text-[#17263A] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-700" />
                Projects Needing Attention
              </h2>
              <span className="text-xs font-medium text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded border border-amber-200">
                Action Required
              </span>
            </div>

            {/* List unassigned or blocked */}
            <div className="space-y-2.5">
              {unassignedProjects.slice(0, 4).map((p) => (
                <div key={p.id} className="p-3 rounded-lg bg-amber-50/70 text-xs">
                  <div className="flex items-center justify-between font-semibold text-[#17263A]">
                    <span className="truncate">{p.name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-medium border border-amber-200">
                      Unassigned
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 mt-1">
                    Partner: <span className="font-semibold text-[#17263A]">{p.partnerName}</span> • Framework: <span className="font-mono text-slate-800 font-medium">{p.targetFramework}</span>
                  </p>
                  <div className="flex items-center justify-end mt-2">
                    <button
                      type="button"
                      onClick={() => navigate('/team-lead/projects')}
                      className="text-xs font-semibold text-[#244A70] hover:text-[#1B3856] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      Assign Engineer &rarr;
                    </button>
                  </div>
                </div>
              ))}

              {blockedCount > 0 && (
                <div className="p-3 rounded-lg bg-rose-50/70 text-xs">
                  <div className="flex items-center gap-2 font-semibold text-rose-900">
                    <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span>{blockedCount} projects delayed or encountering issues</span>
                  </div>
                  <p className="text-xs text-rose-800 font-medium mt-1">
                    Inspect AST logs and mapping rules to unblock engineers.
                  </p>
                </div>
              )}

              {unassignedProjects.length === 0 && blockedCount === 0 && (
                <div className="py-8 text-center text-xs text-slate-600">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
                  All projects are assigned and progressing on schedule.
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 border-t border-[#EEF1F6]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/team-lead/projects')}
              className="w-full text-xs font-semibold justify-center gap-1"
            >
              <span>Open Team Lead Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeamLeadOverview;
