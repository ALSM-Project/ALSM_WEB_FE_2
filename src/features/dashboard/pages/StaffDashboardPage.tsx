import React from 'react';
import { Card, PageHeader } from '@/shared/ui';
import { Cpu, ShieldCheck, ClipboardCheck, Activity, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const StaffDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Internal Staff Dashboard"
        subtitle="Operational overview, conversion pipeline control, and system validation metrics."
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card variant="default" padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B778C]">Conversion Queue</span>
            <div className="p-2 rounded-lg bg-[#E8F1FF] text-[#0652CC]">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#091E42] mt-3">12 Pending</p>
          <p className="text-xs text-[#6B778C] mt-1">BMS & COBOL conversions in queue</p>
        </Card>

        <Card variant="default" padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B778C]">Validation Rate</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#091E42] mt-3">99.4% Pass</p>
          <p className="text-xs text-[#6B778C] mt-1">Deterministic rule engine accuracy</p>
        </Card>

        <Card variant="default" padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B778C]">Review Queue</span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#091E42] mt-3">5 Needs Review</p>
          <p className="text-xs text-[#6B778C] mt-1">Human verification required</p>
        </Card>

        <Card variant="default" padding="md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[#6B778C]">Engine Health</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-[#091E42] mt-3">Optimal</p>
          <p className="text-xs text-[#6B778C] mt-1">Latency &lt; 150ms</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="default" padding="md">
          <h3 className="text-base font-bold text-[#091E42] mb-1">Quick Staff Operations</h3>
          <p className="text-xs text-[#6B778C] mb-4">Direct access to core internal staff workflows</p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/admin/menu-builder')}
              className="w-full p-3 rounded-lg border border-[#D9E2EC] hover:border-[#0652CC] hover:bg-[#F7F9FC] flex items-center justify-between transition-colors text-left"
            >
              <div>
                <span className="text-xs font-bold text-[#091E42]">Menu Builder</span>
                <p className="text-[11px] text-[#6B778C]">Configure staff runtime application navigation hierarchy</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#0652CC]" />
            </button>
            <button
              onClick={() => navigate('/queue')}
              className="w-full p-3 rounded-lg border border-[#D9E2EC] hover:border-[#0652CC] hover:bg-[#F7F9FC] flex items-center justify-between transition-colors text-left"
            >
              <div>
                <span className="text-xs font-bold text-[#091E42]">Conversion Operations Queue</span>
                <p className="text-[11px] text-[#6B778C]">Monitor active BMS/DSPF to React & COBOL to Java conversions</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#0652CC]" />
            </button>
          </div>
        </Card>

        <Card variant="default" padding="md">
          <h3 className="text-base font-bold text-[#091E42] mb-1">System Environment</h3>
          <p className="text-xs text-[#6B778C] mb-4">Web 2 Internal Staff Node configuration</p>
          <div className="space-y-2 text-xs text-[#42526E]">
            <div className="flex justify-between py-1 border-b border-[#E5EAF0]">
              <span>Portal Identity</span>
              <strong className="text-[#091E42]">ALSM_WEB_FE_2 (Web 2 Internal Staff)</strong>
            </div>
            <div className="flex justify-between py-1 border-b border-[#E5EAF0]">
              <span>Navigation Control</span>
              <strong className="text-[#0652CC]">Single Source of Truth Menu Builder Active</strong>
            </div>
            <div className="flex justify-between py-1">
              <span>Backend Auth</span>
              <strong className="text-[#091E42]">Shared Auth Microservice Connection</strong>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboardPage;
