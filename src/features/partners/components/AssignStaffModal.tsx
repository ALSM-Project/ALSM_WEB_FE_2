import React, { useState, useEffect } from 'react';
import { Modal, Button } from '@/shared/ui';
import { PartnerProject } from '../types/partner.types';
import { partnersApi } from '../api/partners.api';
import { Shield, Users, CheckCircle2, ChevronDown } from 'lucide-react';

interface AssignStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: PartnerProject;
  onAssigned: (updated: PartnerProject) => void;
}

interface StaffMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  activeWorkload: number;
}

export const AssignStaffModal: React.FC<AssignStaffModalProps> = ({
  isOpen,
  onClose,
  project,
  onAssigned,
}) => {
  const [roster, setRoster] = useState<StaffMember[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>(
    project.assignedTeamLeadId || 'lead-01'
  );
  const [selectedStaffId, setSelectedStaffId] = useState<string>(
    project.assignedStaffId || 'staff-01'
  );
  const [submitting, setSubmitting] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoadingRoster(true);
      partnersApi.getAssignableStaff().then((list) => {
        setRoster(list);
        if (project.assignedTeamLeadId) {
          setSelectedLeadId(project.assignedTeamLeadId);
        } else {
          const firstLead = list.find((m) => m.role === 'TEAM_LEAD');
          if (firstLead) setSelectedLeadId(firstLead.id);
        }
        if (project.assignedStaffId) {
          setSelectedStaffId(project.assignedStaffId);
        } else {
          const firstStaff = list.find((m) => m.role === 'CONVERSION_STAFF');
          if (firstStaff) setSelectedStaffId(firstStaff.id);
        }
        setLoadingRoster(false);
      });
    }
  }, [isOpen, project]);

  const teamLeads = roster.filter((m) => m.role === 'TEAM_LEAD');
  const conversionStaff = roster.filter((m) => m.role === 'CONVERSION_STAFF');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const leadObj = roster.find((m) => m.id === selectedLeadId);
      const staffObj = roster.find((m) => m.id === selectedStaffId);

      const updated = await partnersApi.assignProject(project.id, {
        teamLeadId: selectedLeadId,
        teamLeadName: leadObj?.fullName,
        staffId: selectedStaffId,
        staffName: staffObj?.fullName,
      });

      onAssigned(updated);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Team Project Assignment & Staff Allocation"
    >
      <form onSubmit={handleSave} className="space-y-4 text-xs">
        {/* Project Context Box */}
        <div className="p-3 rounded-xl bg-[#F7F9FC] border border-[#E5EAF0] space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-[#6B778C] uppercase">
              Target Modernization Project
            </span>
            <span className="text-[11px] font-mono text-[#0652CC] font-bold">
              {project.conversionType === 'COBOL_TO_JAVA' ? 'COBOL -> Java' : 'BMS/DSPF -> React'}
            </span>
          </div>
          <h4 className="text-sm font-bold text-[#091E42]">{project.name}</h4>
          <p className="text-[11px] text-[#6B778C]">Partner: {project.partnerName}</p>
        </div>

        {/* Team Lead Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#091E42] mb-1.5 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#0652CC]" />
            <span>Assigned Team Lead (Supervision & Quality Sign-Off) *</span>
          </label>
          <div className="relative">
            <select
              value={selectedLeadId}
              onChange={(e) => setSelectedLeadId(e.target.value)}
              disabled={loadingRoster}
              className="w-full h-9 px-3 py-1.5 text-xs bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] appearance-none pr-8 outline-none focus:ring-2 focus:ring-[#0652CC]/20 focus:border-[#0652CC]"
            >
              {teamLeads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.fullName} ({lead.email}) • {lead.activeWorkload} active projects
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#6B778C]">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Conversion Staff Engineer Selector */}
        <div>
          <label className="block text-xs font-semibold text-[#091E42] mb-1.5 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#0652CC]" />
            <span>Assigned Conversion Staff (AST Parser & Mapping Specialist) *</span>
          </label>
          <div className="relative">
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              disabled={loadingRoster}
              className="w-full h-9 px-3 py-1.5 text-xs bg-white border border-[#D9E2EC] rounded-lg text-[#091E42] appearance-none pr-8 outline-none focus:ring-2 focus:ring-[#0652CC]/20 focus:border-[#0652CC]"
            >
              {conversionStaff.map((staff) => (
                <option key={staff.id} value={staff.id}>
                  {staff.fullName} ({staff.email}) • {staff.activeWorkload} active scopes
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-[#6B778C]">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
          <p className="text-[11px] text-[#6B778C] mt-1">
            Workload metrics indicate currently active projects assigned to each team member.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-[#E5EAF0] flex items-center justify-end gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={submitting}
            className="bg-[#0652CC] hover:bg-[#0655FF] flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Confirm Staff Assignment</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
};
