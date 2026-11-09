export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface Meeting {
  id: string;
  title: string;
  description: string;
  meetingUrl: string;
  meetingCode: string;
  hostUserId: string;
  hostEmail: string;
  projectId?: string;
  projectName?: string;
  attendeeEmails: string[];
  scheduledStartTime: string; // ISO string
  scheduledEndTime: string;   // ISO string
  status: MeetingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMeetingRequest {
  title: string;
  description: string;
  customMeetingUrl?: string;
  projectId: string;
  attendeeEmails: string[];
  scheduledStartTime: string;
  scheduledEndTime: string;
}

export interface UpdateMeetingRequest {
  title?: string;
  description?: string;
  customMeetingUrl?: string;
  projectId?: string;
  attendeeEmails?: string[];
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  status?: MeetingStatus;
}

export interface ListMeetingsResponse {
  items: Meeting[];
  total: number;
}
