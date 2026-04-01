import { SPFI } from '@pnp/sp';
import { HttpClient, IHttpClientOptions, HttpClientResponse } from '@microsoft/sp-http';
import { StepType, TENANT_PROPERTY_KEYS } from '../constants';
import { TenantPropertyService } from './TenantPropertyService';

export interface IFlowTriggerPayload {
  historyId: number;
  stepOrder: number;
  stepType: StepType;
  stepName: string;
  documentUrl: string;
  documentName: string;
  journeyName: string;
  siteUrl: string;
}

export class FlowTriggerService {
  private tenantPropertyService: TenantPropertyService;

  constructor(sp: SPFI, private httpClient: HttpClient) {
    this.tenantPropertyService = new TenantPropertyService(sp);
  }

  public async triggerFlow(payload: IFlowTriggerPayload): Promise<void> {
    const flowUrl = await this.getFlowUrl(payload.stepType);
    if (!flowUrl) {
      // No flow URL configured for this step type — skip silently
      return;
    }

    const options: IHttpClientOptions = {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const response: HttpClientResponse = await this.httpClient.post(
      flowUrl,
      HttpClient.configurations.v1,
      options
    );

    if (!response.ok) {
      throw new Error(`Flow trigger failed: ${response.status} ${response.statusText}`);
    }
  }

  public async getConfiguredFlowTypes(): Promise<StepType[]> {
    const configured: StepType[] = [];
    for (const stepType of [StepType.Notification, StepType.Approval, StepType.Signature, StepType.Task, StepType.Feedback]) {
      const url = await this.getFlowUrl(stepType);
      if (url) {
        configured.push(stepType);
      }
    }
    return configured;
  }

  private async getFlowUrl(stepType: StepType): Promise<string> {
    const keyMap: Record<string, string> = {
      [StepType.Notification]: TENANT_PROPERTY_KEYS.FlowUrlNotification,
      [StepType.Approval]: TENANT_PROPERTY_KEYS.FlowUrlApproval,
      [StepType.Signature]: TENANT_PROPERTY_KEYS.FlowUrlSignature,
      [StepType.Task]: TENANT_PROPERTY_KEYS.FlowUrlTask,
      [StepType.Feedback]: TENANT_PROPERTY_KEYS.FlowUrlFeedback,
      [StepType.Complete]: '' // Complete steps don't trigger flows
    };

    return this.tenantPropertyService.getValue(keyMap[stepType]);
  }
}
