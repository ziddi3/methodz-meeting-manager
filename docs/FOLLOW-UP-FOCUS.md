# Follow-Up Focus Hardening

## Purpose

Follow-Up Focus is a read-only triage layer inside the existing Follow-Up Review. It helps an operator decide what to open next without changing any meeting record, task status, assignment, due date, archive state, synchronization queue, or provider state.

The feature remains part of the task-focused Methodz Meeting Manager. It is not Method Hub, Nexus Hub, the Cathedral, a storefront, or a production provider.

## Architecture

`meeting-review-core.js` remains the portable, DOM-free source of truth. Its `buildFollowUpFocus(review, options)` function accepts an existing Follow-Up Review report and derives:

- a bounded focus queue of incomplete tasks;
- urgency bands: urgent, needs setup, due soon, active, and planned;
- plain-language reasons such as overdue age, missing Assigned To, invalid or missing due date, due-soon timing, active status, and high priority;
- bounded Assigned To workload summaries;
- a deterministic next action.

The browser layer in `features-v1611-follow-up-review.js` renders that derived report in the existing Follow-Up Review panel. It does not introduce a new record field or migration.

## Ordering contract

Focus items are ordered by:

1. focus band;
2. configured task priority meaning;
3. due date;
4. most recently updated source record;
5. meeting title and task position as stable tie-breakers.

Completed tasks are excluded. The queue and Assigned To summary are bounded by configuration.

## Safety boundaries

Follow-Up Focus:

- does not save or mutate records while rendering;
- does not update task status automatically;
- does not assign people automatically;
- does not send reminders or contact assignees;
- does not synchronize in the background;
- does not create provider credentials or endpoints;
- does not export signatures, consent details, private keys, credentials, queue payloads, or hidden governance metadata;
- requires an explicit operator action before opening a source meeting for editing.

The focus controls are marked as non-meeting control surfaces so they do not schedule meeting-draft autosave.

## Configuration

`config-v1611.js` exposes:

```text
followUpReview.version = 1.1.0
followUpReview.focusEnabled = true
followUpReview.focusMaximumItems = 7
followUpReview.focusMaximumAssignees = 8
followUpReview.automaticReminderDelivery = false
```

The meeting-record schema remains `1.6.0`, the deployed app shell remains `1.6.12`, and no runtime dependency or build step is added.
