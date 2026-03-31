export const EXPECTED_SCHEMA_VERSION = 1;

export const LISTS = {
  Journeys: 'DJ_Journeys',
  Steps: 'DJ_Steps',
  History: 'DJ_History',
  StepHistory: 'DJ_StepHistory',
  Config: 'DJ_Config',
} as const;

export enum StepType {
  Notification = 'Notification',
  Approval = 'Approval',
  Signature = 'Signature',
  Task = 'Task',
  Feedback = 'Feedback',
}

export enum CompletionRule {
  All = 'All',
  One = 'One',
}

export enum JourneyStatus {
  Active = 'Active',
  Completed = 'Completed',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
}

export enum StepStatus {
  Pending = 'Pending',
  InProgress = 'InProgress',
  Completed = 'Completed',
  Rejected = 'Rejected',
  Skipped = 'Skipped',
}

export enum ActionType {
  Approved = 'Approved',
  Rejected = 'Rejected',
  Completed = 'Completed',
  Signed = 'Signed',
  FeedbackProvided = 'FeedbackProvided',
  Notified = 'Notified',
}

export const TENANT_PROPERTY_KEYS = {
  GallerySiteUrl: 'DJ_GallerySiteUrl',
  FlowUrlNotification: 'DJ_FlowUrl_Notification',
  FlowUrlApproval: 'DJ_FlowUrl_Approval',
  FlowUrlSignature: 'DJ_FlowUrl_Signature',
  FlowUrlTask: 'DJ_FlowUrl_Task',
  FlowUrlFeedback: 'DJ_FlowUrl_Feedback',
} as const;

export const STEP_TYPE_COLORS: Record<StepType, string> = {
  [StepType.Notification]: 'informative',
  [StepType.Approval]: 'warning',
  [StepType.Signature]: 'important',
  [StepType.Task]: 'success',
  [StepType.Feedback]: 'brand',
};
