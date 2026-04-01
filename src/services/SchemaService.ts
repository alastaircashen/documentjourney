import { SPFI } from '@pnp/sp';
import { EXPECTED_SCHEMA_VERSION, LISTS, CompletionRule, StepType, DJ_STATUS_FIELD_NAME, DJ_STATUS_FIELD_XML } from '../constants';
import { ListService } from './ListService';

export class SchemaService {
  private listService: ListService;

  constructor(private sp: SPFI) {
    this.listService = new ListService(sp);
  }

  /**
   * Fast check: reads SchemaVersion from DJ_Config list (1 REST call).
   * - Version matches EXPECTED: return immediately
   * - Version = 0 / list missing: fresh install → provision + seed
   * - Version < EXPECTED: return needsUpgrade so UI can prompt
   */
  public async ensureSchema(): Promise<{ needsUpgrade: boolean; currentVersion: number }> {
    const currentVersion = await this.getSchemaVersion();

    if (currentVersion === EXPECTED_SCHEMA_VERSION) {
      return { needsUpgrade: false, currentVersion };
    }

    if (currentVersion === 0) {
      await this.provisionLists();
      await this.seedDefaults();
      await this.setSchemaVersion(EXPECTED_SCHEMA_VERSION);
      return { needsUpgrade: false, currentVersion: EXPECTED_SCHEMA_VERSION };
    }

    return { needsUpgrade: true, currentVersion };
  }

  /**
   * Called when user clicks "Upgrade Now".
   * Runs idempotent provisioning + version-specific data migrations.
   */
  public async runMigrations(fromVersion: number): Promise<void> {
    await this.provisionLists();

    const migrations: Record<number, () => Promise<void>> = {
      2: async () => {
        // Replace old "Notify Initiator" final steps with "Complete" steps on default journeys
        const defaultJourneys = await this.listService.getItems<{ Id: number }>(
          LISTS.Journeys,
          "IsDefault eq 1"
        );
        for (const journey of defaultJourneys) {
          const steps = await this.listService.getItems<{ Id: number; StepType: string; Title: string }>(
            LISTS.Steps,
            `JourneyId eq ${journey.Id}`,
            ['Id', 'StepType', 'Title'],
            'StepOrder'
          );
          // Find the last step — if it's Notification named "Notify Initiator", convert to Complete
          const lastStep = steps[steps.length - 1];
          if (lastStep && lastStep.StepType === 'Notification') {
            await this.listService.updateItem(LISTS.Steps, lastStep.Id, {
              Title: 'Complete',
              StepType: StepType.Complete
            });
          }
          // If no Complete step exists at all, add one
          const hasComplete = steps.some(s => s.StepType === 'Complete');
          if (!hasComplete) {
            await this.listService.addItem(LISTS.Steps, {
              Title: 'Complete',
              JourneyId: journey.Id,
              StepOrder: steps.length + 1,
              StepType: StepType.Complete,
              CompletionRule: CompletionRule.All,
              RequireComments: false,
              DueDays: 0,
              AllowReject: false,
              AllowDelegate: false
            });
          }
        }
      }
    };

    for (let v = fromVersion + 1; v <= EXPECTED_SCHEMA_VERSION; v++) {
      if (migrations[v]) {
        await migrations[v]();
      }
    }

    await this.setSchemaVersion(EXPECTED_SCHEMA_VERSION);
  }

  /**
   * Ensures the DJStatus tracking column exists on a specific document library.
   * Called once per library when a journey is first started there.
   */
  public async ensureDJStatusField(libraryServerRelativeUrl: string): Promise<void> {
    await this.listService.ensureFieldOnLibrary(libraryServerRelativeUrl, DJ_STATUS_FIELD_XML, DJ_STATUS_FIELD_NAME);
  }

  private async getSchemaVersion(): Promise<number> {
    try {
      const configs = await this.listService.getItems<{ Id: number; SchemaVersion: number }>(
        LISTS.Config,
        "Title eq 'SchemaVersion'",
        ['Id', 'SchemaVersion']
      );
      if (configs.length > 0 && configs[0].SchemaVersion) {
        return configs[0].SchemaVersion;
      }
      // Config list exists but no SchemaVersion row — broken state, treat as needing upgrade
      return 0;
    } catch {
      // DJ_Config list doesn't exist — fresh install
      return 0;
    }
  }

  private async setSchemaVersion(version: number): Promise<void> {
    const configs = await this.listService.getItems<{ Id: number }>(
      LISTS.Config,
      "Title eq 'SchemaVersion'",
      ['Id']
    );
    if (configs.length > 0) {
      await this.listService.updateItem(LISTS.Config, configs[0].Id, { SchemaVersion: version });
    } else {
      await this.listService.addItem(LISTS.Config, {
        Title: 'SchemaVersion',
        SchemaVersion: version
      });
    }
  }

  private async provisionLists(): Promise<void> {
    // DJ_Config
    await this.listService.ensureList(LISTS.Config, 'Document Journey configuration');
    await this.listService.ensureField(LISTS.Config,
      '<Field Type="Note" DisplayName="Value" Name="Value" Required="FALSE" />');
    await this.listService.ensureField(LISTS.Config,
      '<Field Type="Number" DisplayName="SchemaVersion" Name="SchemaVersion" Required="FALSE" />');

    // DJ_Journeys
    await this.listService.ensureList(LISTS.Journeys, 'Journey templates');
    await this.listService.ensureField(LISTS.Journeys,
      '<Field Type="Note" DisplayName="Description" Name="Description" Required="FALSE" />');
    await this.listService.ensureField(LISTS.Journeys,
      '<Field Type="Boolean" DisplayName="IsDefault" Name="IsDefault" Required="FALSE"><Default>0</Default></Field>');
    await this.listService.ensureField(LISTS.Journeys,
      '<Field Type="Text" DisplayName="LibraryScope" Name="LibraryScope" Required="FALSE" />');
    await this.listService.ensureField(LISTS.Journeys,
      '<Field Type="Boolean" DisplayName="IsActive" Name="IsActive" Required="FALSE"><Default>1</Default></Field>');
    await this.listService.ensureField(LISTS.Journeys,
      '<Field Type="Text" DisplayName="Category" Name="Category" Required="FALSE" />');
    await this.listService.ensureField(LISTS.Journeys,
      '<Field Type="Number" DisplayName="Version" Name="Version" Required="FALSE"><Default>1</Default></Field>');

    // DJ_Steps
    await this.listService.ensureList(LISTS.Steps, 'Journey step templates');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Number" DisplayName="JourneyId" Name="JourneyId" Required="TRUE" />');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Number" DisplayName="StepOrder" Name="StepOrder" Required="TRUE" />');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Choice" DisplayName="StepType" Name="StepType" Required="TRUE"><CHOICES><CHOICE>Notification</CHOICE><CHOICE>Approval</CHOICE><CHOICE>Signature</CHOICE><CHOICE>Task</CHOICE><CHOICE>Feedback</CHOICE><CHOICE>Complete</CHOICE></CHOICES></Field>');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="UserMulti" DisplayName="AssignedTo" Name="AssignedTo" Required="FALSE" Mult="TRUE" />');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Text" DisplayName="AssignToGroup" Name="AssignToGroup" Required="FALSE" />');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Choice" DisplayName="CompletionRule" Name="CompletionRule" Required="FALSE"><CHOICES><CHOICE>All</CHOICE><CHOICE>One</CHOICE></CHOICES><Default>All</Default></Field>');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Boolean" DisplayName="RequireComments" Name="RequireComments" Required="FALSE"><Default>0</Default></Field>');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Number" DisplayName="DueDays" Name="DueDays" Required="FALSE" />');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Boolean" DisplayName="AllowReject" Name="AllowReject" Required="FALSE"><Default>1</Default></Field>');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Boolean" DisplayName="AllowDelegate" Name="AllowDelegate" Required="FALSE"><Default>0</Default></Field>');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Note" DisplayName="Message" Name="Message" Required="FALSE" />');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Choice" DisplayName="NotifyWho" Name="NotifyWho" Required="FALSE"><CHOICES><CHOICE>Initiator</CHOICE><CHOICE>AllParticipants</CHOICE><CHOICE>SpecificPerson</CHOICE></CHOICES><Default>Initiator</Default></Field>');
    await this.listService.ensureField(LISTS.Steps,
      '<Field Type="Choice" DisplayName="StepNotify" Name="StepNotify" Required="FALSE"><CHOICES><CHOICE>None</CHOICE><CHOICE>Initiator</CHOICE><CHOICE>AllJourneyParticipants</CHOICE><CHOICE>AllStepParticipants</CHOICE></CHOICES><Default>None</Default></Field>');

    // DJ_History
    await this.listService.ensureList(LISTS.History, 'Active and completed journey instances');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="Number" DisplayName="JourneyId" Name="JourneyId" Required="TRUE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="Text" DisplayName="JourneyName" Name="JourneyName" Required="FALSE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="Text" DisplayName="DocumentUrl" Name="DocumentUrl" Required="FALSE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="Text" DisplayName="DocumentName" Name="DocumentName" Required="FALSE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="Text" DisplayName="LibraryUrl" Name="LibraryUrl" Required="FALSE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="Choice" DisplayName="Status" Name="Status" Required="FALSE"><CHOICES><CHOICE>Active</CHOICE><CHOICE>Completed</CHOICE><CHOICE>Rejected</CHOICE><CHOICE>Cancelled</CHOICE><CHOICE>Stalled</CHOICE></CHOICES><Default>Active</Default></Field>');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="Number" DisplayName="CurrentStepOrder" Name="CurrentStepOrder" Required="FALSE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="Number" DisplayName="TotalSteps" Name="TotalSteps" Required="FALSE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="User" DisplayName="InitiatedBy" Name="InitiatedBy" Required="FALSE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="DateTime" DisplayName="InitiatedDate" Name="InitiatedDate" Required="FALSE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="Number" DisplayName="JourneyVersion" Name="JourneyVersion" Required="FALSE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="Text" DisplayName="JourneyBatchId" Name="JourneyBatchId" Required="FALSE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="DateTime" DisplayName="CompletedDate" Name="CompletedDate" Required="FALSE" />');
    await this.listService.ensureField(LISTS.History,
      '<Field Type="Note" DisplayName="CancellationReason" Name="CancellationReason" Required="FALSE" />');

    // DJ_StepHistory
    await this.listService.ensureList(LISTS.StepHistory, 'Per-step audit records');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="Number" DisplayName="HistoryId" Name="HistoryId" Required="TRUE" />');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="Number" DisplayName="StepOrder" Name="StepOrder" Required="TRUE" />');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="Text" DisplayName="StepName" Name="StepName" Required="FALSE" />');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="Choice" DisplayName="StepType" Name="StepType" Required="FALSE"><CHOICES><CHOICE>Notification</CHOICE><CHOICE>Approval</CHOICE><CHOICE>Signature</CHOICE><CHOICE>Task</CHOICE><CHOICE>Feedback</CHOICE><CHOICE>Complete</CHOICE></CHOICES></Field>');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="UserMulti" DisplayName="AssignedTo" Name="AssignedTo" Required="FALSE" Mult="TRUE" />');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="Choice" DisplayName="Status" Name="Status" Required="FALSE"><CHOICES><CHOICE>Pending</CHOICE><CHOICE>Completed</CHOICE><CHOICE>Rejected</CHOICE><CHOICE>Skipped</CHOICE><CHOICE>FlowError</CHOICE></CHOICES><Default>Pending</Default></Field>');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="User" DisplayName="ActionBy" Name="ActionBy" Required="FALSE" />');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="DateTime" DisplayName="ActionDate" Name="ActionDate" Required="FALSE" />');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="Note" DisplayName="Comments" Name="Comments" Required="FALSE" />');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="Choice" DisplayName="CompletionRule" Name="CompletionRule" Required="FALSE"><CHOICES><CHOICE>All</CHOICE><CHOICE>One</CHOICE></CHOICES></Field>');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="Boolean" DisplayName="RequireComments" Name="RequireComments" Required="FALSE"><Default>0</Default></Field>');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="Boolean" DisplayName="AllowReject" Name="AllowReject" Required="FALSE"><Default>0</Default></Field>');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="Boolean" DisplayName="AllowDelegate" Name="AllowDelegate" Required="FALSE"><Default>0</Default></Field>');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="DateTime" DisplayName="DueDate" Name="DueDate" Required="FALSE" />');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="User" DisplayName="DelegatedFrom" Name="DelegatedFrom" Required="FALSE" />');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="User" DisplayName="DelegatedBy" Name="DelegatedBy" Required="FALSE" />');
    await this.listService.ensureField(LISTS.StepHistory,
      '<Field Type="DateTime" DisplayName="DelegatedDate" Name="DelegatedDate" Required="FALSE" />');
  }

  private async seedDefaults(): Promise<void> {
    const approval = await this.listService.addItem<{ Id: number }>(LISTS.Journeys, {
      Title: 'Simple Approval',
      Description: 'Send a document for approval. One approver must approve or reject.',
      IsDefault: true,
      IsActive: true,
      LibraryScope: '',
      Category: 'Default'
    });

    await this.listService.addItem(LISTS.Steps, {
      Title: 'Request Approval',
      JourneyId: approval.Id,
      StepOrder: 1,
      StepType: StepType.Approval,
      CompletionRule: CompletionRule.One,
      RequireComments: false,
      DueDays: 7,
      AllowReject: true,
      AllowDelegate: false
    });

    await this.listService.addItem(LISTS.Steps, {
      Title: 'Complete',
      JourneyId: approval.Id,
      StepOrder: 2,
      StepType: StepType.Complete,
      CompletionRule: CompletionRule.All,
      RequireComments: false,
      DueDays: 0,
      AllowReject: false,
      AllowDelegate: false
    });

    const feedback = await this.listService.addItem<{ Id: number }>(LISTS.Journeys, {
      Title: 'Request Feedback',
      Description: 'Collect feedback on a document from one or more reviewers.',
      IsDefault: true,
      IsActive: true,
      LibraryScope: '',
      Category: 'Default'
    });

    await this.listService.addItem(LISTS.Steps, {
      Title: 'Collect Feedback',
      JourneyId: feedback.Id,
      StepOrder: 1,
      StepType: StepType.Feedback,
      CompletionRule: CompletionRule.All,
      RequireComments: true,
      DueDays: 14,
      AllowReject: false,
      AllowDelegate: false
    });

    await this.listService.addItem(LISTS.Steps, {
      Title: 'Complete',
      JourneyId: feedback.Id,
      StepOrder: 2,
      StepType: StepType.Complete,
      CompletionRule: CompletionRule.All,
      RequireComments: false,
      DueDays: 0,
      AllowReject: false,
      AllowDelegate: false
    });
  }
}
