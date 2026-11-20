import React, { useState, useMemo } from 'react';
import {
  Copy,
  Check,
  MessageSquare,
  Mail,
  Building2,
  ArrowRight,
  Send,
  ExternalLink,
  CheckCircle2,
  Edit2,
  Eye,
  FileText,
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
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  const companyName = lead.company || lead.companyName || 'Valued Corporate Client';
  const rawContact = lead.contactName || 'Valued Partner';
  const isUsernameLike = /^[a-z0-9._-]+$/i.test(rawContact) && !rawContact.includes(' ') && rawContact.length > 4;
  const contactName = isUsernameLike ? `Authorized Representative (${rawContact})` : rawContact;

  const repName = lead.assignedToName || 'Enterprise Legal & Contracts Department';
  const dealValue = lead.dealValue ? formatVnd(lead.dealValue) : 'As per Commercial Quotation';
  const scopeText = lead.estimatedScreens || lead.estimatedPrograms
    ? `${lead.estimatedScreens || 0} screens (BMS/DSPF) + ${lead.estimatedPrograms || 0} programs (COBOL)`
    : 'ALSM Enterprise Legacy Modernization Package';

  const defaultTemplate = useMemo(() => {
    return `Dear Executive Team of ${companyName},
Attn: ${contactName}

Thank you for choosing the ALSM Enterprise Modernization Solution.

COMMERCIAL AGREEMENT SUMMARY:
- Solution Package: ALSM Enterprise Legacy Modernization
- Project Scope: ${scopeText}
- Commercial Value: ${dealValue} (Subject to final commercial terms)

To enable our corporate legal department to finalize and dispatch the official Electronic Contract (E-Contract), please verify and provide the following legal entity credentials:

1. Registered Corporate Name: ${companyName}
2. Business Registration / Tax Identification Number: 
3. Official Headquarter Registered Address: 
4. Authorized Signatory Full Name: ${isUsernameLike ? '' : rawContact}
5. Signatory Job Title / Position: (e.g. Chief Executive Officer / Managing Director / Authorized Representative)
6. Power of Attorney Document: (Required if the signatory is not the statutory legal representative)
7. Designated Email for Secure E-Signature Invitation: ${lead.email || ''}
8. Official Business Contact Phone: ${lead.phone || ''}
9. Corporate Bank Account Details: (Bank Name, Branch, Account Number - for billing and contract execution)

RESPONSE INSTRUCTIONS:
Please reply directly to this email with the requested credentials above or attach your official Certificate of Incorporation / Business Registration. Upon receipt, ALSM will transmit the execution-ready agreement via our secure digital signing portal for your review and execution.

LEGAL & SECURITY ASSURANCE:
The ALSM Electronic Contract signing workflow is executed in full compliance with Electronic Transactions legislation and cryptographic integrity standards (SHA-256 digital timestamping).

Sincerely,
${repName}
ALSM Technology Solutions JSC
Keangnam Hanoi Landmark 72, Pham Hung Road, Nam Tu Liem District, Hanoi
Direct Line: (+84) 24 3795 8888 | Email: contracts@alsm.io | Web: https://alsm.io`;
  }, [companyName, contactName, rawContact, isUsernameLike, scopeText, dealValue, lead.email, lead.phone, repName]);

  const [messageContent, setMessageContent] = useState<string>(defaultTemplate);

  React.useEffect(() => {
    setMessageContent(defaultTemplate);
    setEmailSentSuccess(false);
  }, [defaultTemplate, isOpen]);

  const emailSubject = `[ALSM Enterprise] Request for Legal Entity Information for Contract Signing - ${companyName}`;

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

  const handleSendSystemEmail = async () => {
    try {
      setSendingSystemEmail(true);
      await crmApi.sendLeadEmail(lead.id, {
        to: lead.email,
        subject: emailSubject,
        content: messageContent,
      });
      setEmailSentSuccess(true);
      toast.success('Legal entity intake request email has been dispatched successfully.', {
        title: 'Email Dispatched',
      });
    } catch (err: any) {
      toast.error(`Unable to send email: ${err?.response?.data?.message || err?.message || 'System error'}`, {
        title: 'Dispatch Failed',
      });
    } finally {
      setSendingSystemEmail(false);
    }
  };

  const handleOpenWebGmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(lead.email || '')}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(messageContent)}`;
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
      <div className="space-y-4 text-xs font-sans">
        {/* Banner Explaining Flow - Web 2 Palette */}
        <div className="p-3.5 rounded-lg bg-[#EEF1F6] border border-[#DCE3EC] text-[#17263A] flex items-start justify-between gap-3 shadow-xs">
          <div className="space-y-1 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm text-[#14263F]">
                Standard B2B Legal Entity Intake Workflow
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white text-[#244A70] border border-[#DCE3EC] uppercase tracking-wider">
                E-Contract ISO/IEC 27001
              </span>
            </div>
            <p className="text-[#4D6B8C] leading-relaxed text-xs">
              Once commercial terms are agreed, dispatch this official template to the client via <strong>System Email</strong>, <strong>Web Gmail</strong>, or <strong>1-Click Copy</strong>. When the client responds with their corporate credentials, click <strong>"Fill Legal Entity Details"</strong> to update the Lead before generating the official Electronic Contract.
            </p>
          </div>
        </div>

        {/* Lead Context Summary Badges - Web 2 Palette */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#EEF1F6] p-3 rounded-lg border border-[#DCE3EC] text-xs">
          <div>
            <span className="text-[#8491A3] block text-[11px] uppercase font-semibold">Organization</span>
            <span className="font-bold text-[#17263A] truncate block mt-0.5" title={companyName}>{companyName}</span>
          </div>
          <div>
            <span className="text-[#8491A3] block text-[11px] uppercase font-semibold">Recipient (Contact)</span>
            <span className="font-bold text-[#17263A] truncate block mt-0.5">{contactName}</span>
          </div>
          <div>
            <span className="text-[#8491A3] block text-[11px] uppercase font-semibold">Scope &amp; Value</span>
            <span className="font-bold text-[#244A70] truncate block mt-0.5">{dealValue}</span>
          </div>
          <div>
            <span className="text-[#8491A3] block text-[11px] uppercase font-semibold">Signatory Email</span>
            <span className="font-mono text-[#17263A] truncate block mt-0.5" title={lead.email}>{lead.email || 'Not specified'}</span>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 pb-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#8491A3] text-xs">Subject:</span>
            <span className="font-semibold text-[#17263A] bg-[#EEF1F6] px-2.5 py-1 rounded border border-[#DCE3EC] text-xs truncate max-w-xl">
              {emailSubject}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-[#EEF1F6] p-0.5 rounded-lg border border-[#DCE3EC]">
            <button
              type="button"
              onClick={() => setViewMode('edit')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'edit'
                  ? 'bg-white text-[#14263F] shadow-xs'
                  : 'text-[#8491A3] hover:text-[#17263A]'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-[#244A70]" />
              <span>{isEditing ? 'Editing Text' : 'Text Editor'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'preview'
                  ? 'bg-white text-[#244A70] shadow-xs font-bold'
                  : 'text-[#8491A3] hover:text-[#17263A]'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-[#244A70]" />
              <span>Live Email Preview</span>
            </button>
          </div>
        </div>

        {/* System Email Success Alert */}
        {emailSentSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg flex items-center justify-between text-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="font-semibold">
                Legal intake request dispatched to <u>{lead.email}</u> successfully and logged in Activity Timeline.
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

        {/* View Mode: Edit vs Live Preview */}
        {viewMode === 'edit' ? (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-[#17263A]">Message Body (Customizable):</span>
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-[#244A70] hover:text-[#1B3856] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>{isEditing ? 'Lock Template' : 'Edit Template Content'}</span>
              </button>
            </div>

            <textarea
              readOnly={!isEditing}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              rows={12}
              className={`w-full p-3.5 font-mono text-xs rounded-lg border leading-relaxed focus:outline-none resize-none shadow-inner transition-all ${
                isEditing
                  ? 'bg-white text-[#17263A] border-[#244A70] ring-1 ring-[#244A70]'
                  : 'bg-[#EEF1F6] text-[#17263A] border-[#DCE3EC]'
              }`}
            />
          </div>
        ) : (
          /* Live Email Preview Box (Styled with Web 2 Corporate Palette, NO emojis) */
          <div className="border border-[#DCE3EC] rounded-lg overflow-hidden bg-[#EEF1F6] p-4 max-h-[380px] overflow-y-auto">
            <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-sm border border-[#DCE3EC] overflow-hidden">
              {/* Email Top Header in Corporate Navy #14263F */}
              <div className="h-1 bg-[#244A70]"></div>
              <div className="bg-[#14263F] p-4 text-white flex items-center justify-between">
                <div>
                  <div className="font-bold text-base tracking-wide text-white">
                    ALSM ENTERPRISE PLATFORM
                  </div>
                  <div className="text-[10px] text-[#8491A3] font-semibold uppercase tracking-wider mt-0.5">
                    Modernization &amp; Enterprise Solutions
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2 py-0.5 bg-white/10 text-white border border-white/20 rounded text-[9px] font-bold uppercase tracking-wider inline-block">
                    Official Notice
                  </span>
                  <div className="text-[9px] text-[#8491A3] font-mono mt-0.5">Ref: LEI-{lead.id?.slice(-6)?.toUpperCase() || 'SAMPLE'}</div>
                </div>
              </div>

              {/* Sub Notice */}
              <div className="bg-[#EEF1F6] px-5 py-2.5 border-b border-[#DCE3EC] flex items-center justify-between text-[11px]">
                <span className="font-semibold text-[#14263F]">Legal Entity Intake Notice for Electronic Contract Execution</span>
                <span className="text-[#8491A3] text-[10px] uppercase font-bold tracking-wider">Confidential</span>
              </div>

              {/* Email Body */}
              <div className="p-5 text-[#17263A] space-y-3.5 text-xs leading-relaxed">
                <div className="font-bold text-[#14263F] text-sm">
                  Dear Executive Team of {companyName},
                </div>

                <div className="p-3 bg-[#EEF1F6] border-l-4 border-[#244A70] rounded-r-md text-xs text-[#17263A] space-y-1 border-t border-r border-b border-[#DCE3EC]">
                  <div className="text-[10px] font-bold text-[#244A70] uppercase tracking-wider">
                    Commercial Agreement Summary
                  </div>
                  <div><strong>Solution Package:</strong> ALSM Enterprise Legacy Modernization</div>
                  <div><strong>Scope:</strong> {scopeText}</div>
                  <div><strong>Commercial Value:</strong> <span className="text-[#244A70] font-bold">{dealValue}</span></div>
                </div>

                <div className="text-[#4D6B8C]">
                  To enable our corporate legal department to finalize and dispatch the official Electronic Contract (E-Contract), please verify and provide the following legal entity credentials:
                </div>

                {/* Structured Table Preview */}
                <div className="border border-[#DCE3EC] rounded-md overflow-hidden">
                  <div className="bg-[#EEF1F6] px-3 py-1.5 border-b border-[#DCE3EC] font-bold text-[#14263F] text-[11px] uppercase tracking-wider">
                    Legal Entity Intake Directory
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#F8FAFC] border-b border-[#DCE3EC] text-[#4D6B8C]">
                        <th className="text-left py-2 px-3 font-semibold w-1/2">Legal Directory Field</th>
                        <th className="text-left py-2 px-3 font-semibold w-1/2">Submitted Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3EC]">
                      <tr className="bg-white">
                        <td className="py-2 px-3 font-medium text-[#4D6B8C]">1. Registered Corporate Name</td>
                        <td className="py-2 px-3 font-bold text-[#17263A]">{companyName}</td>
                      </tr>
                      <tr className="bg-[#F8FAFC]">
                        <td className="py-2 px-3 font-medium text-[#4D6B8C]">2. Business Tax ID / VAT Number</td>
                        <td className="py-2 px-3 text-[#8491A3] italic">[To be provided]</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="py-2 px-3 font-medium text-[#4D6B8C]">3. Registered Headquarter Address</td>
                        <td className="py-2 px-3 text-[#8491A3] italic">[To be provided]</td>
                      </tr>
                      <tr className="bg-[#F8FAFC]">
                        <td className="py-2 px-3 font-medium text-[#4D6B8C]">4. Authorized Signatory Full Name</td>
                        <td className="py-2 px-3 font-bold text-[#17263A]">{contactName}</td>
                      </tr>
                      <tr className="bg-white">
                        <td className="py-2 px-3 font-medium text-[#4D6B8C]">5. Email for E-Sign Invitation</td>
                        <td className="py-2 px-3 font-mono text-[#244A70]">{lead.email || '[To be provided]'}</td>
                      </tr>
                      <tr className="bg-[#F8FAFC]">
                        <td className="py-2 px-3 font-medium text-[#4D6B8C]">6. Contact Phone Number</td>
                        <td className="py-2 px-3 font-mono text-[#17263A]">{lead.phone || '[To be provided]'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Instructions Box */}
                <div className="p-3 bg-[#EEF1F6] border border-[#DCE3EC] rounded-md text-[#17263A] text-[11px] leading-relaxed">
                  <div className="font-bold text-[#14263F] uppercase tracking-wider mb-1 text-[10px]">Response Instructions</div>
                  Please reply directly to this email with the completed legal entity details listed above, or attach your official Certificate of Incorporation.
                </div>

                <div className="pt-2 text-[#8491A3] text-[11px]">
                  Sincerely,<br />
                  <strong className="text-[#14263F]">{repName}</strong><br />
                  ALSM Technology Solutions JSC
                </div>
              </div>

              {/* Email Footer in Corporate Navy #14263F */}
              <div className="bg-[#14263F] p-4 text-[10px] text-[#8491A3] border-t border-[#203954]">
                <div>ALSM TECHNOLOGY SOLUTIONS JSC</div>
                <div>Keangnam Hanoi Landmark 72, Pham Hung Road, Nam Tu Liem, Hanoi</div>
                <div className="mt-1">Hotline: (+84) 24 3795 8888 | Email: contracts@alsm.io | Web: https://alsm.io</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons Toolbar */}
        <div className="pt-3 border-t border-[#DCE3EC] flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Primary Action: Send Direct System Email */}
            <button
              onClick={handleSendSystemEmail}
              disabled={sendingSystemEmail}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#244A70] hover:bg-[#1B3856] text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              title="Dispatch secure email via ALSM SMTP server and automatically log to Activity Timeline"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{sendingSystemEmail ? 'Sending Email...' : 'Send System Email (SMTP)'}</span>
            </button>

            {/* Alternative Action: Open Web Gmail in Chrome */}
            <button
              onClick={handleOpenWebGmail}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-[#DCE3EC] hover:bg-[#EEF1F6] text-[#17263A] rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title="Open Google Mail in new browser tab with pre-filled content"
            >
              <Mail className="w-3.5 h-3.5 text-[#244A70]" />
              <span>Open Web Gmail</span>
              <ExternalLink className="w-3 h-3 text-[#8491A3]" />
            </button>

            {/* 1-Click Copy */}
            <button
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-xs cursor-pointer border ${
                copied
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  : 'bg-white border-[#DCE3EC] hover:bg-[#EEF1F6] text-[#17263A]'
              }`}
              title="Copy template content to clipboard"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-[#4D6B8C]" />
                  <span>1-Click Copy Template</span>
                </>
              )}
            </button>

            {/* Customer Chat */}
            {lead.conversationId && (
              <button
                onClick={handleOpenChat}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-[#DCE3EC] hover:bg-[#EEF1F6] text-[#17263A] rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
                title="Open customer chat thread"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#244A70]" />
                <span>Customer Chat</span>
              </button>
            )}
          </div>

          {/* Jump to Edit Legal Details */}
          <button
            onClick={() => {
              onClose();
              onOpenEditModal();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#EEF1F6] hover:bg-[#DCE3EC] text-[#14263F] border border-[#DCE3EC] rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Building2 className="w-3.5 h-3.5 text-[#244A70]" />
            <span>Fill Legal Entity Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
