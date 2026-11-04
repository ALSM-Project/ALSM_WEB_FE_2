import React, { useMemo, useState } from 'react';
import { AlertTriangle, Building2, CheckCircle2, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { Button, Modal } from '@/shared/ui';
import { crmApi } from '../api/crm.api';
import { LeadDto } from '../types/crm.types';

export interface CustomerActivationModalProps {
  isOpen: boolean;
  lead: LeadDto;
  canActivate: boolean;
  onClose: () => void;
  onSuccess: (updatedLead: LeadDto) => void;
}

const getActivationError = (error: any): string => {
  const status = error?.response?.status;
  const data = error?.response?.data;
  const code = data?.code || data?.message?.code;
  if (status === 401) return 'Your session expired. Sign in again and retry.';
  if (status === 403) return 'You do not have permission to convert this lead.';
  if (status === 404) return 'This lead could not be found. Refresh the page and try again.';
  if (code === 'SIGNED_CONTRACT_REQUIRED') return 'A fully signed contract is required before conversion.';
  if (code === 'LEAD_NOT_CONVERTIBLE') return 'A lead marked Lost cannot be converted.';
  if (code === 'LEAD_ALREADY_CONVERTED' || code === 'LEAD_CONVERSION_CONFLICT') {
    return 'This lead was converted in another request. Refresh the lead to see its current state.';
  }
  if (code?.startsWith?.('INVALID_CUSTOMER_')) return 'The lead is missing valid customer organization or contact details.';
  if (status === 503 || code === 'CUSTOMER_CONVERSION_FAILED') {
    return 'Customer conversion could not be completed. No changes were saved; please retry later.';
  }
  const message = data?.message;
  if (typeof message === 'string' && message.length < 240) return message;
  if (Array.isArray(message)) return message.filter((item) => typeof item === 'string').join(' ');
  return 'Customer conversion failed. Refresh the lead and try again.';
};

export const CustomerActivationModal: React.FC<CustomerActivationModalProps> = ({
  isOpen,
  lead,
  canActivate,
  onClose,
  onSuccess,
}) => {
  const [activating, setActivating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const signedContract = useMemo(
    () => lead.contracts?.find((contract) => contract.status === 'SIGNED' || contract.status === 'FULLY_SIGNED'),
    [lead.contracts],
  );
  const isConverted = lead.stage === 'WON'
    && Boolean(lead.convertedOrganizationId || lead.provisioning?.organizationId);
  const isLost = lead.stage === 'LOST';

  const handleActivate = async () => {
    if (activating || !canActivate || !signedContract || isLost || isConverted) return;
    setErrorMessage(null);
    setActivating(true);
    try {
      const result = await crmApi.activateCustomer(lead.id);
      onSuccess(result.lead);
    } catch (error) {
      setErrorMessage(getActivationError(error));
    } finally {
      setActivating(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={activating ? () => undefined : onClose}
      title={isConverted ? `Customer Organization: ${lead.provisioning?.organizationName || lead.company}` : `Convert Lead to Customer: ${lead.company}`}
    >
      <div className="space-y-4 text-sm">
        {errorMessage && (
          <div role="alert" aria-live="assertive" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-800">
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Conversion failed</p>
              <p className="mt-0.5 text-xs">{errorMessage}</p>
            </div>
          </div>
        )}

        {isConverted ? (
          <div role="status" aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <div>
                <h3 className="font-semibold text-emerald-900">Lead converted and marked Won</h3>
                <p className="mt-1 text-xs text-emerald-800">The customer organization is provisioned and linked to this lead.</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-600">
              Review the customer details and signed agreement. Conversion provisions one enterprise organization and moves the lead to Won.
            </p>
            <dl className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <div>
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Building2 aria-hidden="true" className="h-3.5 w-3.5" /> Customer organization
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{lead.company || 'Company name missing'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <UserRound aria-hidden="true" className="h-3.5 w-3.5" /> Primary contact
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{lead.contactName || 'Contact name missing'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <Mail aria-hidden="true" className="h-3.5 w-3.5" /> Contact email
                </dt>
                <dd className="mt-1 break-all font-medium text-slate-900">{lead.email || 'Contact email missing'}</dd>
              </div>
              <div>
                <dt className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  <LockKeyhole aria-hidden="true" className="h-3.5 w-3.5" /> Current pipeline stage
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{lead.stage}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Signed contract</dt>
                <dd className="mt-1 font-medium text-slate-900">
                  {signedContract ? `${signedContract.contractNumber} · ${signedContract.title}` : 'No signed contract'}
                </dd>
              </div>
            </dl>

            {!signedContract && !isLost && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Sign the contract before converting this lead.
              </p>
            )}
            {isLost && (
              <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">
                Lost leads cannot be converted to customers.
              </p>
            )}
            {!canActivate && (
              <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                Your account does not have permission to convert leads.
              </p>
            )}
          </>
        )}

        {isConverted && (
          <dl className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Organization ID</dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-900">
                {lead.provisioning?.organizationId || lead.convertedOrganizationId}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Contact account</dt>
              <dd className="mt-1 text-xs text-slate-900">
                {lead.provisioning?.adminLinked ? 'Linked to an active ALSM account' : 'Organization created; no active ALSM account matched the contact email'}
              </dd>
            </div>
            {lead.convertedAt && (
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Converted at</dt>
                <dd className="mt-1 text-xs text-slate-900">{new Date(lead.convertedAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>
        )}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-3">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={activating}>
            Close
          </Button>
          {!isConverted && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleActivate}
              disabled={activating || !canActivate || !signedContract || isLost}
              aria-busy={activating}
            >
              {activating ? (
                <><LoaderCircle aria-hidden="true" className="mr-1.5 h-4 w-4 animate-spin" /> Converting…</>
              ) : (
                'Convert Lead to Customer (Won)'
              )}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
