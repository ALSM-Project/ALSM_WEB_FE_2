import type { Lead, LeadStatus, LeadPriority } from '../types/lead';
import { LEAD_STATUS_LABELS, LEAD_SOURCE_LABELS, LEAD_PRIORITY_LABELS } from '../types/lead';
import { formatVnd } from '@/shared/utils/currency';
import {
  User,
  Mail,
  Phone,
  Calendar,
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
  LOW: 'bg-gray-50 text-gray-600 border-gray-200',
  MEDIUM: 'bg-blue-50 text-blue-600 border-blue-200',
  HIGH: 'bg-orange-50 text-orange-600 border-orange-200',
  CRITICAL: 'bg-red-50 text-red-600 border-red-200',
};

const PRIORITY_DOT: Record<LeadPriority, string> = {
  LOW: 'bg-gray-400',
  MEDIUM: 'bg-blue-400',
  HIGH: 'bg-orange-400',
  CRITICAL: 'bg-red-500 animate-pulse',
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
      className="group border-b border-[#E8ECF1] hover:bg-[#F7F9FC] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[#0652CC] transition-colors duration-150 cursor-pointer"
    >
      {/* Company + Contact */}
      <td className="px-4 py-3.5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#0652CC] to-[#4C9AFF] flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm">
            {lead.companyName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold text-[#091E42] truncate max-w-[200px]">
                {lead.companyName}
              </p>
              <ArrowUpRight className="w-3 h-3 text-[#0652CC] opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex items-center gap-1 mt-0.5">
              <User className="w-3 h-3 text-[#8993A4]" />
              <p className="text-xs text-[#42526E] truncate max-w-[180px]">{lead.contactName}</p>
            </div>
          </div>
        </div>
      </td>

      {/* Contact Info */}
      <td className="px-4 py-3.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <Mail className="w-3 h-3 text-[#8993A4]" />
            <span className="text-xs text-[#42526E] truncate max-w-[180px]">{lead.contactEmail}</span>
          </div>
          {lead.contactPhone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-[#8993A4]" />
              <span className="text-xs text-[#42526E]">{lead.contactPhone}</span>
            </div>
          )}
        </div>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[lead.status]}`}
        >
          {LEAD_STATUS_LABELS[lead.status]}
        </span>
      </td>

      {/* Source */}
      <td className="px-4 py-3.5">
        <span className="text-xs text-[#42526E] bg-[#F7F9FC] px-2 py-1 rounded-md border border-[#E8ECF1]">
          {LEAD_SOURCE_LABELS[lead.source]}
        </span>
      </td>

      {/* Priority */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${PRIORITY_DOT[lead.priority]}`} />
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${PRIORITY_STYLES[lead.priority]}`}
          >
            {LEAD_PRIORITY_LABELS[lead.priority]}
          </span>
        </div>
      </td>

      {/* Estimated Value */}
      <td className="px-4 py-3.5">
        {lead.estimatedValue ? (
          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-500" />
            <span className="text-sm font-semibold text-[#091E42]">
              {formatVnd(lead.estimatedValue)}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[#8993A4]">—</span>
        )}
      </td>

      {/* Assigned To */}
      <td className="px-4 py-3.5">
        {lead.assignedToEmail ? (
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-[#E8F1FF] flex items-center justify-center text-[#0652CC]">
              <span className="text-[10px] font-bold">
                {lead.assignedToEmail.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="text-xs text-[#42526E] truncate max-w-[120px]">
              {lead.assignedToEmail}
            </span>
          </div>
        ) : (
          <span className="text-xs text-[#8993A4] italic">Unassigned</span>
        )}
      </td>

      {/* Created Date */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3 text-[#8993A4]" />
          <span className="text-xs text-[#42526E]">{formatDate(lead.createdAt)}</span>
        </div>
      </td>
    </tr>
  );
};

export default LeadRow;
