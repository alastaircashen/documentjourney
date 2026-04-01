import * as React from 'react';
import {
  Tag,
  TagGroup,
  makeStyles,
  tokens,
  Text,
  Subtitle2
} from '@fluentui/react-components';
import { ISelectedDocument } from '../../../services/JourneyService';

export interface IDocumentSelectorProps {
  documents: ISelectedDocument[];
  onRemove: (index: number) => void;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  tagGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
  },
  empty: {
    padding: '16px',
    textAlign: 'center',
    color: tokens.colorNeutralForeground3,
  },
});

export const DocumentSelector: React.FC<IDocumentSelectorProps> = ({ documents, onRemove }) => {
  const styles = useStyles();

  if (documents.length === 0) {
    return (
      <div className={styles.empty}>
        <Text>Select documents from the library</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Subtitle2>Selected Documents</Subtitle2>
      <TagGroup className={styles.tagGroup} onDismiss={(_e, data) => {
        const index = documents.findIndex(d => d.name === data.value);
        if (index >= 0) onRemove(index);
      }}>
        {documents.map((doc, index) => (
          <Tag
            key={index}
            dismissible
            dismissIcon={{ 'aria-label': 'Remove' }}
            value={doc.name}
          >
            {doc.name}
          </Tag>
        ))}
      </TagGroup>
    </div>
  );
};
