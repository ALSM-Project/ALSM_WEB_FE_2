import React, { useState, useRef, useEffect } from 'react';
import { Wallet, ChevronDown, Check, Copy, ExternalLink, Power, ShieldCheck } from 'lucide-react';
import { useWeb3Wallet } from '../context/Web3Context';
import { ChainId } from '../types/web3.types';
import { useNavigate } from 'react-router-dom';

export const WalletConnectPill: React.FC = () => {
  const { wallet, currentNetwork, supportedNetworks, connect, disconnect, switchNetwork } = useWeb3Wallet();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  const handleCopy = () => {
    if (wallet.address) {
      navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (wallet.status !== 'CONNECTED' || !wallet.address) {
    return (
      <button
        onClick={() => connect()}
        disabled={wallet.status === 'CONNECTING'}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#DCE3EC] bg-white hover:bg-[#F4F7FB] text-xs font-semibold text-[#17263A] shadow-2xs transition-colors cursor-pointer"
        title="Connect Web3 Enterprise Wallet"
      >
        <Wallet className="w-3.5 h-3.5 text-[#244A70]" />
        <span>{wallet.status === 'CONNECTING' ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md border border-[#DCE3EC] bg-white hover:bg-[#F4F7FB] text-xs font-medium text-[#17263A] shadow-2xs transition-colors cursor-pointer"
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: currentNetwork.color }}
        />
        <span className="font-mono text-xs font-semibold text-[#17263A]">
          {shortenAddress(wallet.address)}
        </span>
        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EEF1F6] text-[#244A70] border border-[#DCE3EC]">
          {wallet.balance} {currentNetwork.nativeCurrency.symbol}
        </span>
        <ChevronDown className="w-3 h-3 text-[#8491A3]" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-[#DCE3EC] rounded-lg shadow-lg z-50 p-3 space-y-3 text-xs animate-fade-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#EEF1F6]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#244A70]" />
              <span className="font-semibold text-[#17263A]">{wallet.providerName}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-[#8491A3] hover:text-[#244A70]"
              title="Copy address"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Full address */}
          <div className="bg-[#F8FAFC] p-2 rounded-md font-mono text-[11px] text-[#17263A] break-all border border-[#DCE3EC]">
            {wallet.address}
          </div>

          {/* Network Selection */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-[#8491A3] uppercase tracking-wider block">
              Active Network
            </span>
            <div className="grid grid-cols-1 gap-1">
              {supportedNetworks.map((net) => {
                const isActive = net.id === wallet.chainId;
                return (
                  <button
                    key={net.id}
                    onClick={() => {
                      switchNetwork(net.id as ChainId);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#EEF1F6] text-[#244A70] font-semibold border border-[#DCE3EC]'
                        : 'hover:bg-[#F8FAFC] text-[#17263A]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: net.color }} />
                      <span>{net.name}</span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-[#244A70]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-[#EEF1F6] flex items-center justify-between">
            <button
              onClick={() => {
                setDropdownOpen(false);
                navigate('/admin/web3');
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-[#244A70] hover:underline"
            >
              <span>Audit &amp; Simulator</span>
              <ExternalLink className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                disconnect();
                setDropdownOpen(false);
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-rose-700 hover:text-rose-900"
            >
              <Power className="w-3 h-3" />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnectPill;
