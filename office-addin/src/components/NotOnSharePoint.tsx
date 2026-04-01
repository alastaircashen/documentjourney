import React from 'react';
import {
  makeStyles,
  Title3,
  Text,
  tokens,
} from '@fluentui/react-components';
import { CloudArrowUpRegular } from '@fluentui/react-icons';

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
    color: tokens.colorNeutralForeground3,
  },
});

export const NotOnSharePoint: React.FC = () => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <CloudArrowUpRegular className={styles.icon} />
      <Title3>Save to SharePoint</Title3>
      <Text>
        Document Journey works with documents stored on SharePoint. Save this document to a SharePoint library to start or manage a journey.
      </Text>
      <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
        File &gt; Save As &gt; SharePoint
      </Text>
    </div>
  );
};
