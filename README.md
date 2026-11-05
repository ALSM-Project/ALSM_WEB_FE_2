# ALSM_WEB_FE_2 — Web 2 / Internal Staff Portal

Standalone React + Vite + TypeScript frontend application for ALSM Internal Staff.

UC66-04 adds the isolated read-only Support Portal at `/support`. It uses the original
staff login; operational customer access remains disconnected. For the synthetic
development preview, set `VITE_SUPPORT_VIEW_MOCK=true` before `npm run dev` and use
an existing Internal Support login. Production builds ignore this preview flag.
See [implementation, contracts and QA handoff](docs/engineering/UC66_04_IMPLEMENTATION_20261102.md).

## Key Features
- **Independent Repository**: Completely uncoupled from Web 1 and Web 3.
- **Single Source of Truth Navigation Architecture**: Shared `NavigationContext` driving runtime Sidebar, dynamic Breadcrumb Header, Live Preview, and Menu Builder.
- **3-Column Menu Builder Workspace**:
  - **Left**: Menu Structure Tree (Search, Expand/Collapse, Reorder, Add Child, Duplicate, Delete Protection)
  - **Center**: Menu Item Properties Editor (Hierarchical Parent Selector with circular dependency validation, Visibility Toggle, Badge)
  - **Right**: Live Preview Panel (Miniature ALSM App Shell & Current Path breadcrumbs)
- **Enterprise Design System**: Dark Navy Sidebar (`#091E42`), Light Enterprise SaaS background (`#F7F9FC`), ALSM Primary Blue (`#0652CC`).

## Running Locally
```bash
npm install
npm run dev
```
Runs on `http://localhost:3002`.
