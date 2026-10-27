import React, { useState } from 'react';
import {
  Wallet,
  Cpu,
  Layers,
  History,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  Send,
  RefreshCw,
  Fuel,
  Info,
} from 'lucide-react';
import { useWeb3Wallet } from '../context/Web3Context';
import { Card, Button, Input } from '@/shared/ui';
import { ChainId } from '../types/web3.types';

export const Web3AdminPage: React.FC = () => {
  const {
    wallet,
    currentNetwork,
    supportedNetworks,
    contracts,
    transactions,
    connect,
    switchNetwork,
    simulateContractCall,
  } = useWeb3Wallet();

  const [activeTab, setActiveTab] = useState<'contracts' | 'simulator' | 'history'>('contracts');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Simulation form states
  const [selectedContractId, setSelectedContractId] = useState<string>('contract-audit');
  const [selectedMethod, setSelectedMethod] = useState<string>('anchorProof');
  const [projectIdInput, setProjectIdInput] = useState<string>('proj-stellar-web-01');
  const [customHashInput, setCustomHashInput] = useState<string>('0x9a83f140e72c81da53a20bf104869c');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSuccessMsg, setSimSuccessMsg] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSimulating(true);
      setSimSuccessMsg(null);
      const res = await simulateContractCall(selectedContractId, selectedMethod, {
        projectId: projectIdInput,
        hash: customHashInput,
      });
      setSimSuccessMsg(`Transaction broadcast and confirmed on block #${res.blockNumber} (Hash: ${res.hash.slice(0, 14)}...)`);
    } catch (err: any) {
      // handle error
    } finally {
      setIsSimulating(false);
    }
  };

  const shortenHash = (hash: string) => `${hash.slice(0, 10)}...${hash.slice(-8)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DFE3E8]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E8F1FF] text-[#0652CC] uppercase tracking-wider">
              Web3 Administration
            </span>
            <span className="text-[11px] text-[#5E6C84]">Enterprise Blockchain Gateway</span>
          </div>
          <h1 className="text-2xl font-bold text-[#172B4D] tracking-tight mt-1">
            Blockchain & Web3 Administration
          </h1>
          <p className="text-xs text-[#5E6C84] mt-1">
            Manage multi-chain wallet connectivity, enterprise smart contract registries, and on-chain conversion proof anchoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {wallet.status === 'CONNECTED' ? (
            <div className="flex items-center gap-2 bg-white border border-[#DFE3E8] px-3 py-1.5 rounded-xl text-xs">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: currentNetwork.color }} />
              <span className="font-semibold text-[#172B4D]">{currentNetwork.name}</span>
              <select
                value={wallet.chainId || 11155111}
                onChange={(e) => switchNetwork(parseInt(e.target.value) as ChainId)}
                aria-label="Switch Network"
                className="bg-transparent text-[11px] font-medium text-[#5E6C84] hover:text-[#0652CC] border-none outline-none cursor-pointer ml-1"
              >
                {supportedNetworks.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.shortName}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => connect()}
              className="bg-[#0652CC] hover:bg-[#0543A8] text-white"
            >
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              <span>Connect Wallet</span>
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-[#DFE3E8] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5E6C84]">Wallet Status</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-[#0652CC]">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-[#172B4D]">
              {wallet.status === 'CONNECTED' ? 'Connected' : 'Disconnected'}
            </div>
            <div className="text-[11px] text-[#5E6C84] font-mono mt-0.5 truncate">
              {wallet.address || 'No wallet session active'}
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#DFE3E8] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5E6C84]">Active Network</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-[#172B4D]">{currentNetwork.name}</div>
            <div className="text-[11px] text-[#5E6C84] mt-0.5">
              Chain ID: <span className="font-mono font-semibold">{currentNetwork.id}</span>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#DFE3E8] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5E6C84]">Network Gas Price</span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Fuel className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-[#172B4D]">18.4 Gwei</div>
            <div className="text-[11px] text-emerald-700 font-medium mt-0.5">
              Low Congestion (Optimal for Anchoring)
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white border border-[#DFE3E8] rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#5E6C84]">Active Smart Contracts</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-lg font-bold text-[#172B4D]">{contracts.length} Verified</div>
            <div className="text-[11px] text-[#5E6C84] mt-0.5">
              Identity, Audit Proof & Treasury
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#DFE3E8]">
        <nav className="flex space-x-6 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('contracts')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'contracts'
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Smart Contract Registry</span>
          </button>
          <button
            onClick={() => setActiveTab('simulator')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'simulator'
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Transaction & Proof Simulator</span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-[#0652CC] text-[#0652CC]'
                : 'border-transparent text-[#5E6C84] hover:text-[#172B4D]'
            }`}
          >
            <History className="w-4 h-4" />
            <span>On-Chain Transaction Log ({transactions.length})</span>
          </button>
        </nav>
      </div>

      {/* TAB 1: Smart Contracts */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {contracts.map((contract) => (
              <Card
                key={contract.id}
                className="p-4 bg-white border border-[#DFE3E8] rounded-xl flex flex-col justify-between hover:shadow-xs transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-[#172B4D]">{contract.name}</span>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-[#5E6C84] mt-2">{contract.description}</p>

                  <div className="mt-4 pt-3 border-t border-[#DFE3E8] space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-[#5E6C84]">Deployed Address:</span>
                      <button
                        onClick={() => handleCopy(contract.address, contract.id)}
                        className="flex items-center gap-1 font-mono text-[#0652CC] hover:underline"
                        title="Copy contract address"
                      >
                        {shortenHash(contract.address)}
                        {copiedId === contract.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    <div className="text-[11px] text-[#5E6C84]">
                      <span>Methods: </span>
                      <div className="mt-1 space-y-0.5">
                        {contract.methods.map((m, i) => (
                          <div
                            key={i}
                            className="font-mono text-[10px] bg-[#F7F9FC] text-[#172B4D] px-2 py-0.5 rounded border border-[#DFE3E8] truncate"
                          >
                            {m}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#DFE3E8] flex justify-between items-center text-[11px] text-[#5E6C84]">
                  <span>Deployed: {contract.deploymentDate}</span>
                  <a
                    href={`${currentNetwork.blockExplorerUrl}/address/${contract.address}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-[#0652CC] hover:underline font-semibold"
                  >
                    <span>Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: Simulator */}
      {activeTab === 'simulator' && (
        <Card className="p-6 bg-white border border-[#DFE3E8] rounded-xl shadow-xs max-w-3xl">
          <div className="flex items-center gap-2 pb-3 border-b border-[#DFE3E8]">
            <Send className="w-5 h-5 text-[#0652CC]" />
            <div>
              <h2 className="text-sm font-bold text-[#172B4D]">
                Simulate Smart Contract Execution & Proof Anchoring
              </h2>
              <p className="text-xs text-[#5E6C84]">
                Broadcast state updates or verification requests to the enterprise ledger.
              </p>
            </div>
          </div>

          {simSuccessMsg && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{simSuccessMsg}</span>
            </div>
          )}

          <form onSubmit={handleRunSimulation} className="mt-4 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Target Contract</label>
                <select
                  value={selectedContractId}
                  onChange={(e) => setSelectedContractId(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DFE3E8] rounded-xl text-xs bg-white text-[#172B4D] focus:ring-2 focus:ring-[#0652CC] outline-none"
                >
                  {contracts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#172B4D] mb-1">Contract Method</label>
                <select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-full px-3 py-2 border border-[#DFE3E8] rounded-xl text-xs bg-white text-[#172B4D] focus:ring-2 focus:ring-[#0652CC] outline-none"
                >
                  <option value="anchorProof">anchorProof(bytes32 packageHash, string projectId)</option>
                  <option value="verifyOrganization">verifyOrganization(string orgId)</option>
                  <option value="payInvoice">payInvoice(string invoiceId)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[#172B4D] mb-1">Project Identifier</label>
              <Input
                value={projectIdInput}
                onChange={(e) => setProjectIdInput(e.target.value)}
                placeholder="proj-customer-app-01"
              />
            </div>

            <div>
              <label className="block font-semibold text-[#172B4D] mb-1">
                Merkle Root Package Hash (SHA-256)
              </label>
              <Input
                value={customHashInput}
                onChange={(e) => setCustomHashInput(e.target.value)}
                placeholder="0x..."
                className="font-mono text-xs"
              />
            </div>

            <div className="p-3 bg-[#F7F9FC] rounded-xl border border-[#DFE3E8] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-[#5E6C84]">
                <Info className="w-4 h-4 text-[#0652CC]" />
                <span>Estimated Gas: ~48,200 units (approx. $0.003 USD)</span>
              </div>
              <span className="font-mono text-[#172B4D] font-semibold">18.4 Gwei</span>
            </div>

            <div className="flex justify-end pt-3 border-t border-[#DFE3E8]">
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSimulating}
                className="bg-[#0652CC] hover:bg-[#0543A8] text-white"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" />
                    <span>Broadcasting & Verifying...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    <span>Anchor & Execute On-Chain</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB 3: On-Chain Transaction Log */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-xl border border-[#DFE3E8] overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F7F9FC] border-b border-[#DFE3E8] text-[10px] font-bold text-[#5E6C84] uppercase tracking-wider">
                  <th className="py-3 px-4">Tx Hash</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Block</th>
                  <th className="py-3 px-4">Sender</th>
                  <th className="py-3 px-4">Gas Used</th>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DFE3E8]">
                {transactions.map((tx) => (
                  <tr key={tx.hash} className="hover:bg-[#F7F9FC]/60 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-[#0652CC] font-semibold">
                      {shortenHash(tx.hash)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#172B4D] font-bold">
                      {tx.method}()
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#5E6C84]">
                      #{tx.blockNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#5E6C84]">
                      {shortenHash(tx.from)}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#172B4D]">
                      {tx.gasUsed.toLocaleString()} ({tx.gasPriceGwei} Gwei)
                    </td>
                    <td className="py-3 px-4 text-[#5E6C84] text-[11px]">
                      {new Date(tx.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
