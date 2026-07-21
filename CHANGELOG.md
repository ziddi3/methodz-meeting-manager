# Changelog

Release-specific notes, architecture details, and test plans are retained under `docs/`.

## 1.6.2

### Added

- Portable `key-custody-core.js` public custody-manifest boundary.
- Browser workspace for rotation, revocation, lost-key response, and recovery-rehearsal evidence.
- Public custody-manifest and custody-audit exports.
- Operator, witness, effective-date, reason, and checklist controls for completed events.
- Derived-key-ID, event-reference, same-key rotation, invalid-date, and private-JWK validation.
- Node and Playwright custody regression coverage.
- Key custody architecture, release, test, and operator documentation.

### Changed

- App-shell and service-worker cache version are now `1.6.2`; the meeting-record schema remains `1.6.0`.
- Public key custody metadata is stored separately from the v1.6 public-key registry.
- CI validates custody files, app-shell wiring, the portable core, and browser ceremonies.

### Security notes

- Custody storage and exports reject private JWK material.
- Recording an event never silently changes registry revocation state.
- Public-key IDs must be confirmed through an independent trusted channel.
- Browser-local custody events are process evidence, not immutable proof of identity, authority, approval, or delivery.

## 1.6.1

### Added

- Shared `workspace-package-core.js` validation and restore-planning boundary for browser and Node environments.
- No-write Recovery Readiness panel for backup inspection and replacement-plan previews.
- Current-workspace dry recovery drills with metadata-only browser-local history.
- Downloadable readiness reports that exclude meeting and workspace values.
- Final validation guards for the existing full-restore and workspace-merge apply paths.
- Private JWK detection inside parsed workspace storage entries.
- Entry-count, per-entry-size, and total-package-size limits.
- Node and Playwright regression coverage for recovery planning, tampering, private-key rejection, guards, and drill logs.
- `docs/V1.6.1-RECOVERY-HARDENING.md` operational and architectural guidance.

### Changed

- App-shell and service-worker cache version are now `1.6.1`; the meeting-record schema remains `1.6.0`.
- Workspace imports are revalidated immediately before any local-storage mutation.
- Recovery drills now provide repeatable evidence that the current workspace can be packaged, verified, and planned for restore.
- CI validates the recovery core and complete recovery app-shell wiring.

### Security notes

- Workspace packages containing private JWK material are blocked from restore and merge.
- The readiness report contains storage key names and validation metadata only, not record values.
- Recovery drills do not replace protected off-device backups or separate private-key custody.

## 1.6.0

### Added

- Optional ECDSA P-256 / SHA-256 signatures for exported JSON packages.
- Canonical package and displayed signature-metadata binding.
- Explicit private and public JWK import and export.
- Memory-only private-key handling with an explicit sensitive backup download.
- Browser-local public-key registry with Active and Revoked workflow states.
- Private-key-material rejection and registry sanitation.
- Standalone `verify.html` signed-package verifier.
- Signing, verification, key-lifecycle, and public-registry audit exports.
- `externalSignatureControl` metadata on current-schema meeting records.
- `config-v16.js`, `migrations-v16.js`, `crypto-package-core.js`, `features-v16-crypto.js`, `features-v16-record-metadata.js`, and `features-v16.css`.
- Node Web Crypto self-test and Playwright payload-tamper, metadata-tamper, key-safety, migration, and verifier coverage.

### Changed

- Active schema and app-shell version are now `1.6.0`.
- Main and archive entry points load the v1.6 configuration and migration layers.
- The application manifest exposes the standalone verifier as an app shortcut.
- Service-worker cache and CI validation include the complete v1.6 shell.
- Core and v1.5 regression tests assert the current schema while preserving earlier feature APIs.
- README and release documentation now define the cryptographic trust and key-custody boundaries.

### Security notes

- Private keys are never written to browser storage, signed packages, public-key exports, verification reports, or workspace backups.
- A valid package signature proves integrity relative to a key. It does not independently prove human identity, authority, recipient identity, approval legitimacy, delivery, or legal compliance.
- Browser-local key revocation is workflow metadata, not an organization-wide revocation service.
- Existing redaction, recipient policy, approval, release receipt, retention, preservation, and disposition controls remain required.

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
