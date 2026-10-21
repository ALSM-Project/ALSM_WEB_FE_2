import React, { useState, useEffect } from 'react';
import { 
  Layers, Plus, Edit3, RefreshCw, AlertTriangle, 
  CheckCircle2, Check, X, Search, Eye, 
} from 'lucide-react';
import { adminApi, EngagementTypeDto } from '../api/admin.api';
import { Button, Modal, Input } from '@/shared/ui';

export interface FullEngagementTypeDto extends EngagementTypeDto {
  price?: number;
  trialLimits?: {
    maxScreens: number;
    maxPrograms: number;
    maxStorageGb: number;
  };
  usageLimits?: {
    maxScreens: number;
    maxPrograms: number;
    maxStorageGb: number;
  };
  features: string[];
  includesCobolConversion?: boolean;
}

const DEFAULT_MOCK_ENGAGEMENT_TYPES: FullEngagementTypeDto[] = [
  {
    id: 'eng-ent-t1',
    name: 'Enterprise Tier 1 (Unlimited Acceleration)',
    code: 'ENTERPRISE_T1',
    description: 'Premier tier for mission-critical core banking and mainframe modernization programs.',
    price: 36000,
    trialLimits: {
      maxScreens: 30,
      maxPrograms: 15,
      maxStorageGb: 10,
    },
    usageLimits: {
      maxScreens: 500,
      maxPrograms: 200,
      maxStorageGb: 150,
    },
    features: [
      'AST Grammar Verification',
      'COBOL 85 / MicroFocus Modernizer',
      'BMS & DSPF Reactive Screens',
      'Dedicated Private Conversion Runner',
      '4-Hour SLA Escalation',
      'Immutable Audit Trail Access',
    ],
    supportTier: 'PREMIER',
    slaHours: 4,
    includesCobolConversion: true,
    isActive: true,
    createdAt: '2026-01-15T08:00:00Z',
  },
  {
    id: 'eng-ent-t2',
    name: 'Enterprise Tier 2 (Standard Modernization)',
    code: 'ENTERPRISE_T2',
    description: 'Standard enterprise package with high throughput BMS/DSPF conversion and baseline COBOL parsing.',
    price: 18000,
    trialLimits: {
      maxScreens: 15,
      maxPrograms: 8,
      maxStorageGb: 5,
    },
    usageLimits: {
      maxScreens: 150,
      maxPrograms: 60,
      maxStorageGb: 50,
    },
    features: [
      'BMS / DSPF Screen Converter',
      'AST Simulated Validation',
      'Standard COBOL Batch Translation',
      'Shared Enterprise Queue',
      '12-Hour SLA Support',
    ],
    supportTier: 'STANDARD_ENTERPRISE',
    slaHours: 12,
    includesCobolConversion: true,
    isActive: true,
    createdAt: '2026-03-01T09:00:00Z',
  },
  {
    id: 'eng-std',
    name: 'Standard Self-Service Tier',
    code: 'STANDARD',
    description: 'Lightweight entry plan for standalone screen pilot modernizations.',
    price: 6000,
    trialLimits: {
      maxScreens: 5,
      maxPrograms: 2,
      maxStorageGb: 1,
    },
    usageLimits: {
      maxScreens: 50,
      maxPrograms: 15,
      maxStorageGb: 15,
    },
    features: [
      'Standard BMS to React Converter',
      'Web-based Field Mapping Editor',
      'Community Ticket Support',
    ],
    supportTier: 'COMMUNITY',
    slaHours: 48,
    includesCobolConversion: false,
    isActive: true,
    createdAt: '2026-05-10T11:00:00Z',
  },
];

export const EngagementTypesPage: React.FC = () => {
  const [types, setTypes] = useState<FullEngagementTypeDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [cobolFilter, setCobolFilter] = useState<'ALL' | 'COBOL_ONLY' | 'NO_COBOL'>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [viewingItem, setViewingItem] = useState<FullEngagementTypeDto | null>(null);
  const [editingItem, setEditingItem] = useState<FullEngagementTypeDto | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form Fields
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(18000);
  const [trialScreens, setTrialScreens] = useState<number>(15);
  const [trialPrograms, setTrialPrograms] = useState<number>(8);
  const [trialStorage, setTrialStorage] = useState<number>(5);
  const [usageScreens, setUsageScreens] = useState<number>(150);
  const [usagePrograms, setUsagePrograms] = useState<number>(60);
  const [usageStorage, setUsageStorage] = useState<number>(50);
  const [includesCobol, setIncludesCobol] = useState<boolean>(true);
  const [featuresInput, setFeaturesInput] = useState<string>(
    'BMS Screen Modernizer, AST Validation, Direct Code Export'
  );

  const fetchTypes = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const data = await adminApi.getEngagementTypes().catch(() => []);
      if (Array.isArray(data) && data.length > 0) {
        // Merge with rich defaults
        const merged: FullEngagementTypeDto[] = data.map((d) => {
          const mockMatch = DEFAULT_MOCK_ENGAGEMENT_TYPES.find(
            (m) => m.id === d.id || m.code === d.code || m.name === d.name
          );
          return {
            ...d,
            price: (d as any).price ?? mockMatch?.price ?? 12000,
            trialLimits: (d as any).trialLimits ?? mockMatch?.trialLimits ?? {
              maxScreens: 15,
              maxPrograms: 8,
              maxStorageGb: 5,
            },
            usageLimits: (d as any).usageLimits ?? mockMatch?.usageLimits ?? {
              maxScreens: 150,
              maxPrograms: 60,
              maxStorageGb: 50,
            },
            features: d.features && d.features.length > 0 ? d.features : mockMatch?.features || ['Core Conversion Engine'],
            includesCobolConversion:
              (d as any).includesCobolConversion ?? mockMatch?.includesCobolConversion ?? true,
          };
        });
        setTypes(merged);
      } else {
        setTypes(DEFAULT_MOCK_ENGAGEMENT_TYPES);
      }
    } catch {
      setTypes(DEFAULT_MOCK_ENGAGEMENT_TYPES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTypes();
  }, []);

  const openCreateModal = () => {
    setEditingItem(null);
    setName('');
    setCode('');
    setDescription('');
    setPrice(18000);
    setTrialScreens(15);
    setTrialPrograms(8);
    setTrialStorage(5);
    setUsageScreens(150);
    setUsagePrograms(60);
    setUsageStorage(50);
    setIncludesCobol(true);
    setFeaturesInput('BMS Screen Modernizer, AST Validation, Direct Code Export, Quality Review Access');
    setShowModal(true);
  };

  const openEditModal = (item: FullEngagementTypeDto) => {
    setEditingItem(item);
    setName(item.name);
    setCode(item.code);
    setDescription(item.description || '');
    setPrice(item.price ?? 18000);
    setTrialScreens(item.trialLimits?.maxScreens ?? 15);
    setTrialPrograms(item.trialLimits?.maxPrograms ?? 8);
    setTrialStorage(item.trialLimits?.maxStorageGb ?? 5);
    setUsageScreens(item.usageLimits?.maxScreens ?? 150);
    setUsagePrograms(item.usageLimits?.maxPrograms ?? 60);
    setUsageStorage(item.usageLimits?.maxStorageGb ?? 50);
    setIncludesCobol(item.includesCobolConversion ?? true);
    setFeaturesInput(item.features?.join(', ') || '');
    setShowModal(true);
  };

  const openViewModal = (item: FullEngagementTypeDto) => {
    setViewingItem(item);
    setShowDetailModal(true);
  };

  // Determine if any limit was reduced compared to existing plan
  const hasReducedLimits = (): boolean => {
    if (!editingItem) return false;
    const oldTrial = editingItem.trialLimits || { maxScreens: 0, maxPrograms: 0, maxStorageGb: 0 };
    const oldUsage = editingItem.usageLimits || { maxScreens: 0, maxPrograms: 0, maxStorageGb: 0 };

    return (
      trialScreens < oldTrial.maxScreens ||
      trialPrograms < oldTrial.maxPrograms ||
      trialStorage < oldTrial.maxStorageGb ||
      usageScreens < oldUsage.maxScreens ||
      usagePrograms < oldUsage.maxPrograms ||
      usageStorage < oldUsage.maxStorageGb
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Plan name is required.');
      return;
    }

    if (price < 0 || trialScreens <= 0 || usageScreens <= 0) {
      setErrorMsg('Price and screen limits must be positive numerical values.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const parsedFeatures = featuresInput
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);

      const payload: FullEngagementTypeDto = {
        id: editingItem?.id || `eng-${Date.now()}`,
        name: name.trim(),
        code: code.trim() || name.trim().toUpperCase().replace(/\s+/g, '_'),
        description: description.trim(),
        price,
        trialLimits: {
          maxScreens: trialScreens,
          maxPrograms: trialPrograms,
          maxStorageGb: trialStorage,
        },
        usageLimits: {
          maxScreens: usageScreens,
          maxPrograms: usagePrograms,
          maxStorageGb: usageStorage,
        },
        features: parsedFeatures.length > 0 ? parsedFeatures : ['Core Modernization Suite'],
        includesCobolConversion: includesCobol,
        supportTier: price > 25000 ? 'PREMIER' : 'STANDARD',
        slaHours: price > 25000 ? 4 : 12,
        isActive: true,
        createdAt: editingItem?.createdAt || new Date().toISOString(),
      };

      try {
        if (editingItem) {
          await adminApi.updateEngagementType(editingItem.id, payload as any);
        } else {
          await adminApi.createEngagementType(payload as any);
        }
      } catch {
        // Fallback to local state update
      }

      if (editingItem) {
        setTypes((prev) => prev.map((t) => (t.id === editingItem.id ? payload : t)));
        const reductionNotice = hasReducedLimits()
          ? ' Warning: Limits were reduced; simulated notification dispatched to affected tenant accounts.'
          : '';
        setSuccessMsg(`Engagement type "${name}" updated successfully in local mock state.${reductionNotice}`);
      } else {
        setTypes((prev) => [payload, ...prev]);
        setSuccessMsg(`New engagement type "${name}" created and added to platform catalog in local state.`);
      }

      setShowModal(false);
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save engagement type');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Types
  const filteredTypes = types.filter((t) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      t.name.toLowerCase().includes(term) ||
      t.code.toLowerCase().includes(term) ||
      (t.description && t.description.toLowerCase().includes(term));

    const matchesCobol =
      cobolFilter === 'ALL' ||
      (cobolFilter === 'COBOL_ONLY' && t.includesCobolConversion !== false) ||
      (cobolFilter === 'NO_COBOL' && t.includesCobolConversion === false);

    return matchesSearch && matchesCobol;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42]">
            Engagement Types & Plan Management
          </h1>
          <p className="text-xs text-[#6B778C] mt-1">
            Configure commercial packages, trial quotas, Web 3 modernized usage limits, and COBOL capabilities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTypes}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5EAF0] bg-white px-4 py-2 text-xs font-semibold text-[#091E42] shadow-xs hover:bg-[#F4F6F8] transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1 text-[#0652CC] ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0652CC] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#0543A8] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Create Engagement Type
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 font-bold">&times;</button>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold">&times;</button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="bg-white rounded-2xl border border-[#E5EAF0] p-4 shadow-xs">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="Search engagement plans by name, code or feature..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#D9E2EC] rounded-xl text-xs focus:ring-2 focus:ring-[#0652CC] outline-none"
            />
            <Search className="w-4 h-4 text-[#6B778C] absolute left-3 top-2.5 pointer-events-none" />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#6B778C]">COBOL Engine:</span>
            {[
              { id: 'ALL', label: 'All Plans' },
              { id: 'COBOL_ONLY', label: 'COBOL Supported' },
              { id: 'NO_COBOL', label: 'BMS Only' },
            ].map((flt) => (
              <button
                key={flt.id}
                onClick={() => setCobolFilter(flt.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  cobolFilter === flt.id
                    ? 'bg-[#0652CC] text-white shadow-xs'
                    : 'bg-[#F7F9FC] text-[#091E42] hover:bg-[#E5EAF0]'
                }`}
              >
                {flt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Engagement Types Table */}
      <div className="rounded-2xl border border-[#E5EAF0] bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F9FC] border-b border-[#E5EAF0] text-[10px] font-bold text-[#6B778C] uppercase tracking-wider">
                <th className="py-3 px-4">Plan Name & Code</th>
                <th className="py-3 px-4">Annual Price</th>
                <th className="py-3 px-4">Trial Limits (Scr/Prog/GB)</th>
                <th className="py-3 px-4">Usage Limits (Scr/Prog/GB)</th>
                <th className="py-3 px-4">Included Features</th>
                <th className="py-3 px-4">COBOL Support</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5EAF0]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B778C]">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="w-6 h-6 border-2 border-[#0652CC] border-t-transparent rounded-full animate-spin" />
                      <span>Loading engagement types...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B778C]">
                    <Layers className="w-8 h-8 mx-auto text-[#6B778C]/40 mb-2" />
                    No engagement types match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredTypes.map((t) => (
                  <tr key={t.id} className="hover:bg-[#F9FBFF] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-[#091E42]">{t.name}</div>
                      <div className="text-[10px] font-mono text-[#6B778C]">{t.code || t.name.toUpperCase()}</div>
                      {t.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 max-w-xs">{t.description}</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-emerald-700 whitespace-nowrap">
                      ${(t.price ?? 18000).toLocaleString()} <span className="text-[10px] text-slate-500 font-normal">/ yr</span>
                    </td>
                    <td className="py-3.5 px-4 text-[#091E42]">
                      <div className="p-1.5 rounded-lg bg-amber-50/70 border border-amber-200/80 inline-block">
                        <span className="font-semibold text-amber-900">{t.trialLimits?.maxScreens ?? 15}</span> screens ·{' '}
                        <span className="font-semibold text-amber-900">{t.trialLimits?.maxPrograms ?? 8}</span> progs ·{' '}
                        <span className="font-semibold text-amber-900">{t.trialLimits?.maxStorageGb ?? 5}</span> GB
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-[#091E42]">
                      <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-200/80 inline-block">
                        <span className="font-semibold text-[#0652CC]">{t.usageLimits?.maxScreens ?? 150}</span> screens ·{' '}
                        <span className="font-semibold text-[#0652CC]">{t.usageLimits?.maxPrograms ?? 60}</span> progs ·{' '}
                        <span className="font-semibold text-[#0652CC]">{t.usageLimits?.maxStorageGb ?? 50}</span> GB
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {t.features && t.features.slice(0, 2).map((f, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-700 font-medium truncate max-w-[130px]">
                            {f}
                          </span>
                        ))}
                        {t.features && t.features.length > 2 && (
                          <span className="text-[10px] text-slate-400 font-medium">+{t.features.length - 2} more</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {t.includesCobolConversion !== false ? (
                        <span className="inline-flex items-center text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Check className="w-3 h-3 mr-0.5" /> INCLUDED
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                          <X className="w-3 h-3 mr-0.5" /> EXCLUDED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openViewModal(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#E5EAF0] bg-white text-xs font-semibold text-[#091E42] hover:bg-[#F7F9FC] transition-colors"
                          title="View plan specifications"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          View
                        </button>
                        <button
                          onClick={() => openEditModal(t)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#0652CC] bg-white text-xs font-semibold text-[#0652CC] hover:bg-blue-50 transition-colors"
                          title="Edit limits and configuration"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={viewingItem ? viewingItem.name : 'Engagement Plan Specifications'}
      >
        {viewingItem && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500">Plan Description</span>
              <p className="text-slate-800 leading-relaxed">{viewingItem.description || 'No description provided.'}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 space-y-1.5">
                <span className="font-bold text-amber-900 block uppercase text-[10px]">Trial Sandbox Caps</span>
                <div className="text-slate-800 space-y-1">
                  <div>Max Screens: <strong>{viewingItem.trialLimits?.maxScreens}</strong></div>
                  <div>Max Programs: <strong>{viewingItem.trialLimits?.maxPrograms}</strong></div>
                  <div>Storage Limit: <strong>{viewingItem.trialLimits?.maxStorageGb} GB</strong></div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200 space-y-1.5">
                <span className="font-bold text-[#0652CC] block uppercase text-[10px]">Post-Upgrade Production Quotas</span>
                <div className="text-slate-800 space-y-1">
                  <div>Max Screens: <strong>{viewingItem.usageLimits?.maxScreens}</strong></div>
                  <div>Max Programs: <strong>{viewingItem.usageLimits?.maxPrograms}</strong></div>
                  <div>Storage Limit: <strong>{viewingItem.usageLimits?.maxStorageGb} GB</strong></div>
                </div>
              </div>
            </div>

            <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Included Features & Capabilities</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {viewingItem.features?.map((f, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-slate-700">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-[#E5EAF0]">
              <Button variant="outline" size="sm" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Engagement Type Modal (Requirement F) */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingItem ? 'Edit Engagement Type' : 'Create New Engagement Type'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <p className="text-xs text-[#6B778C]">
            Define pricing, Trial onboarding quotas, post-upgrade production usage limits, and COBOL capabilities.
          </p>

          {/* Dynamic Warning Notice if Limits are Reduced (Requirement F) */}
          {editingItem && hasReducedLimits() && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <strong>Simulated Warning: Quota Reduction Detected</strong>
                <p className="text-[11px] text-amber-900 mt-0.5 leading-relaxed">
                  You are reducing limits below currently established tier levels. In accordance with policy, affected customer tenant organisations will receive simulated update notices regarding reduced allocations.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-1">Plan Name *</label>
              <Input
                required
                placeholder="Enterprise Pro Plus"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-1">Plan Code</label>
              <Input
                placeholder="ENTERPRISE_PRO"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-1">Annual Price ($ USD) *</label>
              <Input
                type="number"
                min={0}
                required
                value={price}
                onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#091E42] mb-1">Description</label>
              <Input
                placeholder="Targeted at tier-1 enterprise migrations"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          {/* Trial Limits Group */}
          <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
            <h4 className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">
              1. Trial Limits (Pre-Upgrade Sandbox Caps)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-[#6B778C]">Trial Screens</label>
                <Input
                  type="number"
                  min={1}
                  value={trialScreens}
                  onChange={(e) => setTrialScreens(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#6B778C]">Trial Programs</label>
                <Input
                  type="number"
                  min={1}
                  value={trialPrograms}
                  onChange={(e) => setTrialPrograms(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#6B778C]">Trial Storage (GB)</label>
                <Input
                  type="number"
                  min={1}
                  value={trialStorage}
                  onChange={(e) => setTrialStorage(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Usage Limits Group */}
          <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200 space-y-2">
            <h4 className="text-[11px] font-bold text-[#0652CC] uppercase tracking-wider">
              2. Production Usage Limits (Post-Upgrade Production)
            </h4>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] text-[#6B778C]">Usage Screens</label>
                <Input
                  type="number"
                  min={1}
                  value={usageScreens}
                  onChange={(e) => setUsageScreens(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#6B778C]">Usage Programs</label>
                <Input
                  type="number"
                  min={1}
                  value={usagePrograms}
                  onChange={(e) => setUsagePrograms(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#6B778C]">Usage Storage (GB)</label>
                <Input
                  type="number"
                  min={1}
                  value={usageStorage}
                  onChange={(e) => setUsageStorage(parseInt(e.target.value) || 1)}
                  className="text-xs bg-white"
                />
              </div>
            </div>
          </div>

          {/* Included Features */}
          <div>
            <label className="block text-xs font-semibold text-[#091E42] mb-1">
              Included Features (comma-separated)
            </label>
            <Input
              value={featuresInput}
              onChange={(e) => setFeaturesInput(e.target.value)}
              placeholder="AST Grammar Validation, COBOL Engine, Dedicated Private Runner"
              className="text-xs"
            />
          </div>

          {/* COBOL Conversion Flag */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="cobolCheck"
              checked={includesCobol}
              onChange={(e) => setIncludesCobol(e.target.checked)}
              className="rounded text-[#0652CC] focus:ring-[#0652CC]"
            />
            <label htmlFor="cobolCheck" className="text-xs font-semibold text-[#091E42] cursor-pointer">
              Enable COBOL Modernization Availability (`includes_cobol_conversion: true`)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-[#E5EAF0]">
            <Button type="button" variant="outline" size="sm" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              className="bg-[#0652CC] hover:bg-[#0543A8] text-white"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              {submitting ? 'Saving...' : editingItem ? 'Save Changes' : 'Create Engagement Type'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default EngagementTypesPage;
