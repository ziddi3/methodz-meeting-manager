# Changelog

## 0.9.0

### Added

- `migrations.js` with an ordered, idempotent schema migration registry.
- Active-record, archived-record, revision-snapshot, and draft migration.
- Record validation and migration-run metadata under `methodzMigrationState`.
- `features-v09-archive.js` with archive search, status and organization filters, selection, and bulk JSON export.
- `features-v09-revisions.js` with revision-to-revision and revision-to-current comparison.
- Added, removed, and changed field-path reporting with comparison JSON export.
- `features-v09-workspace-merge.js` with non-destructive workspace package merge.
- Prefer-newest, keep-local, and keep-both merge strategies.
- Automatic pre-merge recovery and merge reporting under `methodzWorkspaceMergeLog`.
- `manifest.webmanifest`, `service-worker.js`, `features-v09-pwa.js`, and an SVG app icon.
- Optional install prompt, hosted offline app-shell cache, and manual cache refresh.
- Playwright browser smoke tests for save, migration, archive, merge helpers, manifest, and service-worker delivery.
- `features-v09.css` and v0.9 release, architecture, and test documentation.

### Changed

- Bumped the configuration schema and app-shell version to `0.9.0`.
- Added migration-state and workspace-merge-log storage keys.
- Loaded the migration registry before the adapter and core app on both HTML entry points.
- Updated GitHub Actions to run static validation and real browser smoke tests.
- Updated the main workspace to load v0.9 archive, revision, merge, and PWA modules.
- Updated README documentation and the roadmap toward v1.0 release hardening.

### Notes

- Direct-file mode remains fully supported.
- Service-worker registration is attempted only when served over HTTPS or localhost.
- The service worker caches static files only and does not store meeting records.
- Workspace merge is separate from complete workspace replacement restore.
- Revision comparison is read-only.
- Archive bulk export does not modify archive contents.
- Playwright is installed only in CI and is not a runtime dependency.

## 0.8.0

### Added

- `features-v08-history.js` for saved revision snapshots, revision preview, revision restore, and the non-destructive Archive Vault.
- `features-v08-workspace.js` for complete workspace backup, checksum validation, restore preview, and pre-restore recovery.
- `adapter-contract-tests.js` for isolated adapter CRUD, export-envelope, and health-check tests.
- `features-v08-accessibility.js` for skip navigation, live status announcements, dynamic field labels, keyboard shortcuts, visible focus, and reduced-motion support.
- `features-v08.css` for revision, archive, backup, test, keyboard-help, focus, mobile, reduced-motion, and print styling.
- Saved-record **Revision History** action.
- Non-destructive saved-record **Archive** action.
- Archive Vault restore, download, and permanent-delete controls.
- Complete Methodz workspace package export and restore.
- Automatic local pre-restore recovery package.
- Adapter capability metadata and adapter contract validation.
- v0.8 release notes, architecture notes, and manual test checklist.

### Changed

- Bumped configuration schema and adapter contract to `0.8.0`.
- Added a configurable 50-revision retention limit.
- Added revision, archive, pre-restore, and accessibility storage keys.
- Replaced the default saved-record destructive action with non-destructive archiving.
- Updated `meeting.html` to load the v0.8 stylesheet and feature modules.
- Updated README and architecture documentation for history, recovery, testing, and accessibility workflows.

### Notes

- Workspace data remains browser-local unless the user exports it.
- Revision and workspace hashes use FNV-1a for identity/integrity checks, not cryptographic signing.
- Adapter contract tests use temporary storage and do not mutate active records.
- Permanent deletion remains available only inside the Archive Vault and requires confirmation.
- The app remains static, offline-first, dependency-free, and deployable without a build step.

## 0.7.0

### Added

- `data-adapter.js` with a stable meeting-record adapter contract.
- `archive.html` and `archive.js` for a dedicated saved-record detail and print page.
- `features-v07-organizations.js` for a reusable Organization / Representative Directory.
- `features-v07-navigation.js` for archive navigation, edit handoff, and adapter integration.
- `features-v07.css` for archive, adapter, organization-directory, mobile, and print styling.
- Saved-record **Archive Page** action.
- Current unsaved meeting archive preview.
- Edit handoff from the archive page back to the main meeting workspace.
- Local adapter health checks and adapter snapshot export.
- Organization directory JSON export/import.
- Meeting-time `organizationDetails` snapshots.
- Stronger print output for attendance, signatures, tasks, attachments, decisions, and record audit metadata.

### Changed

- Bumped configuration schema to `0.7.0`.
- Added the `methodzOrganizationDirectory` storage key.
- Added configurable organization types.
- Routed the main record read/write functions through the active data adapter.
- Updated `meeting.html` to load the v0.7 adapter, styles, and feature modules.
- Updated README and architecture/testing documentation.

### Notes

- The default adapter still uses browser `localStorage`.
- No meeting data is transmitted to a cloud service.
- The archive page is the preferred complete-record print surface.
- The app remains static, offline-first, dependency-free, and deployable without a build step.

## 0.6.0

### Added

- Meeting Numbering Settings.
- Organization Presets and browser-local custom presets.
- Duplicate Record Review and report export.
- Local Sync Readiness panel.
- Local sync queue metadata.
- Sync package JSON export.

### Changed

- Bumped configuration schema to `0.6.0`.
- Added numbering, organization-preset, sync-queue, and last-export storage keys.

### Notes

- Sync readiness is export-only.
- Duplicate Review is advisory and does not merge or delete records automatically.

## 0.5.0

### Added

- Attachment References and cross-meeting Attachment Index.
- Attendee Directory with JSON and CSV export/import.
- Signature Controls and Signature Audit.
- Attachment and signature sections in TXT and HTML exports.

### Changed

- Bumped configuration schema to `0.5.0`.
- Added the attendee-directory storage key and configurable attachment types.

### Notes

- Attachment References store pointers and notes, not binary files.
- Attendee Directory presets do not store signatures.

## 0.4.0

### Added

- Default and custom meeting templates.
- Custom agenda items.
- Safer record import preview.
- Saved-record filters.
- Open Task Dashboard and CSV export.
- Readable saved-record details panel.

### Changed

- Bumped configuration schema to `0.4.0`.
- Continued modular enhancement without adding a build system.

## 0.3.0

### Added

- Structured Decision Log.
- Record Readiness Review.
- Task filters.
- Meeting Minutes Preview.
- HTML meeting-minutes export.
- Structured decisions and readiness checks in TXT output.

### Changed

- Bumped configuration schema to `0.3.0`.
- Kept the app static, offline-first, and dependency-free.

## 0.2.0

### Added

- `config.js` for editable business defaults.
- Auto-rendered brand, organization, agenda, and status options.
- Saved-record search and edit.
- Draft auto-save and restore.
- JSON import/export.
- TXT and JSON record download.
- Storage usage summary.
- Legacy storage-key migration.
- Architecture documentation.

### Changed

- Moved business defaults out of hardcoded HTML.
- Improved mobile controls and saved-record cards.

## 0.1.0

### Added

- Initial static meeting form.
- Attendance sign-on.
- Agenda checklist.
- Notes, decisions, tasks, and summary fields.
- Browser-local record save, view, and delete.
- Print / save PDF.
- TXT record download.
