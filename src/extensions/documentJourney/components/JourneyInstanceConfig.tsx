import * as React from 'react';
import {
  makeStyles,
  tokens,
  Subtitle1,
  Subtitle2,
  Text,
  Card,
  Badge,
  SpinButton,
  Button,
  Spinner,
  Tag,
  TagGroup,
  Divider,
  Dropdown,
  Option,
  Textarea,
  MessageBar,
  MessageBarBody
} from '@fluentui/react-components';
import { SimplePeoplePicker } from '../../../components/SimplePeoplePicker';
import { IJourney } from '../../../models/IJourney';
import { IStep } from '../../../models/IStep';
import { IStepInstance } from '../../../models/IStepInstance';
import { ISelectedDocument } from '../../../services/JourneyService';
import { STEP_TYPE_COLORS, StepType, NotifyWho, StepNotify } from '../../../constants';

export interface IJourneyInstanceConfigProps {
  journey: IJourney;
  templateSteps: IStep[];
  documents: ISelectedDocument[];
  onConfirm: (stepInstances: IStepInstance[]) => void;
  onBack: () => void;
  submitting: boolean;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  stepCard: {
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: tokens.colorBrandBackground,
    padding: '12px',
  },
  stepHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  stepCircle: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: tokens.colorBrandBackground,
    color: tokens.colorNeutralForegroundOnBrand,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '13px',
    flexShrink: 0,
  },
  stepFields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    paddingLeft: '36px',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fieldRow: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
  },
  meta: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  documents: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '8px',
  },
});

export const JourneyInstanceConfig: React.FC<IJourneyInstanceConfigProps> = ({
  journey,
  templateSteps,
  documents,
  onConfirm,
  onBack,
  submitting
}) => {
  const styles = useStyles();

  const [stepInstances, setStepInstances] = React.useState<IStepInstance[]>(() =>
    templateSteps.map(step => ({
      templateStepId: step.Id,
      stepOrder: step.StepOrder,
      title: step.Title,
      stepType: step.StepType,
      assignedTo: [],
      completionRule: step.CompletionRule,
      requireComments: step.RequireComments,
      dueDays: step.DueDays,
      allowReject: step.AllowReject,
      allowDelegate: step.AllowDelegate,
      message: step.Message || '',
      notifyWho: step.NotifyWho || NotifyWho.Initiator,
      stepNotify: step.StepNotify || StepNotify.None,
    }))
  );

  const updateInstance = (index: number, field: keyof IStepInstance, value: IStepInstance[keyof IStepInstance]): void => {
    setStepInstances(prev =>
      prev.map((s, i) => i === index ? { ...s, [field]: value } : s)
    );
  };

  const renderTypeSpecificFields = (instance: IStepInstance, index: number): React.ReactNode => {
    switch (instance.stepType) {
      case StepType.Notification:
        return (
          <>
            <div className={styles.field}>
              <Text size={200} weight="semibold">Notify Who</Text>
              <Dropdown value={instance.notifyWho} selectedOptions={[instance.notifyWho]} onOptionSelect={(_e, data) => updateInstance(index, 'notifyWho', data.optionValue as NotifyWho)} size="small">
                <Option value={NotifyWho.Initiator}>Initiator</Option>
                <Option value={NotifyWho.AllParticipants}>All Participants</Option>
                <Option value={NotifyWho.SpecificPerson}>Specific Person</Option>
              </Dropdown>
            </div>
            {instance.notifyWho === NotifyWho.SpecificPerson && (
              <SimplePeoplePicker label="Notify" selectedPeople={instance.assignedTo} onChange={(people) => updateInstance(index, 'assignedTo', people)} placeholder="user@company.com" />
            )}
            {instance.message && (
              <div className={styles.field}>
                <Text size={200} weight="semibold">Message</Text>
                <Textarea value={instance.message} onChange={(_e, data) => updateInstance(index, 'message', data.value)} resize="vertical" size="small" />
              </div>
            )}
          </>
        );

      case StepType.Approval:
        return (
          <>
            <SimplePeoplePicker label="Approvers" selectedPeople={instance.assignedTo} onChange={(people) => updateInstance(index, 'assignedTo', people)} placeholder="approver@company.com" />
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <Text size={200} weight="semibold">Due in (days)</Text>
                <SpinButton value={instance.dueDays} onChange={(_e, data) => updateInstance(index, 'dueDays', data.value ?? 0)} min={0} max={365} size="small" />
              </div>
              <div className={styles.meta}>
                <Text size={200}>{instance.completionRule === 'All' ? 'All must approve' : 'First response wins'}</Text>
                {instance.requireComments && <Badge appearance="outline" size="small">Comments required</Badge>}
                {instance.allowReject && <Badge appearance="outline" size="small">Can reject</Badge>}
                {instance.allowDelegate && <Badge appearance="outline" size="small">Can delegate</Badge>}
              </div>
            </div>
          </>
        );

      case StepType.Task:
        return (
          <>
            <SimplePeoplePicker label="Assign to" selectedPeople={instance.assignedTo} onChange={(people) => updateInstance(index, 'assignedTo', people)} placeholder="assignee@company.com" />
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <Text size={200} weight="semibold">Due in (days)</Text>
                <SpinButton value={instance.dueDays} onChange={(_e, data) => updateInstance(index, 'dueDays', data.value ?? 0)} min={0} max={365} size="small" />
              </div>
              <div className={styles.meta}>
                <Text size={200}>{instance.completionRule === 'All' ? 'All must complete' : 'First to complete wins'}</Text>
                {instance.requireComments && <Badge appearance="outline" size="small">Comments required</Badge>}
                {instance.allowDelegate && <Badge appearance="outline" size="small">Can delegate</Badge>}
              </div>
            </div>
          </>
        );

      case StepType.Feedback:
        return (
          <>
            <SimplePeoplePicker label="Reviewers" selectedPeople={instance.assignedTo} onChange={(people) => updateInstance(index, 'assignedTo', people)} placeholder="reviewer@company.com" />
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <Text size={200} weight="semibold">Due in (days)</Text>
                <SpinButton value={instance.dueDays} onChange={(_e, data) => updateInstance(index, 'dueDays', data.value ?? 0)} min={0} max={365} size="small" />
              </div>
              <div className={styles.meta}>
                <Text size={200}>{instance.completionRule === 'All' ? 'All must respond' : 'First response wins'}</Text>
                <Badge appearance="outline" size="small">Comments always required</Badge>
              </div>
            </div>
          </>
        );

      case StepType.Signature:
        return (
          <>
            <SimplePeoplePicker label="Signers" selectedPeople={instance.assignedTo} onChange={(people) => updateInstance(index, 'assignedTo', people)} placeholder="signer@company.com" />
            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <Text size={200} weight="semibold">Due in (days)</Text>
                <SpinButton value={instance.dueDays} onChange={(_e, data) => updateInstance(index, 'dueDays', data.value ?? 0)} min={0} max={365} size="small" />
              </div>
              <div className={styles.meta}>
                <Text size={200}>{instance.completionRule === 'All' ? 'All must sign' : 'First signature wins'}</Text>
              </div>
            </div>
          </>
        );
    }
  };

  return (
    <div className={styles.container}>
      <Subtitle1>{journey.Title}</Subtitle1>
      <Text>{journey.Description}</Text>

      <TagGroup className={styles.documents}>
        {documents.map((doc, i) => (
          <Tag key={i} value={doc.name}>{doc.name}</Tag>
        ))}
      </TagGroup>

      {documents.length > 1 && (
        <MessageBar intent="info">
          <MessageBarBody>
            This journey will be started independently for each of the {documents.length} selected documents. Each document will have its own journey instance.
          </MessageBarBody>
        </MessageBar>
      )}

      <Divider />
      <Subtitle2>Configure Steps</Subtitle2>

      {stepInstances.map((instance, index) => (
        <Card key={index} className={styles.stepCard}>
          <div className={styles.stepHeader}>
            <div className={styles.stepCircle}>{instance.stepOrder}</div>
            <Text weight="semibold" size={400}>{instance.title}</Text>
            <Badge
              appearance="filled"
              color={STEP_TYPE_COLORS[instance.stepType] as 'brand' | 'danger' | 'important' | 'informative' | 'severe' | 'subtle' | 'success' | 'warning'}
            >
              {instance.stepType}
            </Badge>
          </div>

          <div className={styles.stepFields}>
            {renderTypeSpecificFields(instance, index)}
          </div>
        </Card>
      ))}

      <div className={styles.actions}>
        <Button
          appearance="primary"
          onClick={() => onConfirm(stepInstances)}
          disabled={submitting}
        >
          {submitting ? <Spinner size="tiny" label="Starting..." /> : 'Start Journey'}
        </Button>
        <Button
          appearance="secondary"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </Button>
      </div>
    </div>
  );
};
