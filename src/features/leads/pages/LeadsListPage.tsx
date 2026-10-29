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
  TrendingUp,
  Award,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Building2,
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

  // Selected lead for detail modal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  // Selected lead for update-status modal
  const [statusLead, setStatusLead] = useState<Lead | null>(null);
  // Selected lead for send-quote modal (UC-62)
  const [quoteLead, setQuoteLead] = useState<Lead | null>(null);
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [createSuccess, setCreateSuccess] = useState<{ message: string; emailSent: boolean | null } | null>(null);

  // Search input handler with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setPage(1);
  };

  // Perform search on Enter or click
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8ECF1]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#0652CC]/10 text-[#0652CC] rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#091E42] tracking-tight">Leads (CRM)</h1>
              <p className="text-xs text-[#6B778C]">
                Manage, filter, and track sales prospects and conversion opportunities
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => { setCreateSuccess(null); setShowAddLeadModal(true); }}
            disabled={!canCreateLead}
            title={canCreateLead ? 'Add a new sales lead' : 'Requires sales.leads.manage permission'}
            className="flex items-center gap-1.5 rounded-lg bg-[#0652CC] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#0543A8] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus aria-hidden="true" className="h-3.5 w-3.5" />
            Add New Lead
          </button>
          <button
            type="button"
            id="refresh-leads-btn"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-white border border-[#D9E2EC] text-[#091E42] hover:bg-[#F7F9FC] transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
            title="Refresh Leads"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#0652CC]' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {createSuccess && (
        <p
          role="status"
          aria-live="polite"
          className={`rounded-lg border px-4 py-3 text-sm ${
            createSuccess.emailSent !== true
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
        >
          {createSuccess.message}
        </p>
      )}

      {/* Metric Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total */}
        <div className="bg-white p-4 rounded-xl border border-[#E8ECF1] shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#6B778C] uppercase tracking-wider">Total Leads</p>
            <p className="text-2xl font-black text-[#091E42] mt-0.5">{total}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* New Leads */}
        <div
          onClick={() => { setSelectedStatus('NEW'); setPage(1); }}
          className="bg-white p-4 rounded-xl border border-[#E8ECF1] shadow-2xs flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors"
        >
          <div>
            <p className="text-[11px] font-semibold text-[#6B778C] uppercase tracking-wider">New Leads</p>
            <p className="text-2xl font-black text-blue-600 mt-0.5">{statusCounts.NEW || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {/* Qualified */}
        <div
          onClick={() => { setSelectedStatus('QUALIFIED'); setPage(1); }}
          className="bg-white p-4 rounded-xl border border-[#E8ECF1] shadow-2xs flex items-center justify-between cursor-pointer hover:border-indigo-300 transition-colors"
        >
          <div>
            <p className="text-[11px] font-semibold text-[#6B778C] uppercase tracking-wider">Qualified</p>
            <p className="text-2xl font-black text-indigo-600 mt-0.5">{statusCounts.QUALIFIED || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Proposal / Negotiation */}
        <div
          onClick={() => { setSelectedStatus('PROPOSAL'); setPage(1); }}
          className="bg-white p-4 rounded-xl border border-[#E8ECF1] shadow-2xs flex items-center justify-between cursor-pointer hover:border-amber-300 transition-colors"
        >
          <div>
            <p className="text-[11px] font-semibold text-[#6B778C] uppercase tracking-wider">In Negotiation</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">
              {(statusCounts.PROPOSAL || 0) + (statusCounts.NEGOTIATION || 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* Won */}
        <div
          onClick={() => { setSelectedStatus('WON'); setPage(1); }}
          className="bg-white p-4 rounded-xl border border-[#E8ECF1] shadow-2xs flex items-center justify-between cursor-pointer hover:border-emerald-300 transition-colors"
        >
          <div>
            <p className="text-[11px] font-semibold text-[#6B778C] uppercase tracking-wider">Won Deals</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{statusCounts.WON || 0}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-[#E8ECF1] shadow-2xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#8993A4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="lead-search-input"
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search by company, contact name, or email..."
              className="w-full pl-9 pr-9 py-2 text-xs bg-[#F7F9FC] focus:bg-white border border-[#D9E2EC] focus:border-[#0652CC] rounded-lg text-[#091E42] placeholder-[#8993A4] outline-none transition-all focus:ring-2 focus:ring-[#0652CC]/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => { setSearchTerm(''); setDebouncedSearch(''); setPage(1); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
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
              className="w-full py-2 px-3 text-xs bg-[#F7F9FC] focus:bg-white border border-[#D9E2EC] focus:border-[#0652CC] rounded-lg text-[#091E42] outline-none transition-all cursor-pointer"
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
              className="w-full py-2 px-3 text-xs bg-[#F7F9FC] focus:bg-white border border-[#D9E2EC] focus:border-[#0652CC] rounded-lg text-[#091E42] outline-none transition-all cursor-pointer"
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
              className="w-full py-2 px-3 text-xs bg-[#F7F9FC] focus:bg-white border border-[#D9E2EC] focus:border-[#0652CC] rounded-lg text-[#091E42] outline-none transition-all cursor-pointer"
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
              className="w-full py-2 px-3 text-xs bg-[#F7F9FC] focus:bg-white border border-[#D9E2EC] focus:border-[#0652CC] rounded-lg text-[#091E42] outline-none transition-all cursor-pointer"
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
              className="px-3 py-2 text-xs font-semibold rounded-lg text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer shrink-0"
            >
              Clear Filters
            </button>
          )}
        </form>
      </div>

      {/* Main Leads Table Area */}
      <div className="bg-white rounded-xl border border-[#E8ECF1] shadow-2xs overflow-hidden">
        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E8ECF1] text-[11px] font-bold text-[#6B778C] uppercase tracking-wider">
                <th className="px-4 py-3">Lead / Company</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Est. Value</th>
                <th className="px-4 py-3">Assigned To</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading State */}
              {isLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-[#E8ECF1] animate-pulse">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gray-200" />
                          <div className="space-y-1.5">
                            <div className="w-28 h-3.5 bg-gray-200 rounded" />
                            <div className="w-20 h-2.5 bg-gray-200 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1.5">
                          <div className="w-32 h-3 bg-gray-200 rounded" />
                          <div className="w-20 h-2.5 bg-gray-200 rounded" />
                        </div>
                      </td>
                      <td className="px-4 py-4"><div className="w-16 h-5 bg-gray-200 rounded-full" /></td>
                      <td className="px-4 py-4"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4"><div className="w-14 h-4 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4"><div className="w-16 h-4 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4"><div className="w-24 h-4 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4"><div className="w-18 h-4 bg-gray-200 rounded" /></td>
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
                      <h3 className="text-sm font-bold text-[#091E42]">Failed to load leads</h3>
                      <p className="text-xs text-[#6B778C]">
                        {error instanceof Error ? error.message : 'An error occurred while fetching the lead list.'}
                      </p>
                      <button
                        onClick={() => refetch()}
                        className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0652CC] text-white hover:bg-[#0543A7] transition-colors cursor-pointer shadow-xs"
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
                      <div className="w-14 h-14 rounded-2xl bg-[#F7F9FC] border border-[#E8ECF1] text-[#8993A4] flex items-center justify-center shadow-xs">
                        <FileQuestion className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-bold text-[#091E42]">No leads found</h3>
                      <p className="text-xs text-[#6B778C] max-w-xs">
                        {hasActiveFilters
                          ? 'No leads matched your search or filter criteria. Try adjusting your filters.'
                          : 'There are currently no sales leads in the system.'}
                      </p>
                      {hasActiveFilters && (
                        <button
                          onClick={handleResetFilters}
                          className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#F7F9FC] border border-[#D9E2EC] text-[#091E42] hover:bg-white transition-colors cursor-pointer"
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

        {/* Pagination Footer */}
        {!isLoading && !isError && total > 0 && (
          <div className="px-6 py-4 border-t border-[#E8ECF1] bg-[#F7F9FC] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#6B778C]">
              <span>
                Showing <span className="font-semibold text-[#091E42]">{(page - 1) * limit + 1}</span> to{' '}
                <span className="font-semibold text-[#091E42]">{Math.min(page * limit, total)}</span> of{' '}
                <span className="font-semibold text-[#091E42]">{total}</span> leads
              </span>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="py-1 px-2 text-xs bg-white border border-[#D9E2EC] rounded-md text-[#091E42] outline-none"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                id="pagination-prev-btn"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-[#D9E2EC] text-[#091E42] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              <span className="text-xs font-semibold px-2 text-[#091E42]">
                Page {page} of {totalPages}
              </span>

              <button
                id="pagination-next-btn"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-[#D9E2EC] text-[#091E42] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
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
