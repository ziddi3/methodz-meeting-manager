# Meeting Outcomes Review

## Purpose

`outcomes.html` is a static, read-only workspace for reviewing completed and archived meeting records after closeout. It reports capture and follow-up state without copying protected meeting content or changing source records.

The review answers three bounded questions for each finished meeting:

1. Is a meeting summary recorded?
2. Are structured decisions present and free from required-field errors?
3. Is follow-up work recorded, fully set up, and completed?

It does not answer whether a task implements a particular decision. Decisions and tasks are merely co-located in the same source meeting.

## Architecture

```text
Browser-local saved records
  -> meeting-outcomes-core.js
  -> meeting-outcomes.js
  -> outcomes.html

Explicit source review
  -> meeting-preparation-launch-core.js
  -> validated URL fragment
  -> features-v1614-preparation-launch.js
  -> Summary, Decisions, or Follow-Up Tasks panel
```

`meeting-outcomes-core.js` is deterministic and side-effect free. It has no DOM, storage, network, provider, timer, download, service-worker, or mutation dependency.

The browser workspace reads storage only after **Refresh Outcomes**. State and text filters operate on the in-memory report. CSV generation occurs only after **Download Visible CSV**.

## Outcome states

Eligible records have a meeting status of `Completed` or `Archived`.

Each eligible meeting is placed in one state:

- **Ready**: summary recorded, structured decision capture reviewed, and follow-up tasks recorded, complete, and fully configured.
- **Needs Summary**: only the summary checkpoint needs review.
- **Needs Decision Review**: only structured decision capture needs review.
- **Needs Follow-Up Review**: only follow-up capture or completion needs review.
- **Needs Multiple Reviews**: two or more checkpoints need review.

A meeting needs decision review when it has no meaningful structured decision entry, a structured entry has missing required values or an invalid date, or the bounded decision list is truncated. Free-form decision text is never copied or parsed.

A meeting needs follow-up review when it has no meaningful task, an incomplete task, a task with missing setup or an invalid due date, or a bounded task list is truncated.

## Bounded processing

The browser requests these limits:

- 500 completed or archived records;
- 100 structured decisions per record;
- 250 follow-up tasks per record.

Truncation is exposed. A truncated source collection is never presented as ready.

## Safe source handoff

The shared launch contract now supports:

- `summary` -> `meetingSummaryPanelV1610` / `#summary`;
- `decisions` -> `decisionsMadePanelV1610` / `#decisions`;
- `tasks` -> `followUpTasksPanelV1610` / `.task-name`;
- source `outcomes` -> return route `outcomes.html`.

The source link is encoded in a URL fragment, validated on arrival, removed from the address bar, and consumed only after an operator click. Missing records fail visibly. No save, task update, status change, archive, transfer, provider call, or synchronization occurs.

## Privacy boundary

The on-screen review and CSV include:

- meeting number, title, date, and status;
- outcome state;
- summary-present boolean;
- aggregate structured-decision lane counts;
- free-form-decision-present boolean;
- aggregate task counts and setup-issue count.

They exclude:

- raw record identifiers;
- attendees, roles, signatures, and consent;
- discussion notes and summary text;
- free-form and structured decision text, approver values, and decision conditions;
- task text and Assigned To values;
- attachments, credentials, private keys, and provider secrets;
- transfer and synchronization payloads;
- hidden governance metadata.

The in-memory report carries the exact source record reference only for explicit handoff. CSV serialization omits it and prefixes formula-shaped cells for spreadsheet safety.

## Deployment boundary

The feature preserves:

- application shell `1.6.12`;
- meeting-record schema `1.6.0`;
- plain HTML, CSS, and JavaScript;
- static hosting and direct-file-compatible core meeting operation;
- browser-local storage as the default provider;
- no build command or runtime package;
- no backend or production endpoint;
- no automatic summary generation, decision interpretation, decision-to-task linking, assignment, notification, save, archive, transfer, provider write, or synchronization;
- the prohibition on deploying this repository over `hub.methodz.ca`.
