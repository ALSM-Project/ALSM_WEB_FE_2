import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, Building2, Mail, Phone, UserRound } from 'lucide-react';
import { Modal } from '@/shared/ui';
import { leadsApi } from '../api/leads.api';
import { LEAD_PRIORITY_LABELS, LEAD_SOURCE_LABELS } from '../types/lead';
import type { CreateLeadPayload, Lead, LeadPriority, LeadSource } from '../types/lead';

export interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: Lead) => void;
}

interface FormState {
  companyName: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  jobTitle: string;
  source: LeadSource;
  priority: LeadPriority;
  estimatedValue: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  companyName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  jobTitle: '',
  source: 'WEBSITE',
  priority: 'MEDIUM',
  estimatedValue: '',
  notes: '',
};

const createRequestId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
};

const createErrorMessage = (error: unknown): string => {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return 'Could not reach the service. Check your connection and try again.';
  }
  const status = (error as { response?: { status?: number } }).response?.status;
  if (status === 400) return 'Check the lead details and correct any invalid fields.';
  if (status === 401) return 'Your session has expired. Sign in again to create this lead.';
  if (status === 403) return 'You do not have permission to add leads. Contact your administrator.';
  if (status === 409) return 'A lead with this email already exists, or this request was changed. Check the email and try again.';
  if (status === 503) return 'Lead creation is temporarily unavailable. Retry this same submission shortly.';
  return 'The lead could not be saved. Please try again.';
};

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setErrorMessage(null);
    requestIdRef.current = null;
  }, [isOpen]);

  const closeModal = () => {
    if (submittingRef.current) return;
    setErrorMessage(null);
    requestIdRef.current = null;
    onClose();
  };

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrorMessage(null);
    requestIdRef.current = null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submittingRef.current) return;
    setErrorMessage(null);

    const companyName = form.companyName.trim();
    const contactName = form.contactName.trim();
    const contactEmail = form.contactEmail.trim().toLowerCase();
    const estimatedValue = form.estimatedValue.trim() ? Number(form.estimatedValue) : undefined;
    if (!companyName || !contactName || !contactEmail) {
      setErrorMessage('Company, contact name, and email are required.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(contactEmail)) {
      setErrorMessage('Enter a valid contact email address.');
      return;
    }
    const contactPhone = form.contactPhone.trim();
    if (contactPhone && !/^[+()\d .-]{7,30}$/.test(contactPhone)) {
      setErrorMessage('Enter a valid phone number using digits and common phone symbols.');
      return;
    }
    if (estimatedValue !== undefined && (
      !Number.isFinite(estimatedValue) ||
      estimatedValue < 0 ||
      estimatedValue > 1_000_000_000_000 ||
      !/^\d+(\.\d{1,2})?$/.test(form.estimatedValue.trim())
    )) {
      setErrorMessage('Estimated value must be between 0 and 1,000,000,000,000 with up to two decimal places.');
      return;
    }

    const payload: CreateLeadPayload = {
      companyName,
      contactName,
      contactEmail,
      contactPhone: contactPhone || undefined,
      jobTitle: form.jobTitle.trim() || undefined,
      source: form.source,
      priority: form.priority,
      estimatedValue,
      currency: 'USD',
      notes: form.notes.trim() || undefined,
    };

    submittingRef.current = true;
    setSubmitting(true);
    const requestId = requestIdRef.current ?? createRequestId();
    requestIdRef.current = requestId;
    try {
      const result = await leadsApi.create(payload, requestId);
      onSuccess(result.lead);
      requestIdRef.current = null;
      onClose();
    } catch (error) {
      setErrorMessage(createErrorMessage(error));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={closeModal} title="Add New Lead" maxWidth="2xl">
      <form onSubmit={handleSubmit} className="space-y-4" aria-busy={submitting}>
        <p className="text-sm text-slate-600">Add a sales prospect. The lead starts in New and is assigned to you.</p>

        {errorMessage && (
          <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-slate-800">
            Company name <span aria-hidden="true" className="text-rose-600">*</span>
            <span className="relative mt-1 block">
              <Building2 aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                autoFocus
                required
                maxLength={160}
                value={form.companyName}
                onChange={(event) => updateField('companyName', event.target.value)}
                disabled={submitting}
                aria-label="Company name"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100"
              />
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Contact name <span aria-hidden="true" className="text-rose-600">*</span>
            <span className="relative mt-1 block">
              <UserRound aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                required
                maxLength={120}
                value={form.contactName}
                onChange={(event) => updateField('contactName', event.target.value)}
                disabled={submitting}
                aria-label="Contact name"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100"
              />
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Contact email <span aria-hidden="true" className="text-rose-600">*</span>
            <span className="relative mt-1 block">
              <Mail aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                required
                type="email"
                maxLength={320}
                autoComplete="email"
                value={form.contactEmail}
                onChange={(event) => updateField('contactEmail', event.target.value)}
                disabled={submitting}
                aria-label="Contact email"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100"
              />
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Phone
            <span className="relative mt-1 block">
              <Phone aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="tel"
                maxLength={30}
                value={form.contactPhone}
                onChange={(event) => updateField('contactPhone', event.target.value)}
                disabled={submitting}
                aria-label="Phone"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100"
              />
            </span>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Job title
            <input
              maxLength={100}
              value={form.jobTitle}
              onChange={(event) => updateField('jobTitle', event.target.value)}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100"
            />
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Lead source
            <select
              value={form.source}
              onChange={(event) => updateField('source', event.target.value as LeadSource)}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100"
            >
              {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Priority
            <select
              value={form.priority}
              onChange={(event) => updateField('priority', event.target.value as LeadPriority)}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100"
            >
              {Object.entries(LEAD_PRIORITY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-medium text-slate-800">
            Estimated value (USD)
            <input
              type="number"
              min="0"
              max="1000000000000"
              step="0.01"
              value={form.estimatedValue}
              onChange={(event) => updateField('estimatedValue', event.target.value)}
              disabled={submitting}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100"
            />
          </label>
        </div>

        <label className="block text-sm font-medium text-slate-800">
          Notes
          <textarea
            rows={3}
            maxLength={2000}
            value={form.notes}
            onChange={(event) => updateField('notes', event.target.value)}
            disabled={submitting}
            className="mt-1 w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600/20 disabled:bg-slate-100"
          />
        </label>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeModal}
            disabled={submitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#0652CC] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0543A8] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Creating lead…' : 'Create lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
