import * as React from 'react';
import {
  Badge,
  Link,
  makeStyles,
  tokens,
  mergeClasses
} from '@fluentui/react-components';
import {
  CheckmarkCircle20Regular,
  DismissCircle20Regular,
  ArrowCircleRight20Regular,
  SubtractCircle20Regular
} from '@fluentui/react-icons';
import { JourneyStatus } from '../../../constants';

export interface IJourneyStatusCellProps {
  /** Pipe-delimited value: "displayText|historyId|status" */
  rawValue: string;
  /** Site absolute URL for building the journey view link */
  siteUrl: string;
}

interface IParsedStatus {
  displayText: string;
  historyId: number;
  status: JourneyStatus;
}

function parseStatusValue(rawValue: string): IParsedStatus | null {
  const parts = rawValue.split('|');
  if (parts.length < 3) {
    return null;
  }
  return {
    displayText: parts[0],
    historyId: parseInt(parts[1], 10),
    status: parts[2] as JourneyStatus
  };
}

const useStyles = makeStyles({
  cell: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    height: '100%',
  },
  link: {
    textDecorationLine: 'none',
    cursor: 'pointer',
    ':hover': {
      textDecorationLine: 'underline',
    },
  },
  badgeActive: {
    backgroundColor: tokens.colorPaletteBlueBorderActive,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  badgeCompleted: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  badgeRejected: {
    backgroundColor: tokens.colorPaletteRedBackground3,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  badgeCancelled: {
    backgroundColor: tokens.colorNeutralBackground4,
    color: tokens.colorNeutralForeground2,
  },
});

const statusConfig: Record<JourneyStatus, { icon: React.ElementType; styleKey: 'badgeActive' | 'badgeCompleted' | 'badgeRejected' | 'badgeCancelled' }> = {
  [JourneyStatus.Active]: { icon: ArrowCircleRight20Regular, styleKey: 'badgeActive' },
  [JourneyStatus.Completed]: { icon: CheckmarkCircle20Regular, styleKey: 'badgeCompleted' },
  [JourneyStatus.Rejected]: { icon: DismissCircle20Regular, styleKey: 'badgeRejected' },
  [JourneyStatus.Cancelled]: { icon: SubtractCircle20Regular, styleKey: 'badgeCancelled' },
  [JourneyStatus.Stalled]: { icon: ArrowCircleRight20Regular, styleKey: 'badgeRejected' },
};

export const JourneyStatusCell: React.FC<IJourneyStatusCellProps> = ({ rawValue, siteUrl }) => {
  const styles = useStyles();

  const parsed = parseStatusValue(rawValue);
  if (!parsed) {
    return null;
  }

  const { displayText, historyId, status } = parsed;
  const config = statusConfig[status] || statusConfig[JourneyStatus.Active];
  const Icon = config.icon;

  // Build a deep link to open the journey history view.
  // The CommandSet VIEW_JOURNEY command reads historyId from the query string.
  const viewUrl = `${siteUrl}/_layouts/15/SPFx/JourneyView.aspx?historyId=${historyId}`;

  const handleClick = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    // Dispatch a custom event that the DocumentJourneyCommandSet listens for
    window.dispatchEvent(new CustomEvent('dj:viewJourney', {
      detail: { historyId }
    }));
  };

  return (
    <div className={styles.cell}>
      <Link className={styles.link} href={viewUrl} onClick={handleClick}>
        <Badge
          className={styles[config.styleKey]}
          size="medium"
          shape="rounded"
          icon={<Icon />}
          appearance="filled"
        >
          {displayText}
        </Badge>
      </Link>
    </div>
  );
};
