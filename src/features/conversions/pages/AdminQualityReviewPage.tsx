import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Clock3,
  Flag,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Star,
  UserCheck,
} from 'lucide-react';
import { adminQualityReviewService } from '../services/quality-review.service';
import {
  ConversionQualityReviewStatus,
  type ConversionQualityReviewResponse,
  type HumanQualityReviewTargetStatus,
} from '../types/quality-review';

export const AdminQualityReviewPage: React.FC = () => {
  const { projectId = '', conversionJobId = '' } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ConversionQualityReviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form states
  const [overrideStatus, setOverrideStatus] = useState<HumanQualityReviewTargetStatus>(
    ConversionQualityReviewStatus.ACCEPTED,
  );
  const [adminNote, setAdminNote] = useState('');
  const [adminScore, setAdminScore] = useState<number | undefined>(undefined);

  const fetchReview = async () => {
    if (!projectId || !conversionJobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await adminQualityReviewService.getQualityReview(projectId, conversionJobId);
      setData(res);
      if (res.review.status && res.review.status !== ConversionQualityReviewStatus.PENDING) {
        setOverrideStatus(res.review.status as HumanQualityReviewTargetStatus);
      }
      if (res.review.qualityScore !== undefined) {
        setAdminScore(res.review.qualityScore);
      }
      if (res.review.reviewNote) {
        setAdminNote(res.review.reviewNote);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load quality review');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReview();
  }, [projectId, conversionJobId]);

  const handleAdminSubmit = async () => {
    if (!projectId || !conversionJobId) return;
    setError(null);
    setSuccessMessage(null);

    if (
      (overrideStatus === ConversionQualityReviewStatus.NEEDS_REWORK ||
        overrideStatus === ConversionQualityReviewStatus.FLAGGED) &&
      !adminNote.trim()
    ) {
      setError('A review note is required when setting status to Needs Rework or Flagged.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await adminQualityReviewService.submitQualityReview(projectId, conversionJobId, {
        status: overrideStatus,
        qualityScore: adminScore,
        reviewNote: adminNote.trim() || undefined,
      });
      setSuccessMessage(`Quality review updated to ${updated.status} successfully.`);
      fetchReview();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to update review decision. Please check your permissions or resolve conflicts.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="p-8 max-w-5xl mx-auto flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <LoaderCircle className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading conversion review details...</p>
      </div>
    );
  }

  const review = data?.review;
  const fileSummary = data?.fileSummary;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center space-x-1 text-xs font-semibold text-slate-500 hover:text-slate-800 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to conversions</span>
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">Admin Quality Review Oversight</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              Enterprise Admin
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Job ID: <span className="font-mono text-slate-700">{conversionJobId}</span> · Project:{' '}
            <span className="font-mono text-slate-700">{projectId}</span>
          </p>
        </div>

        <button
          type="button"
          onClick={fetchReview}
          disabled={loading}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 flex items-start space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Operation Notice</p>
            <p className="text-xs text-rose-700 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-start space-x-3 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Review Updated</p>
            <p className="text-xs text-emerald-700 mt-0.5">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Grid Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Status Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Current Decision</p>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                review?.status === ConversionQualityReviewStatus.ACCEPTED
                  ? 'bg-emerald-100 text-emerald-800'
                  : review?.status === ConversionQualityReviewStatus.NEEDS_REWORK
                  ? 'bg-amber-100 text-amber-800'
                  : review?.status === ConversionQualityReviewStatus.FLAGGED
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {review?.status ?? 'PENDING'}
            </span>
          </div>
          {review?.reviewedAt && (
            <p className="text-[11px] text-slate-400">
              Reviewed at {new Date(review.reviewedAt).toLocaleString()}
            </p>
          )}
        </div>

        {/* Customer Review Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer Assessment</p>
          <div className="flex items-center gap-2">
            <div className="flex items-center text-amber-400">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    review?.qualityScore && s <= review.qualityScore
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs font-bold text-slate-700">
              {review?.qualityScore ? `${review.qualityScore} / 5` : 'Not rated'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Reviewer ID: <span className="font-mono">{review?.reviewedBy || 'N/A'}</span>
          </p>
        </div>

        {/* Artifact Summary */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Artifacts Summary</p>
          <p className="text-sm font-bold text-slate-800">
            {fileSummary?.fileCount ?? 0} files · {(fileSummary?.totalLines ?? 0).toLocaleString()} LOC
          </p>
          <p className="text-[11px] text-slate-400">Engine version: {fileSummary?.toolVersion || 'v1.0.0'}</p>
        </div>
      </div>

      {/* Customer Note Card */}
      {review?.reviewNote && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-2">
          <p className="text-xs font-bold text-slate-700">Reviewer Note & Comments</p>
          <p className="text-xs font-mono text-slate-600 whitespace-pre-wrap">{review.reviewNote}</p>
        </div>
      )}

      {/* Admin Override Form */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-5">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Admin Status Override</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            As an Enterprise Administrator, you can override or resolve quality review decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => setOverrideStatus(ConversionQualityReviewStatus.ACCEPTED)}
            className={`p-3 rounded-xl border text-left transition-all ${
              overrideStatus === ConversionQualityReviewStatus.ACCEPTED
                ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2 text-emerald-700 font-bold text-xs">
              <CheckCircle2 className="w-4 h-4" />
              <span>Accept Quality</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Approve conversion for downstream AI validation.</p>
          </button>

          <button
            type="button"
            onClick={() => setOverrideStatus(ConversionQualityReviewStatus.NEEDS_REWORK)}
            className={`p-3 rounded-xl border text-left transition-all ${
              overrideStatus === ConversionQualityReviewStatus.NEEDS_REWORK
                ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-500'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2 text-amber-700 font-bold text-xs">
              <AlertTriangle className="w-4 h-4" />
              <span>Needs Rework</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Mark conversion as requiring mapping adjustments.</p>
          </button>

          <button
            type="button"
            onClick={() => setOverrideStatus(ConversionQualityReviewStatus.FLAGGED)}
            className={`p-3 rounded-xl border text-left transition-all ${
              overrideStatus === ConversionQualityReviewStatus.FLAGGED
                ? 'bg-rose-50 border-rose-500 ring-2 ring-rose-500'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center space-x-2 text-rose-700 font-bold text-xs">
              <Flag className="w-4 h-4" />
              <span>Flag Issue</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Escalate for engineering investigation.</p>
          </button>
        </div>

        {/* Rating adjustment */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Quality Score (1-5)</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setAdminScore(adminScore === s ? undefined : s)}
                className={`w-9 h-9 rounded-lg border font-bold text-xs transition-colors ${
                  adminScore === s
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {s}★
              </button>
            ))}
          </div>
        </div>

        {/* Admin note */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-700">Admin Justification Note</label>
            <span className="text-[11px] text-slate-400">{adminNote.length} / 2000</span>
          </div>
          <textarea
            rows={3}
            value={adminNote}
            onChange={(e) => setAdminNote(e.target.value)}
            placeholder="Explain why this status was set or overridden..."
            className="w-full text-xs font-mono p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleAdminSubmit}
            disabled={submitting}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors disabled:opacity-60 flex items-center space-x-2"
          >
            {submitting ? (
              <>
                <LoaderCircle className="w-4 h-4 animate-spin" />
                <span>Saving decision...</span>
              </>
            ) : (
              <span>Save Admin Review Decision</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminQualityReviewPage;
