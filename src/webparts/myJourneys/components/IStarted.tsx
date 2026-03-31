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
import { JourneyHistoryView } from './JourneyHistoryView';
import { IHistory } from '../../../models/IHistory';
import { JourneyStatus } from '../../../constants';

export interface IIStartedProps {
  journeys: IHistory[];
  sp: SPFI;
}

const STATUS_COLORS: Record<string, 'brand' | 'success' | 'danger' | 'informative'> = {
  [JourneyStatus.Active]: 'brand',
  [JourneyStatus.Completed]: 'success',
  [JourneyStatus.Rejected]: 'danger',
  [JourneyStatus.Cancelled]: 'informative',
};

const useStyles = makeStyles({
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '40px 0',
    color: tokens.colorNeutralForeground3,
  },
  clickableRow: {
    cursor: 'pointer',
  },
  docLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
});

export const IStarted: React.FC<IIStartedProps> = ({ journeys, sp }) => {
  const styles = useStyles();
  const [selectedHistory, setSelectedHistory] = React.useState<IHistory | null>(null);

  if (journeys.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text size={400} weight="semibold">No journeys started yet</Text>
        <Text size={200}>Start a journey from any document library</Text>
      </div>
    );
  }

  const columns: TableColumnDefinition<IHistory>[] = [
    createTableColumn<IHistory>({
      columnId: 'document',
      renderHeaderCell: () => 'Document',
      renderCell: (item) => (
        <div className={styles.docLink}>
          <DocumentRegular />
          <Link href={item.DocumentUrl} target="_blank">{item.DocumentName}</Link>
        </div>
      ),
    }),
    createTableColumn<IHistory>({
      columnId: 'journey',
      renderHeaderCell: () => 'Journey',
      renderCell: (item) => <Text>{item.JourneyTitle}</Text>,
    }),
    createTableColumn<IHistory>({
      columnId: 'status',
      renderHeaderCell: () => 'Status',
      renderCell: (item) => (
        <Badge color={STATUS_COLORS[item.Status] || 'informative'} size="small">
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
      renderHeaderCell: () => 'Started',
      renderCell: (item) => (
        <Text>{new Date(item.InitiatedDate).toLocaleDateString()}</Text>
      ),
    }),
  ];

  return (
    <>
      <DataGrid
        items={journeys}
        columns={columns}
        getRowId={(item) => String(item.Id)}
        onSelectionChange={(_, data) => {
          const selectedId = Array.from(data.selectedItems)[0];
          const journey = journeys.find(j => String(j.Id) === selectedId);
          if (journey) setSelectedHistory(journey);
        }}
      >
        <DataGridHeader>
          <DataGridRow>
            {({ renderHeaderCell }) => <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>}
          </DataGridRow>
        </DataGridHeader>
        <DataGridBody<IHistory>>
          {({ item, rowId }) => (
            <DataGridRow<IHistory>
              key={rowId}
              className={styles.clickableRow}
              onClick={() => setSelectedHistory(item)}
            >
              {({ renderCell }) => <DataGridCell>{renderCell(item)}</DataGridCell>}
            </DataGridRow>
          )}
        </DataGridBody>
      </DataGrid>

      {selectedHistory && (
        <JourneyHistoryView
          history={selectedHistory}
          sp={sp}
          onDismiss={() => setSelectedHistory(null)}
        />
      )}
    </>
  );
};
