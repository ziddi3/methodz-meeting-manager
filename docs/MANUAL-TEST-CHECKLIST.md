# Manual Test Checklist

Use this checklist after every material change. Release-specific detail is available in:

```text
docs/V1.6-TESTS.md
docs/V1.6.1-RECOVERY-HARDENING.md
docs/V1.6.2-VERIFICATION-CONFORMANCE.md
docs/V1.6.3-TESTS.md
docs/V1.6.4-TESTS.md
docs/V1.6.5-TESTS.md
docs/V1.6.6-TESTS.md
docs/V1.6.7-TESTS.md
docs/V1.6.8-TESTS.md
docs/V1.6.9-TESTS.md
```

Current release expectations:

```text
App shell:                   1.6.9
Record schema:               1.6.0
Hosted-provider contract:    1.0.0
Transfer rehearsal package:  1.0.0
Transfer acceptance report:  1.0.0
```

## Product and Deployment Boundary

- [ ] Confirm this repository remains a task-focused meeting preparation, capture, analysis, archive, and records tool.
- [ ] Confirm no documentation or deployment config reclassifies it as Method Hub, Nexus Hub, a storefront, a business container, the Cathedral, or a Cathedral wing.
- [ ] Confirm no deployment target uses `hub.methodz.ca`.
- [ ] Open `meeting.html` directly and confirm core meeting workflows load.
- [ ] Confirm logo placeholders appear when image files are missing.
- [ ] Confirm status starts as `Scheduled` and date defaults to today.
- [ ] Confirm `window.METHODZ_MEETING_CONFIG.appShellVersion` is `1.6.9`.
- [ ] Confirm `window.METHODZ_MEETING_CONFIG.schemaVersion` is `1.6.0`.
- [ ] Confirm direct-file mode remains usable without service-worker registration.
- [ ] Open through localhost or HTTPS and confirm the optional service worker registers.
- [ ] Confirm the active cache is `methodz-meeting-manager-v1.6.9`.
- [ ] Confirm ordinary startup makes no production-provider network request.
- [ ] Confirm the service worker has no background sync, transfer, acceptance, rollback, or queue-processing handler.

## Meeting Form

- [ ] Enter meeting title, status, date, location, and facilitator.
- [ ] Select Organizations / Representatives Present.
- [ ] Add at least two attendees.
- [ ] Add typed signatures and explicit consent.
- [ ] Confirm a typed signature without consent cannot save.
- [ ] Check agenda items.
- [ ] Enter free-form and structured decisions.
- [ ] Add follow-up tasks and confirm responsibility says `Assigned To`.
- [ ] Add a meeting summary and attachment references.
- [ ] Select classification, policy, protected fields, and review status.

## Meeting-Day Mode

- [ ] Enter Meeting-Day Mode from the quick actions and sticky control card.
- [ ] Confirm the direct meeting sections remain visible in workflow order.
- [ ] Confirm governance, provider, recovery, synchronization, transfer, archive, and diagnostics cards are hidden.
- [ ] Press **Show Supporting Panels** and confirm all hidden tools become available.
- [ ] Navigate through Info, Organizations, Attendance, Agenda, Notes, Decisions, Tasks, Summary, and Save.
- [ ] Confirm the selected section receives keyboard focus.
- [ ] Confirm navigation remains horizontally scrollable at phone width.
- [ ] Reload and confirm mode and last-section preferences restore.
- [ ] Press `Alt+M` and confirm the mode toggles.
- [ ] Exit Meeting-Day Mode and confirm the complete workspace returns.

## Save, Edit, and Revision History

- [ ] Save a new record.
- [ ] Confirm saved schema version is `1.6.0`.
- [ ] Confirm governance, consent, retention, redaction, attachment, release, signature, and audit metadata are preserved.
- [ ] Open the record for editing and confirm every field restores.
- [ ] Change a field and save.
- [ ] Confirm the existing record updates instead of duplicating.
- [ ] Open Revision History and compare revisions.
- [ ] Restore an older revision.
- [ ] Confirm the current state was preserved before restoration.
- [ ] Confirm unknown extension fields survive save and edit cycles.

## Archive Vault

- [ ] Archive a normal active record.
- [ ] Search and filter the archive.
- [ ] Export selected or filtered records.
- [ ] Restore a record.
- [ ] Confirm an active-record ID conflict does not overwrite either record.
- [ ] Confirm permanent deletion requires separate confirmation and approved disposition metadata.
- [ ] Confirm a held record cannot be permanently deleted.
- [ ] Confirm archive, restore, and permanent deletion preserve or remove revisions according to policy.

## Hosted-Provider Contract

- [ ] Confirm `window.MethodzHostedProviderContract.version` is `1.0.0`.
- [ ] Confirm the in-memory and Storage-compatible local provider constructors are available.
- [ ] Instantiate a disposable local provider and run `healthCheck()`.
- [ ] Confirm construction does not write records before an explicit operation.
- [ ] Create a disposable provider record and retain its conflict token.
- [ ] Replay an identical idempotency key and confirm the original result returns.
- [ ] Reuse the key with different input and confirm `IDEMPOTENCY_CONFLICT`.
- [ ] Update without the current token and confirm non-retryable `CONFLICT`.
- [ ] Update with the current token and confirm version and token advance.
- [ ] Confirm unknown fields and revisions survive.
- [ ] Archive, restore, and permanently delete only with explicit permanent intent.
- [ ] Export and verify provider integrity.
- [ ] Tamper with exported content and confirm verification fails.
- [ ] Insert synthetic private JWK material and confirm export fails closed.
- [ ] Confirm retryable partial failure exposes only safe operational metadata.

## Synchronization Rehearsal and Queue Portability

- [ ] Create a disposable tenant queue.
- [ ] Enqueue push and pull operations explicitly.
- [ ] Process, retry, discard, and reconnect without silent background work.
- [ ] Create an uncertain-write scenario and reconcile through idempotency.
- [ ] Create a local/remote conflict and review all available resolution paths.
- [ ] Export the queue package and metadata-only operator evidence.
- [ ] Inspect imported queue data without writing.
- [ ] Confirm explicit approval is required before queue replacement.
- [ ] Confirm imported entries remain unprocessed until **Process** is pressed.
- [ ] Confirm tenant binding and checksums fail closed when modified.

## Device Readiness

- [ ] Run Device Readiness on desktop, tablet, Android, and iOS where available.
- [ ] Confirm storage write access is reported.
- [ ] Confirm quota, persistent-storage, Web Crypto, network, service-worker, and viewport states are reported.
- [ ] Confirm reports contain aggregate metadata only.
- [ ] Confirm a Ready result is not described as proof of backup or recovery.
- [ ] Confirm phone controls meet touch-target and font-size expectations.
- [ ] Confirm no page-level horizontal overflow at 390-pixel width.

## Cross-Device Transfer Rehearsal

### Source

- [ ] Save all meeting work.
- [ ] Keep private signing keys separate.
- [ ] Run Device Readiness.
- [ ] Build and download the transfer bundle.
- [ ] Store it off-device.
- [ ] Keep the source workspace unchanged until destination acceptance completes.

### Destination

- [ ] Run Device Readiness in a separate browser profile.
- [ ] Choose the transfer bundle.
- [ ] Confirm transfer, workspace, queue, evidence, and readiness integrity verify.
- [ ] Confirm collision references are opaque and counts are readable.
- [ ] Run the no-write recovery drill.
- [ ] Review add, replace, unchanged, remove, and ignored counts.
- [ ] Complete every destination confirmation.
- [ ] Type `TRANSFER` and approve the final dialog.
- [ ] Confirm a pre-import recovery package is created.
- [ ] Confirm staged writes are read back and verified.
- [ ] Reload only after success is reported.

## Post-Transfer Acceptance

- [ ] Run **Post-Transfer Acceptance** after destination reload.
- [ ] Confirm active-record count matches the transfer report.
- [ ] Confirm Archive Vault count matches.
- [ ] Confirm revision-group count matches.
- [ ] Confirm tenant queue count matches.
- [ ] Review attendee and organization directories.
- [ ] Review meeting templates.
- [ ] Review governance, retention, release, approval, redaction, and policy metadata.
- [ ] Review public verification keys and custody records.
- [ ] Review recovery and drill logs.
- [ ] Confirm malformed data or a required count mismatch blocks acceptance.
- [ ] Confirm the pre-import recovery package checksum verifies.
- [ ] Check every operator review box.
- [ ] Confirm the recovery package will be retained.
- [ ] Type `ACCEPT` and record acceptance.
- [ ] Export the acceptance report.
- [ ] Confirm it contains no meeting content, record IDs, attendee names, signatures, credentials, private keys, or storage-key names.

## Rollback Rehearsal

- [ ] Preview rollback without writing.
- [ ] Confirm the pre-import package checksum verifies.
- [ ] Review add, replace, unchanged, remove, and ignored counts.
- [ ] Confirm current workspace records remain unchanged after preview.
- [ ] Confirm understanding of the replacement operation.
- [ ] Type `ROLLBACK`.
- [ ] Approve the final confirmation.
- [ ] Confirm the current transferred workspace is saved as a pre-rollback recovery package.
- [ ] Confirm the pre-import destination snapshot is restored.
- [ ] Confirm required removals and writes are verified.
- [ ] Confirm rollback evidence contains aggregate metadata only.
- [ ] Inject a disposable write failure and confirm the transferred snapshot is restored and verified.
- [ ] Download both recovery packages before closing a real rehearsal.

## Large-Workspace Diagnostics

- [ ] Run diagnostics with a small workspace.
- [ ] Confirm recognized entry count, total bytes, largest-entry bytes, parse errors, record counts, size buckets, scan duration, and quota ratio appear.
- [ ] Confirm largest-entry key name is not exposed.
- [ ] Confirm no meeting values, raw IDs, attendee names, signatures, credentials, or private keys appear.
- [ ] Create disposable entries above warning and critical thresholds and confirm status changes.
- [ ] Confirm diagnostics remain responsive and do not mutate workspace values.

## Attachment Boundary

- [ ] Confirm records store attachment metadata and references only.
- [ ] Confirm `data:` URLs and inline base64 payloads are rejected.
- [ ] Confirm provider and transfer packages preserve safe references.
- [ ] Confirm no provider or service-worker path caches binary meeting attachments.

## Retention, Preservation, and Disposition

- [ ] Confirm a default retention policy and review date appear.
- [ ] Switch between two-year, seven-year, permanent, and custom policies.
- [ ] Confirm permanent policy clears the review date.
- [ ] Place and release a preservation hold with actor and reason.
- [ ] Confirm event history does not duplicate on repeated saves.
- [ ] Confirm active holds block permanent disposition.
- [ ] Confirm provider, backup, and transfer round trips preserve retention and hold metadata.

## Partner-Safe and External Export

- [ ] Create a source record containing signatures, internal notes, contact data, tasks, decisions, and an attachment location.
- [ ] Preview Partner Safe and confirm signatures, consent, verification, internal notes, contacts, policy notes, and file locations are absent.
- [ ] Confirm approved operational decisions, tasks, agenda, summary, and safe attachment metadata remain.
- [ ] Confirm every external profile reports `signatureDataIncluded: false`.
- [ ] Confirm external-copy generation never mutates the controlled source record.
- [ ] Confirm recipient allow-lists only remove fields after redaction.
- [ ] Confirm inactive or overdue recipient policies cannot be used.
- [ ] Confirm every successful approved download creates exactly one release receipt.

## Signing, Verification, and Custody

- [ ] Generate a disposable P-256 signing key.
- [ ] Confirm private JWK material remains in page memory only.
- [ ] Sign and verify a synthetic approved JSON package in the main workspace and `verify.html`.
- [ ] Modify payload and displayed signature metadata and confirm verification fails.
- [ ] Confirm public-key ID matches the public JWK.
- [ ] Create rotation, revocation, lost-key, and recovery-rehearsal custody events.
- [ ] Confirm completed events require operator, witness, date, reason, evidence, and custody confirmations.
- [ ] Confirm invalid dates and same-key rotations are rejected.
- [ ] Confirm recording a custody event does not silently change key registry state.
- [ ] Confirm private keys are absent from storage, provider exports, workspace packages, transfer bundles, reports, fixtures, and service-worker caches.

## Workspace Backup, Recovery, and Merge

- [ ] Export a complete workspace backup.
- [ ] Inspect it without writing.
- [ ] Confirm package type, checksum, entry count, entry sizes, total size, supported keys, private-key scan, and summary counts are validated.
- [ ] Run a current-workspace dry recovery drill.
- [ ] Confirm a drill cannot pass without verified integrity.
- [ ] Preview replacement restore and confirm a pre-restore recovery package is created.
- [ ] Test prefer-newest, keep-local, and keep-both merge strategies.
- [ ] Confirm a pre-merge recovery package is created.
- [ ] Confirm final restore and merge revalidate immediately before mutation.

## Migration

- [ ] Seed earlier active, archived, revision, and draft records.
- [ ] Reload and confirm migration to schema `1.6.0`.
- [ ] Confirm unknown fields remain.
- [ ] Reload again and confirm migration is idempotent.
- [ ] Confirm v1.6.9 adds no record migration and invents no transfer acceptance or rollback result.
- [ ] Inspect `methodzMigrationState`.

## Draft, Import, Export, Archive Detail, and Accessibility

- [ ] Enter an unsaved meeting and confirm draft restoration after refresh.
- [ ] Clear the draft and confirm saved records remain.
- [ ] Download current meeting as TXT and JSON.
- [ ] Export saved records as JSON and HTML.
- [ ] Export all records and re-import them.
- [ ] Confirm external redacted packages are not mistaken for complete backups.
- [ ] Open `archive.html` from active and archived records.
- [ ] Print or save PDF and confirm interactive infrastructure is hidden.
- [ ] Navigate the full app using keyboard only.
- [ ] Confirm focus remains visible and dynamic controls have labels.
- [ ] Confirm meaningful status changes are announced.
- [ ] Confirm reduced-motion preference is respected.

## Release Blockers

Do not mark a release stable if:

- direct-file core meeting operation fails;
- app shell is not `1.6.9` or record schema changes from `1.6.0`;
- product classification drifts or deployment targets `hub.methodz.ca`;
- provider, recovery, custody, signing, synchronization, transfer, acceptance, rollback, or browser tests fail;
- a stale conflict token overwrites a record;
- an idempotency key can represent different requests;
- archive or revision state is lost;
- any package accepts tampered content or private key material;
- signatures save without consent;
- external copies contain signature or verification data;
- redaction mutates the source record;
- a held record can be permanently deleted;
- migration removes unknown fields;
- restore, merge, transfer, or rollback lacks a verified recovery package;
- acceptance can pass with a required count mismatch;
- rollback occurs without typed approval and final confirmation;
- metadata-only reports expose meeting values, raw IDs, attendee names, signatures, credentials, private keys, or storage-key names;
- local role selection, provider health, checksums, conflict tokens, or browser-local evidence are described as authentication, identity, delivery, authority, or legal approval;
- the service worker caches meeting data or performs background queue, transfer, acceptance, or rollback work.
