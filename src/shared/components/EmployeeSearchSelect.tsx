import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search,
  Clock,
  X,
  UserMinus,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Building2,
  Users,
} from 'lucide-react';
import {
  workforceApi,
  WorkforceEmployee,
  PortalType,
  MemberType,
  EmploymentStatus,
} from '../api/workforce.api';
import { Button } from '../ui/Button';

export interface EmployeeSearchSelectProps {
  portalType?: PortalType;
  organizationId?: string;
  allowedMemberType?: MemberType;
  allowedEmploymentStatus?: EmploymentStatus;
  value?: WorkforceEmployee | null;
  onChange: (employee: WorkforceEmployee | null) => void;
  excludeUserIds?: string[];
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
}

const EMPTY_EXCLUDE_IDS: string[] = [];

export const EmployeeSearchSelect: React.FC<EmployeeSearchSelectProps> = ({
  portalType = 'WEB2',
  organizationId,
  allowedMemberType = 'INTERNAL_EMPLOYEE',
  allowedEmploymentStatus = 'ACTIVE',
  value = null,
  onChange,
  excludeUserIds = EMPTY_EXCLUDE_IDS,
  label = 'Search Staff Member',
  placeholder = 'Type at least 2 characters to search by name, email, employee code, or department...',
  required = false,
  disabled = false,
  helperText = 'Live search with strict organization tenancy enforcement.',
}) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [results, setResults] = useState<WorkforceEmployee[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Keep search parameters in a ref to avoid callback recreation and render loops
  const searchParamsRef = useRef({
    portalType,
    organizationId,
    allowedMemberType,
    allowedEmploymentStatus,
    excludeUserIds,
  });

  useEffect(() => {
    searchParamsRef.current = {
      portalType,
      organizationId,
      allowedMemberType,
      allowedEmploymentStatus,
      excludeUserIds,
    };
  }, [portalType, organizationId, allowedMemberType, allowedEmploymentStatus, excludeUserIds]);

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

  // Stable performSearch function with zero loop dependencies
  const performSearch = useCallback(async (searchTerm: string, targetPage: number) => {
    const trimmed = searchTerm.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setTotal(0);
      setTotalPages(1);
      setIsLoading(false);
      return;
    }

    const currentParams = searchParamsRef.current;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const resp = await workforceApi.searchWorkforce({
        q: trimmed,
        portal: currentParams.portalType,
        organizationId: currentParams.organizationId,
        memberType: currentParams.allowedMemberType,
        status: currentParams.allowedEmploymentStatus,
        page: targetPage,
        limit: 10,
      });

      const excludes = currentParams.excludeUserIds || [];
      const filtered = (resp.items || []).filter(
        (emp) => !excludes.includes(emp.userId),
      );

      setResults(filtered);
      setTotal(resp.total || 0);
      setTotalPages(resp.totalPages || 1);
      setPage(resp.page || targetPage);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Search failed. Please try again.';
      setErrorMsg(message);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search triggers ONLY when user changes query string
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmed = query.trim();
    if (trimmed.length >= 2) {
      debounceTimerRef.current = setTimeout(() => {
        performSearch(trimmed, 1);
      }, 300);
    } else {
      setResults([]);
      setTotal(0);
      setTotalPages(1);
      setIsLoading(false);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, performSearch]);

  const handleSelect = (emp: WorkforceEmployee) => {
    onChange(emp);
    setIsOpen(false);
    setQuery('');
  };

  const handleDeselect = () => {
    onChange(null);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    performSearch(query, newPage);
  };

  return (
    <div ref={containerRef} className="relative z-50">
      {label && (
        <label className="block text-sm font-semibold text-slate-800 mb-1.5">
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
                if (e.target.value.trim().length >= 2) setIsOpen(true);
              }}
              onFocus={() => {
                if (query.trim().length >= 2) setIsOpen(true);
              }}
              disabled={disabled}
              placeholder={placeholder}
              className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-10 py-2.5 text-sm text-slate-900 focus:border-[#244A70] focus:outline-none focus:ring-2 focus:ring-[#244A70]/15 transition-all shadow-2xs disabled:bg-slate-50 disabled:text-slate-400"
            />
            {isLoading ? (
              <Clock className="w-4 h-4 text-[#244A70] animate-spin absolute right-3.5 top-3.5" />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setIsOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 absolute right-3 top-2.5 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null}
          </div>

          {helperText && <p className="text-xs text-slate-500 mt-1">{helperText}</p>}

          {/* Autocomplete Results Popover */}
          {isOpen && query.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-slate-200 shadow-2xl z-[100] overflow-hidden">
              {isLoading ? (
                <div className="p-6 text-center text-xs text-slate-500 flex items-center justify-center space-x-2">
                  <Clock className="w-4 h-4 text-[#244A70] animate-spin" />
                  <span>Searching workforce directory...</span>
                </div>
              ) : errorMsg ? (
                <div className="p-6 text-center text-xs text-rose-500 flex items-center justify-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-500" />
                  <span>{errorMsg}</span>
                </div>
              ) : results.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  <UserMinus className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                  <p className="font-semibold text-slate-700">No employees found</p>
                  <p className="text-slate-400 mt-0.5">
                    No workforce member found matching "{query}" in this portal scope.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="px-3.5 py-2 bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between border-b border-slate-100">
                    <span>
                      Matching Workforce ({results.length} of {total})
                    </span>
                    <span className="text-blue-600 font-medium">Click to select</span>
                  </div>

                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                    {results.map((emp) => (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => handleSelect(emp)}
                        className="w-full text-left p-3.5 hover:bg-blue-50/70 transition-colors flex items-center justify-between gap-3 group cursor-pointer"
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-[#EEF1F6] border border-[#DCE3EC] text-[#244A70] font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                            {emp.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-sm text-slate-900 group-hover:text-[#244A70] truncate">
                                {emp.fullName}
                              </span>
                              <span className="font-mono text-xs text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 shrink-0">
                                #{emp.employeeCode}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 truncate">{emp.email}</p>
                            <div className="flex items-center space-x-2 mt-1 text-[11px] text-slate-600">
                              <span className="font-medium text-slate-700 flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {emp.department}
                              </span>
                              {emp.teamName && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center gap-1">
                                    <Users className="w-3 h-3 text-slate-400" />
                                    {emp.teamName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end space-y-1 shrink-0">
                          {emp.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
                              {emp.status}
                            </span>
                          )}
                          <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {emp.role}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Pagination Footer */}
                  {totalPages > 1 && (
                    <div className="px-3.5 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span>
                        Page {page} of {totalPages}
                      </span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handlePageChange(page - 1)}
                          disabled={page <= 1}
                          className="p-1 rounded hover:bg-white border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePageChange(page + 1)}
                          disabled={page >= totalPages}
                          className="p-1 rounded hover:bg-white border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Selected Employee Dossier Card */
        <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4.5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-full bg-[#EEF1F6] border border-[#DCE3EC] text-[#244A70] font-bold text-base flex items-center justify-center shrink-0 shadow-xs">
                {value.fullName.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-base font-bold text-slate-900">{value.fullName}</h4>
                  <span className="font-mono text-xs text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    #{value.employeeCode}
                  </span>
                  {value.status === 'ACTIVE' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-1.5" />
                      {value.status}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-600 mt-0.5">{value.email}</p>
              </div>
            </div>

            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselect}
                className="text-xs bg-white text-slate-700 hover:text-rose-600 hover:border-rose-300"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Change Employee
              </Button>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-blue-200/60 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-medium">
                Department
              </span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{value.department}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-medium">
                Current Team
              </span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {value.teamName || 'Conversion Operations'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-medium">
                Role & Classification
              </span>
              <span className="font-semibold text-slate-800 mt-0.5 block">{value.role}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] uppercase tracking-wider font-medium">
                Active Workload
              </span>
              <span className="font-semibold text-slate-800 mt-0.5 block">
                {value.activeWorkload} / {value.maxCapacity} projects
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
