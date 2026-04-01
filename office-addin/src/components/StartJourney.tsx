import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  tokens,
  Title3,
  Subtitle2,
  Text,
  Button,
  Card,
  Badge,
  Spinner,
  Divider,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { ArrowLeftRegular } from '@fluentui/react-icons';
import { IDocumentInfo } from '../utils/documentUrl';
import { useDocumentJourney } from '../context/DocumentJourneyContext';
import { IJourney } from '../models/IJourney';
import { IStep } from '../models/IStep';
import { STEP_TYPE_COLORS, StepType } from '../shared/constants';

interface IProps {
  documentInfo: IDocumentInfo;
  onDone: () => void;
  onCancel: () => void;
}

type ViewState = 'loading' | 'pick' | 'confirm' | 'submitting' | 'done' | 'error';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  journeyCard: {
    cursor: 'pointer',
    padding: '12px',
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  journeyCardDefault: {
    cursor: 'pointer',
    padding: '12px',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: tokens.colorBrandBackground,
    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  stepItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingTop: '6px',
    paddingBottom: '6px',
  },
  stepCircle: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '12px',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '8px',
  },
  success: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    padding: '24px',
    textAlign: 'center',
  },
  successIcon: {
    fontSize: '40px',
    color: tokens.colorPaletteGreenForeground1,
  },
});

export const StartJourney: React.FC<IProps> = ({ documentInfo, onDone, onCancel }) => {
  const styles = useStyles();
  const { sp, journeyService } = useDocumentJourney();

  const [viewState, setViewState] = useState<ViewState>('loading');
  const [journeys, setJourneys] = useState<IJourney[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<IJourney | null>(null);
  const [steps, setSteps] = useState<IStep[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const list = await journeyService.getJourneys(documentInfo.libraryUrl);
        setJourneys(list);
        setViewState('pick');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load journeys');
        setViewState('error');
      }
    };
    load();
  }, []);

  const handleSelectJourney = async (journey: IJourney) => {
    setSelectedJourney(journey);
    try {
      const s = await journeyService.getSteps(journey.Id);
      setSteps(s);
      setViewState('confirm');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load steps');
      setViewState('error');
    }
  };

  const handleStart = async () => {
    if (!selectedJourney) return;
    setViewState('submitting');
    try {
      const userId = (await sp.web.currentUser()).Id;
      await journeyService.startJourney(
        selectedJourney,
        steps,
        [{ name: documentInfo.name, url: documentInfo.url, libraryUrl: documentInfo.libraryUrl }],
        userId
      );
      setViewState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start journey');
      setViewState('error');
    }
  };

  const defaultJourneys = journeys.filter(j => j.IsDefault);
  const customJourneys = journeys.filter(j => !j.IsDefault);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Button appearance="subtle" size="small" icon={<ArrowLeftRegular />} onClick={onCancel} />
        <Title3>Start a Journey</Title3>
      </div>

      <div className={styles.body}>
        {viewState === 'loading' && <Spinner label="Loading journeys..." />}

        {viewState === 'error' && (
          <>
            <MessageBar intent="error">
              <MessageBarBody>{error}</MessageBarBody>
            </MessageBar>
            <Button appearance="secondary" onClick={() => setViewState('pick')}>Back</Button>
          </>
        )}

        {viewState === 'pick' && (
          <>
            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
              {documentInfo.name}
            </Text>

            {defaultJourneys.length > 0 && (
              <>
                <Subtitle2>Recommended</Subtitle2>
                {defaultJourneys.map(j => (
                  <Card key={j.Id} className={styles.journeyCardDefault} onClick={() => handleSelectJourney(j)}>
                    <Text weight="semibold">{j.Title}</Text>
                    <Text size={200}>{j.Description}</Text>
                  </Card>
                ))}
              </>
            )}

            {customJourneys.length > 0 && (
              <>
                <Divider />
                <Subtitle2>Custom Journeys</Subtitle2>
                {customJourneys.map(j => (
                  <Card key={j.Id} className={styles.journeyCard} onClick={() => handleSelectJourney(j)}>
                    <Text weight="semibold">{j.Title}</Text>
                    <Text size={200}>{j.Description}</Text>
                  </Card>
                ))}
              </>
            )}

            {journeys.length === 0 && (
              <Text>No journeys available. Ask your admin to create journey templates.</Text>
            )}
          </>
        )}

        {viewState === 'confirm' && selectedJourney && (
          <>
            <Subtitle2>{selectedJourney.Title}</Subtitle2>
            <Text size={200}>{selectedJourney.Description}</Text>
            <Divider />
            <Text weight="semibold">Steps</Text>
            {steps.map(step => (
              <div key={step.Id} className={styles.stepItem}>
                <div className={styles.stepCircle}>{step.StepOrder}</div>
                <Text size={300}>{step.Title}</Text>
                <Badge
                  appearance="filled"
                  color={STEP_TYPE_COLORS[step.StepType as StepType] as any}
                  size="small"
                >
                  {step.StepType}
                </Badge>
              </div>
            ))}
            <div className={styles.actions}>
              <Button appearance="primary" onClick={handleStart}>Start Journey</Button>
              <Button appearance="secondary" onClick={() => setViewState('pick')}>Back</Button>
            </div>
          </>
        )}

        {viewState === 'submitting' && <Spinner label="Starting journey..." />}

        {viewState === 'done' && (
          <div className={styles.success}>
            <Text className={styles.successIcon}>&#10004;</Text>
            <Title3>Journey Started</Title3>
            <Text>Your document is now on its journey.</Text>
            <Button appearance="primary" onClick={onDone}>Done</Button>
          </div>
        )}
      </div>
    </div>
  );
};
