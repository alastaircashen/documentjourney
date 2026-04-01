import * as React from 'react';
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Text,
  Badge,
  Spinner,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { IHistory } from '../../../models/IHistory';
import { IStepHistory } from '../../../models/IStepHistory';
import { StepStatus, StepType, STEP_TYPE_COLORS } from '../../../constants';
import { useDocumentJourney } from '../../../common/DocumentJourneyContext';

export interface IJourneyHistoryViewProps {
  history: IHistory;
  onDismiss: () => void;
}

const useStyles = makeStyles({
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0px',
    paddingLeft: '8px',
    paddingTop: '16px',
  },
  stepRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  connector: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '28px',
    flexShrink: 0,
  },
  circleCompleted: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: tokens.colorPaletteGreenBackground3,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  },
  circleRejected: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  },
  circlePending: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: tokens.colorNeutralBackground4,
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
  },
  lineSolid: {
    width: '2px',
    height: '20px',
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },
  lineDashed: {
    width: '2px',
    height: '20px',
    borderLeftWidth: '2px',
    borderLeftStyle: 'dashed',
    borderLeftColor: tokens.colorNeutralStroke1,
  },
  stepContent: {
    paddingBottom: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  meta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  comments: {
    fontStyle: 'italic',
    color: tokens.colorNeutralForeground3,
    paddingTop: '4px',
  },
  delegation: {
    color: tokens.colorNeutralForeground3,
    paddingTop: '2px',
    fontSize: '12px',
  },
});

export const JourneyHistoryView: React.FC<IJourneyHistoryViewProps> = ({ history, onDismiss }) => {
  const styles = useStyles();
  const { journeyService } = useDocumentJourney();
  const [stepHistories, setStepHistories] = React.useState<IStepHistory[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const steps = await journeyService.getJourneyStepHistory(history.Id);
        setStepHistories(steps);
      } catch {
        // Handle silently
      }
      setLoading(false);
    };
    load().catch(() => {});
  }, [history.Id]);

  const getCircleClass = (status: StepStatus): string => {
    if (status === StepStatus.Completed) return styles.circleCompleted;
    if (status === StepStatus.Rejected) return styles.circleRejected;
    return styles.circlePending;
  };

  const getCircleIcon = (status: StepStatus): string => {
    if (status === StepStatus.Completed) return '\u2713';
    if (status === StepStatus.Rejected) return '\u2717';
    return '\u25CB';
  };

  const handlePrint = (): void => {
    const printWindow = window.open('', '_blank', 'width=700,height=900');
    if (!printWindow) return;

    const stepsHtml = stepHistories.map(sh => `
      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <div style="width:28px;height:28px;border-radius:50%;background:${sh.Status === 'Completed' ? '#107c10' : sh.Status === 'Rejected' ? '#d13438' : '#c8c8c8'};color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:14px;">
          ${sh.Status === 'Completed' ? '&#10003;' : sh.Status === 'Rejected' ? '&#10007;' : '&#9675;'}
        </div>
        <div>
          <div style="font-weight:600;">${sh.StepName}</div>
          <div style="color:#666;font-size:13px;">${sh.StepType} &bull; ${sh.Status}${sh.ActionDate ? ' &bull; ' + new Date(sh.ActionDate).toLocaleString() : ''}</div>
          ${sh.Comments ? '<div style="font-style:italic;color:#888;font-size:13px;">"' + sh.Comments + '"</div>' : ''}
          ${sh.DelegatedFrom ? '<div style="color:#888;font-size:12px;">Delegated from original assignee</div>' : ''}
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${history.JourneyName} - ${history.DocumentName}</title>
        <style>
          body { font-family: 'Segoe UI', sans-serif; padding: 24px; color: #323130; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          .meta { color: #605e5c; font-size: 13px; margin-bottom: 16px; }
          .status { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; color: #fff; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${history.JourneyName}</h1>
        <div class="meta">${history.DocumentName} &bull; Started ${new Date(history.InitiatedDate).toLocaleDateString()}${history.CompletedDate ? ' &bull; Ended ' + new Date(history.CompletedDate).toLocaleDateString() : ''}</div>
        <div class="status" style="background:${history.Status === 'Completed' ? '#107c10' : history.Status === 'Rejected' ? '#d13438' : history.Status === 'Active' ? '#0078d4' : '#a19f9d'}">${history.Status}</div>
        <hr style="margin:16px 0;border:none;border-top:1px solid #edebe9;">
        ${stepsHtml}
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={true} onOpenChange={() => onDismiss()}>
      <DialogSurface style={{ maxWidth: '640px', width: '90vw' }}>
        <DialogBody>
          <DialogTitle>{history.JourneyName} — {history.DocumentName}</DialogTitle>
          <DialogContent>
            {loading ? (
              <Spinner label="Loading history..." />
            ) : (
              <div className={styles.timeline}>
                {stepHistories.map((sh, index) => (
                  <div key={sh.Id}>
                    <div className={styles.stepRow}>
                      <div className={styles.connector}>
                        <div className={getCircleClass(sh.Status as StepStatus)}>
                          {getCircleIcon(sh.Status as StepStatus)}
                        </div>
                        {index < stepHistories.length - 1 && (
                          <div className={
                            sh.Status === StepStatus.Completed ? styles.lineSolid : styles.lineDashed
                          } />
                        )}
                      </div>
                      <div className={styles.stepContent}>
                        <Text weight="semibold">{sh.StepName}</Text>
                        <div className={styles.meta}>
                          <Badge
                            appearance="filled"
                            color={STEP_TYPE_COLORS[sh.StepType as StepType] as any}
                            size="small"
                          >
                            {sh.StepType}
                          </Badge>
                          <Badge
                            appearance="outline"
                            size="small"
                          >
                            {sh.Status}
                          </Badge>
                          {sh.ActionDate && (
                            <Text size={200}>
                              {new Date(sh.ActionDate).toLocaleString()}
                            </Text>
                          )}
                        </div>
                        {sh.DelegatedFrom && (
                          <Text size={200} className={styles.delegation}>
                            Delegated from original assignee
                          </Text>
                        )}
                        {sh.Comments && (
                          <Text size={200} className={styles.comments}>
                            "{sh.Comments}"
                          </Text>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={handlePrint}>
              Print
            </Button>
            <Button appearance="primary" onClick={onDismiss}>
              Close
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
