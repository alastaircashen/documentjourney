import { TenantPropertyService } from './TenantPropertyService';
import { IStep } from '../models/IStep';
import { SelectedDocument } from './JourneyService';

export class FlowTriggerService {
  constructor(private tenantPropertyService: TenantPropertyService) {}

  public async triggerStep(step: IStep, historyId: number, document: SelectedDocument): Promise<void> {
    const flowUrl = await this.tenantPropertyService.getFlowUrl(step.StepType);
    if (!flowUrl) return;

    const payload = {
      historyId,
      stepId: step.Id,
      stepType: step.StepType,
      stepTitle: step.Title,
      assignedTo: typeof step.AssignedTo === 'string' ? JSON.parse(step.AssignedTo) : step.AssignedTo,
      documentName: document.name,
      documentUrl: document.url,
      completionRule: step.CompletionRule,
      requireComments: step.RequireComments,
      allowReject: step.AllowReject,
      dueDays: step.DueDays,
    };

    await fetch(flowUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }
}
