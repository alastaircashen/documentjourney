import * as React from 'react';
import {
  Button,
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Textarea,
  Menu,
  MenuTrigger,
  MenuList,
  MenuItem,
  MenuPopover,
  Input,
  makeStyles
} from '@fluentui/react-components';
import { MoreHorizontalRegular } from '@fluentui/react-icons';
import { StepType } from '../../../constants';

export interface IActionButtonsProps {
  stepType: StepType;
  requireComments: boolean;
  allowDelegate: boolean;
  onAction: (action: string, comments?: string) => void;
  onDelegate?: (newAssigneeId: number) => void;
}

const useStyles = makeStyles({
  actions: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  },
});

export const ActionButtons: React.FC<IActionButtonsProps> = ({ stepType, requireComments, allowDelegate, onAction, onDelegate }) => {
  const styles = useStyles();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState('');
  const [comments, setComments] = React.useState('');
  const [delegateDialogOpen, setDelegateDialogOpen] = React.useState(false);
  const [delegateEmail, setDelegateEmail] = React.useState('');

  const handleAction = (action: string): void => {
    if (requireComments) {
      setPendingAction(action);
      setDialogOpen(true);
    } else {
      onAction(action);
    }
  };

  const handleConfirm = (): void => {
    onAction(pendingAction, comments);
    setDialogOpen(false);
    setComments('');
    setPendingAction('');
  };

  const handleDelegateConfirm = (): void => {
    // In a real implementation, this would resolve the email to a user ID via PeoplePicker
    // For now we pass a placeholder - the actual PeoplePicker integration requires SPFx context
    if (onDelegate && delegateEmail) {
      onDelegate(0); // Would be resolved user ID
    }
    setDelegateDialogOpen(false);
    setDelegateEmail('');
  };

  const renderButtons = (): React.ReactNode => {
    switch (stepType) {
      case StepType.Approval:
        return (
          <>
            <Button appearance="primary" size="small" onClick={() => handleAction('Approved')}>
              Approve
            </Button>
            <Button appearance="subtle" size="small" onClick={() => handleAction('Rejected')}>
              Reject
            </Button>
          </>
        );
      case StepType.Task:
        return (
          <Button appearance="primary" size="small" onClick={() => handleAction('Completed')}>
            Mark Complete
          </Button>
        );
      case StepType.Feedback:
        return (
          <Button appearance="primary" size="small" onClick={() => handleAction('FeedbackProvided')}>
            Add Feedback
          </Button>
        );
      case StepType.Signature:
        return (
          <Button appearance="primary" size="small" onClick={() => handleAction('Signed')}>
            Sign
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <div className={styles.actions}>
        {renderButtons()}
        {allowDelegate && (
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Button appearance="subtle" size="small" icon={<MoreHorizontalRegular />} />
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem onClick={() => setDelegateDialogOpen(true)}>
                  Delegate
                </MenuItem>
              </MenuList>
            </MenuPopover>
          </Menu>
        )}
      </div>

      {/* Comments dialog */}
      <Dialog open={dialogOpen} onOpenChange={(_e, data) => setDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Add Comments</DialogTitle>
            <DialogContent>
              <Textarea
                value={comments}
                onChange={(_e, data) => setComments(data.value)}
                placeholder="Enter your comments..."
                resize="vertical"
                style={{ width: '100%', minHeight: '80px' }}
              />
            </DialogContent>
            <DialogActions>
              <DialogTrigger disableButtonEnhancement>
                <Button appearance="secondary">Cancel</Button>
              </DialogTrigger>
              <Button appearance="primary" onClick={handleConfirm}>
                Confirm
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>

      {/* Delegate dialog */}
      <Dialog open={delegateDialogOpen} onOpenChange={(_e, data) => setDelegateDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Delegate Step</DialogTitle>
            <DialogContent>
              <Input
                value={delegateEmail}
                onChange={(_e, data) => setDelegateEmail(data.value)}
                placeholder="Enter person's email address..."
                style={{ width: '100%' }}
              />
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setDelegateDialogOpen(false)}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleDelegateConfirm} disabled={!delegateEmail}>
                Delegate
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};
