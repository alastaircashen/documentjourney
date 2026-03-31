import { StepType, CompletionRule } from '../constants';

export interface IStep {
  Id: number;
  Title: string;
  JourneyId: number;
  StepOrder: number;
  StepType: StepType;
  AssignedTo: string[];
  CompletionRule: CompletionRule;
  RequireComments: boolean;
  AllowReject: boolean;
  DueDays: number;
}
