import React, { useState } from 'react';
import { Button, Input, Modal } from '@/shared/ui';
import { Building, Mail, Phone, User, DollarSign, AlertCircle } from 'lucide-react';
import { crmApi, LeadDto } from '../api/crm.api';

export interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (lead: LeadDto) => void;
}

export const AddLeadModal: React.FC<AddLeadModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [company, setCompany] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('Website Inbound');
  const [dealValue, setDealValue] = useState(50000);
  const [score, setScore] = useState(50);
  const [assignedToName, setAssignedToName] = useState('Sarah Jenkins');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Frontend validation
    if (!company.trim()) {
      setErrorMsg('Company name is required.');
      return;
    }
    if (!contactName.trim()) {
      setErrorMsg('Contact name is required.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Work email is required.');
      return;
    }

    // Email format regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid work email address.');
      return;
    }

    try {
      setSubmitting(true);
      const created = await crmApi.createLead({
        company: company.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        source,
        dealValue: Number(dealValue) || 25000,
        score: Number(score) || 50,
        assignedToName,
        notes: notes.trim() || undefined,
      });

      onSuccess(created);
      onClose();
      // Reset form
      setCompany('');
      setContactName('');
      setEmail('');
      setPhone('');
      setNotes('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create sales lead.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Commercial Sales Lead">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Company Name *</label>
            <div className="relative">
              <Input
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Apex Commercial Bank"
                className="pl-8 text-xs"
              />
              <Building className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Primary Contact *</label>
            <div className="relative">
              <Input
                required
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Jonathan Vance (CTO)"
                className="pl-8 text-xs"
              />
              <User className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Work Email *</label>
            <div className="relative">
              <Input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="j.vance@apexbank.com"
                className="pl-8 text-xs"
              />
              <Mail className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-2.5" />
            </div>
            <p className="text-[10px] text-[#6B778C] mt-0.5">Validated for uniqueness against current lead roster.</p>
          </div>

          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Phone Number</label>
            <div className="relative">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 234-5678"
                className="pl-8 text-xs"
              />
              <Phone className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-2.5" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Lead Source</label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
            >
              <option value="Website Inbound">Website Inbound</option>
              <option value="Partner Referral">Partner Referral</option>
              <option value="Conference">Industry Conference</option>
              <option value="Outbound Sales">Outbound Sales</option>
              <option value="Executive Sponsor">Executive Sponsor</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Est. Deal Value ($)</label>
            <div className="relative">
              <Input
                type="number"
                min="5000"
                step="5000"
                value={dealValue}
                onChange={(e) => setDealValue(Number(e.target.value))}
                className="pl-8 text-xs"
              />
              <DollarSign className="w-3.5 h-3.5 text-[#6B778C] absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Qualification Score</label>
            <Input
              type="number"
              min="0"
              max="100"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-[#091E42] mb-1">Assigned Sales Rep</label>
            <select
              value={assignedToName}
              onChange={(e) => setAssignedToName(e.target.value)}
              className="w-full text-xs py-2 px-2.5 rounded-xl border border-[#D9E2EC] bg-white text-[#091E42] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
            >
              <option value="Sarah Jenkins">Sarah Jenkins (Enterprise)</option>
              <option value="David Nguyen">David Nguyen (Commercial)</option>
              <option value="Elena Rostova">Elena Rostova (Strategic)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-[#091E42] mb-1">Initial Engagement Notes</label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Key modernization drivers, tech stack (COBOL/CICS/DB2), expected timeline..."
            className="w-full text-xs p-2.5 rounded-xl border border-[#D9E2EC] focus:outline-none focus:ring-2 focus:ring-[#0652CC]"
          />
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-[#E5EAF0]">
          <span className="text-[11px] text-[#6B778C]">
            New leads automatically initialize at <strong>New</strong> stage.
          </span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={submitting}
              className="bg-[#0652CC] hover:bg-[#0543A8] text-white"
            >
              {submitting ? 'Creating Lead...' : 'Create Lead'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
