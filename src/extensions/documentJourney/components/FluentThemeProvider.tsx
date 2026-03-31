import * as React from 'react';
import { FluentProvider, webLightTheme, Theme } from '@fluentui/react-components';
import { createV9Theme } from '@fluentui/react-migration-v8-v9';

export interface IFluentThemeProviderProps {
  spfxTheme?: any;
  children: React.ReactNode;
}

export const FluentThemeProvider: React.FC<IFluentThemeProviderProps> = ({ spfxTheme, children }) => {
  const theme: Theme = React.useMemo(() => {
    if (spfxTheme) {
      try {
        return createV9Theme(spfxTheme) as Theme;
      } catch {
        return webLightTheme;
      }
    }
    return webLightTheme;
  }, [spfxTheme]);

  return (
    <FluentProvider theme={theme}>
      {children}
    </FluentProvider>
  );
};
