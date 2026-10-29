import React, { useState } from 'react';
import { Monitor, Smartphone, Tablet, CheckCircle2 } from 'lucide-react';
import { Input, Button, Badge } from '@/shared/ui';

interface UiPreviewContainerProps {
  screenName: string;
}

export const UiPreviewContainer: React.FC<UiPreviewContainerProps> = ({ screenName }) => {
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [customerId, setCustomerId] = useState('CUST-88392');
  const [fullName, setFullName] = useState('GLOBAL LOGISTICS HOLDINGS LTD');
  const [balance, setBalance] = useState('1,245,850.00');
  const currency = 'VND';
  const [isSearching, setIsSearching] = useState(false);
  const [inquired, setInquired] = useState(true);

  const handleLookup = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
      setInquired(true);
      if (customerId.includes('1')) {
        setFullName('ACME FINANCIAL PARTNERS INC');
        setBalance('428,100.50');
      } else {
        setFullName('GLOBAL LOGISTICS HOLDINGS LTD');
        setBalance('1,245,850.00');
      }
    }, 400);
  };

  const getContainerWidth = () => {
    switch (device) {
      case 'mobile':
        return 'max-w-sm';
      case 'tablet':
        return 'max-w-lg';
      case 'desktop':
      default:
        return 'w-full';
    }
  };

  return (
    <div className="rounded-xl border border-[#DCE3EC] bg-white overflow-hidden shadow-sm">
      {/* Browser / Canvas Chrome */}
      <div className="bg-[#F8FAFC] border-b border-[#DCE3EC] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
          </div>
          <span className="text-xs font-semibold text-[#17263A] ml-2">
            Modernized UI Preview: {screenName}
          </span>
        </div>

        {/* Device Switcher */}
        <div className="flex items-center space-x-1 bg-white border border-[#DCE3EC] p-0.5 rounded-lg text-xs">
          <button
            onClick={() => setDevice('desktop')}
            className={`p-1.5 rounded flex items-center gap-1 ${
              device === 'desktop' ? 'bg-[#244A70] text-white' : 'text-[#8491A3] hover:text-[#17263A]'
            }`}
            title="Desktop view"
          >
            <Monitor className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('tablet')}
            className={`p-1.5 rounded flex items-center gap-1 ${
              device === 'tablet' ? 'bg-[#244A70] text-white' : 'text-[#8491A3] hover:text-[#17263A]'
            }`}
            title="Tablet view"
          >
            <Tablet className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setDevice('mobile')}
            className={`p-1.5 rounded flex items-center gap-1 ${
              device === 'mobile' ? 'bg-[#244A70] text-white' : 'text-[#8491A3] hover:text-[#17263A]'
            }`}
            title="Mobile view"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Preview Surface */}
      <div className="p-6 bg-[#F4F7FB] min-h-[360px] flex justify-center items-start overflow-auto">
        <div className={`${getContainerWidth()} bg-white rounded-xl shadow-md border border-[#DCE3EC] p-6 transition-all duration-300`}>
          {/* Simulated Component Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#DCE3EC] mb-5">
            <div>
              <h2 className="text-base font-bold text-[#17263A]">Customer Account Inquiry</h2>
              <p className="text-xs text-[#8491A3]">Reactive TypeScript Component with Tailwind CSS</p>
            </div>
            <Badge variant="success">Online</Badge>
          </div>

          {/* Simulated Interactive Form */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <div className="sm:col-span-2">
                <Input
                  label="Customer Identifier (CUSTINP)"
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  placeholder="Enter CUST ID..."
                />
              </div>
              <Button
                variant="primary"
                onClick={handleLookup}
                isLoading={isSearching}
                className="w-full h-10"
              >
                Inquire
              </Button>
            </div>

            {inquired && (
              <div className="mt-4 p-4 rounded-lg bg-[#F8FAFC] border border-[#DCE3EC] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-semibold text-[#8491A3]">Customer Full Name</span>
                  <span className="text-sm font-semibold text-[#17263A]">{fullName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-semibold text-[#8491A3]">Ledger Currency</span>
                  <span className="text-xs font-mono font-medium text-gray-700">{currency}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-[#DCE3EC]">
                  <span className="text-xs uppercase font-bold text-[#17263A]">Current Balance (BALANOUT)</span>
                  <span className="text-base font-mono font-bold text-emerald-600">{balance}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded mt-2">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>3270 BMS Screen fields validated & bidirectional reactive binding verified.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
