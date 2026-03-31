import * as React from 'react';
import {
  DrawerBody,
  DrawerHeader,
  DrawerHeaderTitle,
  OverlayDrawer,
  Spinner,
  MessageBar,
  MessageBarBody,
  Button,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { DismissRegular, CheckmarkCircleRegular } from '@fluentui/react-icons';
import { SPFI } from '@pnp/sp';
import { FluentThemeProvider } from './FluentThemeProvider';
import { DocumentSelector } from './DocumentSelector';
import { JourneyPicker } from './JourneyPicker';
import { JourneySummary } from './JourneySummary';
import { SchemaService, SchemaStatus } from '../../../services/SchemaService';
import { JourneyService, SelectedDocument } from '../../../services/JourneyService';
import { GalleryService } from '../../../services/GalleryService';
import { TenantPropertyService } from '../../../services/TenantPropertyService';
import { IJourney } from '../../../models/IJourney';
import { IStep } from '../../../models/IStep';

type PanelStep = 'loading' | 'schema-upgrade' | 'select-journey' | 'confirm' | 'submitting' | 'done' | 'error';

export interface IDocumentJourneyPanelProps {
  sp: SPFI;
  spfxContext: any;
  documents: SelectedDocument[];
  currentUserEmail: string;
  libraryId: string;
  isOpen: boolean;
  onDismiss: () => void;
}

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  successContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '40px 0',
  },
  successIcon: {
    fontSize: '48px',
    color: tokens.colorPaletteGreenForeground1,
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  upgradeContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '20px 0',
  },
});

export const DocumentJourneyPanel: React.FC<IDocumentJourneyPanelProps> = (props) => {
  const { sp, spfxContext, documents: initialDocs, currentUserEmail, libraryId, isOpen, onDismiss } = props;
  const styles = useStyles();

  const [step, setStep] = React.useState<PanelStep>('loading');
  const [documents, setDocuments] = React.useState<SelectedDocument[]>(initialDocs);
  const [journeys, setJourneys] = React.useState<IJourney[]>([]);
  const [galleryJourneys, setGalleryJourneys] = React.useState<IJourney[]>([]);
  const [isGalleryConfigured, setIsGalleryConfigured] = React.useState(false);
  const [loadingGallery, setLoadingGallery] = React.useState(false);
  const [selectedJourney, setSelectedJourney] = React.useState<IJourney | null>(null);
  const [journeySteps, setJourneySteps] = React.useState<IStep[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [schemaStatus, setSchemaStatus] = React.useState<SchemaStatus | null>(null);

  const tenantPropertyService = React.useMemo(() => new TenantPropertyService(sp), [sp]);
  const schemaService = React.useMemo(() => new SchemaService(sp), [sp]);
  const journeyService = React.useMemo(() => new JourneyService(sp, tenantPropertyService), [sp, tenantPropertyService]);
  const galleryService = React.useMemo(() => new GalleryService(sp, tenantPropertyService, spfxContext), [sp, tenantPropertyService, spfxContext]);

  React.useEffect(() => {
    const init = async (): Promise<void> => {
      try {
        const status = await schemaService.checkSchema();
        setSchemaStatus(status);

        if (status.needsInstall || status.needsUpgrade) {
          setStep('schema-upgrade');
          return;
        }

        await loadJourneys();
        setStep('select-journey');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize');
        setStep('error');
      }
    };
    if (isOpen) init();
  }, [isOpen]);

  const loadJourneys = async (): Promise<void> => {
    const items = await journeyService.getJourneys(libraryId);
    setJourneys(items);

    const galleryConfigured = await galleryService.isGalleryConfigured();
    setIsGalleryConfigured(galleryConfigured);

    if (galleryConfigured) {
      setLoadingGallery(true);
      try {
        const gallery = await galleryService.getGalleryJourneys();
        setGalleryJourneys(gallery);
      } finally {
        setLoadingGallery(false);
      }
    }
  };

  const handleSchemaUpgrade = async (): Promise<void> => {
    try {
      setStep('loading');
      await schemaService.ensureSchema();
      await loadJourneys();
      setStep('select-journey');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Schema upgrade failed');
      setStep('error');
    }
  };

  const handleJourneySelect = async (journey: IJourney): Promise<void> => {
    setSelectedJourney(journey);
    const steps = await journeyService.getSteps(journey.Id);
    setJourneySteps(steps);
    setStep('confirm');
  };

  const handleImport = async (journeyId: number): Promise<void> => {
    await galleryService.importJourney(journeyId);
    await loadJourneys();
  };

  const handleConfirm = async (): Promise<void> => {
    if (!selectedJourney) return;
    setSubmitting(true);
    setStep('submitting');
    try {
      await journeyService.startJourney(selectedJourney, journeySteps, documents, currentUserEmail);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start journey');
      setStep('error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveDocument = (docId: number): void => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const renderContent = (): React.ReactElement => {
    switch (step) {
      case 'loading':
        return <Spinner label="Loading..." />;

      case 'schema-upgrade':
        return (
          <div className={styles.upgradeContainer}>
            <MessageBar intent="warning">
              <MessageBarBody>
                {schemaStatus?.needsInstall
                  ? 'Document Journey needs to set up its lists on this site.'
                  : `Schema upgrade required (v${schemaStatus?.currentVersion} → v${schemaStatus?.expectedVersion}).`}
              </MessageBarBody>
            </MessageBar>
            <Button appearance="primary" onClick={handleSchemaUpgrade}>
              {schemaStatus?.needsInstall ? 'Install Now' : 'Upgrade Now'}
            </Button>
          </div>
        );

      case 'select-journey':
        return (
          <div className={styles.body}>
            <DocumentSelector documents={documents} onRemove={handleRemoveDocument} />
            <JourneyPicker
              journeys={journeys}
              galleryJourneys={galleryJourneys}
              isGalleryConfigured={isGalleryConfigured}
              loadingGallery={loadingGallery}
              onSelect={handleJourneySelect}
              onImport={handleImport}
            />
          </div>
        );

      case 'confirm':
        return selectedJourney ? (
          <JourneySummary
            journey={selectedJourney}
            steps={journeySteps}
            documents={documents}
            onConfirm={handleConfirm}
            onBack={() => setStep('select-journey')}
            submitting={submitting}
          />
        ) : <></>;

      case 'submitting':
        return <Spinner label="Starting journey..." />;

      case 'done':
        return (
          <div className={styles.successContainer}>
            <CheckmarkCircleRegular className={styles.successIcon} />
            <Text weight="semibold" size={500}>Journey started successfully</Text>
            <Button appearance="secondary" onClick={onDismiss}>Close</Button>
          </div>
        );

      case 'error':
        return (
          <div className={styles.errorContainer}>
            <MessageBar intent="error">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
            <Button appearance="secondary" onClick={() => setStep('select-journey')}>Try Again</Button>
          </div>
        );
    }
  };

  return (
    <FluentThemeProvider>
      <OverlayDrawer
        open={isOpen}
        onOpenChange={(_, { open }) => { if (!open) onDismiss(); }}
        position="end"
        size="medium"
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button
                appearance="subtle"
                icon={<DismissRegular />}
                onClick={onDismiss}
                aria-label="Close"
              />
            }
          >
            Start a Journey
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody>
          {renderContent()}
        </DrawerBody>
      </OverlayDrawer>
    </FluentThemeProvider>
  );
};
