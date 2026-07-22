# GitHub Copilot Instructions | Methodz Meeting Manager

## Project identity

Methodz Meeting Manager is an offline-first meeting-record application for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations.

Methodz is a shared brand identity and operating ecosystem, not a separate company. Never describe it as a company unless the repository owner explicitly changes that instruction.

## Deployment contract

Maintain the application with:

- semantic HTML5;
- CSS3;
- vanilla JavaScript;
- browser `localStorage` for the default provider;
- no runtime framework;
- no required build command;
- no required network connection.

The core workflow must continue to run by opening `meeting.html` directly. Hosted PWA support is optional and may activate only on HTTPS or localhost. CI-only testing dependencies are allowed when they do not enter the deployed application.

## Current release architecture

- `meeting.html`: main meeting workspace.
- `archive.html`: complete-record detail and print surface.
- `verify.html`: standalone signed-package verifier.
- `config.js`, `config-v11.js` through `config-v16.js`, `config-v162.js`, `config-v163.js`: ordered configuration extensions.
- `migrations.js`, `migrations-v10.js` through `migrations-v16.js`: ordered schema migration registry and extensions.
- `data-adapter.js`: synchronous browser-local meeting-record provider.
- `async-data-adapter.js`: legacy Promise wrapper preserved for compatibility.
- `provider-contract.js`: portable v1.6.3 hosted-provider contract core.
- `hosted-provider-adapters.js`: disposable in-memory and localStorage reference providers.
- `provider-conformance.js`: reusable provider test suite.
- `attachment-adapter.js`: attachment-reference provider contract.
- `crypto-package-core.js`, `key-custody-core.js`, `workspace-package-core.js`: portable integrity, custody, and recovery boundaries.
- `app.js`: stable core form and local record workflow.
- `features-v03*` through `features-v16*`, recovery guards, and v1.6.2 custody: additive enhancement layers.
- `archive.js`, `archive-v10.js`, `archive-v11.js`, and `archive-v13.js`: archive rendering and governance detail.
- `manifest.webmanifest` and `service-worker.js`: optional static app shell.
- `tests/`: CI-only Node and Playwright coverage.

Preserve script order. Later feature layers intentionally wrap functions installed by earlier layers.

`config-v163.js` must load after `config-v162.js`. `provider-contract.js` must load before `hosted-provider-adapters.js`. Neither module may require a network connection or mutate records during startup.

## Required product capabilities

Preserve:

- meeting information and status;
- Organizations / Representatives Present;
- attendance and meeting-specific typed signatures;
- explicit electronic-signature consent and verification metadata;
- agenda, notes, decisions, tasks, and meeting summary;
- Assigned To, priority, due date, and task status;
- templates and custom agenda items;
- attendee and organization directories;
- attachment references and attachment index;
- draft auto-save and restore;
- active-record search and edit;
- non-destructive Archive Vault;
- dedicated archive page and print output;
- revision history, comparison, and restore;
- workspace backup, replacement restore, and merge recovery;
- ordered schema migration;
- record classification and workflow policies;
- provider health checks and provider conformance boundaries;
- retention policies and preservation holds;
- partner-safe, public-summary, and custom external-copy profiles;
- redaction manifests and integrity labeling;
- fingerprint-bound external-export approvals;
- separate requester and reviewer roles;
- disposition approval and preservation event-chain verification;
- recipient-specific destination policies and field allow-lists;
- policy stewardship, review cadence, and review queue;
- release receipt creation, verification, search, and export;
- optional package signing and independent verification;
- public-key custody, rotation, revocation, lost-key, and rehearsal evidence;
- no-write backup inspection and dry recovery drills;
- keyboard navigation and accessibility support;
- optional hosted offline app shell.

## Terminology

Use:

- Organizations / Representatives Present
- Meeting Facilitator
- Follow-Up Tasks
- Assigned To
- Methodz Brand Mark
- Canadian Soft Water Corporation
- Method HVAC Inc.
- Partner-Safe Export
- Preservation Hold or Legal Hold
- Controlled Source Record
- Redacted External Copy
- Recipient-Specific Export Policy
- Policy Steward
- External Release Receipt
- Hosted-Provider Contract
- Conflict Token
- Idempotency Key

Avoid:

- Owner for task responsibility;
- Methodz company;
- Company logo for Methodz;
- calling a checksum or conflict token a digital signature;
- claiming a local role proves identity;
- claiming a recipient policy proves recipient identity;
- claiming a release receipt proves delivery;
- claiming a provider health check proves authentication or durability;
- claiming provider conformance proves production security or legal compliance;
- claiming a retention preset is legal advice.

## Governance rules

Local role, approval, recipient-policy, policy-review, release-receipt, custody, and disposition controls are workflow safeguards, not authentication.

- Preserve access-control, retention, hold, redaction, approval, recipient, receipt, custody, recovery, and disposition metadata.
- Do not bypass edit, export, hold, approval, review, receipt, signature, recovery, or disposition gates without an explicit replacement policy.
- Keep archive records non-destructive by default.
- External-copy generation must respect record export gates.
- Permanent deletion must remain blocked by active preservation holds.
- A future remote provider must enforce authenticated permissions server-side.

## Signature and custody rules

- A typed signature must not save without explicit recorded consent.
- Preserve consent statement version and timestamp.
- Do not infer consent for older signatures during migration.
- “Name Match” means text equality only and is not identity proof.
- Never place signatures or consent records in reusable directory presets.
- Never include typed signatures, consent, verification, signed timestamps, or verifier details in external copies.
- Private signing JWK material is memory-only and must never enter localStorage, provider state, logs, backups, fixtures, exports, or service-worker caches.
- Public-key custody records do not automatically change registry status.
- Recalculate and validate public key IDs before custody import or export.

## Retention, hold, and disposition rules

- Retention presets are workflow aids, not legal advice.
- Preserve retention, hold, disposition, and event-chain metadata through migration, revision, archive, backup, merge, restore, and provider operations.
- Hold placement and release must record actor, reason, and timestamp.
- Do not create duplicate hold-history events without a transition.
- Never permit permanent deletion while a preservation hold is active.
- Disposition approval and hold release are separate actions.
- Require a separate authorized reviewer when configured.
- Bind disposition approval to the current archived-record fingerprint.
- Consume an approval after permanent removal.

## Redaction, recipient, and release rules

- External-copy generation must never mutate the controlled source record.
- Prefer allow-listed output objects over copy-and-delete redaction.
- Apply a recursive unsafe-key filter after profile construction.
- Every profile must exclude signatures and signature-audit data.
- Recipient policies are subtractive and run after redaction.
- A recipient policy may remove more fields but must never restore removed fields.
- Approval fingerprints remain bound to the recipient-specific destination and current governance version.
- Inactive or overdue policies must not be used.
- Create a release receipt only after a successful approved download.
- Route every external JSON and HTML download through the same receipt-producing path.
- Never call the browser-local receipt chain immutable, authenticated, cryptographically signed, or proof of delivery.

## Integrity and recovery rules

- Prefer SHA-256 through Web Crypto when available.
- Use compatibility checksums only where direct-file compatibility requires them and label the exact algorithm.
- A digest detects changes but does not prove identity, approval, authorship, delivery, or non-repudiation.
- Migration functions must be ordered, idempotent, additive, and safe to repeat.
- Preserve unknown fields during migration and provider round trips.
- Preserve a valid recovery package before replacement restore or merge.
- Validate the selected package immediately before mutation.
- Recovery inspection and drill reports must not include meeting or workspace values.
- Preserve the current record version before restoring an older revision.

## Hosted-provider contract rules

A v1.6.3 provider implements Promise-returning methods:

```text
listRecords(options?)
getRecord(recordId, options?)
upsertRecord(record, options?)
archiveRecord(recordId, options?)
restoreRecord(recordId, options?)
deleteRecord(recordId, options?)
exportWorkspace(options?)
healthCheck()
```

- Keep contract version `1.0.0` and record schema `1.6.0` unless a deliberate migration is approved.
- Existing-record updates require the current expected conflict token.
- Missing or stale conflict tokens must produce non-retryable `CONFLICT` errors.
- Repeated idempotency keys with identical input replay the original result.
- Reusing an idempotency key for different input must fail.
- Do not allow simultaneous active and archived copies of the same record ID.
- Preserve revisions and unknown fields.
- Permanent deletion requires explicit intent and must not weaken disposition safeguards.
- Provider exports must include active records, archives, revisions, and integrity metadata.
- Reject private key material from provider exports.
- Attachment references are supported; binary attachment transfer is outside this contract.
- Retryable failures must use explicit retryability metadata. Partial success must not be hidden.
- Never run conformance tests against active browser storage. Use fresh providers and isolated storage keys.
- The same reusable conformance suite must pass for memory and localStorage reference providers.
- Keep provider conformance CI separate from browser regression jobs.

A real hosted provider must independently establish authentication, authorization, tenant isolation, encryption, credential lifecycle, durable audit, retention enforcement, backups, disaster recovery, observability, and incident response. Client conformance does not certify those controls.

## Attachment rules

- Meeting records store attachment metadata and references, not binary payloads.
- Reject `data:` and base64 content in attachment locations.
- Do not cache meeting attachments or meeting records in the service worker.
- External copies must remove file locations, added-by details, and private reference metadata unless a reviewed profile explicitly allows them.

## Accessibility and design

- Every interactive control must be keyboard reachable.
- Dynamic fields require associated labels.
- Keep focus visibly identifiable.
- Use live announcements for meaningful state changes when helpers are available.
- Respect reduced-motion preferences.
- Maintain the professional dark-header, white-card, touch-friendly, mobile-responsive interface.
- Keep archive and print views readable.
