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
- `config.js`, `config-v11.js` through `config-v15.js`: ordered configuration extensions.
- `migrations.js`, `migrations-v10.js` through `migrations-v15.js`: ordered schema migration registry and extensions.
- `data-adapter.js`: synchronous meeting-record provider contract.
- `async-data-adapter.js`: Promise-based future remote-provider contract.
- `attachment-adapter.js`: attachment-reference provider contract.
- `app.js`: stable core form and local record workflow.
- `features-v03*` through `features-v15*`: additive enhancement layers.
- `archive.js`, `archive-v10.js`, `archive-v11.js`, and `archive-v13.js`: archive rendering and governance detail.
- `manifest.webmanifest` and `service-worker.js`: optional static app shell.
- `tests/`: CI-only Playwright coverage.

Preserve script order. Later feature layers intentionally wrap functions installed by earlier layers.

`config-v15.js` must load after `config-v14.js` and before `migrations.js` so the migration registry captures schema `1.5.0`.

`features-v15-policy-operations.js` must load after v1.4 policy hardening. `features-v15-download-routing.js` must load last so every legacy external-download control uses the receipt-producing approved path.

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
- provider health checks;
- retention policies and preservation holds;
- partner-safe, public-summary, and custom external-copy profiles;
- redaction manifests and integrity labeling;
- fingerprint-bound external-export approvals;
- separate requester and reviewer roles;
- disposition approval and preservation event-chain verification;
- recipient-specific destination policies and field allow-lists;
- policy stewardship, review cadence, and review queue;
- release receipt creation, verification, search, and export;
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

Avoid:

- Owner for task responsibility;
- Methodz company;
- Company logo for Methodz;
- calling a checksum or digest a digital signature;
- claiming a local role proves identity;
- claiming a recipient policy proves recipient identity;
- claiming a release receipt proves delivery;
- claiming a retention preset is legal advice.

## Governance rules

Local role, approval, recipient-policy, policy-review, release-receipt, and disposition controls are workflow safeguards, not authentication.

- Preserve `accessControl`, `retentionMetadata`, `externalReleaseControl`, `externalRecipientControl`, and `dispositionControl` metadata.
- Do not bypass edit, export, hold, approval, review, receipt, or disposition gates without an explicit replacement policy.
- Keep archive records non-destructive by default.
- External-copy generation must respect record export gates.
- Permanent deletion must remain blocked by active preservation holds.
- A future remote provider must enforce authenticated permissions server-side.

## Signature rules

- A typed signature must not save without explicit recorded consent.
- Preserve consent statement version and timestamp.
- Do not infer consent for older signatures during migration.
- “Name Match” means text equality only and must never be described as identity proof.
- Never place signatures or consent records inside reusable attendee-directory presets.
- Declined signatures must not remain as accepted signed rows.
- Never include typed signatures, consent, verification, signed timestamps, or verifier details in any external copy.

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

## Redaction and external-copy rules

- External-copy generation must never mutate the controlled source record.
- Prefer allow-listed output objects over copying an entire record and deleting a few fields.
- Apply a recursive unsafe-key filter after profile construction.
- Every profile must exclude signatures and signature audit data.
- Partner Safe must exclude internal notes, contact data, protected policy notes, file locations, and internal provider metadata.
- Public Summary must expose only high-level approved content.
- Custom External Copy may expose only explicitly selected sections.
- Include a redaction manifest with profile, removed paths, warnings, and `signatureDataIncluded: false`.
- Store external-export activity metadata only, not a duplicate package body.
- Do not claim redaction alone authorizes disclosure.

## Recipient policy rules

- Recipient policies are subtractive and run after the selected redaction profile.
- A recipient policy may remove more fields but must never restore fields removed by redaction.
- Active recipient destinations use `recipient:<policy-id>`.
- Approval fingerprints must remain bound to the recipient-specific destination ID.
- Preserve recipient-policy snapshots in the redaction manifest and approval record.
- An inactive or overdue policy must not be applied, previewed, approved, or downloaded.
- Core meeting information remains a required allow-list group.
- Enabling free-form discussion notes requires a meaningful verification note.
- Typed signatures remain excluded regardless of recipient policy.
- Policy import must merge safely, remain bounded, and preserve the newest `updatedAt` value.
- Do not claim a contact reference proves recipient identity or delivery.

## Policy operations rules

- Store v1.5 governance separately from the recipient policy and join by stable `policyId`.
- Preserve steward, role, risk tier, business purpose, cadence, review actor, review note, and timestamps.
- Completing a review may advance the v1.4 policy `reviewDate`; it must not silently activate an inactive policy.
- Governance `updatedAt` must participate in the redacted-content fingerprint when governance is present.
- Changing policy governance must invalidate approval for an older governance version.
- Review queue calculations must distinguish overdue, due soon, no date, current, and inactive states.
- Migration must not invent a policy review or reviewer identity.

## Release receipt rules

- Create a receipt only after a successful approved external download.
- Route every external JSON and HTML download control through the same receipt-producing function.
- Preserve approval, source, destination, recipient policy, optional governance, profile, format, package integrity, and release time.
- Keep receipt sequence, previous digest, and current digest internally consistent.
- Reverify the full retained ledger after writes.
- Never call the local receipt chain immutable, cryptographically signed, authenticated, or proof of delivery.
- Source-record receipt metadata is a pointer to the latest local release event, not a remote acknowledgment.
- A future hosted provider should replace local receipt writes with an authenticated append-only service.

## Integrity rules

- Prefer SHA-256 through Web Crypto when available.
- Use compatibility checksums only when Web Crypto is unavailable or when a local deterministic chain explicitly requires them.
- Label the exact algorithm.
- A digest detects content changes but does not prove identity, approval, authorship, delivery, or non-repudiation.
- Public-key signing may be added only with explicit key-generation, protection, rotation, revocation, and verification design.

## Attachment rules

- Meeting records store attachment metadata and references, not binary payloads.
- Reject `data:` and base64 content in attachment locations.
- Do not cache meeting attachments or meeting records in the service worker.
- External copies must remove file locations, added-by details, and private reference metadata unless a reviewed profile explicitly allows them.

## Migration and recovery rules

- Migration functions must be ordered, idempotent, additive, and safe to run repeatedly.
- Preserve unknown fields during migration.
- Preserve active records, archive entries, revisions, drafts, governance, retention, hold, redaction, approval, recipient policy, policy operations, receipts, and disposition metadata.
- Preserve a valid recovery package before replacement restore or merge.
- Keep recovery checksums valid.
- Preserve the current version before restoring an older revision.
- Migration must not invent hold, approval, review, receipt, or recipient-policy audit events.

## Provider rules

A synchronous meeting provider implements:

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

An asynchronous provider implements Promise-returning equivalents.

An attachment provider implements:

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

Do not run destructive tests against active user storage. Use isolated storage keys or test providers.

A remote provider must independently enforce authentication, authorization, recipient policies, policy administration, legal holds, retention, disposition, approval, release receipts, audit integrity, and external-copy permissions.

## Accessibility and design

- Every interactive control must be keyboard reachable.
- Dynamic fields require associated labels.
- Keep focus visibly identifiable.
- Use live announcements for meaningful state changes when helpers are available.
- Respect reduced-motion preferences.
- Maintain the professional dark-header, white-card, touch-friendly, mobile-responsive interface.
- Keep archive and print views readable.
