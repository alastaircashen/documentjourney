import { JourneyStatus } from '../constants';

export interface IHistory {
  Id: number;
  Title: string;
  JourneyId: number;
  JourneyTitle: string;
  DocumentUrl: string;
  DocumentName: string;
  LibraryId: string;
  Status: JourneyStatus;
  CurrentStepOrder: number;
  TotalSteps: number;
  InitiatedBy: string;
  InitiatedDate: string;
  CompletedDate: string | null;
}
