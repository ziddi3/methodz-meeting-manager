# Meeting Run Sheet Changelog

## 2026-08-03

### Added

- portable `meeting-run-sheet-core.js` version `1.0.0`;
- explicit **Preview Run Sheet** action on Meeting Preparation Brief cards;
- protected single-meeting preview with readiness gaps, organizations, attendee setup, agenda, and bounded carryover work;
- explicit print and close controls;
- visible fail-closed behavior for missing records and malformed storage;
- responsive and print-specific styling;
- portable, static, and Chromium rehearsal coverage;
- architecture, privacy, test, and deployment documentation.

### Preserved

- app shell `1.6.12`;
- meeting-record schema `1.6.0`;
- static deployment and direct browser use;
- browser-local storage as the default provider;
- explicit operator control;
- no automatic saves, assignments, completion, reminders, archive actions, transfers, provider calls, delivery, or synchronization;
- no deployment over `hub.methodz.ca`.

### Roadmap continuation

The next 1.x work should continue improving preparation and meeting-day ergonomics using explicit, reversible operator actions. Hosted-provider, calendar, CRM, and AI-assisted workflows remain 2.0 candidates and require separate approval and evidence gates.
