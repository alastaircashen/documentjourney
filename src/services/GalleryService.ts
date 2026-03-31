import { SPFI, spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import { TenantPropertyService } from './TenantPropertyService';
import { ListService } from './ListService';
import { LISTS } from '../constants';
import { IJourney } from '../models/IJourney';
import { IStep } from '../models/IStep';

export class GalleryService {
  private listService: ListService;

  constructor(
    private sp: SPFI,
    private tenantPropertyService: TenantPropertyService,
    private spfxContext: any
  ) {
    this.listService = new ListService(sp);
  }

  public async isGalleryConfigured(): Promise<boolean> {
    const url = await this.tenantPropertyService.getGallerySiteUrl();
    return !!url;
  }

  public async getGalleryJourneys(): Promise<IJourney[]> {
    const gallerySiteUrl = await this.tenantPropertyService.getGallerySiteUrl();
    if (!gallerySiteUrl) return [];

    try {
      const gallerySp = spfi(gallerySiteUrl).using(SPFx(this.spfxContext));
      const galleryListService = new ListService(gallerySp);
      return galleryListService.getItems<IJourney>(LISTS.Journeys);
    } catch {
      return [];
    }
  }

  public async importJourney(journeyId: number): Promise<void> {
    const gallerySiteUrl = await this.tenantPropertyService.getGallerySiteUrl();
    if (!gallerySiteUrl) return;

    const gallerySp = spfi(gallerySiteUrl).using(SPFx(this.spfxContext));
    const galleryListService = new ListService(gallerySp);

    // Read journey and steps from gallery
    const journey = await galleryListService.getItemById<IJourney>(LISTS.Journeys, journeyId);
    const steps = await galleryListService.getItems<IStep>(
      LISTS.Steps,
      `JourneyId eq ${journeyId}`,
      undefined,
      'StepOrder'
    );

    // Create local copy
    const localJourney = await this.listService.addItem(LISTS.Journeys, {
      Title: journey.Title,
      Description: journey.Description,
      IsDefault: false,
      LibraryScope: '',
    });

    for (const step of steps) {
      await this.listService.addItem(LISTS.Steps, {
        Title: step.Title,
        JourneyId: localJourney.Id,
        StepOrder: step.StepOrder,
        StepType: step.StepType,
        AssignedTo: typeof step.AssignedTo === 'string' ? step.AssignedTo : JSON.stringify(step.AssignedTo),
        CompletionRule: step.CompletionRule,
        RequireComments: step.RequireComments,
        AllowReject: step.AllowReject,
        DueDays: step.DueDays,
      });
    }
  }
}
