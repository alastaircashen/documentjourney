import * as React from 'react';
import {
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Button,
  Text,
  Badge,
  makeStyles,
  tokens,
  Spinner,
} from '@fluentui/react-components';
import {
  CheckmarkCircleRegular,
  CircleRegular,
  DismissCircleRegular,
  PrintRegular,
} from '@fluentui/react-icons';
import { SPFI } from '@pnp/sp';
import { JourneyService } from '../../../services/JourneyService';
import { TenantPropertyService } from '../../../services/TenantPropertyService';
import { IHistory } from '../../../models/IHistory';
import { IStepHistory } from '../../../models/IStepHistory';
import { StepStatus, STEP_TYPE_COLORS, StepType } from '../../../constants';

export interface IJourneyHistoryViewProps {
  history: IHistory;
  sp: SPFI;
  onDismiss: () => void;
}

const useStyles = makeStyles({
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0',
    padding: '16px 0',
  },
  timelineItem: {
    display: 'flex',
    gap: '12px',
    position: 'relative',
  },
  indicator: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '24px',
  },
  completedIcon: {
    color: tokens.colorPaletteGreenForeground1,
    fontSize: '24px',
  },
  pendingIcon: {
    color: tokens.colorNeutralForeground3,
    fontSize: '24px',
  },
  rejectedIcon: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: '24px',
  },
  solidLine: {
    width: '2px',
    height: '32px',
    backgroundColor: tokens.colorPaletteGreenBorder1,
  },
  dashedLine: {
    width: '2px',
    height: '32px',
    borderLeft: `2px dashed ${tokens.colorNeutralStroke1}`,
  },
  stepContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    paddingBottom: '16px',
  },
  stepHeader: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  meta: {
    color: tokens.colorNeutralForeground2,
    fontSize: '12px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  printButton: {
    marginRight: 'auto',
  },
});

export const JourneyHistoryView: React.FC<IJourneyHistoryViewProps> = ({ history, sp, onDismiss }) => {
  const styles = useStyles();
  const [stepHistories, setStepHistories] = React.useState<IStepHistory[]>([]);
  const [loading, setLoading] = React.useState(true);

  const tenantPropertyService = React.useMemo(() => new TenantPropertyService(sp), [sp]);
  const journeyService = React.useMemo(() => new JourneyService(sp, tenantPropertyService), [sp, tenantPropertyService]);

  React.useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const steps = await journeyService.getStepHistoryForJourney(history.Id);
        setStepHistories(steps);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [history.Id]);

  const getStatusIcon = (status: StepStatus): React.ReactElement => {
    switch (status) {
      case StepStatus.Completed:
        return <CheckmarkCircleRegular className={styles.completedIcon} />;
      case StepStatus.Rejected:
        return <DismissCircleRegular className={styles.rejectedIcon} />;
      default:
        return <CircleRegular className={styles.pendingIcon} />;
    }
  };

  const getLine = (status: StepStatus): React.ReactElement => {
    const isComplete = status === StepStatus.Completed;
    return <div className={isComplete ? styles.solidLine : styles.dashedLine} />;
  };

  return (
    <Dialog open onOpenChange={(_, { open }) => { if (!open) onDismiss(); }}>
      <DialogSurface style={{ maxWidth: '640px' }}>
        <DialogTitle>
          <div className={styles.header}>
            <Text weight="semibold" size={500}>{history.JourneyTitle}</Text>
            <Text size={200} style={{ color: tokens.colorNeutralForeground2 }}>
              {history.DocumentName}
            </Text>
          </div>
        </DialogTitle>
        <DialogBody>
          <DialogContent>
            {loading ? (
              <Spinner label="Loading history..." />
            ) : (
              <div className={styles.timeline}>
                {stepHistories.map((sh, index) => (
                  <div key={sh.Id} className={styles.timelineItem}>
                    <div className={styles.indicator}>
                      {getStatusIcon(sh.Status as StepStatus)}
                      {index < stepHistories.length - 1 && getLine(sh.Status as StepStatus)}
                    </div>
                    <div className={styles.stepContent}>
                      <div className={styles.stepHeader}>
                        <Text weight="semibold">{sh.StepTitle}</Text>
                        <Badge
                          color={STEP_TYPE_COLORS[sh.StepType as StepType] as any}
                          size="small"
                        >
                          {sh.StepType}
                        </Badge>
                        {sh.ActionType && (
                          <Badge
                            color={sh.ActionType === 'Rejected' ? 'danger' : 'success'}
                            size="small"
                          >
                            {sh.ActionType}
                          </Badge>
                        )}
                      </div>
                      {sh.ActionBy && (
                        <Text className={styles.meta}>
                          {sh.ActionBy} — {sh.ActionDate ? new Date(sh.ActionDate).toLocaleString() : ''}
                        </Text>
                      )}
                      {sh.Comments && (
                        <Text className={styles.meta} style={{ fontStyle: 'italic' }}>
                          "{sh.Comments}"
                        </Text>
                      )}
                      {sh.Status === StepStatus.Pending && (
                        <Text className={styles.meta}>Pending</Text>
                      )}
                      {sh.Status === StepStatus.InProgress && (
                        <Text className={styles.meta}>In progress — waiting for action</Text>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button
              className={styles.printButton}
              icon={<PrintRegular />}
              appearance="secondary"
              onClick={() => window.print()}
            >
              Print
            </Button>
            <Button appearance="primary" onClick={onDismiss}>Close</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
