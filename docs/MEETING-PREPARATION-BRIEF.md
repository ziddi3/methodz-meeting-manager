# Meeting Preparation Brief

## Purpose

The Meeting Preparation Brief is a read-only workspace for preparing upcoming meetings from saved Methodz Meeting Manager records.

It keeps the direct product goal in front: help an operator arrive at a meeting with the basic setup complete and unresolved earlier work visible. It is not Method Hub, a hosted calendar, a notification system, a CRM replacement, or an automatic meeting coordinator.

Open:

```text
preparation.html
```

The page must run in the same browser storage context as `meeting.html` to see the same browser-local records.

## What it reports

For each active meeting within the selected 7, 14, 30, or 60 day horizon, the brief derives:

- meeting date and days remaining;
- location or video-link readiness;
- facilitator readiness;
- organization selection;
- attendee setup;
- agenda setup;
- a deterministic preparation percentage;
- other active meetings sharing the same calendar date;
- bounded unresolved tasks from earlier dated meetings that are due on or before the upcoming meeting.

Active records without a valid date remain visible in a **Needs scheduling** lane instead of disappearing from the brief.

A same-day warning means only that two or more active records share a date. Meeting records currently do not contain a canonical time-range model, so the warning must not be represented as proof that times overlap.

## Readiness model

The portable core checks seven preparation requirements:

```text
Meeting title
Meeting date
Location or video link
Meeting facilitator
Organizations present
Attendee setup
Agenda setup
```

The percentage is the number of satisfied requirements divided by seven. It is a preparation aid, not an approval, compliance score, attendance proof, or guarantee that a meeting is ready.

## Carryover boundary

Carryover items are incomplete tasks from a different record with a valid meeting date earlier than the target meeting date.

A carryover is included when:

- the source meeting is earlier than the target meeting;
- the task is not completed;
- the task contains meaningful task, assignment, due-date, or status information; and
- its valid due date is on or before the target meeting, or its due date is missing or invalid and therefore still needs review.

Tasks belonging to the target meeting are not treated as carryover. Same-day and future meeting tasks are not treated as earlier work. Output is bounded by configuration and does not change task state.

## Architecture

```text
Browser-local saved records
  -> data-adapter.js
  -> meeting-preparation-core.js
  -> meeting-preparation.js
  -> preparation.html
```

`meeting-preparation-core.js` is portable and side-effect free. It has no DOM, storage, network, timer, provider, or service-worker dependency. It accepts records and explicit options, then returns a newly derived report.

`meeting-preparation.js` is the browser presentation layer. It:

- reads records through `MethodzMeetingData.listRecords()` when available;
- falls back to the established configured records key;
- stores only the selected horizon as an optional display preference;
- renders with DOM text nodes rather than interpolating meeting values into HTML;
- refreshes only after page load, horizon changes, or an explicit Refresh action;
- downloads CSV only after an explicit operator action.

The standalone entry point avoids adding another ordered feature layer to the already mature `meeting.html` shell. It remains ordinary static HTML, CSS, and JavaScript with no build command or runtime package.

## Record and privacy boundary

The workspace never calls record replacement, upsert, deletion, archive, transfer, synchronization, assignment, completion, or reminder functions.

The derived report and CSV exclude:

- discussion notes;
- decisions;
- meeting summaries;
- attendance consent values;
- typed signatures;
- credentials and access tokens;
- private keys and private JWK material;
- provider secrets;
- synchronization queue payloads;
- hidden governance metadata.

The visible brief still contains meeting setup and task information. Its CSV is protected business data and should be stored and shared accordingly.

## Deployment

The feature preserves the current application boundaries:

- app shell remains `1.6.12`;
- meeting-record schema remains `1.6.0`;
- browser-local storage remains the default provider;
- direct static hosting remains supported;
- no backend, production endpoint, account system, credential, framework, build step, or runtime dependency is introduced;
- no background synchronization or service-worker processing is introduced;
- no deployment over `hub.methodz.ca`.

For dependable shared storage, serve `meeting.html` and `preparation.html` from the same origin and path scope. Browser behavior for `localStorage` on separate `file:` URLs is implementation-dependent, so an ordinary localhost or static-host origin is recommended for routine use.

## Limitations

- Records are only as current as the browser-local workspace being viewed.
- The brief does not authenticate an operator or prove authority.
- Same-day counts do not inspect calendar times.
- Carryover logic does not infer task dependencies or project relationships.
- Missing or invalid due dates are surfaced for review rather than silently repaired.
- No message, reminder, assignment, calendar invitation, or external delivery is generated.
