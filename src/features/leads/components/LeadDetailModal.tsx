import React from 'react';
import type { Lead } from '../types/lead';
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS, LEAD_PRIORITY_LABELS } from '../types/lead';
import {
  X,
  User,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  Tag,
  Calendar,
  Clock,
  FileText,
  UserCheck,
} from 'lucide-react';

interface LeadDetailModalProps {
  lead: Lead | null;
  onClose: () => void;
}

export const LeadDetailModal: React.FC<LeadDetailModalProps> = ({ lead, onClose }) => {
  if (!lead) return null;

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value?: number, currency?: string) => {
    if (value === undefined || value === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col border border-[#E8ECF1]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E8ECF1] bg-[#F7F9FC]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#0652CC] to-[#4C9AFF] flex items-center justify-center text-white font-bold text-base shadow-sm">
              {lead.companyName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-[#091E42]">{lead.companyName}</h2>
              <p className="text-xs text-[#6B778C]">Lead ID: {lead.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#6B778C] hover:bg-gray-200 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Quick Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Status: {LEAD_STATUS_LABELS[lead.status]}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200">
              Source: {LEAD_SOURCE_LABELS[lead.source]}
            </span>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
              Priority: {LEAD_PRIORITY_LABELS[lead.priority]}
            </span>
            {lead.estimatedValue ? (
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {formatCurrency(lead.estimatedValue, lead.currency)}
              </span>
            ) : null}
          </div>

          {/* Grid Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Contact Information */}
            <div className="p-4 rounded-lg bg-[#F7F9FC] border border-[#E8ECF1] space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#0652CC]" /> Contact Person
              </h3>
              <div className="space-y-1.5 text-xs text-[#091E42]">
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-20">Full Name:</span>
                  <span className="font-semibold">{lead.contactName}</span>
                </div>
                {lead.jobTitle && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B778C] w-20">Job Title:</span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-[#8993A4]" />
                      {lead.jobTitle}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-20">Email:</span>
                  <a
                    href={`mailto:${lead.contactEmail}`}
                    className="text-[#0652CC] hover:underline flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    {lead.contactEmail}
                  </a>
                </div>
                {lead.contactPhone && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#6B778C] w-20">Phone:</span>
                    <a
                      href={`tel:${lead.contactPhone}`}
                      className="text-[#0652CC] hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      {lead.contactPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Assignment & Management */}
            <div className="p-4 rounded-lg bg-[#F7F9FC] border border-[#E8ECF1] space-y-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#0652CC]" /> Assignment & Ownership
              </h3>
              <div className="space-y-1.5 text-xs text-[#091E42]">
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-24">Assigned Staff:</span>
                  <span className="font-medium">
                    {lead.assignedToEmail || <span className="italic text-gray-400">Unassigned</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-24">Created By:</span>
                  <span>{lead.createdByEmail || lead.createdByUserId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-24">Created Date:</span>
                  <span className="flex items-center gap-1 text-[#42526E]">
                    <Calendar className="w-3 h-3 text-[#8993A4]" />
                    {formatDate(lead.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[#6B778C] w-24">Last Updated:</span>
                  <span className="flex items-center gap-1 text-[#42526E]">
                    <Clock className="w-3 h-3 text-[#8993A4]" />
                    {formatDate(lead.updatedAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Follow-up & Contact Dates */}
          {(lead.lastContactedAt || lead.nextFollowUpAt) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lead.lastContactedAt && (
                <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-200 text-xs">
                  <span className="text-amber-800 font-semibold block mb-0.5">Last Contacted</span>
                  <span className="text-amber-900">{formatDate(lead.lastContactedAt)}</span>
                </div>
              )}
              {lead.nextFollowUpAt && (
                <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-200 text-xs">
                  <span className="text-blue-800 font-semibold block mb-0.5">Next Follow-Up</span>
                  <span className="text-blue-900">{formatDate(lead.nextFollowUpAt)}</span>
                </div>
              )}
            </div>
          )}

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] mb-2 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#0652CC]" /> Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {lead.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-xs bg-gray-100 text-[#42526E] border border-gray-200"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {lead.notes && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#6B778C] mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#0652CC]" /> Internal Notes
              </h3>
              <div className="p-3 rounded-lg bg-[#F7F9FC] border border-[#E8ECF1] text-xs text-[#091E42] whitespace-pre-wrap leading-relaxed">
                {lead.notes}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E8ECF1] bg-[#F7F9FC] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-[#D9E2EC] text-[#091E42] hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
