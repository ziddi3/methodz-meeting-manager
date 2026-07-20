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

**App shell 1.6.2 · Meeting-record schema 1.6.0**

- `meeting.html`: main meeting workspace.
- `archive.html`: complete-record detail and print surface.
- `verify.html`: standalone signed-package verifier.
- `config.js`, `config-v11.js` through `config-v16.js`, `config-v162.js`: ordered configuration extensions.
- `migrations.js`, `migrations-v10.js` through `migrations-v16.js`: ordered record-schema migration registry.
- `data-adapter.js`: synchronous meeting-record provider contract.
- `async-data-adapter.js`: Promise-based future remote-provider contract.
- `attachment-adapter.js`: attachment-reference provider contract.
- `crypto-package-core.js`: portable ECDSA package core.
- `workspace-package-core.js`: portable recovery package validation and planning core.
- `key-custody-core.js`: portable public-key custody, manifest, rotation, and revocation core.
- `app.js`: stable core form and local record workflow.
- `features-v03*` through `features-v16*`: additive enhancement layers.
- `features-v162-key-custody.js` and `features-v162-startup.js`: public-key custody workspace and synchronization.
- `archive.js`, `archive-v10.js`, `archive-v11.js`, and `archive-v13.js`: archive rendering and governance detail.
- `manifest.webmanifest` and `service-worker.js`: optional static app shell.
- `tests/`: CI-only Node and Playwright coverage.

Preserve script order. Later feature layers intentionally wrap functions installed by earlier layers.

`config-v162.js` must load after `config-v16.js` and before `migrations.js`. It changes only the app-shell version. It must not change the record schema from `1.6.0`.

`key-custody-core.js` must load after `crypto-package-core.js` and before the v1.6.2 UI layer.

`features-v162-key-custody.js` must load after the v1.6 cryptographic and recovery layers. `features-v162-startup.js` loads last so it may wrap key-generation/import controls without exposing private state.

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
- workspace backup, no-write inspection, recovery drills, replacement restore, and merge recovery;
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
- optional ECDSA package signing and standalone verification;
- memory-only private signing keys;
- public-key custody, fingerprint-check metadata, rotation, revocation, manifests, and custody audit;
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
- Public Verification Key
- Public-Key Custody Manifest
- Custodian / Controlled Role
- Independent Verification Channel
- Key Rotation
- Emergency Revocation

Avoid:

- Owner for task responsibility;
- Methodz company;
- Company logo for Methodz;
- calling a checksum or digest a digital signature;
- claiming a local role proves identity;
- claiming a recipient policy proves recipient identity;
- claiming a release receipt proves delivery;
- claiming a custody record authenticates a custodian or witness;
- claiming a public manifest is a certificate authority;
- claiming a retention preset is legal advice.

## Governance rules

Local role, approval, recipient-policy, policy-review, release-receipt, disposition, signing, and custody controls are workflow safeguards, not authentication.

- Preserve `accessControl`, `retentionMetadata`, `externalReleaseControl`, `externalRecipientControl`, `dispositionControl`, and `externalSignatureControl` metadata.
- Do not bypass edit, export, hold, approval, review, receipt, disposition, signing, recovery, or key-lifecycle gates without an explicit replacement policy.
- Keep archive records non-destructive by default.
- External-copy generation must respect record export gates.
- Permanent deletion must remain blocked by active preservation holds.
- A future remote provider must enforce authenticated permissions server-side.

## Typed-signature rules

- A typed signature must not save without explicit recorded consent.
- Preserve consent statement version and timestamp.
- Do not infer consent for older signatures during migration.
- “Name Match” means text equality only and must never be described as identity proof.
- Never place signatures or consent records inside reusable attendee-directory presets.
- Declined signatures must not remain as accepted signed rows.
- Never include typed signatures, consent, verification, signed timestamps, or verifier details in any external copy.

## Cryptographic signing rules

- Private JWK material exists in current page memory only.
- Never write a private JWK or private EC coordinate to `localStorage`, IndexedDB, service-worker cache, meeting records, revisions, drafts, backups, manifests, audit logs, logs, tests, fixtures, screenshots, or source control.
- Never include private material in a signed package, public-key export, verification report, public custody manifest, or provider payload.
- `crypto-package-core.js` is the authoritative signing and verification implementation.
- Keep package canonicalization, signature metadata, payload digest, public key, and key ID bound together.
- A valid signature proves integrity relative to a key, not human identity, authority, approval, delivery, recipient identity, or non-repudiation.
- Existing redaction, approval, release receipt, retention, hold, and disposition controls still apply before signing.
- Revoked browser-local public keys must not be used for signing or treated as trusted by the local workflow.

## Public-key custody and lifecycle rules

- Store only public JWK material in `methodzSigningPublicKeys`.
- Store non-secret custody references only in `methodzKeyCustodyMetadata`.
- Custody notes must never contain private keys, passwords, tokens, recovery phrases, or other secrets.
- Fingerprint verification requires a verifier label, independent channel, and timestamp.
- Do not claim the application performed the independent comparison. The comparison occurs outside the app through a trusted channel.
- Rotation requires different registered predecessor and successor public keys.
- Both predecessor and successor must be Active before rotation.
- Rotation must revoke the predecessor, record reason and timestamp, and link `replacedByKeyId` and `replacesKeyId`.
- Emergency revocation requires operator and documented reason.
- Do not expose a silent one-click reactivation path for a revoked key.
- The v1.6.2 custody workflow supersedes the old revoke/restore toggle.
- Lifecycle events must be appended to the bounded custody audit and, where relevant, signing audit.
- Custody and signing audits are browser-local workflow history, not authenticated immutable ledgers.

## Public custody manifest rules

- Package type is `methodz-public-key-custody-manifest`.
- Set `privateKeysIncluded` to `false` and verify that no private key material exists recursively.
- Derive every key ID from normalized P-256 public coordinates.
- Reject duplicate IDs, malformed public JWKs, key-ID mismatch, invalid status, missing revocation timestamps, malformed dates, unsupported versions, and digest mismatch.
- Use SHA-256 over canonical JSON for manifest integrity.
- A valid manifest proves structural and digest integrity only.
- Merge is allowed only after successful verification and user confirmation.
- A merge may add public keys or strengthen lifecycle state.
- A merge must never downgrade an existing local `Revoked` state to `Active`.
- Do not allow a public manifest to import private material or silently overwrite local security decisions.

## Recovery rules

- `workspace-package-core.js` is the authoritative validation and restore-planning boundary.
- Inspection must be no-write.
- Preserve a valid recovery package before replacement restore or merge.
- Apply entry-count, per-entry-size, and total-package limits during preview and immediately before mutation.
- Missing, malformed, skipped, object-valued, or mismatched checksums must never report verified.
- Scan parsed recognized entries recursively for private JWK material.
- Block restore and merge when private material is present.
- Preserve unknown record fields and supported Methodz-prefixed collections.
- Recovery reports may contain storage key names, counts, sizes, hashes, and planning metadata, but not meeting or workspace values.
- Recovery drills write only bounded metadata and must not mutate active workspace values.
- Migration and recovery must not invent approvals, reviews, receipts, signatures, rotations, revocations, custody claims, or audit events.

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
- Every profile must exclude typed signatures, signature audit data, private key material, custody secrets, and internal file locations unless explicitly allowed by a reviewed policy.
- Partner Safe must exclude internal notes, contact data, protected policy notes, file locations, and internal provider metadata.
- Public Summary must expose only high-level approved content.
- Custom External Copy may expose only explicitly selected sections.
- Include a redaction manifest with profile, removed paths, warnings, and `signatureDataIncluded: false`.
- Store external-export activity metadata only, not a duplicate package body.
- Do not claim redaction alone authorizes disclosure.

## Recipient policy and release rules

- Recipient policies are subtractive and run after the selected redaction profile.
- A recipient policy may remove more fields but must never restore fields removed by redaction.
- Active recipient destinations use `recipient:<policy-id>`.
- Approval fingerprints must remain bound to the recipient-specific destination ID and governance version.
- Preserve recipient-policy snapshots in the redaction manifest and approval record.
- Inactive or overdue policy must not be applied, approved, or downloaded.
- Typed signatures remain excluded regardless of recipient policy.
- Create a receipt only after a successful approved external download.
- Route every external JSON and HTML download through the same receipt-producing function.
- Keep receipt sequence, previous digest, and current digest internally consistent.
- Never call the local receipt chain immutable, cryptographically signed, authenticated, or proof of delivery.

## Integrity rules

- Prefer SHA-256 through Web Crypto when available.
- Label the exact algorithm and canonicalization.
- Use compatibility checksums only where an existing direct-file protocol explicitly requires them.
- A digest detects content changes but does not prove identity, approval, authorship, delivery, or non-repudiation.
- Keep portable core modules independent from DOM and local-storage mutation so Node tests and future providers can reuse them.

## Attachment rules

- Meeting records store attachment metadata and references, not binary payloads.
- Reject `data:` and base64 content in attachment locations.
- Do not cache meeting attachments or meeting records in the service worker.
- External copies must remove file locations, added-by details, and private reference metadata unless a reviewed profile explicitly allows them.

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

Do not run destructive tests against active user storage. Use isolated storage keys, ephemeral keys, or test providers. Never commit a real private key.

A remote provider must independently enforce authentication, authorization, recipient policy, key administration, revocation distribution, retention, disposition, approval, release receipts, audit integrity, and external-copy permissions.

## CI and testing rules

- Run `node --check` against every JavaScript and module file.
- Keep Node tests dependency-free when practical.
- Generate cryptographic test keys ephemerally during the test run.
- Never persist or commit generated private fixtures.
- Keep Playwright CI-only.
- Add focused matrix suites for expensive or security-sensitive workflows.
- Existing-regression must exclude focused suites to avoid duplicate execution.
- Pull-request failures should produce concise logs and preserve trace artifacts.
- Update service-worker cache assertions whenever the app-shell version changes.

## Accessibility and design

- Every interactive control must be keyboard reachable.
- Dynamic fields require associated labels.
- Keep focus visibly identifiable.
- Use live announcements for meaningful state changes when helpers are available.
- Respect reduced-motion preferences.
- Maintain the professional dark-header, white-card, touch-friendly, mobile-responsive interface.
- Keep archive and print views readable.
