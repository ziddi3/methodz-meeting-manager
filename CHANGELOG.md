# Changelog

## 0.3.0

### Added

- `features-v03.js` as a modular enhancement layer on top of the stable offline core.
- Structured Decision Log with decision text, confirmed-by, date, status, and notes.
- Record Readiness Review panel for required items, warnings, signatures, task assignments, critical tasks, and summary completeness.
- Task filters by search text, progress, and priority.
- Meeting Minutes Preview generated from the current form.
- Polished HTML export for the current meeting.
- Polished HTML export for saved meeting records.
- Structured decisions and readiness checks are included in exported TXT output.
- Print styles for meeting minutes output.

### Changed

- Bumped configuration schema to `0.3.0`.
- Updated README with new workflow features and roadmap.
- Kept the app static, offline-first, and dependency-free.
- Kept responsibility labels as **Assigned To**.

### Notes

- The v0.3 layer deliberately avoids frameworks and build tools.
- The next planned area is editable templates and safer import preview.

## 0.2.0

### Added

- `config.js` for editable brand, organization, agenda, and status defaults.
- Auto-rendered logo placeholders from configuration.
- Auto-rendered organization checklist.
- Auto-rendered agenda checklist from grouped configuration.
- Saved record search.
- Open / edit saved meeting records.
- Draft auto-save and draft restore.
- Clear draft control.
- Export all saved records as JSON.
- Import saved records from JSON.
- Download current meeting as TXT.
- Download current meeting as JSON.
- Download saved record as JSON.
- Storage usage summary.
- More structured record schema with `schemaVersion`, `createdAt`, and `updatedAt`.
- Local storage migration from the original `meetingRecords` key.
- Architecture documentation.

### Changed

- Moved business defaults out of hardcoded HTML and into `config.js`.
- Improved mobile button layout.
- Improved saved record cards with task and agenda counts.
- Improved README with setup, backup, import, export, and roadmap notes.
- Kept task responsibility wording as **Assigned To**.

### Still Offline-First

- No framework added.
- No build step added.
- No server required.
- No external dependency required.

## 0.1.0

### Added

- Initial static meeting form.
- Attendance sign-on.
- Agenda checklist.
- Notes, decisions, tasks, and summary fields.
- Save records to browser local storage.
- View saved records.
- Delete saved records.
- Print / save PDF through browser print.
- Download current record as TXT.
