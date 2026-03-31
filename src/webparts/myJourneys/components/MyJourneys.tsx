import * as React from 'react';
import {
  TabList,
  Tab,
  SelectTabEvent,
  SelectTabData,
  Badge,
  makeStyles,
  Spinner,
} from '@fluentui/react-components';
import { SPFI } from '@pnp/sp';
import { FluentThemeProvider } from '../../../extensions/documentJourney/components/FluentThemeProvider';
import { WaitingOnMe } from './WaitingOnMe';
import { IStarted } from './IStarted';
import { AllActive } from './AllActive';
import { JourneyService } from '../../../services/JourneyService';
import { TenantPropertyService } from '../../../services/TenantPropertyService';
import { SchemaService } from '../../../services/SchemaService';
import { IStepHistory } from '../../../models/IStepHistory';
import { IHistory } from '../../../models/IHistory';

export interface IMyJourneysProps {
  sp: SPFI;
  spfxContext: any;
  currentUserEmail: string;
}

type TabValue = 'waiting' | 'started' | 'active';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    padding: '16px',
  },
  tabBadge: {
    marginLeft: '6px',
  },
});

export const MyJourneys: React.FC<IMyJourneysProps> = ({ sp, spfxContext, currentUserEmail }) => {
  const styles = useStyles();
  const [selectedTab, setSelectedTab] = React.useState<TabValue>('waiting');
  const [loading, setLoading] = React.useState(true);
  const [pendingSteps, setPendingSteps] = React.useState<(IStepHistory & { DocumentName: string; DocumentUrl: string; JourneyTitle: string })[]>([]);
  const [myJourneys, setMyJourneys] = React.useState<IHistory[]>([]);
  const [allActive, setAllActive] = React.useState<IHistory[]>([]);
  const [isAdmin] = React.useState(false); // TODO: check site admin permissions

  const tenantPropertyService = React.useMemo(() => new TenantPropertyService(sp), [sp]);
  const journeyService = React.useMemo(() => new JourneyService(sp, tenantPropertyService), [sp, tenantPropertyService]);
  const schemaService = React.useMemo(() => new SchemaService(sp), [sp]);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      await schemaService.ensureSchema();
      const [pending, started, active] = await Promise.all([
        journeyService.getMyPendingSteps(currentUserEmail),
        journeyService.getJourneysIStarted(currentUserEmail),
        journeyService.getAllActiveJourneys(),
      ]);
      setPendingSteps(pending);
      setMyJourneys(started);
      setAllActive(active);
    } finally {
      setLoading(false);
    }
  }, [journeyService, schemaService, currentUserEmail]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handleTabSelect = (_: SelectTabEvent, data: SelectTabData): void => {
    setSelectedTab(data.value as TabValue);
  };

  return (
    <FluentThemeProvider>
      <div className={styles.container}>
        <TabList selectedValue={selectedTab} onTabSelect={handleTabSelect}>
          <Tab value="waiting">
            Waiting on me
            {pendingSteps.length > 0 && (
              <Badge className={styles.tabBadge} size="small" color="danger">
                {pendingSteps.length}
              </Badge>
            )}
          </Tab>
          <Tab value="started">I started</Tab>
          {isAdmin && <Tab value="active">All active</Tab>}
        </TabList>

        {loading ? (
          <Spinner label="Loading journeys..." />
        ) : (
          <>
            {selectedTab === 'waiting' && (
              <WaitingOnMe
                steps={pendingSteps}
                sp={sp}
                currentUserEmail={currentUserEmail}
                onRefresh={loadData}
              />
            )}
            {selectedTab === 'started' && (
              <IStarted
                journeys={myJourneys}
                sp={sp}
              />
            )}
            {selectedTab === 'active' && (
              <AllActive
                journeys={allActive}
                sp={sp}
              />
            )}
          </>
        )}
      </div>
    </FluentThemeProvider>
  );
};
