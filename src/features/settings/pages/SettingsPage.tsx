import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Save,
  CheckCircle2,
  Building,
  CreditCard,
  FileCheck,
  History,
  AlertCircle,
  Loader2,
  X,
  FileSignature,
  ArrowRight,
  Landmark,
} from 'lucide-react';
import { Card, Input } from '@/shared/ui';
import { companyProfileApi, type ProviderCompanyProfile } from '@/features/admin/api/companyProfile.api';
import { useBankAccounts } from '@/features/bank-accounts/hooks/useBankAccounts';
import { CompanyDigitalSignatureSection } from '../components/CompanyDigitalSignatureSection';

export const SettingsPage: React.FC = () => {
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bank Accounts query for compact preview card
  const { data: bankAccountsData, isLoading: isLoadingBankAccounts } = useBankAccounts({
    limit: 5,
  });

  // Company Legal Profile states
  const [profileLoading, setProfileLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versions, setVersions] = useState<ProviderCompanyProfile[]>([]);

  const [legalName, setLegalName] = useState('ALSM SOFTWARE MODERNIZATION TECHNOLOGY JOINT STOCK COMPANY');
  const [taxId, setTaxId] = useState('0110892345');
  const [registeredAddress, setRegisteredAddress] = useState(
    '12th Floor, Keangnam Landmark 72, Pham Hung Road, Me Tri Ward, Nam Tu Liem District, Hanoi, Vietnam'
  );
  const [businessRegistrationNumber, setBusinessRegistrationNumber] = useState('0110892345');
  const [representativeName, setRepresentativeName] = useState('Nguyen Huu Dung');
  const [representativeTitle, setRepresentativeTitle] = useState('General Director');
  const [contactEmail, setContactEmail] = useState('contracts@alsm.io');
  const [contactPhone, setContactPhone] = useState('+84 24 7300 8899');
  const [bankName, setBankName] = useState('Joint Stock Commercial Bank for Foreign Trade of Vietnam (Vietcombank)');
  const [bankAccountNumber, setBankAccountNumber] = useState('1029384756');
  const [bankAccountHolder, setBankAccountHolder] = useState('CONG TY CP CONG NGHE HIEN DAI HOA PHAN MEM ALSM');
  const [companyLogo, setCompanyLogo] = useState('/assets/logo.png');

  // Signatory
  const [signerName, setSignerName] = useState('Nguyen Huu Dung');
  const [signerTitle, setSignerTitle] = useState('General Director');
  const [signerEmail, setSignerEmail] = useState('contracts@alsm.io');
  const [certProvider, setCertProvider] = useState('VNPT-CA');
  const [certSerial, setCertSerial] = useState('VNPT-ECA-ALSM-01');
  const [autoCounterSign, setAutoCounterSign] = useState(true);
  const [signatureImageUrl, setSignatureImageUrl] = useState('');
  const [companySealUrl, setCompanySealUrl] = useState('');
  const [signatureType, setSignatureType] = useState<'drawn' | 'uploaded' | 'typed'>('drawn');
  const [stampPosition, setStampPosition] = useState<'overlap' | 'side_by_side' | 'signature_only'>('overlap');
  const [signingMethod, setSigningMethod] = useState<'cloud_ca' | 'usb_token' | 'hsm'>('cloud_ca');
  const [certificateStatus, setCertificateStatus] = useState<'active' | 'expiring_soon' | 'expired' | 'unverified'>('active');
  const [certificateValidUntil, setCertificateValidUntil] = useState('2027-12-31');
  const [changeReason, setChangeReason] = useState('');
  const [currentVersion, setCurrentVersion] = useState<number>(1);

  useEffect(() => {
    loadCompanyProfile();
  }, []);

  const loadCompanyProfile = async () => {
    try {
      setProfileLoading(true);
      const data = await companyProfileApi.getActiveProfile();
      if (data) {
        setCurrentVersion(data.version || 1);
        if (data.legalName) setLegalName(data.legalName);
        if (data.taxId) setTaxId(data.taxId);
        if (data.registeredAddress) setRegisteredAddress(data.registeredAddress);
        if (data.businessRegistrationNumber) setBusinessRegistrationNumber(data.businessRegistrationNumber);
        if (data.representativeName) setRepresentativeName(data.representativeName);
        if (data.representativeTitle) setRepresentativeTitle(data.representativeTitle);
        if (data.contactEmail) setContactEmail(data.contactEmail);
        if (data.contactPhone) setContactPhone(data.contactPhone);
        if (data.bankName) setBankName(data.bankName);
        if (data.bankAccountNumber) setBankAccountNumber(data.bankAccountNumber);
        if (data.bankAccountHolder) setBankAccountHolder(data.bankAccountHolder);
        if (data.companyLogo) setCompanyLogo(data.companyLogo);

        if (data.signatoryConfig) {
          if (data.signatoryConfig.signerName) setSignerName(data.signatoryConfig.signerName);
          if (data.signatoryConfig.signerTitle) setSignerTitle(data.signatoryConfig.signerTitle);
          if (data.signatoryConfig.signerEmail) setSignerEmail(data.signatoryConfig.signerEmail);
          if (data.signatoryConfig.digitalCertificateProvider) setCertProvider(data.signatoryConfig.digitalCertificateProvider);
          if (data.signatoryConfig.certificateSerialNumber) setCertSerial(data.signatoryConfig.certificateSerialNumber);
          if (data.signatoryConfig.autoCounterSignEnabled !== undefined) setAutoCounterSign(data.signatoryConfig.autoCounterSignEnabled);
          if (data.signatoryConfig.signatureImageUrl) setSignatureImageUrl(data.signatoryConfig.signatureImageUrl);
          if (data.signatoryConfig.companySealUrl) setCompanySealUrl(data.signatoryConfig.companySealUrl);
          if (data.signatoryConfig.signatureType) setSignatureType(data.signatoryConfig.signatureType as any);
          if (data.signatoryConfig.stampPosition) setStampPosition(data.signatoryConfig.stampPosition as any);
          if (data.signatoryConfig.signingMethod) setSigningMethod(data.signatoryConfig.signingMethod as any);
          if (data.signatoryConfig.certificateStatus) setCertificateStatus(data.signatoryConfig.certificateStatus);
          if (data.signatoryConfig.certificateValidUntil) setCertificateValidUntil(data.signatoryConfig.certificateValidUntil);
        }
      }
    } catch (err: any) {
      console.warn('Could not load company profile from API, using default values', err);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleFetchVersions = async () => {
    try {
      const list = await companyProfileApi.getProfileVersions();
      setVersions(list || []);
      setShowVersionHistory(true);
    } catch (err) {
      console.error('Failed to load version history:', err);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate mandatory fields
    if (!legalName.trim() || !taxId.trim() || !registeredAddress.trim()) {
      setErrorMessage('Company Name, Tax ID, and Registered Address are mandatory.');
      return;
    }
    if (!representativeName.trim() || !representativeTitle.trim() || !contactEmail.trim()) {
      setErrorMessage('Legal Representative, Title, and Contact Email are required.');
      return;
    }
    if (/^[a-z0-9_-]{3,24}$/.test(representativeName.trim().toLowerCase()) && !representativeName.includes(' ')) {
      setErrorMessage('Representative name cannot be an account handle or login username.');
      return;
    }

    try {
      setIsSavingProfile(true);
      const updated = await companyProfileApi.updateProfile({
        legalName: legalName.trim(),
        taxId: taxId.trim(),
        registeredAddress: registeredAddress.trim(),
        businessRegistrationNumber: businessRegistrationNumber.trim() || taxId.trim(),
        representativeName: representativeName.trim(),
        representativeTitle: representativeTitle.trim(),
        contactEmail: contactEmail.trim(),
        contactPhone: contactPhone.trim(),
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountHolder: bankAccountHolder.trim(),
        companyLogo: companyLogo.trim(),
        signatoryConfig: {
          signerName: signerName.trim(),
          signerTitle: signerTitle.trim(),
          signerEmail: signerEmail.trim(),
          digitalCertificateProvider: certProvider.trim(),
          certificateSerialNumber: certSerial.trim(),
          autoCounterSignEnabled: autoCounterSign,
          signatureImageUrl,
          companySealUrl,
          signatureType,
          stampPosition,
          signingMethod,
          certificateStatus,
          certificateValidUntil,
        },
        changeReason: changeReason.trim() || `Administrative profile update`,
      });

      setCurrentVersion(updated.version);
      setChangeReason('');
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err: any) {
      const resData = err?.response?.data;
      let msg = '';
      if (Array.isArray(resData?.details) && resData.details.length > 0) {
        msg = resData.details.join('; ');
      } else if (resData?.message) {
        msg = resData.message;
      } else if (err?.message) {
        msg = err.message;
      } else {
        msg = 'Failed to update company legal profile.';
      }
      setErrorMessage(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Compute primary/default bank account for compact card
  const defaultAccount =
    bankAccountsData?.items?.find((a) => a.isDefault) || bankAccountsData?.items?.[0];
  const totalBankAccounts =
    bankAccountsData?.pagination?.total ?? bankAccountsData?.items?.length ?? 0;

  return (
    <div className="w-full space-y-6">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold text-[#17263A] tracking-tight">
            Company Profile
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleFetchVersions}
            className="h-10 px-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#17263A] bg-white border border-[#DCE3EC] hover:bg-[#F4F7FB] hover:border-[#B8C7D9] rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <History className="w-3.5 h-3.5 text-[#8491A3]" />
            <span>Version History</span>
          </button>

          <button
            type="submit"
            form="company-profile-form"
            disabled={isSavingProfile}
            className="h-10 px-4 inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#244A70] hover:bg-[#244A70] active:bg-[#1B3856] rounded-lg shadow-xs transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isSavingProfile ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Profile...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Company legal profile successfully updated.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2.5 shadow-2xs">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 2. Main Content Form — 2-Column Balanced Layout */}
      <form id="company-profile-form" onSubmit={handleSave}>
        {profileLoading ? (
          <div className="p-12 text-center bg-white border border-[#DCE3EC] rounded-xl text-xs text-[#8491A3] flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-[#244A70]" />
            <span className="font-medium">Loading company legal profile from database...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Column 1 (Left): Legal & Corporate Identification + Compact Bank Account Card */}
            <div className="space-y-6">
              {/* Card 1: Legal & Corporate Identification */}
              <Card className="p-6 bg-white border border-[#DCE3EC] rounded-xl shadow-xs space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#DCE3EC]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#EEF1F6] text-[#244A70]">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#17263A]">
                        Legal & Corporate Identification
                      </h3>
                      <p className="text-[11px] text-[#8491A3] mt-0.5">
                        Authoritative legal entity information snapshot into customer contracts and commercial invoices.
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-[#EEF1F6] text-[#244A70] border border-[#244A70]/20">
                    Version {currentVersion} (Active)
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                      Legal Company Name <span className="text-red-500">*</span>
                    </label>
                    <Input
                      className="h-10 text-xs sm:text-sm"
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="e.g. ALSM SOFTWARE MODERNIZATION TECHNOLOGY JOINT STOCK COMPANY"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                        Tax ID (MST) <span className="text-red-500">*</span>
                      </label>
                      <Input
                        className="h-10 text-xs sm:text-sm"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="e.g. 0110892345"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                        Business Registration Number
                      </label>
                      <Input
                        className="h-10 text-xs sm:text-sm"
                        value={businessRegistrationNumber}
                        onChange={(e) => setBusinessRegistrationNumber(e.target.value)}
                        placeholder="e.g. 0110892345"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                      Registered Headquarters Address <span className="text-red-500">*</span>
                    </label>
                    <Input
                      className="h-10 text-xs sm:text-sm"
                      value={registeredAddress}
                      onChange={(e) => setRegisteredAddress(e.target.value)}
                      placeholder="Full registered enterprise address"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                      Company Logo URI / Asset Path
                    </label>
                    <Input
                      className="h-10 text-xs sm:text-sm"
                      value={companyLogo}
                      onChange={(e) => setCompanyLogo(e.target.value)}
                      placeholder="/assets/logo.png"
                    />
                  </div>
                </div>
              </Card>

              {/* Card 2 (Left): Compact Bank Accounts Summary Card (Click to View Full Details) */}
              <Card className="p-6 bg-white border border-[#DCE3EC] rounded-xl shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#DCE3EC]">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-[#EEF1F6] text-[#244A70]">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#17263A]">
                        Settlement Bank Accounts
                      </h3>
                      <p className="text-[11px] text-[#8491A3] mt-0.5">
                        Enterprise bank accounts for customer invoice receipts & contract settlements.
                      </p>
                    </div>
                  </div>
                </div>

                {isLoadingBankAccounts ? (
                  <div className="py-6 flex items-center justify-center gap-2 text-xs text-[#8491A3]">
                    <Loader2 className="w-4 h-4 animate-spin text-[#244A70]" />
                    <span>Loading bank account specifications...</span>
                  </div>
                ) : defaultAccount ? (
                  <div className="space-y-3">
                    <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-[#DCE3EC] flex items-center justify-center text-[#244A70] shadow-2xs shrink-0">
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[#17263A]">
                              {defaultAccount.bankName}
                            </span>
                            {defaultAccount.bin && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#EEF1F6] text-[#8491A3]">
                                BIN: {defaultAccount.bin}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#8491A3] mt-0.5">
                            {defaultAccount.accountHolderName}
                          </p>
                          <p className="text-xs font-mono font-semibold text-[#17263A] mt-0.5">
                            {defaultAccount.accountNumberMasked}
                          </p>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Default Receiving
                        </span>
                        <span className="text-[11px] font-semibold text-[#8491A3]">
                          {defaultAccount.currency || 'VND'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#8491A3] px-1">
                      <span>
                        Configured: <strong className="text-[#17263A]">{totalBankAccounts}</strong> bank accounts
                      </span>
                      <Link
                        to="/admin/bank-accounts"
                        className="text-[#244A70] font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        Manage all accounts
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[#8491A3] space-y-2">
                    <p>No beneficiary bank accounts configured yet.</p>
                    <Link
                      to="/admin/bank-accounts"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#244A70] hover:underline"
                    >
                      Add first bank account
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </Card>
            </div>

            {/* Column 2 (Right): Legal Representation & Signatory */}
            <div className="space-y-6">
              {/* Card 2: Legal Representation & Official Notices */}
              <Card className="p-6 bg-white border border-[#DCE3EC] rounded-xl shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCE3EC]">
                  <div className="p-2 rounded-lg bg-[#EEF1F6] text-[#244A70]">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#17263A]">
                      Legal Representation & Official Notices
                    </h3>
                    <p className="text-[11px] text-[#8491A3] mt-0.5">
                      Statutory representative and formal contractual notice contact channel.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                        Legal Representative Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        className="h-10 text-xs sm:text-sm"
                        value={representativeName}
                        onChange={(e) => setRepresentativeName(e.target.value)}
                        placeholder="Full personal legal name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                        Representative Title / Position <span className="text-red-500">*</span>
                      </label>
                      <Input
                        className="h-10 text-xs sm:text-sm"
                        value={representativeTitle}
                        onChange={(e) => setRepresentativeTitle(e.target.value)}
                        placeholder="e.g. General Director"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                        Official Contract Notice Email <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        className="h-10 text-xs sm:text-sm"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="contracts@alsm.io"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                        Contact Phone Number
                      </label>
                      <Input
                        className="h-10 text-xs sm:text-sm"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+84 24 7300 8899"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Card 3: Contract Signatory & Cryptographic Assurance */}
              <Card className="p-6 bg-white border border-[#DCE3EC] rounded-xl shadow-xs space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-[#DCE3EC]">
                  <div className="p-2 rounded-lg bg-[#EEF1F6] text-[#244A70]">
                    <FileSignature className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[#17263A]">
                      Contract Signatory & Cryptographic Assurance
                    </h3>
                    <p className="text-[11px] text-[#8491A3] mt-0.5">
                      Authorized digital certificate parameters for automated counter-signature stamping.
                    </p>
                  </div>
                </div>

                <div className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                        Designated Signer Full Name <span className="text-red-500">*</span>
                      </label>
                      <Input
                        className="h-10 text-xs sm:text-sm"
                        value={signerName}
                        onChange={(e) => setSignerName(e.target.value)}
                        placeholder="Signatory personal name"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                        Signer Title <span className="text-red-500">*</span>
                      </label>
                      <Input
                        className="h-10 text-xs sm:text-sm"
                        value={signerTitle}
                        onChange={(e) => setSignerTitle(e.target.value)}
                        placeholder="Signatory corporate title"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                        Signer Email <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="email"
                        className="h-10 text-xs sm:text-sm"
                        value={signerEmail}
                        onChange={(e) => setSignerEmail(e.target.value)}
                        placeholder="signer@alsm.io"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                        CA Provider
                      </label>
                      <Input
                        className="h-10 text-xs sm:text-sm"
                        value={certProvider}
                        onChange={(e) => setCertProvider(e.target.value)}
                        placeholder="e.g. VNPT-CA, VIETTEL-CA"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                      Certificate Serial Number
                    </label>
                    <Input
                      className="h-10 text-xs sm:text-sm"
                      value={certSerial}
                      onChange={(e) => setCertSerial(e.target.value)}
                      placeholder="e.g. VNPT-ECA-ALSM-01"
                    />
                  </div>

                  <div className="p-3 bg-[#F8FAFC] border border-[#DCE3EC] rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoCounterSign}
                        onChange={(e) => setAutoCounterSign(e.target.checked)}
                        className="w-4 h-4 rounded text-[#244A70] focus:ring-[#244A70] cursor-pointer"
                      />
                      <div>
                        <span className="font-semibold text-[#17263A] block">
                          Automatic Digital Counter-Signature
                        </span>
                        <span className="text-[11px] text-[#8491A3] block">
                          Automatically seal and countersign executed agreements upon customer digital sign-off.
                        </span>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#8491A3] uppercase tracking-wider mb-1.5">
                      Audit Change Reason
                    </label>
                    <Input
                      className="h-10 text-xs sm:text-sm"
                      value={changeReason}
                      onChange={(e) => setChangeReason(e.target.value)}
                      placeholder="e.g. Updated corporate legal representative or headquarters address"
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Full-width Section: Company Digital Signature & Stamp */}
            <div className="lg:col-span-2">
              <CompanyDigitalSignatureSection
                signerName={signerName}
                signerTitle={signerTitle}
                signerEmail={signerEmail}
                companyName={legalName}
                certProvider={certProvider}
                certSerial={certSerial}
                signatureImageUrl={signatureImageUrl}
                setSignatureImageUrl={setSignatureImageUrl}
                companySealUrl={companySealUrl}
                setCompanySealUrl={setCompanySealUrl}
                signatureType={signatureType}
                setSignatureType={setSignatureType}
                stampPosition={stampPosition}
                setStampPosition={setStampPosition}
                signingMethod={signingMethod}
                setSigningMethod={setSigningMethod}
                certificateStatus={certificateStatus}
                certificateValidUntil={certificateValidUntil}
              />
            </div>
          </div>
        )}
      </form>

      {/* 3. Sleek Version History Modal */}
      {showVersionHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-[#DCE3EC] max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE3EC] bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-[#EEF1F6] text-[#244A70]">
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#17263A]">
                    Company Legal Profile Version Trail
                  </h4>
                  <p className="text-[11px] text-[#8491A3]">
                    Immutable audit records preserved in database for legal non-repudiation.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVersionHistory(false)}
                className="p-1 rounded-md text-[#8491A3] hover:text-[#17263A] hover:bg-[#DCE3EC] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
              {versions.length === 0 ? (
                <div className="py-8 text-center text-xs text-[#8491A3]">
                  No historical revisions recorded in the database.
                </div>
              ) : (
                versions.map((ver) => (
                  <div
                    key={ver._id || ver.version}
                    className={`p-4 rounded-xl border transition-colors ${
                      ver.isActive
                        ? 'bg-[#EEF1F6]/40 border-[#244A70]/40'
                        : 'bg-white border-[#DCE3EC] hover:border-[#B8C7D9]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#17263A]">
                          Version {ver.version}
                        </span>
                        {ver.isActive && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#244A70] text-white">
                            Active
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#8491A3] font-mono">
                        {ver.updatedAt ? new Date(ver.updatedAt).toLocaleString() : 'Canonical'}
                      </span>
                    </div>
                    <p className="text-xs text-[#17263A] font-medium">{ver.legalName}</p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#8491A3] mt-1">
                      <span>MST: <strong className="text-[#17263A]">{ver.taxId}</strong></span>
                      <span>Representative: <strong className="text-[#17263A]">{ver.representativeName}</strong></span>
                      {ver.signatoryConfig?.signerName && (
                        <span>Signer: <strong className="text-[#17263A]">{ver.signatoryConfig.signerName}</strong></span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8491A3] mt-2 pt-2 border-t border-[#DCE3EC]/60 italic">
                      Change Reason: {ver.changeReason || 'System default configuration'}
                    </p>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end px-6 py-3.5 bg-[#F8FAFC] border-t border-[#DCE3EC]">
              <button
                type="button"
                onClick={() => setShowVersionHistory(false)}
                className="px-4 py-2 text-xs font-semibold text-[#17263A] bg-white border border-[#DCE3EC] hover:bg-[#F4F7FB] rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
