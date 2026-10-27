import React, { useState } from 'react';
import {
  Settings,
  Shield,
  Wallet,
  Bell,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { Card, Button, Input } from '@/shared/ui';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'web3' | 'notifications'>('general');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Form states
  const [orgDisplayName, setOrgDisplayName] = useState('ALSM Enterprise Network');
  const [supportEmail, setSupportEmail] = useState('admin@alsm.io');
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState(60);
  const [enforceMfa, setEnforceMfa] = useState(true);
  const [ipAllowlist, setIpAllowlist] = useState('10.0.0.0/16, 192.168.1.0/24');
  const [defaultChain, setDefaultChain] = useState('11155111');
  const [customRpcUrl, setCustomRpcUrl] = useState('https://rpc.sepolia.org');
  const [gasThresholdGwei, setGasThresholdGwei] = useState(35);
  const [notifyOnDiscount, setNotifyOnDiscount] = useState(true);
  const [notifyOnAuditOverride, setNotifyOnAuditOverride] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DFE3E8]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F1FF] text-[#0652CC] uppercase tracking-wider">
              Administration
            </span>
            <span className="text-[11px] text-[#5E6C84]">System & Governance</span>
          </div>
          <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight mt-1">
            Application Settings
          </h1>
          <p className="text-xs text-[#5E6C84] mt-1">
            Configure system parameters, authentication rules, Web3 RPC nodes, and administrative notification triggers.
          </p>
        </div>

        <div>
          <Button
            type="submit"
            form="settings-form"
            variant="primary"
            size="sm"
            className="bg-[#0652CC] hover:bg-[#0543A8] text-white text-xs"
          >
            <Save className="w-3.5 h-3.5 mr-1.5" />
            <span>Save Configuration</span>
          </Button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>System configuration successfully persisted and propagated across enterprise clusters.</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-[#DFE3E8]">
        <nav className="flex space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('general')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'general'
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>General</span>
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'security'
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Security & Access</span>
          </button>
          <button
            onClick={() => setActiveTab('web3')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'web3'
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <span>Web3 & Blockchain</span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'notifications'
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Notifications</span>
          </button>
        </nav>
      </div>

      <form id="settings-form" onSubmit={handleSave} className="space-y-6">
        {/* TAB 1: General */}
        {activeTab === 'general' && (
          <Card className="p-6 bg-white border border-[#DFE3E8] rounded-xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#172B4D] pb-2 border-b border-[#DFE3E8]">
              Enterprise Profile & Tenant Branding
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Organization Display Name</label>
                <Input
                  value={orgDisplayName}
                  onChange={(e) => setOrgDisplayName(e.target.value)}
                  placeholder="Organization Name"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Administrative Support Contact</label>
                <Input
                  value={supportEmail}
                  onChange={(e) => setSupportEmail(e.target.value)}
                  placeholder="admin@domain.com"
                />
              </div>
            </div>

            <div className="pt-2 text-xs text-[#5E6C84]">
              System environment identifier: <span className="font-mono font-semibold text-[#172B4D]">ALSM-PROD-US-EAST</span>
            </div>
          </Card>
        )}

        {/* TAB 2: Security & Access */}
        {activeTab === 'security' && (
          <Card className="p-6 bg-white border border-[#DFE3E8] rounded-xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#172B4D] pb-2 border-b border-[#DFE3E8]">
              Authentication & Enterprise Guardrails
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">
                  Session Inactivity Timeout (Minutes)
                </label>
                <Input
                  type="number"
                  value={sessionTimeoutMinutes}
                  onChange={(e) => setSessionTimeoutMinutes(parseInt(e.target.value) || 30)}
                  className="max-w-xs"
                />
                <span className="text-[11px] text-[#5E6C84] mt-0.5 block">
                  Idle sessions will automatically terminate to prevent unauthorized workspace access.
                </span>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="mfa"
                  checked={enforceMfa}
                  onChange={(e) => setEnforceMfa(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0652CC] focus:ring-[#0652CC] cursor-pointer"
                />
                <label htmlFor="mfa" className="font-semibold text-[#172B4D] cursor-pointer">
                  Mandatory Two-Factor Authentication (2FA / TOTP) for all Administrative Roles
                </label>
              </div>

              <div className="pt-2">
                <label className="block font-semibold text-[#172B4D] mb-1">
                  Permitted CIDR IP Subnet Allowlist
                </label>
                <Input
                  value={ipAllowlist}
                  onChange={(e) => setIpAllowlist(e.target.value)}
                  placeholder="10.0.0.0/16, 192.168.1.0/24"
                />
                <span className="text-[11px] text-[#5E6C84] mt-0.5 block">
                  Restricts Platform Admin actions strictly to trusted corporate VPC ranges.
                </span>
              </div>
            </div>
          </Card>
        )}

        {/* TAB 3: Web3 & Blockchain */}
        {activeTab === 'web3' && (
          <Card className="p-6 bg-white border border-[#DFE3E8] rounded-xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#172B4D] pb-2 border-b border-[#DFE3E8]">
              Blockchain RPC Endpoints & Gas Policies
            </h3>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">Default Deployment Network</label>
                  <select
                    value={defaultChain}
                    onChange={(e) => setDefaultChain(e.target.value)}
                    className="w-full px-3 py-2 border border-[#DFE3E8] rounded-xl text-xs bg-white text-[#172B4D] focus:ring-2 focus:ring-[#0652CC] outline-none"
                  >
                    <option value="1">Ethereum Mainnet (1)</option>
                    <option value="11155111">Sepolia Testnet (11155111)</option>
                    <option value="137">Polygon Mainnet (137)</option>
                    <option value="42161">Arbitrum One (42161)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#172B4D] mb-1">Max Anchoring Gas Price (Gwei)</label>
                  <Input
                    type="number"
                    value={gasThresholdGwei}
                    onChange={(e) => setGasThresholdGwei(parseInt(e.target.value) || 30)}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Custom RPC Endpoint Provider</label>
                <Input
                  value={customRpcUrl}
                  onChange={(e) => setCustomRpcUrl(e.target.value)}
                  placeholder="https://eth-mainnet.alchemyapi.io/v2/..."
                />
              </div>
            </div>
          </Card>
        )}

        {/* TAB 4: Notifications */}
        {activeTab === 'notifications' && (
          <Card className="p-6 bg-white border border-[#DFE3E8] rounded-xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-[#172B4D] pb-2 border-b border-[#DFE3E8]">
              Automated Alert Dispatch
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="notifyDiscount"
                  checked={notifyOnDiscount}
                  onChange={(e) => setNotifyOnDiscount(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0652CC] focus:ring-[#0652CC] cursor-pointer"
                />
                <label htmlFor="notifyDiscount" className="font-semibold text-[#172B4D] cursor-pointer">
                  Notify Sales Managers upon high-threshold discount submissions (&gt;20%)
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="notifyAudit"
                  checked={notifyOnAuditOverride}
                  onChange={(e) => setNotifyOnAuditOverride(e.target.checked)}
                  className="w-4 h-4 rounded text-[#0652CC] focus:ring-[#0652CC] cursor-pointer"
                />
                <label htmlFor="notifyAudit" className="font-semibold text-[#172B4D] cursor-pointer">
                  Emit real-time broadcast when customer support impersonation sessions are initiated
                </label>
              </div>
            </div>
          </Card>
        )}
      </form>
    </div>
  );
};
