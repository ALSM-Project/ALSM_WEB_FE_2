# ALSMV2-1050 / UC66-04 — isolated Frontend Support View

Implemented on 2 November 2026 in `E:/ALSM/ALSM_WEB_FE_2`, the existing React/Vite
Internal Staff Portal. Base: `f3d5fc0`; branch:
`feature/alsmv2-1050-uc66-04-support-view`. The customer frontend `ALSM_WEB_FE_1`
is unchanged. Contract source: Backend `ba9f91e`, its Support README and UC66-03
implementation document. No Backend file, route registration, database or index
is changed. Legacy authenticated impersonation remains a 503.

## Implemented experience

`/support` uses the existing authenticated app shell, navigation, useAuth and
shared Button/Input/Card/Badge/PageHeader components. Organisation Access in the
Customer Support navigation now points here, independently of the Platform Admin
Organisation directory. The legacy disabled admin Support View is unchanged.

The presentation gate requires an active profile with the exact INTERNAL_SUPPORT
role and organizations.impersonate permission; Platform Admin alone is insufficient.
It is not server authority. Future HTTP integration must still use the Backend's
persisted account/session/role/permission/context checks.

Staff explicitly searches a name prefix or exact Organisation contact email,
pages through eligible metadata, and selects Enter Organisation. The workspace
shows the active Organisation, context UUID, original staff identity, Read-only
Support View banner, server absolute expiry and a conservative local idle guard.
Staff loads Projects, inspects a Project and uses Screens, Programs, Findings,
Conversion Logs and Error Logs tabs. Every collection supports bounded list,
detail and keyset pagination. No customer write, upload, mapping, conversion,
retry, export, billing or download action exists in this workspace.

Exit Organisation clears the UI before awaiting acknowledgement, then returns
to the Support Portal. Only a confirmed EXITED response is described as successful.
Search inputs, selected Project, pages, details, cursors and operation IDs are
cleared as part of leaving the view. Entering another Organisation requires a
confirmed Exit first within the mounted flow.

## Typed contracts and safe defaults

SupportAdapter defines search, Enter, context status, Exit, and generic typed
list/detail methods covering the twelve accepted operations. The HTTP adapter
implements exactly these existing paths under `/api/v1`:

- GET `/support/organizations` with query/field/limit/afterId.
- POST `/support/organizations/:organizationId/contexts` with an empty body.
- GET `/support/organizations/:organizationId/contexts/:contextId`.
- POST that context's `/exit` with an empty body.
- GET that context's `/workspace/projects[/:projectId]`.
- GET `/workspace/projects/:projectId/{screens,programs,findings,conversion-logs,error-logs}[/:resourceId]`.

IDs and bounds are validated before transport. Responses are decoded to explicit
approved fields, with scope/identity checks for context/detail responses. Raw
payloads are not spread into UI state or rendered. The UI uses pages of ten; the
adapter supports the Backend's 1–25 bound. There is no customer JWT/membership
substitution, customer API fallback or legacy impersonation call.

The application selects unavailableSupportAdapter by default and makes no Support
network request. Only development mode with `VITE_SUPPORT_VIEW_MOCK=true` selects
an isolated synthetic mock. Normal production builds always remain unavailable,
including a production build made with the mock flag set. The HTTP adapter is
prepared and tested, but has no runtime activation switch and is not selected.
The mock represents an original-session context lifecycle in memory; it is not
evidence of persisted authority, transactions, audit or distributed revocation.

Development preview, using the existing staff authentication:

```powershell
Set-Location E:\ALSM\ALSM_WEB_FE_2
$env:VITE_SUPPORT_VIEW_MOCK = 'true'
npm run dev
# Open /support after ordinary Internal Support sign-in.
```

Search `Example` or exact contact email `manufacturing@example.invalid`.
These are synthetic fixtures; no fake customer credential or membership is created.

## Scope, activity, uncertainty and expiry

SupportSession owns volatile component state, outside React Query and browser
storage. Each request captures a generation and exact Organisation/context/Project
scope. Invalidation increments that generation and aborts the transport; generation
checks still reject late responses when a transport ignores abort. Abort is never
described as server rollback. Project changes clear child data; unavailable ownership
clears cached Project/resource metadata. Exit, expiry, logout, original-login change,
observed authority loss and route unmount clear the scoped view. Profile/credential
changes remount or remove the controller before old data can be displayed.

The original staff tokenStore and apiClient are reused. Support requests explicitly
disable the shared 401 authentication replay path; normal API requests retain their
existing behavior. Support requests are not React Query queries/mutations and have
no retries, focus refetch, reconnect refetch or background HTTP polling. Local timers,
focus/pageshow/visibility checks only enforce UI guards. Check Context is an explicit
user action and is labelled as activity; it is never used as reconciliation.

Server context timestamps establish conservative local guards: at most 30 minutes
absolute and 15 minutes idle, anchored to request start to avoid extending access
for transport delay or a constant client/server clock offset. Only confirmed activity
updates the local idle guard; the absolute guard never grows. Backwards local time
fails closed. Workspace responses contain no refreshed context deadlines, so local
guards are estimates and may clear earlier than the Backend; the Backend remains
the authority on every request. Sleep/throttling is checked on resume and before
using any response. No client timer is claimed to enforce distributed revocation.

SUPPORT_CONTEXT_OUTCOME_UNCONFIRMED closes the workspace and retains the original
Organisation/context/operation references provided by the server, without data or
replay. A missing acknowledgement/gateway error is conservatively uncertain unless
the accepted contract establishes a definite pre-commit rejection. Missing IDs are
not invented. SUPPORT_WORKSPACE_DELIVERY_WITHHELD states that activity/audit already
committed while data was withheld; it does not claim rollback. An unsuccessful Exit
does not silently permit another Enter. Unresolved outcomes disable further activity
within this mounted flow. References are volatile and cleared on logout/unmount;
there is no automatic resume after reload.

No actual pure read-only reconciliation endpoint exists at ba9f91e, so none is
invented or called. Context status is itself an audited activity. References can
be retained for authorized operational review, not passed to a fabricated API.
Leaving/reloading the page clears local data without automatically issuing Exit;
it does not claim that a server context ended. Use Exit before leaving. Future live
integration must define recovery for abandoned/uncertain contexts.

Remote revocation cannot be detected before it is observable through the existing
auth state or a request denial. This UI does not approve the Backend's remaining
late-revocation/in-flight response window or create a new push/revocation fence.

## Files

Modified:

- `.env.example`, `README.md`.
- `src/app/router.tsx`.
- `src/context/NavigationContext.tsx`.
- `src/services/api/apiClient.ts` (optional Support-only replay exclusion).
- `src/features/navigation/__tests__/DatabaseDrivenNavigationPermissions.test.tsx`.

Added:

- `src/features/support/api/support.types.ts`.
- `src/features/support/api/support.api.ts`.
- `src/features/support/api/support.mock.ts`.
- `src/features/support/api/support.adapter.ts`.
- `src/features/support/state/SupportSession.ts`.
- `src/features/support/state/supportAccess.ts`.
- `src/features/support/pages/SupportPortalPage.tsx`.
- `src/features/support/components/SupportWorkspace.tsx`.
- `src/features/support/components/SupportDiagnosticDetail.tsx`.
- `src/features/support/components/SupportOutcomeNotice.tsx`.
- `src/features/support/__tests__/SupportSession.test.ts`.
- `src/features/support/__tests__/support.api.test.ts`.
- `src/features/support/__tests__/SupportPortalPage.test.tsx`.
- `src/features/support/__tests__/SupportWorkspace.pagination.test.tsx`.
- `src/services/api/apiClient.support-replay.test.ts`.
- This handoff document.

## P2 Project pagination correction

The reviewed feature was preserved in checkpoint `aacb936` before this correction.
Project details deliberately clear the generic resource page while retaining the
Project list in `state.projects`. The pagination controls previously read the
cleared generic page's cursor, disabling Next page after inspecting a Project.
SupportWorkspace now derives the displayed rows, Next page availability and cursor
from the same existing page: `state.projects` for Projects, `state.page` otherwise.
No pagination state, API request or controller change was added. Scope clearing,
AbortController/generation checks, expiry and uncertain-outcome handling are unchanged.

Three StrictMode UI regressions use 25 synthetic Projects per Organisation and
10/10/5 pages. They cover opening and closing details without reloading, exact
page-two/page-three cursors and rows, Organisation/Context switching with an aborted
but late-delivered old response, and returning from a child collection to another
Project without reusing the child cursor. Request-count assertions exclude extra
list/status calls from the application. The new tests fail on `aacb936` at the
disabled Next page assertions (0 PASS / 3 FAIL / 0 SKIP), and pass after the fix
(3 PASS / 0 FAIL / 0 SKIP). The independent review's original P2 reproduction also
now passes (1 PASS / 0 FAIL / 0 SKIP).

## Verification and handoff

Focused tests exercise all twelve operations, exact paths/projections, original
identity, role/permission denials, pagination bounds, duplicate Enter, Exit/switch/
expiry/logout/authority invalidation, ignored late responses, uncertain Enter/read/
Exit, committed-but-withheld delivery, reference scope, gateway ambiguity, backwards
time, mock parent isolation and no background activity. The page flow is tested
under React StrictMode. Existing auth/session, navigation, disabled legacy Support
View and Platform Admin UI tests are included in the focused regression run.

Original implementation counts and command outputs are in
`E:/ALSM/alsmv2-1050-uc66-04-evidence-20261102/verification-summary.json`, alongside
focused-tests.json/log, baseline-focused.json/log, typescript.log, lint.log and
build.log (88 passing focused tests, including 45 Support/transport cases).
Pagination-correction evidence is retained separately in
`E:/ALSM/alsmv2-1050-uc66-04-pagination-fix-evidence-20261102`. The corrected focused
run has **91 PASS, 0 FAIL, 0 SKIP** across twelve files, including **48 Support/transport
cases**. TypeScript, repository Oxlint, changed-file ESLint, production build and
changed-file formatting pass. Since this repository has no ESLint configuration or
dependency, the scoped ESLint check uses the already installed ESLint 9/TypeScript
recommended rules with a temporary configuration in the evidence directory; no
tooling/dependency change is introduced. No live Support HTTP end-to-end or native
Chrome/Edge verification is claimed by this correction.

An isolated baseline at f3d5fc0 reproduced three stale navigation test assertions
that expected Admin-style groups for staff, and three Sales discount UI failures.
Navigation assertions now test the existing flattened staff links and correct
Support route/authority; production navigation flattening is unchanged. The Sales
failures are outside UC66-04 and unchanged. Exploratory whole-repository runs were
interrupted after stalled workers; no complete full-suite pass is claimed.

Ready for Hoang's independent QA/Security review **within isolated UC66-04 scope**.
Remaining integration/activation prerequisites:

1. Separately approved Backend registration and HTTP integration, followed by real
   authenticated, cross-Organisation, authority-loss, expiry and concurrency E2E QA.
2. Explicit Technical Owner revocation/in-flight ordering decision and required
   fencing/cross-instance verification. The Frontend cannot resolve that policy.
3. An authorized reconciliation/recovery workflow using the original operation
   identity if an actual read-only contract is supplied; no blind activity replay.
4. Backend transaction/audit/index/retention and staff-role provisioning checks,
   independent integration review and separate operational activation approval.

No activation or approval of operational impersonation is included in this change.
