import React, { useState, useEffect } from 'react';
import {
  Landmark,
  Copy,
  Check,
  Eye,
  EyeOff,
  Star,
  CheckCircle2,
  Ban,
  ShieldAlert,
  QrCode,
} from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { BankAccount } from '../types/bankAccount.types';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { generatePureQrDataUrl } from '../utils/qrPayloadGenerator';

interface BankAccountDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: BankAccount | null;
  onRevealAccountNumber?: (id: string) => Promise<{ accountNumber: string }>;
  onEdit?: (account: BankAccount) => void;
  onSetDefault?: (id: string) => void;
  onDeactivate?: (account: BankAccount) => void;
}

export const BankAccountDetailModal: React.FC<BankAccountDetailModalProps> = ({
  isOpen,
  onClose,
  account,
  onRevealAccountNumber,
  onEdit,
  onSetDefault,
  onDeactivate,
}) => {
  const { hasPermission, user } = useAuth();
  const canUpdate = Boolean(user?.isPlatformAdmin || hasPermission('bank_accounts.update'));
  const canSetDefault = Boolean(user?.isPlatformAdmin || hasPermission('bank_accounts.set_default'));
  const canDeactivate = Boolean(user?.isPlatformAdmin || hasPermission('bank_accounts.deactivate'));
  const canReveal = Boolean(
    user?.isPlatformAdmin || hasPermission('bank_accounts.reveal_sensitive_data'),
  );

  const [revealedNumber, setRevealedNumber] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Generate pure payment QR code without any third-party logos or frames
  useEffect(() => {
    let isCancelled = false;
    const activeBin = account?.bin;
    const activeAccNum = revealedNumber;

    if (activeBin && activeAccNum) {
      generatePureQrDataUrl(activeBin, activeAccNum, account?.accountHolderName, { width: 320 })
        .then((url) => {
          if (!isCancelled) setQrDataUrl(url);
        })
        .catch(() => {
          if (!isCancelled) setQrDataUrl(null);
        });
    } else {
      setQrDataUrl(null);
    }

    return () => {
      isCancelled = true;
    };
  }, [account?.bin, revealedNumber, account?.accountHolderName]);

  if (!account) return null;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReveal = async () => {
    if (revealedNumber) {
      setRevealedNumber(null);
      return;
    }
    if (!onRevealAccountNumber) return;

    setIsRevealing(true);
    setRevealError(null);
    try {
      const res = await onRevealAccountNumber(account.id);
      setRevealedNumber(res.accountNumber);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to reveal account number';
      setRevealError(msg);
    } finally {
      setIsRevealing(false);
    }
  };

  const handleModalClose = () => {
    setRevealedNumber(null);
    setRevealError(null);
    setQrDataUrl(null);
    onClose();
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      return new Date(isoString).toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleModalClose}
      title="Receiving Bank Account Details"
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Header Panel */}
        <div className="flex items-center gap-3 p-3.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="w-10 h-10 rounded-lg bg-[#244A70]/10 text-[#244A70] flex items-center justify-center shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base text-[#17263A] truncate">{account.bankName}</span>
              {account.bankCode && (
                <span className="text-xs px-1.5 py-0.5 rounded bg-slate-200/80 font-mono text-slate-700 font-medium">
                  {account.bankCode}
                </span>
              )}
              {account.bin && (
                <span className="text-xs px-2 py-0.5 rounded bg-blue-50 border border-blue-200 font-mono text-blue-700 font-semibold">
                  BIN: {account.bin}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-normal">ALSM Receiving Account</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                account.status === 'active'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-300'
              }`}
            >
              {account.status === 'active' ? (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Active
                </>
              ) : (
                <>
                  <Ban className="w-3 h-3" /> Inactive
                </>
              )}
            </span>
            {account.isDefault && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                <Star className="w-3 h-3 fill-indigo-600 text-indigo-600" /> Default {account.currency}
              </span>
            )}
          </div>
        </div>

        {/* Account Number Box (with Audited Reveal) */}
        <div className="p-4 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Receiving Account Number
            </span>
            <div className="flex items-center gap-1.5">
              {canReveal && onRevealAccountNumber && (
                <button
                  type="button"
                  onClick={handleReveal}
                  disabled={isRevealing}
                  className="inline-flex items-center gap-1 text-xs text-[#244A70] hover:text-[#244A70] font-medium transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-blue-50"
                  title="Audited operation: reveals full unmasked bank account number"
                >
                  {revealedNumber ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" /> Mask
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" /> Reveal (Audited)
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleCopy(revealedNumber || account.accountNumberLast4)}
                className="inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 transition-colors cursor-pointer px-2 py-0.5 rounded hover:bg-slate-200"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="font-mono text-lg font-bold text-[#17263A] tracking-wider py-1">
            {revealedNumber ? (
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {revealedNumber}
              </span>
            ) : (
              <span>{account.accountNumberMasked}</span>
            )}
          </div>

          {revealedNumber && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>Full account number revealed. This security event has been logged in the audit trail.</span>
            </div>
          )}

          {revealError && (
            <p className="text-xs text-rose-600 mt-1.5">{revealError}</p>
          )}
        </div>

        {/* Large Pure Payment QR Code (Pure QR, No Logos) */}
        <div className="p-5 rounded-lg bg-white border border-[#DCE3EC] shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#244A70]" />
              <h3 className="font-bold text-sm text-[#17263A]">
                Payment QR Code
              </h3>
            </div>
            {canReveal && onRevealAccountNumber && !revealedNumber && (
              <Button
                variant="secondary"
                size="sm"
                onClick={handleReveal}
                disabled={isRevealing}
              >
                <Eye className="w-3.5 h-3.5 mr-1" /> Reveal Account to Display QR
              </Button>
            )}
          </div>

          {revealedNumber && qrDataUrl ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-3">
              {/* Large Pure QR Code Display */}
              <div className="p-4 bg-white border-2 border-slate-200 rounded-xl shadow-xs inline-block">
                <img
                  src={qrDataUrl}
                  alt="Payment QR Code"
                  className="w-64 h-64 sm:w-72 sm:h-72 object-contain"
                />
              </div>

              {/* Beneficiary Details Below QR */}
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-[#17263A] uppercase tracking-wide">
                  {account.accountHolderName}
                </p>
                <p className="text-xs font-mono text-slate-600">
                  {account.bankName} ({account.bankCode || 'BIN: ' + account.bin}) &bull; {revealedNumber}
                </p>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50 rounded-lg border border-dashed border-slate-300">
              <div className="w-12 h-12 rounded-full bg-slate-200/80 text-slate-500 flex items-center justify-center mx-auto mb-2.5">
                <QrCode className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700">
                QR Code Preview
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Reveal the full account number above to display the payment QR code.
              </p>
            </div>
          )}
        </div>

        {/* Clean Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-500 font-medium block">Account Holder Name</span>
            <span className="text-sm font-semibold text-[#17263A] mt-0.5 block">
              {account.accountHolderName}
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-medium block">Bank BIN</span>
            <span className="text-sm font-mono font-bold text-[#244A70] mt-0.5 block">
              {account.bin || '—'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-medium block">Branch</span>
            <span className="text-sm font-medium text-[#17263A] mt-0.5 block">
              {account.branchName || 'Headquarters / Unspecified'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-medium block">SWIFT / BIC Code</span>
            <span className="text-sm font-mono font-medium text-[#17263A] mt-0.5 block">
              {account.swiftBic || '—'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 font-medium block">Country & Currency</span>
            <span className="text-sm font-medium text-[#17263A] mt-0.5 block">
              {account.country} ({account.currency})
            </span>
          </div>

          {account.bankAddress && (
            <div className="sm:col-span-2">
              <span className="text-slate-500 font-medium block">Bank Physical Address</span>
              <span className="text-sm text-[#17263A] mt-0.5 block">{account.bankAddress}</span>
            </div>
          )}

          {account.description && (
            <div className="sm:col-span-2">
              <span className="text-slate-500 font-medium block">Administrative Notes</span>
              <p className="text-xs text-slate-700 mt-0.5 p-2.5 rounded bg-slate-50 border border-slate-200">
                {account.description}
              </p>
            </div>
          )}
        </div>

        {/* Metadata Footer */}
        <div className="pt-3 border-t border-[#EEF1F6] flex items-center justify-between text-[11px] text-slate-500">
          <div>
            <span>Created: {formatDate(account.createdAt)}</span>
            {account.updatedAt && (
              <span className="ml-3">Last updated: {formatDate(account.updatedAt)}</span>
            )}
          </div>
          {account.status === 'inactive' && account.deactivationReason && (
            <div className="text-rose-600 font-medium truncate max-w-xs">
              Deactivated: {account.deactivationReason}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-[#EEF1F6]">
          <div className="flex items-center gap-2">
            {account.status === 'active' && !account.isDefault && canSetDefault && onSetDefault && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onSetDefault(account.id);
                  onClose();
                }}
              >
                <Star className="w-3.5 h-3.5 mr-1 text-indigo-600" /> Set as Default
              </Button>
            )}

            {account.status === 'active' && canDeactivate && onDeactivate && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  onDeactivate(account);
                  onClose();
                }}
              >
                <Ban className="w-3.5 h-3.5 mr-1" /> Deactivate
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canUpdate && onEdit && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  onEdit(account);
                  onClose();
                }}
              >
                Edit Account
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={handleModalClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
