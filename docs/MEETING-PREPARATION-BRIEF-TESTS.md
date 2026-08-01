# Meeting Preparation Brief Tests

## Automated workflow

The dedicated GitHub Actions workflow is:

```text
.github/workflows/meeting-preparation.yml
```

It runs when the preparation core, presentation, entry point, styles, tests, documentation, or workflow changes.

## Portable core coverage

Run locally with Node 22 or later:

```text
node tests/meeting-preparation-core.mjs
```

The portable suite verifies:

- strict calendar-date parsing, including leap years;
- active meeting and horizon selection;
- visibility of active records with missing or invalid dates;
- deterministic needs-scheduling and upcoming ordering;
- the seven-field readiness model;
- same-calendar-date pressure reporting;
- exclusion of archived and completed meetings from the preparation queue;
- carryover selection from earlier dated meetings only;
- exclusion of completed, target-record, same-day, future-source, and post-meeting-due tasks;
- missing and invalid task dates remaining visible for review;
- bounded meeting and carryover output;
- source-record immutability;
- exclusion of notes, decisions, summaries, signatures, credentials, private keys, and access tokens from derived output.

## Static boundary checks

The workflow also checks:

- required files are present;
- JavaScript syntax is valid;
- `preparation.html` loads the data adapter, portable core, browser presentation, and stylesheet;
- the browser layer reads through the established adapter boundary;
- the entry point exposes explicit refresh, CSV download, and return navigation;
- no Method Hub deployment hostname is present;
- the presentation does not call record replacement, upsert, or deletion functions;
- no service-worker synchronization or periodic synchronization handler is introduced.

## Manual browser rehearsal

Use disposable browser-local records.

1. Open `meeting.html` from the same origin that will serve `preparation.html`.
2. Save one complete upcoming meeting.
3. Save one upcoming meeting with a missing location, facilitator, attendee, or agenda.
4. Save two active meetings on the same date.
5. Save an earlier meeting with pending, completed, missing-date, invalid-date, and later-due tasks.
6. Open `preparation.html`.
7. Confirm the metrics, readiness checks, same-day warning, and carryover list match the saved records.
8. Change the planning horizon, reload, and confirm the display preference returns.
9. Download the CSV and confirm it contains only preparation columns.
10. Return to `meeting.html` and confirm no meeting or task value changed.

## Narrow-screen rehearsal

At approximately 360 CSS pixels wide, confirm:

- no horizontal page overflow;
- controls remain at least 44 CSS pixels high;
- the readiness score does not obscure the meeting title;
- the two-column meeting detail grid collapses to one column;
- long task and meeting titles wrap without clipping.

## Security and privacy review

Inspect the page, downloaded CSV, browser storage, and console output. Confirm that the preparation workflow does not emit:

- notes, decisions, or summary text;
- consent or typed signatures;
- private key or private JWK fields;
- credential, token, or provider-secret values;
- synchronization queue payloads;
- automatic writes, notifications, assignments, or network requests.

A passing rehearsal proves deterministic client behavior against the tested records. It does not establish authenticated identity, calendar availability, legal approval, production-provider readiness, or reliable cross-device delivery.
