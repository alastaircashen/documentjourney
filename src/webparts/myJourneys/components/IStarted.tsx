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
import { IHistory } from '../../../models/IHistory';
import { JourneyStatus } from '../../../constants';
import { JourneyHistoryView } from './JourneyHistoryView';
import { useDocumentJourney } from '../../../common/DocumentJourneyContext';

export interface IIStartedProps {
  userId: number;
  searchQuery: string;
  statusFilter: string;
  refreshKey: number;
}

const STATUS_COLORS: Record<string, any> = {
  [JourneyStatus.Active]: 'brand',
  [JourneyStatus.Completed]: 'success',
  [JourneyStatus.Rejected]: 'danger',
  [JourneyStatus.Cancelled]: 'informative',
  [JourneyStatus.Stalled]: 'warning',
};

const useStyles = makeStyles({
  empty: {
    padding: '32px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
  clickable: {
    cursor: 'pointer',
  },
});

export const IStarted: React.FC<IIStartedProps> = ({ userId, searchQuery, statusFilter, refreshKey }) => {
  const styles = useStyles();
  const { journeyService } = useDocumentJourney();
  const [items, setItems] = React.useState<IHistory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedHistory, setSelectedHistory] = React.useState<IHistory | undefined>();
  const [cancelDialogOpen, setCancelDialogOpen] = React.useState(false);
  const [cancelTarget, setCancelTarget] = React.useState<IHistory | undefined>();
  const [cancelReason, setCancelReason] = React.useState('');
  const [cancelling, setCancelling] = React.useState(false);

  const loadData = async (): Promise<void> => {
    setLoading(true);
    try {
      const journeys = await journeyService.getJourneysIStarted(userId);
      setItems(journeys);
    } catch {
      // Handle silently
    }
    setLoading(false);
  };

  React.useEffect(() => { loadData().catch(() => {}); }, [userId, refreshKey]);

  const filteredItems = React.useMemo(() => {
    let result = items;
    if (statusFilter) {
      result = result.filter(i => i.Status === statusFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(i =>
        i.DocumentName.toLowerCase().includes(q) ||
        i.JourneyName.toLowerCase().includes(q)
      );
    }
    return result;
  }, [items, statusFilter, searchQuery]);

  const handleCancel = async (): Promise<void> => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await journeyService.cancelJourney(cancelTarget.Id, cancelReason);
      await loadData();
    } catch {
      // Handle error
    }
    setCancelling(false);
    setCancelDialogOpen(false);
    setCancelTarget(undefined);
    setCancelReason('');
  };

  const columns: TableColumnDefinition<IHistory>[] = [
    createTableColumn<IHistory>({
      columnId: 'document',
      compare: (a, b) => a.DocumentName.localeCompare(b.DocumentName),
      renderHeaderCell: () => 'Document',
      renderCell: (item) => (
        <Link href={item.DocumentUrl} target="_blank">
          {item.DocumentName}
        </Link>
      ),
    }),
    createTableColumn<IHistory>({
      columnId: 'journey',
      compare: (a, b) => a.JourneyName.localeCompare(b.JourneyName),
      renderHeaderCell: () => 'Journey',
      renderCell: (item) => <Text>{item.JourneyName}</Text>,
    }),
    createTableColumn<IHistory>({
      columnId: 'status',
      renderHeaderCell: () => 'Status',
      renderCell: (item) => (
        <Badge appearance="filled" color={STATUS_COLORS[item.Status] || 'informative'}>
          {item.Status}
        </Badge>
      ),
    }),
    createTableColumn<IHistory>({
      columnId: 'progress',
      renderHeaderCell: () => 'Progress',
      renderCell: (item) => (
        <Text>Step {item.CurrentStepOrder} of {item.TotalSteps}</Text>
      ),
    }),
    createTableColumn<IHistory>({
      columnId: 'started',
      compare: (a, b) => a.InitiatedDate.localeCompare(b.InitiatedDate),
      renderHeaderCell: () => 'Started',
      renderCell: (item) => (
        <Text>{new Date(item.InitiatedDate).toLocaleDateString()}</Text>
      ),
    }),
    createTableColumn<IHistory>({
      columnId: 'actions',
      renderHeaderCell: () => '',
      renderCell: (item) => (
        item.Status === JourneyStatus.Active ? (
          <Button
            appearance="subtle"
            size="small"
            style={{ color: tokens.colorPaletteRedForeground1 }}
            onClick={(e) => {
              e.stopPropagation();
              setCancelTarget(item);
              setCancelDialogOpen(true);
            }}
          >
            Cancel
          </Button>
        ) : null
      ),
    }),
  ];

  if (loading) {
    return <Spinner label="Loading..." />;
  }

  if (items.length === 0) {
    return (
      <div className={styles.empty}>
        <Text size={400}>You haven't started any journeys yet</Text>
      </div>
    );
  }

  return (
    <>
      <DataGrid
        items={filteredItems}
        columns={columns}
        sortable
        getRowId={(item) => item.Id.toString()}
        className={styles.clickable}
      >
        <DataGridHeader>
          <DataGridRow>
            {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<IHistory>>
          {({ item, rowId }) => (
            <DataGridRow<IHistory> key={rowId} onClick={() => setSelectedHistory(item)}>
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>

      {selectedHistory && (
        <JourneyHistoryView
          history={selectedHistory}
          onDismiss={() => setSelectedHistory(undefined)}
        />
      )}

      <Dialog open={cancelDialogOpen} onOpenChange={(_e, data) => setCancelDialogOpen(data.open)}>
        <DialogSurface>
          <DialogBody>
            <DialogTitle>Cancel Journey</DialogTitle>
            <DialogContent>
              <Text>Cancel this journey? This cannot be undone.</Text>
              <Textarea
                value={cancelReason}
                onChange={(_e, data) => setCancelReason(data.value)}
                placeholder="Reason for cancellation (optional)..."
                resize="vertical"
                style={{ width: '100%', minHeight: '60px', marginTop: '12px' }}
              />
            </DialogContent>
            <DialogActions>
              <Button appearance="secondary" onClick={() => setCancelDialogOpen(false)} disabled={cancelling}>
                Keep Active
              </Button>
              <Button
                appearance="primary"
                style={{ backgroundColor: tokens.colorPaletteRedBackground3 }}
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? <Spinner size="tiny" /> : 'Cancel Journey'}
              </Button>
            </DialogActions>
          </DialogBody>
        </DialogSurface>
      </Dialog>
    </>
  );
};
