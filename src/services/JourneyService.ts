import { SPFI } from '@pnp/sp';
import '@pnp/sp/site-users';
import '@pnp/sp/files';
import '@pnp/sp/files/web';
import { LISTS, JourneyStatus, StepStatus, StepType, ActionType, DJ_STATUS_FIELD_NAME, DJ_STATUS_FIELD_XML } from '../constants';
import { IJourney } from '../models/IJourney';
import { IStep } from '../models/IStep';
import { IHistory } from '../models/IHistory';
import { IStepHistory } from '../models/IStepHistory';
import { ListService } from './ListService';

export interface ISelectedDocument {
  name: string;
  url: string;
  libraryUrl: string;
}

function generateGuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Builds the pipe-delimited DJStatus column value.
 * Format: "displayText|historyId|status"
 */
function buildDJStatusValue(journeyName: string, stepName: string, stepOrder: number, totalSteps: number, historyId: number, status: JourneyStatus): string {
  let displayText: string;
  if (status === JourneyStatus.Active) {
    displayText = `${journeyName} - ${stepName} (Step ${stepOrder} of ${totalSteps})`;
  } else {
    displayText = `${journeyName} - ${status}`;
  }
  return `${displayText}|${historyId}|${status}`;
}

export class JourneyService {
  private listService: ListService;

  constructor(private sp: SPFI) {
    this.listService = new ListService(sp);
  }

  public async getJourneys(libraryUrl?: string): Promise<IJourney[]> {
    const filter = "IsActive eq 1";
    const journeys = await this.listService.getItems<IJourney>(LISTS.Journeys, filter);

    return journeys.filter(j =>
      !j.LibraryScope || j.LibraryScope === '' || j.LibraryScope === libraryUrl
    );
  }

  public async getSteps(journeyId: number): Promise<IStep[]> {
    return this.listService.getItems<IStep>(
      LISTS.Steps,
      `JourneyId eq ${journeyId}`,
      undefined,
      'StepOrder'
    );
  }

  public async checkActiveJourneys(documentUrls: string[]): Promise<IHistory[]> {
    const results: IHistory[] = [];
    for (const url of documentUrls) {
      const histories = await this.listService.getItems<IHistory>(
        LISTS.History,
        `DocumentUrl eq '${url}' and Status eq 'Active'`
      );
      results.push(...histories);
    }
    return results;
  }

  public async startJourney(
    journey: IJourney,
    steps: IStep[],
    documents: ISelectedDocument[],
    currentUserId: number
  ): Promise<void> {
    // Ensure DJStatus field exists on the target library
    if (documents.length > 0) {
      await this.listService.ensureFieldOnLibrary(documents[0].libraryUrl, DJ_STATUS_FIELD_XML, DJ_STATUS_FIELD_NAME);
    }

    const batchId = generateGuid();

    for (const doc of documents) {
      // Create history record
      const history = await this.listService.addItem<{ Id: number }>(LISTS.History, {
        Title: `${journey.Title} - ${doc.name}`,
        JourneyId: journey.Id,
        JourneyName: journey.Title,
        JourneyVersion: journey.Version || 1,
        JourneyBatchId: batchId,
        DocumentUrl: doc.url,
        DocumentName: doc.name,
        LibraryUrl: doc.libraryUrl,
        Status: JourneyStatus.Active,
        CurrentStepOrder: 1,
        TotalSteps: steps.length,
        InitiatedById: currentUserId,
        InitiatedDate: new Date().toISOString()
      });

      // Snapshot step definitions into StepHistory records
      for (const step of steps) {
        const dueDate = step.DueDays > 0
          ? new Date(Date.now() + step.DueDays * 86400000).toISOString()
          : '';

        await this.listService.addItem(LISTS.StepHistory, {
          Title: `${history.Id}-${step.StepOrder}`,
          HistoryId: history.Id,
          StepOrder: step.StepOrder,
          StepName: step.Title,
          StepType: step.StepType,
          AssignedToId: step.AssignedToId?.length ? { results: step.AssignedToId } : undefined,
          CompletionRule: step.CompletionRule,
          RequireComments: step.RequireComments,
          AllowReject: step.AllowReject,
          AllowDelegate: step.AllowDelegate,
          Status: StepStatus.Pending,
          DueDate: dueDate || undefined
        });
      }

      // Write DJStatus column on the document library item
      const firstStep = steps[0];
      await this.updateDJStatus(
        doc.libraryUrl,
        doc.url,
        buildDJStatusValue(journey.Title, firstStep.Title, 1, steps.length, history.Id, JourneyStatus.Active)
      );

      // Auto-complete first step if it's Notification or Complete
      if (firstStep.StepType === StepType.Notification || firstStep.StepType === StepType.Complete) {
        const firstStepHistories = await this.listService.getItems<IStepHistory>(
          LISTS.StepHistory,
          `HistoryId eq ${history.Id} and StepOrder eq 1`
        );
        if (firstStepHistories.length > 0) {
          await this.listService.updateItem(LISTS.StepHistory, firstStepHistories[0].Id, {
            Status: StepStatus.Completed,
            ActionDate: new Date().toISOString(),
            Comments: 'Auto-completed'
          });
          await this.advanceJourney(firstStepHistories[0].Id);
        }
      }
    }
  }

  public async getMyPendingSteps(userId: number): Promise<(IStepHistory & { history?: IHistory })[]> {
    const stepHistories = await this.listService.getItems<IStepHistory>(
      LISTS.StepHistory,
      `Status eq 'Pending'`
    );

    // Get associated history records for active journeys at the right step
    const results: (IStepHistory & { history?: IHistory })[] = [];
    for (const sh of stepHistories) {
      try {
        const history = await this.listService.getItemById<IHistory>(LISTS.History, sh.HistoryId);
        if (history.Status === JourneyStatus.Active && history.CurrentStepOrder === sh.StepOrder) {
          results.push({ ...sh, history });
        }
      } catch {
        // History record not found, skip
      }
    }

    return results;
  }

  public async getJourneysIStarted(userId: number): Promise<IHistory[]> {
    return this.listService.getItems<IHistory>(
      LISTS.History,
      `InitiatedById eq ${userId}`,
      undefined,
      'InitiatedDate',
    );
  }

  public async getAllActiveJourneys(): Promise<IHistory[]> {
    return this.listService.getItems<IHistory>(
      LISTS.History,
      `Status eq 'Active'`,
      undefined,
      'InitiatedDate'
    );
  }

  public async getJourneyStepHistory(historyId: number): Promise<IStepHistory[]> {
    return this.listService.getItems<IStepHistory>(
      LISTS.StepHistory,
      `HistoryId eq ${historyId}`,
      undefined,
      'StepOrder'
    );
  }

  public async completeStep(stepHistoryId: number, userId: number, comments?: string): Promise<void> {
    await this.listService.updateItem(LISTS.StepHistory, stepHistoryId, {
      Status: StepStatus.Completed,
      ActionById: userId,
      ActionDate: new Date().toISOString(),
      Comments: comments || ''
    });

    await this.advanceJourney(stepHistoryId);
  }

  public async rejectStep(stepHistoryId: number, userId: number, comments?: string): Promise<void> {
    const stepHistory = await this.listService.getItemById<IStepHistory>(LISTS.StepHistory, stepHistoryId);

    await this.listService.updateItem(LISTS.StepHistory, stepHistoryId, {
      Status: StepStatus.Rejected,
      ActionById: userId,
      ActionDate: new Date().toISOString(),
      Comments: comments || ''
    });

    // Mark the journey as rejected
    const history = await this.listService.getItemById<IHistory>(LISTS.History, stepHistory.HistoryId);
    await this.listService.updateItem(LISTS.History, stepHistory.HistoryId, {
      Status: JourneyStatus.Rejected,
      CompletedDate: new Date().toISOString()
    });

    // Update DJStatus on the document
    await this.updateDJStatus(
      history.LibraryUrl,
      history.DocumentUrl,
      buildDJStatusValue(history.JourneyName, '', 0, 0, history.Id, JourneyStatus.Rejected)
    );
  }

  public async delegateStep(stepHistoryId: number, newAssigneeId: number, delegatedById: number): Promise<void> {
    const stepHistory = await this.listService.getItemById<IStepHistory>(LISTS.StepHistory, stepHistoryId);

    await this.listService.updateItem(LISTS.StepHistory, stepHistoryId, {
      AssignedToId: { results: [newAssigneeId] },
      DelegatedFrom: stepHistory.AssignedToId?.[0] || delegatedById,
      DelegatedBy: delegatedById,
      DelegatedDate: new Date().toISOString()
    });
  }

  public async cancelJourney(historyId: number, reason?: string): Promise<void> {
    const history = await this.listService.getItemById<IHistory>(LISTS.History, historyId);

    // Mark all pending steps as skipped
    const stepHistories = await this.listService.getItems<IStepHistory>(
      LISTS.StepHistory,
      `HistoryId eq ${historyId} and Status eq 'Pending'`
    );
    for (const sh of stepHistories) {
      await this.listService.updateItem(LISTS.StepHistory, sh.Id, {
        Status: StepStatus.Skipped
      });
    }

    // Mark journey as cancelled
    await this.listService.updateItem(LISTS.History, historyId, {
      Status: JourneyStatus.Cancelled,
      CompletedDate: new Date().toISOString(),
      CancellationReason: reason || ''
    });

    // Update DJStatus on the document
    await this.updateDJStatus(
      history.LibraryUrl,
      history.DocumentUrl,
      buildDJStatusValue(history.JourneyName, '', 0, 0, history.Id, JourneyStatus.Cancelled)
    );
  }

  private async advanceJourney(stepHistoryId: number): Promise<void> {
    const stepHistory = await this.listService.getItemById<IStepHistory>(LISTS.StepHistory, stepHistoryId);
    const history = await this.listService.getItemById<IHistory>(LISTS.History, stepHistory.HistoryId);

    if (stepHistory.StepOrder >= history.TotalSteps) {
      // Journey complete
      await this.listService.updateItem(LISTS.History, history.Id, {
        Status: JourneyStatus.Completed,
        CompletedDate: new Date().toISOString()
      });

      await this.updateDJStatus(
        history.LibraryUrl,
        history.DocumentUrl,
        buildDJStatusValue(history.JourneyName, '', 0, 0, history.Id, JourneyStatus.Completed)
      );
    } else {
      // Advance to next step
      const nextStepOrder = stepHistory.StepOrder + 1;
      await this.listService.updateItem(LISTS.History, history.Id, {
        CurrentStepOrder: nextStepOrder
      });

      // Get the next step
      const nextSteps = await this.listService.getItems<IStepHistory>(
        LISTS.StepHistory,
        `HistoryId eq ${history.Id} and StepOrder eq ${nextStepOrder}`
      );
      const nextStep = nextSteps[0];

      // Auto-complete Notification and Complete steps — they don't require user action
      if (nextStep && (nextStep.StepType === StepType.Notification || nextStep.StepType === StepType.Complete)) {
        await this.listService.updateItem(LISTS.StepHistory, nextStep.Id, {
          Status: StepStatus.Completed,
          ActionDate: new Date().toISOString(),
          Comments: nextStep.StepType === StepType.Notification ? 'Auto-notified' : 'Journey completed'
        });
        // Recurse to advance past this auto-completed step
        await this.advanceJourney(nextStep.Id);
        return;
      }

      await this.updateDJStatus(
        history.LibraryUrl,
        history.DocumentUrl,
        buildDJStatusValue(history.JourneyName, nextStep?.StepName || `Step ${nextStepOrder}`, nextStepOrder, history.TotalSteps, history.Id, JourneyStatus.Active)
      );
    }
  }

  /**
   * Writes the DJStatus column value on a document library item.
   */
  private async updateDJStatus(libraryUrl: string, documentUrl: string, statusValue: string): Promise<void> {
    try {
      const file = this.sp.web.getFileByServerRelativePath(documentUrl);
      const item = await file.getItem('Id');
      const itemId = (item as any).Id;

      try {
        await this.sp.web.getList(libraryUrl).items.getById(itemId).update({
          [DJ_STATUS_FIELD_NAME]: statusValue
        });
      } catch {
        // Field might not be ready yet — ensure it exists and retry once
        await this.listService.ensureFieldOnLibrary(libraryUrl, DJ_STATUS_FIELD_XML);
        // Small delay for SharePoint schema cache
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.sp.web.getList(libraryUrl).items.getById(itemId).update({
          [DJ_STATUS_FIELD_NAME]: statusValue
        });
      }
    } catch (err) {
      // Non-fatal: column update failure shouldn't block journey operations
      console.warn(`Failed to update DJStatus for ${documentUrl}:`, err);
    }
  }
}
