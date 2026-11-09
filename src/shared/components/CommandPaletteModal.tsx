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
  Users,
} from 'lucide-react';
import { apiClient } from '@/services/api/apiClient';

interface CommandItem {
  id: string;
  title: string;
  category: string;
  route: string;
  icon?: React.ReactNode;
  shortcut?: string;
}

const DEFAULT_COMMANDS: CommandItem[] = [
  { id: 'c-dash', title: 'Dashboard Overview', category: 'Navigation', route: '/', icon: <Activity className="w-4 h-4 text-[#244A70]" /> },
  { id: 'c-orgs', title: 'Customer Organisations & Support', category: 'Administration', route: '/admin/organizations', icon: <Building2 className="w-4 h-4 text-[#244A70]" /> },
  { id: 'c-proj', title: 'Partner Projects Directory', category: 'Navigation', route: '/partners/projects', icon: <FolderKanban className="w-4 h-4 text-[#244A70]" /> },
  { id: 'c-menu', title: 'Dynamic Menu Builder', category: 'Administration', route: '/admin/menus', icon: <Sliders className="w-4 h-4 text-[#244A70]" /> },
  { id: 'c-web3', title: 'Blockchain & Web3 Administration', category: 'Web3 & Financials', route: '/admin/web3', icon: <Wallet className="w-4 h-4 text-[#244A70]" /> },
  { id: 'c-inv', title: 'Enterprise Invoices & Billing', category: 'Web3 & Financials', route: '/billing/invoices', icon: <FileText className="w-4 h-4 text-[#244A70]" /> },
  { id: 'c-roles', title: 'User Roles & RBAC Matrix', category: 'Administration', route: '/admin/users/roles', icon: <Shield className="w-4 h-4 text-[#244A70]" /> },
  { id: 'c-audit', title: 'Security Audit Logs', category: 'System', route: '/admin/audit-logs', icon: <FileText className="w-4 h-4 text-[#244A70]" /> },
  { id: 'c-conv', title: 'Conversion Queue & Troubleshooting', category: 'Navigation', route: '/queue', icon: <Layers className="w-4 h-4 text-[#244A70]" /> },
  { id: 'c-sett', title: 'System & Security Settings', category: 'System', route: '/admin/settings', icon: <Settings className="w-4 h-4 text-[#244A70]" /> },
  { id: 'c-leads', title: 'Leads & Sales CRM', category: 'CRM & Sales', route: '/sales/leads', icon: <Users className="w-4 h-4 text-[#244A70]" /> },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPaletteModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [serverCommands, setServerCommands] = useState<CommandItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    let active = true;
    const fetchCommands = async () => {
      try {
        const endpoint = query.trim()
          ? `/commands/search?q=${encodeURIComponent(query.trim())}`
          : '/commands/all';
        const res: any = await apiClient.get(endpoint);
        const rawItems = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
        if (active && rawItems.length > 0) {
          const mapped: CommandItem[] = rawItems.map((cmd: any) => ({
            id: cmd.id || `cmd-${Math.random()}`,
            title: cmd.label || cmd.title || 'Action',
            category: cmd.category || 'General',
            route: cmd.data?.path || cmd.route || '/',
          }));
          setServerCommands(mapped);
          return;
        }
      } catch {
        // Fallback to default commands
      }
      if (active) {
        setServerCommands([]);
      }
    };

    const timer = setTimeout(fetchCommands, 150);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, query]);

  // Merge server and default commands
  const allCommands = serverCommands.length > 0 ? serverCommands : DEFAULT_COMMANDS;

  const filtered = allCommands.filter((item) =>
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-[#14263F]/70 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white rounded-lg border border-[#DCE3EC] shadow-2xl overflow-hidden animate-fade-in"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#DCE3EC] bg-[#F8FAFC]">
          <Search className="w-4 h-4 text-[#8491A3]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a module, action, or route (e.g. Invoices, Web3, Roles)..."
            className="w-full bg-transparent text-xs font-medium text-[#17263A] placeholder:text-[#8491A3] focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white border border-[#DCE3EC] text-[#8491A3]">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-0.5">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#8491A3]">
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
                  className={`flex items-center justify-between px-3 py-2 rounded-md text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#EEF1F6] text-[#244A70] font-semibold' : 'hover:bg-[#F8FAFC] text-[#17263A]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded bg-white border border-[#DCE3EC] shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <div className="font-semibold">{item.title}</div>
                      <div className="text-[10px] text-[#8491A3]">{item.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#8491A3]">{item.route}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#8491A3]" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2 border-t border-[#DCE3EC] bg-[#F8FAFC] flex items-center justify-between text-[11px] text-[#8491A3]">
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

export default CommandPaletteModal;
