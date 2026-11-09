import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  UserCheck,
  Building,
  Mail,
  Phone,
  Layers,
  Calendar,
  AlertCircle,
  FileText,
  DollarSign,
  Loader2,
} from 'lucide-react';
import {
  conversationsApi,
  CrmConversationItem,
  ConvertToLeadResult,
} from '../api/conversations.api';

interface ConvertConversationToLeadModalProps {
  conversation: CrmConversationItem;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: ConvertToLeadResult) => void;
}

export const ConvertConversationToLeadModal: React.FC<ConvertConversationToLeadModalProps> = ({
  conversation,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [companyName, setCompanyName] = useState<string>(
    conversation.companyName || ''
  );
  const [businessRequirements, setBusinessRequirements] = useState<string>(
    conversation.title || ''
  );
  const [estimatedScreens, setEstimatedScreens] = useState<number>(20);
  const [estimatedPrograms, setEstimatedPrograms] = useState<number>(5);
  const [estimatedValue, setEstimatedValue] = useState<number>(100000000);
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const formatDateToYMD = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const tomorrowStr = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return formatDateToYMD(d);
  }, []);

  const [expectedCloseDate, setExpectedCloseDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return formatDateToYMD(d);
  });
  const [followUpDate, setFollowUpDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return formatDateToYMD(d);
  });
  const [notes, setNotes] = useState<string>('');

  const minExpectedCloseDate = followUpDate && followUpDate >= tomorrowStr ? followUpDate : tomorrowStr;

  const handleFollowUpDateChange = (val: string) => {
    setFollowUpDate(val);
    if (expectedCloseDate && val && expectedCloseDate < val) {
      setExpectedCloseDate(val);
    }
  };

  const handleExpectedCloseDateChange = (val: string) => {
    if (followUpDate && val && val < followUpDate) {
      setExpectedCloseDate(followUpDate);
      return;
    }
    setExpectedCloseDate(val);
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      if (!companyName.trim()) {
        setError('Company / Organization Name is required.');
        setSubmitting(false);
        return;
      }

      if (followUpDate && followUpDate < tomorrowStr) {
        setError('Follow-up Date must be from tomorrow onwards (cannot select today or past dates).');
        setSubmitting(false);
        return;
      }

      if (expectedCloseDate && followUpDate && expectedCloseDate < followUpDate) {
        setError('Expected Close Date cannot be earlier than Follow-up Date.');
        setSubmitting(false);
        return;
      }
      const result = await conversationsApi.convertToLead(conversation.id, {
        companyName: companyName.trim(),
        businessRequirements: businessRequirements.trim() || undefined,
        estimatedScreens: Number(estimatedScreens) || 0,
        estimatedPrograms: Number(estimatedPrograms) || 0,
        estimatedValue: Number(estimatedValue) || 0,
        priority,
        expectedCloseDate: expectedCloseDate || undefined,
        followUpDate: followUpDate || undefined,
        notes: notes.trim() || undefined,
      });
      onSuccess(result);
    } catch (err: any) {
      console.error('Convert to lead failed:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to convert conversation to CRM lead.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const formatVND = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#DCE3EC] shadow-2xl max-w-2xl w-full my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-b border-[#DCE3EC] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#244A70] text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#17263A]">
                Convert Conversation to CRM Lead
              </h2>
              <p className="text-xs text-[#64748B]">
                Bridge this customer inquiry into the modernization pipeline for commercial follow-up.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8491A3] hover:text-[#17263A] p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Customer Pre-filled Identity Badge */}
          <div className="p-4 bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                Originating Customer & Inquiry
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-[#EEF1F6] text-[#244A70] border border-[#DCE3EC]">
                Source: CONVERSATION
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-[#17263A] font-semibold">
                <Building className="w-3.5 h-3.5 text-[#8491A3]" />
                <span className="truncate">{conversation.companyName || 'Not specified'}</span>
              </div>
              <div className="flex items-center gap-2 text-[#475569]">
                <Mail className="w-3.5 h-3.5 text-[#8491A3]" />
                <span className="truncate">{conversation.customerEmail}</span>
              </div>
              <div className="flex items-center gap-2 text-[#475569]">
                <Phone className="w-3.5 h-3.5 text-[#8491A3]" />
                <span>{conversation.customerPhone || 'No phone provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-[#475569]">
                <FileText className="w-3.5 h-3.5 text-[#8491A3]" />
                <span className="truncate">Contact: {conversation.customerName}</span>
              </div>
            </div>

            <div className="text-[11px] text-[#64748B] pt-2 border-t border-[#DCE3EC]">
              <span className="font-semibold text-[#475569]">Initial Inquiry: </span>
              <span>{conversation.title}</span>
            </div>
          </div>

          {/* Form to Create New Lead */}
          <form id="convert-lead-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">
                Company / Organization Name *
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. FPT Software / Global Transit Logistics"
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70] focus:bg-white transition-all font-medium text-[#17263A]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">
                Modernization Requirements & Business Scope *
              </label>
              <textarea
                required
                rows={2}
                value={businessRequirements}
                onChange={(e) => setBusinessRequirements(e.target.value)}
                placeholder="e.g. Modernizing 25 legacy screens from Oracle Forms to React, Q4 delivery requirement"
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70] focus:bg-white transition-all resize-none text-[#17263A]"
              />
            </div>

            {/* Scope & Financial Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">
                  Est. Screens
                </label>
                <div className="relative">
                  <Layers className="w-3.5 h-3.5 text-[#8491A3] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={1}
                    value={estimatedScreens}
                    onChange={(e) => setEstimatedScreens(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70] focus:bg-white transition-all text-[#17263A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">
                  Est. Programs
                </label>
                <div className="relative">
                  <FileText className="w-3.5 h-3.5 text-[#8491A3] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    min={1}
                    value={estimatedPrograms}
                    onChange={(e) => setEstimatedPrograms(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70] focus:bg-white transition-all text-[#17263A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">
                  Lead Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70] focus:bg-white transition-all font-semibold text-[#17263A] cursor-pointer"
                >
                  <option value="LOW">Low Priority</option>
                  <option value="MEDIUM">Medium Priority</option>
                  <option value="HIGH">High Priority</option>
                  <option value="URGENT">Urgent (Immediate)</option>
                </select>
              </div>
            </div>

            {/* Deal Value VND */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-[#17263A]">
                  Estimated Project Value (VND)
                </label>
                <span className="text-xs font-bold text-[#244A70]">
                  {formatVND(estimatedValue)}
                </span>
              </div>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-[#8491A3] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  min={0}
                  step={1000000}
                  value={estimatedValue}
                  onChange={(e) => setEstimatedValue(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70] focus:bg-white transition-all text-[#17263A]"
                />
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">
                  Follow-up Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-[#8491A3] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    min={tomorrowStr}
                    value={followUpDate}
                    onChange={(e) => handleFollowUpDateChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70] focus:bg-white transition-all text-[#17263A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#17263A] mb-1">
                  Expected Close Date
                </label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 text-[#8491A3] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    min={minExpectedCloseDate}
                    value={expectedCloseDate}
                    onChange={(e) => handleExpectedCloseDateChange(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70] focus:bg-white transition-all text-[#17263A]"
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-[#17263A] mb-1">
                Sales Internal Notes (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Key customer pain points, legacy stack details, or stakeholder remarks..."
                className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg outline-none focus:border-[#244A70] focus:bg-white transition-all resize-none text-[#17263A]"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-[#F8FAFC] border-t border-[#DCE3EC] flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-[#475569] hover:text-[#17263A] hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#244A70] hover:bg-[#1B3856] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Confirm & Create CRM Lead</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined') {
    return createPortal(modalContent, document.body);
  }

  return modalContent;
};
