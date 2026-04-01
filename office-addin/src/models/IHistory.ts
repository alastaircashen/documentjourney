import { JourneyStatus } from '../shared/constants';

export interface IHistory {
  Id: number;
  Title: string;
  JourneyId: number;
  JourneyName: string;
  JourneyVersion: number;
  JourneyBatchId: string;
  DocumentUrl: string;
  DocumentName: string;
  LibraryUrl: string;
  Status: JourneyStatus;
  CurrentStepOrder: number;
  TotalSteps: number;
  InitiatedById: number;
  InitiatedDate: string;
  CompletedDate: string;
  CancellationReason: string;
}
