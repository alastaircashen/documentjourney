import * as React from 'react';
import {
  makeStyles,
  tokens,
  Title3,
  Text,
  Spinner,
  MessageBar,
  MessageBarBody,
  Button,
  Divider
} from '@fluentui/react-components';
import { DocumentSelector } from './DocumentSelector';
import { JourneyPicker } from './JourneyPicker';
import { JourneyInstanceConfig } from './JourneyInstanceConfig';
import { JourneyBuilder, IBuilderStep } from './JourneyBuilder';
import { IJourney } from '../../../models/IJourney';
import { IStep } from '../../../models/IStep';
import { IStepInstance } from '../../../models/IStepInstance';
import { ISelectedDocument } from '../../../services/JourneyService';
import { LISTS, StepType } from '../../../constants';
import { useDocumentJourney } from '../../../common/DocumentJourneyContext';

export interface IDocumentJourneyPanelProps {
  documents: ISelectedDocument[];
  onDismiss: () => void;
}

type PanelStep = 'loading' | 'needs-setup' | 'select-journey' | 'configure-instance' | 'create-journey' | 'submitting' | 'done' | 'error' | 'needs-upgrade';

// Inline styles for critical layout — avoids Griffel CSS injection race condition
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 1000000,
  display: 'flex', justifyContent: 'flex-end',
};
const panelStyle: React.CSSProperties = {
  width: '520px', maxWidth: '100vw', height: '100%',
  backgroundColor: '#fff', boxShadow: '0 0 32px rgba(0,0,0,0.18)',
  display: 'flex', flexDirection: 'column',
};
const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '16px 24px', borderBottom: '1px solid #e0e0e0', flexShrink: 0,
};
const bodyStyle: React.CSSProperties = {
  flex: 1, padding: '24px', display: 'flex', flexDirection: 'column',
  gap: '16px', overflowY: 'auto',
};

const useStyles = makeStyles({
  success: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '32px',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '48px',
    color: tokens.colorPaletteGreenForeground1,
  },
  setupInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
  },
});

export const DocumentJourneyPanel: React.FC<IDocumentJourneyPanelProps> = ({
  documents: initialDocuments,
  onDismiss,
}) => {
  const styles = useStyles();
  const { sp, journeyService, schemaService, galleryService, listService } = useDocumentJourney();

  const [step, setStep] = React.useState<PanelStep>('loading');
  const [documents, setDocuments] = React.useState<ISelectedDocument[]>(initialDocuments);
  const [journeys, setJourneys] = React.useState<IJourney[]>([]);
  const [galleryJourneys, setGalleryJourneys] = React.useState<IJourney[]>([]);
  const [hasGallery, setHasGallery] = React.useState(false);
  const [selectedJourney, setSelectedJourney] = React.useState<IJourney | undefined>();
  const [journeySteps, setJourneySteps] = React.useState<IStep[]>([]);
  const [error, setError] = React.useState<string>('');
  const [schemaVersion, setSchemaVersion] = React.useState(0);
  const [saving, setSaving] = React.useState(false);
  const [conflictDocs, setConflictDocs] = React.useState<string[]>([]);

  React.useEffect(() => {
    const init = async (): Promise<void> => {
      try {
        // Check if user is admin for first-time setup
        let isAdmin = false;
        try {
          const user = await sp.web.currentUser();
          isAdmin = user.IsSiteAdmin;
        } catch { /* ignore */ }

        const schemaResult = await schemaService.ensureSchema().catch(() => null);

        if (!schemaResult) {
          if (!isAdmin) {
            setStep('needs-setup');
            return;
          }
        } else if (schemaResult.needsUpgrade) {
          setSchemaVersion(schemaResult.currentVersion);
          setStep('needs-upgrade');
          return;
        }

        const libraryUrl = documents.length > 0 ? documents[0].libraryUrl : undefined;
        const [journeyList, galleryUrl] = await Promise.all([
          journeyService.getJourneys(libraryUrl),
          galleryService.getGalleryUrl()
        ]);

        setJourneys(journeyList);
        setHasGallery(!!galleryUrl);

        if (galleryUrl) {
          galleryService.getGalleryJourneys().then(setGalleryJourneys).catch(() => { /* ignore */ });
        }

        // Check for active journey conflicts
        if (documents.length > 0) {
          const activeConflicts = await journeyService.checkActiveJourneys(documents.map(d => d.url));
          if (activeConflicts.length > 0) {
            setConflictDocs(activeConflicts.map(c => c.DocumentName));
          }
        }

        setStep('select-journey');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setStep('error');
      }
    };

    init().catch(() => { /* handled */ });
  }, []);

  const handleSelectJourney = async (journey: IJourney): Promise<void> => {
    setSelectedJourney(journey);
    try {
      const steps = await journeyService.getSteps(journey.Id);
      setJourneySteps(steps);
      setStep('configure-instance');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journey steps');
      setStep('error');
    }
  };

  const handleConfirmInstance = async (stepInstances: IStepInstance[]): Promise<void> => {
    if (!selectedJourney) return;
    setSaving(true);
    setStep('submitting');
    try {
      const currentUserId = (await sp.web.currentUser()).Id;

      const stepsForLaunch: IStep[] = stepInstances.map(si => ({
        Id: si.templateStepId,
        Title: si.title,
        JourneyId: selectedJourney.Id,
        StepOrder: si.stepOrder,
        StepType: si.stepType,
        AssignedToId: [],
        AssignToGroup: si.assignedTo.map(a => a.loginName).join(';'),
        CompletionRule: si.completionRule,
        RequireComments: si.requireComments,
        DueDays: si.dueDays,
        AllowReject: si.allowReject,
        AllowDelegate: si.allowDelegate,
        Message: si.message,
        NotifyWho: si.notifyWho,
        StepNotify: si.stepNotify,
      }));

      await journeyService.startJourney(selectedJourney, stepsForLaunch, documents, currentUserId);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start journey');
      setStep('error');
    }
    setSaving(false);
  };

  const handleCreateJourney = async (title: string, description: string, builderSteps: IBuilderStep[]): Promise<void> => {
    setSaving(true);
    try {
      const newJourney = await listService.addItem<{ Id: number }>(LISTS.Journeys, {
        Title: title,
        Description: description,
        IsDefault: false,
        IsActive: true,
        LibraryScope: documents.length > 0 ? documents[0].libraryUrl : '',
        Category: 'Custom'
      });

      for (let i = 0; i < builderSteps.length; i++) {
        const bs = builderSteps[i];
        await listService.addItem(LISTS.Steps, {
          Title: bs.title,
          JourneyId: newJourney.Id,
          StepOrder: i + 1,
          StepType: bs.stepType,
          AssignToGroup: bs.assignedTo.map(a => a.loginName).join(';'),
          CompletionRule: bs.completionRule,
          RequireComments: bs.requireComments,
          DueDays: bs.dueDays,
          AllowReject: bs.allowReject,
          AllowDelegate: bs.allowDelegate,
          Message: bs.message,
          NotifyWho: bs.notifyWho,
          StepNotify: bs.stepNotify
        });
      }

      const libraryUrl = documents.length > 0 ? documents[0].libraryUrl : undefined;
      const updatedJourneys = await journeyService.getJourneys(libraryUrl);
      setJourneys(updatedJourneys);

      const created = updatedJourneys.find(j => j.Id === newJourney.Id);
      if (created) {
        await handleSelectJourney(created);
      } else {
        setStep('select-journey');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create journey');
      setStep('error');
    }
    setSaving(false);
  };

  const handleImport = async (journeyId: number): Promise<void> => {
    try {
      await galleryService.importJourney(journeyId);
      const libraryUrl = documents.length > 0 ? documents[0].libraryUrl : undefined;
      const updatedJourneys = await journeyService.getJourneys(libraryUrl);
      setJourneys(updatedJourneys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import journey');
    }
  };

  const handleUpgrade = async (): Promise<void> => {
    try {
      setStep('loading');
      await schemaService.runMigrations(schemaVersion);
      const libraryUrl = documents.length > 0 ? documents[0].libraryUrl : undefined;
      const journeyList = await journeyService.getJourneys(libraryUrl);
      setJourneys(journeyList);
      setStep('select-journey');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upgrade failed');
      setStep('error');
    }
  };

  const handleRemoveDocument = (index: number): void => {
    setDocuments(prev => prev.filter((_, i) => i !== index));
  };

  const renderBody = (): React.ReactNode => {
    switch (step) {
      case 'loading':
        return <Spinner label="Setting up Document Journey..." />;

      case 'needs-setup':
        return (
          <div className={styles.setupInfo}>
            <MessageBar intent="info">
              <MessageBarBody>
                Document Journey hasn't been set up on this site yet. A site administrator needs to open this panel first to initialize the required lists.
              </MessageBarBody>
            </MessageBar>
            <Button
              appearance="secondary"
              onClick={() => {
                const instructions = "To set up Document Journey:\n1. Sign in as a Site Collection Administrator\n2. Navigate to any document library\n3. Select a document and click 'Start a Journey'\n4. The setup will run automatically on first use";
                navigator.clipboard.writeText(instructions).catch(() => { /* ignore */ });
              }}
            >
              Copy setup instructions
            </Button>
          </div>
        );

      case 'needs-upgrade':
        return (
          <div>
            <MessageBar intent="warning">
              <MessageBarBody>
                Document Journey needs to be upgraded (v{schemaVersion} to current).
                This requires site administrator permissions.
              </MessageBarBody>
            </MessageBar>
            <Button appearance="primary" onClick={handleUpgrade} style={{ marginTop: '16px' }}>
              Upgrade Now
            </Button>
          </div>
        );

      case 'select-journey':
        return (
          <>
            <DocumentSelector documents={documents} onRemove={handleRemoveDocument} />
            {conflictDocs.length > 0 && (
              <MessageBar intent="warning">
                <MessageBarBody>
                  {conflictDocs.length} of {documents.length} selected document{documents.length > 1 ? 's' : ''} already {conflictDocs.length > 1 ? 'have' : 'has'} an active journey: {conflictDocs.join(', ')}
                </MessageBarBody>
              </MessageBar>
            )}
            <Divider />
            <JourneyPicker
              journeys={journeys}
              galleryJourneys={galleryJourneys}
              loading={false}
              onSelect={handleSelectJourney}
              onImport={handleImport}
              onCreate={() => setStep('create-journey')}
              hasGallery={hasGallery}
            />
          </>
        );

      case 'create-journey':
        return (
          <JourneyBuilder
            onSave={handleCreateJourney}
            onCancel={() => setStep('select-journey')}
            saving={saving}
          />
        );

      case 'configure-instance':
        return selectedJourney ? (
          <JourneyInstanceConfig
            journey={selectedJourney}
            templateSteps={journeySteps}
            documents={documents}
            onConfirm={handleConfirmInstance}
            onBack={() => setStep('select-journey')}
            submitting={false}
          />
        ) : null;

      case 'submitting':
        return selectedJourney ? (
          <JourneyInstanceConfig
            journey={selectedJourney}
            templateSteps={journeySteps}
            documents={documents}
            onConfirm={handleConfirmInstance}
            onBack={() => setStep('select-journey')}
            submitting={true}
          />
        ) : null;

      case 'done':
        return (
          <div className={styles.success}>
            <Text className={styles.successIcon}>&#10004;</Text>
            <Title3>Journey started successfully</Title3>
            <Text>Your documents are now on their journey.</Text>
            <Button appearance="primary" onClick={onDismiss}>Close</Button>
          </div>
        );

      case 'error':
        return (
          <div>
            <MessageBar intent="error">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
            <Button
              appearance="secondary"
              onClick={() => setStep('select-journey')}
              style={{ marginTop: '16px' }}
            >
              Try Again
            </Button>
          </div>
        );
    }
  };

  return (
    <div style={overlayStyle} onClick={onDismiss}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        <div style={headerStyle}>
          <Title3>Start a Journey</Title3>
          <Button appearance="subtle" onClick={onDismiss}>&#10005;</Button>
        </div>
        <div style={bodyStyle}>
          {renderBody()}
        </div>
      </div>
    </div>
  );
};
