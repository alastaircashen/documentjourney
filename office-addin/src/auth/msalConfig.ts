import { Configuration, PublicClientApplication, SilentRequest, PopupRequest, AccountInfo } from '@azure/msal-browser';

// These values must be replaced with your Entra ID app registration details.
// Create an app registration at https://entra.microsoft.com:
//   - Type: Single-page application (SPA)
//   - Redirect URI: https://localhost:3000/taskpane.html
//   - API Permissions: SharePoint > Sites.ReadWrite.All (delegated), User.Read (delegated)
const MSAL_CONFIG: Configuration = {
  auth: {
    clientId: process.env.DJ_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
    authority: `https://login.microsoftonline.com/${process.env.DJ_TENANT_ID || 'YOUR_TENANT_ID_HERE'}`,
    redirectUri: window.location.origin + '/taskpane.html',
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: true, // Needed for IE11/Edge in Office desktop
  },
};

let msalInstance: PublicClientApplication | null = null;

export async function getMsalInstance(): Promise<PublicClientApplication> {
  if (!msalInstance) {
    msalInstance = new PublicClientApplication(MSAL_CONFIG);
    await msalInstance.initialize();

    // Handle redirect callback (for cases where popup falls back to redirect)
    await msalInstance.handleRedirectPromise();
  }
  return msalInstance;
}

export function getActiveAccount(instance: PublicClientApplication): AccountInfo | null {
  const activeAccount = instance.getActiveAccount();
  if (activeAccount) return activeAccount;

  const accounts = instance.getAllAccounts();
  if (accounts.length > 0) {
    instance.setActiveAccount(accounts[0]);
    return accounts[0];
  }
  return null;
}

export async function acquireToken(instance: PublicClientApplication, sharePointOrigin: string): Promise<string> {
  const account = getActiveAccount(instance);
  const scopes = [`${sharePointOrigin}/.default`];

  if (account) {
    const silentRequest: SilentRequest = { scopes, account };
    try {
      const response = await instance.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch {
      // Silent failed, fall through to popup
    }
  }

  // Use Office dialog for auth if in Office context, otherwise popup
  const popupRequest: PopupRequest = { scopes };
  const response = await instance.acquireTokenPopup(popupRequest);
  if (response.account) {
    instance.setActiveAccount(response.account);
  }
  return response.accessToken;
}

export async function signIn(instance: PublicClientApplication): Promise<AccountInfo> {
  const response = await instance.loginPopup({
    scopes: ['User.Read'],
  });
  if (response.account) {
    instance.setActiveAccount(response.account);
  }
  return response.account!;
}

export async function signOut(instance: PublicClientApplication): Promise<void> {
  await instance.logoutPopup();
}
