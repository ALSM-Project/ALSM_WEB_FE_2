import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  X,
  FolderKanban,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { PartnerProject } from '@/features/partners/types/partner.types';
import { Button } from '../ui/Button';

export interface ProjectSearchSelectProps {
  projects: PartnerProject[];
  value: PartnerProject | null;
  onChange: (project: PartnerProject | null) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  pageSize?: number;
}

export const ProjectSearchSelect: React.FC<ProjectSearchSelectProps> = ({
  projects,
  value,
  onChange,
  label = 'Select Modernization Project',
  placeholder = 'Search by project name, ID, partner, or pipeline...',
  required = false,
  disabled = false,
  helperText = 'Search across enterprise modernization projects eligible for resource reallocation.',
  pageSize = 5,
}) => {
  const [query, setQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter projects by query string
  const filteredProjects = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return projects;

    return projects.filter((p) => {
      const matchName = (p.name || '').toLowerCase().includes(trimmed);
      const matchId = (p.id || '').toLowerCase().includes(trimmed);
      const matchPartner = (p.partnerName || '').toLowerCase().includes(trimmed);
      const matchStaff = (p.assignedStaffName || '').toLowerCase().includes(trimmed);
      const matchType = (p.conversionType || '').toLowerCase().includes(trimmed);
      return matchName || matchId || matchPartner || matchStaff || matchType;
    });
  }, [projects, query]);

  // Reset page when query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [query]);

  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredProjects.length);
  const paginatedProjects = filteredProjects.slice(startIndex, endIndex);

  const handleSelect = (project: PartnerProject) => {
    onChange(project);
  };

  const handleDeselect = () => {
    onChange(null);
    setQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="relative space-y-3">
      {label && (
        <label className="block text-xs font-bold text-[#17263A]">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {!value ? (
        <div className="space-y-3">
          {/* Real-time search filter */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={disabled}
              placeholder={placeholder}
              className="w-full rounded-xl border border-[#DCE3EC] bg-white pl-10 pr-10 py-2.5 text-xs text-[#17263A] focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15 transition-all shadow-2xs disabled:bg-slate-50 disabled:text-slate-400"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-slate-400 hover:text-slate-600 absolute right-3 top-2.5 p-1 rounded-md cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Paginated Modernization Projects Table/Card List */}
          <div className="border border-[#DCE3EC] rounded-xl overflow-hidden bg-white shadow-2xs">
            <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#DCE3EC] flex items-center justify-between text-[11px] font-bold text-[#42526E] uppercase tracking-wider">
              <span>Eligible Projects ({filteredProjects.length})</span>
              <span className="text-slate-400 font-normal lowercase">click row or select to choose</span>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <FolderKanban className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No modernization projects found</p>
                <p className="text-slate-400 mt-0.5">
                  {query
                    ? `No project matches "${query}". Try searching with another name or ID.`
                    : 'No eligible modernization projects available.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E5EAF0]">
                {paginatedProjects.map((p) => {
                  const isBms = p.conversionType === 'BMS_DSPF_TO_FRONTEND';
                  const hasAssignee = Boolean(p.assignedStaffName || p.assignedStaffId);

                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelect(p)}
                      className="p-3.5 hover:bg-[#F0F4F8] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#EEF1F6] border border-[#DCE3EC] text-[#244A70] group-hover:bg-[#244A70] group-hover:text-white transition-colors flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          <FolderKanban className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="font-bold text-xs text-[#17263A] group-hover:text-[#244A70] transition-colors truncate">
                              {p.name}
                            </span>
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                              #{p.id.slice(-8).toUpperCase()}
                            </span>
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-slate-50 text-slate-600 border border-slate-200">
                              {p.status || 'ACTIVE'}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500 flex-wrap">
                            <span className="truncate max-w-[160px] sm:max-w-xs">{p.partnerName || 'Enterprise Workspace'}</span>
                            <span>•</span>
                            <span
                              className={`font-semibold ${
                                isBms ? 'text-blue-700' : 'text-purple-700'
                              }`}
                            >
                              {isBms ? 'BMS/DSPF → React 19' : 'COBOL → Java 17'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 shrink-0 justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="flex flex-col sm:items-end text-left sm:text-right">
                          <span className="text-[10px] text-slate-400 font-medium">Current Owner:</span>
                          {hasAssignee ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 mt-0.5">
                              <User className="w-2.5 h-2.5 mr-1" />
                              {p.assignedStaffName || 'Assigned'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200 mt-0.5">
                              Unallocated
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(p);
                          }}
                          className="px-3 py-1.5 text-xs font-bold rounded-lg border border-[#DCE3EC] bg-white text-[#244A70] group-hover:bg-[#244A70] group-hover:text-white group-hover:border-[#244A70] transition-colors shadow-2xs cursor-pointer"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination footer */}
            {filteredProjects.length > 0 && (
              <div className="px-4 py-2.5 bg-[#F8FAFC] border-t border-[#DCE3EC] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6B778C]">
                <div>
                  Showing <strong className="text-[#17263A]">{startIndex + 1}</strong> to{' '}
                  <strong className="text-[#17263A]">{endIndex}</strong> of{' '}
                  <strong className="text-[#17263A]">{filteredProjects.length}</strong> projects
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-2.5 py-1 rounded-lg border border-[#DCE3EC] bg-white text-[#42526E] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-semibold text-xs transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Previous</span>
                    </button>

                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors shadow-2xs cursor-pointer ${
                          currentPage === pageNum
                            ? 'bg-[#244A70] text-white'
                            : 'bg-white border border-[#DCE3EC] text-[#42526E] hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-2.5 py-1 rounded-lg border border-[#DCE3EC] bg-white text-[#42526E] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 font-semibold text-xs transition-colors shadow-2xs cursor-pointer flex items-center space-x-1"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {helperText && <p className="text-[11px] text-[#8491A3]">{helperText}</p>}
        </div>
      ) : (
        /* Selected Project Dossier Card */
        <div className="p-4.5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-11 h-11 rounded-md bg-[#EEF1F6] border border-[#DCE3EC] text-[#244A70] flex items-center justify-center font-bold text-sm shrink-0 shadow-xs">
                <FolderKanban className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-sm font-bold text-[#17263A]">{value.name}</h4>
                  <span className="font-mono text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    #{value.id.slice(-8).toUpperCase()}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                    {value.status || 'ACTIVE'}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-0.5">
                  {value.partnerName || 'Enterprise Client Workspace'} • ID: {value.id}
                </p>
              </div>
            </div>

            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselect}
                className="text-xs bg-white text-slate-700 hover:text-rose-600 hover:border-rose-300 h-8 cursor-pointer"
              >
                <X className="w-3.5 h-3.5 shrink-0" />
                <span>Change Project</span>
              </Button>
            )}
          </div>

          <div className="pt-3 border-t border-blue-200/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-medium">
                Pipeline
              </span>
              <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                {value.conversionType === 'BMS_DSPF_TO_FRONTEND'
                  ? 'BMS/DSPF → React 19'
                  : 'COBOL → Spring Boot 3.3'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-medium">
                Current Assignee
              </span>
              <span className="font-semibold text-slate-800 mt-0.5 block truncate">
                {value.assignedStaffName || 'Unallocated'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-medium">
                Screens Progress
              </span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {value.screensCompleted ?? 0} / {value.screensTotal ?? 0} screens
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-medium">
                Programs Progress
              </span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {value.programsCompleted ?? 0} / {value.programsTotal ?? 0} programs
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
