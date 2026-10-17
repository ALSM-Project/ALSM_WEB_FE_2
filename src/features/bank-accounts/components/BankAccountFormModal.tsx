import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Landmark,
  Loader2,
  AlertCircle,
  Search,
  Check,
  ChevronDown,
  QrCode,
} from 'lucide-react';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import {
  BankAccount,
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from '../types/bankAccount.types';
import {
  VIETNAM_BANKS,
  VietnamBankItem,
  findBankByCodeOrName,
} from '../constants/vietnamBanks';
import { generatePureQrDataUrl } from '../utils/qrPayloadGenerator';

interface BankAccountFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateBankAccountInput | UpdateBankAccountInput) => Promise<void>;
  initialData?: BankAccount | null;
  isSubmitting?: boolean;
}

export const BankAccountFormModal: React.FC<BankAccountFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
}) => {
  const isEditing = Boolean(initialData);

  const [bankName, setBankName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bin, setBin] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [currency] = useState('VND');
  const [country] = useState('VN');
  const [branchName, setBranchName] = useState('');
  const [swiftBic, setSwiftBic] = useState('');
  const [bankAddress, setBankAddress] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isDefault, setIsDefault] = useState(false);

  // Bank selector dropdown state
  const [isBankDropdownOpen, setIsBankDropdownOpen] = useState(false);
  const [bankSearchTerm, setBankSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // QR Preview state
  const [showQrPreview, setShowQrPreview] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBankDropdownOpen(false);
      }
    };
    if (isBankDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isBankDropdownOpen]);

  useEffect(() => {
    if (initialData) {
      setBankName(initialData.bankName);
      setBankCode(initialData.bankCode || '');
      setBin(initialData.bin || '');
      setAccountHolderName(initialData.accountHolderName);
      setAccountNumber(''); // Empty when editing unless explicitly updating
      setBranchName(initialData.branchName || '');
      setSwiftBic(initialData.swiftBic || '');
      setBankAddress(initialData.bankAddress || '');
      setDescription(initialData.description || '');
      setStatus(initialData.status);
      setIsDefault(initialData.isDefault);

      // Infer BIN if missing in legacy records
      if (!initialData.bin) {
        const found = findBankByCodeOrName(initialData.bankCode || initialData.bankName);
        if (found) {
          setBin(found.bin);
        }
      }
    } else {
      setBankName('');
      setBankCode('');
      setBin('');
      setAccountHolderName('');
      setAccountNumber('');
      setBranchName('');
      setSwiftBic('');
      setBankAddress('');
      setDescription('');
      setStatus('active');
      setIsDefault(false);
    }
    setErrors({});
    setFormError(null);
    setBankSearchTerm('');
    setIsBankDropdownOpen(false);
    setShowQrPreview(false);
  }, [initialData, isOpen]);

  // Filter banks based on search input
  const filteredBanks = useMemo(() => {
    const term = (bankSearchTerm || '').trim().toLowerCase();
    if (!term) {
      return VIETNAM_BANKS;
    }
    return VIETNAM_BANKS.filter(
      (b) =>
        b.shortName.toLowerCase().includes(term) ||
        b.code.toLowerCase().includes(term) ||
        b.name.toLowerCase().includes(term) ||
        b.bin.includes(term),
    );
  }, [bankSearchTerm]);

  const popularBanks = useMemo(() => VIETNAM_BANKS.filter((b) => b.isPopular), []);

  const handleSelectBank = (b: VietnamBankItem) => {
    setBankName(b.shortName);
    setBankCode(b.code);
    setBin(b.bin);
    if (b.swiftBic && !swiftBic) {
      setSwiftBic(b.swiftBic);
    }
    setIsBankDropdownOpen(false);
    setBankSearchTerm('');
    if (errors.bankName) {
      setErrors((prev) => ({ ...prev, bankName: '' }));
    }
    if (errors.bin) {
      setErrors((prev) => ({ ...prev, bin: '' }));
    }
  };

  const handleBankNameChange = (val: string) => {
    setBankName(val);
    setBankSearchTerm(val);
    const matched = findBankByCodeOrName(val);
    if (matched) {
      setBankCode(matched.code);
      setBin(matched.bin);
      if (matched.swiftBic && !swiftBic) {
        setSwiftBic(matched.swiftBic);
      }
    }
    if (errors.bankName) {
      setErrors((prev) => ({ ...prev, bankName: '' }));
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!bankName.trim()) {
      errs.bankName = 'Bank name is required';
    } else if (bankName.trim().length < 2) {
      errs.bankName = 'Bank name must be at least 2 characters';
    }

    if (!accountHolderName.trim()) {
      errs.accountHolderName = 'Account holder name is required';
    } else if (accountHolderName.trim().length < 2) {
      errs.accountHolderName = 'Account holder name must be at least 2 characters';
    }

    if (!isEditing && !accountNumber.trim()) {
      errs.accountNumber = 'Account number is required';
    } else if (accountNumber.trim() && accountNumber.trim().length < 4) {
      errs.accountNumber = 'Account number must be at least 4 characters';
    }

    if (bin.trim() && !/^\d{6}$/.test(bin.trim())) {
      errs.bin = 'BIN must be exactly 6 digits';
    }

    if (isDefault && status === 'inactive') {
      errs.status = 'An inactive account cannot be set as the default receiving account';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!validate()) return;

    try {
      if (isEditing) {
        const payload: UpdateBankAccountInput = {
          bankName: bankName.trim(),
          bankCode: bankCode.trim().toUpperCase() || undefined,
          bin: bin.trim() || undefined,
          accountHolderName: accountHolderName.trim().toUpperCase(),
          currency: 'VND',
          country,
          branchName: branchName.trim() || undefined,
          swiftBic: swiftBic.trim().toUpperCase() || undefined,
          bankAddress: bankAddress.trim() || undefined,
          description: description.trim() || undefined,
          status,
          isDefault,
        };
        if (accountNumber.trim()) {
          payload.accountNumber = accountNumber.trim();
        }
        await onSubmit(payload);
      } else {
        const payload: CreateBankAccountInput = {
          bankName: bankName.trim(),
          bankCode: bankCode.trim().toUpperCase() || undefined,
          bin: bin.trim() || undefined,
          accountHolderName: accountHolderName.trim().toUpperCase(),
          accountNumber: accountNumber.trim(),
          currency,
          country,
          branchName: branchName.trim() || undefined,
          swiftBic: swiftBic.trim().toUpperCase() || undefined,
          bankAddress: bankAddress.trim() || undefined,
          description: description.trim() || undefined,
          status,
          isDefault,
        };
        await onSubmit(payload);
      }
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save bank account';
      setFormError(msg);
    }
  };

  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Pure Payment QR Code generation (client-side, no third-party branding)
  useEffect(() => {
    let isCancelled = false;
    const activeBin = bin;
    const activeAccNum = accountNumber.trim() || (isEditing ? initialData?.accountNumberLast4 : '');

    if (activeBin && activeAccNum && showQrPreview) {
      generatePureQrDataUrl(activeBin, activeAccNum, accountHolderName, { width: 280 })
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
  }, [bin, accountNumber, accountHolderName, showQrPreview, isEditing, initialData]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Bank Account' : 'Add Bank Account'}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="flex-1">{formError}</div>
          </div>
        )}

        {/* Section 1: Bank Information */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Bank Details
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Bank Name Searchable Input + Dropdown */}
            <div className="sm:col-span-2 relative" ref={dropdownRef}>
              <label className="block text-xs font-medium text-[#17263A] mb-1">
                Bank Name <span className="text-rose-500">*</span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => handleBankNameChange(e.target.value)}
                  onFocus={() => setIsBankDropdownOpen(true)}
                  placeholder="e.g. Vietcombank"
                  className={`w-full pl-3 pr-9 py-2 text-xs sm:text-sm bg-white border rounded-md focus:outline-none focus:ring-1 transition-colors ${
                    errors.bankName
                      ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-[#DCE3EC] focus:border-[#244A70] focus:ring-[#244A70]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setIsBankDropdownOpen(!isBankDropdownOpen)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                  title="Toggle bank selection menu"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>

              {errors.bankName && <p className="text-[11px] text-rose-600 mt-1">{errors.bankName}</p>}

              {/* Quick Select Buttons for Popular Banks */}
              <div className="flex items-center flex-wrap gap-1.5 mt-2">
                <span className="text-[11px] text-slate-500 font-medium mr-0.5">Popular:</span>
                {popularBanks.slice(0, 8).map((b) => (
                  <button
                    key={b.bin}
                    type="button"
                    onClick={() => handleSelectBank(b)}
                    className={`text-[11px] px-2 py-0.5 rounded transition-colors font-medium ${
                      bin === b.bin
                        ? 'bg-[#244A70] text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {b.shortName}
                  </button>
                ))}
              </div>

              {/* Dropdown Menu */}
              {isBankDropdownOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1.5 bg-white border border-[#DCE3EC] rounded-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 border-b border-slate-100 bg-slate-50/70">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={bankSearchTerm}
                        onChange={(e) => setBankSearchTerm(e.target.value)}
                        placeholder="Search by bank name, code (VCB, MB), or BIN..."
                        className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-[#DCE3EC] rounded-md focus:outline-none focus:border-[#244A70]"
                      />
                    </div>
                  </div>

                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {filteredBanks.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        No matching bank found
                      </div>
                    ) : (
                      filteredBanks.map((b) => {
                        const isSelected = bin === b.bin || bankCode === b.code;
                        return (
                          <div
                            key={b.bin}
                            onClick={() => handleSelectBank(b)}
                            className={`flex items-center justify-between px-3.5 py-2 cursor-pointer text-xs transition-colors ${
                              isSelected ? 'bg-blue-50/70 text-[#244A70]' : 'hover:bg-slate-50 text-slate-800'
                            }`}
                          >
                            <div className="min-w-0 flex-1 pr-3">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-[#17263A]">{b.shortName}</span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 font-mono text-slate-600 font-medium">
                                  {b.code}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">{b.name}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                BIN: {b.bin}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-[#244A70]" />}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bank BIN */}
            <div>
              <label className="block text-xs font-medium text-[#17263A] mb-1">
                Bank BIN
              </label>
              <input
                type="text"
                value={bin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setBin(val);
                  if (errors.bin) setErrors((prev) => ({ ...prev, bin: '' }));
                }}
                placeholder="e.g. 970436"
                maxLength={6}
                className={`w-full px-3 py-2 text-xs sm:text-sm font-mono font-semibold bg-slate-50/60 border rounded-md focus:outline-none focus:ring-1 transition-colors ${
                  errors.bin
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-[#DCE3EC] focus:border-[#244A70] focus:ring-[#244A70]'
                }`}
              />
              {errors.bin && <p className="text-[11px] text-rose-600 mt-1">{errors.bin}</p>}
            </div>

            {/* Bank Code */}
            <div>
              <label className="block text-xs font-medium text-[#17263A] mb-1">
                Bank Code (Optional)
              </label>
              <input
                type="text"
                value={bankCode}
                onChange={(e) => setBankCode(e.target.value.toUpperCase())}
                placeholder="e.g. VCB, MB, TCB"
                maxLength={30}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white border border-[#DCE3EC] rounded-md focus:outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70]"
              />
            </div>

            {/* Branch Name */}
            <div>
              <label className="block text-xs font-medium text-[#17263A] mb-1">
                Branch Name (Optional)
              </label>
              <input
                type="text"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. Hanoi Head Office"
                maxLength={150}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#DCE3EC] rounded-md focus:outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70]"
              />
            </div>

            {/* SWIFT / BIC */}
            <div>
              <label className="block text-xs font-medium text-[#17263A] mb-1">
                SWIFT / BIC (Optional)
              </label>
              <input
                type="text"
                value={swiftBic}
                onChange={(e) => setSwiftBic(e.target.value.toUpperCase())}
                placeholder="e.g. BFTVVNVX"
                maxLength={20}
                className="w-full px-3 py-2 text-xs sm:text-sm font-mono bg-white border border-[#DCE3EC] rounded-md focus:outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70]"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Account Information */}
        <div className="pt-2 border-t border-[#EEF1F6]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Account Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#17263A] mb-1">
                Account Holder Legal Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={accountHolderName}
                onChange={(e) => {
                  setAccountHolderName(e.target.value);
                  if (errors.accountHolderName) setErrors((prev) => ({ ...prev, accountHolderName: '' }));
                }}
                placeholder="e.g. ALSM SOFTWARE JOINT STOCK COMPANY"
                className={`w-full px-3 py-2 text-xs sm:text-sm bg-white border rounded-md uppercase font-medium focus:outline-none focus:ring-1 transition-colors ${
                  errors.accountHolderName
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-[#DCE3EC] focus:border-[#244A70] focus:ring-[#244A70]'
                }`}
              />
              {errors.accountHolderName && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.accountHolderName}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#17263A] mb-1">
                Account Number {!isEditing && <span className="text-rose-500">*</span>}
                {isEditing && (
                  <span className="text-slate-400 font-normal ml-1">
                    (Current: {initialData?.accountNumberMasked}. Leave blank to keep unchanged)
                  </span>
                )}
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => {
                  setAccountNumber(e.target.value.replace(/\s+/g, ''));
                  if (errors.accountNumber) setErrors((prev) => ({ ...prev, accountNumber: '' }));
                }}
                placeholder={isEditing ? 'Enter new number only to change' : 'e.g. 01234567890'}
                className={`w-full px-3 py-2 text-xs sm:text-sm font-mono tracking-wider font-semibold bg-white border rounded-md focus:outline-none focus:ring-1 transition-colors ${
                  errors.accountNumber
                    ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500'
                    : 'border-[#DCE3EC] focus:border-[#244A70] focus:ring-[#244A70]'
                }`}
              />
              {errors.accountNumber && (
                <p className="text-[11px] text-rose-600 mt-1">{errors.accountNumber}</p>
              )}
            </div>

            {/* Large Payment QR Preview in Form */}
            {(bin || bankCode) && (accountNumber || (isEditing && initialData?.accountNumberLast4)) && (
              <div className="sm:col-span-2 p-4 rounded-lg bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-[#244A70]" />
                    <span className="font-semibold text-xs text-slate-800">
                      Payment QR Code Preview
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowQrPreview(!showQrPreview)}
                    className="text-xs text-[#244A70] hover:underline font-medium cursor-pointer"
                  >
                    {showQrPreview ? 'Hide QR' : 'View QR Code'}
                  </button>
                </div>

                {showQrPreview && qrDataUrl && (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col items-center justify-center">
                    <div className="p-3 bg-white border border-slate-300 rounded-xl shadow-xs">
                      <img
                        src={qrDataUrl}
                        alt="Payment QR Code"
                        className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                      />
                    </div>
                    <p className="text-xs font-mono text-slate-600 mt-2">
                      {bankName} &bull; {accountNumber || `•••• ${initialData?.accountNumberLast4}`}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Currency & Country */}
            <div>
              <label className="block text-xs font-medium text-[#17263A] mb-1">
                Currency <span className="text-rose-500">*</span>
              </label>
              <div className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-[#DCE3EC] rounded-md text-slate-700 font-semibold flex items-center justify-between">
                <span>VND</span>
                <span className="text-[11px] font-mono text-slate-400">ISO 4217</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#17263A] mb-1">
                Country
              </label>
              <div className="px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-[#DCE3EC] rounded-md text-slate-700 font-medium">
                <span>VN (Vietnam)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Configuration & Settings */}
        <div className="pt-2 border-t border-[#EEF1F6]">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Account Settings
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-[#17263A] mb-1">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#DCE3EC] rounded-md focus:outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70]"
                >
                  <option value="active">Active (Available for receiving payments)</option>
                  <option value="inactive">Inactive (Deactivated)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#17263A] mb-1">
                  Bank Address (Optional)
                </label>
                <input
                  type="text"
                  value={bankAddress}
                  onChange={(e) => setBankAddress(e.target.value)}
                  placeholder="e.g. 198 Tran Quang Khai, Hanoi"
                  maxLength={255}
                  className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#DCE3EC] rounded-md focus:outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#17263A] mb-1">
                Internal Notes / Description (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Primary receiving account for domestic conversion contracts and service fees"
                rows={2}
                maxLength={500}
                className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-[#DCE3EC] rounded-md focus:outline-none focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70]"
              />
            </div>

            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <input
                id="isDefaultAccount"
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                disabled={status === 'inactive'}
                className="w-4 h-4 mt-0.5 rounded text-[#244A70] focus:ring-[#244A70] border-slate-300"
              />
              <label htmlFor="isDefaultAccount" className="text-xs text-slate-700 select-none">
                <span className="font-semibold text-[#17263A] block">
                  Set as Default Receiving Account for {currency}
                </span>
                When checked, this account will be designated on payment instructions for {currency}.
              </label>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-[#EEF1F6]">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" /> Saving...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Landmark className="w-4 h-4" />
                {isEditing ? 'Save Changes' : 'Create Bank Account'}
              </span>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
