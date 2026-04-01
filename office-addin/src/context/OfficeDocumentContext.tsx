import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDocumentInfo, getDocumentInfoAsync, IDocumentInfo } from '../utils/documentUrl';

interface IOfficeDocumentContext {
  documentInfo: IDocumentInfo | null;
  isOnSharePoint: boolean;
  isLoading: boolean;
}

const OfficeDocumentContext = createContext<IOfficeDocumentContext>({
  documentInfo: null,
  isOnSharePoint: false,
  isLoading: true,
});

export const useOfficeDocument = () => useContext(OfficeDocumentContext);

export const OfficeDocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documentInfo, setDocumentInfo] = useState<IDocumentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detect = async () => {
      // Try async method first (more reliable for desktop Office)
      let info = await getDocumentInfoAsync();
      // Fall back to sync method
      if (!info) {
        info = getDocumentInfo();
      }
      setDocumentInfo(info);
      setIsLoading(false);
    };
    detect();
  }, []);

  return (
    <OfficeDocumentContext.Provider
      value={{
        documentInfo,
        isOnSharePoint: !!documentInfo,
        isLoading,
      }}
    >
      {children}
    </OfficeDocumentContext.Provider>
  );
};
