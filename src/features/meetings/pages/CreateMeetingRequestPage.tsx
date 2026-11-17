import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Mail,
  Phone,
  User,
  Calendar,
  ShieldCheck,
  Server,
  AlertCircle,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Sparkles,
  UserCheck,
  Briefcase,
  Users,
  Clock,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Badge } from '@/shared/ui/Badge';
import { useNavigation } from '@/context/NavigationContext';
import { meetingRequestsApi } from '../api/meeting-requests.api';
import { crmApi } from '@/features/crm/api/crm.api';
import { partnersApi } from '@/features/partners/api/partners.api';
import { adminApi } from '@/features/admin/api/admin.api';
import type {
  ConsultationType,
  CreateMeetingRequestPayload,
  CustomerType,
  MeetingPriority,
} from '../types/meeting-request';

interface CustomerAccountItem {
  id: string;
  companyName: string;
  fullName: string;
  email: string;
  phone?: string;
  customerType: CustomerType;
  industry?: string;
}

const RELATIONSHIP_TIERS: Record<CustomerType, {
  label: string;
  badge: string;
  badgeClass: string;
  subtitle: string;
  sla: string;
  description: string;
  benefits: string[];
}> = {
  PROSPECT: {
    label: 'New Prospect',
    badge: 'Discovery Tier',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    subtitle: 'Lead Qualification & Discovery',
    sla: 'Standard SLA (24h response)',
    description: 'Initial consultation to assess modernization feasibility, technical scope, and project sizing.',
    benefits: ['Architecture feasibility review', 'Estimated timeline & sizing', 'Non-binding modernization assessment'],
  },
  EXISTING_CUSTOMER: {
    label: 'Existing Customer',
    badge: 'Enterprise Tier',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    subtitle: 'Enterprise Production Client',
    sla: 'Expedited SLA (4h response)',
    description: 'Active client account review, production conversion queue expansion, and new phase contract additions.',
    benefits: ['Dedicated modernization team lead', 'Direct pipeline resource reservation', 'Fast-tracked delivery kickoff'],
  },
  PARTNER: {
    label: 'Strategic Partner',
    badge: 'Partner Network',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    subtitle: 'Certified Solution Partner',
    sla: 'Priority VIP (Immediate triage)',
    description: 'Joint solution delivery, co-sell opportunity review, and technical partner enablement.',
    benefits: ['Joint delivery margin alignment', 'Shared workspace authorization', 'Co-branded customer collateral'],
  },
};

export const CreateMeetingRequestPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { setCustomBreadcrumbs } = useNavigation();

  // Extract query params & location state (e.g. passed when scheduling from CRM Lead)
  const locState = (location.state as any) || {};
  const queryLeadId = searchParams.get('leadId') || locState.leadId || '';
  const queryCompanyName = searchParams.get('companyName') || locState.companyName || '';
  const queryFullName = searchParams.get('fullName') || locState.fullName || locState.contactName || '';
  const queryEmail = searchParams.get('email') || locState.email || '';
  const queryPhone = searchParams.get('phone') || locState.phone || '';
  const queryCustomerType = (searchParams.get('customerType') || locState.customerType || 'PROSPECT') as CustomerType;
  const queryTopic = searchParams.get('topic') || locState.topic || '';
  const queryRequirements = searchParams.get('businessRequirements') || locState.businessRequirements || '';

  // Breadcrumb integration
  useEffect(() => {
    setCustomBreadcrumbs([
      { label: 'Meeting Requests', path: '/sales/meeting-requests' },
      { label: 'New Consultation Request' },
    ]);
    return () => {
      setCustomBreadcrumbs(null);
    };
  }, [setCustomBreadcrumbs]);

  // Form State
  const [fullName, setFullName] = useState(queryFullName);
  const [companyName, setCompanyName] = useState(queryCompanyName);
  const [email, setEmail] = useState(queryEmail);
  const [phone, setPhone] = useState(queryPhone);
  const [customerType, setCustomerType] = useState<CustomerType>(
    queryCustomerType === 'EXISTING_CUSTOMER' || queryCustomerType === 'PARTNER' ? queryCustomerType : 'PROSPECT'
  );

  // Directory & Account selection state
  const [accountRoster, setAccountRoster] = useState<CustomerAccountItem[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState<boolean>(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    queryLeadId ? (queryLeadId.startsWith('lead-') ? queryLeadId : `lead-${queryLeadId}`) : ''
  );
  const [accountSearchTerm, setAccountSearchTerm] = useState<string>('');
  const [relationshipTypeFilter, setRelationshipTypeFilter] = useState<string>('ALL');
  const [accountPage, setAccountPage] = useState<number>(1);
  const [accountPageSize, setAccountPageSize] = useState<number>(5);

  // Auto-fetch lead if ID is provided but details are missing
  useEffect(() => {
    if (queryLeadId && (!queryCompanyName || !queryEmail)) {
      const rawId = queryLeadId.replace(/^lead-/, '');
      crmApi.getLeadById(rawId).then((ld) => {
        if (ld) {
          const comp = ld.companyName || ld.company || '';
          const name = ld.contactName || '';
          const mail = ld.email || '';
          const ph = ld.phone || '';
          const cType: CustomerType = ld.stage === 'WON' ? 'EXISTING_CUSTOMER' : 'PROSPECT';
          setCompanyName((prev: string) => prev || comp);
          setFullName((prev: string) => prev || name);
          setEmail((prev: string) => prev || mail);
          setPhone((prev: string) => prev || ph);
          setCustomerType(cType);
          setSelectedAccountId(`lead-${ld.id}`);
          setTopic((prev: string) => prev || `Modernization Consultation - ${comp || name}`);
          if (ld.notes) {
            setBusinessRequirements((prev: string) => prev || ld.notes || '');
          }
        }
      }).catch(() => {});
    }
  }, [queryLeadId, queryCompanyName, queryEmail]);

  // Fetch accounts across leads, partners, and organizations on mount
  useEffect(() => {
    let isMounted = true;
    const fetchAccounts = async () => {
      try {
        setLoadingAccounts(true);
        const [leadsRes, partnersRes, orgsRes] = await Promise.allSettled([
          crmApi.getLeads().catch(() => []),
          partnersApi.getPartners().catch(() => []),
          adminApi.getOrganizations().catch(() => []),
        ]);

        const items: CustomerAccountItem[] = [];

        // 1. Leads -> Prospects / Existing
        if (leadsRes.status === 'fulfilled' && Array.isArray(leadsRes.value)) {
          leadsRes.value.forEach((l) => {
            const comp = l.companyName || l.company;
            if (comp) {
              items.push({
                id: `lead-${l.id}`,
                companyName: comp,
                fullName: l.contactName || (l as any).contactPerson || 'Lead Representative',
                email: l.email || 'lead@enterprise.com',
                phone: l.phone || '+84 901 234 567',
                customerType: l.stage === 'WON' ? 'EXISTING_CUSTOMER' : 'PROSPECT',
                industry: (l as any).industry || 'Banking & Finance',
              });
            }
          });
        }

        // 2. Existing Orgs -> Existing Customer
        if (orgsRes.status === 'fulfilled' && Array.isArray(orgsRes.value)) {
          orgsRes.value.forEach((org) => {
            if (org.name) {
              items.push({
                id: `org-${org.id}`,
                companyName: org.name,
                fullName: org.contactEmail ? org.contactEmail.split('@')[0] : 'Enterprise Account Lead',
                email: org.contactEmail || `contact@${(org as any).code?.toLowerCase() || 'enterprise'}.com`,
                phone: (org as any).contactPhone || '+84 902 345 678',
                customerType: 'EXISTING_CUSTOMER',
                industry: 'Core Enterprise Services',
              });
            }
          });
        }

        // 3. Partners -> Strategic Partner
        if (partnersRes.status === 'fulfilled' && Array.isArray(partnersRes.value)) {
          partnersRes.value.forEach((p) => {
            if (p.name) {
              items.push({
                id: `partner-${p.id}`,
                companyName: p.name,
                fullName: (p as any).contactPerson || (p as any).representative || 'Partner Coordinator',
                email: (p as any).email || (p as any).contactEmail || 'partner@alsm-network.com',
                phone: (p as any).phone || '+84 903 456 789',
                customerType: 'PARTNER',
                industry: 'Systems Integrator & SI',
              });
            }
          });
        }

        // If a prefilled lead was passed via navigation/URL, ensure it is selected and in items
        if (queryCompanyName || queryLeadId) {
          const targetId = queryLeadId ? (queryLeadId.startsWith('lead-') ? queryLeadId : `lead-${queryLeadId}`) : `lead-${Date.now()}`;
          const existing = items.find((it) => it.id === targetId || (queryCompanyName && it.companyName.toLowerCase() === queryCompanyName.toLowerCase()));
          if (existing) {
            if (queryFullName) existing.fullName = queryFullName;
            if (queryEmail) existing.email = queryEmail;
            if (queryPhone) existing.phone = queryPhone;
            if (queryCustomerType) existing.customerType = queryCustomerType;
            setSelectedAccountId(existing.id);
          } else if (queryCompanyName) {
            items.unshift({
              id: targetId,
              companyName: queryCompanyName,
              fullName: queryFullName || 'Lead Representative',
              email: queryEmail || 'contact@enterprise.com',
              phone: queryPhone || '+84 901 234 567',
              customerType: queryCustomerType,
              industry: 'Core Enterprise Modernization',
            });
            setSelectedAccountId(targetId);
          }
        }

        // 4. Default high-quality sample enterprise accounts if API list is empty
        if (items.length === 0) {
          items.push(
            {
              id: 'acc-01',
              companyName: 'Vietcombank Enterprise',
              fullName: 'Nguyen Van A',
              email: 'a.nguyen@vietcombank.com.vn',
              phone: '+84 901 234 567',
              customerType: 'EXISTING_CUSTOMER',
              industry: 'Banking & Financial Services',
            },
            {
              id: 'acc-02',
              companyName: 'Fintech Global Corp',
              fullName: 'David Chen',
              email: 'd.chen@fintechglobal.io',
              phone: '+84 902 345 678',
              customerType: 'PROSPECT',
              industry: 'Digital Payments',
            },
            {
              id: 'acc-03',
              companyName: 'Nexus Cloud Technologies',
              fullName: 'Sarah Jenkins',
              email: 's.jenkins@nexustech.com',
              phone: '+84 903 456 789',
              customerType: 'PARTNER',
              industry: 'Cloud Migration SI',
            },
          );
        }

        if (isMounted) setAccountRoster(items);
      } finally {
        if (isMounted) setLoadingAccounts(false);
      }
    };

    fetchAccounts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter accounts
  const filteredAccounts = useMemo(() => {
    return accountRoster.filter((acc) => {
      if (relationshipTypeFilter !== 'ALL' && acc.customerType !== relationshipTypeFilter) {
        return false;
      }
      if (accountSearchTerm.trim()) {
        const q = accountSearchTerm.toLowerCase();
        const matchesComp = acc.companyName.toLowerCase().includes(q);
        const matchesName = acc.fullName.toLowerCase().includes(q);
        const matchesEmail = acc.email.toLowerCase().includes(q);
        const matchesPhone = (acc.phone || '').toLowerCase().includes(q);
        const matchesInd = (acc.industry || '').toLowerCase().includes(q);
        if (!matchesComp && !matchesName && !matchesEmail && !matchesPhone && !matchesInd) {
          return false;
        }
      }
      return true;
    });
  }, [accountRoster, relationshipTypeFilter, accountSearchTerm]);

  useEffect(() => {
    setAccountPage(1);
  }, [accountSearchTerm, relationshipTypeFilter, accountPageSize]);

  const totalAccountPages = Math.max(1, Math.ceil(filteredAccounts.length / accountPageSize));
  const accountStartIndex = (accountPage - 1) * accountPageSize;
  const accountEndIndex = Math.min(accountStartIndex + accountPageSize, filteredAccounts.length);
  const paginatedAccounts = filteredAccounts.slice(accountStartIndex, accountEndIndex);

  const selectedAccount = useMemo(() => {
    return accountRoster.find((a) => a.id === selectedAccountId) || null;
  }, [accountRoster, selectedAccountId]);

  const handleSelectAccount = (account: CustomerAccountItem) => {
    setSelectedAccountId(account.id);
    setCustomerType(account.customerType);
    setCompanyName(account.companyName);
    setFullName(account.fullName);
    setEmail(account.email);
    if (account.phone) setPhone(account.phone);
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy.fullName;
      delete copy.companyName;
      delete copy.email;
      return copy;
    });
  };

  const [topic, setTopic] = useState(
    queryTopic || (queryCompanyName ? `Modernization Consultation - ${queryCompanyName}` : '')
  );
  const [consultationType, setConsultationType] = useState<ConsultationType>('SALES_SERVICE');
  const [priority, setPriority] = useState<MeetingPriority>('MEDIUM');
  const [requestedDate, setRequestedDate] = useState('');
  const [requestedTime, setRequestedTime] = useState('');

  const [legacySystemType, setLegacySystemType] = useState('IBM 3270 BMS');
  const [estimatedScreens, setEstimatedScreens] = useState<number>(50);
  const [estimatedPrograms, setEstimatedPrograms] = useState<number>(10);
  const [estimatedProjectScale, setEstimatedProjectScale] = useState<'SMALL' | 'MEDIUM' | 'LARGE' | 'ENTERPRISE'>('MEDIUM');
  const [expectedTimeline, setExpectedTimeline] = useState('Q1 2027');
  const [businessRequirements, setBusinessRequirements] = useState(queryRequirements);

  // UI State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!fullName.trim()) errs.fullName = 'Full Name is required';
    if (!companyName.trim()) errs.companyName = 'Company / Organization is required';
    if (!email.trim()) {
      errs.email = 'Email Address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Please provide a valid email address';
    }
    if (!topic.trim()) errs.topic = 'Meeting Topic is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const payload: CreateMeetingRequestPayload = {
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        customerType,
        topic: topic.trim(),
        consultationType,
        priority,
        serviceMode: 'ALSM_MANAGED',
        legacySystemType,
        estimatedScreens: Number(estimatedScreens) || 0,
        estimatedPrograms: Number(estimatedPrograms) || 0,
        estimatedProjectScale,
        expectedTimeline: expectedTimeline.trim() || undefined,
        businessRequirements: businessRequirements.trim() || undefined,
        requestedDate: requestedDate || undefined,
        requestedTime: requestedTime || undefined,
      };

      await meetingRequestsApi.createMeetingRequest(payload);
      navigate('/sales/meeting-requests');
    } catch (err: any) {
      setSubmitError(err?.response?.data?.message || err?.message || 'Failed to submit consultation request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <div className="flex items-center gap-2">

          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17263A] mt-1">
            New Consultation & Meeting Request
          </h1>
        </div>

      </div>

      {Boolean(queryCompanyName || queryLeadId) && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 shadow-2xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Pre-filled from CRM Lead: <strong>{companyName || queryCompanyName}</strong> ({fullName || queryFullName})
            </span>
          </div>
          <span className="text-[11px] font-semibold text-blue-700 bg-white/80 px-2 py-0.5 rounded border border-blue-200">
            Auto-populated from Lead
          </span>
        </div>
      )}

      {submitError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 shadow-2xs">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-rose-600" />
          <span className="font-medium">{submitError}</span>
        </div>
      )}

      {/* Main Content: 2-Column Responsive Layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Form Cards (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Customer Profile */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl p-6">
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF1F6] flex items-center justify-center text-[#244A70]">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#17263A]">1. Customer & Enterprise Profile</h2>
                      <p className="text-xs text-[#8491A3]">Primary client contact, corporate relationship tier, and account directory</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${RELATIONSHIP_TIERS[customerType].badgeClass}`}>
                    {RELATIONSHIP_TIERS[customerType].label} • {RELATIONSHIP_TIERS[customerType].badge}
                  </span>
                </div>

                {/* ── Section A: Customer Relationship Type Interactive Cards ── */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="customer-relationship-select"
                      className="text-xs font-bold text-[#17263A] uppercase tracking-wider block"
                    >
                      Customer Relationship Type *
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Select an engagement tier to view SLA & privileges
                    </span>
                  </div>

                  {/* Accessible Select / Combobox for Fast Access & Automation */}
                  <div>
                    <select
                      id="customer-relationship-select"
                      aria-label="Customer Relationship Type"
                      value={customerType}
                      onChange={(e) => setCustomerType(e.target.value as CustomerType)}
                      className="w-full px-3.5 py-2.5 text-xs bg-[#F8FAFC] border border-[#DCE3EC] rounded-xl outline-none focus:bg-white focus:border-[#244A70] focus:ring-1 focus:ring-[#244A70] text-[#17263A] font-medium"
                    >
                      <option value="PROSPECT">New Prospect (Lead Qualification & Discovery)</option>
                      <option value="EXISTING_CUSTOMER">Existing Enterprise Customer (Active Production Client)</option>
                      <option value="PARTNER">Strategic Partner (Certified Solution Partner)</option>
                    </select>
                  </div>

                  {/* 3 Interactive Tier Selection Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                    {(['PROSPECT', 'EXISTING_CUSTOMER', 'PARTNER'] as CustomerType[]).map((tierKey) => {
                      const tier = RELATIONSHIP_TIERS[tierKey];
                      const isSelected = customerType === tierKey;
                      const Icon = tierKey === 'PROSPECT' ? Sparkles : tierKey === 'EXISTING_CUSTOMER' ? Building2 : ShieldCheck;

                      return (
                        <div
                          key={tierKey}
                          onClick={() => setCustomerType(tierKey)}
                          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-blue-50/70 border-[#244A70] ring-1 ring-[#244A70] shadow-xs'
                              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                  isSelected ? 'bg-[#244A70] text-white' : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <Icon className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="font-bold text-xs text-[#17263A]">{tier.label}</div>
                                <div className="text-[10px] text-slate-500 font-medium">{tier.subtitle}</div>
                              </div>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${tier.badgeClass}`}>
                              {tier.badge}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 mt-2.5 leading-relaxed line-clamp-2">
                            {tier.description}
                          </p>

                          <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                            <span className="font-medium text-slate-500">{tier.sla}</span>
                            {isSelected && (
                              <span className="font-bold text-[#244A70] flex items-center gap-0.5">
                                <Check className="w-3 h-3 stroke-[3]" /> Active
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── Section B: Registered Enterprise Accounts & Leads Directory ── */}
                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#244A70]" />
                      <label className="text-xs font-bold text-[#17263A] uppercase tracking-wider block">
                        Registered Accounts Directory (Auto-Fill)
                      </label>
                    </div>
                    {selectedAccount && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Account Selected: {selectedAccount.companyName}
                      </span>
                    )}
                  </div>

                  {/* Filter Toolbar for Directory */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      {/* Search Box */}
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0" />
                        <input
                          type="text"
                          value={accountSearchTerm}
                          onChange={(e) => setAccountSearchTerm(e.target.value)}
                          placeholder="Search account by company, contact person, email, or domain..."
                          className="w-full h-8 pl-9 pr-8 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-[#244A70] text-[#17263A]"
                        />
                        {accountSearchTerm && (
                          <button
                            type="button"
                            onClick={() => setAccountSearchTerm('')}
                            className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Relationship Type Filter */}
                      <div>
                        <select
                          value={relationshipTypeFilter}
                          onChange={(e) => setRelationshipTypeFilter(e.target.value)}
                          className="w-full sm:w-auto px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg outline-none text-[#17263A]"
                        >
                          <option value="ALL">All Relationship Types</option>
                          <option value="PROSPECT">Prospects / Leads</option>
                          <option value="EXISTING_CUSTOMER">Existing Customers</option>
                          <option value="PARTNER">Strategic Partners</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Directory Table and Dossier Panel Grid */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
                    {/* Accounts Table (8 cols on xl) */}
                    <div className="xl:col-span-8 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                      <div className="px-3.5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                        <span className="font-bold text-[#17263A] flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 text-[#244A70]" />
                          <span>Enterprise Accounts & Leads Roster</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-[#244A70] border border-blue-200">
                            {filteredAccounts.length} Accounts
                          </span>
                          {loadingAccounts && (
                            <span className="text-[11px] text-blue-600 flex items-center gap-1 font-medium ml-1">
                              <Clock className="w-3 h-3 animate-spin" /> Loading...
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] text-slate-500">Click to autofill contact profile</span>
                      </div>

                      {filteredAccounts.length === 0 ? (
                        <div className="p-6 text-center text-slate-500 text-xs space-y-1">
                          <Building2 className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                          <p className="font-semibold text-slate-700">No registered accounts match the selected criteria.</p>
                          <p className="text-[11px]">You can manually type customer details below or clear search.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead className="bg-[#F8FAFC] text-[#8491A3] font-bold text-[10px] uppercase tracking-wider border-b border-[#DCE3EC]">
                              <tr>
                                <th className="py-2.5 px-3">Account / Company</th>
                                <th className="py-2.5 px-2">Relationship Type</th>
                                <th className="py-2.5 px-2">Contact Details</th>
                                <th className="py-2.5 px-2">Industry</th>
                                <th className="py-2.5 px-3 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#DCE3EC]">
                              {paginatedAccounts.map((acc) => {
                                const isSelected = selectedAccountId === acc.id;
                                const tier = RELATIONSHIP_TIERS[acc.customerType];

                                return (
                                  <tr
                                    key={acc.id}
                                    data-testid={`account-row-${acc.id}`}
                                    onClick={() => handleSelectAccount(acc)}
                                    className={`cursor-pointer transition-colors ${
                                      isSelected
                                        ? 'bg-blue-50/70 border-l-4 border-l-[#244A70]'
                                        : 'hover:bg-slate-50'
                                    }`}
                                  >
                                    {/* Company & Contact */}
                                    <td className="py-2.5 px-3">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[11px] uppercase shrink-0 ${
                                            isSelected ? 'bg-[#244A70] text-white' : 'bg-slate-200 text-slate-700'
                                          }`}
                                        >
                                          {acc.companyName.charAt(0)}
                                        </div>
                                        <div>
                                          <div className="font-bold text-[#17263A] text-xs leading-tight">{acc.companyName}</div>
                                          <div className="text-[10px] text-[#8491A3]">{acc.fullName}</div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Relationship Tier Badge */}
                                    <td className="py-2.5 px-2">
                                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tier.badgeClass}`}>
                                        {tier.label}
                                      </span>
                                    </td>

                                    {/* Contact Details */}
                                    <td className="py-2.5 px-2 text-[11px] text-slate-600">
                                      <div className="font-mono text-[10px] text-slate-800">{acc.email}</div>
                                      <div className="text-[10px] text-slate-500">{acc.phone || '-'}</div>
                                    </td>

                                    {/* Industry / Domain */}
                                    <td className="py-2.5 px-2 text-[11px] text-slate-600">
                                      <span className="truncate block max-w-[120px]">{acc.industry || 'Enterprise'}</span>
                                    </td>

                                    {/* Action Button */}
                                    <td className="py-2.5 px-3 text-right">
                                      {isSelected ? (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#244A70] text-white rounded text-[10px] font-semibold">
                                          <Check className="w-3 h-3 stroke-[3]" />
                                          Selected
                                        </span>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSelectAccount(acc);
                                          }}
                                          className="px-2 py-0.5 bg-white border border-[#DCE3EC] hover:border-[#244A70] text-[#17263A] hover:text-[#244A70] rounded text-[10px] font-medium transition-colors cursor-pointer"
                                        >
                                          Autofill
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Pagination Bar */}
                      {filteredAccounts.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3 py-2 border-t border-[#DCE3EC] bg-[#F8FAFC] text-xs">
                          <div className="flex items-center gap-2 text-[11px] text-[#8491A3]">
                            <span>Rows:</span>
                            <select
                              value={accountPageSize}
                              onChange={(e) => setAccountPageSize(Number(e.target.value))}
                              className="bg-white border border-slate-200 rounded px-1 py-0.5 text-[11px] text-slate-700 outline-none"
                            >
                              <option value={5}>5</option>
                              <option value={10}>10</option>
                              <option value={20}>20</option>
                            </select>
                            <span>|</span>
                            <span>
                              Showing {accountStartIndex + 1} to {accountEndIndex} of {filteredAccounts.length} accounts
                            </span>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-[#8491A3] mr-1.5">
                              Page {accountPage} of {totalAccountPages}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={accountPage <= 1}
                              onClick={() => setAccountPage((p) => Math.max(1, p - 1))}
                              className="h-6 text-[11px] px-1.5"
                            >
                              <ChevronLeft className="w-3 h-3 shrink-0" />
                              <span>Prev</span>
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={accountPage >= totalAccountPages}
                              onClick={() => setAccountPage((p) => Math.min(totalAccountPages, p + 1))}
                              className="h-6 text-[11px] px-1.5"
                            >
                              <span>Next</span>
                              <ChevronRight className="w-3 h-3 shrink-0" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Dossier Card: Selected Customer & Relationship Profile (4 cols on xl) */}
                    <div className="xl:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2.5 shadow-2xs">
                      <div className="font-bold text-xs text-[#17263A] flex items-center gap-1.5 pb-2 border-b border-slate-200">
                        <UserCheck className="w-4 h-4 text-[#244A70]" />
                        <span>Customer Relationship Dossier</span>
                      </div>

                      <div className="space-y-2.5 text-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-[#244A70] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs mt-0.5">
                            {companyName ? companyName.charAt(0) : 'C'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-[#17263A] text-xs leading-snug truncate">
                              {companyName || 'Unspecified Organization'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {fullName || 'No Contact Specified'}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-slate-200 text-[11px]">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Tier:</span>
                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold border ${RELATIONSHIP_TIERS[customerType].badgeClass}`}>
                              {RELATIONSHIP_TIERS[customerType].label}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Service SLA:</span>
                            <span className="font-semibold text-slate-800">{RELATIONSHIP_TIERS[customerType].sla}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Email:</span>
                            <span className="font-mono text-[10px] text-slate-700 truncate max-w-[140px]">{email || '-'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500">Phone:</span>
                            <span className="text-slate-700">{phone || '-'}</span>
                          </div>
                        </div>

                        {/* Tier Benefits */}
                        <div className="pt-2 border-t border-slate-200 space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Tier Privileges & Scope:
                          </span>
                          <ul className="text-[10px] text-slate-600 space-y-1 list-disc list-inside">
                            {RELATIONSHIP_TIERS[customerType].benefits.map((b, idx) => (
                              <li key={idx} className="leading-tight">{b}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Section C: Contact Details Form (Auto-filled or Custom) ── */}
                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#17263A] uppercase tracking-wider block">
                      Contact Information (Verified for Meeting Invitations)
                    </span>
                    <span className="text-[11px] text-slate-400">Fields can be adjusted manually</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="input-fullName" className="block text-xs font-semibold text-[#17263A] mb-1.5">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
                        <input
                          id="input-fullName"
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Tran Van A"
                          className={`w-full pl-9 pr-3 py-2 text-xs bg-white border ${
                            errors.fullName ? 'border-rose-500' : 'border-[#DCE3EC]'
                          } rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]`}
                        />
                      </div>
                      {errors.fullName && <p className="text-[11px] text-rose-600 mt-1">{errors.fullName}</p>}
                    </div>

                    <div>
                      <label htmlFor="input-companyName" className="block text-xs font-semibold text-[#17263A] mb-1.5">
                        Company / Organization *
                      </label>
                      <div className="relative">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
                        <input
                          id="input-companyName"
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          placeholder="e.g. Vietcombank Core"
                          className={`w-full pl-9 pr-3 py-2 text-xs bg-white border ${
                            errors.companyName ? 'border-rose-500' : 'border-[#DCE3EC]'
                          } rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]`}
                        />
                      </div>
                      {errors.companyName && <p className="text-[11px] text-rose-600 mt-1">{errors.companyName}</p>}
                    </div>

                    <div>
                      <label htmlFor="input-email" className="block text-xs font-semibold text-[#17263A] mb-1.5">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
                        <input
                          id="input-email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="contact@company.com"
                          className={`w-full pl-9 pr-3 py-2 text-xs bg-white border ${
                            errors.email ? 'border-rose-500' : 'border-[#DCE3EC]'
                          } rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]`}
                        />
                      </div>
                      {errors.email && <p className="text-[11px] text-rose-600 mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label htmlFor="input-phone" className="block text-xs font-semibold text-[#17263A] mb-1.5">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none shrink-0" />
                        <input
                          id="input-phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+84 988 888 888"
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Card 2: Consultation Specifications */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl p-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF1F6] flex items-center justify-center text-[#244A70]">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#17263A]">2. Consultation Specifications</h2>
                      <p className="text-xs text-[#8491A3]">Meeting objective, category, and preferred scheduling</p>
                    </div>
                  </div>
                  <Badge variant="info">Required</Badge>
                </div>

                <div>
                  <label htmlFor="input-topic" className="block text-xs font-semibold text-[#17263A] mb-1.5">
                    Meeting Topic / Subject *
                  </label>
                  <input
                    id="input-topic"
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. Modernization feasibility study for Core Banking screens"
                    className={`w-full px-3.5 py-2 text-xs bg-white border ${
                      errors.topic ? 'border-rose-500' : 'border-[#DCE3EC]'
                    } rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]`}
                  />
                  {errors.topic && <p className="text-[11px] text-rose-600 mt-1">{errors.topic}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Consultation Type
                    </label>
                    <select
                      value={consultationType}
                      onChange={(e) => setConsultationType(e.target.value as ConsultationType)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    >
                      <option value="SALES_SERVICE">Sales & Service Consultation</option>
                      <option value="LEGACY_MODERNIZATION">Legacy System Modernization Consultation</option>
                      <option value="TECHNICAL">Technical Deep-Dive Consultation</option>
                      <option value="ENTERPRISE_ARCHITECTURE">Enterprise Architecture Consultation</option>
                      <option value="CUSTOM_REQUIREMENTS">Custom Enterprise Requirements</option>
                      <option value="CONTRACT_PACKAGE">Contract & Service Package Consultation</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Urgency / Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as MeetingPriority)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    >
                      <option value="LOW">Low (Standard Cadence)</option>
                      <option value="MEDIUM">Medium (Normal SLA 24h)</option>
                      <option value="HIGH">High (Priority Response 4h)</option>
                      <option value="URGENT">Urgent (Immediate Deal Triage)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Preferred Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={requestedDate}
                      onChange={(e) => setRequestedDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Preferred Time Slot (Optional)
                    </label>
                    <input
                      type="time"
                      value={requestedTime}
                      onChange={(e) => setRequestedTime(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Card 3: Legacy System Scope */}
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl p-6">
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F4F7FB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF1F6] flex items-center justify-center text-[#244A70]">
                      <Server className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-[#17263A]">3. Legacy System Scope & Architecture</h2>
                      <p className="text-xs text-[#8491A3]">Mainframe architecture, scale estimates, and requirements</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold text-[#244A70] bg-[#EEF1F6] px-2 py-0.5 rounded">
                    Technical Scope
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Legacy Architecture
                    </label>
                    <select
                      value={legacySystemType}
                      onChange={(e) => setLegacySystemType(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    >
                      <option value="IBM 3270 BMS">IBM 3270 BMS</option>
                      <option value="AS/400 DSPF">AS/400 DSPF (IBM i)</option>
                      <option value="COBOL CICS">COBOL CICS Transactional</option>
                      <option value="Unisys MAPPER">Unisys MAPPER</option>
                      <option value="Other Mainframe">Other Mainframe / Legacy Green-Screen</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Estimated Screens
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={estimatedScreens}
                      onChange={(e) => setEstimatedScreens(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Estimated Programs
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={estimatedPrograms}
                      onChange={(e) => setEstimatedPrograms(Number(e.target.value))}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Project Scale
                    </label>
                    <select
                      value={estimatedProjectScale}
                      onChange={(e) => setEstimatedProjectScale(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    >
                      <option value="SMALL">Small (1-20 screens)</option>
                      <option value="MEDIUM">Medium (20-100 screens)</option>
                      <option value="LARGE">Large (100-300 screens)</option>
                      <option value="ENTERPRISE">Enterprise (300+ screens)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2 lg:col-span-4">
                    <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                      Target Timeline
                    </label>
                    <input
                      type="text"
                      value={expectedTimeline}
                      onChange={(e) => setExpectedTimeline(e.target.value)}
                      placeholder="e.g. Q1 2027"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#DCE3EC] rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#17263A] mb-1.5">
                    Business & Technical Requirements
                  </label>
                  <textarea
                    value={businessRequirements}
                    onChange={(e) => setBusinessRequirements(e.target.value)}
                    placeholder="Key modernization expectations, existing mainframe pain points, target web/cloud technology, security constraints..."
                    rows={4}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-[#DCE3EC] rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70] resize-none"
                  />
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Sticky Summary & Actions (4 cols) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-6">
            <Card className="border border-[#DCE3EC] bg-white shadow-2xs rounded-xl p-6 space-y-5">
              <div className="pb-3 border-b border-[#F4F7FB] flex items-center justify-between">
                <span className="text-xs font-bold text-[#17263A] uppercase tracking-wider">
                  Request Summary
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  NEW_REQUEST
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[11px] text-[#8491A3] uppercase font-semibold">Client</span>
                  <p className="font-bold text-[#17263A] mt-0.5">{companyName || 'Not specified'}</p>
                  <p className="text-[#8491A3]">{fullName ? `${fullName} (${email || 'No email'})` : 'Contact details pending'}</p>
                </div>

                <div className="pt-2 border-t border-[#F4F7FB]">
                  <span className="text-[11px] text-[#8491A3] uppercase font-semibold">Topic</span>
                  <p className="font-semibold text-[#17263A] mt-0.5">{topic || 'Consultation topic not set'}</p>
                  <p className="text-[11px] text-[#244A70] font-medium mt-0.5">{consultationType.replace(/_/g, ' ')}</p>
                </div>

                <div className="pt-2 border-t border-[#F4F7FB] grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[11px] text-[#8491A3] uppercase font-semibold">Priority</span>
                    <p className="font-bold text-[#17263A] mt-0.5">{priority}</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#8491A3] uppercase font-semibold">Estimated Scope</span>
                    <p className="font-bold text-[#17263A] mt-0.5">{estimatedScreens} screens</p>
                  </div>
                </div>
              </div>

              {/* Service SLA card */}
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#DCE3EC] space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#17263A]">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Enterprise SLA Response</span>
                </div>
                <p className="text-[11px] text-[#8491A3] leading-relaxed">
                  Upon submission, this request enters the CRM intake pipeline. A dedicated Sales Engineer will triage requirements, generate Google Meet invitations, and follow up within standard SLAs.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  className="w-full bg-[#244A70] hover:bg-[#244A70] py-2.5 text-xs font-bold shadow-xs flex items-center justify-center gap-2"
                  disabled={isSubmitting}
                >
                  
                  <span>{isSubmitting ? 'Submitting Request...' : 'Submit Consultation Request'}</span>
                </Button>
                <Button
                  type="button"   
                  variant="outline"
                  className="w-full py-2 text-xs font-semibold text-[#17263A]"
                  onClick={() => navigate('/sales/meeting-requests')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};
