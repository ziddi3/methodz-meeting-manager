# Changelog

Release-specific notes, architecture details, and test plans are retained under `docs/`.

## 1.6.6

### Added

- Metadata-only Device Readiness workspace for browser storage, quota, persistence, service worker, Web Crypto, network state, viewport fit, and local workspace counts.
- Explicit persistent-storage request, readiness-report download, and cross-device transfer checklist actions.
- Phone-only Save, New, Records, and Device action dock.
- Safe-area support, 44-pixel touch targets, 16-pixel mobile inputs, single-column narrow layouts, and page-level overflow hardening.
- Dedicated Chromium phone-viewport Playwright coverage and Mobile Readiness workflow.
- v1.6.6 architecture and manual test documentation.

### Changed

- App-shell and service-worker cache version are now `1.6.6`; the meeting-record schema remains `1.6.0`.
- The primary workspace description returns focus to meeting preparation, capture, assignment, summary, archive, and safe transfer.
- README was consolidated around current product purpose, deployment, recovery, provider, signing, and mobile boundaries.
- The manifest now includes a Device Readiness shortcut.

### Security and privacy notes

- Readiness reports exclude meeting content, record IDs, attendee names, signatures, credentials, and key material.
- Persistent storage is requested only through explicit user action.
- Device readiness does not prove that a protected backup exists or that recovery will succeed.
- No production endpoint, credential, framework, server, build step, or schema migration is introduced.

## 1.6.5

### Added

- Durable browser-local push and pull rehearsal queues.
- Explicit offline, reconnect, preview, process, retry, and discard controls.
- Tenant-scoped disposable remote rehearsal state.
- Idempotent uncertain-write recovery and remote-token conflict detection.
- Three-way conflict previews with Accept Remote, Keep Local, and Rebase & Push resolutions.
- Queue recovery after reload and metadata-only rehearsal reports.
- Dedicated Offline Synchronization Rehearsal GitHub Actions coverage.

### Changed

- App-shell and service-worker cache version advanced to `1.6.5`; the meeting-record schema remained `1.6.0`.
- Synchronization remained an explicit rehearsal and did not change the default browser-local provider.

### Security notes

- No production endpoint, credential, silent background synchronization, framework, server, or schema migration was introduced.
- Rehearsal queues reject recognized private-key and credential material.
- Synchronization metadata does not create approval, authority, identity, or delivery proof.

## 1.6.4

### Added

- Disposable `http-provider-pilot.js` serialized HTTP-style simulator and client adapter.
- Complete v1.6.3 provider conformance execution across a JSON request/response boundary.
- One-shot rate-limit, unavailable, delay, dropped-response, and partial-success fault injection.
- Retry and uncertain-write tests using tenant-scoped idempotent replay.
- Serialized preservation tests for revisions, attachment references, unknown fields, governance metadata, release receipts, signatures, custody, and recovery metadata.
- Sanitized process-local diagnostics that omit meeting content, record IDs, credentials, tokens, signatures, private JWK material, request bodies, and response bodies.
- Independent Hosted Provider Pilot GitHub Actions workflow.
- Production hosted-provider evidence checklist for authentication, authorization, tenant isolation, encryption, audit, backup, recovery, residency, and incident response.
- v1.6.4 architecture and test documentation.

### Changed

- App-shell and service-worker cache version are now `1.6.4`; the meeting-record schema remains `1.6.0`.
- `meeting.html` and `archive.html` load `config-v164.js` after the v1.6.3 configuration layer.
- The roadmap now advances from direct provider conformance to explicit hosted-provider evidence and synchronization rehearsals.

### Security notes

- No production endpoint, credential, backend, framework, runtime package, or schema migration is introduced.
- Passing transport tests does not certify authentication, authorization, durable audit, data residency, incident response, or legal compliance.
- The offline localStorage provider remains the default application provider.

## 1.6.3

### Added

- Portable `provider-contract.js` hosted-provider contract core.
- Disposable in-memory and Storage-compatible local reference providers.
- Deterministic conflict tokens and idempotent write replay.
- Promise-based list, get, upsert, archive, restore, permanent-delete, export, and health operations.
- Structured provider errors with explicit retryability metadata.
- Provider exports that preserve active records, archives, revisions, unknown fields, and integrity metadata.
- Private-JWK and private-key-field rejection from provider exports.
- One reusable conformance suite executed against both reference providers.
- Dedicated provider-conformance CI isolated from browser regression jobs.
- v1.6.3 contract, architecture, test, and security-boundary documentation.

### Changed

- App-shell and service-worker cache version are now `1.6.3`; the meeting-record schema remains `1.6.0`.
- The main entry point exposes the hosted-provider contract and reference adapters without changing the active browser-local workflow.
- README and Copilot guidance distinguish client contract compatibility from server-side authentication, authorization, tenant isolation, encryption, durable audit, and legal compliance.

### Security notes

- Hosted-provider exports fail closed when private key material is detected.
- Conflict tokens and compatibility checksums are not digital signatures or identity proof.
- Passing provider conformance does not certify production security, durability, data residency, or legal compliance.
- No backend, endpoint, token, credential, runtime dependency, or schema migration is introduced.

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
