import * as React from 'react';
import {
  Card,
  CardHeader,
  Text,
  Body1,
  Subtitle1,
  Subtitle2,
  makeStyles,
  tokens,
  Spinner,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Button,
  Divider
} from '@fluentui/react-components';
import { IJourney } from '../../../models/IJourney';

export interface IJourneyPickerProps {
  journeys: IJourney[];
  galleryJourneys: IJourney[];
  loading: boolean;
  onSelect: (journey: IJourney) => void;
  onImport: (journeyId: number) => void;
  onCreate: () => void;
  hasGallery: boolean;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    cursor: 'pointer',
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  defaultCard: {
    cursor: 'pointer',
    borderLeftWidth: '3px',
    borderLeftStyle: 'solid',
    borderLeftColor: tokens.colorBrandBackground,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  createCard: {
    cursor: 'pointer',
    outlineWidth: '2px',
    outlineStyle: 'dashed',
    outlineColor: tokens.colorBrandBackground,
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  galleryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: tokens.colorNeutralStroke1,
  },
});

export const JourneyPicker: React.FC<IJourneyPickerProps> = ({
  journeys,
  galleryJourneys,
  loading,
  onSelect,
  onImport,
  onCreate,
  hasGallery
}) => {
  const styles = useStyles();

  if (loading) {
    return <Spinner label="Loading journeys..." />;
  }

  const defaultJourneys = journeys.filter(j => j.IsDefault);
  const customJourneys = journeys.filter(j => !j.IsDefault);

  return (
    <div className={styles.container}>
      <Subtitle1>Choose a journey</Subtitle1>

      {defaultJourneys.length > 0 && (
        <div className={styles.section}>
          {defaultJourneys.map(journey => (
            <Card
              key={journey.Id}
              className={styles.defaultCard}
              onClick={() => onSelect(journey)}
            >
              <CardHeader
                header={<Subtitle2>{journey.Title}</Subtitle2>}
                description={<Body1>{journey.Description}</Body1>}
              />
            </Card>
          ))}
        </div>
      )}

      {customJourneys.length > 0 && (
        <div className={styles.section}>
          <Text weight="semibold">Custom Journeys</Text>
          {customJourneys.map(journey => (
            <Card
              key={journey.Id}
              className={styles.card}
              onClick={() => onSelect(journey)}
            >
              <CardHeader
                header={<Subtitle2>{journey.Title}</Subtitle2>}
                description={<Body1>{journey.Description}</Body1>}
              />
            </Card>
          ))}
        </div>
      )}

      <Divider />

      <Card className={styles.createCard} onClick={onCreate}>
        <CardHeader
          header={<Subtitle2>+ Create a new journey</Subtitle2>}
          description={<Body1>Build a custom journey with your own steps</Body1>}
        />
      </Card>

      {hasGallery && galleryJourneys.length > 0 && (
        <Accordion collapsible>
          <AccordionItem value="gallery">
            <AccordionHeader>Browse gallery ({galleryJourneys.length})</AccordionHeader>
            <AccordionPanel>
              {galleryJourneys.map(journey => (
                <div key={journey.Id} className={styles.galleryRow}>
                  <div>
                    <Text weight="semibold">{journey.Title}</Text>
                    <br />
                    <Text size={200}>{journey.Description}</Text>
                  </div>
                  <Button
                    appearance="outline"
                    size="small"
                    onClick={() => onImport(journey.Id)}
                  >
                    Import
                  </Button>
                </div>
              ))}
            </AccordionPanel>
          </AccordionItem>
        </Accordion>
      )}

      {journeys.length === 0 && (
        <Text>No journey templates available. Create one above or contact your administrator.</Text>
      )}
    </div>
  );
};
