import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  Clock,
  Mail,
  MessageSquare,
  Phone,
  PhoneCall,
  RefreshCw,
  Search,
  User,
} from 'lucide-react';
import { Card, PageHeader, Badge, Button } from '@/shared/ui';
import { quoteApi } from '../api/quote.api';
import type { QuoteRequest, QuoteStatus } from '../types/quote';

export const AdminQuoteRequestsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<QuoteStatus | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  // Fetch list of quote requests
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['billing', 'quote-requests', selectedStatus],
    queryFn: () => quoteApi.listQuoteRequests({ status: selectedStatus }),
    staleTime: 1000 * 30, // 30 seconds
  });

  // Mutation to update quote status
  const updateMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CONTACTED' | 'CLOSED' }) =>
      quoteApi.updateQuoteStatus(id, status),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['billing', 'quote-requests'] });
      const statusLabel = updated.status === 'CONTACTED' ? 'Marked as Contacted' : 'Closed';
      setActionSuccessMessage(`Successfully updated request ${updated.id} to ${statusLabel}!`);
      setTimeout(() => setActionSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message || err?.message || 'Failed to update quote request status';
      alert(`Error: ${msg}`);
    },
  });

  const allItems: QuoteRequest[] = data?.items || [];
  const pendingCount = allItems.filter((item) => item.status === 'PENDING').length;

  const filteredItems = allItems.filter((item) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.companyName?.toLowerCase().includes(term) ||
      item.fullName?.toLowerCase().includes(term) ||
      item.email?.toLowerCase().includes(term) ||
      item.id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Subnavigation Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <PageHeader
            title="Enterprise Quote Requests"
            subtitle="Review, approve, and manage custom enterprise modernization requests (UC-32)."
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate('/admin/billing/usage')}
            className="text-xs"
          >
            View Service Usage
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 text-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Action feedback alert ───────────────────────────────────────────── */}
      {actionSuccessMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs px-4 py-3 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{actionSuccessMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── Filter Tabs & Search Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold text-slate-600">
          <button
            type="button"
            onClick={() => setSelectedStatus('')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedStatus === '' ? 'bg-white text-[#091E42] shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            All Requests ({allItems.length})
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('PENDING')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
              selectedStatus === 'PENDING' ? 'bg-white text-[#091E42] shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('CONTACTED')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedStatus === 'CONTACTED' ? 'bg-white text-[#091E42] shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Contacted
          </button>
          <button
            type="button"
            onClick={() => setSelectedStatus('CLOSED')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              selectedStatus === 'CLOSED' ? 'bg-white text-[#091E42] shadow-xs' : 'hover:text-slate-900'
            }`}
          >
            Closed
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search company, email, ID..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
          />
        </div>
      </div>

      {/* ── Requests List / Table ───────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : isError ? (
        <Card variant="default" padding="lg">
          <div className="flex items-center gap-3 text-rose-600">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Failed to load quote requests</p>
              <p className="text-xs text-rose-500 mt-0.5">Please check network connection and administrator permissions.</p>
            </div>
          </div>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card variant="default" padding="lg">
          <div className="flex flex-col items-center justify-center py-12 text-[#6B778C]">
            <Building2 className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm font-semibold text-[#091E42]">No quote requests found</p>
            <p className="text-xs mt-0.5">
              {searchTerm ? 'Try adjusting your search criteria.' : 'Enterprise quote requests submitted by customers will appear here.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredItems.map((req) => {
            const isPending = req.status === 'PENDING';
            const isContacted = req.status === 'CONTACTED';
            const isClosed = req.status === 'CLOSED';

            return (
              <Card
                key={req.id}
                variant="default"
                padding="md"
                className={`transition-all ${
                  isPending ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Company & Contact details */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-extrabold text-[#091E42] flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-[#0652CC]" />
                        {req.companyName || 'Unknown Company'}
                      </span>

                      {/* Status badge */}
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                          PENDING REVIEW
                        </span>
                      )}
                      {isContacted && (
                        <Badge variant="primary">
                          <span className="flex items-center gap-1">
                            <PhoneCall className="w-3 h-3" />
                            CONTACTED
                          </span>
                        </Badge>
                      )}
                      {isClosed && (
                        <Badge variant="secondary">
                          CLOSED
                        </Badge>
                      )}

                      {req.currentPlanTier && (
                        <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                          Plan: {req.currentPlanTier}
                        </span>
                      )}
                    </div>

                    {/* Metadata items */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-y-1 gap-x-4 text-xs text-[#6B778C]">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{req.fullName}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <a href={`mailto:${req.email}`} className="text-[#0652CC] hover:underline">
                          {req.email}
                        </a>
                      </div>
                      {req.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{req.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Message / Details if present */}
                    {req.message && (
                      <div className="mt-2 text-xs text-slate-600 bg-slate-50 rounded-lg p-2.5 border border-slate-100 flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span className="italic">{req.message}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Submitted: {new Date(req.createdAt).toLocaleString()}
                      </span>
                      <span>ID: <code className="font-mono text-slate-600">{req.id}</code></span>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-row lg:flex-col items-end justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          disabled={updateMutation.isPending}
                          onClick={() => updateMutation.mutate({ id: req.id, status: 'CONTACTED' })}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#0652CC] hover:bg-[#0448b3] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          Mark as Contacted
                        </button>
                        <button
                          type="button"
                          disabled={updateMutation.isPending}
                          onClick={() => {
                            if (window.confirm(`Close and approve quote request for ${req.companyName}?`)) {
                              updateMutation.mutate({ id: req.id, status: 'CLOSED' });
                            }
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Approve & Close
                        </button>
                      </>
                    )}

                    {isContacted && (
                      <button
                        type="button"
                        disabled={updateMutation.isPending}
                        onClick={() => {
                          if (window.confirm(`Close quote request for ${req.companyName}?`)) {
                            updateMutation.mutate({ id: req.id, status: 'CLOSED' });
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Complete & Close
                      </button>
                    )}

                    {isClosed && (
                      <div className="text-xs text-slate-400 font-medium italic flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                        Request finalized
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminQuoteRequestsPage;
