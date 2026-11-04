import React, { useEffect, useState } from 'react';
import { Building2, User, Layers } from 'lucide-react';
import { Modal, Button, Input } from '@/shared/ui';
import { partnersApi } from '../api/partners.api';
import { Partner } from '../types/partner.types';
import {
  PartnerFormErrors,
  PartnerFormField,
  partnerErrorToFormErrors,
  validatePartnerForm,
} from '../utils/partnerForm';

export interface RegisterPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (partner: Partner) => void;
}

export const RegisterPartnerModal: React.FC<RegisterPartnerModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [engagementType, setEngagementType] = useState('Dedicated Modernization');
  const [assignedStaff, setAssignedStaff] = useState('');
  const [staffOptions, setStaffOptions] = useState<Awaited<ReturnType<typeof partnersApi.getAssignableStaff>>>([]);

  useEffect(() => {
    let cancelled = false;
    partnersApi
      .getAssignableStaff()
      .then((list) => {
        if (!cancelled) setStaffOptions(list);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const [errors, setErrors] = useState<PartnerFormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setName('');
    setDomain('');
    setContactName('');
    setContactEmail('');
    setEngagementType('Dedicated Modernization');
    setAssignedStaff('');
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validate = () => {
    const errs = validatePartnerForm({ name, domain, contactName, contactEmail });
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /** Editing a field clears its own error (and the server banner) so stale messages don't linger. */
  const clearError = (field: PartnerFormField) => {
    if (errors[field] || errors.form) {
      setErrors(({ [field]: _removed, form: _form, ...rest }) => rest);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Guard against a second submit (e.g. Enter pressed again) while the request is in flight.
    if (submitting || !validate()) return;

    try {
      setSubmitting(true);
      const newPartner = await partnersApi.createPartner({
        name,
        domain,
        contactName,
        contactEmail,
        engagementType,
        assignedStaffName: assignedStaff,
      });

      resetForm();
      if (onSuccess) {
        onSuccess(newPartner);
      }
      onClose();
    } catch (err) {
      setErrors(partnerErrorToFormErrors(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Register Partner Organization"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-xs text-[#6B778C] -mt-2">
          Set up a new enterprise partner workspace, configure dedicated SLA tiers, and assign internal conversion leads.
        </p>

        {errors.form && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700">
            {errors.form}
          </div>
        )}

        {/* Section: Organization Identity */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5EAF0]">
            <Building2 className="w-4 h-4 text-[#0652CC]" />
            <h4 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
              Partner Organization Profile
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Input
                label="Organization / Company Name *"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  clearError('name');
                }}
                placeholder="e.g. Pacific Banking Systems Ltd."
                error={errors.name}
              />
            </div>

            <div>
              <Input
                label="Primary Web Domain *"
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value);
                  clearError('domain');
                }}
                placeholder="e.g. pacificbanking.com"
                error={errors.domain}
              />
            </div>
          </div>
        </div>

        {/* Section: Primary Contact */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5EAF0]">
            <User className="w-4 h-4 text-[#0652CC]" />
            <h4 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
              Primary Contact Information
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <Input
                label="Contact Representative Name *"
                value={contactName}
                onChange={(e) => {
                  setContactName(e.target.value);
                  clearError('contactName');
                }}
                placeholder="e.g. Jonathan Reynolds"
                error={errors.contactName}
              />
            </div>

            <div>
              <Input
                label="Contact Email Address *"
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  clearError('contactEmail');
                }}
                placeholder="e.g. jreynolds@pacificbanking.com"
                error={errors.contactEmail}
              />
            </div>
          </div>
        </div>

        {/* Section: SLA & Staff Assignment */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-1.5 border-b border-[#E5EAF0]">
            <Layers className="w-4 h-4 text-[#0652CC]" />
            <h4 className="text-xs font-bold text-[#091E42] uppercase tracking-wider">
              Engagement Model &amp; Staff Assignment
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="modal-engagement-tier-select" className="block text-xs font-semibold text-[#091E42] mb-1">
                Engagement Model / SLA Tier
              </label>
              <select
                id="modal-engagement-tier-select"
                value={engagementType}
                onChange={(e) => setEngagementType(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#F7F9FC] focus:bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] outline-none focus:ring-1 focus:ring-[#0652CC]"
              >
                <option value="Dedicated Modernization">Dedicated Modernization (4h SLA)</option>
                <option value="Enterprise SLA">Enterprise SLA (2h SLA, 24/7 Priority)</option>
                <option value="Trial Modernization Tier">Trial Modernization Tier (Pilot Evaluation)</option>
                <option value="Standard Partner">Standard Partner (Next Business Day)</option>
              </select>
            </div>

            <div>
              <label htmlFor="modal-assigned-specialist-select" className="block text-xs font-semibold text-[#091E42] mb-1">
                Assign Lead Conversion Specialist
              </label>
              <select
                id="modal-assigned-specialist-select"
                value={assignedStaff}
                onChange={(e) => setAssignedStaff(e.target.value)}
                className="w-full text-xs p-2.5 bg-[#F7F9FC] focus:bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] outline-none focus:ring-1 focus:ring-[#0652CC]"
              >
                <option value="">Not assigned</option>
                {staffOptions.map((m) => (
                  <option key={m.id} value={m.fullName}>
                    {m.fullName} ({m.email})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5EAF0]">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            isLoading={submitting}
            className="bg-[#0652CC] hover:bg-[#0543A8]"
          >
            Register &amp; Setup Partner
          </Button>
        </div>
      </form>
    </Modal>
  );
};
