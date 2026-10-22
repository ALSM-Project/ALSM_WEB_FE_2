import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  MessageSquare,
  Mail,
  Building2,
  ArrowRight,
  Sparkles,
  Send,
  ExternalLink,
  CheckCircle2,
  Edit2,
} from 'lucide-react';
import { Modal, toast } from '@/shared/ui';
import { crmApi, LeadDto } from '../api/crm.api';
import { formatVnd } from '@/shared/utils/currency';
import { useNavigate } from 'react-router-dom';

interface RequestLegalInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadDto;
  onOpenEditModal: () => void;
}

export const RequestLegalInfoModal: React.FC<RequestLegalInfoModalProps> = ({
  isOpen,
  onClose,
  lead,
  onOpenEditModal,
}) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState<boolean>(false);
  const [sendingSystemEmail, setSendingSystemEmail] = useState<boolean>(false);
  const [emailSentSuccess, setEmailSentSuccess] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  const companyName = lead.company || lead.companyName || 'Valued Customer';
  const contactName = lead.contactName || 'Valued Partner';
  const repName = lead.assignedToName || 'ALSM Enterprise Solutions Team';
  const dealValue = lead.dealValue ? formatVnd(lead.dealValue) : 'As per Quotation';
  const scopeText = lead.estimatedScreens || lead.estimatedPrograms
    ? `${lead.estimatedScreens || 0} screens + ${lead.estimatedPrograms || 0} programs`
    : 'ALSM Enterprise Modernization Package';

  const defaultTemplate = useMemo(() => {
    return `Dear ${contactName},

Thank you for choosing the ALSM Enterprise Modernization Solution (Scope: ${scopeText} - Project Value: ${dealValue}).

To enable our legal team to draft and execute the official Electronic Contract (E-Contract), please provide the following legal entity details:

1. Registered Company Name: ${companyName}
2. Business Tax ID / VAT Number: 
3. Registered Headquarter Address: 
4. Authorized Signatory Name: ${contactName}
5. Signatory Job Title: (e.g. Chief Executive Officer / Managing Director / Authorized Representative)
6. Email for E-Sign Invitation: ${lead.email || ''}
7. Contact Phone Number: ${lead.phone || ''}

Upon receiving this information, ALSM will dispatch the agreement via our secure digital signing portal for your review and execution.

Best regards,
${repName}
ALSM Technology Solutions JSC`;
  }, [contactName, companyName, scopeText, dealValue, lead.email, lead.phone, repName]);

  const [messageContent, setMessageContent] = useState<string>(defaultTemplate);

  // Sync if lead changes
  React.useEffect(() => {
    setMessageContent(defaultTemplate);
    setEmailSentSuccess(false);
  }, [defaultTemplate, isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(messageContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = messageContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Option 1: Send via ALSM Backend System Email (Nodemailer SMTP) & Log to Activity Timeline
  const handleSendSystemEmail = async () => {
    try {
      setSendingSystemEmail(true);
      const subject = `[ALSM Enterprise] Request for Legal Entity Information for Contract Signing - ${companyName}`;
      await crmApi.sendLeadEmail(lead.id, {
        to: lead.email,
        subject,
        content: messageContent,
      });
      setEmailSentSuccess(true);
    } catch (err: any) {
      toast.error(`Unable to send email: ${err?.response?.data?.message || err?.message || 'System error'}`, { title: 'Email Dispatch Error' });
    } finally {
      setSendingSystemEmail(false);
    }
  };

  // Option 2: Open Gmail Web in Browser
  const handleOpenWebGmail = () => {
    const subject = `[ALSM Enterprise] Request for Legal Entity Information for Contract Signing - ${companyName}`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(messageContent)}`;
    window.open(gmailUrl, '_blank', 'noopener,noreferrer');
  };

  const handleOpenChat = () => {
    if (lead.conversationId) {
      onClose();
      navigate(`/crm/conversations/${lead.conversationId}`);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Legal Entity Information for Contract E-Signing"
      size="4xl"
    >
      <div className="space-y-4 text-xs">
        {/* Banner Explaining Flow */}
        <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 text-blue-900 flex items-start gap-3.5">
          <Sparkles className="w-5 h-5 text-[#244A70] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-[#244A70]">
              Standard B2B Legal Entity Intake Workflow
            </div>
            <p className="text-slate-600 leading-relaxed text-xs max-w-3xl">
              Once the client agrees to the Commercial Quotation, Sales specialists use this template to send via <strong>Direct System Email</strong>, <strong>Web Gmail</strong>, or <strong>1-Click Copy to chat (Teams/Slack)</strong>. When the customer responds, click <strong>"Fill Legal Entity Details"</strong> to update the Lead before generating the official contract.
            </p>
          </div>
        </div>

        {/* Lead Context Summary Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-500 block text-xs uppercase font-semibold">Recipient (Contact)</span>
            <span className="font-bold text-slate-800 truncate block mt-0.5">{contactName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase font-semibold">Organization</span>
            <span className="font-bold text-slate-800 truncate block mt-0.5">{companyName}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase font-semibold">Scope & Value</span>
            <span className="font-bold text-[#244A70] truncate block mt-0.5">{dealValue} ({scopeText})</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs uppercase font-semibold">Signatory Email</span>
            <span className="font-mono text-slate-700 truncate block mt-0.5">{lead.email}</span>
          </div>
        </div>

        {/* System Email Success Alert */}
        {emailSentSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Legal entity intake email sent to <u>{lead.email}</u> successfully and automatically recorded in the Activity Timeline!
              </span>
            </div>
            <button
              onClick={() => setEmailSentSuccess(false)}
              className="text-emerald-700 hover:text-emerald-900 font-bold px-1 cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Template Textbox */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <label className="font-bold text-[#17263A]">
                Message & Email Body (Customizable):
              </label>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-[#244A70] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>{isEditing ? 'Lock Template' : 'Edit Template Content'}</span>
              </button>
            </div>
            <span className="text-xs text-slate-500">
              Pre-filled with Lead & Quote details
            </span>
          </div>

          <textarea
            readOnly={!isEditing}
            value={messageContent}
            onChange={(e) => setMessageContent(e.target.value)}
            rows={11}
            className={`w-full p-3.5 font-mono text-xs rounded-xl border leading-relaxed focus:outline-none resize-none shadow-inner ${
              isEditing
                ? 'bg-white text-slate-800 border-[#244A70] ring-1 ring-[#244A70]'
                : 'bg-slate-900 text-slate-100 border-slate-800'
            }`}
          />
        </div>

        {/* Action Buttons Toolbar */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Action: Send Direct System Email */}
            <button
              onClick={handleSendSystemEmail}
              disabled={sendingSystemEmail}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#244A70] hover:bg-[#1B3856] text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Send email directly via ALSM SMTP server and automatically log to Activity Timeline"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingSystemEmail ? 'Sending Email...' : 'Send Direct Email (System)'}</span>
            </button>

            {/* Alternative Action: Open Web Gmail in Chrome */}
            <button
              onClick={handleOpenWebGmail}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              title="Open Google Mail in browser tab"
            >
              <Mail className="w-3.5 h-3.5 text-rose-600" />
              <span>Open Web Gmail</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>

            {/* 1-Click Copy for Zalo / Teams / Chat */}
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-2xs cursor-pointer border ${
                copied
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-800'
              }`}
              title="Copy entire template to clipboard for pasting into Teams or Slack"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>1-Click Copy Template</span>
                </>
              )}
            </button>

            {/* Customer Chat */}
            {lead.conversationId && (
              <button
                onClick={handleOpenChat}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                title="Open live chat thread with customer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>Live Customer Chat</span>
              </button>
            )}
          </div>

          {/* Quick jump to Edit Legal Details */}
          <button
            onClick={() => {
              onClose();
              onOpenEditModal();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-[#17263A] rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-[#244A70]" />
            <span>Customer Replied? Enter Legal Info Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
