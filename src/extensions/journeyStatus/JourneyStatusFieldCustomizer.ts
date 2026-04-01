import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Log } from '@microsoft/sp-core-library';
import {
  BaseFieldCustomizer,
  type IFieldCustomizerCellEventParameters
} from '@microsoft/sp-listview-extensibility';
import { JourneyStatusCell, IJourneyStatusCellProps } from './components/JourneyStatusCell';

export interface IJourneyStatusFieldCustomizerProperties {
  // Reserved for future configuration
}

const LOG_SOURCE: string = 'JourneyStatusFieldCustomizer';

export default class JourneyStatusFieldCustomizer extends BaseFieldCustomizer<IJourneyStatusFieldCustomizerProperties> {

  public onInit(): Promise<void> {
    Log.info(LOG_SOURCE, 'Initialized JourneyStatusFieldCustomizer');
    return Promise.resolve();
  }

  public onRenderCell(event: IFieldCustomizerCellEventParameters): void {
    const rawValue: string = event.fieldValue || '';

    if (!rawValue) {
      // No active journey — render nothing
      event.domElement.innerHTML = '';
      return;
    }

    const cellProps: IJourneyStatusCellProps = {
      rawValue,
      siteUrl: this.context.pageContext.web.absoluteUrl
    };

    const element = React.createElement(JourneyStatusCell, cellProps);
    ReactDom.render(element, event.domElement);
  }

  public onDisposeCell(event: IFieldCustomizerCellEventParameters): void {
    ReactDom.unmountComponentAtNode(event.domElement);
  }
}
