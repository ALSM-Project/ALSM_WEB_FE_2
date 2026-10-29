import React, { useState } from 'react';
import { 
  Clock, User, Globe, Layers, Copy, Check, FileText, Code2, Tag
} from 'lucide-react';
import { Modal, Button } from '@/shared/ui';
import { AuditLogDto } from '../api/admin.api';

interface AuditDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AuditLogDto | null;
}

export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({
  isOpen,
  onClose,
  log,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'json'>('details');

  if (!log) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes('LOGIN') || act.includes('AUTH') || act.includes('ACCESS')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('CREATE') || act.includes('GRANT') || act.includes('APPROVE') || act.includes('SIGN')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('UPDATE') || act.includes('ASSIGN') || act.includes('TRANSFER')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    if (act.includes('LOCK') || act.includes('REVOKE') || act.includes('DELETE') || act.includes('OFFBOARD')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const hasMetadata = log.metadata && Object.keys(log.metadata).length > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Audit Log Entry Details"
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Header Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
          <div className="flex items-center gap-2.5">
            <span
              className={`font-mono text-xs px-2.5 py-1 rounded-full font-bold border ${getActionBadgeColor(
                log.action,
              )}`}
            >
              {log.action}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ID: <span className="text-slate-800 font-semibold">{log.id}</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'details'
                  ? 'bg-white text-[#0652CC] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Formatted View
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'json'
                  ? 'bg-white text-[#0652CC] shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              Raw JSON
            </button>
          </div>
        </div>

        {activeTab === 'details' ? (
          <div className="space-y-5">
            {/* Core Attributes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              {/* Timestamp */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-[#0652CC] rounded-md shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Timestamp</div>
                  <div className="text-slate-900 font-semibold mt-0.5 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleString()}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {log.timestamp}
                  </div>
                </div>
              </div>

              {/* Actor */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-start gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-md shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actor</div>
                  <div className="text-[#091E42] font-semibold mt-0.5">{log.actor}</div>
                </div>
              </div>

              {/* Target Resource */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-start gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-md shrink-0">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Target Resource</div>
                  <div className="text-slate-900 font-semibold mt-0.5 flex items-center gap-1.5">
                    <span className="font-mono px-1.5 py-0.5 bg-slate-100 rounded text-[11px] text-slate-700">
                      {log.resourceType}
                    </span>
                  </div>
                  {log.resourceId && (
                    <div className="text-[11px] text-slate-600 font-mono mt-1 break-all bg-slate-50 p-1 rounded border border-slate-100">
                      {log.resourceId}
                    </div>
                  )}
                </div>
              </div>

              {/* IP Address */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-start gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-md shrink-0">
                  <Globe className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Origin IP Address</div>
                  <div className="text-slate-900 font-mono text-[12px] font-semibold mt-0.5">
                    {log.ipAddress || 'Not recorded'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Captured via request pipeline</div>
                </div>
              </div>
            </div>

            {/* Context & Metadata Card */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
              <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-slate-500" />
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Context & Metadata
                  </span>
                </div>
                {hasMetadata && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    {Object.keys(log.metadata || {}).length} field(s)
                  </span>
                )}
              </div>

              <div className="p-4">
                {hasMetadata ? (
                  <div className="divide-y divide-slate-100">
                    {Object.entries(log.metadata || {}).map(([key, value]) => (
                      <div key={key} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-slate-600 font-mono text-[11px]">
                          {key}:
                        </span>
                        <span className="font-mono text-[11px] text-slate-900 bg-slate-50 px-2 py-1 rounded border border-slate-200/60 break-all max-w-full sm:max-w-md">
                          {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    <FileText className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                    No supplementary metadata was recorded for this event.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Raw JSON Tab */
          <div className="relative">
            <pre className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-[11px] overflow-x-auto max-h-[380px] leading-relaxed">
              {JSON.stringify(log, null, 2)}
            </pre>
            <button
              onClick={handleCopyJson}
              className="absolute top-3 right-3 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 text-xs"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Copied Record</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Full Record</span>
              </>
            )}
          </Button>

          <Button variant="primary" size="sm" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
