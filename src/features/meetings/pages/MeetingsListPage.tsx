import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  Plus,
  RefreshCw,
  Calendar,
  AlertCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { useMeetingsList } from '../hooks/useMeetings';
import { MeetingCard } from '../components/MeetingCard';
import type { MeetingStatus } from '../types/meeting';

const STATUS_FILTERS: { label: string; value?: MeetingStatus }[] = [
  { label: 'All Meetings', value: undefined },
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
];

export const MeetingsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedStatus, setSelectedStatus] = useState<MeetingStatus | undefined>(undefined);
  const [page, setPage] = useState(1);
  const limit = 12;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useMeetingsList({
    status: selectedStatus,
    page,
    limit,
  });

  const meetings = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Compute local quick counts from data
  const scheduledCount = meetings.filter((m) => m.status === 'SCHEDULED').length;
  const inProgressCount = meetings.filter((m) => m.status === 'IN_PROGRESS').length;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#E5EAF0]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#EBF2FC] text-[#0652CC] uppercase tracking-wider">
              Enterprise Collaboration
            </span>
            <span className="text-[11px] text-[#6B778C]">Google Meet Integration</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42] mt-1">
            Online Meeting Rooms
          </h1>
          <p className="text-xs text-[#6B778C] mt-1 max-w-3xl">
            Manage scheduled Google Meet conference rooms and invite team members
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            id="refresh-meetings-btn"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-2 text-[#42526E]"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            id="create-meeting-btn"
            variant="primary"
            size="sm"
            onClick={() => navigate('/enterprise/meetings/create')}
            className="gap-2 bg-[#0652CC] hover:bg-[#0041A8]"
          >
            <Plus className="w-4 h-4" />
            Create Meeting Room
          </Button>
        </div>
      </div>

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#E8F1FF] flex items-center justify-center text-[#0652CC] shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#6B778C] font-semibold">Total Meetings</p>
            <p className="text-2xl font-bold text-[#091E42] mt-0.5">{total}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#6B778C] font-semibold">Scheduled</p>
            <p className="text-2xl font-bold text-sky-700 mt-0.5">{scheduledCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#E5EAF0] p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#6B778C] font-semibold">In Progress</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{inProgressCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-[#E5EAF0] flex items-center justify-between pb-3">
        <div className="flex flex-wrap items-center gap-1.5" role="tablist">
          {STATUS_FILTERS.map((f) => {
            const isActive = selectedStatus === f.value;
            return (
              <button
                key={f.label}
                id={`filter-tab-${f.value || 'all'}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setSelectedStatus(f.value);
                  setPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0652CC] text-white shadow-2xs'
                    : 'bg-white text-[#42526E] hover:bg-[#F4F6F8] hover:text-[#0652CC] border border-[#E5EAF0]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="meetings-loading-skeleton">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse space-y-4 border border-[#E5EAF0] p-6 bg-white rounded-xl shadow-2xs">
              <div className="flex justify-between items-center">
                <div className="h-5 w-20 bg-gray-200 rounded-full" />
                <div className="h-4 w-24 bg-gray-200 rounded" />
              </div>
              <div className="h-6 w-3/4 bg-gray-200 rounded" />
              <div className="h-4 w-full bg-gray-100 rounded" />
              <div className="h-10 bg-gray-100 rounded-lg mt-4" />
            </Card>
          ))}
        </div>
      ) : isError ? (
        <Card className="text-center py-12 px-4 border border-rose-200 bg-rose-50/50 rounded-xl">
          <div className="flex flex-col items-center gap-3">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <h3 className="text-lg font-bold text-[#091E42]">Failed to load meetings</h3>
            <p className="text-sm text-[#42526E] max-w-md">
              {(error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                'An error occurred while fetching your meetings. Please verify your connection.'}
            </p>
            <Button
              id="retry-meetings-btn"
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        </Card>
      ) : meetings.length === 0 ? (
        <Card className="text-center py-16 px-4 border border-[#E5EAF0] bg-white rounded-xl shadow-2xs">
          <div className="flex flex-col items-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#E8F1FF] flex items-center justify-center text-[#0652CC] mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#091E42]">No meetings found</h3>
            <p className="text-sm text-[#42526E] mt-1 mb-6">
              {selectedStatus
                ? `There are currently no meetings marked as "${selectedStatus.toLowerCase()}".`
                : 'No online meetings scheduled yet. Create your first Google Meet room now.'}
            </p>
            <Button
              id="empty-create-meeting-btn"
              variant="primary"
              size="sm"
              onClick={() => navigate('/enterprise/meetings/create')}
              className="gap-2 bg-[#0652CC] hover:bg-[#0041A8]"
            >
              <Plus className="w-4 h-4" />
              Schedule Online Meeting
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="meetings-grid">
            {meetings.map((meeting) => (
              <MeetingCard key={meeting.id} meeting={meeting} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#E5EAF0] pt-4 mt-6">
              <p className="text-xs text-[#42526E]">
                Showing page <span className="font-semibold text-[#091E42]">{page}</span> of{' '}
                <span className="font-semibold text-[#091E42]">{totalPages}</span> ({total} meetings)
              </p>
              <div className="flex items-center gap-2">
                <Button
                  id="prev-page-btn"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  id="next-page-btn"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
