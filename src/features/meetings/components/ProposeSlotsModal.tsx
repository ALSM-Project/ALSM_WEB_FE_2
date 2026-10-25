import React, { useState } from 'react';
import { Calendar, Clock, Plus, Trash2, X } from 'lucide-react';
import { Button, toast } from '@/shared/ui';
import type { MeetingRequest } from '../types/meeting-request';

interface ProposeSlotsModalProps {
  meeting: MeetingRequest;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (slots: Array<{ startTime: string; endTime: string }>, message?: string) => Promise<void>;
  isSubmitting: boolean;
}

export const ProposeSlotsModal: React.FC<ProposeSlotsModalProps> = ({
  meeting,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}) => {
  const [slots, setSlots] = useState<Array<{ date: string; startTime: string; endTime: string }>>([
    {
      date: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
      startTime: '09:00',
      endTime: '09:45',
    },
    {
      date: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      startTime: '14:00',
      endTime: '14:45',
    },
  ]);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const handleAddSlot = () => {
    setSlots((prev) => [
      ...prev,
      {
        date: new Date(Date.now() + 86400000 * (prev.length + 2)).toISOString().slice(0, 10),
        startTime: '10:00',
        endTime: '10:45',
      },
    ]);
  };

  const handleRemoveSlot = (index: number) => {
    setSlots((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSlotChange = (index: number, field: 'date' | 'startTime' | 'endTime', value: string) => {
    setSlots((prev) =>
      prev.map((slot, idx) => (idx === index ? { ...slot, [field]: value } : slot))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slots.length === 0) {
      toast.warning('Please propose at least one time slot');
      return;
    }

    const formattedSlots = slots.map((s) => ({
      startTime: new Date(`${s.date}T${s.startTime}:00`).toISOString(),
      endTime: new Date(`${s.date}T${s.endTime}:00`).toISOString(),
    }));

    await onSubmit(formattedSlots, message);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Propose Meeting Slots</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Suggest available times for {meeting.customer.companyName} ({meeting.requestId})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 rounded-lg p-1 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-3">
            <label className="block text-xs font-semibold text-slate-700">
              Available Consultation Time Slots
            </label>
            {slots.map((slot, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <div className="relative flex-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={slot.date}
                    onChange={(e) => handleSlotChange(idx, 'date', e.target.value)}
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    required
                  />
                </div>
                <div className="relative w-24">
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => handleSlotChange(idx, 'startTime', e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    required
                  />
                </div>
                <span className="text-xs text-slate-400">to</span>
                <div className="relative w-24">
                  <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2" />
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => handleSlotChange(idx, 'endTime', e.target.value)}
                    className="w-full pl-6 pr-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
                    required
                  />
                </div>
                {slots.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(idx)}
                    className="text-rose-500 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleAddSlot}
              className="inline-flex items-center gap-1.5 text-xs w-full justify-center border-dashed border-slate-300 hover:border-slate-400"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Another Time Slot
            </Button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Note for Customer (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Hi Alice, here are the proposed slots for our technical consultation..."
              rows={3}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#244A70]"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isSubmitting} className="bg-[#244A70]">
              {isSubmitting ? 'Sending...' : 'Propose Slots'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
