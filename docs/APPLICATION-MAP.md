# Methodz Meeting Manager Application Map

## Release boundary

```text
Application shell:              1.6.12
Meeting-record schema:          1.6.0
Meeting review core:            1.1.0
Follow-up planning core:        1.0.0
Workspace capacity core:        1.0.0
Workspace Home core:            1.0.0
Meeting preparation core:       1.0.0
Preparation launch contract:    1.2.0
Meeting run-sheet core:         1.0.0
Meeting closeout core:          1.0.0
Decision Register core:         1.0.0
Meeting Outcomes core:          1.0.0
Field Rehearsal core:           1.0.0
Performance Evidence core:      1.0.0
Field Evidence Coverage core:   1.0.0
```

The application shell may gain static workspaces without changing the meeting-record schema.

## Static entry points

```text
index.html        Workspace Home, lifecycle launchpad, and explicit aggregate counts-only snapshot
meeting.html      Main meeting capture, Meeting-Day, closeout, follow-up, and infrastructure workspace
preparation.html  Read-only upcoming-meeting preparation brief and run-sheet preview
decisions.html    Read-only structured Decision Register and source review
outcomes.html     Read-only completed-meeting outcomes review
rehearsal.html    Metadata-only physical-device field rehearsal evidence
performance.html  Metadata-only Workspace Capacity performance evidence comparison
evidence.html     Metadata-only exact-commit physical-device evidence coverage matrix
archive.html      Record detail and print surface
verify.html       Standalone signed-package verifier
```

All entry points remain ordinary static HTML. Core meeting operation requires no framework, runtime package, build command, mandatory server, account, or network connection.

The PWA keeps its established `./meeting.html` application identity while `./index.html` is the installed launch route. This avoids changing the installed-app identity merely to introduce safer root navigation and evidence workspaces.

## Direct meeting lifecycle

```text
Workspace Home
  -> Preparation Brief
  -> explicit source opening
  -> Meeting-Day capture
  -> Meeting Closeout Review
  -> Follow-Up Review and Planning Brief
  -> Decision Register
  -> Meeting Outcomes Review
  -> Archive / Verify as operator-selected supporting workflows

Evidence side paths
  -> Field Rehearsal Evidence
  -> Field Evidence Coverage Matrix
  -> Performance Evidence Compare
```

Every derived meeting workspace is read-only by default. Record loading, download, print, backup, restore, synchronization rehearsal, transfer, acceptance, rollback, release, and destructive operations remain explicit operator actions.

## Workspace Home snapshot boundary

`workspace-home-core.js` receives records only after the operator selects **Refresh Workspace Snapshot**. It returns aggregate counts for active, completed, archived, upcoming, and unscheduled meetings plus incomplete-task overdue, unassigned, and needs-scheduling signals.

The portable report retains no meeting title, attendee name, note, decision, summary, task text, Assigned To value, record identifier, signature, credential, key, provider secret, queue payload, or hidden governance metadata. Record and per-record task processing are bounded, and the browser view warns when a bound is reached instead of presenting a truncated snapshot as complete.

## Evidence workspaces

`rehearsal.html` captures structured physical-device metadata only after explicit operator actions. It does not read meeting records or browser-local business values.

`evidence.html` accepts only explicitly selected metadata-only Field Rehearsal reports. Accepted evidence is normalized through `evidence-coverage-core.js`, bounded to 50 reports, held in memory only, and evaluated for one exact commit SHA at a time. Evidence from different commits is never silently combined.

`performance.html` accepts only explicitly selected metadata-only Workspace Capacity rehearsal reports. Accepted evidence is normalized through `performance-evidence-core.js`, bounded to 20 runs, held in memory only, and compared without reading or writing browser storage.

None of the evidence workspaces proves device identity, delivery, authorization, legal approval, regulatory compliance, or production readiness by itself.

## Data and deployment boundaries

- Browser-local storage remains the default meeting-record provider.
- Workspace Home does not read meeting records on page load.
- Field Rehearsal does not read meeting records or browser-local business values.
- Field Evidence Coverage does not read or write browser storage and evaluates only explicitly imported metadata reports.
- Performance Evidence does not read or write browser storage and imports reports only after explicit operator action.
- The service worker caches static assets only and never reads business records.
- No production Firebase, Supabase, Drive, CRM, or Methodz API provider is active.
- Browser-local workflow evidence does not prove identity, authority, delivery, legal approval, or regulatory compliance.
- This task-focused repository must not be deployed over `hub.methodz.ca`.
