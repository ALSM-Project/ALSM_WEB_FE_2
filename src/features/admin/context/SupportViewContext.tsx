import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export interface SupportOrg {
  id: string;
  name: string;
  contactEmail?: string;
  domain?: string;
}

interface SupportViewContextType {
  isSupportReadOnly: boolean;
  supportOrg: SupportOrg | null;
  enterSupportView: (org: SupportOrg) => void;
  exitSupportView: () => void;
}

const STORAGE_KEY = 'alsm_support_view';
const LEGACY_STORAGE_KEY = 'alsm_impersonation';

const SupportViewContext = createContext<SupportViewContextType>({
  isSupportReadOnly: false,
  supportOrg: null,
  enterSupportView: () => {},
  exitSupportView: () => {},
});

export const SupportViewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supportOrg, setSupportOrg] = useState<SupportOrg | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          id: parsed.orgId || parsed.id,
          name: parsed.orgName || parsed.name,
          contactEmail: parsed.contactEmail,
          domain: parsed.domain,
        };
      }
    } catch {
      // Ignore parse errors
    }
    return null;
  });

  const isSupportReadOnly = Boolean(supportOrg);

  const syncStateFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSupportOrg({
          id: parsed.orgId || parsed.id,
          name: parsed.orgName || parsed.name,
          contactEmail: parsed.contactEmail,
          domain: parsed.domain,
        });
      } else {
        setSupportOrg(null);
      }
    } catch {
      setSupportOrg(null);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('storage', syncStateFromStorage);
    window.addEventListener('alsm-support-view-changed', syncStateFromStorage);
    return () => {
      window.removeEventListener('storage', syncStateFromStorage);
      window.removeEventListener('alsm-support-view-changed', syncStateFromStorage);
    };
  }, [syncStateFromStorage]);

  const enterSupportView = (org: SupportOrg) => {
    const payload = {
      orgId: org.id,
      orgName: org.name,
      contactEmail: org.contactEmail,
      domain: org.domain,
      readOnly: true,
      timestamp: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    setSupportOrg(org);
    window.dispatchEvent(new Event('alsm-support-view-changed'));
  };

  const exitSupportView = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    setSupportOrg(null);
    window.dispatchEvent(new Event('alsm-support-view-changed'));
  };

  return (
    <SupportViewContext.Provider
      value={{
        isSupportReadOnly,
        supportOrg,
        enterSupportView,
        exitSupportView,
      }}
    >
      {children}
    </SupportViewContext.Provider>
  );
};

export const useSupportView = () => useContext(SupportViewContext);
