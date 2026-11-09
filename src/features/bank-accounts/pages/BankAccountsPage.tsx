import React from 'react';
import { BankAccountsSection } from '../components/BankAccountsSection';

export const BankAccountsPage: React.FC = () => {
  return (
    <div className="w-full space-y-6">
      <BankAccountsSection showHeader={true} />
    </div>
  );
};

export default BankAccountsPage;
