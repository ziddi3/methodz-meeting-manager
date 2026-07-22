# Manual Test Checklist

Use this checklist after every material change. Release-specific detail is available in:

```text
docs/V1.6-TESTS.md
docs/V1.6.1-RECOVERY-HARDENING.md
docs/V1.6.2-TESTS.md
docs/V1.6.2-VERIFICATION-CONFORMANCE.md
docs/V1.6.3-TESTS.md
```

Current release expectations:

```text
App shell: 1.6.3
Record schema: 1.6.0
Hosted-provider contract: 1.0.0
```

## Open App and Deployment

- [ ] Open `meeting.html` directly in a browser.
- [ ] Confirm the page loads with no visible script error.
- [ ] Confirm logo placeholders appear when image files are missing.
- [ ] Confirm status starts as `Scheduled` and date defaults to today.
- [ ] Confirm governance, signature, retention, templates, directories, attachments, archive, recovery, release, signing, custody, and provider modules initialize.
- [ ] Confirm `window.METHODZ_MEETING_CONFIG.appShellVersion` is `1.6.3`.
- [ ] Confirm `window.METHODZ_MEETING_CONFIG.schemaVersion` is `1.6.0`.
- [ ] Confirm direct-file mode remains usable without service-worker registration.
- [ ] Open through localhost or HTTPS and confirm the optional service worker registers.
- [ ] Confirm the active service-worker cache is `methodz-meeting-manager-v1.6.3`.
- [ ] Confirm ordinary startup makes no record-provider network request.

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

## Save, Edit, and Revision History

- [ ] Save a new record.
- [ ] Confirm saved schema version is `1.6.0`.
- [ ] Confirm governance, consent, retention, redaction, attachment, release, signature, and audit metadata are preserved.
- [ ] Open the record for editing and confirm every field restores.
- [ ] Change a field and save.
- [ ] Confirm the existing record updates instead of duplicating.
- [ ] Open Revision History.
- [ ] Compare revisions.
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
- [ ] Confirm archive, restore, and permanent deletion preserve or remove revisions according to documented policy.

## Hosted-Provider Contract

- [ ] Confirm `window.MethodzHostedProviderContract.version` is `1.0.0`.
- [ ] Confirm `window.MethodzHostedProviderAdapters` exposes the in-memory and localStorage provider constructors.
- [ ] Instantiate the default local provider and run `healthCheck()`.
- [ ] Confirm the health result reports provider ID, contract version, capability metadata, and active/archive counts.
- [ ] Confirm constructing a provider does not write records before an explicit operation.
- [ ] Confirm direct-file mode performs provider operations without a remote endpoint.
- [ ] Create a disposable provider record and retain its returned conflict token.
- [ ] Repeat the same idempotency key and identical input; confirm the accepted result is replayed.
- [ ] Reuse the same idempotency key with different input; confirm `IDEMPOTENCY_CONFLICT`.
- [ ] Update without the current token; confirm non-retryable `CONFLICT`.
- [ ] Update with the current token; confirm provider version and token advance.
- [ ] Confirm unknown existing and new fields survive the update.
- [ ] Confirm the previous record becomes a revision snapshot.
- [ ] Archive the record and confirm it disappears from the active list.
- [ ] Confirm an archived record cannot be updated until restored.
- [ ] Restore the record and confirm revisions remain present.
- [ ] Confirm permanent deletion fails without `{ permanent: true }`.
- [ ] Export the provider workspace and verify package integrity.
- [ ] Modify exported content and confirm integrity verification fails.
- [ ] Insert synthetic EC private JWK `d` material into a disposable provider and confirm export is rejected.
- [ ] Confirm a synthetic `PARTIAL_FAILURE` is marked retryable and preserves safe completion/failure metadata.
- [ ] Run `node tests/v163-provider-conformance.mjs` and confirm both reference providers pass the same suite.
- [ ] Confirm all conformance tests use disposable state and never modify active browser records.

## Attachment Boundary

- [ ] Confirm records store attachment metadata and references only.
- [ ] Confirm `data:` URLs and inline base64 payloads are rejected.
- [ ] Confirm hosted-provider export preserves safe attachment references.
- [ ] Confirm no provider or service-worker path caches binary meeting attachments.

## Retention, Preservation, and Disposition

- [ ] Confirm a default retention policy and review date appear.
- [ ] Switch between two-year, seven-year, permanent, and custom policies.
- [ ] Confirm permanent policy clears the review date.
- [ ] Place a preservation hold with actor and reason.
- [ ] Save and confirm a single placement history event.
- [ ] Save again and confirm no duplicate event.
- [ ] Release the hold with actor and reason.
- [ ] Confirm release metadata and history.
- [ ] Confirm provider round trips preserve retention, holds, disposition, and event-chain metadata.
- [ ] Confirm provider synchronization is not described as approval or authority.

## Partner-Safe and External Export

- [ ] Create a source record containing signatures, internal notes, contact data, tasks, decisions, and an attachment location.
- [ ] Preview Partner Safe and confirm signatures, consent, verification, internal notes, contacts, policy notes, and file locations are absent.
- [ ] Confirm approved operational decisions, tasks, agenda, summary, and safe attachment metadata remain.
- [ ] Confirm every external profile reports `signatureDataIncluded: false`.
- [ ] Confirm external-copy generation never mutates the controlled source record.
- [ ] Confirm recipient allow-lists only remove fields after redaction and never restore removed fields.
- [ ] Confirm inactive or overdue recipient policies cannot be used.
- [ ] Confirm every successful approved external download creates exactly one release receipt.
- [ ] Confirm preview-only actions create no receipt.

## Package Signing and Verification

- [ ] Generate a disposable P-256 signing key.
- [ ] Confirm private JWK material remains in page memory only.
- [ ] Sign a synthetic approved JSON package.
- [ ] Verify it in the main workspace and `verify.html`.
- [ ] Modify payload content and confirm verification fails.
- [ ] Modify displayed signature metadata and confirm verification fails.
- [ ] Confirm public-key ID matches the public JWK.
- [ ] Confirm revoked-key workflow status is visible but is not called organization-wide revocation proof.
- [ ] Confirm private key material is absent from localStorage, provider exports, workspace backups, logs, fixtures, and service-worker caches.

## Key Custody and Rotation

- [ ] Create a planned rotation event.
- [ ] Confirm a completed event requires operator, witness, date, reason, evidence, and all custody confirmations.
- [ ] Confirm invalid dates and same-key rotations are rejected.
- [ ] Export a public custody manifest.
- [ ] Confirm derived public-key IDs recalculate correctly.
- [ ] Confirm private JWK material blocks import and export.
- [ ] Confirm recording an event does not silently change key registry status.

## Workspace Backup, Recovery, and Merge

- [ ] Export a complete workspace backup.
- [ ] Inspect it without writing local data.
- [ ] Confirm package type, checksum, entry count, entry sizes, total size, supported keys, private-key scan, and summary counts are validated.
- [ ] Confirm the readiness report contains metadata only, not meeting values.
- [ ] Run a current-workspace dry recovery drill.
- [ ] Confirm a drill cannot pass without verified integrity.
- [ ] Preview replacement restore and confirm a pre-restore recovery package is created.
- [ ] Test merge with prefer-newest, keep-local, and keep-both strategies.
- [ ] Confirm a pre-merge recovery package is created.
- [ ] Confirm final restore and merge revalidate immediately before mutation.
- [ ] Confirm provider exports preserve recovery-package integrity metadata.

## Migration

- [ ] Seed earlier active, archived, revision, and draft records.
- [ ] Reload and confirm migration to record schema `1.6.0`.
- [ ] Confirm unknown fields remain.
- [ ] Confirm retention, release, signature, and other additive defaults are present where appropriate.
- [ ] Reload again and confirm migration is idempotent.
- [ ] Confirm v1.6.3 introduces no record migration and invents no provider acknowledgement.
- [ ] Inspect `methodzMigrationState`.

## Directories, Tasks, and Indexes

- [ ] Save repeat attendees and organization representatives.
- [ ] Confirm attendee presets never contain signatures.
- [ ] Confirm meeting-time organization snapshots remain stable after directory changes.
- [ ] Confirm saved attachment references appear in the Attachment Index.
- [ ] Confirm missing locations are flagged.
- [ ] Confirm open tasks appear in the task dashboard.
- [ ] Filter tasks and export CSV.

## Draft, Import, and Export

- [ ] Enter an unsaved meeting and wait for auto-save.
- [ ] Refresh and confirm draft restoration.
- [ ] Clear the draft and confirm saved records remain untouched.
- [ ] Download current meeting as TXT and JSON.
- [ ] Export saved record JSON and HTML.
- [ ] Export all records and re-import them.
- [ ] Confirm imported fields survive normalization and migration.
- [ ] Confirm external redacted packages are not mistaken for complete backups.

## Archive Detail, Print, Accessibility, and Mobile

- [ ] Open `archive.html` from an active and archived record.
- [ ] Confirm attendance, consent, governance, retention, hold status, tasks, attachments, and audit data are readable.
- [ ] Print or save PDF and confirm interactive dashboards are hidden.
- [ ] Navigate the complete app using keyboard only.
- [ ] Confirm focus remains visible and dynamic controls have associated labels.
- [ ] Confirm meaningful status changes are announced.
- [ ] Confirm reduced-motion preference is respected.
- [ ] Test phone width and confirm controls stack without horizontal page scrolling.

## Release Blockers

Do not mark a release stable if:

- direct-file mode fails;
- record schema changes unexpectedly from `1.6.0`;
- provider conformance fails for either reference provider;
- a stale or missing conflict token overwrites a record;
- an idempotency key can represent different requests;
- provider archive or revision state is lost;
- provider exports omit integrity metadata or accept tampered content;
- any provider export accepts private key material;
- partial provider success is hidden or mislabeled;
- signatures can save without consent;
- an external copy contains signature or verification data;
- redaction mutates the source record;
- a held record can be permanently deleted;
- migration removes unknown fields;
- restore or merge lacks a valid recovery package;
- local role selection or provider health is described as authentication;
- a checksum or conflict token is described as a digital signature;
- the service worker caches meeting data, attachments, credentials, or private keys.
