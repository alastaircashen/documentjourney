import * as React from 'react';
import {
  Button,
  Dialog,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogContent,
  DialogActions,
  Textarea,
  makeStyles,
} from '@fluentui/react-components';
import {
  CheckmarkRegular,
  DismissRegular,
  ChatRegular,
  PenRegular,
} from '@fluentui/react-icons';
import { StepType } from '../../../constants';

export interface IActionButtonsProps {
  stepType: StepType;
  requireComments: boolean;
  onApprove: (comments?: string) => void;
  onReject: (comments?: string) => void;
  onComplete: (comments?: string) => void;
  onFeedback: (comments: string) => void;
}

const useStyles = makeStyles({
  actions: {
    display: 'flex',
    gap: '6px',
  },
});

export const ActionButtons: React.FC<IActionButtonsProps> = ({
  stepType,
  requireComments,
  onApprove,
  onReject,
  onComplete,
  onFeedback,
}) => {
  const styles = useStyles();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [dialogAction, setDialogAction] = React.useState<string>('');
  const [comments, setComments] = React.useState('');

  const openDialog = (action: string): void => {
    setDialogAction(action);
    setComments('');
    setDialogOpen(true);
  };

  const handleSubmit = (): void => {
    switch (dialogAction) {
      case 'approve': onApprove(comments); break;
      case 'reject': onReject(comments); break;
      case 'complete': onComplete(comments); break;
      case 'feedback': onFeedback(comments); break;
    }
    setDialogOpen(false);
  };

  const handleAction = (action: string, handler: (c?: string) => void): void => {
    if (requireComments || action === 'feedback') {
      openDialog(action);
    } else {
      handler();
    }
  };

  const renderButtons = (): React.ReactElement => {
    switch (stepType) {
      case StepType.Approval:
        return (
          <>
            <Button
              appearance="primary"
              size="small"
              icon={<CheckmarkRegular />}
              onClick={() => handleAction('approve', onApprove)}
            >
              Approve
            </Button>
            <Button
              size="small"
              icon={<DismissRegular />}
              onClick={() => handleAction('reject', onReject)}
              style={{ color: 'var(--colorPaletteRedForeground1)' }}
            >
              Reject
            </Button>
          </>
        );
      case StepType.Task:
        return (
          <Button
            appearance="primary"
            size="small"
            icon={<CheckmarkRegular />}
            onClick={() => handleAction('complete', onComplete)}
          >
            Mark Complete
          </Button>
        );
      case StepType.Feedback:
        return (
          <Button
            appearance="primary"
            size="small"
            icon={<ChatRegular />}
            onClick={() => handleAction('feedback', onFeedback)}
          >
            Add Feedback
          </Button>
        );
      case StepType.Signature:
        return (
          <Button
            appearance="primary"
            size="small"
            icon={<PenRegular />}
            onClick={() => handleAction('complete', onComplete)}
          >
            Sign
          </Button>
        );
      default:
        return <></>;
    }
  };

  return (
    <>
      <div className={styles.actions}>{renderButtons()}</div>
      <Dialog open={dialogOpen} onOpenChange={(_, { open }) => setDialogOpen(open)}>
        <DialogSurface>
          <DialogTitle>{dialogAction === 'reject' ? 'Reject' : dialogAction === 'feedback' ? 'Provide Feedback' : 'Comments'}</DialogTitle>
          <DialogBody>
            <DialogContent>
              <Textarea
                value={comments}
                onChange={(_, data) => setComments(data.value)}
                placeholder={dialogAction === 'feedback' ? 'Enter your feedback...' : 'Add comments (optional)...'}
                resize="vertical"
                style={{ width: '100%', minHeight: '80px' }}
              />
            </DialogContent>
            <DialogActions>
              <Button appearance="primary" onClick={handleSubmit}>Submit</Button>
              <Button appearance="secondary" onClick={() => setDialogOpen(false)}>Cancel</Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};
