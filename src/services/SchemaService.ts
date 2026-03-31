import { SPFI } from '@pnp/sp';
import { ListService } from './ListService';
import { LISTS, EXPECTED_SCHEMA_VERSION, StepType, CompletionRule } from '../constants';
import { IConfig } from '../models/IConfig';

export interface SchemaStatus {
  needsInstall: boolean;
  needsUpgrade: boolean;
  currentVersion: number;
  expectedVersion: number;
}

export class SchemaService {
  private listService: ListService;

  constructor(private sp: SPFI) {
    this.listService = new ListService(sp);
  }

  public async checkSchema(): Promise<SchemaStatus> {
    try {
      const configs = await this.listService.getItems<IConfig>(
        LISTS.Config,
        "Title eq 'SchemaVersion'"
      );

      if (configs.length === 0) {
        return { needsInstall: true, needsUpgrade: false, currentVersion: 0, expectedVersion: EXPECTED_SCHEMA_VERSION };
      }

      const currentVersion = parseInt(configs[0].Value, 10);
      return {
        needsInstall: false,
        needsUpgrade: currentVersion < EXPECTED_SCHEMA_VERSION,
        currentVersion,
        expectedVersion: EXPECTED_SCHEMA_VERSION,
      };
    } catch {
      return { needsInstall: true, needsUpgrade: false, currentVersion: 0, expectedVersion: EXPECTED_SCHEMA_VERSION };
    }
  }

  public async ensureSchema(): Promise<void> {
    const status = await this.checkSchema();

    if (status.needsInstall) {
      await this.freshInstall();
    } else if (status.needsUpgrade) {
      await this.runMigrations(status.currentVersion);
    }
  }

  private async freshInstall(): Promise<void> {
    // Create DJ_Config
    await this.listService.ensureList(LISTS.Config, 'Document Journey configuration');
    await this.ensureConfigFields();

    // Create DJ_Journeys
    await this.listService.ensureList(LISTS.Journeys, 'Journey definitions');
    await this.ensureJourneyFields();

    // Create DJ_Steps
    await this.listService.ensureList(LISTS.Steps, 'Journey step definitions');
    await this.ensureStepFields();

    // Create DJ_History
    await this.listService.ensureList(LISTS.History, 'Journey execution history');
    await this.ensureHistoryFields();

    // Create DJ_StepHistory
    await this.listService.ensureList(LISTS.StepHistory, 'Step execution history');
    await this.ensureStepHistoryFields();

    // Set schema version
    await this.listService.addItem(LISTS.Config, { Title: 'SchemaVersion', Value: String(EXPECTED_SCHEMA_VERSION) });

    // Seed default journeys
    await this.seedDefaults();
  }

  private async ensureConfigFields(): Promise<void> {
    await this.listService.ensureField(LISTS.Config,
      '<Field Type="Text" DisplayName="Value" Name="Value" Required="TRUE" />'
    );
  }

  private async ensureJourneyFields(): Promise<void> {
    const fields = [
      '<Field Type="Note" DisplayName="Description" Name="Description" />',
      '<Field Type="Boolean" DisplayName="IsDefault" Name="IsDefault"><Default>0</Default></Field>',
      '<Field Type="Text" DisplayName="LibraryScope" Name="LibraryScope" />',
    ];
    for (const xml of fields) {
      await this.listService.ensureField(LISTS.Journeys, xml);
    }
  }

  private async ensureStepFields(): Promise<void> {
    const fields = [
      '<Field Type="Number" DisplayName="JourneyId" Name="JourneyId" Required="TRUE" />',
      '<Field Type="Number" DisplayName="StepOrder" Name="StepOrder" Required="TRUE" />',
      '<Field Type="Choice" DisplayName="StepType" Name="StepType" Required="TRUE"><CHOICES><CHOICE>Notification</CHOICE><CHOICE>Approval</CHOICE><CHOICE>Signature</CHOICE><CHOICE>Task</CHOICE><CHOICE>Feedback</CHOICE></CHOICES></Field>',
      '<Field Type="Note" DisplayName="AssignedTo" Name="AssignedTo" />',
      '<Field Type="Choice" DisplayName="CompletionRule" Name="CompletionRule"><CHOICES><CHOICE>All</CHOICE><CHOICE>One</CHOICE></CHOICES><Default>All</Default></Field>',
      '<Field Type="Boolean" DisplayName="RequireComments" Name="RequireComments"><Default>0</Default></Field>',
      '<Field Type="Boolean" DisplayName="AllowReject" Name="AllowReject"><Default>1</Default></Field>',
      '<Field Type="Number" DisplayName="DueDays" Name="DueDays" />',
    ];
    for (const xml of fields) {
      await this.listService.ensureField(LISTS.Steps, xml);
    }
  }

  private async ensureHistoryFields(): Promise<void> {
    const fields = [
      '<Field Type="Number" DisplayName="JourneyId" Name="JourneyId" Required="TRUE" />',
      '<Field Type="Text" DisplayName="JourneyTitle" Name="JourneyTitle" />',
      '<Field Type="URL" DisplayName="DocumentUrl" Name="DocumentUrl" />',
      '<Field Type="Text" DisplayName="DocumentName" Name="DocumentName" />',
      '<Field Type="Text" DisplayName="LibraryId" Name="LibraryId" />',
      '<Field Type="Choice" DisplayName="Status" Name="Status"><CHOICES><CHOICE>Active</CHOICE><CHOICE>Completed</CHOICE><CHOICE>Rejected</CHOICE><CHOICE>Cancelled</CHOICE></CHOICES><Default>Active</Default></Field>',
      '<Field Type="Number" DisplayName="CurrentStepOrder" Name="CurrentStepOrder"><Default>1</Default></Field>',
      '<Field Type="Number" DisplayName="TotalSteps" Name="TotalSteps" />',
      '<Field Type="Text" DisplayName="InitiatedBy" Name="InitiatedBy" />',
      '<Field Type="DateTime" DisplayName="InitiatedDate" Name="InitiatedDate" />',
      '<Field Type="DateTime" DisplayName="CompletedDate" Name="CompletedDate" />',
    ];
    for (const xml of fields) {
      await this.listService.ensureField(LISTS.History, xml);
    }
  }

  private async ensureStepHistoryFields(): Promise<void> {
    const fields = [
      '<Field Type="Number" DisplayName="HistoryId" Name="HistoryId" Required="TRUE" />',
      '<Field Type="Number" DisplayName="StepId" Name="StepId" Required="TRUE" />',
      '<Field Type="Text" DisplayName="StepTitle" Name="StepTitle" />',
      '<Field Type="Number" DisplayName="StepOrder" Name="StepOrder" />',
      '<Field Type="Choice" DisplayName="StepType" Name="StepType"><CHOICES><CHOICE>Notification</CHOICE><CHOICE>Approval</CHOICE><CHOICE>Signature</CHOICE><CHOICE>Task</CHOICE><CHOICE>Feedback</CHOICE></CHOICES></Field>',
      '<Field Type="Choice" DisplayName="Status" Name="Status"><CHOICES><CHOICE>Pending</CHOICE><CHOICE>InProgress</CHOICE><CHOICE>Completed</CHOICE><CHOICE>Rejected</CHOICE><CHOICE>Skipped</CHOICE></CHOICES><Default>Pending</Default></Field>',
      '<Field Type="Note" DisplayName="AssignedTo" Name="AssignedTo" />',
      '<Field Type="Text" DisplayName="ActionBy" Name="ActionBy" />',
      '<Field Type="Choice" DisplayName="ActionType" Name="ActionType"><CHOICES><CHOICE>Approved</CHOICE><CHOICE>Rejected</CHOICE><CHOICE>Completed</CHOICE><CHOICE>Signed</CHOICE><CHOICE>FeedbackProvided</CHOICE><CHOICE>Notified</CHOICE></CHOICES></Field>',
      '<Field Type="DateTime" DisplayName="ActionDate" Name="ActionDate" />',
      '<Field Type="Note" DisplayName="Comments" Name="Comments" />',
      '<Field Type="DateTime" DisplayName="DueDate" Name="DueDate" />',
    ];
    for (const xml of fields) {
      await this.listService.ensureField(LISTS.StepHistory, xml);
    }
  }

  private async seedDefaults(): Promise<void> {
    // Simple Approval journey
    const approval = await this.listService.addItem(LISTS.Journeys, {
      Title: 'Simple Approval',
      Description: 'Send a document for approval. One approver reviews and approves or rejects.',
      IsDefault: true,
      LibraryScope: '',
    });

    await this.listService.addItem(LISTS.Steps, {
      Title: 'Request Approval',
      JourneyId: approval.Id,
      StepOrder: 1,
      StepType: StepType.Approval,
      AssignedTo: JSON.stringify([]),
      CompletionRule: CompletionRule.One,
      RequireComments: false,
      AllowReject: true,
      DueDays: 7,
    });

    await this.listService.addItem(LISTS.Steps, {
      Title: 'Notify Initiator',
      JourneyId: approval.Id,
      StepOrder: 2,
      StepType: StepType.Notification,
      AssignedTo: JSON.stringify([]),
      CompletionRule: CompletionRule.All,
      RequireComments: false,
      AllowReject: false,
      DueDays: 0,
    });

    // Request Feedback journey
    const feedback = await this.listService.addItem(LISTS.Journeys, {
      Title: 'Request Feedback',
      Description: 'Collect feedback from one or more reviewers on a document.',
      IsDefault: true,
      LibraryScope: '',
    });

    await this.listService.addItem(LISTS.Steps, {
      Title: 'Gather Feedback',
      JourneyId: feedback.Id,
      StepOrder: 1,
      StepType: StepType.Feedback,
      AssignedTo: JSON.stringify([]),
      CompletionRule: CompletionRule.All,
      RequireComments: true,
      AllowReject: false,
      DueDays: 5,
    });

    await this.listService.addItem(LISTS.Steps, {
      Title: 'Notify Initiator',
      JourneyId: feedback.Id,
      StepOrder: 2,
      StepType: StepType.Notification,
      AssignedTo: JSON.stringify([]),
      CompletionRule: CompletionRule.All,
      RequireComments: false,
      AllowReject: false,
      DueDays: 0,
    });
  }

  private migrations: Record<number, () => Promise<void>> = {
    // Future migrations go here: version number → migration fn
    // 2: async () => { /* add new field, etc */ },
  };

  private async runMigrations(fromVersion: number): Promise<void> {
    for (let v = fromVersion + 1; v <= EXPECTED_SCHEMA_VERSION; v++) {
      if (this.migrations[v]) {
        await this.migrations[v]();
      }
    }
    // Update schema version
    const configs = await this.listService.getItems<IConfig>(LISTS.Config, "Title eq 'SchemaVersion'");
    if (configs.length > 0) {
      await this.listService.updateItem(LISTS.Config, configs[0].Id, { Value: String(EXPECTED_SCHEMA_VERSION) });
    }
  }
}
