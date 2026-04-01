import { SPFI } from '@pnp/sp';
import { StepType, TENANT_PROPERTY_KEYS } from '../shared/constants';
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

  constructor(sp: SPFI) {
    this.tenantPropertyService = new TenantPropertyService(sp);
  }

  public async triggerFlow(payload: IFlowTriggerPayload): Promise<void> {
    const flowUrl = await this.getFlowUrl(payload.stepType);
    if (!flowUrl) return;

    const response = await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Flow trigger failed: ${response.status} ${response.statusText}`);
    }
  }

  public async getConfiguredFlowTypes(): Promise<StepType[]> {
    const configured: StepType[] = [];
    for (const stepType of [StepType.Notification, StepType.Approval, StepType.Signature, StepType.Task, StepType.Feedback]) {
      const url = await this.getFlowUrl(stepType);
      if (url) configured.push(stepType);
    }
    return configured;
  }

  private async getFlowUrl(stepType: StepType): Promise<string> {
    const keyMap: Record<StepType, string> = {
      [StepType.Notification]: TENANT_PROPERTY_KEYS.FlowUrlNotification,
      [StepType.Approval]: TENANT_PROPERTY_KEYS.FlowUrlApproval,
      [StepType.Signature]: TENANT_PROPERTY_KEYS.FlowUrlSignature,
      [StepType.Task]: TENANT_PROPERTY_KEYS.FlowUrlTask,
      [StepType.Feedback]: TENANT_PROPERTY_KEYS.FlowUrlFeedback,
    };
    return this.tenantPropertyService.getValue(keyMap[stepType]);
  }
}
