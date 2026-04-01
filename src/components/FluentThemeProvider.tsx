import * as React from 'react';
import { FluentProvider, webLightTheme, webDarkTheme, Theme } from '@fluentui/react-components';

export interface IFluentThemeProviderProps {
  themeVariant?: any;
  children?: React.ReactNode;
}

export const FluentThemeProvider: React.FC<IFluentThemeProviderProps> = ({ themeVariant, children }) => {
  const theme: Theme = React.useMemo(() => {
    if (themeVariant?.isInverted) {
      return webDarkTheme;
    }
    return webLightTheme;
  }, [themeVariant]);

  return (
    <FluentProvider theme={theme}>
      {children}
    </FluentProvider>
  );
};
