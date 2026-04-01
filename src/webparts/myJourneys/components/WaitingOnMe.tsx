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
  Text,
  Spinner,
  Link,
  Button,
  Checkbox,
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Textarea,
  makeStyles,
  tokens
} from '@fluentui/react-components';
import { IStepHistory } from '../../../models/IStepHistory';
import { IHistory } from '../../../models/IHistory';
import { StepType, STEP_TYPE_COLORS, ActionType } from '../../../constants';
import { ActionButtons } from './ActionButtons';
import { useDocumentJourney } from '../../../common/DocumentJourneyContext';

export interface IWaitingOnMeProps {
  userId: number;
  searchQuery: string;
  refreshKey: number;
}

type PendingItem = IStepHistory & { history?: IHistory };

const useStyles = makeStyles({
  empty: {
    padding: '32px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  bulkBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: '4px',
    marginBottom: '8px',
  },
});

export const WaitingOnMe: React.FC<IWaitingOnMeProps> = ({ userId, searchQuery, refreshKey }) => {
  const styles = useStyles();
  const { journeyService } = useDocumentJourney();
  const [items, setItems] = React.useState<PendingItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedIds, setSelectedIds] = React.useState<Set<number>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = React.useState(false);
  const [bulkAction, setBulkAction] = React.useState<string>('');
  const [bulkComments, setBulkComments] = React.useState('');
  const [processing, setProcessing] = React.useState(false);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    try {
      const pending = await journeyService.getMyPendingSteps(userId);
      setItems(pending);
    } catch {
      // Handle silently
    }
    setLoading(false);
  };

  React.useEffect(() => { loadData().catch(() => {}); }, [userId, refreshKey]);

  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item =>
      (item.history?.DocumentName || '').toLowerCase().includes(q) ||
      (item.history?.JourneyName || '').toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const handleAction = async (item: PendingItem, action: string, comments?: string): Promise<void> => {
    try {
      if (action === ActionType.Rejected) {
        await journeyService.rejectStep(item.Id, userId, comments);
      } else if (action === ActionType.Delegated) {
        // Delegation handled by ActionButtons dialog
      } else {
        await journeyService.completeStep(item.Id, userId, comments);
      }
      await loadData();
    } catch {
      // Handle error
    }
  };

  const handleDelegate = async (item: PendingItem, newAssigneeId: number): Promise<void> => {
    try {
      await journeyService.delegateStep(item.Id, newAssigneeId, userId);
      await loadData();
    } catch {
      // Handle error
    }
  };

  const toggleSelect = (id: number): void => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (): void => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.Id)));
    }
  };

  const selectedItems = filteredItems.filter(i => selectedIds.has(i.Id));
  const allSelectedAreApproval = selectedItems.length > 0 && selectedItems.every(i => i.StepType === StepType.Approval);
  const allSelectedAreTask = selectedItems.length > 0 && selectedItems.every(i => i.StepType === StepType.Task);

  const handleBulkAction = async (): Promise<void> => {
    setProcessing(true);
    for (const item of selectedItems) {
      try {
        if (bulkAction === ActionType.Rejected) {
          await journeyService.rejectStep(item.Id, userId, bulkComments);
        } else {
          await journeyService.completeStep(item.Id, userId, bulkComments);
        }
      } catch {
        // Continue processing remaining items
      }
    }
    setBulkDialogOpen(false);
    setBulkComments('');
    setSelectedIds(new Set());
    setProcessing(false);
    await loadData();
  };

  const columns: TableColumnDefinition<PendingItem>[] = [
    createTableColumn<PendingItem>({
      columnId: 'select',
      renderHeaderCell: () => (
        <Checkbox
          checked={filteredItems.length > 0 && selectedIds.size === filteredItems.length}
          onChange={toggleSelectAll}
        />
      ),
      renderCell: (item) => (
        <Checkbox
          checked={selectedIds.has(item.Id)}
          onChange={() => toggleSelect(item.Id)}
        />
      ),
    }),
    createTableColumn<PendingItem>({
      columnId: 'document',
      compare: (a, b) => (a.history?.DocumentName || '').localeCompare(b.history?.DocumentName || ''),
      renderHeaderCell: () => 'Document',
      renderCell: (item) => (
        <Link href={item.history?.DocumentUrl} target="_blank">
          {item.history?.DocumentName}
        </Link>
      ),
    }),
    createTableColumn<PendingItem>({
      columnId: 'journey',
      compare: (a, b) => (a.history?.JourneyName || '').localeCompare(b.history?.JourneyName || ''),
      renderHeaderCell: () => 'Journey',
      renderCell: (item) => <Text>{item.history?.JourneyName}</Text>,
    }),
    createTableColumn<PendingItem>({
      columnId: 'step',
      renderHeaderCell: () => 'Current Step',
      renderCell: (item) => <Text>{item.StepName}</Text>,
    }),
    createTableColumn<PendingItem>({
      columnId: 'type',
      renderHeaderCell: () => 'Step Type',
      renderCell: (item) => (
        <Badge
          appearance="filled"
          color={STEP_TYPE_COLORS[item.StepType as StepType] as any}
        >
          {item.StepType}
        </Badge>
      ),
    }),
    createTableColumn<PendingItem>({
      columnId: 'due',
      compare: (a, b) => (a.DueDate || '').localeCompare(b.DueDate || ''),
      renderHeaderCell: () => 'Due Date',
      renderCell: (item) => (
        <Text>{item.DueDate ? new Date(item.DueDate).toLocaleDateString() : '-'}</Text>
      ),
    }),
    createTableColumn<PendingItem>({
      columnId: 'actions',
      renderHeaderCell: () => 'Actions',
      renderCell: (item) => (
        <ActionButtons
          stepType={item.StepType as StepType}
          requireComments={item.RequireComments || false}
          allowDelegate={item.AllowDelegate || false}
          onAction={(action, comments) => handleAction(item, action, comments)}
          onDelegate={(newAssigneeId) => handleDelegate(item, newAssigneeId)}
        />
      ),
    }),
  ];

  if (loading) {
    return <Spinner label="Loading..." />;
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <Text size={400}>No items waiting for your action</Text>
      </div>
    );
  }

  return (
    <>
      {selectedIds.size > 0 && (
        <div className={styles.bulkBar}>
          <Text weight="semibold">{selectedIds.size} selected</Text>
          {allSelectedAreApproval && (
            <>
              <Button
                appearance="primary"
                size="small"
                onClick={() => { setBulkAction(ActionType.Approved); setBulkDialogOpen(true); }}
              >
                Approve selected ({selectedIds.size})
              </Button>
              <Button
                appearance="subtle"
                size="small"
                onClick={() => { setBulkAction(ActionType.Rejected); setBulkDialogOpen(true); }}
              >
                Reject selected ({selectedIds.size})
              </Button>
            </>
          )}
          {allSelectedAreTask && (
            <Button
              appearance="primary"
              size="small"
              onClick={() => { setBulkAction(ActionType.Completed); setBulkDialogOpen(true); }}
            >
              Complete selected ({selectedIds.size})
            </Button>
          )}
          <Button
            appearance="subtle"
            size="small"
            onClick={() => setSelectedIds(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      <DataGrid
        items={filteredItems}
        columns={columns}
        sortable
        getRowId={(item) => item.Id.toString()}
      >
        <DataGridHeader>
          <DataGridRow>
            {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<PendingItem>>
          {({ item, rowId }) => (
            <DataGridRow<PendingItem> key={rowId}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>

      <Dialog open={bulkDialogOpen} onOpenChange={(_e, data) => setBulkDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>
              {bulkAction === ActionType.Rejected ? 'Reject' : bulkAction === ActionType.Approved ? 'Approve' : 'Complete'} {selectedIds.size} items
            </DialogTitle>
            <DialogContent>
              <Textarea
                value={bulkComments}
                onChange={(_e, data) => setBulkComments(data.value)}
                placeholder="Add a comment (optional)..."
                resize="vertical"
                style={{ width: '100%', minHeight: '80px' }}
              />
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setBulkDialogOpen(false)} disabled={processing}>
                Cancel
              </Button>
              <Button appearance="primary" onClick={handleBulkAction} disabled={processing}>
                {processing ? <Spinner size="tiny" /> : 'Confirm'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};
