import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PublicClientApplication, AccountInfo } from '@azure/msal-browser';
import { getMsalInstance, getActiveAccount, signIn as msalSignIn, signOut as msalSignOut } from './msalConfig';

interface IAuthContext {
  isAuthenticated: boolean;
  isLoading: boolean;
  account: AccountInfo | null;
  msalInstance: PublicClientApplication | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<IAuthContext>({
  isAuthenticated: false,
  isLoading: true,
  account: null,
  msalInstance: null,
  signIn: async () => {},
  signOut: async () => {},
  error: null,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [msalInst, setMsalInst] = useState<PublicClientApplication | null>(null);
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const instance = await getMsalInstance();
        setMsalInst(instance);
        const activeAccount = getActiveAccount(instance);
        setAccount(activeAccount);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize authentication');
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const signIn = useCallback(async () => {
    if (!msalInst) return;
    try {
      setError(null);
      const acct = await msalSignIn(msalInst);
      setAccount(acct);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    }
  }, [msalInst]);

  const signOut = useCallback(async () => {
    if (!msalInst) return;
    try {
      await msalSignOut(msalInst);
      setAccount(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-out failed');
    }
  }, [msalInst]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!account,
        isLoading,
        account,
        msalInstance: msalInst,
        signIn,
        signOut,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
