import * as React from 'react';
import {
  Tag,
  TagGroup,
  makeStyles,
  tokens,
  Text,
} from '@fluentui/react-components';
import { DocumentRegular } from '@fluentui/react-icons';
import { SelectedDocument } from '../../../services/JourneyService';

export interface IDocumentSelectorProps {
  documents: SelectedDocument[];
  onRemove: (docId: number) => void;
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
  emptyState: {
    color: tokens.colorNeutralForeground3,
    fontStyle: 'italic',
    padding: '12px 0',
  },
});

export const DocumentSelector: React.FC<IDocumentSelectorProps> = ({ documents, onRemove }) => {
  const styles = useStyles();

  if (documents.length === 0) {
    return (
      <div className={styles.container}>
        <Text className={styles.emptyState}>Select documents from the library</Text>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <TagGroup className={styles.tagGroup} onDismiss={(_e, { value }) => onRemove(Number(value))}>
        {documents.map((doc) => (
          <Tag
            key={doc.id}
            value={String(doc.id)}
            dismissible
            icon={<DocumentRegular />}
          >
            {doc.name}
          </Tag>
        ))}
      </TagGroup>
    </div>
  );
};
