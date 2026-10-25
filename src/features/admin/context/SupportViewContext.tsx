import React, { createContext, useContext, useEffect } from 'react';

export interface SupportOrg {
  id: string;
  name: string;
  contactEmail?: string;
  domain?: string;
}

interface SupportViewContextType {
  isSupportReadOnly: boolean;
  supportOrg: SupportOrg | null;
  exitSupportView: () => void;
}

export const SUPPORT_VIEW_UNAVAILABLE_MESSAGE = 'Support View is currently unavailable.';

// Cleanup only. Client storage is never evidence of an authorized support session.
const clearLegacySupportView = () => {
  for (const key of ['alsm_support_view', 'alsm_impersonation']) {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage may be unavailable. The context still remains inactive.
    }
  }
};

// No entry API until the backend provides a verified support-session lifecycle.
const inactiveSupportView: SupportViewContextType = {
  isSupportReadOnly: false,
  supportOrg: null,
  exitSupportView: clearLegacySupportView,
};

const SupportViewContext = createContext<SupportViewContextType>(inactiveSupportView);

export const SupportViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(clearLegacySupportView, []);

  return (
    <SupportViewContext.Provider value={inactiveSupportView}>
      {children}
    </SupportViewContext.Provider>
  );
};

export const useSupportView = () => useContext(SupportViewContext);
