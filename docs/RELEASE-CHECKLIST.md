# Release Checklist

## Code

- [ ] Every JavaScript file passes `node --check`.
- [ ] Both HTML entry points load all required v1.0 and v1.1 modules in order.
- [ ] `config-v11.js` loads before `migrations.js`.
- [ ] `migrations-v11.js` loads after `migrations-v10.js` and before application initialization.
- [ ] Service-worker cache includes all v1.1 static assets.
- [ ] Service-worker cache excludes meeting, archive, signature, attachment, and export-log data.
- [ ] Direct-file mode remains operational.
- [ ] Localhost and HTTPS hosted modes remain operational.

## Data

- [ ] v0.1 through v1.0 sample records migrate to `1.1.0`.
- [ ] Unknown fields survive migration.
- [ ] Existing signatures are not silently marked consented.
- [ ] Retention and redaction defaults are added without removing existing data.
- [ ] Migration does not invent legal-hold history events.
- [ ] Workspace backup includes new storage keys.
- [ ] Restore and merge preserve governance, consent, retention, hold, and redaction fields.
- [ ] Archive and revision snapshots preserve v1.1 fields.
- [ ] Re-running migration is idempotent.

## Core Workflow

- [ ] Required title/date validation passes.
- [ ] Signature consent blocking works.
- [ ] Declined signatures cannot be saved.
- [ ] Role-aware edit and export controls work.
- [ ] Consolidated workspace filters work.
- [ ] Release audit export is valid JSON.
- [ ] Provider health checks remain successful.

## Retention and Legal Hold

- [ ] Year-based retention presets generate expected review dates.
- [ ] Permanent policy clears the review date.
- [ ] Custom review date is preserved.
- [ ] Hold placement records actor, reason, timestamp, and history.
- [ ] Hold release records actor, reason, timestamp, and history.
- [ ] Repeated saves do not duplicate hold transitions.
- [ ] Active holds block Archive Vault permanent deletion.
- [ ] Released holds do not bypass the normal permanent-delete confirmation.
- [ ] Retention Dashboard totals and filters are accurate.
- [ ] Retention report does not contain complete notes or signatures.

## Partner-Safe Export

- [ ] External-copy generation does not mutate the source record.
- [ ] Partner Safe excludes signatures, consent, verification, notes, contacts, policy notes, and file locations.
- [ ] Public Summary exposes only high-level approved content.
- [ ] Custom External Copy respects section choices.
- [ ] Every profile excludes signature and verification data.
- [ ] Export governance gate is enforced.
- [ ] Redaction manifest lists removed paths and warnings.
- [ ] `signatureDataIncluded` is `false`.
- [ ] JSON and HTML external copies are valid and readable.

## Integrity and Logging

- [ ] SHA-256 is used when Web Crypto is available.
- [ ] FNV-1a fallback is explicitly labeled non-cryptographic.
- [ ] Neither algorithm is described as a digital signature or identity proof.
- [ ] Preview alone does not add an activity-log entry.
- [ ] Completed JSON and HTML downloads add metadata entries.
- [ ] Activity log contains no meeting body or signature data.
- [ ] Activity log remains bounded.

## Accessibility

- [ ] All new controls have labels.
- [ ] Keyboard focus is visible.
- [ ] Disabled held-record deletion communicates why it is unavailable.
- [ ] Tables and redaction previews remain scrollable on small screens.
- [ ] Live regions announce important status changes.
- [ ] Reduced-motion preference is respected by existing navigation.

## Privacy and Security Boundaries

- [ ] No meeting data is added to the service-worker asset cache.
- [ ] No remote endpoint is configured by default.
- [ ] Attachment records contain metadata only.
- [ ] Role controls are documented as non-authenticated workflow controls.
- [ ] Legal-hold controls are documented as local workflow safeguards.
- [ ] Retention presets are documented as non-legal workflow aids.
- [ ] Redacted external copies require human review before sharing.
- [ ] Export privacy warning remains documented.

## Automated Validation

- [ ] Static checks require all v1.1 files and wiring.
- [ ] Historical browser smoke tests still pass.
- [ ] v1.1 panel and migration tests pass.
- [ ] v1.1 retention persistence test passes.
- [ ] v1.1 held-record deletion protection test passes.
- [ ] v1.1 redaction safety test passes.
- [ ] v1.1 integrity-label test passes.

## Release Decision

- [ ] GitHub Actions static checks pass.
- [ ] Playwright smoke tests pass.
- [ ] Manual checklist passes on mobile and desktop.
- [ ] Direct-file and hosted modes have both been tested.
- [ ] Workspace backup has been tested before production use.
- [ ] A held-record disposition attempt has been tested before production use.
- [ ] A partner-safe package has been manually reviewed before production use.
