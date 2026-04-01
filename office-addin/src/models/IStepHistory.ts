import { StepStatus, StepType, CompletionRule } from '../shared/constants';

export interface IStepHistory {
  Id: number;
  Title: string;
  HistoryId: number;
  StepOrder: number;
  StepName: string;
  StepType: StepType;
  AssignedToId: number[];
  CompletionRule: CompletionRule;
  RequireComments: boolean;
  AllowReject: boolean;
  AllowDelegate: boolean;
  Status: StepStatus;
  ActionById: number;
  ActionDate: string;
  Comments: string;
  DueDate: string;
  DelegatedFrom: number;
  DelegatedBy: number;
  DelegatedDate: string;
}
