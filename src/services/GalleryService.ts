import { SPFI, spfi, SPFx as spSPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { LISTS } from '../constants';
import { IJourney } from '../models/IJourney';
import { IStep } from '../models/IStep';
import { ListService } from './ListService';
import { TenantPropertyService } from './TenantPropertyService';
import { TENANT_PROPERTY_KEYS } from '../constants';

export class GalleryService {
  private listService: ListService;
  private tenantPropertyService: TenantPropertyService;

  constructor(private sp: SPFI, private context: any) {
    this.listService = new ListService(sp);
    this.tenantPropertyService = new TenantPropertyService(sp);
  }

  public async getGalleryUrl(): Promise<string> {
    return this.tenantPropertyService.getValue(TENANT_PROPERTY_KEYS.GallerySiteUrl);
  }

  public async getGalleryJourneys(): Promise<IJourney[]> {
    const galleryUrl = await this.getGalleryUrl();
    if (!galleryUrl) {
      return [];
    }

    try {
      const gallerySp = spfi(galleryUrl).using(spSPFx(this.context));
      const galleryListService = new ListService(gallerySp);
      return galleryListService.getItems<IJourney>(LISTS.Journeys, 'IsActive eq 1');
    } catch {
      return [];
    }
  }

  public async importJourney(galleryJourneyId: number): Promise<void> {
    const galleryUrl = await this.getGalleryUrl();
    if (!galleryUrl) {
      throw new Error('Gallery URL not configured');
    }

    const gallerySp = spfi(galleryUrl).using(spSPFx(this.context));
    const galleryListService = new ListService(gallerySp);

    // Get journey from gallery
    const journey = await galleryListService.getItemById<IJourney>(LISTS.Journeys, galleryJourneyId);
    const steps = await galleryListService.getItems<IStep>(
      LISTS.Steps,
      `JourneyId eq ${galleryJourneyId}`,
      undefined,
      'StepOrder'
    );

    // Create local copy
    const newJourney = await this.listService.addItem<{ Id: number }>(LISTS.Journeys, {
      Title: journey.Title,
      Description: journey.Description,
      IsDefault: false,
      IsActive: true,
      LibraryScope: '',
      Category: journey.Category || 'Imported'
    });

    // Copy steps
    for (const step of steps) {
      await this.listService.addItem(LISTS.Steps, {
        Title: step.Title,
        JourneyId: newJourney.Id,
        StepOrder: step.StepOrder,
        StepType: step.StepType,
        CompletionRule: step.CompletionRule,
        RequireComments: step.RequireComments,
        DueDays: step.DueDays,
        AllowReject: step.AllowReject,
        AllowDelegate: step.AllowDelegate
      });
    }
  }
}
