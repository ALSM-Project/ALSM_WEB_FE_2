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
  Search,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { Modal } from '@/shared/ui/Modal';
import {
  useMeetingsList,
  useCreateMeeting,
  useUpdateMeeting,
  useUpdateMeetingStatus,
  useDeleteMeeting,
} from '../hooks/useMeetings';
import { MeetingCard } from '../components/MeetingCard';
import { MeetingDetailModal } from '../components/MeetingDetailModal';
import { EditMeetingModal } from '../components/EditMeetingModal';
import { CreateMeetingModal } from '../components/CreateMeetingModal';
import type { CreateMeetingRequest, Meeting, MeetingStatus, UpdateMeetingRequest } from '../types/meeting';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 12;

  // Modals state
  const [selectedDetailMeeting, setSelectedDetailMeeting] = useState<Meeting | null>(null);
  const [selectedEditMeeting, setSelectedEditMeeting] = useState<Meeting | null>(null);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [meetingToDelete, setMeetingToDelete] = useState<Meeting | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Queries & Mutations
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

  const createMeetingMutation = useCreateMeeting();
  const updateMeetingMutation = useUpdateMeeting();
  const updateStatusMutation = useUpdateMeetingStatus();
  const deleteMeetingMutation = useDeleteMeeting();

  const allMeetings = data?.items || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Filter by local search query if provided
  const meetings = allMeetings.filter((m) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      m.title.toLowerCase().includes(q) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      m.meetingCode.toLowerCase().includes(q) ||
      m.hostEmail.toLowerCase().includes(q) ||
      (m.attendeeEmails && m.attendeeEmails.some((e) => e.toLowerCase().includes(q)))
    );
  });

  // KPI Quick counts
  const scheduledCount = allMeetings.filter((m) => m.status === 'SCHEDULED').length;
  const inProgressCount = allMeetings.filter((m) => m.status === 'IN_PROGRESS').length;

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const handleCreateSubmit = async (dto: CreateMeetingRequest) => {
    await createMeetingMutation.mutateAsync(dto);
    showFeedback('success', `Meeting room "${dto.title}" scheduled successfully.`);
    void refetch();
  };

  const handleEditSave = async (id: string, dto: UpdateMeetingRequest) => {
    const updated = await updateMeetingMutation.mutateAsync({ id, dto });
    // Keep detail view in sync if open
    if (selectedDetailMeeting && selectedDetailMeeting.id === id) {
      setSelectedDetailMeeting(updated);
    }
    showFeedback('success', `Meeting room "${updated.title}" updated.`);
    void refetch();
  };

  const handleStatusChange = async (meeting: Meeting, newStatus: MeetingStatus) => {
    try {
      const updated = await updateStatusMutation.mutateAsync({ id: meeting.id, status: newStatus });
      if (selectedDetailMeeting && selectedDetailMeeting.id === meeting.id) {
        setSelectedDetailMeeting(updated);
      }
      showFeedback('success', `Meeting status updated to ${newStatus}.`);
      void refetch();
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.message || 'Failed to update status.');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!meetingToDelete) return;
    try {
      await deleteMeetingMutation.mutateAsync(meetingToDelete.id);
      showFeedback('success', `Meeting "${meetingToDelete.title}" deleted.`);
      setMeetingToDelete(null);
      if (selectedDetailMeeting && selectedDetailMeeting.id === meetingToDelete.id) {
        setSelectedDetailMeeting(null);
      }
      void refetch();
    } catch (err: any) {
      showFeedback('error', err?.response?.data?.message || 'Failed to delete meeting.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-[#DCE3EC]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#17263A]">
            Online Meetings
          </h1>
          <p className="text-xs text-[#8491A3] mt-1">
            Internal project syncs, technical code reviews, and conversion sprint rooms for team members.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            id="refresh-meetings-btn"
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            disabled={isFetching}
            className="gap-2 text-[#8491A3]"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            id="quick-meeting-btn"
            variant="outline"
            size="sm"
            onClick={() => setShowCreateModal(true)}
            className="gap-1.5 text-xs text-[#244A70] border-blue-200 hover:bg-blue-50 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Quick Room
          </Button>
          <Button
            id="create-meeting-btn"
            variant="primary"
            size="sm"
            onClick={() => navigate('/enterprise/meetings/create')}
            className="gap-2 bg-[#244A70] hover:bg-[#244A70] text-white shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Create Meeting Room
          </Button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-fade-in ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="font-bold opacity-60 hover:opacity-100"
          >
            &times;
          </button>
        </div>
      )}

      {/* Summary KPI Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#DCE3EC] p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#EEF1F6] flex items-center justify-center text-[#244A70] shrink-0">
            <Video className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#8491A3] font-semibold">Total Meetings</p>
            <p className="text-2xl font-bold text-[#17263A] mt-0.5">{total}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#DCE3EC] p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#8491A3] font-semibold">Scheduled</p>
            <p className="text-2xl font-bold text-sky-700 mt-0.5">{scheduledCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-[#DCE3EC] p-4 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-[#8491A3] font-semibold">In Progress</p>
            <p className="text-2xl font-bold text-emerald-700 mt-0.5">{inProgressCount}</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#DCE3EC]">
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
                    ? 'bg-[#244A70] text-white shadow-2xs'
                    : 'bg-white text-[#8491A3] hover:bg-[#F8FAFC] hover:text-[#244A70] border border-[#DCE3EC]'
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search meetings by title, host..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-lg border border-[#DCE3EC] bg-white text-[#17263A] placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
          />
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="meetings-loading-skeleton">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse space-y-4 border border-[#DCE3EC] p-6 bg-white rounded-xl shadow-2xs">
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
            <h3 className="text-lg font-bold text-[#17263A]">Failed to load meetings</h3>
            <p className="text-sm text-[#8491A3] max-w-md">
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
        <Card className="text-center py-16 px-4 border border-[#DCE3EC] bg-white rounded-xl shadow-2xs">
          <div className="flex flex-col items-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-[#EEF1F6] flex items-center justify-center text-[#244A70] mb-4">
              <Calendar className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#17263A]">No meetings found</h3>
            <p className="text-sm text-[#8491A3] mt-1 mb-6">
              {searchQuery
                ? `No meetings matching "${searchQuery}".`
                : selectedStatus
                ? `There are currently no meetings marked as "${selectedStatus.toLowerCase()}".`
                : 'No online meetings scheduled yet. Create your first Google Meet room now.'}
            </p>
            <Button
              id="empty-create-meeting-btn"
              variant="primary"
              size="sm"
              onClick={() => navigate('/enterprise/meetings/create')}
              className="gap-2 bg-[#244A70] hover:bg-[#244A70]"
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
              <MeetingCard
                key={meeting.id}
                meeting={meeting}
                onSelect={(m) => setSelectedDetailMeeting(m)}
                onEdit={(m) => setSelectedEditMeeting(m)}
                onDelete={(m) => setMeetingToDelete(m)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[#DCE3EC] pt-4 mt-6">
              <p className="text-xs text-[#8491A3]">
                Showing page <span className="font-semibold text-[#17263A]">{page}</span> of{' '}
                <span className="font-semibold text-[#17263A]">{totalPages}</span> ({total} meetings)
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

      {/* Meeting Detail Modal */}
      {selectedDetailMeeting && (
        <MeetingDetailModal
          isOpen={Boolean(selectedDetailMeeting)}
          meeting={selectedDetailMeeting}
          onClose={() => setSelectedDetailMeeting(null)}
          onEdit={(m) => {
            setSelectedDetailMeeting(null);
            setSelectedEditMeeting(m);
          }}
          onDelete={(m) => {
            setSelectedDetailMeeting(null);
            setMeetingToDelete(m);
          }}
          onStatusChange={handleStatusChange}
          isUpdatingStatus={updateStatusMutation.isPending}
        />
      )}

      {/* Edit Meeting Modal */}
      {selectedEditMeeting && (
        <EditMeetingModal
          isOpen={Boolean(selectedEditMeeting)}
          meeting={selectedEditMeeting}
          onClose={() => setSelectedEditMeeting(null)}
          onSave={handleEditSave}
          isSaving={updateMeetingMutation.isPending}
        />
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <CreateMeetingModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateSubmit}
          isSubmitting={createMeetingMutation.isPending}
        />
      )}

      {/* Confirm Delete Dialog */}
      {meetingToDelete && (
        <Modal
          isOpen={Boolean(meetingToDelete)}
          onClose={() => setMeetingToDelete(null)}
          title="Confirm Delete Meeting"
          maxWidth="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Are you sure you want to delete this meeting?</p>
                <p className="mt-1 text-[11px] leading-relaxed">
                  Meeting room <strong>&quot;{meetingToDelete.title}&quot;</strong> ({meetingToDelete.meetingCode}) will be permanently removed. Team members will no longer be able to access this room.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setMeetingToDelete(null)}
                disabled={deleteMeetingMutation.isPending}
              >
                Keep Meeting
              </Button>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleDeleteConfirm}
                disabled={deleteMeetingMutation.isPending}
                className="gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {deleteMeetingMutation.isPending ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
