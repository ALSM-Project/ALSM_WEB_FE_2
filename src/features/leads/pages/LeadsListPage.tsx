import React, { useState, useMemo } from 'react';
import { LEADS_QUERY_KEY, useLeadsList } from '../hooks/useLeads';
import { LeadRow } from '../components/LeadRow';
import { LeadDetailModal } from '../components/LeadDetailModal';
import { UpdateLeadStatusModal } from '../components/UpdateLeadStatusModal';
import { SendQuoteModal } from '../components/SendQuoteModal';
import { AddLeadModal } from '../components/AddLeadModal';
import type { Lead, LeadStatus, LeadPriority, LeadSource } from '../types/lead';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { StatCard } from '@/shared/ui/StatCard';
import {
  LEAD_STATUS_LABELS,
  LEAD_SOURCE_LABELS,
  LEAD_PRIORITY_LABELS,
} from '../types/lead';
import {
  Search,
  Plus,
  RefreshCw,
  Users,
  UserCheck,
  Award,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  FileQuestion,
} from 'lucide-react';

export const LeadsListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const canCreateLead = hasPermission('sales.leads.manage');

  // Query parameters state
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('');
  const [selectedPriority, setSelectedPriority] = useState<LeadPriority | ''>('');
  const [selectedSource, setSelectedSource] = useState<LeadSource | ''>('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Modals state
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [statusLead, setStatusLead] = useState<Lead | null>(null);
  const [quoteLead, setQuoteLead] = useState<Lead | null>(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<{ message: string; emailSent: boolean | null } | null>(null);

  // Search input handler with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDebouncedSearch(searchTerm);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setSelectedStatus('');
    setSelectedPriority('');
    setSelectedSource('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  // Fetch leads
  const queryParams = useMemo(() => {
    return {
      search: debouncedSearch || searchTerm || undefined,
      status: selectedStatus || undefined,
      priority: selectedPriority || undefined,
      source: selectedSource || undefined,
      sortBy,
      sortOrder,
      page,
      limit,
    };
  }, [debouncedSearch, searchTerm, selectedStatus, selectedPriority, selectedSource, sortBy, sortOrder, page, limit]);

  const { data, isLoading, isError, error, refetch, isFetching } = useLeadsList(queryParams);

  const leads = data?.items || [];
  const total = data?.total || 0;
  const statusCounts = data?.statusCounts || {};

  const totalPages = Math.ceil(total / limit) || 1;
  const hasActiveFilters = Boolean(
    searchTerm || selectedStatus || selectedPriority || selectedSource || sortBy !== 'createdAt' || sortOrder !== 'desc'
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">Leads</h1>
          <p className="text-xs text-[#8491A3] mt-0.5">
            Manage prospective client leads, evaluate deal values, and qualify opportunities.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="refresh-leads-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white border border-[#DCE3EC] text-[#17263A] rounded-lg text-xs font-semibold hover:bg-[#F8FAFC] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#244A70]' : 'text-[#64748B]'}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={() => { setCreateSuccess(null); setShowAddLeadModal(true); }}
            disabled={!canCreateLead}
            title={canCreateLead ? 'Add a new sales lead' : 'Requires sales.leads.manage permission'}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-[#244A70] px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#1B3856] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {createSuccess && (
        <p
          role="status"
          aria-live="polite"
          className={`rounded-lg border px-4 py-3 text-xs font-medium ${
            createSuccess.emailSent !== true
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {createSuccess.message}
        </p>
      )}

      {/* Summary KPI Metric Cards (Standard 4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={total}
          icon={Users}
          onClick={() => { setSelectedStatus(''); setPage(1); }}
          className={!selectedStatus ? 'border-[#244A70] ring-1 ring-[#244A70]' : ''}
          subtext="All tracked prospects in pipeline"
        />

        <StatCard
          label="New Leads"
          value={statusCounts.NEW || 0}
          icon={Sparkles}
          onClick={() => { setSelectedStatus('NEW'); setPage(1); }}
          className={selectedStatus === 'NEW' ? 'border-[#244A70] ring-1 ring-[#244A70]' : ''}
          subtext="Awaiting initial outreach"
        />

        <StatCard
          label="Qualified"
          value={statusCounts.QUALIFIED || 0}
          icon={UserCheck}
          onClick={() => { setSelectedStatus('QUALIFIED'); setPage(1); }}
          className={selectedStatus === 'QUALIFIED' ? 'border-[#244A70] ring-1 ring-[#244A70]' : ''}
          subtext="Requirements validated"
        />

        <StatCard
          label="Won Deals"
          value={statusCounts.WON || 0}
          icon={Award}
          onClick={() => { setSelectedStatus('WON'); setPage(1); }}
          className={selectedStatus === 'WON' ? 'border-[#244A70] ring-1 ring-[#244A70]' : ''}
          subtext="Converted to active contracts"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#DCE3EC] shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8491A3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="lead-search-input"
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by company, contact name, or email..."
              className="w-full pl-9 pr-9 py-2 text-xs bg-[#F8FAFC] focus:bg-white border border-[#DCE3EC] focus:border-[#244A70] rounded-lg text-[#17263A] placeholder-[#8491A3] outline-none transition-all focus:ring-2 focus:ring-[#244A70]/15"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setDebouncedSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title="Clear search"
              >
                <XCircle className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="w-full md:w-44">
            <select
              id="lead-status-filter"
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value as LeadStatus | ''); setPage(1); }}
              className="w-full py-2 px-3 text-xs bg-[#F8FAFC] focus:bg-white border border-[#DCE3EC] focus:border-[#244A70] rounded-lg text-[#17263A] outline-none transition-all cursor-pointer"
            >
              <option value="">All Statuses</option>
              {Object.entries(LEAD_STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="w-full md:w-40">
            <select
              id="lead-priority-filter"
              value={selectedPriority}
              onChange={(e) => { setSelectedPriority(e.target.value as LeadPriority | ''); setPage(1); }}
              className="w-full py-2 px-3 text-xs bg-[#F8FAFC] focus:bg-white border border-[#DCE3EC] focus:border-[#244A70] rounded-lg text-[#17263A] outline-none transition-all cursor-pointer"
            >
              <option value="">All Priorities</option>
              {Object.entries(LEAD_PRIORITY_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Source Filter */}
          <div className="w-full md:w-44">
            <select
              id="lead-source-filter"
              value={selectedSource}
              onChange={(e) => { setSelectedSource(e.target.value as LeadSource | ''); setPage(1); }}
              className="w-full py-2 px-3 text-xs bg-[#F8FAFC] focus:bg-white border border-[#DCE3EC] focus:border-[#244A70] rounded-lg text-[#17263A] outline-none transition-all cursor-pointer"
            >
              <option value="">All Sources</option>
              {Object.entries(LEAD_SOURCE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Control */}
          <div className="w-full md:w-44">
            <select
              id="lead-sort-filter"
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb);
                setSortOrder(so as 'asc' | 'desc');
                setPage(1);
              }}
              className="w-full py-2 px-3 text-xs bg-[#F8FAFC] focus:bg-white border border-[#DCE3EC] focus:border-[#244A70] rounded-lg text-[#17263A] outline-none transition-all cursor-pointer"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="companyName-asc">Company (A-Z)</option>
              <option value="companyName-desc">Company (Z-A)</option>
              <option value="estimatedValue-desc">Highest Value</option>
              <option value="estimatedValue-asc">Lowest Value</option>
            </select>
          </div>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-3.5 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer shrink-0"
            >
              Clear Filters
            </button>
          )}
        </form>
      </div>

      {/* Main Leads Table Area */}
      <div className="bg-white rounded-xl border border-[#DCE3EC] shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                <th className="px-5 py-3">Lead / Company</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Source</th>
                <th className="px-5 py-3">Priority</th>
                <th className="px-5 py-3">Est. Value</th>
                <th className="px-5 py-3">Assigned To</th>
                <th className="px-5 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading State */}
              {isLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-[#DCE3EC] animate-pulse">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-200" />
                          <div className="space-y-1.5">
                            <div className="w-32 h-3.5 bg-slate-200 rounded" />
                            <div className="w-20 h-2.5 bg-slate-200 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <div className="w-36 h-3 bg-slate-200 rounded" />
                          <div className="w-24 h-2.5 bg-slate-200 rounded" />
                        </div>
                      </td>
                      <td className="px-5 py-4"><div className="w-20 h-5 bg-slate-200 rounded-full" /></td>
                      <td className="px-5 py-4"><div className="w-16 h-4 bg-slate-200 rounded" /></td>
                      <td className="px-5 py-4"><div className="w-16 h-4 bg-slate-200 rounded" /></td>
                      <td className="px-5 py-4"><div className="w-20 h-4 bg-slate-200 rounded" /></td>
                      <td className="px-5 py-4"><div className="w-24 h-4 bg-slate-200 rounded" /></td>
                      <td className="px-5 py-4"><div className="w-18 h-4 bg-slate-200 rounded" /></td>
                    </tr>
                  ))}
                </>
              )}

              {/* Error State */}
              {!isLoading && isError && (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-[#17263A]">Failed to load leads</h3>
                      <p className="text-xs text-[#64748B]">
                        {error instanceof Error ? error.message : 'An error occurred while fetching the lead list.'}
                      </p>
                      <button
                        onClick={() => refetch()}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#244A70] text-white hover:bg-[#1B3856] transition-colors cursor-pointer shadow-xs"
                      >
                        Try Again
                      </button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty State */}
              {!isLoading && !isError && leads.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC] text-[#8491A3] flex items-center justify-center shadow-2xs">
                        <FileQuestion className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-bold text-[#17263A]">No leads found</h3>
                      <p className="text-xs text-[#64748B] max-w-xs">
                        {hasActiveFilters
                          ? 'No leads matched your search or filter criteria. Try adjusting your filters.'
                          : 'There are currently no sales leads in the system.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F8FAFC] border border-[#DCE3EC] text-[#17263A] hover:bg-white transition-colors cursor-pointer"
                        >
                          Clear All Filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}

              {/* Data Rows */}
              {!isLoading && !isError && leads.length > 0 && (
                leads.map((lead) => (
                  <LeadRow
                    key={lead.id}
                    lead={lead}
                    onSelect={(selected) => setSelectedLead(selected)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {!isLoading && !isError && total > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-3 border-t border-[#DCE3EC] bg-[#F8FAFC] gap-3">
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <span>Showing</span>
              <span className="font-semibold text-[#17263A]">
                {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)}
              </span>
              <span>of</span>
              <span className="font-semibold text-[#17263A]">{total}</span>
              <span>leads</span>

              <span className="mx-2 text-slate-300">|</span>

              <span>Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                className="py-1 px-2 text-xs bg-white border border-[#DCE3EC] rounded text-[#17263A] outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-[#64748B]">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-[#DCE3EC] text-[#17263A] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-[#DCE3EC] text-[#17263A] hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lead Detail Modal */}
      <LeadDetailModal
        lead={selectedLead}
        onClose={() => setSelectedLead(null)}
        onNotificationUpdate={(updatedLead) => {
          setSelectedLead(updatedLead);
          void queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
        }}
        onUpdateStatus={(lead) => {
          setSelectedLead(null);
          setStatusLead(lead);
        }}
        onSendQuote={(lead) => {
          setSelectedLead(null);
          setQuoteLead(lead);
        }}
      />

      {/* Update Lead Status Modal (UC-66) */}
      <UpdateLeadStatusModal
        lead={statusLead}
        onClose={() => setStatusLead(null)}
        onSuccess={(updatedLead) => {
          setStatusLead(updatedLead);
        }}
      />

      {/* Send Quote Modal (UC-62) */}
      <SendQuoteModal
        lead={quoteLead}
        onClose={() => setQuoteLead(null)}
        onSuccess={() => {
          refetch();
        }}
      />

      {/* Add Lead Modal */}
      <AddLeadModal
        isOpen={showAddLeadModal}
        onClose={() => setShowAddLeadModal(false)}
        onSuccess={(_lead, notificationSent, message) => {
          setShowAddLeadModal(false);
          setCreateSuccess({ message, emailSent: notificationSent });
          setSearchTerm('');
          setDebouncedSearch('');
          setSelectedStatus('');
          setSelectedPriority('');
          setSelectedSource('');
          setSortBy('createdAt');
          setSortOrder('desc');
          setPage(1);
          void queryClient.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
        }}
      />
    </div>
  );
};

export default LeadsListPage;
