import React from 'react';
import {
  FluentProvider,
  webLightTheme,
  Spinner,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { OfficeDocumentProvider, useOfficeDocument } from '../context/OfficeDocumentContext';
import { DocumentJourneyProvider } from '../context/DocumentJourneyContext';
import { SignIn } from './SignIn';
import { NotOnSharePoint } from './NotOnSharePoint';
import { JourneyDashboard } from './JourneyDashboard';

const useStyles = makeStyles({
  root: {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
});

const AppContent: React.FC = () => {
  const styles = useStyles();
  const { isAuthenticated, isLoading: authLoading, msalInstance } = useAuth();
  const { documentInfo, isOnSharePoint, isLoading: docLoading } = useOfficeDocument();

  if (authLoading || docLoading) {
    return (
      <div className={styles.loading}>
        <Spinner label="Loading..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  if (!isOnSharePoint || !documentInfo) {
    return <NotOnSharePoint />;
  }

  return (
    <DocumentJourneyProvider siteUrl={documentInfo.siteUrl} msalInstance={msalInstance!}>
      <JourneyDashboard documentInfo={documentInfo} />
    </DocumentJourneyProvider>
  );
};

export const TaskpaneApp: React.FC = () => {
  const styles = useStyles();

  return (
    <FluentProvider theme={webLightTheme}>
      <div className={styles.root}>
        <AuthProvider>
          <OfficeDocumentProvider>
            <AppContent />
          </OfficeDocumentProvider>
        </AuthProvider>
      </div>
    </FluentProvider>
  );
};
