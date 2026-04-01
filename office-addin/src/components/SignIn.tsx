import React from 'react';
import {
  makeStyles,
  Title3,
  Text,
  Button,
  MessageBar,
  MessageBarBody,
  tokens,
} from '@fluentui/react-components';
import { DocumentArrowRightRegular } from '@fluentui/react-icons';
import { useAuth } from '../auth/AuthProvider';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
    padding: '24px',
    height: '100%',
    textAlign: 'center',
  },
  icon: {
    fontSize: '48px',
    color: tokens.colorBrandForeground1,
  },
});

export const SignIn: React.FC = () => {
  const styles = useStyles();
  const { signIn, error } = useAuth();

  return (
    <div className={styles.container}>
      <DocumentArrowRightRegular className={styles.icon} />
      <Title3>Document Journey</Title3>
      <Text>Sign in to manage document workflows directly from your Office app.</Text>
      {error && (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      )}
      <Button appearance="primary" onClick={signIn}>
        Sign in with Microsoft
      </Button>
    </div>
  );
};
