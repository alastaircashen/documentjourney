import * as React from 'react';
import { Text, Tooltip } from '@fluentui/react-components';
import { useDocumentJourney } from '../common/DocumentJourneyContext';

export interface IUserDisplayProps {
  userIds: number[];
  prefix?: string;
}

interface ICachedUser {
  id: number;
  displayName: string;
  email: string;
}

// Module-level cache so it persists across renders
const userCache: Map<number, ICachedUser> = new Map();

export const UserDisplay: React.FC<IUserDisplayProps> = ({ userIds, prefix }) => {
  const { sp } = useDocumentJourney();
  const [users, setUsers] = React.useState<ICachedUser[]>([]);

  React.useEffect(() => {
    if (!userIds || userIds.length === 0) return;

    const resolve = async (): Promise<void> => {
      const resolved: ICachedUser[] = [];
      for (const id of userIds) {
        if (userCache.has(id)) {
          resolved.push(userCache.get(id)!);
          continue;
        }
        try {
          const user = await sp.web.siteUsers.getById(id)();
          const cached: ICachedUser = {
            id: user.Id,
            displayName: user.Title || `User #${id}`,
            email: user.Email || ''
          };
          userCache.set(id, cached);
          resolved.push(cached);
        } catch {
          const fallback: ICachedUser = { id, displayName: `User #${id}`, email: '' };
          userCache.set(id, fallback);
          resolved.push(fallback);
        }
      }
      setUsers(resolved);
    };

    resolve().catch(() => {});
  }, [userIds.join(',')]);

  if (!userIds || userIds.length === 0) return null;
  if (users.length === 0) return <Text size={200} style={{ color: '#605e5c' }}>Loading...</Text>;

  const first = users[0];
  const remaining = users.length - 1;

  const firstDisplay = first.email ? `${first.displayName}` : first.displayName;

  if (remaining === 0) {
    return (
      <Text size={200} style={{ color: '#323130' }}>
        {prefix ? `${prefix} ` : ''}{firstDisplay}
      </Text>
    );
  }

  const tooltipContent = users.map(u => u.email ? `${u.displayName} (${u.email})` : u.displayName).join('\n');

  return (
    <Tooltip content={tooltipContent} relationship="description">
      <Text size={200} style={{ color: '#323130', cursor: 'default' }}>
        {prefix ? `${prefix} ` : ''}{firstDisplay}
        <span style={{ color: '#0078d4', marginLeft: '4px' }}>(+{remaining})</span>
      </Text>
    </Tooltip>
  );
};

/** Simple single-user display for action-by fields */
export const SingleUserDisplay: React.FC<{ userId: number; prefix?: string }> = ({ userId, prefix }) => {
  return <UserDisplay userIds={userId ? [userId] : []} prefix={prefix} />;
};
