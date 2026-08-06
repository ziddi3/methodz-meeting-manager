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
```

The application shell may gain static workspaces without changing the meeting-record schema.

## Static entry points

```text
index.html        Workspace Home, lifecycle launchpad, and explicit aggregate counts-only snapshot
meeting.html      Main meeting capture, Meeting-Day, closeout, follow-up, and infrastructure workspace
preparation.html  Read-only upcoming-meeting preparation brief and run-sheet preview
decisions.html    Read-only structured Decision Register and source review
outcomes.html     Read-only completed-meeting outcomes review
archive.html      Record detail and print surface
verify.html       Standalone signed-package verifier
```

All entry points remain ordinary static HTML. Core meeting operation requires no framework, runtime package, build command, mandatory server, account, or network connection.

The PWA keeps its established `./meeting.html` application identity while `./index.html` becomes the installed launch route. This avoids changing the installed-app identity merely to introduce a safer root navigation surface.

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
```

Every derived workspace is read-only by default. Record loading, download, print, backup, restore, synchronization rehearsal, transfer, acceptance, rollback, release, and destructive operations remain explicit operator actions.

## Workspace Home snapshot boundary

`workspace-home-core.js` receives records only after the operator selects **Refresh Workspace Snapshot**. It returns aggregate counts for active, completed, archived, upcoming, and unscheduled meetings plus incomplete-task overdue, unassigned, and needs-scheduling signals.

The portable report retains no meeting title, attendee name, note, decision, summary, task text, Assigned To value, record identifier, signature, credential, key, provider secret, queue payload, or hidden governance metadata. Record and per-record task processing are bounded, and the browser view warns when a bound is reached instead of presenting a truncated snapshot as complete.

## Data and deployment boundaries

- Browser-local storage remains the default provider.
- Workspace Home does not read meeting records on page load.
- The service worker caches static assets only and never reads business records.
- No production Firebase, Supabase, Drive, CRM, or Methodz API provider is active.
- Browser-local workflow evidence does not prove identity, authority, delivery, legal approval, or regulatory compliance.
- This task-focused repository must not be deployed over `hub.methodz.ca`.
