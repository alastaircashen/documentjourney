import * as React from 'react';
import {
  Text,
  Badge,
  Button,
  makeStyles,
  tokens,
  Avatar,
} from '@fluentui/react-components';
import { IJourney } from '../../../models/IJourney';
import { IStep } from '../../../models/IStep';
import { SelectedDocument } from '../../../services/JourneyService';
import { STEP_TYPE_COLORS } from '../../../constants';
import { DocumentSelector } from './DocumentSelector';

export interface IJourneySummaryProps {
  journey: IJourney;
  steps: IStep[];
  documents: SelectedDocument[];
  onConfirm: () => void;
  onBack: () => void;
  submitting: boolean;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: tokens.colorNeutralForeground1,
  },
  stepper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    paddingLeft: '8px',
  },
  stepRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    position: 'relative',
  },
  stepIndicator: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '32px',
  },
  stepCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '600',
    fontSize: '14px',
    flexShrink: 0,
  },
  stepLine: {
    width: '2px',
    height: '24px',
    backgroundColor: tokens.colorNeutralStroke1,
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingBottom: '16px',
  },
  stepName: {
    fontWeight: '600',
    color: tokens.colorNeutralForeground1,
  },
  stepMeta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  assignees: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
  metaText: {
    color: tokens.colorNeutralForeground2,
    fontSize: '12px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '8px',
  },
});

export const JourneySummary: React.FC<IJourneySummaryProps> = ({
  journey,
  steps,
  documents,
  onConfirm,
  onBack,
  submitting,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <Text className={styles.title}>{journey.Title}</Text>

      <DocumentSelector documents={documents} onRemove={() => {}} />

      <div className={styles.stepper}>
        {steps.map((step, index) => {
          const assignees: string[] = typeof step.AssignedTo === 'string'
            ? JSON.parse(step.AssignedTo || '[]')
            : step.AssignedTo;

          return (
            <div key={step.Id} className={styles.stepRow}>
              <div className={styles.stepIndicator}>
                <div className={styles.stepCircle}>{step.StepOrder}</div>
                {index < steps.length - 1 && <div className={styles.stepLine} />}
              </div>
              <div className={styles.stepContent}>
                <Text className={styles.stepName}>{step.Title}</Text>
                <div className={styles.stepMeta}>
                  <Badge
                    color={STEP_TYPE_COLORS[step.StepType] as any}
                    size="small"
                  >
                    {step.StepType}
                  </Badge>
                  <Text className={styles.metaText}>
                    {step.CompletionRule === 'All' ? 'All must complete' : 'One must complete'}
                  </Text>
                  {step.DueDays > 0 && (
                    <Text className={styles.metaText}>Due in {step.DueDays} days</Text>
                  )}
                </div>
                {assignees.length > 0 && (
                  <div className={styles.assignees}>
                    {assignees.map((a) => (
                      <Avatar key={a} name={a} size={20} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.actions}>
        <Button appearance="primary" onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Starting...' : 'Start Journey'}
        </Button>
        <Button appearance="secondary" onClick={onBack} disabled={submitting}>
          Back
        </Button>
      </div>
    </div>
  );
};
