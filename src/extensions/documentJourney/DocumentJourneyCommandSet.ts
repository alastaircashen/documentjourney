import * as React from 'react';
import * as ReactDom from 'react-dom';
import { Log } from '@microsoft/sp-core-library';
import {
  BaseListViewCommandSet,
  type Command,
  type IListViewCommandSetExecuteEventParameters,
  type ListViewStateChangedEventArgs
} from '@microsoft/sp-listview-extensibility';
import { DocumentJourneyPanel, IDocumentJourneyPanelProps } from './components/DocumentJourneyPanel';
import { JourneyViewPanel, IJourneyViewPanelProps } from './components/JourneyViewPanel';
import { FluentThemeProvider } from '../../common/FluentThemeProvider';
import { DocumentJourneyProvider } from '../../common/DocumentJourneyContext';
import { ISelectedDocument } from '../../services/JourneyService';
import { DJ_STATUS_FIELD_NAME } from '../../constants';

export interface IDocumentJourneyCommandSetProperties {
  // Reserved for future configuration
}

const LOG_SOURCE: string = 'DocumentJourneyCommandSet';

export default class DocumentJourneyCommandSet extends BaseListViewCommandSet<IDocumentJourneyCommandSetProperties> {
  private panelContainer!: HTMLDivElement;
  private _viewJourneyHandler!: (event: Event) => void;

  public onInit(): Promise<void> {
    Log.info(LOG_SOURCE, 'Initialized DocumentJourneyCommandSet');

    // Create panel container
    this.panelContainer = document.createElement('div');
    document.body.appendChild(this.panelContainer);

    const startJourneyCommand: Command = this.tryGetCommand('START_JOURNEY');
    startJourneyCommand.visible = false;

    const viewJourneyCommand: Command = this.tryGetCommand('VIEW_JOURNEY');
    if (viewJourneyCommand) {
      viewJourneyCommand.visible = false;
    }

    this.context.listView.listViewStateChangedEvent.add(this, this._onListViewStateChanged);

    // Listen for custom event dispatched by JourneyStatusCell field customizer
    this._viewJourneyHandler = (event: Event) => {
      const customEvent = event as CustomEvent<{ historyId: number }>;
      if (customEvent.detail?.historyId) {
        this.openViewPanel(customEvent.detail.historyId);
      }
    };
    window.addEventListener('dj:viewJourney', this._viewJourneyHandler);

    return Promise.resolve();
  }

  public onExecute(event: IListViewCommandSetExecuteEventParameters): void {
    switch (event.itemId) {
      case 'START_JOURNEY': {
        this.openPanel();
        break;
      }
      case 'VIEW_JOURNEY': {
        const selectedRow = this.context.listView.selectedRows?.[0];
        if (selectedRow) {
          const djStatus: string = selectedRow.getValueByName(DJ_STATUS_FIELD_NAME) || '';
          const parts = djStatus.split('|');
          if (parts.length >= 2) {
            const historyId = parseInt(parts[1], 10);
            if (!isNaN(historyId)) {
              this.openViewPanel(historyId);
            }
          }
        }
        break;
      }
      default:
        throw new Error('Unknown command');
    }
  }

  private openPanel(): void {
    const selectedRows = this.context.listView.selectedRows || [];
    const libraryUrl = this.context.pageContext.list?.serverRelativeUrl || '';

    const documents: ISelectedDocument[] = selectedRows.map((row: any) => ({
      name: row.getValueByName('FileLeafRef') || '',
      url: row.getValueByName('FileRef') || '',
      libraryUrl
    }));

    const panel = React.createElement(DocumentJourneyPanel, {
      documents,
      onDismiss: () => this.closePanel(),
    } as IDocumentJourneyPanelProps);

    const element = React.createElement(
      FluentThemeProvider,
      { themeVariant: undefined },
      React.createElement(
        DocumentJourneyProvider,
        { context: this.context },
        panel
      )
    );

    ReactDom.render(element, this.panelContainer);
  }

  private openViewPanel(historyId: number): void {
    const viewPanel = React.createElement(JourneyViewPanel, {
      historyId,
      onDismiss: () => this.closePanel(),
    } as IJourneyViewPanelProps);

    const element = React.createElement(
      FluentThemeProvider,
      { themeVariant: undefined },
      React.createElement(
        DocumentJourneyProvider,
        { context: this.context },
        viewPanel
      )
    );

    ReactDom.render(element, this.panelContainer);
  }

  private closePanel(): void {
    ReactDom.unmountComponentAtNode(this.panelContainer);
  }

  private _onListViewStateChanged = (args: ListViewStateChangedEventArgs): void => {
    Log.info(LOG_SOURCE, 'List view state changed');

    const selectedRows = this.context.listView.selectedRows || [];
    const hasSelection = selectedRows.length > 0;

    const startJourneyCommand: Command = this.tryGetCommand('START_JOURNEY');
    if (startJourneyCommand) {
      startJourneyCommand.visible = hasSelection;
    }

    // Show VIEW_JOURNEY only when exactly 1 item is selected and it has an active journey
    const viewJourneyCommand: Command = this.tryGetCommand('VIEW_JOURNEY');
    if (viewJourneyCommand) {
      let showView = false;
      if (selectedRows.length === 1) {
        const djStatus: string = selectedRows[0].getValueByName(DJ_STATUS_FIELD_NAME) || '';
        showView = djStatus.length > 0 && djStatus.includes('|');
      }
      viewJourneyCommand.visible = showView;
    }

    this.raiseOnChange();
  }

  public onDispose(): void {
    window.removeEventListener('dj:viewJourney', this._viewJourneyHandler);
    ReactDom.unmountComponentAtNode(this.panelContainer);
    if (this.panelContainer.parentElement) {
      this.panelContainer.parentElement.removeChild(this.panelContainer);
    }
  }
}
