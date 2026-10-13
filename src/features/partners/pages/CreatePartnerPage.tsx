import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Card, Button, Input, PageHeader } from '@/shared/ui';
import { useCreatePartnerMutation } from '../hooks/usePartnersQuery';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CreatePartnerPage: React.FC = () => {
  const navigate = useNavigate();
  const createPartnerMutation = useCreatePartnerMutation();

  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [fieldErrors, setFieldErrors] = useState<{ name?: string; contactEmail?: string }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validate = (): boolean => {
    const errors: { name?: string; contactEmail?: string } = {};
    if (!name.trim()) {
      errors.name = 'Partner name is required.';
    }
    if (!contactEmail.trim()) {
      errors.contactEmail = 'Contact email is required.';
    } else if (!EMAIL_PATTERN.test(contactEmail.trim())) {
      errors.contactEmail = 'Enter a valid email address.';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!validate()) return;
    if (createPartnerMutation.isPending) return;

    try {
      const created = await createPartnerMutation.mutateAsync({
        name: name.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim() || undefined,
        website: website.trim() || undefined,
        address: address.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setSuccessMessage(`Partner profile '${created.name}' created successfully.`);
      setName('');
      setContactEmail('');
      setContactPhone('');
      setWebsite('');
      setAddress('');
      setNotes('');
      setFieldErrors({});
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to create partner profile.';
      setErrorMessage(msg);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-2xl">
      <PageHeader
        title="Create Partner Profile"
        subtitle="Register a new business partner record for the Organisations & Partners directory."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/organisations/partners')}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Partners
          </Button>
        }
      />

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      <Card variant="default" padding="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Partner Name *"
            placeholder="e.g. Acme Consulting Group"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={fieldErrors.name}
          />

          <Input
            label="Contact Email *"
            type="email"
            placeholder="e.g. contact@acme-consulting.com"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            error={fieldErrors.contactEmail}
          />

          <Input
            label="Contact Phone"
            placeholder="e.g. +1 555 010 0100"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
          />

          <Input
            label="Website"
            placeholder="e.g. https://acme-consulting.com"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />

          <Input
            label="Address"
            placeholder="e.g. 500 Market St, Suite 200, San Francisco, CA"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />

          <div className="w-full flex flex-col space-y-1.5">
            <label className="text-xs font-semibold text-[#091E42] tracking-wide">Notes</label>
            <textarea
              placeholder="Any additional context for the conversion staff working with this partner..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] placeholder-[#6B778C] shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-[#0652CC] focus:border-[#0652CC] h-24"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5EAF0]">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/organisations/partners')}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createPartnerMutation.isPending}>
              <Save className="w-4 h-4 mr-1.5" />
              Create Partner Profile
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default CreatePartnerPage;
