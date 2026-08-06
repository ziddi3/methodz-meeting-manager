# Workspace Home Changelog

## 1.0.0

- Added `index.html` as the static Workspace Home and lifecycle launchpad.
- Added a portable, deterministic, counts-only Workspace Home core.
- Added explicit operator refresh with no business-record reads during page initialization.
- Added aggregate active, completed, archived, upcoming, unscheduled, overdue, unassigned, and needs-scheduling signals.
- Added bounded record and task-list processing with visible truncation warnings.
- Added direct routes to Preparation, Meeting-Day, Decision Register, Meeting Outcomes, Archive Vault, and Verify workflows.
- Preserved the existing PWA identity while moving the installed launch route to Workspace Home.
- Added static service-worker caching for Workspace Home assets and root offline fallback.
- Added responsive presentation with 44-pixel controls.
- Added portable, Chromium, mobile, privacy, malformed-storage, deployment-boundary, architecture, and release coverage.
- Preserved app shell `1.6.12`, meeting-record schema `1.6.0`, browser-local default storage, static deployment, and explicit operator control.
