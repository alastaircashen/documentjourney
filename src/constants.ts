export const EXPECTED_SCHEMA_VERSION = 2;

export enum StepType {
  Notification = 'Notification',
  Approval = 'Approval',
  Signature = 'Signature',
  Task = 'Task',
  Feedback = 'Feedback',
  Complete = 'Complete'
}

/** Who gets notified when a step completes */
export enum StepNotify {
  None = 'None',
  Initiator = 'Initiator',
  AllJourneyParticipants = 'AllJourneyParticipants',
  AllStepParticipants = 'AllStepParticipants'
}

export enum CompletionRule {
  All = 'All',
  One = 'One'
}

export enum JourneyStatus {
  Active = 'Active',
  Completed = 'Completed',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
  Stalled = 'Stalled'
}

export enum StepStatus {
  Pending = 'Pending',
  Completed = 'Completed',
  Rejected = 'Rejected',
  Skipped = 'Skipped',
  FlowError = 'FlowError'
}

export enum NotifyWho {
  Initiator = 'Initiator',
  AllParticipants = 'AllParticipants',
  SpecificPerson = 'SpecificPerson'
}

export enum ActionType {
  Approved = 'Approved',
  Rejected = 'Rejected',
  Completed = 'Completed',
  Notified = 'Notified',
  Signed = 'Signed',
  FeedbackProvided = 'FeedbackProvided',
  Delegated = 'Delegated'
}

export const LISTS = {
  Journeys: 'DJ_Journeys',
  Steps: 'DJ_Steps',
  History: 'DJ_History',
  StepHistory: 'DJ_StepHistory',
  Config: 'DJ_Config'
} as const;

export const DJ_STATUS_FIELD_NAME = 'DJStatus';
export const DJ_STATUS_FIELD_XML = '<Field Type="Note" DisplayName="Journey Status" Name="DJStatus" StaticName="DJStatus" Required="FALSE" RichText="FALSE" NumLines="1" />';

export const TENANT_PROPERTY_KEYS = {
  GallerySiteUrl: 'DJ_GallerySiteUrl',
  FlowUrlNotification: 'DJ_FlowUrl_Notification',
  FlowUrlApproval: 'DJ_FlowUrl_Approval',
  FlowUrlSignature: 'DJ_FlowUrl_Signature',
  FlowUrlTask: 'DJ_FlowUrl_Task',
  FlowUrlFeedback: 'DJ_FlowUrl_Feedback'
} as const;

export const STEP_TYPE_COLORS: Record<StepType, string> = {
  [StepType.Notification]: 'informative',
  [StepType.Approval]: 'warning',
  [StepType.Signature]: 'success',
  [StepType.Task]: 'brand',
  [StepType.Feedback]: 'important',
  [StepType.Complete]: 'success'
};
