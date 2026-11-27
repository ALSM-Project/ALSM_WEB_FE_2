import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Star,
} from 'lucide-react';
import { useAuth } from '@/features/auth/hooks/useAuth';
import {
  supportFeedbackApi,
  type FeedbackStatus,
  type FeedbackSummaryResult,
  type SupportFeedbackItem,
} from '../api/supportFeedback.api';

const FEEDBACK_CATEGORIES = [
  'Overall Experience',
  'Conversion Quality',
  'System Performance',
  'User Interface',
  'Customer Support',
  'Feature Request',
] as const;

const STATUS_BADGE_MAP: Record<FeedbackStatus, { label: string; className: string }> = {
  SUBMITTED: { label: 'Submitted', className: 'bg-blue-50 text-blue-700 border-blue-200' },
  IN_REVIEW: { label: 'In Review', className: 'bg-amber-50 text-amber-800 border-amber-200' },
  ACKNOWLEDGED: { label: 'Acknowledged', className: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  RESOLVED: { label: 'Resolved', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

export const SupportFeedbackPage: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const canViewSummary =
    user?.isPlatformAdmin === true ||
    hasPermission('feedback.summary.view') ||
    hasPermission('users.manage') ||
    hasPermission('organizations.view');

  const [items, setItems] = useState<SupportFeedbackItem[]>([]);
  const [summary, setSummary] = useState<FeedbackSummaryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [ratingFilter, setRatingFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<FeedbackStatus>('IN_REVIEW');
  const [draftNotes, setDraftNotes] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const resolveAttachmentUrl = (url?: string) => {
    if (!url) return '#';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    const rawBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';
    const cleanBase = rawBase.replace(/\/+$/, '');
    const apiRoot = cleanBase.endsWith('/api/v1') ? cleanBase : `${cleanBase}/api/v1`;
    return `${apiRoot}${url.startsWith('/') ? url : `/${url}`}`;
  };

  const fetchFeedback = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [listRes, summaryRes] = await Promise.all([
        supportFeedbackApi.listAll({
          category: categoryFilter === 'ALL' ? undefined : categoryFilter,
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          rating: ratingFilter === 'ALL' ? undefined : ratingFilter,
          search: searchTerm.trim() || undefined,
        }),
        canViewSummary ? supportFeedbackApi.getSummary().catch(() => null) : Promise.resolve(null),
      ]);
      setItems(listRes);
      if (summaryRes) setSummary(summaryRes);
    } catch {
      setErrorMsg('Unable to load customer feedback records. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFeedback();
  }, [categoryFilter, statusFilter, ratingFilter]);

  const startReview = (item: SupportFeedbackItem) => {
    setEditingId(item.id);
    setDraftStatus(item.status);
    setDraftNotes(item.staffNotes || '');
    setSuccessMsg(null);
    setErrorMsg(null);
  };

  const saveReview = async (id: string) => {
    try {
      setSavingId(id);
      setErrorMsg(null);
      setSuccessMsg(null);
      const updated = await supportFeedbackApi.updateStatus(id, {
        status: draftStatus,
        staffNotes: draftNotes.trim() || undefined,
      });
      setItems((prev) => prev.map((it) => (it.id === id ? updated : it)));
      setEditingId(null);
      setSuccessMsg('Feedback status updated successfully.');
      if (canViewSummary) {
        const refreshedSummary = await supportFeedbackApi.getSummary().catch(() => null);
        if (refreshedSummary) setSummary(refreshedSummary);
      }
    } catch {
      setErrorMsg('Failed to update feedback status. Please try again.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#17263A] tracking-tight">
            Feedback &amp; Reviews
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Review customer feedback submissions, manage resolution status, and monitor satisfaction ratings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void fetchFeedback()}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-[#DCE3EC] bg-white hover:bg-slate-50 text-xs font-semibold text-[#17263A] cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Admin Ratings & Summary Section */}
      {canViewSummary && summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="bg-white border border-[#DCE3EC] rounded-xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Average Rating
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-[#17263A]">
                  {summary.averageRating.toFixed(1)}
                </span>
                <span className="text-xs text-slate-500">/ 5.0</span>
              </div>
              <div className="mt-2 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${
                      star <= Math.round(summary.averageRating)
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="mt-4 text-xs text-slate-600 font-medium">
              Based on {summary.totalCount} total submission{summary.totalCount === 1 ? '' : 's'}
            </p>
          </div>

          <div className="bg-white border border-[#DCE3EC] rounded-xl p-5 shadow-xs space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              Rating Distribution
            </p>
            <div className="space-y-1.5">
              {summary.ratingDistribution.map((row) => {
                const pct = summary.totalCount > 0 ? Math.round((row.count / summary.totalCount) * 100) : 0;
                return (
                  <div key={row.rating} className="flex items-center gap-2 text-xs">
                    <span className="w-8 font-semibold text-slate-700">{row.rating}★</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-slate-600 tabular-nums">{row.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white border border-[#DCE3EC] rounded-xl p-5 shadow-xs space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
              By Category
            </p>
            <div className="space-y-1.5">
              {summary.categoryBreakdown.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between text-xs">
                  <span className="text-slate-700 truncate pr-2">{cat.category}</span>
                  <span className="font-semibold text-slate-900 tabular-nums shrink-0">
                    {cat.count} ({cat.averageRating.toFixed(1)}★)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm font-medium text-emerald-800"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm font-medium text-rose-700"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-[#DCE3EC] rounded-xl p-4 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void fetchFeedback();
            }}
            placeholder="Search by customer, email, or feedback text..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-[#DCE3EC] bg-[#F8FAFC] focus:bg-white focus:border-[#244A70] focus:outline-none"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className="py-2 px-3 text-xs rounded-lg border border-[#DCE3EC] bg-white text-slate-800"
        >
          <option value="ALL">All Categories</option>
          {FEEDBACK_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="py-2 px-3 text-xs rounded-lg border border-[#DCE3EC] bg-white text-slate-800"
        >
          <option value="ALL">All Statuses</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="IN_REVIEW">In Review</option>
          <option value="ACKNOWLEDGED">Acknowledged</option>
          <option value="RESOLVED">Resolved</option>
        </select>

        <select
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          aria-label="Filter by rating"
          className="py-2 px-3 text-xs rounded-lg border border-[#DCE3EC] bg-white text-slate-800"
        >
          <option value="ALL">All Ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={String(r)}>
              {r} Star{r === 1 ? '' : 's'}
            </option>
          ))}
        </select>
      </div>

      {/* Feedback List */}
      <div className="bg-white border border-[#DCE3EC] rounded-xl p-6 shadow-xs">
        {loading ? (
          <div className="py-12 flex items-center justify-center gap-2 text-sm text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin text-[#244A70]" />
            <span>Loading feedback submissions...</span>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center text-sm text-slate-600">
            No feedback submissions match the current filters.
          </div>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => {
              const badge = STATUS_BADGE_MAP[item.status] || STATUS_BADGE_MAP.SUBMITTED;
              const isEditing = editingId === item.id;

              return (
                <li
                  key={item.id}
                  className="rounded-xl border border-[#DCE3EC] bg-[#F8FAFC]/60 p-5 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-[#17263A]">{item.userName}</span>
                        <span className="text-xs text-slate-500">({item.userEmail})</span>
                        <span className="text-xs font-semibold text-slate-800 bg-white border border-slate-200 px-2.5 py-0.5 rounded-md">
                          {item.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="inline-flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <Star
                              key={n}
                              className={`w-3.5 h-3.5 ${
                                n <= item.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {!isEditing && (
                        <button
                          type="button"
                          onClick={() => startReview(item)}
                          className="px-3 py-1.5 rounded-lg border border-[#DCE3EC] bg-white hover:bg-slate-50 text-xs font-semibold text-[#244A70] cursor-pointer"
                        >
                          Manage Status
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">
                    {item.description}
                  </p>

                  {item.attachments && item.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.attachments.map((att, idx) => (
                        <a
                          key={att.fileId || idx}
                          href={resolveAttachmentUrl(att.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-[#244A70] hover:underline"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>{att.name}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {item.staffNotes && !isEditing && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-slate-700">
                      <span className="font-semibold text-[#244A70]">Staff Note: </span>
                      <span>{item.staffNotes}</span>
                    </div>
                  )}

                  {isEditing && (
                    <div className="rounded-lg border border-[#DCE3EC] bg-white p-4 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Status
                          </label>
                          <select
                            value={draftStatus}
                            onChange={(e) => setDraftStatus(e.target.value as FeedbackStatus)}
                            className="w-full py-2 px-3 text-xs rounded-lg border border-[#DCE3EC] bg-white"
                          >
                            <option value="SUBMITTED">Submitted</option>
                            <option value="IN_REVIEW">In Review</option>
                            <option value="ACKNOWLEDGED">Acknowledged</option>
                            <option value="RESOLVED">Resolved</option>
                          </select>
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Staff Note (visible to customer)
                          </label>
                          <input
                            type="text"
                            value={draftNotes}
                            onChange={(e) => setDraftNotes(e.target.value)}
                            placeholder="Optional response or resolution note..."
                            className="w-full py-2 px-3 text-xs rounded-lg border border-[#DCE3EC] bg-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={savingId === item.id}
                          className="px-3 py-1.5 rounded-lg border border-[#DCE3EC] bg-white text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveReview(item.id)}
                          disabled={savingId === item.id}
                          className="px-3.5 py-1.5 rounded-lg bg-[#244A70] hover:bg-[#1b3855] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                        >
                          {savingId === item.id ? 'Saving...' : 'Save Changes'}
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default SupportFeedbackPage;
