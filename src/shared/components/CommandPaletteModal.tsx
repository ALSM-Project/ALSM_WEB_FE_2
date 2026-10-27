import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Building2,
  FolderKanban,
  FileText,
  Sliders,
  Shield,
  Layers,
  Activity,
  ArrowRight,
  Wallet,
  Settings,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  category: 'Navigation' | 'Administration' | 'Web3 & Financials' | 'System';
  route: string;
  icon: React.ReactNode;
  shortcut?: string;
}

const COMMANDS: CommandItem[] = [
  { id: 'c-dash', title: 'Dashboard Overview', category: 'Navigation', route: '/', icon: <Activity className="w-4 h-4 text-[#0652CC]" /> },
  { id: 'c-orgs', title: 'Customer Organisations & Support', category: 'Administration', route: '/admin/organizations', icon: <Building2 className="w-4 h-4 text-[#0652CC]" /> },
  { id: 'c-proj', title: 'Partner Projects Directory', category: 'Navigation', route: '/partners/projects', icon: <FolderKanban className="w-4 h-4 text-[#0652CC]" /> },
  { id: 'c-menu', title: 'Dynamic Menu Builder', category: 'Administration', route: '/admin/menus', icon: <Sliders className="w-4 h-4 text-[#0652CC]" /> },
  { id: 'c-web3', title: 'Blockchain & Web3 Administration', category: 'Web3 & Financials', route: '/admin/web3', icon: <Wallet className="w-4 h-4 text-[#0652CC]" /> },
  { id: 'c-inv', title: 'Enterprise Invoices & Billing', category: 'Web3 & Financials', route: '/billing/invoices', icon: <FileText className="w-4 h-4 text-[#0652CC]" /> },
  { id: 'c-roles', title: 'User Roles & RBAC Matrix', category: 'Administration', route: '/admin/users/roles', icon: <Shield className="w-4 h-4 text-[#0652CC]" /> },
  { id: 'c-audit', title: 'Security Audit Logs', category: 'System', route: '/admin/audit-logs', icon: <FileText className="w-4 h-4 text-[#0652CC]" /> },
  { id: 'c-conv', title: 'Conversion Queue & Troubleshooting', category: 'Navigation', route: '/queue', icon: <Layers className="w-4 h-4 text-[#0652CC]" /> },
  { id: 'c-sett', title: 'System & Security Settings', category: 'System', route: '/admin/settings', icon: <Settings className="w-4 h-4 text-[#0652CC]" /> },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = COMMANDS.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (item: CommandItem) => {
    onClose();
    navigate(item.route);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        handleSelect(filtered[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-900/40 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white rounded-2xl border border-[#DFE3E8] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#DFE3E8] bg-[#F7F9FC]">
          <Search className="w-4 h-4 text-[#5E6C84]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a module, action, or route (e.g. Invoices, Web3, Roles)..."
            className="w-full bg-transparent text-xs font-medium text-[#172B4D] placeholder:text-[#5E6C84] focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white border border-[#DFE3E8] text-[#5E6C84]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#5E6C84]">
              No navigation commands or administrative pages matching "{query}".
            </div>
          ) : (
            filtered.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#E8F1FF] text-[#0652CC]' : 'hover:bg-[#F7F9FC] text-[#172B4D]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-lg bg-white border border-[#DFE3E8]">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-[10px] text-[#5E6C84]">{item.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#5E6C84]">{item.route}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#5E6C84]" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[#DFE3E8] bg-[#F7F9FC] flex items-center justify-between text-[11px] text-[#5E6C84]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>Enterprise Command Palette</span>
        </div>
      </div>
    </div>
  );
};
