import React, { useState } from 'react';
import {
  Button,
  Textarea,
  Text,
  Spinner,
  makeStyles,
  tokens,
  MessageBar,
  MessageBarBody,
} from '@fluentui/react-components';
import { IStepHistory } from '../models/IStepHistory';
import { StepType, ActionType } from '../shared/constants';
import { useDocumentJourney } from '../context/DocumentJourneyContext';

interface IProps {
  stepHistory: IStepHistory;
  onActionComplete: () => void;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  buttons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  commentArea: {
    marginTop: '4px',
  },
});

export const StepActions: React.FC<IProps> = ({ stepHistory, onActionComplete }) => {
  const styles = useStyles();
  const { journeyService, currentUserId } = useDocumentJourney();
  const [comments, setComments] = useState('');
  const [showComments, setShowComments] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState('');
  const [error, setError] = useState('');

  const handleAction = async (action: string) => {
    if (stepHistory.RequireComments && !comments && !showComments) {
      setPendingAction(action);
      setShowComments(true);
      return;
    }

    setProcessing(true);
    setError('');
    try {
      if (action === ActionType.Rejected) {
        await journeyService.rejectStep(stepHistory.Id, currentUserId, comments);
      } else {
        await journeyService.completeStep(stepHistory.Id, currentUserId, comments);
      }
      setComments('');
      setShowComments(false);
      onActionComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed. The step may have already been acted on.');
    }
    setProcessing(false);
  };

  const renderButtons = () => {
    switch (stepHistory.StepType) {
      case StepType.Approval:
        return (
          <>
            <Button appearance="primary" size="small" onClick={() => handleAction(ActionType.Approved)} disabled={processing}>
              {processing ? <Spinner size="tiny" /> : 'Approve'}
            </Button>
            {stepHistory.AllowReject && (
              <Button
                appearance="subtle"
                size="small"
                onClick={() => handleAction(ActionType.Rejected)}
                disabled={processing}
                style={{ color: tokens.colorPaletteRedForeground1 }}
              >
                Reject
              </Button>
            )}
          </>
        );
      case StepType.Task:
        return (
          <Button appearance="primary" size="small" onClick={() => handleAction(ActionType.Completed)} disabled={processing}>
            {processing ? <Spinner size="tiny" /> : 'Mark Complete'}
          </Button>
        );
      case StepType.Feedback:
        return (
          <Button appearance="primary" size="small" onClick={() => { setShowComments(true); setPendingAction(ActionType.FeedbackProvided); }} disabled={processing}>
            Add Feedback
          </Button>
        );
      case StepType.Signature:
        return (
          <Button appearance="primary" size="small" onClick={() => handleAction(ActionType.Signed)} disabled={processing}>
            {processing ? <Spinner size="tiny" /> : 'Sign'}
          </Button>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <Text weight="semibold" size={200}>
        Current step: {stepHistory.StepName}
      </Text>

      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}

      {showComments && (
        <div className={styles.commentArea}>
          <Textarea
            value={comments}
            onChange={(_e, data) => setComments(data.value)}
            placeholder={stepHistory.StepType === StepType.Feedback ? 'Enter your feedback...' : 'Add a comment...'}
            resize="vertical"
            style={{ width: '100%', minHeight: '60px' }}
          />
          <div className={styles.buttons} style={{ marginTop: '8px' }}>
            <Button
              appearance="primary"
              size="small"
              onClick={() => handleAction(pendingAction)}
              disabled={processing || (stepHistory.RequireComments && !comments)}
            >
              {processing ? <Spinner size="tiny" /> : 'Submit'}
            </Button>
            <Button appearance="subtle" size="small" onClick={() => { setShowComments(false); setComments(''); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {!showComments && (
        <div className={styles.buttons}>
          {renderButtons()}
        </div>
      )}
    </div>
  );
};
