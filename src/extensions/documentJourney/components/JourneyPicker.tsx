import * as React from 'react';
import {
  Card,
  CardHeader,
  Text,
  makeStyles,
  tokens,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Button,
  Divider,
  Spinner,
} from '@fluentui/react-components';
import { ChevronRightRegular, ArrowDownloadRegular } from '@fluentui/react-icons';
import { IJourney } from '../../../models/IJourney';

export interface IJourneyPickerProps {
  journeys: IJourney[];
  galleryJourneys: IJourney[];
  isGalleryConfigured: boolean;
  loadingGallery: boolean;
  onSelect: (journey: IJourney) => void;
  onImport: (journeyId: number) => void;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionTitle: {
    fontWeight: '600',
    color: tokens.colorNeutralForeground1,
    marginBottom: '4px',
  },
  card: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  defaultCard: {
    cursor: 'pointer',
    borderLeft: `3px solid ${tokens.colorBrandBackground}`,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  cardContent: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  cardText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  description: {
    color: tokens.colorNeutralForeground2,
    fontSize: '12px',
  },
  galleryItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
  },
  divider: {
    margin: '8px 0',
  },
});

export const JourneyPicker: React.FC<IJourneyPickerProps> = ({
  journeys,
  galleryJourneys,
  isGalleryConfigured,
  loadingGallery,
  onSelect,
  onImport,
}) => {
  const styles = useStyles();

  const defaultJourneys = journeys.filter((j) => j.IsDefault);
  const customJourneys = journeys.filter((j) => !j.IsDefault);

  return (
    <div className={styles.container}>
      <Text className={styles.sectionTitle}>Choose a journey</Text>

      {defaultJourneys.map((journey) => (
        <Card
          key={journey.Id}
          className={styles.defaultCard}
          onClick={() => onSelect(journey)}
          size="small"
        >
          <CardHeader
            header={
              <div className={styles.cardContent}>
                <div className={styles.cardText}>
                  <Text weight="semibold">{journey.Title}</Text>
                  <Text className={styles.description}>{journey.Description}</Text>
                </div>
                <ChevronRightRegular />
              </div>
            }
          />
        </Card>
      ))}

      {customJourneys.length > 0 && (
        <>
          <Divider className={styles.divider} />
          <Text className={styles.sectionTitle}>Custom journeys</Text>
          {customJourneys.map((journey) => (
            <Card
              key={journey.Id}
              className={styles.card}
              onClick={() => onSelect(journey)}
              size="small"
            >
              <CardHeader
                header={
                  <div className={styles.cardContent}>
                    <div className={styles.cardText}>
                      <Text weight="semibold">{journey.Title}</Text>
                      <Text className={styles.description}>{journey.Description}</Text>
                    </div>
                    <ChevronRightRegular />
                  </div>
                }
              />
            </Card>
          ))}
        </>
      )}

      {isGalleryConfigured && (
        <>
          <Divider className={styles.divider} />
          <Accordion collapsible>
            <AccordionItem value="gallery">
              <AccordionHeader>Browse gallery</AccordionHeader>
              <AccordionPanel>
                {loadingGallery ? (
                  <Spinner size="small" label="Loading gallery..." />
                ) : galleryJourneys.length === 0 ? (
                  <Text className={styles.description}>No journeys available in gallery</Text>
                ) : (
                  galleryJourneys.map((gj) => (
                    <div key={gj.Id} className={styles.galleryItem}>
                      <div className={styles.cardText}>
                        <Text weight="semibold">{gj.Title}</Text>
                        <Text className={styles.description}>{gj.Description}</Text>
                      </div>
                      <Button
                        icon={<ArrowDownloadRegular />}
                        size="small"
                        onClick={() => onImport(gj.Id)}
                      >
                        Import
                      </Button>
                    </div>
                  ))
                )}
              </AccordionPanel>
            </AccordionItem>
          </Accordion>
        </>
      )}
    </div>
  );
};
