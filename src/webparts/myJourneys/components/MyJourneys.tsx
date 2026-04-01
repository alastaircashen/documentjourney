import * as React from 'react';
import {
  TabList,
  Tab,
  SelectTabData,
  SelectTabEvent,
  makeStyles,
  Spinner,
  Title3,
  SearchBox,
  Dropdown,
  Option,
  Button,
  Text,
  tokens
} from '@fluentui/react-components';
import { ArrowClockwiseRegular } from '@fluentui/react-icons';
import { WaitingOnMe } from './WaitingOnMe';
import { IStarted } from './IStarted';
import { AllActive } from './AllActive';
import { JourneyStatus } from '../../../constants';
import { useDocumentJourney } from '../../../common/DocumentJourneyContext';

export interface IMyJourneysProps {
  // Props now come from context
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  search: {
    minWidth: '200px',
    maxWidth: '300px',
  },
  refreshGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: 'auto',
  },
  lastUpdated: {
    color: tokens.colorNeutralForeground3,
    fontSize: '12px',
  },
  tabContent: {
    paddingTop: '8px',
  },
});

export const MyJourneys: React.FC<IMyJourneysProps> = () => {
  const styles = useStyles();
  const { sp } = useDocumentJourney();
  const [selectedTab, setSelectedTab] = React.useState<string>('waiting');
  const [userId, setUserId] = React.useState<number>(0);
  const [loading, setLoading] = React.useState(true);
  const [isSiteAdmin, setIsSiteAdmin] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>(JourneyStatus.Active);
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [lastUpdated, setLastUpdated] = React.useState<Date>(new Date());

  React.useEffect(() => {
    const init = async (): Promise<void> => {
      try {
        const user = await sp.web.currentUser();
        setUserId(user.Id);
        setIsSiteAdmin(user.IsSiteAdmin);
      } catch {
        // Fallback
      }
      setLoading(false);
    };
    init().catch(() => {});
  }, []);

  const handleTabSelect = (_event: SelectTabEvent, data: SelectTabData): void => {
    setSelectedTab(data.value as string);
  };

  const handleRefresh = (): void => {
    setRefreshKey(prev => prev + 1);
    setLastUpdated(new Date());
  };

  const getTimeSince = (): string => {
    const seconds = Math.floor((Date.now() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    return `${minutes} min ago`;
  };

  const showStatusFilter = selectedTab === 'started' || selectedTab === 'all';

  if (loading) {
    return <Spinner label="Loading..." />;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Title3>My Journeys</Title3>
      </div>

      <div className={styles.toolbar}>
        <SearchBox
          className={styles.search}
          placeholder="Search by document or journey name..."
          value={searchQuery}
          onChange={(_e, data) => setSearchQuery(data.value)}
        />
        {showStatusFilter && (
          <Dropdown
            placeholder="Status"
            value={statusFilter}
            selectedOptions={[statusFilter]}
            onOptionSelect={(_e, data) => setStatusFilter(data.optionValue || JourneyStatus.Active)}
            style={{ minWidth: '140px' }}
          >
            <Option value={JourneyStatus.Active}>Active</Option>
            <Option value={JourneyStatus.Completed}>Completed</Option>
            <Option value={JourneyStatus.Rejected}>Rejected</Option>
            <Option value={JourneyStatus.Cancelled}>Cancelled</Option>
            <Option value="">All statuses</Option>
          </Dropdown>
        )}
        <div className={styles.refreshGroup}>
          <Text className={styles.lastUpdated}>Last updated: {getTimeSince()}</Text>
          <Button
            appearance="subtle"
            icon={<ArrowClockwiseRegular />}
            onClick={handleRefresh}
          />
        </div>
      </div>

      <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect}>
        <Tab value="waiting">Waiting on me</Tab>
        <Tab value="started">Started by me</Tab>
        {isSiteAdmin && <Tab value="all">All active</Tab>}
      </TabList>

      <div className={styles.tabContent}>
        {selectedTab === 'waiting' && (
          <WaitingOnMe
            userId={userId}
            searchQuery={searchQuery}
            refreshKey={refreshKey}
          />
        )}
        {selectedTab === 'started' && (
          <IStarted
            userId={userId}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            refreshKey={refreshKey}
          />
        )}
        {selectedTab === 'all' && isSiteAdmin && (
          <AllActive
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            refreshKey={refreshKey}
          />
        )}
      </div>
    </div>
  );
};
