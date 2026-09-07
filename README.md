# ALSM_WEB_FE_2 — Web 2 / Internal Staff Portal

Standalone React + Vite + TypeScript frontend application for ALSM Internal Staff.

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
