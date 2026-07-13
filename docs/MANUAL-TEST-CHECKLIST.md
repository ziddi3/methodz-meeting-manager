# Manual Test Checklist

Use this checklist after each major change. Release-specific detail is available in:

```text
docs/V1.0-TESTS.md
docs/V1.1-TESTS.md
```

## Open App

- [ ] Open `meeting.html` directly in a browser.
- [ ] Confirm the page loads with no visible script error.
- [ ] Confirm logo placeholders appear if logo image files are missing.
- [ ] Confirm status starts as `Scheduled` and date defaults to today.
- [ ] Confirm governance, signature review, retention, templates, directories, attachment references, archive, recovery, provider, and release panels load.
- [ ] Confirm Retention Review Dashboard and Partner-Safe Export appear near the records workspace.
- [ ] Open the app through localhost or HTTPS and confirm the optional service worker registers.
- [ ] Confirm direct-file mode remains fully usable without service-worker registration.

## Meeting Form

- [ ] Enter meeting title, status, date, location, and facilitator.
- [ ] Select Organizations / Representatives Present.
- [ ] Add at least two attendees.
- [ ] Add typed signatures and explicit consent.
- [ ] Confirm a typed signature without consent cannot save.
- [ ] Check agenda items.
- [ ] Enter discussion notes.
- [ ] Enter free-form and structured decisions.
- [ ] Add follow-up tasks.
- [ ] Confirm task responsibility says `Assigned To`.
- [ ] Add a meeting summary.
- [ ] Add attachment references.
- [ ] Select classification, policy, allowed roles, protected fields, and review status.

## Retention and Legal Hold

- [ ] Confirm a default retention policy and review date appear.
- [ ] Switch between two-year, seven-year, permanent, and custom policies.
- [ ] Confirm permanent policy clears the review date.
- [ ] Enter lifecycle status and retention note.
- [ ] Place a legal hold with actor and reason.
- [ ] Save and confirm `placedAt` and a `placed` history event.
- [ ] Save again and confirm no duplicate placement event.
- [ ] Release the hold with actor and reason.
- [ ] Confirm release metadata and a `released` history event.
- [ ] Archive a held record and confirm Permanent Delete is disabled.
- [ ] Confirm the Retention Dashboard counts holds, due reviews, and missing dates.
- [ ] Export the retention report and confirm it is an index, not a full record backup.

## Attendee and Organization Directories

- [ ] Save repeat attendees and organization representatives.
- [ ] Add saved entries back into a meeting.
- [ ] Confirm attendee presets never contain signatures.
- [ ] Confirm meeting-time organization snapshots remain stable after directory changes.
- [ ] Export and import directory JSON.
- [ ] Export attendee directory CSV.

## Record Readiness and Release Audit

- [ ] Remove the title and confirm readiness reports it.
- [ ] Add an unsigned attendee and confirm a warning.
- [ ] Add an unassigned task and confirm a warning.
- [ ] Add an active hold without a reason and confirm the release audit reports an error.
- [ ] Remove a non-permanent retention review date and confirm a warning.
- [ ] Run the v1.0 Release Gate.
- [ ] Export the release audit JSON.

## Save, Edit, and Revision History

- [ ] Save a new record.
- [ ] Confirm schema version is `1.1.0`.
- [ ] Confirm governance, consent, retention, redaction, attachment, and audit metadata are present.
- [ ] Open the record for editing.
- [ ] Confirm all fields restore.
- [ ] Change a field and save.
- [ ] Confirm the existing record updates rather than duplicating.
- [ ] Open Revision History.
- [ ] Compare revisions.
- [ ] Restore an older revision.
- [ ] Confirm the current state was preserved before restoration.

## Archive Vault

- [ ] Archive a normal active record.
- [ ] Search and filter the archive.
- [ ] Select filtered records and export JSON.
- [ ] Restore a record.
- [ ] Confirm ID conflict handling does not overwrite an active record.
- [ ] Permanently delete a non-held record only after confirmation.
- [ ] Confirm a held record cannot be permanently deleted.

## Consolidated Records Workspace

- [ ] Search active and archived records together.
- [ ] Filter by source, classification, and release readiness.
- [ ] Open active records for editing.
- [ ] Open archived records in the detail view.
- [ ] Export the filtered index.
- [ ] Run synchronous, asynchronous, and attachment provider health checks.

## Partner-Safe Export

- [ ] Create a source record containing signatures, internal notes, contact data, tasks, decisions, and an attachment location.
- [ ] Select Partner Safe and preview.
- [ ] Confirm typed signatures, consent, verification, signed timestamps, notes, contacts, policy notes, and file locations are absent.
- [ ] Confirm operational decisions, tasks, agenda, summary, and allowed attachment metadata remain.
- [ ] Download JSON and HTML.
- [ ] Confirm the source record is unchanged.
- [ ] Confirm the package includes a redaction manifest.
- [ ] Confirm `signatureDataIncluded` is `false`.

## Public Summary and Custom Export

- [ ] Select Public Summary.
- [ ] Confirm only high-level metadata, organizations, completed agenda, approved decisions, and summary remain.
- [ ] Select Custom External Copy.
- [ ] Test each section checkbox.
- [ ] Include discussion notes and confirm a manual-review warning.
- [ ] Confirm signatures remain excluded under every option.
- [ ] Switch to a role that cannot export and confirm the workflow is blocked.

## Integrity and Export Activity

- [ ] On HTTPS or localhost, confirm external package integrity uses SHA-256.
- [ ] In a browser without Web Crypto, confirm the fallback is labeled FNV-1a-32 compatibility checksum.
- [ ] Confirm the app never calls either value a digital signature.
- [ ] Preview without downloading and confirm no activity entry is added.
- [ ] Download JSON and HTML and confirm activity entries are added.
- [ ] Export the activity log.
- [ ] Confirm it contains metadata and digest only, not meeting content.

## Attachment Index and Open Tasks

- [ ] Confirm saved attachment references appear in the Attachment Index.
- [ ] Confirm missing locations are flagged.
- [ ] Open the related record from the index.
- [ ] Export attachment CSV.
- [ ] Confirm open tasks appear in the task dashboard.
- [ ] Filter tasks and export CSV.

## Workspace Backup, Restore, and Merge

- [ ] Export a complete workspace backup.
- [ ] Confirm retention, hold, redaction log, archives, revisions, directories, templates, and settings are included.
- [ ] Preview replacement restore.
- [ ] Confirm a pre-restore recovery package is created.
- [ ] Test workspace merge with prefer-newest, keep-local, and keep-both strategies.
- [ ] Confirm a pre-merge recovery package is created.
- [ ] Confirm migration and recovery checksums remain valid.

## Migration

- [ ] Seed v0.9 or v1.0 active, archived, revision, and draft records.
- [ ] Reload and confirm migration to `1.1.0`.
- [ ] Confirm unknown fields remain.
- [ ] Confirm retention and redaction defaults are added.
- [ ] Reload again and confirm migration is idempotent.
- [ ] Inspect `methodzMigrationState`.

## Export and Import

- [ ] Download current meeting as TXT and JSON.
- [ ] Export saved record JSON and HTML.
- [ ] Export all records.
- [ ] Import exported records.
- [ ] Confirm imported fields survive normalization and migration.
- [ ] Confirm partner-safe packages are not mistaken for complete workspace backups.

## Draft

- [ ] Enter unsaved meeting, governance, retention, decisions, tasks, and attachments.
- [ ] Wait for auto-save.
- [ ] Refresh and confirm draft restoration.
- [ ] Clear the draft.
- [ ] Confirm saved records remain untouched.

## Archive Detail and Print

- [ ] Open `archive.html` from an active record.
- [ ] Confirm attendance, consent, governance, retention, hold status, tasks, attachments, and audit are readable.
- [ ] Confirm an active hold warning is visible.
- [ ] Print or save PDF.
- [ ] Confirm interactive controls and workspace dashboards are hidden.

## Accessibility and Mobile

- [ ] Navigate the complete app using keyboard only.
- [ ] Confirm focus remains visible.
- [ ] Confirm dynamic controls have associated labels.
- [ ] Confirm meaningful status changes are announced.
- [ ] Confirm reduced-motion preference is respected.
- [ ] Test phone width.
- [ ] Confirm controls stack without horizontal page scrolling.
- [ ] Confirm redaction preview scrolls inside its own container.
- [ ] Confirm disabled held-record deletion communicates why it is unavailable.

## Failure Conditions

Do not mark a release stable if:

- direct-file mode fails
- signatures can save without consent
- an external copy contains signature or verification data
- redaction mutates the source record
- a held record can be permanently deleted
- migration removes unknown fields
- restore or merge lacks a recovery package
- local role selection is described as authentication
- a checksum is described as a digital signature
- the service worker caches meeting data
