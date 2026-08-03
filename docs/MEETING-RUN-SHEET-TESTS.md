# Meeting Run Sheet Test Plan

## Portable core

Run:

```text
node tests/meeting-run-sheet-core.mjs
```

Coverage includes:

- deterministic meeting identity, readiness, organization, attendee, agenda, and carryover output;
- source-record immutability;
- bounded organization, attendee, agenda, and carryover lists;
- explicit truncation state;
- rejection of missing source records;
- exclusion of record IDs, notes, decisions, summaries, signatures, consent, attachments, credentials, private keys, queue payloads, and unapproved carryover properties.

## Chromium rehearsal

Run from a static server:

```text
npx playwright test tests/meeting-run-sheet.spec.js --reporter=line
```

Coverage includes:

- explicit per-card preview action;
- single-meeting dialog rendering;
- agenda and bounded carryover visibility;
- protected-field exclusion from rendered text;
- explicit print invocation;
- dialog close behavior;
- browser-local record and draft preservation;
- visible missing-record failure;
- 44-pixel phone controls and viewport containment.

## Static boundary checks

The dedicated workflow verifies:

- required files and script order;
- JavaScript syntax;
- service-worker static asset references;
- documentation presence;
- no `hub.methodz.ca` deployment identity;
- no record replacement, upsert, deletion, save, archive, storage write, background synchronization, or provider mutation calls in the run-sheet feature.

## Manual rehearsal

1. Save one upcoming meeting with organizations, attendees, and agenda items.
2. Save an earlier meeting with an incomplete task due before the upcoming meeting.
3. Open `preparation.html` and preview the upcoming meeting's run sheet.
4. Confirm the packet contains setup, agenda, and carryover information only.
5. Confirm notes, decisions, summary, consent, signatures, and attachments are absent.
6. Print to PDF or paper and inspect the single-sheet layout.
7. Close the preview and confirm no meeting fields, saved records, or drafts changed.
8. Repeat at a narrow phone viewport.
