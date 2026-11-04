import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  X,
  FolderKanban,
  User,
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
}

export const ProjectSearchSelect: React.FC<ProjectSearchSelectProps> = ({
  projects,
  value,
  onChange,
  label = 'Select Modernization Project',
  placeholder = 'Type at least 2 characters to search by project name, ID, or partner...',
  required = false,
  disabled = false,
  helperText = 'Search across enterprise modernization projects eligible for resource reallocation.',
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filter projects by query string
  const filteredProjects = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length < 1) return [];

    return projects.filter((p) => {
      const matchName = (p.name || '').toLowerCase().includes(trimmed);
      const matchId = (p.id || '').toLowerCase().includes(trimmed);
      const matchPartner = (p.partnerName || '').toLowerCase().includes(trimmed);
      const matchStaff = (p.assignedStaffName || '').toLowerCase().includes(trimmed);
      const matchType = (p.conversionType || '').toLowerCase().includes(trimmed);
      return matchName || matchId || matchPartner || matchStaff || matchType;
    });
  }, [projects, query]);

  const handleSelect = (project: PartnerProject) => {
    onChange(project);
    setIsOpen(false);
    setQuery('');
  };

  const handleDeselect = () => {
    onChange(null);
    setQuery('');
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative z-50">
      {label && (
        <label className="block text-xs font-bold text-[#17263A] mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {!value ? (
        <div className="relative">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (e.target.value.trim().length >= 1) setIsOpen(true);
              }}
              onFocus={() => {
                if (query.trim().length >= 1) setIsOpen(true);
              }}
              disabled={disabled}
              placeholder={placeholder}
              className="w-full rounded-xl border border-[#DCE3EC] bg-white pl-10 pr-10 py-2.5 text-xs text-[#17263A] focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15 transition-all shadow-2xs disabled:bg-slate-50 disabled:text-slate-400"
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 absolute right-3 top-2.5 p-1 rounded-md"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>

          {helperText && <p className="text-[11px] text-[#8491A3] mt-1">{helperText}</p>}

          {/* Autocomplete Dropdown Popover */}
          {isOpen && query.trim().length >= 1 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-2xl z-[100] overflow-hidden">
              <div className="px-3.5 py-2 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100">
                <span>
                  Matching Modernization Projects ({filteredProjects.length})
                </span>
                <span className="text-[#244A70] font-medium">Click to select</span>
              </div>

              {filteredProjects.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <FolderKanban className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">No projects found</p>
                  <p className="text-slate-400 mt-0.5">
                    No active modernization project matching "{query}".
                  </p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {filteredProjects.map((p) => {
                    const isBms = p.conversionType === 'BMS_DSPF_TO_FRONTEND';
                    const hasAssignee = Boolean(p.assignedStaffName || p.assignedStaffId);

                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelect(p)}
                        className="w-full text-left p-3.5 hover:bg-blue-50/70 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-9 h-9 rounded-md bg-[#EEF1F6] border border-[#DCE3EC] text-[#244A70] flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                            <FolderKanban className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-xs text-[#17263A] group-hover:text-[#244A70] truncate">
                                {p.name}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                                #{p.id.slice(-8).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-500">
                              <span>{p.partnerName || 'Enterprise Workspace'}</span>
                              <span>•</span>
                              <span
                                className={`font-medium ${
                                  isBms ? 'text-blue-700' : 'text-purple-700'
                                }`}
                              >
                                {isBms ? 'BMS/DSPF → React/TS' : 'COBOL → Java'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-1 shrink-0 text-right">
                          {hasAssignee ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <User className="w-2.5 h-2.5 mr-1" />
                              {p.assignedStaffName || 'Assigned'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                              Unallocated
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-slate-400">
                            {p.status || 'ACTIVE'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
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
                className="text-xs bg-white text-slate-700 hover:text-rose-600 hover:border-rose-300 h-8"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Change Project
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
