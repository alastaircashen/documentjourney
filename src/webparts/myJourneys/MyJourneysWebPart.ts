import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { MyJourneys } from './components/MyJourneys';
import { FluentThemeProvider } from '../../common/FluentThemeProvider';
import { DocumentJourneyProvider } from '../../common/DocumentJourneyContext';

export interface IMyJourneysWebPartProps {
  // Reserved for future property pane config
}

export default class MyJourneysWebPart extends BaseClientSideWebPart<IMyJourneysWebPartProps> {

  public render(): void {
    const element = React.createElement(
      FluentThemeProvider,
      { themeVariant: undefined },
      React.createElement(
        DocumentJourneyProvider,
        { context: this.context },
        React.createElement(MyJourneys)
      )
    );

    ReactDom.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDom.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
