import { StepType, StepStatus, ActionType } from '../constants';

export interface IStepHistory {
  Id: number;
  HistoryId: number;
  StepId: number;
  StepTitle: string;
  StepOrder: number;
  StepType: StepType;
  Status: StepStatus;
  AssignedTo: string[];
  ActionBy: string | null;
  ActionType: ActionType | null;
  ActionDate: string | null;
  Comments: string | null;
  DueDate: string | null;
}
