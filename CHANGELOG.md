# Changelog

## 1.5.0

### Added

- `config-v15.js` with cryptographic package configuration and public-key storage keys.
- `migrations-v15.js` with `externalSignatureControl` record metadata and schema validation.
- `crypto-package-core.js` with portable canonical JSON, ECDSA P-256 signing, SHA-256 digests, JWK import and export, and offline verification.
- `features-v15-crypto.js` with explicit key generation, import, backup, public-key registration, revocation workflow, package signing, verification, and audit export.
- Memory-only private-key handling. Private JWK material is never written to browser storage by the application.
- Browser-local public-key registry containing public keys and lifecycle metadata only.
- Standalone `verify.html` and `verify.js` entry point for verifying signed packages without importing meeting records.
- `features-v15.css`, browser signing tests, a Node Web Crypto self-test, release notes, architecture notes, and a manual checklist.

### Changed

- Bumped the active schema and application shell to `1.5.0`.
- Updated both meeting and archive entry points to load the v1.5 schema migration.
- Updated the service-worker cache to `methodz-meeting-manager-v1.5.0` and cached the standalone verifier.
- Updated older browser tests to expect the current schema while continuing to verify earlier feature-layer versions and migrations.
- Added a PWA shortcut for the standalone signed-package verifier.

### Security notes

- A valid signature proves package integrity relative to a key. It does not independently authenticate the human signer or their authority.
- Verify the public key ID through an independent trusted channel before relying on a signer label.
- Browser-local key revocation and audit entries are workflow aids, not organization-wide or immutable controls.
- Signed packages contain the public key but never the private key.

## 1.4.0

### Added

- Named recipient-specific external-export policies.
- Unique recipient destination IDs.
- Per-recipient redaction-profile limits and maximum field allow-lists.
- Policy status, review dates, verification notes, import, export, and audit export.
- Recipient-policy snapshots in manifests and approval requests.
- Release metadata and recipient-policy audit events after approved downloads.

### Changed

- Applied recipient allow-lists after redaction so recipient policies cannot restore removed fields.
- Stabilized approval fingerprints by excluding volatile preview timestamps.
- Blocked inactive and overdue recipient policies.

## 1.3.0

### Added

- Fingerprint-bound permanent disposition approval.
- Separation of requester and reviewer duties.
- Approval states for pending, approved, rejected, revoked, and consumed requests.
- Preservation event chain with local digest verification and audit export.

### Changed

- Required a matching approval before permanent Archive Vault deletion.
- Preserved active legal-hold protection as the highest-priority disposition block.

## 1.2.0

### Added

- External-release approval requests, approval, rejection, revocation, expiry, and approved-download workflows.
- Source-bound redacted-content fingerprints.
- Destination policy presets.
- Approved JSON and HTML packages with reviewer and integrity metadata.
- Browser-local approval and release audit export.

### Changed

- Gated external JSON and HTML downloads behind matching, unexpired approvals.
- Removed volatile preview timestamps from approval fingerprints.
- Loaded current configuration and migration assets on both HTML entry points.

## 1.1.0

### Added

- Retention policies, review dates, lifecycle status, and preservation holds.
- Legal-hold protection for permanent deletion.
- Partner Safe, Public Summary, and Custom External Copy redaction profiles.
- Redaction manifests and package integrity metadata.
- External-export activity logging.

### Notes

- External exports create separate copies and never mutate the controlled source record.
- Typed signatures and signature-verification details remain excluded from external copies.
- Retention presets are workflow aids, not legal advice.

## 1.0.0

### Added

- Release schema migration and validation.
- Promise-based remote-provider boundary.
- Metadata-only attachment adapter.
- Record classifications and local role context.
- Explicit typed-signature consent and verification metadata.
- Consolidated active and archived record workspace.

### Notes

- Direct-file mode remains supported.
- Local role controls are workflow safeguards, not authentication.
- The default attachment provider stores references only, never binary files.

## 0.9.0

### Added

- Ordered and idempotent schema migration registry.
- Active-record, archived-record, revision, and draft migration.
- Archive search, filters, selection, and bulk export.
- Revision comparison.
- Non-destructive workspace merge with recovery packages.
- Optional PWA shell and hosted offline cache.
- Playwright browser smoke tests.
