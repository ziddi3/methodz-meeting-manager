# Meeting Run Sheet

## Purpose

The Meeting Run Sheet is an operator-controlled, read-only preparation packet for one saved meeting. It lives inside `preparation.html` and turns the existing preparation brief into a practical meeting-day handoff without changing the source record.

It is a task-focused Methodz Meeting Manager capability. It is not Method Hub, a calendar service, a notification system, a hosted provider, or an automatic coordinator.

## Operator workflow

1. Open `preparation.html` in the same browser storage context as `meeting.html`.
2. Select the desired planning horizon.
3. Choose **Preview Run Sheet** on a meeting card.
4. Review the single-meeting packet.
5. Optionally choose **Print Run Sheet**.
6. Close the preview when finished.

Preview and print actions never save, assign, complete, archive, transfer, synchronize, or externally deliver a record.

## Included information

The run sheet derives a bounded copy of:

- meeting number, title, date, status, location, and facilitator;
- the seven preparation-readiness requirements;
- selected organizations;
- attendee names and organization roles;
- agenda groups, items, and checked state;
- unresolved carryover tasks already derived by the Meeting Preparation Brief.

The packet is protected business data.

## Excluded information

The portable core and browser view intentionally exclude:

- source record identifiers from the printable packet;
- discussion notes and agenda notes;
- decisions and meeting summaries;
- attendance consent values;
- typed signatures;
- attachments and attachment contents;
- credentials, access tokens, and private keys;
- provider secrets;
- synchronization queue payloads;
- hidden governance metadata.

## Architecture

```text
Browser-local saved records
  -> data-adapter.js
  -> meeting-preparation-core.js
  -> meeting-run-sheet-core.js
  -> features-v1615-meeting-run-sheet.js
  -> explicit dialog preview and print
```

`meeting-run-sheet-core.js` is portable and side-effect free. It has no DOM, storage, network, provider, timer, service-worker, or print dependency. It accepts one record plus already-derived carryover items and returns a newly allocated, bounded packet.

`features-v1615-meeting-run-sheet.js` is the browser presentation layer. It reads through the established adapter boundary, finds the explicitly selected source record, builds the packet, renders with DOM text nodes, and opens the preview only after the operator clicks a button.

## Bounds

Default maximums are:

```text
Organizations: 20
Attendees: 40
Agenda items: 40
Carryover tasks: 20
```

The packet reports truncation rather than silently implying that a bounded list is complete.

## Failure behavior

- Missing source record: the preview stays closed and a visible no-change status is shown.
- Malformed browser-local storage: the preview stays closed and a visible no-change status is shown.
- Missing feature core: the preview stays closed.
- Print cancellation: no record or preference changes occur.

## Deployment boundary

- app shell remains `1.6.12`;
- meeting-record schema remains `1.6.0`;
- run-sheet core version is `1.0.0`;
- plain HTML, CSS, and JavaScript;
- no build command or runtime package;
- no backend, production endpoint, credential, or account requirement;
- browser-local storage remains the default provider;
- no background synchronization or service-worker business-data handling;
- no deployment over `hub.methodz.ca`.
