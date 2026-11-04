# ALSMV2-1050 / UC66-05A — isolated Frontend HTTP integration and recovery

2 November 2026. Branch: `feature/alsmv2-1050-uc66-05a-isolated-integration`.
Base `e1e54ec`: the accepted Project pagination component is unchanged.
Backend companion: `E:/ALSM/ALSM_WEB_BE/docs/engineering/UC66_05A_IMPLEMENTATION_20261102.md`.

## Restricted integration

The existing HTTP adapter is selectable only during actual Vite development serve,
with VITE_SUPPORT_VIEW_HTTP=owned-local-only and a loopback HTTP API URL. Mock mode
is separate; setting mock and HTTP flags together fails closed. Invalid/external
URLs fail closed. Existing staff authentication/profile services and tokenStore
are reused; there is no customer JWT or membership. Read-only UI/scoped controller,
Project pagination, abort/generation guards and uncertainty handling are retained.

Vite defines **UC66_LOCAL_SERVE** from its actual command, development mode and
preview state. It is false for every build, even --mode development plus forced
NODE_ENV=development. Production adapter selection remains unavailable regardless
of flags. Both tracked generated Vite config outputs are synchronized. No Backend
registration is performed by Frontend configuration.

With the owned Backend harness running on 127.0.0.1:3016:

```powershell
$env:VITE_API_BASE_URL = 'http://127.0.0.1:3016/api/v1'
$env:VITE_SUPPORT_VIEW_HTTP = 'owned-local-only'
$env:VITE_SUPPORT_VIEW_MOCK = 'false'
node node_modules/vite/bin/vite.js --config vite.config.ts --host 127.0.0.1 --port 3017 --strictPort
```

Open `http://127.0.0.1:3017/test/integration/uc66-05a.html`. This test-only entry
calls real AuthService login/profile and renders the actual SupportPortalPage and
useAuth hook. It does not inject fake authority, profile cache or a mock adapter.
Synthetic credentials: uc66-05a@example.invalid / Owned-UC66-05A-Only!, valid only in
the disposable Backend test database. The normal production build excludes this
entry. The real app's /support route can use the same restricted dev adapter with
an ordinary already-authenticated staff session. No unrelated auth flow is changed.

## Pure recovery

The optional HTTP adapter method recover calls GET
`/support/organizations/:organizationId/recovery`, with optional original contextId
and operationId (operationId requires contextId). It uses no-store, abort signal,
timeout and skipAuthReplay. It never calls audited context status or replays an
operation. Responses are projected and exact Organisation/context/operation
identities validated. The Backend companion document specifies the full contract.

After reload, staff can search the exact Organisation and select Recover, or enter
the exact Organisation ID in the recovery panel. Original references on uncertainty
are prefilled and retained. Discovery without references returns own-session context
metadata, without claiming an original operation succeeded. COMMITTED requires
durable exact operation evidence; missing evidence remains UNRESOLVED.

Recovery does not automatically resume, Enter, Exit, load Projects or refresh idle
time. Resume recovered context is an explicit local action. It preserves server
remaining absolute/idle deadlines, anchors them conservatively to request start,
and caps guards at 30/15 minutes. Expired/terminal/unresolved contexts cannot resume.
Terminal/expired recovery permits a fresh explicit Enter. Authority loss, disposal
or generation changes discard delayed recovery responses. References and workspace
remain volatile; recovery is bound by the Backend to the real persisted original
session, never inferred from browser-stored authority.

## Verification

Commands, logs and exact counts are in
`E:/ALSM/alsmv2-1050-uc66-05a-evidence-20261102/verification-summary.json`.
New unit/StrictMode tests cover reload, exact references, no replay/status calls,
deadline preservation, in-transit expiry, unresolved outcomes and delayed responses.
The original Project pagination tests remain in the focused regression run.

Real Frontend UI/HTTP integration uses jsdom, real useAuth/profile requests, the
real HTTP adapter, real login, persisted Backend authority/resources/transactions
and an ownership-checked disposable MongoDB. It tests all resource UI flows,
25-Project pagination, Exit, reload recovery and lost Enter acknowledgement with
pure reconciliation and explicit resume. No auth guard or authority source is
mocked in that category. Each selected scenario has its own result file; the
unselected scenario is explicitly skipped, never falsely counted as passed.

```powershell
$env:ALSM_UC66_HTTP_TEST = 'owned-local-only'
$env:VITE_API_BASE_URL = 'http://127.0.0.1:3016/api/v1'
node node_modules/vitest/vitest.mjs run --config test/integration/vitest.uc66.config.ts
# In the owned Backend harness stdin: lose-next-commit
$env:ALSM_UC66_HTTP_SCENARIO = 'lost-enter'
node node_modules/vitest/vitest.mjs run --config test/integration/vitest.uc66.config.ts
```

Production builds with both flags, and forced-development-mode builds, were checked
for unavailable selection and absence of Support HTTP routes and synthetic Project
data. Repository lint is Oxlint. Scoped ESLint uses existing Backend ESLint 9 and a
temporary TypeScript recommended config; it is not full-repository Frontend ESLint.
TypeScript and production build are recorded separately.

Native Chrome E2E was not executed: Computer Use stopped before a UI action because
the current URL could not be established confidently enough for policy enforcement.
The jsdom HTTP tests are not labeled native-browser E2E. No complete whole-repository
suite pass is claimed; existing out-of-scope Sales baseline failures are not fixed
or claimed resolved.

Ready for Hoang's independent isolated QA/Security review. UC66-05B requires native
browser/full app-shell authenticated E2E and independent security verification,
separate Backend production registration/HTTP integration approval, intended-deployment
index/transaction/audit/retention/staff provisioning and concurrency/failure checks,
operational recovery procedures and separate activation approval. No production
registration, operational impersonation or activation is approved here.
