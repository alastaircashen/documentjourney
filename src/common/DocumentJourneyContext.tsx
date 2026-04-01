import * as React from 'react';
import { SPFI, spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import '@pnp/sp/fields';
import '@pnp/sp/site-users';
import { ListService } from '../services/ListService';
import { JourneyService } from '../services/JourneyService';
import { SchemaService } from '../services/SchemaService';
import { TenantPropertyService } from '../services/TenantPropertyService';
import { GalleryService } from '../services/GalleryService';
import { FlowTriggerService } from '../services/FlowTriggerService';

/** Minimal typing for MSGraphClientV3 — avoids importing the full SPFx typings */
export interface IGraphClient {
  api(path: string): {
    filter(f: string): any;
    select(s: string): any;
    top(n: number): any;
    get(): Promise<any>;
  };
}

export interface IDocumentJourneyContext {
  sp: SPFI;
  listService: ListService;
  journeyService: JourneyService;
  schemaService: SchemaService;
  tenantPropertyService: TenantPropertyService;
  galleryService: GalleryService;
  flowTriggerService: FlowTriggerService;
  graphClient: IGraphClient | undefined;
}

const DocumentJourneyContext = React.createContext<IDocumentJourneyContext | null>(null);

export const useDocumentJourney = (): IDocumentJourneyContext => {
  const ctx = React.useContext(DocumentJourneyContext);
  if (!ctx) {
    throw new Error('useDocumentJourney must be used within a DocumentJourneyProvider');
  }
  return ctx;
};

export interface IDocumentJourneyProviderProps {
  context: any;
  children?: React.ReactNode;
}

export const DocumentJourneyProvider: React.FC<IDocumentJourneyProviderProps> = ({ context, children }) => {
  const [graphClient, setGraphClient] = React.useState<IGraphClient | undefined>(undefined);

  React.useEffect(() => {
    // Initialize MSGraphClientV3 asynchronously
    if (context.msGraphClientFactory) {
      context.msGraphClientFactory.getClient('3')
        .then((client: IGraphClient) => setGraphClient(client))
        .catch(() => { /* Graph client not available */ });
    }
  }, [context]);

  const value = React.useMemo<IDocumentJourneyContext>(() => {
    const sp = spfi().using(SPFx(context));
    const listService = new ListService(sp);
    const tenantPropertyService = new TenantPropertyService(sp);
    const journeyService = new JourneyService(sp);
    const schemaService = new SchemaService(sp);
    const galleryService = new GalleryService(sp, context);
    const flowTriggerService = new FlowTriggerService(sp, context.httpClient);

    return {
      sp,
      listService,
      journeyService,
      schemaService,
      tenantPropertyService,
      galleryService,
      flowTriggerService,
      graphClient,
    };
  }, [context, graphClient]);

  return (
    <DocumentJourneyContext.Provider value={value}>
      {children}
    </DocumentJourneyContext.Provider>
  );
};
