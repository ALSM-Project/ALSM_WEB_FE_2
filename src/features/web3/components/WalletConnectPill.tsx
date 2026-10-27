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
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#DFE3E8] bg-white hover:bg-[#F7F9FC] text-xs font-semibold text-[#172B4D] shadow-xs transition-colors cursor-pointer"
        title="Connect Web3 Enterprise Wallet"
      >
        <Wallet className="w-3.5 h-3.5 text-[#0652CC]" />
        <span>{wallet.status === 'CONNECTING' ? 'Connecting...' : 'Connect Wallet'}</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setDropdownOpen(!dropdownOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-[#DFE3E8] bg-white hover:bg-[#F7F9FC] text-xs font-medium text-[#172B4D] shadow-xs transition-colors cursor-pointer"
      >
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: currentNetwork.color }}
        />
        <span className="font-mono text-xs font-semibold text-[#172B4D]">
          {shortenAddress(wallet.address)}
        </span>
        <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E8F1FF] text-[#0652CC]">
          {wallet.balance} {currentNetwork.nativeCurrency.symbol}
        </span>
        <ChevronDown className="w-3 h-3 text-[#5E6C84]" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-[#DFE3E8] rounded-xl shadow-lg z-50 p-3 space-y-3 text-xs">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#DFE3E8]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#0652CC]" />
              <span className="font-semibold text-[#172B4D]">{wallet.providerName}</span>
            </div>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-[#5E6C84] hover:text-[#0652CC]"
              title="Copy address"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          {/* Full address */}
          <div className="bg-[#F7F9FC] p-2 rounded-lg font-mono text-[11px] text-[#172B4D] break-all border border-[#DFE3E8]">
            {wallet.address}
          </div>

          {/* Network Selection */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-[#5E6C84] uppercase tracking-wider block">
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
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                      isActive
                        ? 'bg-[#E8F1FF] text-[#0652CC] font-semibold border border-[#0652CC]/20'
                        : 'hover:bg-[#F7F9FC] text-[#172B4D]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: net.color }} />
                      <span>{net.name}</span>
                    </div>
                    {isActive && <Check className="w-3.5 h-3.5 text-[#0652CC]" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-[#DFE3E8] space-y-1">
            <button
              onClick={() => {
                setDropdownOpen(false);
                navigate('/admin/web3');
              }}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[#172B4D] hover:bg-[#F7F9FC] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <ExternalLink className="w-3.5 h-3.5 text-[#5E6C84]" />
                <span>Web3 Admin & Contracts</span>
              </div>
            </button>
            <button
              onClick={() => {
                setDropdownOpen(false);
                disconnect();
              }}
              className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <Power className="w-3.5 h-3.5 text-rose-600" />
              <span>Disconnect Wallet</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
