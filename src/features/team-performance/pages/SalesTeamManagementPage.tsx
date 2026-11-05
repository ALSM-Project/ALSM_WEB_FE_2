import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { conversionError } from '@/features/conversions/services/conversion-queue.service';
import { Button, Card, PageHeader } from '@/shared/ui';
import { teamPerformanceService, type TeamOrganizationMember } from '../services/team-performance.service';

type Mode = 'existing' | 'create';

function newCreationId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function SalesTeamManagementPage() {
  const { user, isLoading, error, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('existing');
  const [teamId, setTeamId] = useState('');
  const [newMemberIds, setNewMemberIds] = useState<string[]>([]);
  const [teamName, setTeamName] = useState('');
  const [managerId, setManagerId] = useState('');
  const [creationId, setCreationId] = useState(newCreationId);
  const [successMessage, setSuccessMessage] = useState('');

  const canManage = Boolean(user?.isActive && hasPermission('users.manage') && !error && !isLoading);
  const teams = useQuery({
    queryKey: ['sales-team-admin-list', user?.id],
    queryFn: () => teamPerformanceService.listTeams('SALES'),
    enabled: canManage,
    retry: false,
  });
  const members = useQuery({
    queryKey: ['sales-team-admin-members', user?.id],
    queryFn: () => teamPerformanceService.listOrganizationMembers(),
    enabled: canManage,
    retry: false,
  });
  const memberOptions = members.data ?? [];
  const managerCandidates = memberOptions.filter((member) => member.organizationRole !== 'VIEWER');

  useEffect(() => {
    if (!managerId && managerCandidates.length) {
      setManagerId(managerCandidates.find((member) => member.id === user?.id)?.id ?? '');
    }
  }, [managerCandidates, managerId, user?.id]);

  const selectedTeam = teams.data?.find((team) => team.id === teamId);
  const administration = useQuery({
    queryKey: ['sales-team-administration', user?.id, teamId],
    queryFn: () => teamPerformanceService.getTeamAdministration(teamId),
    enabled: canManage && mode === 'existing' && Boolean(teamId && selectedTeam),
    retry: false,
  });
  const currentTeam = administration.data;
  const currentMemberIds = new Set([...(currentTeam?.memberIds ?? []), ...(currentTeam?.managerIds ?? [])]);
  const selectableMembers = memberOptions.filter((member) => !currentMemberIds.has(member.id));
  const noOrganizationAccess = teams.isError && conversionError(teams.error).toLowerCase().includes('do not have access to this organization');

  const save = useMutation({
    mutationFn: async () => {
      if (mode === 'existing') {
        if (!currentTeam) throw new Error('Load the selected Sales Team again before saving.');
        if (!newMemberIds.length) throw new Error('Select at least one person to add.');
        return teamPerformanceService.updateTeam(currentTeam.id, {
          name: currentTeam.name,
          kind: 'SALES',
          memberIds: Array.from(new Set([...currentTeam.memberIds, ...newMemberIds])),
          managerIds: currentTeam.managerIds,
          projectAssignments: currentTeam.projectAssignments,
          expectedRevision: currentTeam.revision,
        }, currentTeam.organizationId);
      }

      const normalizedName = teamName.trim();
      if (!normalizedName) throw new Error('Enter a team name.');
      if (!managerId) throw new Error('Select a team manager.');
      return teamPerformanceService.createTeam({
        creationId,
        name: normalizedName,
        kind: 'SALES',
        memberIds: Array.from(new Set([...newMemberIds, managerId])),
        managerIds: [managerId],
        projectAssignments: [],
        expectedRevision: 0,
      });
    },
    onSuccess: async (savedTeam) => {
      setSuccessMessage(mode === 'existing'
        ? `Added the selected people to ${savedTeam.name}.`
        : `Created the Sales Team “${savedTeam.name}”.`);
      setNewMemberIds([]);
      if (mode === 'create') {
        setTeamName('');
        setTeamId(savedTeam.id);
        setCreationId(newCreationId());
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['sales-team-admin-list', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['sales-team-administration', user?.id] }),
        queryClient.invalidateQueries({ queryKey: ['managed-report-teams', user?.id, undefined, 'SALES'] }),
      ]);
    },
  });

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    setTeamId('');
    setNewMemberIds([]);
    setCreationId(newCreationId());
    setSuccessMessage('');
    save.reset();
  };
  const toggleMember = (memberId: string) => {
    setNewMemberIds((current) => current.includes(memberId)
      ? current.filter((id) => id !== memberId)
      : [...current, memberId]);
    setCreationId(newCreationId());
    setSuccessMessage('');
    save.reset();
  };

  const selectedMemberCount = newMemberIds.length + (mode === 'create' && managerId && !newMemberIds.includes(managerId) ? 1 : 0);
  const saveDisabled = save.isPending || teams.isError || members.isError || members.isFetching || memberOptions.length === 0
    || (mode === 'existing' && (!currentTeam || !newMemberIds.length))
    || (mode === 'create' && (!teamName.trim() || !managerId));

  return <div className="space-y-6">
    <PageHeader title="Manage Sales Teams" subtitle="Add internal Sales users to a Sales Team so their leads can be used for contracts." />
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">This page uses the organization associated with your internal staff account. Customer organizations shown in Organisation Directory are a separate scope.</p>
      <Link to="/team-performance" className="text-sm font-medium text-blue-700 underline">Back to Team Performance</Link>
    </div>

    {isLoading && <Card><p role="status">Checking your access…</p></Card>}
    {!isLoading && (!user?.isActive || error) && <Card><p role="alert">An active authenticated account is required.</p></Card>}
    {!isLoading && user?.isActive && !hasPermission('users.manage') && <Card className="space-y-3">
      <p className="font-semibold">Your account can create contracts, but cannot manage Sales Team membership.</p>
      <p className="text-sm text-slate-600">Ask an Owner/Admin of your internal organization who has users.manage to add the salesperson assigned to the Lead. The customer Lead account cannot manage an internal Sales Team.</p>
      <Link to="/sales/contracts" className="inline-flex w-fit rounded-md bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">Return to Contracts &amp; E-Sign</Link>
    </Card>}

    {canManage && <>
      {teams.isFetching && <Card><p role="status">Loading Sales Teams in your current organization…</p></Card>}
      {members.isFetching && <Card><p role="status">Loading active members of your organization…</p></Card>}
      {noOrganizationAccess && <Card className="space-y-2">
        <p role="alert" className="font-semibold">This account is not a member of its current organization.</p>
        <p className="text-sm text-slate-600">Sign in with an internal organization Owner/Admin account. The customer tenant directory does not grant membership to the internal organization.</p>
      </Card>}
      {teams.isError && !noOrganizationAccess && <Card><p role="alert">Unable to load Sales Teams: {conversionError(teams.error)}</p></Card>}
      {members.isError && !noOrganizationAccess && <Card><p role="alert">Unable to load organization members: {conversionError(members.error)}</p></Card>}

      {!teams.isFetching && !teams.isError && !members.isFetching && !members.isError && memberOptions.length === 0 && <Card><p role="status">This organization has no active members to assign.</p></Card>}

      {!teams.isFetching && !teams.isError && !members.isFetching && !members.isError && memberOptions.length > 0 && <Card className="space-y-5">
        <p className="text-sm text-slate-600">Only active members of your current organization are listed here.</p>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Sales Team action">
          <Button type="button" variant={mode === 'existing' ? 'primary' : 'outline'} onClick={() => handleModeChange('existing')}>Add to an existing team</Button>
          <Button type="button" variant={mode === 'create' ? 'primary' : 'outline'} onClick={() => handleModeChange('create')}>Create a new team</Button>
        </div>

        {mode === 'existing' && <>
          {teams.data?.length ? <label className="block max-w-xl text-sm font-semibold">Sales Team
            <select aria-label="Sales Team" value={teamId} onChange={(event) => { setTeamId(event.target.value); setNewMemberIds([]); setSuccessMessage(''); save.reset(); }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 font-normal">
              <option value="">Select a team you manage</option>
              {teams.data.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
            </select>
          </label> : <p role="status">No Sales Teams are in your management scope. Create one below or ask an organization administrator to assign you as a team manager.</p>}
          {administration.isFetching && <p role="status">Loading current team membership…</p>}
          {administration.isError && <p role="alert">Unable to load the selected team: {conversionError(administration.error)}</p>}
          {currentTeam && <>
            <p className="text-sm text-slate-600">Current members: {currentTeam.memberIds.length}. Existing members will be kept.</p>
            <MemberChoices members={selectableMembers} selectedIds={newMemberIds} onToggle={toggleMember} emptyMessage="All active accounts are already members or managers of this team." />
          </>}
        </>}

        {mode === 'create' && <>
          <label className="block max-w-xl text-sm font-semibold">Team name
            <input aria-label="Team name" value={teamName} onChange={(event) => { setTeamName(event.target.value); setCreationId(newCreationId()); setSuccessMessage(''); save.reset(); }} maxLength={120} className="mt-1 block w-full rounded-lg border border-slate-300 p-2.5 font-normal" placeholder="For example: ALSM Sales" />
          </label>
          <label className="block max-w-xl text-sm font-semibold">Team manager
            <select aria-label="Team manager" value={managerId} onChange={(event) => { setManagerId(event.target.value); setCreationId(newCreationId()); setSuccessMessage(''); save.reset(); }} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 font-normal">
              <option value="">Select a manager</option>
              {managerCandidates.map((member) => <option key={member.id} value={member.id}>{member.fullName} · {member.email}</option>)}
            </select>
          </label>
          <p className="text-sm text-slate-600">The selected manager is automatically included as a team member.</p>
          <MemberChoices members={memberOptions.filter((member) => member.id !== managerId)} selectedIds={newMemberIds} onToggle={toggleMember} emptyMessage="Choose a team manager above; they will be included automatically." />
        </>}

        {save.isError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">Could not save Sales Team: {conversionError(save.error)}. Saving requires an Owner/Admin account with users.manage, and every selected person must be an active member of this organization.</p>}
        {successMessage && <p role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{successMessage}</p>}
        <Button type="button" onClick={() => save.mutate()} isLoading={save.isPending} disabled={saveDisabled}>
          {mode === 'existing' ? (newMemberIds.length ? `Add ${newMemberIds.length} member${newMemberIds.length === 1 ? '' : 's'}` : 'Add members') : `Create Sales Team${selectedMemberCount ? ` · ${selectedMemberCount} members` : ''}`}
        </Button>
      </Card>}
    </>}
  </div>;
}

function MemberChoices({ members, selectedIds, onToggle, emptyMessage }: {
  members: TeamOrganizationMember[];
  selectedIds: string[];
  onToggle: (memberId: string) => void;
  emptyMessage: string;
}) {
  return <fieldset className="space-y-2">
    <legend className="text-sm font-semibold">Members to add</legend>
    {!members.length && <p className="text-sm text-slate-500">{emptyMessage}</p>}
    {!!members.length && <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {members.map((member) => <label key={member.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50">
        <input type="checkbox" checked={selectedIds.includes(member.id)} onChange={() => onToggle(member.id)} />
        <span><span className="block font-medium">{member.fullName}</span><span className="text-xs text-slate-500">{member.email}</span></span>
      </label>)}
    </div>}
  </fieldset>;
}
