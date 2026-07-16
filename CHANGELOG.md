# Changelog

Release-specific notes, architecture details, and test plans are retained under `docs/`.

## 1.5.0

### Added

- Recipient-policy stewardship, accountable roles, risk tiers, business purpose, and review cadence.
- Policy review queue with overdue, due-soon, no-date, current, and inactive states.
- Governance-version binding in external export fingerprints.
- Chained local release receipts for approved JSON and HTML downloads.
- Receipt search, verification, individual download, and ledger export.
- Latest receipt references on active and archived source records.
- `config-v15.js`, `migrations-v15.js`, `features-v15-policy-operations.js`, `features-v15-download-routing.js`, and `features-v15.css`.
- v1.5 Playwright coverage and release documentation.

### Changed

- Active schema and app-shell version are now `1.5.0`.
- Every external-download control routes through the approved release and receipt workflow.
- Main and archive entry points load the v1.5 schema and migration.
- Service-worker cache and GitHub Actions checks include v1.5 assets.
- Older browser regression tests now assert the current schema while preserving version-specific APIs.
- README and core architecture documentation were consolidated around the current system.

### Notes

- Policy reviews and receipts are browser-local workflow records, not authenticated identity or delivery proof.
- Receipt chaining uses FNV-1a-32 for direct-file-compatible change detection, not cryptographic signing.
- Direct-file mode remains supported with no runtime dependencies.

## 1.4.0

### Added

- Named recipient-specific export policies.
- Dynamic destinations in the form `recipient:<policy-id>`.
- Allowed redaction profiles and maximum field groups per recipient.
- Policy status, review date, verification notes, import/export, and policy audit.
- Recipient policy snapshots in export manifests and approval requests.

### Changed

- Recipient allow-lists are enforced after profile redaction.
- Approval fingerprints are bound to recipient-specific destinations.
- Approved downloads update source-record recipient policy metadata.

## 1.3.0

### Added

- Archived-record disposition requests and independent review.
- Authorized reviewer-role gates and requester/reviewer separation.
- Fingerprint-bound disposition approval and approval consumption.
- Preservation-event chain verification and export.

### Changed

- Permanent Archive Vault removal requires matching approved disposition metadata.
- Active preservation holds block disposition approval and deletion.

## 1.2.0

### Added

- External release approval requests, approval expiry, rejection, and revocation.
- Destination policies for internal partners, public release, and other recipients.
- Source-bound redacted-content fingerprints.
- Approved JSON and HTML packages with reviewer sign-off and integrity metadata.
- Browser-local approval and release audit export.

### Changed

- External downloads require a matching current approval.
- Volatile preview timestamps are excluded from approval fingerprints.

## 1.1.0

### Added

- Retention presets, lifecycle status, review dates, preservation holds, and hold history.
- Partner Safe, Public Summary, and Custom External Copy profiles.
- Redaction manifests and external-export activity logs.
- SHA-256 package integrity with a labeled compatibility fallback.

### Changed

- Typed signatures and verification details are excluded from every external copy.
- Active holds prevent permanent Archive Vault deletion.

## 1.0.0

### Added

- Record classification and role-aware workflow controls.
- Explicit typed-signature consent and verification metadata.
- Promise-based record-provider contract.
- Metadata-only attachment-provider contract.
- Consolidated records workspace and release validation.

## 0.9.0

### Added

- Ordered schema migration registry.
- Archive filtering and bulk export.
- Revision comparison.
- Non-destructive workspace merge with recovery packages.
- Optional PWA shell and Playwright browser testing.

## 0.8.0

### Added

- Revision snapshots, restore, and non-destructive Archive Vault.
- Complete workspace backup and replacement restore.
- Adapter contract tests, keyboard navigation, focus improvements, and reduced-motion support.

## 0.7.0

### Added

- Stable synchronous data adapter.
- Dedicated archive detail and print page.
- Organization / Representative Directory and historical organization snapshots.

## 0.6.0

### Added

- Numbering settings, organization presets, duplicate review, sync readiness, and export-only sync packages.

## 0.5.0

### Added

- Attachment references and cross-meeting attachment index.
- Attendee directory, signature controls, and signature audit.

## 0.4.0

### Added

- Default and custom templates, custom agenda items, safer import preview, record filters, and open-task dashboard.

## 0.3.0

### Added

- Structured decision log, readiness review, task filters, meeting-minutes preview, and HTML export.

## 0.2.0

### Added

- Editable configuration, dynamic business defaults, record search/edit, draft restore, JSON import/export, and storage summary.

## 0.1.0

### Added

- Initial static meeting form, attendance, agenda, notes, decisions, tasks, local save, printing, and text export.
