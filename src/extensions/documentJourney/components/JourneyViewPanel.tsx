import * as React from 'react';
import {
  Title3,
  Text,
  Badge,
  Spinner,
  Button,
  MessageBar,
  MessageBarBody,
  Textarea
} from '@fluentui/react-components';
import {
  CheckmarkCircle20Filled,
  DismissCircle20Filled,
  Circle20Regular,
  ArrowCircleRight20Filled,
  DocumentRegular,
  CalendarRegular,
  PersonRegular
} from '@fluentui/react-icons';
import { IHistory } from '../../../models/IHistory';
import { IStepHistory } from '../../../models/IStepHistory';
import { JourneyStatus, StepStatus, StepType, STEP_TYPE_COLORS, ActionType } from '../../../constants';
import { useDocumentJourney } from '../../../common/DocumentJourneyContext';
import { UserDisplay, SingleUserDisplay } from '../../../components/UserDisplay';

export interface IJourneyViewPanelProps {
  historyId: number;
  onDismiss: () => void;
}

// Inline styles for critical layout — avoids Griffel CSS race condition
const overlayStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0, left: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.4)', zIndex: 1000000,
  display: 'flex', justifyContent: 'flex-end',
};
const panelStyle: React.CSSProperties = {
  width: '560px', maxWidth: '100vw', height: '100%',
  backgroundColor: '#fff', boxShadow: '0 0 32px rgba(0,0,0,0.18)',
  display: 'flex', flexDirection: 'column',
};
const headerStyle: React.CSSProperties = {
  padding: '20px 24px 16px', borderBottom: '1px solid #e0e0e0', flexShrink: 0,
};
const bodyStyle: React.CSSProperties = {
  flex: 1, padding: '0', overflowY: 'auto',
};
const footerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'flex-end', gap: '8px',
  padding: '12px 24px', borderTop: '1px solid #e0e0e0', flexShrink: 0,
};

const stepRowStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'stretch', minHeight: '60px',
};
const stepLabelCol: React.CSSProperties = {
  width: '100px', flexShrink: 0, textAlign: 'right', paddingRight: '16px',
  paddingTop: '12px', fontSize: '13px', fontWeight: 600, color: '#323130',
};
const stepConnectorCol: React.CSSProperties = {
  width: '32px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center',
};
const stepContentCol: React.CSSProperties = {
  flex: 1, paddingLeft: '12px', paddingTop: '12px', paddingBottom: '16px', paddingRight: '24px',
};
const iconStyle: React.CSSProperties = { marginTop: '12px', flexShrink: 0 };
const lineCompleted: React.CSSProperties = { width: '2px', flex: 1, backgroundColor: '#107c10' };
const linePending: React.CSSProperties = { width: '2px', flex: 1, borderLeft: '2px dashed #c8c8c8' };
const activeCardStyle: React.CSSProperties = {
  backgroundColor: '#f0f6ff', border: '1px solid #0078d4', borderRadius: '8px',
  padding: '12px 16px', marginTop: '4px',
};
const detailLine: React.CSSProperties = { fontSize: '12px', color: '#605e5c', lineHeight: '20px' };
const commentText: React.CSSProperties = { fontSize: '12px', color: '#605e5c', fontStyle: 'italic', marginTop: '4px' };

const statusColors: Record<string, string> = {
  [JourneyStatus.Active]: '#0078d4',
  [JourneyStatus.Completed]: '#107c10',
  [JourneyStatus.Rejected]: '#d13438',
  [JourneyStatus.Cancelled]: '#a19f9d',
  [JourneyStatus.Stalled]: '#ca5010',
};

export const JourneyViewPanel: React.FC<IJourneyViewPanelProps> = ({ historyId, onDismiss }) => {
  const { listService, journeyService, sp } = useDocumentJourney();

  const [history, setHistory] = React.useState<IHistory | undefined>(undefined);
  const [stepHistories, setStepHistories] = React.useState<IStepHistory[]>([]);
  const [allJourneys, setAllJourneys] = React.useState<IHistory[]>([]);
  const [activeHistoryId, setActiveHistoryId] = React.useState(historyId);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [currentUserId, setCurrentUserId] = React.useState(0);
  const [actionComments, setActionComments] = React.useState('');
  const [actionLoading, setActionLoading] = React.useState(false);
  const [cancelConfirm, setCancelConfirm] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState('');
  const [showHistory, setShowHistory] = React.useState(false);

  const loadData = async (hId?: number): Promise<void> => {
    const loadId = hId || activeHistoryId;
    try {
      const [hist, steps, user] = await Promise.all([
        listService.getItemById<IHistory>('DJ_History', loadId),
        journeyService.getJourneyStepHistory(loadId),
        sp.web.currentUser()
      ]);
      setHistory(hist);
      setStepHistories(steps);
      setCurrentUserId(user.Id);

      // Load all journeys for this document (for toggle)
      if (hist.DocumentUrl) {
        const docJourneys = await listService.getItems<IHistory>(
          'DJ_History',
          `DocumentUrl eq '${hist.DocumentUrl}'`,
          undefined,
          'InitiatedDate'
        );
        setAllJourneys(docJourneys);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load journey');
    }
    setLoading(false);
  };

  React.useEffect(() => { loadData().catch(() => {}); }, [activeHistoryId]);

  const switchJourney = (id: number): void => {
    setLoading(true);
    setActiveHistoryId(id);
  };

  const handleCancel = async (): Promise<void> => {
    if (!history) return;
    setActionLoading(true);
    try {
      await journeyService.cancelJourney(history.Id, cancelReason);
      setCancelConfirm(false);
      setCancelReason('');
      await loadData(history.Id);
    } catch {
      // Handle error
    }
    setActionLoading(false);
  };

  const handleAction = async (stepHistoryId: number, action: string): Promise<void> => {
    setActionLoading(true);
    try {
      if (action === ActionType.Rejected) {
        await journeyService.rejectStep(stepHistoryId, currentUserId, actionComments);
      } else {
        await journeyService.completeStep(stepHistoryId, currentUserId, actionComments);
      }
      setActionComments('');
      await loadData();
    } catch {
      // Handle error
    }
    setActionLoading(false);
  };

  const getStepIcon = (sh: IStepHistory, isActive: boolean): React.ReactNode => {
    if (sh.Status === StepStatus.Completed) {
      return <CheckmarkCircle20Filled style={{ ...iconStyle, color: '#107c10' }} />;
    }
    if (sh.Status === StepStatus.Rejected) {
      return <DismissCircle20Filled style={{ ...iconStyle, color: '#d13438' }} />;
    }
    if (isActive) {
      return <ArrowCircleRight20Filled style={{ ...iconStyle, color: '#0078d4' }} />;
    }
    return <Circle20Regular style={{ ...iconStyle, color: '#c8c8c8' }} />;
  };

  const renderActionCard = (sh: IStepHistory): React.ReactNode => {
    if (sh.Status !== StepStatus.Pending) return null;
    if (!history || history.Status !== JourneyStatus.Active) return null;
    if (sh.StepOrder !== history.CurrentStepOrder) return null;

    return (
      <div style={activeCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <PersonRegular style={{ fontSize: '14px', color: '#0078d4' }} />
          <Text size={200} weight="semibold" style={{ color: '#0078d4' }}>Action required</Text>
          {sh.DueDate && (
            <>
              <span style={{ color: '#e0e0e0' }}>|</span>
              <CalendarRegular style={{ fontSize: '14px', color: '#605e5c' }} />
              <Text size={200} style={{ color: '#605e5c' }}>Due {new Date(sh.DueDate).toLocaleDateString()}</Text>
            </>
          )}
        </div>

        {(sh.RequireComments || sh.StepType === StepType.Feedback) && (
          <Textarea
            value={actionComments}
            onChange={(_e, data) => setActionComments(data.value)}
            placeholder={sh.StepType === StepType.Feedback ? 'Enter your feedback...' : 'Add comments...'}
            resize="vertical"
            size="small"
            style={{ width: '100%', marginBottom: '8px', minHeight: '60px' }}
          />
        )}

        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {sh.StepType === StepType.Approval && (
            <>
              <Button appearance="primary" size="small" disabled={actionLoading} onClick={() => handleAction(sh.Id, ActionType.Approved)}>
                Approve
              </Button>
              {sh.AllowReject && (
                <Button appearance="outline" size="small" disabled={actionLoading} style={{ color: '#d13438', borderColor: '#d13438' }} onClick={() => handleAction(sh.Id, ActionType.Rejected)}>
                  Reject
                </Button>
              )}
            </>
          )}
          {sh.StepType === StepType.Task && (
            <Button appearance="primary" size="small" disabled={actionLoading} onClick={() => handleAction(sh.Id, ActionType.Completed)}>
              Mark Complete
            </Button>
          )}
          {sh.StepType === StepType.Feedback && (
            <Button appearance="primary" size="small" disabled={actionLoading || !actionComments.trim()} onClick={() => handleAction(sh.Id, ActionType.FeedbackProvided)}>
              Submit Feedback
            </Button>
          )}
          {sh.StepType === StepType.Signature && (
            <Button appearance="primary" size="small" disabled={actionLoading} onClick={() => handleAction(sh.Id, ActionType.Signed)}>
              Sign
            </Button>
          )}
          {sh.StepType === StepType.Notification && (
            <Text size={200} style={{ color: '#605e5c' }}>Notification sent automatically</Text>
          )}
        </div>
      </div>
    );
  };

  const handlePrint = (): void => {
    if (!history) return;
    const printWindow = window.open('', '_blank', 'width=700,height=900');
    if (!printWindow) return;

    const stepsHtml = stepHistories.map(sh => `
      <div style="display:flex;gap:16px;margin-bottom:16px;align-items:flex-start;">
        <div style="width:100px;text-align:right;font-weight:600;font-size:13px;color:#323130;flex-shrink:0;">${sh.StepName}</div>
        <div style="width:12px;height:12px;border-radius:50%;background:${sh.Status === 'Completed' ? '#107c10' : sh.Status === 'Rejected' ? '#d13438' : '#c8c8c8'};margin-top:4px;flex-shrink:0;"></div>
        <div style="flex:1;">
          <div style="font-size:12px;color:#605e5c;">${sh.StepType} &bull; ${sh.Status}${sh.ActionDate ? ' &bull; ' + new Date(sh.ActionDate).toLocaleString() : ''}</div>
          ${sh.Comments ? '<div style="font-style:italic;color:#888;font-size:12px;margin-top:2px;">&ldquo;' + sh.Comments + '&rdquo;</div>' : ''}
        </div>
      </div>
    `).join('');

    printWindow.document.write(`<!DOCTYPE html><html><head><title>${history.JourneyName} - ${history.DocumentName}</title>
      <style>body{font-family:'Segoe UI',sans-serif;padding:24px;color:#323130;}h1{font-size:18px;margin-bottom:4px;}.meta{color:#605e5c;font-size:13px;margin-bottom:16px;}.badge{display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:600;color:#fff;}@media print{body{padding:0;}}</style>
      </head><body>
      <h1>${history.JourneyName}</h1>
      <div class="meta">${history.DocumentName} &bull; Started ${new Date(history.InitiatedDate).toLocaleDateString()}${history.CompletedDate ? ' &bull; Ended ' + new Date(history.CompletedDate).toLocaleDateString() : ''}</div>
      <div class="badge" style="background:${statusColors[history.Status] || '#a19f9d'}">${history.Status}</div>
      <hr style="margin:16px 0;border:none;border-top:1px solid #edebe9;">
      ${stepsHtml}
      <script>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div style={overlayStyle} onClick={onDismiss}>
      <div style={panelStyle} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <Title3>{history?.JourneyName || 'Journey Details'}</Title3>
              {history && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <DocumentRegular style={{ fontSize: '14px', color: '#605e5c' }} />
                  <Text size={200} style={{ color: '#605e5c' }}>{history.DocumentName}</Text>
                </div>
              )}
            </div>
            <Button appearance="subtle" onClick={onDismiss}>&#10005;</Button>
          </div>
          {history && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                <Badge
                  appearance="filled"
                  style={{ backgroundColor: statusColors[history.Status] || '#a19f9d' }}
                >
                  {history.Status}
                </Badge>
                <Text size={200} style={{ color: '#605e5c' }}>
                  Step {history.CurrentStepOrder} of {history.TotalSteps}
                  {' \u2022 '}Started {new Date(history.InitiatedDate).toLocaleDateString()}
                  {history.CompletedDate && (
                    <> {' \u2022 '}{history.Status === JourneyStatus.Completed ? 'Completed' : 'Ended'} {new Date(history.CompletedDate).toLocaleDateString()}</>
                  )}
                </Text>
              </div>

              {/* Journey tabs and history */}
              {allJourneys.length > 0 && (() => {
                const activeJourneys = allJourneys.filter(j => j.Status === JourneyStatus.Active);
                const finishedJourneys = allJourneys.filter(j => j.Status !== JourneyStatus.Active);

                return (
                  <>
                    {/* Active journey tabs */}
                    {activeJourneys.length > 0 && !showHistory && (
                      <div style={{ display: 'flex', gap: '4px', marginTop: '10px', borderBottom: '1px solid #e0e0e0', paddingBottom: '8px' }}>
                        {activeJourneys.map(j => (
                          <Button
                            key={j.Id}
                            size="small"
                            appearance={j.Id === activeHistoryId ? 'primary' : 'subtle'}
                            onClick={() => switchJourney(j.Id)}
                          >
                            {j.JourneyName}
                          </Button>
                        ))}
                        {finishedJourneys.length > 0 && (
                          <Button size="small" appearance="subtle" onClick={() => setShowHistory(true)} style={{ color: '#605e5c', marginLeft: 'auto' }}>
                            History ({finishedJourneys.length})
                          </Button>
                        )}
                      </div>
                    )}

                    {/* No active journeys — prompt to view history */}
                    {activeJourneys.length === 0 && !showHistory && (
                      <div style={{ marginTop: '10px', textAlign: 'center', padding: '12px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
                        <Text size={200} style={{ color: '#605e5c' }}>No active journeys for this document</Text>
                        <br />
                        <Button size="small" appearance="outline" onClick={() => setShowHistory(true)} style={{ marginTop: '8px' }}>
                          View journey history ({finishedJourneys.length})
                        </Button>
                      </div>
                    )}

                    {/* History list */}
                    {showHistory && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <Text weight="semibold" size={300}>Journey History</Text>
                          {activeJourneys.length > 0 && (
                            <Button size="small" appearance="subtle" onClick={() => setShowHistory(false)} style={{ color: '#605e5c' }}>
                              Back to active
                            </Button>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {allJourneys.map(j => (
                            <div
                              key={j.Id}
                              onClick={() => { setShowHistory(false); switchJourney(j.Id); }}
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '8px 12px', borderRadius: '4px', cursor: 'pointer',
                                backgroundColor: j.Id === activeHistoryId ? '#f0f6ff' : '#fafafa',
                                border: j.Id === activeHistoryId ? '1px solid #0078d4' : '1px solid transparent',
                              }}
                            >
                              <div>
                                <Text weight="semibold" size={200}>{j.JourneyName}</Text>
                                <br />
                                <Text size={100} style={{ color: '#605e5c' }}>
                                  {new Date(j.InitiatedDate).toLocaleDateString()}
                                  {j.CompletedDate && <> &mdash; {new Date(j.CompletedDate).toLocaleDateString()}</>}
                                </Text>
                              </div>
                              <Badge
                                appearance="filled"
                                size="small"
                                style={{ backgroundColor: statusColors[j.Status] || '#a19f9d' }}
                              >
                                {j.Status}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>

        {/* Body — Timeline */}
        <div style={bodyStyle}>
          {loading && <div style={{ padding: '32px', textAlign: 'center' }}><Spinner label="Loading journey..." /></div>}

          {error && (
            <div style={{ padding: '24px' }}>
              <MessageBar intent="error"><MessageBarBody>{error}</MessageBarBody></MessageBar>
            </div>
          )}

          {!loading && !error && history && (
            <div style={{ padding: '8px 0' }}>
              {stepHistories.map((sh, index) => {
                const isActive = sh.StepOrder === history.CurrentStepOrder && history.Status === JourneyStatus.Active;
                const isLast = index === stepHistories.length - 1;

                return (
                  <div key={sh.Id} style={stepRowStyle}>
                    {/* Left label */}
                    <div style={stepLabelCol}>
                      <div>{sh.StepName}</div>
                      <div style={{ marginTop: '4px' }}>
                        <Badge
                          appearance="tint"
                          color={STEP_TYPE_COLORS[sh.StepType as StepType] as 'brand' | 'danger' | 'important' | 'informative' | 'severe' | 'subtle' | 'success' | 'warning'}
                          size="small"
                        >
                          {sh.StepType}
                        </Badge>
                      </div>
                    </div>

                    {/* Connector */}
                    <div style={stepConnectorCol}>
                      {getStepIcon(sh, isActive)}
                      {!isLast && (
                        <div style={sh.Status === StepStatus.Completed ? lineCompleted : linePending} />
                      )}
                    </div>

                    {/* Content */}
                    <div style={stepContentCol}>
                      {sh.Status === StepStatus.Completed && sh.ActionDate && (
                        <div style={detailLine}>
                          Completed {new Date(sh.ActionDate).toLocaleString()}
                          {sh.ActionById ? <span style={{ marginLeft: '4px' }}> by </span> : ''}
                          {sh.ActionById ? <SingleUserDisplay userId={sh.ActionById} /> : null}
                        </div>
                      )}
                      {sh.Status === StepStatus.Rejected && sh.ActionDate && (
                        <div style={{ ...detailLine, color: '#d13438' }}>
                          Rejected {new Date(sh.ActionDate).toLocaleString()}
                          {sh.ActionById ? <span style={{ marginLeft: '4px' }}> by </span> : ''}
                          {sh.ActionById ? <SingleUserDisplay userId={sh.ActionById} /> : null}
                        </div>
                      )}
                      {sh.Status === StepStatus.Skipped && (
                        <div style={detailLine}>Skipped</div>
                      )}
                      {sh.Status === StepStatus.Pending && sh.AssignedToId && sh.AssignedToId.length > 0 && (
                        <UserDisplay userIds={sh.AssignedToId} prefix="Waiting on" />
                      )}

                      {sh.Comments && (
                        <div style={commentText}>&ldquo;{sh.Comments}&rdquo;</div>
                      )}

                      {sh.DelegatedFrom && (
                        <div style={{ ...detailLine, fontSize: '11px', marginTop: '2px' }}>
                          Delegated from original assignee
                        </div>
                      )}

                      {/* Action card for active step */}
                      {isActive && renderActionCard(sh)}

                      {/* Future pending step */}
                      {sh.Status === StepStatus.Pending && !isActive && (
                        <div style={{ ...detailLine, color: '#a19f9d' }}>Not yet started</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cancel confirmation */}
        {cancelConfirm && (
          <div style={{ padding: '12px 24px', backgroundColor: '#fdf3f4', borderTop: '1px solid #d13438' }}>
            <Text weight="semibold" style={{ color: '#d13438' }}>Cancel this journey?</Text>
            <Textarea
              value={cancelReason}
              onChange={(_e, data) => setCancelReason(data.value)}
              placeholder="Reason for cancellation (optional)..."
              resize="vertical"
              size="small"
              style={{ width: '100%', marginTop: '8px', minHeight: '50px' }}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
              <Button appearance="primary" size="small" style={{ backgroundColor: '#d13438' }} disabled={actionLoading} onClick={handleCancel}>
                {actionLoading ? 'Cancelling...' : 'Confirm Cancel'}
              </Button>
              <Button appearance="secondary" size="small" onClick={() => setCancelConfirm(false)}>Keep Active</Button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={footerStyle}>
          {history && history.Status === JourneyStatus.Active && !cancelConfirm && (
            <Button appearance="subtle" size="small" style={{ color: '#d13438', marginRight: 'auto' }} onClick={() => setCancelConfirm(true)}>
              Cancel Journey
            </Button>
          )}
          <Button appearance="secondary" size="small" onClick={handlePrint}>Print</Button>
          <Button appearance="primary" size="small" onClick={onDismiss}>Close</Button>
        </div>
      </div>
    </div>
  );
};
