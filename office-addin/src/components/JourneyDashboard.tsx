import React, { useState, useEffect } from 'react';
import {
  makeStyles,
  Spinner,
  Title3,
  Text,
  Badge,
  Button,
  Divider,
  tokens,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { ArrowClockwiseRegular } from '@fluentui/react-icons';
import { IDocumentInfo } from '../utils/documentUrl';
import { useDocumentJourney } from '../context/DocumentJourneyContext';
import { IHistory } from '../models/IHistory';
import { IStepHistory } from '../models/IStepHistory';
import { JourneyStatus, StepStatus, StepType, STEP_TYPE_COLORS } from '../shared/constants';
import { StepActions } from './StepActions';
import { StartJourney } from './StartJourney';

interface IProps {
  documentInfo: IDocumentInfo;
}

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
    justifyContent: 'space-between',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
  },
  statusRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
  },
  stepRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
  },
  connector: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '24px',
    flexShrink: 0,
  },
  circleCompleted: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: tokens.colorPaletteGreenBackground3,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0,
  },
  circleActive: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0,
  },
  circleRejected: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0,
  },
  circlePending: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: tokens.colorNeutralBackground4,
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0,
  },
  lineSolid: {
    width: '2px',
    height: '16px',
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },
  lineDashed: {
    width: '2px',
    height: '16px',
    borderLeftWidth: '2px',
    borderLeftStyle: 'dashed',
    borderLeftColor: tokens.colorNeutralStroke1,
  },
  stepContent: {
    paddingBottom: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    flex: 1,
    minWidth: 0,
  },
  meta: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  comments: {
    fontStyle: 'italic',
    color: tokens.colorNeutralForeground3,
  },
  actionSection: {
    padding: '12px 16px',
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: tokens.colorNeutralStroke1,
    flexShrink: 0,
  },
});

const STATUS_BADGE_COLORS: Record<string, 'brand' | 'success' | 'danger' | 'informative'> = {
  [JourneyStatus.Active]: 'brand',
  [JourneyStatus.Completed]: 'success',
  [JourneyStatus.Rejected]: 'danger',
  [JourneyStatus.Cancelled]: 'informative',
};

export const JourneyDashboard: React.FC<IProps> = ({ documentInfo }) => {
  const styles = useStyles();
  const { journeyService, currentUserId } = useDocumentJourney();

  const [loading, setLoading] = useState(true);
  const [activeJourney, setActiveJourney] = useState<IHistory | null>(null);
  const [stepHistories, setStepHistories] = useState<IStepHistory[]>([]);
  const [currentStep, setCurrentStep] = useState<IStepHistory | null>(null);
  const [showStartJourney, setShowStartJourney] = useState(false);
  const [error, setError] = useState('');

  const loadJourneyStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const active = await journeyService.checkActiveJourneys([documentInfo.url]);
      if (active.length > 0) {
        const journey = active[0];
        setActiveJourney(journey);

        const steps = await journeyService.getJourneyStepHistory(journey.Id);
        setStepHistories(steps);

        const current = steps.find(s => s.StepOrder === journey.CurrentStepOrder && s.Status === StepStatus.Pending);
        setCurrentStep(current || null);
      } else {
        setActiveJourney(null);
        setStepHistories([]);
        setCurrentStep(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journey status');
    }
    setLoading(false);
  };

  useEffect(() => { loadJourneyStatus(); }, [documentInfo.url]);

  const getCircleClass = (sh: IStepHistory): string => {
    if (sh.Status === StepStatus.Completed) return styles.circleCompleted;
    if (sh.Status === StepStatus.Rejected) return styles.circleRejected;
    if (activeJourney && sh.StepOrder === activeJourney.CurrentStepOrder && activeJourney.Status === JourneyStatus.Active) {
      return styles.circleActive;
    }
    return styles.circlePending;
  };

  const getCircleIcon = (sh: IStepHistory): string => {
    if (sh.Status === StepStatus.Completed) return '\u2713';
    if (sh.Status === StepStatus.Rejected) return '\u2717';
    if (activeJourney && sh.StepOrder === activeJourney.CurrentStepOrder && activeJourney.Status === JourneyStatus.Active) {
      return '\u25B6';
    }
    return '\u25CB';
  };

  if (showStartJourney) {
    return (
      <StartJourney
        documentInfo={documentInfo}
        onDone={() => { setShowStartJourney(false); loadJourneyStatus(); }}
        onCancel={() => setShowStartJourney(false)}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Title3>Document Journey</Title3>
          <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
            {documentInfo.name}
          </Text>
        </div>
        <Button
          appearance="subtle"
          icon={<ArrowClockwiseRegular />}
          onClick={loadJourneyStatus}
          size="small"
        />
      </div>

      <div className={styles.body}>
        {loading && (
          <div className={styles.loading}>
            <Spinner label="Checking journey status..." />
          </div>
        )}

        {error && (
          <MessageBar intent="error">
            <MessageBarBody>{error}</MessageBarBody>
          </MessageBar>
        )}

        {!loading && !error && !activeJourney && (
          <>
            <Text>No active journey on this document.</Text>
            <Button appearance="primary" onClick={() => setShowStartJourney(true)}>
              Start a Journey
            </Button>
          </>
        )}

        {!loading && !error && activeJourney && (
          <>
            <div className={styles.statusRow}>
              <Text weight="semibold">{activeJourney.JourneyName}</Text>
              <Badge
                appearance="filled"
                color={STATUS_BADGE_COLORS[activeJourney.Status] || 'informative'}
                size="small"
              >
                {activeJourney.Status}
              </Badge>
            </div>

            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
              Step {activeJourney.CurrentStepOrder} of {activeJourney.TotalSteps}
              {' \u2022 '}Started {new Date(activeJourney.InitiatedDate).toLocaleDateString()}
            </Text>

            <Divider />

            <div className={styles.timeline}>
              {stepHistories.map((sh, index) => (
                <div key={sh.Id} className={styles.stepRow}>
                  <div className={styles.connector}>
                    <div className={getCircleClass(sh)}>
                      {getCircleIcon(sh)}
                    </div>
                    {index < stepHistories.length - 1 && (
                      <div className={sh.Status === StepStatus.Completed ? styles.lineSolid : styles.lineDashed} />
                    )}
                  </div>
                  <div className={styles.stepContent}>
                    <Text weight="semibold" size={300}>{sh.StepName}</Text>
                    <div className={styles.meta}>
                      <Badge
                        appearance="filled"
                        color={STEP_TYPE_COLORS[sh.StepType as StepType] as any}
                        size="small"
                      >
                        {sh.StepType}
                      </Badge>
                      {sh.ActionDate && (
                        <Text size={200}>{new Date(sh.ActionDate).toLocaleString()}</Text>
                      )}
                    </div>
                    {sh.Comments && (
                      <Text size={200} className={styles.comments}>"{sh.Comments}"</Text>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {!loading && activeJourney && activeJourney.Status === JourneyStatus.Active && currentStep && (
        <div className={styles.actionSection}>
          <StepActions
            stepHistory={currentStep}
            onActionComplete={loadJourneyStatus}
          />
        </div>
      )}
    </div>
  );
};
