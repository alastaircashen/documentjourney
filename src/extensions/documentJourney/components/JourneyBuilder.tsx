import * as React from 'react';
import {
  makeStyles,
  tokens,
  Input,
  Textarea,
  Button,
  Subtitle1,
  Subtitle2,
  Text,
  Card,
  Dropdown,
  Option,
  Switch,
  SpinButton,
  Divider,
  Badge
} from '@fluentui/react-components';
import { IAssignee } from '../../../models/IStepInstance';
import { SimplePeoplePicker } from '../../../components/SimplePeoplePicker';
import { StepType, CompletionRule, NotifyWho, StepNotify, STEP_TYPE_COLORS } from '../../../constants';

export interface IBuilderStep {
  title: string;
  stepType: StepType;
  assignedTo: IAssignee[];
  completionRule: CompletionRule;
  requireComments: boolean;
  dueDays: number;
  allowReject: boolean;
  allowDelegate: boolean;
  message: string;
  notifyWho: NotifyWho;
  stepNotify: StepNotify;
}

export interface IJourneyBuilderProps {
  onSave: (title: string, description: string, steps: IBuilderStep[]) => void;
  onCancel: () => void;
  saving: boolean;
}

const EMPTY_STEP: IBuilderStep = {
  title: '',
  stepType: StepType.Approval,
  assignedTo: [],
  completionRule: CompletionRule.All,
  requireComments: false,
  dueDays: 7,
  allowReject: true,
  allowDelegate: false,
  message: '',
  notifyWho: NotifyWho.Initiator,
  stepNotify: StepNotify.None
};

/** Returns default settings when switching step type */
function defaultsForType(stepType: StepType): Partial<IBuilderStep> {
  switch (stepType) {
    case StepType.Notification:
      return { dueDays: 0, requireComments: false, allowReject: false, allowDelegate: false, completionRule: CompletionRule.All, notifyWho: NotifyWho.Initiator, stepNotify: StepNotify.None };
    case StepType.Approval:
      return { dueDays: 7, requireComments: false, allowReject: true, allowDelegate: false, completionRule: CompletionRule.All, notifyWho: NotifyWho.Initiator, stepNotify: StepNotify.None };
    case StepType.Task:
      return { dueDays: 7, requireComments: false, allowReject: false, allowDelegate: true, completionRule: CompletionRule.All, notifyWho: NotifyWho.Initiator, stepNotify: StepNotify.None };
    case StepType.Feedback:
      return { dueDays: 14, requireComments: true, allowReject: false, allowDelegate: false, completionRule: CompletionRule.All, notifyWho: NotifyWho.Initiator, stepNotify: StepNotify.None };
    case StepType.Signature:
      return { dueDays: 14, requireComments: false, allowReject: false, allowDelegate: false, completionRule: CompletionRule.All, notifyWho: NotifyWho.Initiator, stepNotify: StepNotify.None };
    case StepType.Complete:
      return { dueDays: 0, requireComments: false, allowReject: false, allowDelegate: false, completionRule: CompletionRule.All, notifyWho: NotifyWho.Initiator, stepNotify: StepNotify.Initiator };
    default:
      return {};
  }
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  stepCard: {
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: tokens.colorBrandBackground,
    padding: '12px',
  },
  stepHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  stepFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  stepRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  switches: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '8px',
  },
  stepsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

export const JourneyBuilder: React.FC<IJourneyBuilderProps> = ({ onSave, onCancel, saving }) => {
  const styles = useStyles();
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [steps, setSteps] = React.useState<IBuilderStep[]>([{ ...EMPTY_STEP, title: 'Step 1' }]);
  const [completeStepTitle, setCompleteStepTitle] = React.useState('Complete');

  const addStep = (): void => {
    setSteps(prev => [...prev, { ...EMPTY_STEP, title: `Step ${prev.length + 1}` }]);
  };

  const removeStep = (index: number): void => {
    if (steps.length <= 1) return;
    setSteps(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof IBuilderStep, value: IBuilderStep[keyof IBuilderStep]): void => {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleTypeChange = (index: number, newType: StepType): void => {
    setSteps(prev => prev.map((s, i) =>
      i === index ? { ...s, stepType: newType, ...defaultsForType(newType) } : s
    ));
  };

  const moveStep = (index: number, direction: -1 | 1): void => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= steps.length) return;
    setSteps(prev => {
      const updated = [...prev];
      [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
      return updated;
    });
  };

  const canSave = title.trim() !== '' && steps.length > 0 && steps.every(s => s.title.trim() !== '');

  const handleSave = (): void => {
    if (!canSave) return;

    // Append the Complete step
    const allSteps: IBuilderStep[] = [
      ...steps,
      {
        ...EMPTY_STEP,
        title: completeStepTitle || 'Complete',
        stepType: StepType.Complete,
        ...defaultsForType(StepType.Complete)
      } as IBuilderStep
    ];

    onSave(title, description, allSteps);
  };

  const renderTypeSpecificFields = (step: IBuilderStep, index: number): React.ReactNode => {
    switch (step.stepType) {
      case StepType.Notification:
        return (
          <>
            <div className={styles.field}>
              <Text size={200}>Notify Who</Text>
              <Dropdown
                value={step.notifyWho}
                selectedOptions={[step.notifyWho]}
                onOptionSelect={(_e, data) => updateStep(index, 'notifyWho', data.optionValue as NotifyWho)}
                size="small"
              >
                <Option value={NotifyWho.Initiator}>Initiator</Option>
                <Option value={NotifyWho.AllParticipants}>All Participants</Option>
                <Option value={NotifyWho.SpecificPerson}>Specific Person</Option>
              </Dropdown>
            </div>
            {step.notifyWho === NotifyWho.SpecificPerson && (
              <SimplePeoplePicker
                label="Notify"
                selectedPeople={step.assignedTo}
                onChange={(people) => updateStep(index, 'assignedTo', people)}
                placeholder="user@company.com"
              />
            )}
            <div className={styles.field}>
              <Text size={200}>Message (optional)</Text>
              <Textarea value={step.message} onChange={(_e, data) => updateStep(index, 'message', data.value)} placeholder="Custom notification message..." resize="vertical" size="small" />
            </div>
          </>
        );

      case StepType.Approval:
        return (
          <>
            <SimplePeoplePicker label="Default Approvers" selectedPeople={step.assignedTo} onChange={(people) => updateStep(index, 'assignedTo', people)} placeholder="approver@company.com" />
            <div className={styles.stepRow}>
              <div className={styles.field}>
                <Text size={200}>Completion Rule</Text>
                <Dropdown value={step.completionRule} selectedOptions={[step.completionRule]} onOptionSelect={(_e, data) => updateStep(index, 'completionRule', data.optionValue as CompletionRule)} size="small">
                  <Option value={CompletionRule.All}>All must approve</Option>
                  <Option value={CompletionRule.One}>First response wins</Option>
                </Dropdown>
              </div>
              <div className={styles.field}>
                <Text size={200}>Due (days)</Text>
                <SpinButton value={step.dueDays} onChange={(_e, data) => updateStep(index, 'dueDays', data.value ?? 0)} min={0} max={365} size="small" />
              </div>
            </div>
            <div className={styles.switches}>
              <Switch checked={step.allowReject} onChange={(_e, data) => updateStep(index, 'allowReject', data.checked)} label="Allow Reject" />
              <Switch checked={step.requireComments} onChange={(_e, data) => updateStep(index, 'requireComments', data.checked)} label="Require Comments" />
              <Switch checked={step.allowDelegate} onChange={(_e, data) => updateStep(index, 'allowDelegate', data.checked)} label="Allow Delegate" />
            </div>
            <div className={styles.field}>
              <Text size={200}>Instructions (optional)</Text>
              <Textarea value={step.message} onChange={(_e, data) => updateStep(index, 'message', data.value)} placeholder="Instructions for the approver..." resize="vertical" size="small" />
            </div>
          </>
        );

      case StepType.Task:
        return (
          <>
            <SimplePeoplePicker label="Default Assignees" selectedPeople={step.assignedTo} onChange={(people) => updateStep(index, 'assignedTo', people)} placeholder="assignee@company.com" />
            <div className={styles.stepRow}>
              <div className={styles.field}>
                <Text size={200}>Completion Rule</Text>
                <Dropdown value={step.completionRule} selectedOptions={[step.completionRule]} onOptionSelect={(_e, data) => updateStep(index, 'completionRule', data.optionValue as CompletionRule)} size="small">
                  <Option value={CompletionRule.All}>All must complete</Option>
                  <Option value={CompletionRule.One}>First to complete wins</Option>
                </Dropdown>
              </div>
              <div className={styles.field}>
                <Text size={200}>Due (days)</Text>
                <SpinButton value={step.dueDays} onChange={(_e, data) => updateStep(index, 'dueDays', data.value ?? 0)} min={0} max={365} size="small" />
              </div>
            </div>
            <div className={styles.switches}>
              <Switch checked={step.requireComments} onChange={(_e, data) => updateStep(index, 'requireComments', data.checked)} label="Require Comments" />
              <Switch checked={step.allowDelegate} onChange={(_e, data) => updateStep(index, 'allowDelegate', data.checked)} label="Allow Delegate" />
            </div>
            <div className={styles.field}>
              <Text size={200}>Instructions (optional)</Text>
              <Textarea value={step.message} onChange={(_e, data) => updateStep(index, 'message', data.value)} placeholder="Instructions for the assignee..." resize="vertical" size="small" />
            </div>
          </>
        );

      case StepType.Feedback:
        return (
          <>
            <SimplePeoplePicker label="Default Reviewers" selectedPeople={step.assignedTo} onChange={(people) => updateStep(index, 'assignedTo', people)} placeholder="reviewer@company.com" />
            <div className={styles.stepRow}>
              <div className={styles.field}>
                <Text size={200}>Completion Rule</Text>
                <Dropdown value={step.completionRule} selectedOptions={[step.completionRule]} onOptionSelect={(_e, data) => updateStep(index, 'completionRule', data.optionValue as CompletionRule)} size="small">
                  <Option value={CompletionRule.All}>All must respond</Option>
                  <Option value={CompletionRule.One}>First response wins</Option>
                </Dropdown>
              </div>
              <div className={styles.field}>
                <Text size={200}>Due (days)</Text>
                <SpinButton value={step.dueDays} onChange={(_e, data) => updateStep(index, 'dueDays', data.value ?? 0)} min={0} max={365} size="small" />
              </div>
            </div>
            <div className={styles.field}>
              <Text size={200}>Prompt (optional)</Text>
              <Textarea value={step.message} onChange={(_e, data) => updateStep(index, 'message', data.value)} placeholder="What feedback should reviewers provide?" resize="vertical" size="small" />
            </div>
            <Text size={200} italic>Comments are always required for feedback steps.</Text>
          </>
        );

      case StepType.Signature:
        return (
          <>
            <SimplePeoplePicker label="Default Signers" selectedPeople={step.assignedTo} onChange={(people) => updateStep(index, 'assignedTo', people)} placeholder="signer@company.com" />
            <div className={styles.stepRow}>
              <div className={styles.field}>
                <Text size={200}>Completion Rule</Text>
                <Dropdown value={step.completionRule} selectedOptions={[step.completionRule]} onOptionSelect={(_e, data) => updateStep(index, 'completionRule', data.optionValue as CompletionRule)} size="small">
                  <Option value={CompletionRule.All}>All must sign</Option>
                  <Option value={CompletionRule.One}>First signature wins</Option>
                </Dropdown>
              </div>
              <div className={styles.field}>
                <Text size={200}>Due (days)</Text>
                <SpinButton value={step.dueDays} onChange={(_e, data) => updateStep(index, 'dueDays', data.value ?? 0)} min={0} max={365} size="small" />
              </div>
            </div>
            <div className={styles.field}>
              <Text size={200}>Message (optional)</Text>
              <Textarea value={step.message} onChange={(_e, data) => updateStep(index, 'message', data.value)} placeholder="Message to include with the signature request..." resize="vertical" size="small" />
            </div>
          </>
        );
    }
  };

  return (
    <div className={styles.container}>
      <Subtitle1>Create a Journey</Subtitle1>

      <div className={styles.field}>
        <Text weight="semibold">Journey Name</Text>
        <Input
          value={title}
          onChange={(_e, data) => setTitle(data.value)}
          placeholder="e.g. Document Review & Approval"
        />
      </div>

      <div className={styles.field}>
        <Text weight="semibold">Description</Text>
        <Textarea
          value={description}
          onChange={(_e, data) => setDescription(data.value)}
          placeholder="Describe what this journey does..."
          resize="vertical"
        />
      </div>

      <Divider />

      <div className={styles.stepsHeader}>
        <Subtitle2>Steps</Subtitle2>
        <Button appearance="outline" size="small" onClick={addStep}>+ Add Step</Button>
      </div>

      {steps.map((step, index) => (
        <Card key={index} className={styles.stepCard}>
          <div className={styles.stepHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Badge appearance="filled" color={STEP_TYPE_COLORS[step.stepType] as 'brand' | 'danger' | 'important' | 'informative' | 'severe' | 'subtle' | 'success' | 'warning'}>
                {index + 1}
              </Badge>
              <Text weight="semibold">{step.title || `Step ${index + 1}`}</Text>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              <Button appearance="subtle" size="small" disabled={index === 0} onClick={() => moveStep(index, -1)}>&#9650;</Button>
              <Button appearance="subtle" size="small" disabled={index === steps.length - 1} onClick={() => moveStep(index, 1)}>&#9660;</Button>
              <Button appearance="subtle" size="small" disabled={steps.length <= 1} onClick={() => removeStep(index)}>&#10005;</Button>
            </div>
          </div>

          <div className={styles.stepFields}>
            <div className={styles.stepRow}>
              <div className={styles.field} style={{ flex: 1 }}>
                <Text size={200}>Step Name</Text>
                <Input
                  value={step.title}
                  onChange={(_e, data) => updateStep(index, 'title', data.value)}
                  placeholder="Step name"
                  size="small"
                />
              </div>
              <div className={styles.field}>
                <Text size={200}>Type</Text>
                <Dropdown
                  value={step.stepType}
                  selectedOptions={[step.stepType]}
                  onOptionSelect={(_e, data) => handleTypeChange(index, data.optionValue as StepType)}
                  size="small"
                >
                  {[StepType.Notification, StepType.Approval, StepType.Signature, StepType.Task, StepType.Feedback].map((t: StepType) => (
                    <Option key={t} value={t}>{t}</Option>
                  ))}
                </Dropdown>
              </div>
            </div>

            {renderTypeSpecificFields(step, index)}

            {/* Notification toggle — available on all action steps */}
            {step.stepType !== StepType.Notification && step.stepType !== StepType.Complete && (
              <div className={styles.field} style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e0e0e0' }}>
                <Text size={200}>On completion, notify</Text>
                <Dropdown
                  value={step.stepNotify}
                  selectedOptions={[step.stepNotify]}
                  onOptionSelect={(_e, data) => updateStep(index, 'stepNotify', data.optionValue as StepNotify)}
                  size="small"
                >
                  <Option value={StepNotify.None}>No notification</Option>
                  <Option value={StepNotify.Initiator}>Initiator</Option>
                  <Option value={StepNotify.AllStepParticipants}>All step participants</Option>
                  <Option value={StepNotify.AllJourneyParticipants}>All journey participants</Option>
                </Dropdown>
              </div>
            )}
          </div>
        </Card>
      ))}

      <Button appearance="outline" onClick={addStep}>+ Add another step</Button>

      {/* Mandatory Complete step — always shown, not editable */}
      <Card className={styles.stepCard} style={{ opacity: 0.7 }}>
        <div className={styles.stepHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Badge appearance="filled" color="success">
              {steps.length + 1}
            </Badge>
            <Input
              value={completeStepTitle}
              onChange={(_e, data) => setCompleteStepTitle(data.value)}
              size="small"
              style={{ maxWidth: '160px' }}
              placeholder="Complete"
            />
          </div>
          <Badge appearance="tint" color="success" size="small">Complete</Badge>
        </div>
        <Text size={200} style={{ color: '#605e5c', paddingLeft: '8px' }}>
          This step marks the journey as complete. It runs automatically.
        </Text>
      </Card>

      <div className={styles.actions}>
        <Button appearance="primary" onClick={handleSave} disabled={!canSave || saving}>
          {saving ? 'Saving...' : 'Save Journey'}
        </Button>
        <Button appearance="secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
