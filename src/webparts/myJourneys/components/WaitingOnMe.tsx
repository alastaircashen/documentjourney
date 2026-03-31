import * as React from 'react';
import {
  DataGrid,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridBody,
  DataGridRow,
  DataGridCell,
  TableColumnDefinition,
  createTableColumn,
  Badge,
  Link,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { DocumentRegular } from '@fluentui/react-icons';
import { SPFI } from '@pnp/sp';
import { ActionButtons } from './ActionButtons';
import { JourneyService } from '../../../services/JourneyService';
import { TenantPropertyService } from '../../../services/TenantPropertyService';
import { IStepHistory } from '../../../models/IStepHistory';
import { StepType, ActionType, STEP_TYPE_COLORS } from '../../../constants';

type EnrichedStep = IStepHistory & { DocumentName: string; DocumentUrl: string; JourneyTitle: string };

export interface IWaitingOnMeProps {
  steps: EnrichedStep[];
  sp: SPFI;
  currentUserEmail: string;
  onRefresh: () => void;
}

const useStyles = makeStyles({
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '40px 0',
    color: tokens.colorNeutralForeground3,
  },
  docLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
});

export const WaitingOnMe: React.FC<IWaitingOnMeProps> = ({ steps, sp, currentUserEmail, onRefresh }) => {
  const styles = useStyles();

  const tenantPropertyService = React.useMemo(() => new TenantPropertyService(sp), [sp]);
  const journeyService = React.useMemo(() => new JourneyService(sp, tenantPropertyService), [sp, tenantPropertyService]);

  const handleAction = async (stepId: number, actionType: ActionType, comments?: string): Promise<void> => {
    if (actionType === ActionType.Rejected) {
      await journeyService.rejectStep(stepId, currentUserEmail, comments);
    } else {
      await journeyService.completeStep(stepId, currentUserEmail, actionType, comments);
    }
    onRefresh();
  };

  if (steps.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text size={400} weight="semibold">No items waiting for your action</Text>
        <Text size={200}>When someone assigns you a step, it will appear here</Text>
      </div>
    );
  }

  const columns: TableColumnDefinition<EnrichedStep>[] = [
    createTableColumn<EnrichedStep>({
      columnId: 'document',
      renderHeaderCell: () => 'Document',
      renderCell: (item) => (
        <div className={styles.docLink}>
          <DocumentRegular />
          <Link href={item.DocumentUrl} target="_blank">{item.DocumentName}</Link>
        </div>
      ),
    }),
    createTableColumn<EnrichedStep>({
      columnId: 'journey',
      renderHeaderCell: () => 'Journey',
      renderCell: (item) => <Text>{item.JourneyTitle}</Text>,
    }),
    createTableColumn<EnrichedStep>({
      columnId: 'step',
      renderHeaderCell: () => 'Current Step',
      renderCell: (item) => <Text>{item.StepTitle}</Text>,
    }),
    createTableColumn<EnrichedStep>({
      columnId: 'type',
      renderHeaderCell: () => 'Step Type',
      renderCell: (item) => (
        <Badge color={STEP_TYPE_COLORS[item.StepType as StepType] as any} size="small">
          {item.StepType}
        </Badge>
      ),
    }),
    createTableColumn<EnrichedStep>({
      columnId: 'due',
      renderHeaderCell: () => 'Due Date',
      renderCell: (item) => (
        <Text>{item.DueDate ? new Date(item.DueDate).toLocaleDateString() : '—'}</Text>
      ),
    }),
    createTableColumn<EnrichedStep>({
      columnId: 'actions',
      renderHeaderCell: () => 'Actions',
      renderCell: (item) => {
        const requireComments = false; // Would come from step config
        return (
          <ActionButtons
            stepType={item.StepType as StepType}
            requireComments={requireComments}
            onApprove={(c) => handleAction(item.Id, ActionType.Approved, c)}
            onReject={(c) => handleAction(item.Id, ActionType.Rejected, c)}
            onComplete={(c) => handleAction(item.Id, ActionType.Completed, c)}
            onFeedback={(c) => handleAction(item.Id, ActionType.FeedbackProvided, c)}
          />
        );
      },
    }),
  ];

  return (
    <DataGrid items={steps} columns={columns} getRowId={(item) => String(item.Id)}>
      <DataGridHeader>
        <DataGridRow>
          {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
        </DataGridRow>
      </DataGridHeader>
      <DataGridBody<EnrichedStep>>
        {({ item, rowId }) => (
          <DataGridRow<EnrichedStep> key={rowId}>
            {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
          </DataGridRow>
        )}
      </DataGridBody>
    </DataGrid>
  );
};
