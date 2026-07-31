# Follow-Up Planning Brief

## Purpose

The Follow-Up Planning Brief turns incomplete tasks from saved active meeting records into a bounded, read-only horizon view. It helps an operator decide what requires attention today and over the next 7, 14, or 30 days without silently changing the source records.

This capability supports the direct purpose of Methodz Meeting Manager: meeting preparation, capture, analysis, follow-up, and records. It is not a reminder service, assignment engine, calendar replacement, CRM, Method Hub, or background synchronization system.

## Planning lanes

Incomplete tasks are placed into one deterministic lane:

1. **Overdue**: a valid due date before today.
2. **Due Today**: a valid due date equal to today.
3. **Within Planning Window**: a valid future due date inside the selected horizon.
4. **Needs Scheduling**: the due date is missing or invalid.
5. **Later**: a valid due date beyond the selected horizon.

Completed tasks are excluded.

Within each lane, tasks are ordered by configured priority, due date, most recent source-record update, meeting title, and task position. The same records and options therefore produce the same planning order.

## Assigned To outlook

The brief summarizes incomplete work by **Assigned To**. It reports open, overdue, due-today, in-window, needs-scheduling, in-progress, and high-priority counts.

Unassigned work is shown explicitly. The brief never assigns a person or changes an existing assignment.

## Operator workflow

1. Open **Follow-Up Review**.
2. Choose a 7, 14, or 30 day planning window.
3. Select **Refresh Plan** to rebuild the read-only brief from saved active records.
4. Review planning lanes and Assigned To outlook.
5. Select **Open Meeting** to load a source record for explicit editing.
6. Select **Download Planning CSV** only when a portable working copy is required.

Changing the planning window stores only a local display preference. It does not save a meeting draft or update a meeting record.

## Export boundary

The CSV is generated only after an explicit operator action. It contains:

- planning lane;
- meeting number, title, and date;
- task text;
- Assigned To;
- priority;
- due date;
- status;
- planning reasons.

It excludes:

- typed signatures;
- consent details;
- attendance signatures;
- meeting notes and decisions;
- private signing keys and private JWK parameters;
- credentials, tokens, API keys, and provider secrets;
- synchronization or transfer queue payloads;
- hidden governance metadata.

The CSV still contains business data and must be protected accordingly.

## Architecture

```text
saved active records
  -> existing meeting-review-core.js
  -> side-effect-free follow-up-planning-core.js
  -> features-v1613-follow-up-planning.js
  -> read-only planning lanes and explicit CSV export
```

`follow-up-planning-core.js` is portable and has no DOM, storage, network, timer, or provider dependency. It accepts the existing Follow-Up Review report and returns a new planning report without mutating the input.

The browser layer reads saved records through the established application boundary, renders the planning report, stores the selected horizon as a local preference, and delegates **Open Meeting** to the existing explicit editing workflow.

The planning assets are loaded by `config-v1611.js` and included in the static service-worker app shell. The feature remains compatible with direct static hosting and ordinary `file:` use.

## Preserved deployment and governance boundaries

- App shell remains `1.6.12`.
- Meeting-record schema remains `1.6.0`.
- Plain HTML, CSS, and JavaScript remain the runtime.
- No build command or required runtime package is introduced.
- No backend, production endpoint, account system, or hosted provider is introduced.
- Browser-local storage remains the default provider.
- No task status, due date, priority, or assignment is changed automatically.
- No reminder, email, notification, calendar event, or CRM update is sent.
- No background synchronization is registered.
- The service worker caches static assets only and never reads planning or meeting data.
- This repository must not deploy over `hub.methodz.ca`.
