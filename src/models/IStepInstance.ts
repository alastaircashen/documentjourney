import { CompletionRule, NotifyWho, StepNotify, StepType } from '../constants';

/**
 * A resolved person or group selected via the SharePoint People Picker.
 */
export interface IAssignee {
  loginName: string;
  displayName: string;
  email: string;
}

/**
 * Runtime configuration for a step within a journey instance.
 */
export interface IStepInstance {
  templateStepId: number;
  stepOrder: number;
  title: string;
  stepType: StepType;
  assignedTo: IAssignee[];
  completionRule: CompletionRule;
  requireComments: boolean;
  dueDays: number;
  allowReject: boolean;
  allowDelegate: boolean;
  message: string;
  notifyWho: NotifyWho;
  stepNotify: StepNotify;
}
