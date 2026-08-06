# Workspace Home

## Purpose

`index.html` is the static root entry point for Methodz Meeting Manager. It makes the existing lifecycle visible without turning the application into a framework, dashboard service, or hosted platform.

The page has two responsibilities:

1. launch established Preparation, Meeting-Day, Decision Register, Meeting Outcomes, Archive, and Verify workflows;
2. optionally derive a bounded counts-only snapshot after an explicit operator refresh.

The page does not create, edit, save, archive, assign, notify, transfer, synchronize, or deliver meeting data.

## Architecture

```text
index.html
  -> style.css
  -> workspace-home.css
  -> config.js
  -> workspace-home-core.js
  -> workspace-home.js

Explicit operator refresh only
  -> browser-local records key
  -> workspace-home-core.js
  -> aggregate counts
  -> Workspace Home metrics
```

`workspace-home-core.js` is portable and side-effect free. It has no DOM, storage, network, provider, timer, download, service-worker, or mutation dependency.

`workspace-home.js` does not read the records key during page initialization. The only business-record read occurs inside `refreshSnapshot()`, which is bound to **Refresh Workspace Snapshot**.

## Aggregate signals

The snapshot reports:

### Meeting counts

- **Active meetings**: records not marked Completed, Archived, Cancelled, or Canceled.
- **Completed meetings**: records with status `Completed`.
- **Archived meetings**: records with status `Archived`.
- **Upcoming active meetings**: active records with a valid meeting date on or after the current date.
- **Unscheduled active meetings**: active records with a missing or invalid meeting date.

### Incomplete-task counts

Only meaningful tasks in active meetings are evaluated. A task is meaningful when task text, Assigned To, or due date has a value. Completed tasks are excluded.

- **Overdue**: valid due date before today.
- **Unassigned**: Assigned To is empty.
- **Needs scheduling**: due date is missing or invalid.

A single incomplete task may appear in more than one aggregate signal. These counts are workload signals, not mutually exclusive lanes.

## Privacy boundary

The portable snapshot retains counts, bounds, a date, a report type/version, and generation metadata only. It never returns or retains:

- meeting titles or meeting numbers;
- attendee names;
- notes, decisions, summaries, or task text;
- Assigned To values;
- record identifiers;
- consent values or signatures;
- credentials, private keys, or provider secrets;
- queue payloads;
- hidden governance metadata.

The browser presentation renders only the aggregate report. It does not keep a second copy of source records after the explicit refresh returns.

## Bounded processing

Default browser limits are:

```text
Records:          1000
Tasks per record: 250
```

The portable core supports tighter bounds for tests and future field evidence. When a source collection exceeds a bound, the report exposes aggregate truncation metadata only. The browser shows a warning and does not represent the snapshot as complete.

## PWA identity and installed launch

`manifest.webmanifest` keeps the established application identity:

```json
"id": "./meeting.html"
```

The installed launch route is now:

```json
"start_url": "./index.html"
```

This changes the installed entry surface without creating a second PWA identity.

The service worker pre-caches only Workspace Home static assets and continues to exclude business data. Offline navigation falls back to `index.html`, with `meeting.html` retained as a secondary shell fallback.

## Deployment boundary

Workspace Home preserves the current release constraints:

- application shell `1.6.12`;
- meeting-record schema `1.6.0`;
- plain HTML, CSS, and JavaScript;
- no build command or required runtime package;
- browser-local storage as the default provider;
- no production backend or provider endpoint;
- no background synchronization;
- no deployment over `hub.methodz.ca`.
