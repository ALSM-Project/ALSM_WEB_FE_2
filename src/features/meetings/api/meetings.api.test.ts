import { describe, it, expect, vi, beforeEach } from 'vitest';
import { meetingsApi } from '../api/meetings.api';
import { apiClient } from '@/services/api/apiClient';

vi.mock('@/services/api/apiClient', () => ({
  apiClient: {
    post: vi.fn(),
    get: vi.fn(),
  },
}));

describe('meetingsApi (UC-43 API Client)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls POST /meetings with create DTO', async () => {
    const mockMeeting = {
      id: 'meet-1',
      title: 'Sprint Review',
      description: 'Sprint 14 review and planning',
      projectId: 'proj-1',
      meetingUrl: 'https://meet.google.com/abc-defg-hij',
      meetingCode: 'abc-defg-hij',
      hostUserId: 'user-1',
      hostEmail: 'sales@alsm.io',
      attendeeEmails: ['client@company.com'],
      scheduledStartTime: '2026-10-08T10:00:00.000Z',
      scheduledEndTime: '2026-10-08T11:00:00.000Z',
      status: 'SCHEDULED',
      createdAt: '2026-10-08T09:00:00.000Z',
      updatedAt: '2026-10-08T09:00:00.000Z',
    };

    vi.mocked(apiClient.post).mockResolvedValue(mockMeeting);

    const dto = {
      title: 'Sprint Review',
      description: 'Sprint 14 review and planning',
      projectId: 'proj-1',
      attendeeEmails: ['client@company.com'],
      scheduledStartTime: '2026-10-08T10:00:00.000Z',
      scheduledEndTime: '2026-10-08T11:00:00.000Z',
    };

    const res = await meetingsApi.create(dto);

    expect(apiClient.post).toHaveBeenCalledWith('/meetings', dto);
    expect(res).toEqual(mockMeeting);
  });

  it('calls GET /meetings with query params', async () => {
    const mockList = {
      items: [],
      total: 0,
    };

    vi.mocked(apiClient.get).mockResolvedValue(mockList);

    const res = await meetingsApi.list({ status: 'SCHEDULED', page: 1, limit: 10 });

    expect(apiClient.get).toHaveBeenCalledWith('/meetings?status=SCHEDULED&page=1&limit=10');
    expect(res).toEqual(mockList);
  });
});
