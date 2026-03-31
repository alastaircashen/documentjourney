import { SPFI } from '@pnp/sp';
import { ListService } from './ListService';
import { FlowTriggerService } from './FlowTriggerService';
import { TenantPropertyService } from './TenantPropertyService';
import { LISTS, JourneyStatus, StepStatus, ActionType } from '../constants';
import { IJourney } from '../models/IJourney';
import { IStep } from '../models/IStep';
import { IHistory } from '../models/IHistory';
import { IStepHistory } from '../models/IStepHistory';

export interface SelectedDocument {
  id: number;
  name: string;
  url: string;
  libraryId: string;
}

export class JourneyService {
  private listService: ListService;
  private flowService: FlowTriggerService;

  constructor(private sp: SPFI, tenantPropertyService: TenantPropertyService) {
    this.listService = new ListService(sp);
    this.flowService = new FlowTriggerService(tenantPropertyService);
  }

  public async getJourneys(libraryScope?: string): Promise<IJourney[]> {
    const filter = libraryScope
      ? `IsDefault eq 1 or LibraryScope eq '${libraryScope}'`
      : `IsDefault eq 1`;
    return this.listService.getItems<IJourney>(LISTS.Journeys, filter);
  }

  public async getSteps(journeyId: number): Promise<IStep[]> {
    return this.listService.getItems<IStep>(
      LISTS.Steps,
      `JourneyId eq ${journeyId}`,
      undefined,
      'StepOrder'
    );
  }

  public async startJourney(
    journey: IJourney,
    steps: IStep[],
    documents: SelectedDocument[],
    currentUserEmail: string
  ): Promise<void> {
    for (const doc of documents) {
      // Create history record
      const history = await this.listService.addItem(LISTS.History, {
        Title: `${journey.Title} - ${doc.name}`,
        JourneyId: journey.Id,
        JourneyTitle: journey.Title,
        DocumentUrl: doc.url,
        DocumentName: doc.name,
        LibraryId: doc.libraryId,
        Status: JourneyStatus.Active,
        CurrentStepOrder: 1,
        TotalSteps: steps.length,
        InitiatedBy: currentUserEmail,
        InitiatedDate: new Date().toISOString(),
      });

      // Create step history records for all steps
      for (const step of steps) {
        await this.listService.addItem(LISTS.StepHistory, {
          Title: `${step.Title} - ${doc.name}`,
          HistoryId: history.Id,
          StepId: step.Id,
          StepTitle: step.Title,
          StepOrder: step.StepOrder,
          StepType: step.StepType,
          Status: step.StepOrder === 1 ? StepStatus.InProgress : StepStatus.Pending,
          AssignedTo: typeof step.AssignedTo === 'string' ? step.AssignedTo : JSON.stringify(step.AssignedTo),
          DueDate: step.DueDays > 0
            ? new Date(Date.now() + step.DueDays * 86400000).toISOString()
            : null,
        });
      }

      // Trigger the first step's flow
      if (steps.length > 0) {
        await this.flowService.triggerStep(steps[0], history.Id, doc);
      }
    }
  }

  public async getMyPendingSteps(currentUserEmail: string): Promise<(IStepHistory & { DocumentName: string; DocumentUrl: string; JourneyTitle: string })[]> {
    const stepHistories = await this.listService.getItems<IStepHistory>(
      LISTS.StepHistory,
      `Status eq 'InProgress'`
    );

    // Filter to steps assigned to current user
    const mySteps = stepHistories.filter(sh => {
      const assigned = typeof sh.AssignedTo === 'string' ? JSON.parse(sh.AssignedTo) : sh.AssignedTo;
      return assigned.includes(currentUserEmail);
    });

    // Enrich with history data
    const enriched = [];
    for (const step of mySteps) {
      const history = await this.listService.getItemById<IHistory>(LISTS.History, step.HistoryId);
      enriched.push({
        ...step,
        DocumentName: history.DocumentName,
        DocumentUrl: history.DocumentUrl,
        JourneyTitle: history.JourneyTitle,
      });
    }

    return enriched;
  }

  public async getJourneysIStarted(currentUserEmail: string): Promise<IHistory[]> {
    return this.listService.getItems<IHistory>(
      LISTS.History,
      `InitiatedBy eq '${currentUserEmail}'`,
      undefined,
      'InitiatedDate',
    );
  }

  public async getAllActiveJourneys(): Promise<IHistory[]> {
    return this.listService.getItems<IHistory>(
      LISTS.History,
      `Status eq 'Active'`,
      undefined,
      'InitiatedDate',
    );
  }

  public async completeStep(stepHistoryId: number, actionBy: string, actionType: ActionType, comments?: string): Promise<void> {
    await this.listService.updateItem(LISTS.StepHistory, stepHistoryId, {
      Status: StepStatus.Completed,
      ActionBy: actionBy,
      ActionType: actionType,
      ActionDate: new Date().toISOString(),
      Comments: comments || null,
    });

    // Advance journey to next step
    const stepHistory = await this.listService.getItemById<IStepHistory>(LISTS.StepHistory, stepHistoryId);
    await this.advanceJourney(stepHistory.HistoryId, stepHistory.StepOrder);
  }

  public async rejectStep(stepHistoryId: number, actionBy: string, comments?: string): Promise<void> {
    await this.listService.updateItem(LISTS.StepHistory, stepHistoryId, {
      Status: StepStatus.Rejected,
      ActionBy: actionBy,
      ActionType: ActionType.Rejected,
      ActionDate: new Date().toISOString(),
      Comments: comments || null,
    });

    const stepHistory = await this.listService.getItemById<IStepHistory>(LISTS.StepHistory, stepHistoryId);
    await this.listService.updateItem(LISTS.History, stepHistory.HistoryId, {
      Status: JourneyStatus.Rejected,
      CompletedDate: new Date().toISOString(),
    });
  }

  public async getStepHistoryForJourney(historyId: number): Promise<IStepHistory[]> {
    return this.listService.getItems<IStepHistory>(
      LISTS.StepHistory,
      `HistoryId eq ${historyId}`,
      undefined,
      'StepOrder'
    );
  }

  private async advanceJourney(historyId: number, completedStepOrder: number): Promise<void> {
    const history = await this.listService.getItemById<IHistory>(LISTS.History, historyId);
    const nextOrder = completedStepOrder + 1;

    if (nextOrder > history.TotalSteps) {
      // Journey complete
      await this.listService.updateItem(LISTS.History, historyId, {
        Status: JourneyStatus.Completed,
        CompletedDate: new Date().toISOString(),
      });
      return;
    }

    // Activate next step
    await this.listService.updateItem(LISTS.History, historyId, {
      CurrentStepOrder: nextOrder,
    });

    const nextSteps = await this.listService.getItems<IStepHistory>(
      LISTS.StepHistory,
      `HistoryId eq ${historyId} and StepOrder eq ${nextOrder}`
    );
    if (nextSteps.length > 0) {
      await this.listService.updateItem(LISTS.StepHistory, nextSteps[0].Id, {
        Status: StepStatus.InProgress,
      });
    }
  }
}
