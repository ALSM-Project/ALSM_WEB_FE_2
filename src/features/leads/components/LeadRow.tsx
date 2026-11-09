import React from 'react';
import type { Lead, LeadStatus, LeadPriority } from '../types/lead';
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS, LEAD_PRIORITY_LABELS } from '../types/lead';
import { formatVnd } from '@/shared/utils/currency';
import {
  User,
  Mail,
  Phone,
  DollarSign,
  ArrowUpRight,
} from 'lucide-react';

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: 'bg-blue-50 text-blue-700 border-blue-200',
  CONTACTED: 'bg-sky-50 text-sky-700 border-sky-200',
  QUALIFIED: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  PROPOSAL: 'bg-violet-50 text-violet-700 border-violet-200',
  NEGOTIATION: 'bg-amber-50 text-amber-700 border-amber-200',
  WON: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  LOST: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PRIORITY_STYLES: Record<LeadPriority, string> = {
  LOW: 'bg-slate-50 text-slate-600 border-slate-200',
  MEDIUM: 'bg-blue-50 text-blue-700 border-blue-200',
  HIGH: 'bg-amber-50 text-amber-700 border-amber-200',
  CRITICAL: 'bg-rose-50 text-rose-700 border-rose-200',
};

const PRIORITY_DOT: Record<LeadPriority, string> = {
  LOW: 'bg-slate-400',
  MEDIUM: 'bg-blue-500',
  HIGH: 'bg-amber-500',
  CRITICAL: 'bg-rose-600 animate-pulse',
};

interface LeadRowProps {
  lead: Lead;
  onSelect?: (lead: Lead) => void;
}

export const LeadRow: React.FC<LeadRowProps> = ({ lead, onSelect }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <tr
      id={`lead-row-${lead.id}`}
      onClick={() => onSelect?.(lead)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onSelect?.(lead);
        }
      }}
      tabIndex={onSelect ? 0 : undefined}
      aria-label={onSelect ? `View details for ${lead.companyName}, ${lead.contactName}` : undefined}
      className="group border-b border-[#DCE3EC] hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#244A70] transition-colors duration-150 cursor-pointer"
    >
      {/* Company + Primary Contact */}
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EEF1F6] text-[#244A70] border border-[#DCE3EC] flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs group-hover:bg-[#244A70] group-hover:text-white transition-colors">
            {lead.companyName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-[#17263A] truncate max-w-[240px]" title={lead.companyName}>
                {lead.companyName}
              </span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#244A70] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
            <div className="flex items-center gap-1 mt-0.5 text-xs text-[#64748B]">
              <User className="w-3 h-3 text-[#8491A3] shrink-0" />
              <span className="truncate max-w-[200px]" title={lead.contactName}>
                {lead.contactName}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* Contact Details */}
      <td className="px-5 py-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#475569]">
            <Mail className="w-3 h-3 text-[#8491A3] shrink-0" />
            <span className="truncate max-w-[200px]" title={lead.contactEmail}>
              {lead.contactEmail}
            </span>
          </div>
          {lead.contactPhone && (
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Phone className="w-3 h-3 text-[#8491A3] shrink-0" />
              <span>{lead.contactPhone}</span>
            </div>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[lead.status] || 'bg-slate-100 text-slate-700 border-slate-200'}`}
        >
          {LEAD_STATUS_LABELS[lead.status] || lead.status}
        </span>
      </td>

      {/* Source */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <span className="text-xs text-[#475569] bg-[#F4F7FB] px-2.5 py-1 rounded-md border border-[#DCE3EC] font-medium">
          {LEAD_SOURCE_LABELS[lead.source] || lead.source}
        </span>
      </td>

      {/* Priority */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[lead.priority]}`} />
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_STYLES[lead.priority]}`}
          >
            {LEAD_PRIORITY_LABELS[lead.priority] || lead.priority}
          </span>
        </div>
      </td>

      {/* Estimated Value */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        {lead.estimatedValue ? (
          <div className="flex items-center gap-1 text-sm font-semibold text-[#17263A]">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{formatVnd(lead.estimatedValue)}</span>
          </div>
        ) : (
          <span className="text-xs text-[#8491A3]">—</span>
        )}
      </td>

      {/* Assigned To */}
      <td className="px-5 py-3.5 whitespace-nowrap">
        {lead.assignedToEmail ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#EEF1F6] text-[#244A70] border border-[#DCE3EC] flex items-center justify-center text-[10px] font-bold shrink-0">
              {lead.assignedToEmail.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-[#475569] truncate max-w-[130px]" title={lead.assignedToEmail}>
              {lead.assignedToEmail}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[#8491A3] italic">Unassigned</span>
        )}
      </td>

      {/* Created Date */}
      <td className="px-5 py-3.5 whitespace-nowrap text-xs text-[#64748B]">
        {formatDate(lead.createdAt)}
      </td>
    </tr>
  );
};
