import React, { useState, useEffect } from 'react';
import { Building2, User, AlertCircle } from 'lucide-react';
import { Modal, Button } from '@/shared/ui';
import { crmApi, LeadDto } from '../api/crm.api';

interface EditLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadDto;
  onSuccess: (updated: LeadDto) => void;
}

export const EditLeadModal: React.FC<EditLeadModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSuccess,
}) => {
  const [company, setCompany] = useState<string>('');
  const [taxId, setTaxId] = useState<string>('');
  const [representativeName, setRepresentativeName] = useState<string>('');
  const [representativeTitle, setRepresentativeTitle] = useState<string>('Director');
  const [signatoryEmail, setSignatoryEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [contactName, setContactName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [dealValue, setDealValue] = useState<number>(1000000);
  const [estimatedScreens, setEstimatedScreens] = useState<number>(20);
  const [estimatedPrograms, setEstimatedPrograms] = useState<number>(5);
  const [notes, setNotes] = useState<string>('');

  const [saving, setSaving] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (lead) {
      setCompany(lead.company || lead.companyName || '');
      setTaxId(lead.taxId || '0108849201');
      setRepresentativeName(lead.representativeName || lead.contactName || '');
      setRepresentativeTitle(lead.representativeTitle || 'Director');
      setSignatoryEmail(lead.signatoryEmail || lead.email || '');
      setAddress(lead.address || 'Hanoi, Vietnam');
      setContactName(lead.contactName || '');
      setEmail(lead.email || '');
      setPhone(lead.phone || '');
      setDealValue(lead.dealValue || lead.estimatedValue || 1000000);
      setEstimatedScreens(lead.estimatedScreens || 20);
      setEstimatedPrograms(lead.estimatedPrograms || 5);
      setNotes(lead.notes || '');
      setErrorMsg(null);
    }
  }, [lead, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company.trim()) {
      setErrorMsg('Company / Legal Entity name cannot be blank.');
      return;
    }
    if (!contactName.trim()) {
      setErrorMsg('Primary Contact Name cannot be blank.');
      return;
    }

    try {
      setSaving(true);
      setErrorMsg(null);
      const updated = await crmApi.updateLead(lead.id, {
        company: company.trim(),
        companyName: company.trim(),
        taxId: taxId.trim(),
        representativeName: representativeName.trim(),
        representativeTitle: representativeTitle.trim(),
        signatoryEmail: signatoryEmail.trim(),
        address: address.trim(),
        contactName: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        dealValue: Number(dealValue) || 0,
        estimatedScreens: Number(estimatedScreens) || 0,
        estimatedPrograms: Number(estimatedPrograms) || 0,
        notes: notes.trim(),
      });

      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'Failed to update Lead details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit Lead & Legal Entity Details"
      size="4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-xs">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Legal Entity Information */}
        <div className="bg-blue-50/40 p-4 rounded-xl border border-blue-100 space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-blue-200/60">
            <Building2 className="w-4 h-4 text-[#244A70]" />
            <h3 className="font-bold text-[#17263A] uppercase tracking-wider text-xs">
              1. Enterprise Legal Entity (For Contracting & Invoicing)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Company / Legal Entity Name (as registered) *
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. FPT Software Co., Ltd"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Enterprise Tax Identification Number (Tax ID)
              </label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="e.g. 0108849201"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Authorized Signatory Name
              </label>
              <input
                type="text"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder="e.g. Nguyen Van Hoang"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Signatory Job Title / Position
              </label>
              <input
                type="text"
                value={representativeTitle}
                onChange={(e) => setRepresentativeTitle(e.target.value)}
                placeholder="e.g. Managing Director / CEO"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Signatory E-Sign Email
              </label>
              <input
                type="email"
                value={signatoryEmail}
                onChange={(e) => setSignatoryEmail(e.target.value)}
                placeholder="e.g. legal@fpt.com"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Registered Business Headquarter Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Keangnam Landmark 72, Hanoi"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Person & Commercial Scope */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3.5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <User className="w-4 h-4 text-slate-600" />
            <h3 className="font-bold text-[#17263A] uppercase tracking-wider text-xs">
              2. Primary Commercial Contact & Project Scope
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Primary Contact Name *
              </label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Hoang Nguyen"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contact Email Address *
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. hoang@fpt.edu.vn"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Contact Phone Number
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +84 988 888 888"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Estimated Deal Value (VND)
              </label>
              <input
                type="number"
                value={dealValue}
                onChange={(e) => setDealValue(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Est. Screens
              </label>
              <input
                type="number"
                value={estimatedScreens}
                onChange={(e) => setEstimatedScreens(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Est. Backend Programs
              </label>
              <input
                type="number"
                value={estimatedPrograms}
                onChange={(e) => setEstimatedPrograms(Number(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Commercial & Technical Requirements Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Notes on meeting progress, discounts requested, modernization timeline..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70] resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <Button variant="outline" size="sm" type="button" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Lead Details'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
