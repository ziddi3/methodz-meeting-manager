# GitHub Copilot Instructions | Methodz Meeting Manager

## Project Identity

Methodz Meeting Manager is an offline-first meeting-record application for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations.

Methodz is a shared brand identity and operating ecosystem, not a separate company. Never describe it as a company unless the repository owner explicitly changes that instruction.

## Deployment Contract

Maintain the application with:

- semantic HTML5
- CSS3
- vanilla JavaScript
- browser `localStorage`
- no runtime framework
- no required build command
- no required network connection

The core workflow must continue to run by opening `meeting.html` directly. Hosted PWA support is optional and may activate only on HTTPS or localhost.

CI-only testing dependencies are allowed when they do not enter the deployed application.

## Current Release Architecture

- `meeting.html`: main meeting workspace
- `archive.html`: complete-record detail and print surface
- `config.js`: stable editable defaults, roles, policies, and consent statement
- `config-v11.js`: v1.1 schema, retention, redaction, and logging extension
- `migrations.js`: ordered historical migration registry
- `migrations-v10.js`: v1.0 governance, consent, provider, and release validation
- `migrations-v11.js`: v1.1 retention, hold, and redaction migration
- `data-adapter.js`: synchronous meeting-record provider contract
- `async-data-adapter.js`: Promise-based future remote-provider contract
- `attachment-adapter.js`: attachment-reference provider contract
- `app.js`: stable core form and local record workflow
- `features-v03*` through `features-v11*`: additive enhancement layers
- `archive.js`, `archive-v10.js`, and `archive-v11.js`: archive rendering, governance, consent, and retention detail
- `manifest.webmanifest` and `service-worker.js`: optional static app shell
- `tests/`: CI-only Playwright coverage

Preserve script order. Later feature layers intentionally wrap functions installed by earlier layers.

`config-v11.js` must load before `migrations.js` so the migration registry captures schema `1.1.0`.

## Required Product Capabilities

Preserve:

- meeting information and status
- Organizations / Representatives Present
- attendance and meeting-specific typed signatures
- explicit electronic-signature consent
- signature verification metadata
- agenda, notes, decisions, tasks, and meeting summary
- Assigned To, priority, due date, and task status
- templates and custom agenda items
- attendee and organization directories
- attachment references and attachment index
- draft auto-save and restore
- active-record search and edit
- non-destructive Archive Vault
- dedicated archive page and print output
- revision history, comparison, and restore
- workspace backup, replacement restore, and merge recovery
- schema migration
- consolidated active/archive workspace
- record classifications and workflow policies
- synchronous, asynchronous, and attachment provider health checks
- release audit export
- retention policies and review dates
- legal-hold placement, release, history, and archive disposition blocking
- retention dashboard and report export
- partner-safe, public-summary, and custom external-copy profiles
- redaction manifests and integrity labeling
- external-export activity metadata
- keyboard navigation and accessibility support
- optional hosted offline app shell

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

Avoid:

- Owner for task responsibility
- Methodz company
- Company logo for Methodz
- calling a checksum or digest a digital signature
- claiming a local role proves identity
- claiming a retention preset is legal advice

## Governance Rules

Local role and policy controls are workflow safeguards, not authentication.

- Never claim local role selection proves identity.
- A future remote provider must enforce authenticated permissions server-side.
- Preserve record-level `accessControl` metadata.
- Preserve classification, policy, allowed roles, protected fields, preparation, review, and policy-note fields.
- Do not bypass edit or export gates without an explicit replacement policy.
- Keep archive records non-destructive by default.
- External-copy generation must respect the record export gate.

## Signature Rules

- A typed signature must not save without explicit recorded consent.
- Preserve consent statement version and timestamp.
- Do not infer consent for older signatures during migration.
- “Name Match” means text equality only and must never be described as identity proof.
- Never place signatures or consent records inside reusable attendee-directory presets.
- Declined signatures must not remain as accepted signed rows.
- Never include typed signatures, consent, verification, signed timestamps, or verifier details in partner-safe, public-summary, or custom external copies.

## Retention and Legal-Hold Rules

- Retention presets are workflow aids, not legal advice.
- Preserve `retentionMetadata`, `legalHold`, and `holdHistory` through migration, revision, archive, backup, merge, restore, and provider operations.
- A hold placement must record actor, reason, and timestamp.
- A hold release must record actor, reason, and timestamp without erasing placement history.
- Do not create duplicate history events when a record is saved without a hold-state transition.
- Never permit permanent deletion of an archived record while `retentionMetadata.legalHold.active` is true.
- Do not silently convert a hold into a released state.
- Disposition approval and hold release are separate actions.
- A future remote provider must enforce hold and disposition rules server-side.

## Redaction and External-Copy Rules

- External-copy generation must never mutate the controlled source record.
- Prefer allow-listed output objects over copying an entire record and deleting a few fields.
- Apply a recursive unsafe-key filter after profile construction to guard against future nested fields.
- Every profile must exclude signatures and signature audit data.
- Partner Safe must exclude internal notes, contact data, protected policy notes, file locations, and internal adapter or synchronization metadata.
- Public Summary must expose only high-level approved content.
- Custom External Copy may expose only explicitly selected sections.
- Include a redaction manifest with profile, generation time, removed paths, warnings, and `signatureDataIncluded: false`.
- Store external-export activity metadata only, not a duplicate package body.
- Keep the activity log bounded to prevent unbounded localStorage growth.
- Do not claim redaction alone authorizes disclosure. The workflow role and policy export gate still applies.

## Integrity Rules

- Prefer SHA-256 through Web Crypto when available.
- Use the compatibility checksum only when Web Crypto is unavailable.
- Label the exact algorithm inside the package.
- A digest or checksum detects content changes but does not prove identity, approval, authorship, or non-repudiation.
- Do not call a digest a cryptographic signature.
- Public-key signing may be added only with explicit key-generation, protection, rotation, revocation, and verification design.

## Attachment Rules

- Meeting records store attachment metadata and references, not binary file payloads.
- Reject `data:` and base64 content in attachment locations.
- A future binary provider must return stable references and preserve exportable metadata.
- Do not cache meeting attachments or meeting records in the service worker.
- External copies must remove attachment file locations, added-by details, and private reference metadata unless a future profile explicitly and safely allows them.

## Migration and Recovery Rules

- Migration functions must be ordered, idempotent, and safe to run repeatedly.
- Preserve unknown fields during migration.
- Preserve active records, archive entries, revisions, drafts, governance, retention, hold, and redaction metadata.
- Preserve a valid recovery package before replacement restore or merge.
- Keep recovery checksums valid.
- Do not overwrite local safety metadata with imported migration, merge, or recovery metadata.
- Preserve the current version before restoring an older revision.
- Migration must not invent hold history events.

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

A remote provider must independently enforce authentication, authorization, legal holds, retention rules, disposition, audit integrity, and external-copy permissions.

## Accessibility and Design

- Every interactive control must be keyboard reachable.
- Dynamic fields require associated labels.
- Keep focus visibly identifiable.
- Use live announcements for meaningful state changes when helpers are available.
- Respect reduced-motion preferences.
- Maintain the professional dark-header, white-card, touch-friendly, mobile-responsive interface.
- Keep archive and print views readable.
- Disabled hold-protected deletion controls must communicate why they are unavailable.
- Redaction previews must be readable without forcing page-level horizontal scrolling.

## Validation Before Completion

- Run `node --check` on every changed JavaScript file.
- Confirm both HTML entry points load required assets in the intended order.
- Validate `manifest.webmanifest` when PWA metadata changes.
- Ensure the service-worker asset list includes new static modules and excludes record data.
- Extend Playwright coverage for changed user-visible workflows.
- Test that source records remain byte-for-byte equivalent after redaction generation where practical.
- Test that signatures cannot appear in any external profile.
- Test that active holds block Archive Vault permanent deletion.
- Update README, changelog, architecture, security, and manual test documentation.
- Do not claim CI passed until GitHub reports a completed successful run.

## Safety Rules

Never:

- break direct-file compatibility
- remove features without a replacement path
- require internet access for the base app
- add runtime dependencies without explicit approval
- hardcode sensitive business data
- bypass archive, migration, revision, merge, consent, governance, retention, hold, redaction, or recovery protections
- describe workflow role controls as real authentication
- transmit meeting data without an explicitly configured provider
- permanently delete a held record
- export a typed signature through an external-copy profile
- describe a checksum as proof of identity

Every change should improve maintainability, recoverability, portability, privacy, or usability.
