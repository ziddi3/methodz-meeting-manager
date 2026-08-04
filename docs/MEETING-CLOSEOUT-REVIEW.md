# Meeting Closeout Review

## Purpose

Meeting Closeout Review is an explicit, read-only checkpoint inside `meeting.html`. It helps an operator inspect whether the current meeting form has the capture needed for a deliberate closeout before saving, exporting, changing status, or archiving.

The review never performs those actions. It reports what is present and moves focus only after an operator presses a control.

## Checkpoints

The portable core derives seven ordered checkpoints:

1. meeting status is `Completed` or `Archived`;
2. at least one attendee has a name;
3. at least one agenda item exists and all meaningful agenda items are checked;
4. discussion notes are present;
5. decisions are present;
6. at least one meaningful follow-up task exists and every task has a task description, Assigned To value, valid due date, and status;
7. a meeting summary is present.

A meeting with no decisions or no follow-up tasks is not silently interpreted as complete. The operator can record that none were made or required in the appropriate capture field.

## Architecture

```text
Current meeting form
  -> collectMeetingData({ keepEmptyRows: true, forceNewId: true })
  -> meeting-closeout-core.js
  -> features-v1616-meeting-closeout.js
  -> Meeting Closeout Review panel
```

`meeting-closeout-core.js` has no DOM, storage, network, provider, timer, download, service-worker, or mutation dependency. It returns only checkpoint states and aggregate counts.

The browser feature:

- runs only after **Review Meeting Closeout**;
- renders the checkpoint result;
- focuses the first incomplete section only after **Focus Next Review Item**;
- downloads a metadata-only JSON report only after an explicit operator action;
- invalidates the displayed review when the meeting form changes, disabling focus and download until a fresh review is run;
- never calls save, archive, delete, transfer, provider, or synchronization functions.

Using `forceNewId` prevents the read-only snapshot from inheriting the currently edited saved-record identity. The portable core would exclude that identity in either case, but the browser layer avoids carrying it farther than necessary.

## Bounded review

The review is bounded to:

- 250 attendee rows;
- 500 agenda rows;
- 250 follow-up task rows.

If a source collection exceeds its bound, the affected checkpoint fails closed and the interface reports that manual review is required. Truncation is never presented as a complete result.

## Privacy boundary

The derived review and downloaded JSON exclude:

- meeting title and meeting number;
- record identifiers;
- dates and locations;
- attendee names, roles, consent, and signatures;
- agenda text;
- discussion notes;
- decisions;
- task text and Assigned To values;
- summary text;
- attachments;
- credentials and private keys;
- provider secrets;
- queue payloads;
- hidden governance metadata.

The metadata report contains report version, generation time, checkpoint states, aggregate counts, configured limits, and truncation flags only.

## Meeting-Day integration

The panel is registered as a non-required shell panel with Meeting-Day priority `85`, between **Summary** and **Save**. It is not a meeting-record schema field and does not change the nine required capture panels.

## Deployment boundary

The feature preserves:

- app shell `1.6.12`;
- meeting-record schema `1.6.0`;
- plain HTML, CSS, and JavaScript;
- direct-file and ordinary static hosting;
- browser-local storage as the default provider;
- no runtime package or build command;
- no backend or production endpoint;
- no automatic save, status change, assignment, completion, archive, transfer, delivery, provider call, or synchronization;
- the prohibition on deploying this task-focused tool over `hub.methodz.ca`.
