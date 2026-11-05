import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Plus, RefreshCw, XCircle } from 'lucide-react';
import { crmApi } from '../api/crm.api';
import type { ApprovedContractTemplateVersion } from '../types/crm.types';

type DraftSection = { heading: string; body: string };

export const ContractTemplateAdminPage: React.FC = () => {
  const navigate = useNavigate();
  const [versions, setVersions] = useState<ApprovedContractTemplateVersion[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [title, setTitle] = useState('');
  const [locale, setLocale] = useState<'vi' | 'en' | 'vi-en'>('vi');
  const [sections, setSections] = useState<DraftSection[]>([{ heading: '', body: '' }]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const pendingTemplateId = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await crmApi.listContractTemplateVersions();
      setVersions(rows);
      setError(null);
      if (!selectedTemplateId && rows.length) setSelectedTemplateId(rows[0].templateId);
    } catch {
      setError('Could not load contract templates. Check your permission and try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedTemplateId]);

  useEffect(() => { void refresh(); }, [refresh]);

  const latestVersions = useMemo(() => {
    const latestById = new Map<string, ApprovedContractTemplateVersion>();
    for (const row of versions) {
      const current = latestById.get(row.templateId);
      if (!current || row.versionNumber > current.versionNumber) latestById.set(row.templateId, row);
    }
    return [...latestById.values()].sort((a, b) => a.title.localeCompare(b.title));
  }, [versions]);
  const selectedLatest = latestVersions.find((row) => row.templateId === selectedTemplateId);

  const updateSection = (index: number, field: keyof DraftSection, value: string) => {
    setSections((current) => current.map((section, itemIndex) => itemIndex === index ? { ...section, [field]: value } : section));
  };

  const createVersion = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!title.trim() || sections.some((section) => !section.heading.trim() || !section.body.trim())) {
      setError('Enter a title and complete every section.');
      return;
    }
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      let created: ApprovedContractTemplateVersion;
      if (selectedTemplateId) {
        created = await crmApi.createNextContractTemplateVersion(selectedTemplateId, { title: title.trim(), locale, sections });
      } else {
        pendingTemplateId.current ??= crypto.randomUUID();
        created = await crmApi.createContractTemplateVersion({ templateId: pendingTemplateId.current, title: title.trim(), locale, sections });
        pendingTemplateId.current = null;
      }
      setSelectedTemplateId(created.templateId);
      setTitle('');
      setSections([{ heading: '', body: '' }]);
      setNotice(`Draft v${created.versionNumber} created. A different authorized reviewer must approve it before Sales can use it.`);
      await refresh();
    } catch (cause) {
      const status = (cause as { response?: { status?: number; data?: { message?: string } } }).response?.status;
      const message = (cause as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(status === 403 ? 'You do not have permission to manage contract templates.' : message || 'The template version could not be created. Refresh and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const approve = async (versionId: string) => {
    setError(null); setNotice(null);
    try {
      await crmApi.approveContractTemplateVersion(versionId);
      setNotice('Template version approved. Sales can now select this immutable version.');
      await refresh();
    } catch (cause) {
      const status = (cause as { response?: { status?: number; data?: { message?: string } } }).response?.status;
      const message = (cause as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(status === 403 ? 'You do not have permission to approve templates.' : message || 'This version could not be approved. It must be reviewed by someone other than its creator.');
    }
  };

  const reject = async (versionId: string) => {
    const reason = window.prompt('Provide a reason for rejecting this template draft:')?.trim();
    if (!reason) return;
    setError(null); setNotice(null);
    try {
      await crmApi.rejectContractTemplateVersion(versionId, reason);
      setNotice('Template draft rejected with an audit record. Create a new version after correcting the content.');
      await refresh();
    } catch (cause) {
      const status = (cause as { response?: { status?: number; data?: { message?: string } } }).response?.status;
      const message = (cause as { response?: { data?: { message?: string } } }).response?.data?.message;
      setError(status === 403 ? 'You do not have permission to review templates.' : message || 'This draft could not be rejected.');
    }
  };

  return (
    <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Contract template governance</h1>
          <p className="mt-1 text-sm text-slate-600">Create immutable draft versions. Legal content is supplied by ALSM and must be approved by a different authorized reviewer.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => navigate('/sales/contracts')} className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">
            <ArrowRight className="h-4 w-4" /> Create a contract
          </button>
          <button type="button" onClick={() => void refresh()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </header>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        Do not paste customer secrets or signatory identity documents here. Approving a version records an internal Legal approval; it does not generate a PDF or make it signed.
      </div>
      {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
      {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
        <form onSubmit={(event) => void createVersion(event)} className="space-y-4 rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold text-slate-900">Create a template version</h2>
            <button type="button" onClick={() => { setSelectedTemplateId(''); pendingTemplateId.current = crypto.randomUUID(); }} className="text-xs font-medium text-blue-700 hover:underline">New template</button>
          </div>
          {selectedTemplateId && (
            <label className="block text-xs font-medium text-slate-700">Template to version
              <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                {latestVersions.map((row) => <option key={row.templateId} value={row.templateId}>{row.title} · latest v{row.versionNumber} ({row.status})</option>)}
              </select>
            </label>
          )}
          {selectedLatest?.status === 'DRAFT' && <p role="status" className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">This template has a pending draft. Approve or reject it before creating another version.</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-slate-700">Template title
              <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </label>
            <label className="text-xs font-medium text-slate-700">Language
              <select value={locale} onChange={(event) => setLocale(event.target.value as typeof locale)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm">
                <option value="vi">Vietnamese</option><option value="en">English</option><option value="vi-en">Bilingual</option>
              </select>
            </label>
          </div>
          <div className="space-y-3">
            {sections.map((section, index) => (
              <fieldset key={index} className="space-y-2 rounded-lg border border-slate-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <legend className="px-1 text-xs font-semibold text-slate-700">Section {index + 1}</legend>
                  {sections.length > 1 && <button type="button" onClick={() => setSections((current) => current.filter((_, i) => i !== index))} className="text-xs text-rose-700 hover:underline">Remove</button>}
                </div>
                <input aria-label={`Section ${index + 1} heading`} placeholder="Heading" value={section.heading} onChange={(event) => updateSection(index, 'heading', event.target.value)} maxLength={120} required className="w-full rounded-lg border px-3 py-2 text-sm" />
                <textarea aria-label={`Section ${index + 1} text`} placeholder="Plain text contract clause supplied by Legal" value={section.body} onChange={(event) => updateSection(index, 'body', event.target.value)} maxLength={20000} required rows={4} className="w-full rounded-lg border px-3 py-2 text-sm" />
              </fieldset>
            ))}
            {sections.length < 40 && <button type="button" onClick={() => setSections((current) => [...current, { heading: '', body: '' }])} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"><Plus className="h-3.5 w-3.5" /> Add section</button>}
          </div>
          <button type="submit" disabled={submitting || loading || selectedLatest?.status === 'DRAFT'} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50">{submitting ? 'Saving…' : 'Save immutable draft'}</button>
        </form>

        <section className="rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="font-semibold text-slate-900">Version review</h2>
          {loading ? <p className="py-6 text-sm text-slate-500">Loading…</p> : versions.length === 0 ? <p className="py-6 text-sm text-slate-500">No template versions yet.</p> : (
            <div className="mt-3 space-y-3">
              {versions.map((row) => (
                <article key={row.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div><h3 className="text-sm font-semibold text-slate-900">{row.title}</h3><p className="text-xs text-slate-500">v{row.versionNumber} · {row.locale.toUpperCase()} · {row.status}</p></div>
                    <code className="max-w-32 truncate text-[10px] text-slate-500" title={row.contentDigest}>{row.contentDigest.slice(0, 12)}…</code>
                  </div>
                  {row.status === 'DRAFT' && <div className="mt-3 flex gap-2">
                    <button type="button" onClick={() => void approve(row.id)} className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-medium text-white"><Check className="h-3.5 w-3.5" /> Approve</button>
                    <button type="button" onClick={() => void reject(row.id)} className="inline-flex items-center gap-1 rounded-md border border-rose-300 px-2.5 py-1.5 text-xs font-medium text-rose-800"><XCircle className="h-3.5 w-3.5" /> Reject</button>
                  </div>}
                  {row.status === 'REJECTED' && row.rejectionReason && <p className="mt-2 text-xs text-rose-800">Reason: {row.rejectionReason}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
};
