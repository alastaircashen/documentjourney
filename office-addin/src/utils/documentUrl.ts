export interface IDocumentInfo {
  /** Display name of the file */
  name: string;
  /** Server-relative URL of the document */
  url: string;
  /** Server-relative URL of the library */
  libraryUrl: string;
  /** Full site URL (e.g. https://contoso.sharepoint.com/sites/team) */
  siteUrl: string;
}

/**
 * Parses the current document's Office URL to extract SharePoint location info.
 * Returns null if the document is not stored on SharePoint/OneDrive.
 */
export function getDocumentInfo(): IDocumentInfo | null {
  let docUrl: string;

  try {
    docUrl = Office.context.document.url;
  } catch {
    return null;
  }

  if (!docUrl) return null;

  // Check if it's a SharePoint/OneDrive URL
  if (!docUrl.includes('.sharepoint.com') && !docUrl.includes('-my.sharepoint.com')) {
    return null;
  }

  try {
    const url = new URL(docUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);

    // Find the site path: /sites/<name> or /teams/<name>
    let sitePathEnd = -1;
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'sites' || pathParts[i] === 'teams') {
        sitePathEnd = i + 1; // index of site name
        break;
      }
    }

    // For personal OneDrive: /personal/<name>
    if (sitePathEnd === -1) {
      for (let i = 0; i < pathParts.length; i++) {
        if (pathParts[i] === 'personal') {
          sitePathEnd = i + 1;
          break;
        }
      }
    }

    if (sitePathEnd === -1 || sitePathEnd >= pathParts.length) {
      return null;
    }

    const sitePath = '/' + pathParts.slice(0, sitePathEnd + 1).join('/');
    const siteUrl = `${url.origin}${sitePath}`;

    // The library is the next path segment after the site
    if (sitePathEnd + 1 >= pathParts.length) return null;
    const libraryUrl = '/' + pathParts.slice(0, sitePathEnd + 2).join('/');

    // Server-relative document URL
    const serverRelativeUrl = url.pathname;

    // File name
    const name = pathParts[pathParts.length - 1] || '';

    return {
      name: decodeURIComponent(name),
      url: serverRelativeUrl,
      libraryUrl,
      siteUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Alternative method using Office.context.document.getFilePropertiesAsync
 * which can be more reliable for desktop Office apps.
 */
export function getDocumentInfoAsync(): Promise<IDocumentInfo | null> {
  return new Promise((resolve) => {
    try {
      Office.context.document.getFilePropertiesAsync((result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded && result.value.url) {
          // Temporarily set the URL and reuse the sync parser
          const originalUrl = Office.context.document.url;
          const info = parseSharePointUrl(result.value.url);
          resolve(info);
        } else {
          // Fall back to sync method
          resolve(getDocumentInfo());
        }
      });
    } catch {
      resolve(getDocumentInfo());
    }
  });
}

function parseSharePointUrl(docUrl: string): IDocumentInfo | null {
  if (!docUrl || (!docUrl.includes('.sharepoint.com') && !docUrl.includes('-my.sharepoint.com'))) {
    return null;
  }

  try {
    const url = new URL(docUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);

    let sitePathEnd = -1;
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i] === 'sites' || pathParts[i] === 'teams' || pathParts[i] === 'personal') {
        sitePathEnd = i + 1;
        break;
      }
    }

    if (sitePathEnd === -1 || sitePathEnd >= pathParts.length) return null;

    const sitePath = '/' + pathParts.slice(0, sitePathEnd + 1).join('/');
    const siteUrl = `${url.origin}${sitePath}`;
    const libraryUrl = '/' + pathParts.slice(0, sitePathEnd + 2).join('/');
    const name = pathParts[pathParts.length - 1] || '';

    return {
      name: decodeURIComponent(name),
      url: url.pathname,
      libraryUrl,
      siteUrl,
    };
  } catch {
    return null;
  }
}
