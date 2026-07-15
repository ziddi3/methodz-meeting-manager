# GitHub Copilot Instructions | Methodz Meeting Manager

## Project Identity

Methodz Meeting Manager is an offline-first meeting-record application for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations.

Methodz is a shared brand identity and operating ecosystem, not a separate company. Never describe it as a company unless the repository owner explicitly changes that instruction.

## Deployment Contract

Maintain the application with:

- semantic HTML5;
- CSS3;
- vanilla JavaScript;
- browser `localStorage` for the default provider;
- no runtime framework;
- no required build command;
- no required network connection.

The core workflow must continue to run by opening `meeting.html` directly. Hosted PWA support is optional and may activate only on HTTPS or localhost.

CI-only testing dependencies are allowed when they do not enter the deployed application.

## Current Release Architecture

- `meeting.html`: main meeting workspace.
- `archive.html`: complete-record detail and print surface.
- `config.js`, `config-v11.js` through `config-v14.js`: ordered configuration extensions.
- `migrations.js`, `migrations-v10.js` through `migrations-v14.js`: ordered schema migration registry and extensions.
- `data-adapter.js`: synchronous meeting-record provider contract.
- `async-data-adapter.js`: Promise-based future remote-provider contract.
- `attachment-adapter.js`: attachment-reference provider contract.
- `app.js`: stable core form and local record workflow.
- `features-v03*` through `features-v14*`: additive enhancement layers.
- `archive.js`, `archive-v10.js`, `archive-v11.js`, and `archive-v13.js`: archive rendering and governance detail.
- `manifest.webmanifest` and `service-worker.js`: optional static app shell.
- `tests/`: CI-only Playwright coverage.

Preserve script order. Later feature layers intentionally wrap functions installed by earlier layers.

`config-v14.js` must load after `config-v13.js` and before `migrations.js` so the migration registry captures schema `1.4.0`.

`features-v14-recipient-policy.js` must load after the v1.1 redaction modules, v1.2 approval modules, and v1.3 disposition module.

## Required Product Capabilities

Preserve:

- meeting information and status;
- Organizations / Representatives Present;
- attendance and meeting-specific typed signatures;
- explicit electronic-signature consent;
- signature verification metadata;
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
- record classifications and workflow policies;
- synchronous, asynchronous, and attachment provider health checks;
- release audit export;
- retention policies and review dates;
- preservation-hold placement, release, history, and disposition blocking;
- partner-safe, public-summary, and custom external-copy profiles;
- redaction manifests and integrity labeling;
- fingerprint-bound external-export approvals;
- separate requester and reviewer roles;
- disposition approval and preservation event-chain verification;
- recipient-specific destination policies and field allow-lists;
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

Avoid:

- Owner for task responsibility;
- Methodz company;
- Company logo for Methodz;
- calling a checksum or digest a digital signature;
- claiming a local role proves identity;
- claiming a recipient policy proves recipient identity;
- claiming a retention preset is legal advice.

## Governance Rules

Local role, approval, recipient-policy, and disposition controls are workflow safeguards, not authentication.

- Never claim local role selection proves identity.
- A future remote provider must enforce authenticated permissions server-side.
- Preserve record-level `accessControl`, `retentionMetadata`, `externalReleaseControl`, `externalRecipientControl`, and `dispositionControl` metadata.
- Do not bypass edit, export, hold, approval, or disposition gates without an explicit replacement policy.
- Keep archive records non-destructive by default.
- External-copy generation must respect the record export gate.
- Permanent deletion must remain blocked by active preservation holds.

## Signature Rules

- A typed signature must not save without explicit recorded consent.
- Preserve consent statement version and timestamp.
- Do not infer consent for older signatures during migration.
- “Name Match” means text equality only and must never be described as identity proof.
- Never place signatures or consent records inside reusable attendee-directory presets.
- Declined signatures must not remain as accepted signed rows.
- Never include typed signatures, consent, verification, signed timestamps, or verifier details in any external copy.

## Retention, Hold, and Disposition Rules

- Retention presets are workflow aids, not legal advice.
- Preserve retention, hold, disposition, and event-chain metadata through migration, revision, archive, backup, merge, restore, and provider operations.
- Hold placement and release must record actor, reason, and timestamp.
- Do not create duplicate hold-history events when a record is saved without a transition.
- Never permit permanent deletion while a preservation hold is active.
- Disposition approval and hold release are separate actions.
- Require a separate authorized reviewer when configured.
- Bind disposition approval to the current archived-record fingerprint.
- Consume an approval after permanent removal.
- A future remote provider must enforce these rules server-side.

## Redaction and External-Copy Rules

- External-copy generation must never mutate the controlled source record.
- Prefer allow-listed output objects over copying an entire record and deleting a few fields.
- Apply a recursive unsafe-key filter after profile construction.
- Every profile must exclude signatures and signature audit data.
- Partner Safe must exclude internal notes, contact data, protected policy notes, file locations, and internal adapter or synchronization metadata.
- Public Summary must expose only high-level approved content.
- Custom External Copy may expose only explicitly selected sections.
- Include a redaction manifest with profile, generation time, removed paths, warnings, and `signatureDataIncluded: false`.
- Store external-export activity metadata only, not a duplicate package body.
- Do not claim redaction alone authorizes disclosure.

## Recipient Policy Rules

- Recipient policies are subtractive and run after the selected redaction profile.
- A recipient policy may remove more fields but must never restore fields removed by redaction.
- Active recipient destinations use the stable format `recipient:<policy-id>`.
- Approval fingerprints must remain bound to the recipient-specific destination ID.
- Preserve recipient-policy snapshots in the redaction manifest and approval record.
- An inactive or overdue policy must not be applied, previewed, approved, or downloaded.
- Core meeting information remains a required allow-list group.
- Enabling free-form discussion notes requires a meaningful verification note.
- Typed signatures remain excluded regardless of recipient policy.
- Policy import must merge safely, remain bounded, and preserve the newest `updatedAt` value.
- Do not claim a contact reference proves recipient identity or delivery.
- A future hosted provider must enforce recipient authorization and field allow-lists server-side.

## Integrity Rules

- Prefer SHA-256 through Web Crypto when available.
- Use the compatibility checksum only when Web Crypto is unavailable.
- Label the exact algorithm inside the package.
- A digest or checksum detects content changes but does not prove identity, approval, authorship, delivery, or non-repudiation.
- Do not call a digest a cryptographic signature.
- Public-key signing may be added only with explicit key-generation, protection, rotation, revocation, and verification design.

## Attachment Rules

- Meeting records store attachment metadata and references, not binary file payloads.
- Reject `data:` and base64 content in attachment locations.
- Do not cache meeting attachments or meeting records in the service worker.
- External copies must remove file locations, added-by details, and private reference metadata unless a future reviewed profile explicitly allows them.

## Migration and Recovery Rules

- Migration functions must be ordered, idempotent, and safe to run repeatedly.
- Preserve unknown fields during migration.
- Preserve active records, archive entries, revisions, drafts, governance, retention, hold, redaction, approval, recipient-policy, and disposition metadata.
- Preserve a valid recovery package before replacement restore or merge.
- Keep recovery checksums valid.
- Preserve the current version before restoring an older revision.
- Migration must not invent hold, approval, or recipient-policy audit events.

## Provider Rules

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

A remote provider must independently enforce authentication, authorization, recipient policies, legal holds, retention rules, disposition, audit integrity, and external-copy permissions.

## Accessibility and Design

- Every interactive control must be keyboard reachable.
- Dynamic fields require associated labels.
- Keep focus visibly identifiable.
- Use live announcements for meaningful state changes when helpers are available.
- Respect reduced-motion preferences.
- Maintain the professional dark-header, white-card, touch-friendly, mobile-responsive interface.
- Keep archive and print views readable.
