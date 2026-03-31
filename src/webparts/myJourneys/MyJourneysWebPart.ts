import { Version } from '@microsoft/sp-core-library';
import { BaseClientSideWebPart } from '@microsoft/sp-webpart-base';
import { spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { MyJourneys, IMyJourneysProps } from './components/MyJourneys';

export default class MyJourneysWebPart extends BaseClientSideWebPart<{}> {
  public render(): void {
    const sp = spfi().using(SPFx(this.context));
    const currentUserEmail = this.context.pageContext.user.email;

    const element = React.createElement(MyJourneys, {
      sp,
      spfxContext: this.context,
      currentUserEmail,
    } as IMyJourneysProps);

    ReactDOM.render(element, this.domElement);
  }

  protected onDispose(): void {
    ReactDOM.unmountComponentAtNode(this.domElement);
  }

  protected get dataVersion(): Version {
    return Version.parse('1.0');
  }
}
