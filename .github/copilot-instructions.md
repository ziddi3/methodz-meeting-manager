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

The core meeting workflow must continue to run by opening `meeting.html` directly. Hosted PWA and Web Crypto features may activate on HTTPS or localhost. CI-only dependencies are allowed when they do not enter the deployed application.

## Current architecture

- `meeting.html`: main workspace.
- `archive.html`: complete-record detail and print surface.
- `verify.html`: standalone signed-package verifier.
- `config.js`, `config-v11.js` through `config-v15.js`: ordered configuration extensions.
- `migrations.js`, `migrations-v10.js` through `migrations-v15.js`: ordered schema migration registry and extensions.
- `data-adapter.js`: synchronous meeting-record provider contract.
- `async-data-adapter.js`: Promise-based future remote-provider contract.
- `attachment-adapter.js`: metadata-only attachment-reference provider contract.
- `crypto-package-core.js`: portable package signing and verification boundary.
- `app.js`: stable core form and local record workflow.
- `features-v03*` through `features-v15*`: additive enhancement layers.
- `archive.js`, `archive-v10.js`, `archive-v11.js`, and `archive-v13.js`: archive rendering and governance detail.
- `manifest.webmanifest` and `service-worker.js`: optional static app shell.
- `tests/`: CI-only Playwright coverage.

Preserve script order. Later feature layers intentionally wrap functions installed by earlier layers.

`config-v15.js` must load after `config-v14.js` and before `migrations.js` so the migration registry captures schema `1.5.0`.

`crypto-package-core.js` must load before `features-v15-crypto.js` and before `verify.js`.

## Required capabilities

Preserve:

- meeting information and status;
- Organizations / Representatives Present;
- attendance and meeting-specific typed signatures;
- explicit typed-signature consent and verification metadata;
- agenda, notes, decisions, tasks, and summary;
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
- retention policies and review dates;
- preservation-hold placement, release, history, and deletion blocking;
- partner-safe, public-summary, and custom external-copy profiles;
- fingerprint-bound external-export approvals;
- separate requester and reviewer roles;
- disposition approval and preservation event-chain verification;
- recipient-specific destinations and field allow-lists;
- optional ECDSA package signing and standalone verification;
- keyboard navigation and accessibility support;
- optional hosted offline app shell.

## Terminology

Use:

- Organizations / Representatives Present
- Meeting Facilitator
- Follow-Up Tasks
- Assigned To
- Methodz Brand Mark
- Controlled Source Record
- Redacted External Copy
- Recipient-Specific Export Policy
- Cryptographic Package Signature
- Public Verification Key
- Private Signing Key

Avoid:

- Owner for task responsibility;
- Methodz company;
- Company logo for Methodz;
- calling a checksum or digest a digital signature;
- claiming a typed signature, local role, recipient policy, signer label, or public-key record proves identity;
- claiming a retention preset is legal advice.

## Governance rules

Local role, approval, recipient-policy, key-registry, and disposition controls are workflow safeguards, not authentication.

- Preserve `accessControl`, `retentionMetadata`, `externalReleaseControl`, `externalRecipientControl`, `externalSignatureControl`, and `dispositionControl` metadata.
- Do not bypass edit, export, hold, approval, signing, or disposition gates without an explicit replacement policy.
- Keep archive records non-destructive by default.
- Permanent deletion must remain blocked by active preservation holds.
- Future remote providers must enforce authenticated permissions server-side.

## Typed-signature rules

- A typed signature must not save without explicit recorded consent.
- Preserve consent statement version and timestamp.
- Do not infer consent for older signatures during migration.
- “Name Match” means text equality only and must never be described as identity proof.
- Never place typed signatures or consent records in reusable attendee presets.
- Never include typed signatures, consent, verification, signed timestamps, or verifier details in external copies.

## Cryptographic package-signature rules

- Use ECDSA P-256 with SHA-256 through Web Crypto for v1.5 package signatures.
- Keep private signing keys in page memory only. Never write private JWK material to `localStorage`, IndexedDB, workspace backups, audit exports, service-worker caches, signed packages, or verification reports.
- Private-key persistence must require an explicit sensitive backup download initiated by the operator.
- Public-key exports and registry records must contain no `d` field.
- Bind package content and displayed signature metadata into the signed canonical bytes.
- Preserve the recursive sorted-key canonicalization and array order defined by `methodz-canonical-json-v1`.
- Changing the package, signer label, key label, signed time, key ID, algorithm declaration, digest, public key, or signature notice must invalidate verification.
- Embed the public key for offline verification and derive the stable key ID from its P-256 coordinates.
- A valid signature proves integrity relative to a key, not the legal identity or authority of the signer.
- Browser-local Active or Revoked key status is workflow metadata, not durable organization-wide revocation.
- Do not add automatic signing with hidden or silently generated keys.
- Do not sign HTML or text exports as though they were the canonical approved JSON package.
- Add test coverage for package tampering, signature-metadata tampering, private-key leakage, and standalone verification.

## Retention, hold, and disposition rules

- Retention presets are workflow aids, not legal advice.
- Preserve retention, hold, disposition, and event-chain metadata through migration, revision, archive, backup, merge, restore, and provider operations.
- Hold placement and release must record actor, reason, and timestamp.
- Never permit permanent deletion while a preservation hold is active.
- Require a separate authorized disposition reviewer when configured.
- Bind disposition approval to the current archived-record fingerprint and consume it after removal.

## Redaction and external-copy rules

- External-copy generation must never mutate the controlled source record.
- Prefer allow-listed output objects over copying an entire record and deleting a few fields.
- Apply a recursive unsafe-key filter after profile construction.
- Every profile must exclude typed signatures and signature audit data.
- Partner Safe must exclude internal notes, contact data, protected policy notes, file locations, and internal provider metadata.
- Public Summary must expose only high-level approved content.
- Custom External Copy may expose only explicitly selected sections.
- Store external-export activity metadata only, not a duplicate package body.
- Do not claim redaction alone authorizes disclosure.

## Recipient-policy rules

- Recipient policies are subtractive and run after redaction.
- They may remove more fields but must never restore fields removed by redaction.
- Stable recipient destinations use `recipient:<policy-id>`.
- Approval fingerprints must remain bound to the recipient destination.
- Preserve recipient-policy snapshots in manifests and approvals.
- Block inactive or overdue policies.
- Enabling free-form discussion notes requires a meaningful verification note.
- Typed signatures remain excluded regardless of recipient policy.
- Do not claim a contact reference proves recipient identity or delivery.

## Integrity rules

- Prefer SHA-256 through Web Crypto when available.
- Label the exact algorithm inside each package.
- A checksum or digest detects changes but does not prove identity, approval, authorship, delivery, or non-repudiation.
- A package signature provides stronger integrity relative to a key but still does not independently prove human identity or authority.

## Attachment rules

- Store attachment metadata and references, not binary payloads.
- Reject `data:` and base64 content in attachment locations.
- Do not cache meeting attachments or records in the service worker.
- Remove file locations and private reference metadata from external copies unless a reviewed future policy explicitly allows them.

## Migration and recovery rules

- Migration functions must be ordered, idempotent, and safe to run repeatedly.
- Preserve unknown fields.
- Preserve records, archive entries, revisions, drafts, governance, retention, hold, redaction, approval, recipient-policy, signature-control, and disposition metadata.
- Preserve a valid recovery package before replacement restore or merge.
- Migration must not invent hold, approval, recipient-policy, signing, or disposition audit events.
- Private key material must never be introduced into migration or recovery packages.

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

Do not run destructive tests against active user storage. Use isolated storage keys or disposable providers.

A remote provider must independently enforce authentication, authorization, recipient policies, legal holds, retention, disposition, audit integrity, key administration, and external-copy permissions.

## Accessibility and design

- Every interactive control must be keyboard reachable.
- Dynamic fields require associated labels.
- Keep focus visibly identifiable.
- Use live announcements for meaningful state changes when helpers are available.
- Respect reduced-motion preferences.
- Maintain the professional dark-header, white-card, touch-friendly, mobile-responsive interface.
- Keep archive, verifier, and print views readable.
