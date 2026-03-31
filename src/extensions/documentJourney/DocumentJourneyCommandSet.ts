import { override } from '@microsoft/decorators';
import {
  BaseListViewCommandSet,
  Command,
  IListViewCommandSetExecuteEventParameters,
  ListViewStateChangedEventArgs,
} from '@microsoft/sp-listview-extensibility';
import { spfi, SPFx } from '@pnp/sp';
import '@pnp/sp/webs';
import '@pnp/sp/lists';
import '@pnp/sp/items';
import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { DocumentJourneyPanel, IDocumentJourneyPanelProps } from './components/DocumentJourneyPanel';
import { SelectedDocument } from '../../services/JourneyService';

export default class DocumentJourneyCommandSet extends BaseListViewCommandSet<{}> {
  private panelContainer: HTMLDivElement | undefined;

  @override
  public onInit(): Promise<void> {
    this.context.listView.listViewStateChangedEvent.add(this, this.onListViewStateChanged);
    return Promise.resolve();
  }

  @override
  public onExecute(event: IListViewCommandSetExecuteEventParameters): void {
    if (event.itemId === 'START_JOURNEY') {
      const selectedDocs = this.getSelectedDocuments();
      this.openPanel(selectedDocs);
    }
  }

  private onListViewStateChanged = (_args: ListViewStateChangedEventArgs): void => {
    const command: Command = this.tryGetCommand('START_JOURNEY');
    if (command) {
      command.visible = this.context.listView.selectedRows !== undefined &&
        this.context.listView.selectedRows.length > 0;
    }
    this.raiseOnChange();
  };

  private getSelectedDocuments(): SelectedDocument[] {
    const rows = this.context.listView.selectedRows || [];
    return rows.map((row) => ({
      id: row.getValueByName('ID') as number,
      name: row.getValueByName('FileLeafRef') as string,
      url: row.getValueByName('FileRef') as string,
      libraryId: this.context.listView.list?.id?.toString() || '',
    }));
  }

  private openPanel(documents: SelectedDocument[]): void {
    if (!this.panelContainer) {
      this.panelContainer = document.createElement('div');
      document.body.appendChild(this.panelContainer);
    }

    const sp = spfi().using(SPFx(this.context));
    const currentUserEmail = this.context.pageContext.user.email;
    const libraryId = this.context.listView.list?.id?.toString() || '';

    const props: IDocumentJourneyPanelProps = {
      sp,
      spfxContext: this.context,
      documents,
      currentUserEmail,
      libraryId,
      isOpen: true,
      onDismiss: () => {
        if (this.panelContainer) {
          ReactDOM.unmountComponentAtNode(this.panelContainer);
        }
      },
    };

    const element = React.createElement(DocumentJourneyPanel, props);
    ReactDOM.render(element, this.panelContainer);
  }
}
