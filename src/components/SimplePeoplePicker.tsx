import * as React from 'react';
import {
  Input,
  Tag,
  TagGroup,
  Text,
  makeStyles,
  tokens,
} from '@fluentui/react-components';
import { IAssignee } from '../models/IStepInstance';
import { useDocumentJourney } from '../common/DocumentJourneyContext';

export interface ISimplePeoplePickerProps {
  selectedPeople: IAssignee[];
  onChange: (people: IAssignee[]) => void;
  placeholder?: string;
  label?: string;
}

interface IGraphUser {
  displayName: string;
  mail: string;
  userPrincipalName: string;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    position: 'relative',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    width: '100%',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: '0',
    right: '0',
    zIndex: 1000,
    backgroundColor: tokens.colorNeutralBackground1,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusMedium,
    boxShadow: tokens.shadow8,
    marginTop: '2px',
    maxHeight: '220px',
    overflowY: 'auto',
  },
  dropdownItem: {
    display: 'flex',
    flexDirection: 'column',
    padding: '8px 12px',
    cursor: 'pointer',
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    ':last-child': {
      borderBottom: 'none',
    },
    ':hover': {
      backgroundColor: tokens.colorNeutralBackground1Hover,
    },
  },
  dropdownItemName: {
    fontWeight: tokens.fontWeightSemibold,
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground1,
  },
  dropdownItemEmail: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  noResults: {
    padding: '8px 12px',
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
});

export const SimplePeoplePicker: React.FC<ISimplePeoplePickerProps> = ({
  selectedPeople,
  onChange,
  placeholder = 'Search people\u2026',
  label
}) => {
  const styles = useStyles();
  const { graphClient } = useDocumentJourney();

  const [inputValue, setInputValue] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<IGraphUser[]>([]);
  const [isSearching, setIsSearching] = React.useState(false);
  const [showDropdown, setShowDropdown] = React.useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent): void => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchUsers = React.useCallback(async (query: string): Promise<void> => {
    if (query.length < 2 || !graphClient) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    try {
      const response = await graphClient.api('/users')
        .filter(`startswith(displayName,'${query.replace(/'/g, "''")}') or startswith(mail,'${query.replace(/'/g, "''")}')`)
        .select('displayName,mail,userPrincipalName')
        .top(10)
        .get();
      const users: IGraphUser[] = response.value || [];
      setSearchResults(users);
      setShowDropdown(users.length > 0);
    } catch {
      setSearchResults([]);
      setShowDropdown(false);
    } finally {
      setIsSearching(false);
    }
  }, [graphClient]);

  const handleInputChange = (_e: React.ChangeEvent<HTMLInputElement>, data: { value: string }): void => {
    const val = data.value;
    setInputValue(val);

    if (debounceRef.current !== undefined) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      searchUsers(val).catch(() => undefined);
    }, 300);
  };

  const isAlreadySelected = (email: string): boolean => {
    for (let i = 0; i < selectedPeople.length; i++) {
      if (selectedPeople[i].email === email) return true;
    }
    return false;
  };

  const selectUser = (user: IGraphUser): void => {
    const email = user.mail || user.userPrincipalName;
    if (isAlreadySelected(email)) {
      setInputValue('');
      setShowDropdown(false);
      return;
    }
    const newPerson: IAssignee = {
      loginName: user.userPrincipalName || email,
      displayName: user.displayName,
      email: email,
    };
    onChange([...selectedPeople, newPerson]);
    setInputValue('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const addByEmail = (): void => {
    const email = inputValue.trim();
    if (!email) return;
    if (isAlreadySelected(email)) {
      setInputValue('');
      return;
    }
    const newPerson: IAssignee = {
      loginName: email,
      displayName: email.split('@')[0],
      email: email,
    };
    onChange([...selectedPeople, newPerson]);
    setInputValue('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const removePerson = (loginName: string): void => {
    onChange(selectedPeople.filter(p => p.loginName !== loginName));
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (!showDropdown) {
        addByEmail();
      }
    }
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className={styles.container} ref={containerRef}>
      {label && <Text size={200} weight="semibold">{label}</Text>}

      {selectedPeople.length > 0 && (
        <TagGroup className={styles.tags} onDismiss={(_e, data) => removePerson(data.value)}>
          {selectedPeople.map((person) => (
            <Tag
              key={person.loginName}
              dismissible
              dismissIcon={{ 'aria-label': 'Remove' }}
              value={person.loginName}
            >
              {person.displayName || person.email}
            </Tag>
          ))}
        </TagGroup>
      )}

      <div className={styles.inputWrapper}>
        <Input
          className={styles.input}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchResults.length > 0) setShowDropdown(true);
          }}
          placeholder={isSearching ? 'Searching\u2026' : placeholder}
          size="small"
        />

        {showDropdown && (
          <div className={styles.dropdown}>
            {searchResults.length === 0 ? (
              <div className={styles.noResults}>No results found</div>
            ) : (
              searchResults.map((user) => (
                <div
                  key={user.userPrincipalName}
                  className={styles.dropdownItem}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectUser(user);
                  }}
                >
                  <span className={styles.dropdownItemName}>{user.displayName}</span>
                  {(user.mail || user.userPrincipalName) && (
                    <span className={styles.dropdownItemEmail}>{user.mail || user.userPrincipalName}</span>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
