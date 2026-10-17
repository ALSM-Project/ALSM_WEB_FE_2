# Team performance (Web 2)

`/team-performance` and `/organisations/teams` show the authorized Sales Team roster and sales comparison. `/team-performance/monitor` shows authorized Conversion Team workload. Team selection and 7/30-day filters persist in `teamId`/`days` URL parameters; an optional `organizationId` selects existing organization context, never authorization. Normal authenticated API/refresh handling is unchanged.

The backend lists only explicit management assignments. Reports use the returned team's exact organization header. Query keys include authenticated identity, organization, team, kind and period; report caches are discarded on unmount. Refresh reloads management scope before remounting the report. Failed access/report requests hide cached rows/totals. No report request is sent for a team absent from the authorized list, unsupported period or inactive account.

Sales KPIs remain explicitly unavailable because assigned-lead/customer-conversion sources and reliable confirmed salesperson revenue attribution do not exist. The approved formula remains converted leads / assigned leads * 100. No fixture values, inferred customer attribution or alternative win-rate formula is displayed.

Workload displays server-calculated distinct assigned-job totals/member breakdowns. Periods select job creation within rolling UTC [start,end), with current assignment and current persisted status; this is not historical backlog. Retries do not add jobs. Unassigned jobs, removed team/project memberships, inactive staff and deleted projects are excluded by the backend. A zero is the real empty explicit cohort, not a claim about unassigned organization-wide work. There is a manual refresh; no live polling/trend promise is made.

Team and job assignment administration is provided by restricted backend APIs documented in its teams README. This frontend does not grant or modify permissions, membership or assignments. Backend deployment must provision the declared scoped uniqueness indexes before assignment writes.
