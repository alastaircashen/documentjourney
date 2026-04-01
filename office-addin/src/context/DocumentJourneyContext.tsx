import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { spfi, SPBrowser } from '@pnp/sp';
import type { SPFI } from '@pnp/sp';
import type { Timeline } from '@pnp/core';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import '@pnp/sp/site-users';
import '@pnp/sp/files';
import '@pnp/sp/files/web';
import { PublicClientApplication } from '@azure/msal-browser';
import { acquireToken } from '../auth/msalConfig';
import { ListService } from '../services/ListService';
import { JourneyService } from '../services/JourneyService';
import { TenantPropertyService } from '../services/TenantPropertyService';
import { FlowTriggerService } from '../services/FlowTriggerService';

export interface IDocumentJourneyContext {
  sp: SPFI;
  listService: ListService;
  journeyService: JourneyService;
  tenantPropertyService: TenantPropertyService;
  flowTriggerService: FlowTriggerService;
  currentUserId: number;
}

const DocumentJourneyContext = createContext<IDocumentJourneyContext | null>(null);

export const useDocumentJourney = (): IDocumentJourneyContext => {
  const ctx = useContext(DocumentJourneyContext);
  if (!ctx) {
    throw new Error('useDocumentJourney must be used within a DocumentJourneyProvider');
  }
  return ctx;
};

/**
 * Creates a PnPjs auth behavior that uses MSAL for token acquisition.
 */
function MSALAuth(msalInstance: PublicClientApplication, siteUrl: string) {
  const origin = new URL(siteUrl).origin;

  return (instance: Timeline<any>) => {
    instance.on.auth.replace(async (_url: URL, init: RequestInit) => {
      const token = await acquireToken(msalInstance, origin);
      (init.headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    });
    return instance;
  };
}

interface IProviderProps {
  siteUrl: string;
  msalInstance: PublicClientApplication;
  children: React.ReactNode;
}

export const DocumentJourneyProvider: React.FC<IProviderProps> = ({ siteUrl, msalInstance, children }) => {
  const [currentUserId, setCurrentUserId] = useState<number>(0);

  const services = useMemo(() => {
    const sp = spfi(siteUrl).using(
      SPBrowser({ baseUrl: siteUrl }),
      MSALAuth(msalInstance, siteUrl)
    );

    const listService = new ListService(sp);
    const journeyService = new JourneyService(sp);
    const tenantPropertyService = new TenantPropertyService(sp);
    const flowTriggerService = new FlowTriggerService(sp);

    return { sp, listService, journeyService, tenantPropertyService, flowTriggerService };
  }, [siteUrl, msalInstance]);

  useEffect(() => {
    services.sp.web.currentUser().then((user: any) => {
      setCurrentUserId(user.Id);
    }).catch(() => {});
  }, [services.sp]);

  const value = useMemo<IDocumentJourneyContext>(() => ({
    ...services,
    currentUserId,
  }), [services, currentUserId]);

  return (
    <DocumentJourneyContext.Provider value={value}>
      {children}
    </DocumentJourneyContext.Provider>
  );
};
