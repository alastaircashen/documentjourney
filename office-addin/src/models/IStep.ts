import { StepType, CompletionRule, NotifyWho } from '../shared/constants';

export interface IStep {
  Id: number;
  Title: string;
  JourneyId: number;
  StepOrder: number;
  StepType: StepType;
  AssignedToId: number[];
  AssignToGroup: string;
  CompletionRule: CompletionRule;
  RequireComments: boolean;
  DueDays: number;
  AllowReject: boolean;
  AllowDelegate: boolean;
  Message: string;
  NotifyWho: NotifyWho;
}
