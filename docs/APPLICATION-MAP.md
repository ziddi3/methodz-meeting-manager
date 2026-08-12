# Methodz Meeting Manager Application Map

## Release boundary

```text
Application shell:                 1.6.12
Meeting-record schema:             1.6.0
Meeting review core:               1.1.0
Follow-up planning core:           1.0.0
Workspace capacity core:           1.0.0
Workspace Home core:               1.0.0
Meeting preparation core:          1.0.0
Preparation launch contract:       1.2.0
Meeting run-sheet core:            1.0.0
Meeting closeout core:             1.0.0
Decision Register core:            1.0.0
Meeting Outcomes core:             1.0.0
Field Rehearsal core:              1.0.0
Field Rehearsal launch core:       1.0.0
Field Evidence Integrity core:     1.0.0
Field Rehearsal return core:       1.1.0
Performance Evidence core:         1.0.0
Field Evidence Coverage core:      1.0.0
Field Evidence Remediation core:   1.0.0
Field Evidence Rerun core:         1.0.0
```

The application shell may gain static workspaces and portable computation helpers without changing the meeting-record schema.

## Static entry points

```text
index.html        Workspace Home, lifecycle launchpad, and explicit aggregate counts-only snapshot
meeting.html      Main meeting capture, Meeting-Day, closeout, follow-up, and infrastructure workspace
preparation.html  Read-only upcoming-meeting preparation brief and run-sheet preview
decisions.html    Read-only structured Decision Register and source review
outcomes.html     Read-only completed-meeting outcomes review
rehearsal.html    Metadata-only physical-device field rehearsal evidence and explicit return-to-coverage action
performance.html  Metadata-only Workspace Capacity performance evidence comparison
evidence.html     Metadata-only exact-commit coverage, remediation, rerun planning, rehearsal launch, and receipt-verified return guidance
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

Evidence side path
  -> exact-commit Field Evidence Coverage Matrix
  -> explicit Remediation Worklist
  -> explicit exact-commit Rerun Plan
  -> explicit Field Rehearsal launch handoff
  -> real-hardware Field Rehearsal
  -> explicit metadata evidence download + SHA-256 receipt
  -> explicit return-to-coverage handoff
  -> operator file selection and Load Selected Evidence
  -> exact-byte receipt verification + row/commit/readiness cross-check
  -> explicit exact-commit Coverage Matrix refresh

Performance side path
  -> Workspace Capacity rehearsal reports
  -> Performance Evidence Compare
```

Every derived meeting workspace is read-only by default. Record loading, download, print, backup, restore, synchronization rehearsal, transfer, acceptance, rollback, release, and destructive operations remain explicit operator actions.

## Workspace Home snapshot boundary

`workspace-home-core.js` receives records only after the operator selects **Refresh Workspace Snapshot**. It returns aggregate counts for active, completed, archived, upcoming, and unscheduled meetings plus incomplete-task overdue, unassigned, and needs-scheduling signals.

The portable report retains no meeting title, attendee name, note, decision, summary, task text, Assigned To value, record identifier, signature, credential, key, provider secret, queue payload, or hidden governance metadata. Record and per-record task processing are bounded, and the browser view warns when a bound is reached instead of presenting a truncated snapshot as complete.

## Evidence workspaces

`rehearsal.html` captures structured physical-device metadata only after explicit operator actions. It does not read meeting records or browser-local business values.

`evidence.html` accepts only explicitly selected metadata-only Field Rehearsal reports. Accepted evidence is normalized through `evidence-coverage-core.js`, bounded to 50 reports, held in memory only, and evaluated for one exact commit SHA at a time. Evidence from different commits is never silently combined.

After one commit has been evaluated, the operator may explicitly build a remediation worklist. `evidence-remediation-core.js` accepts only the established coverage contract, requires the six documented rows, discards unknown input properties, excludes `ready` rows, and maps unresolved states deterministically:

```text
fail        -> code-remediation
blocked     -> environment-remediation
incomplete  -> evidence-completion
missing     -> evidence-collection
```

The worklist is bounded to six rows and held in memory only. JSON worklist summaries and Markdown issue drafts require explicit download actions. The static application never calls the GitHub API and never creates an issue automatically. A draft is an operator aid, not proof that a software defect exists.

After the remediation worklist is current, the operator may explicitly build a rerun plan. `evidence-rerun-core.js` validates the exact coverage/worklist commit pair and enforces the next evidence boundary:

```text
any code-remediation
  -> new-commit-cycle
  -> all six rows need replacement evidence on the resulting commit

no code-remediation
  -> same-commit-cycle
  -> only blocked, incomplete, or missing rows are rehearsed while code remains unchanged
```

Ready evidence from an older commit remains historical evidence only. It is never carried forward as proof for changed code. Rerun JSON summaries and Markdown rehearsal checklists are explicit local downloads and trigger no device test or background work.

`field-rehearsal-launch-core.js` converts one explicit rerun-plan row into bounded metadata for `rehearsal.html`. Same-commit rows are pinned to the source SHA. New-commit rows remain unavailable until the operator enters a valid resulting SHA that differs from the source SHA. The recognized launch fragment carries only row key, source commit, target commit, contract version, and commit policy, then is validated and removed before the rehearsal continues. Operating-system and browser versions remain operator-entered, and actual environment inspection remains explicit.

`field-evidence-integrity-core.js` is a portable SHA-256 computation helper used only after the explicit Field Rehearsal download action and after the explicit Coverage Matrix load action. It binds the exact metadata-report text bytes through a 64-character digest without reading browser storage, meeting records, a provider, the network, a local file path, or external evidence.

`field-rehearsal-return-core.js` closes the loop after an explicit evidence download. It derives one of the same six coverage rows from metadata-complete rehearsal evidence and, when launch metadata exists, rejects row or target-commit drift. Return contract `1.1.0` carries only contract version, row key, exact commit SHA, readiness, and the SHA-256 receipt to `evidence.html`. The recognized fragment is removed on arrival. The downloaded report itself, its file path, and its contents are never transferred; file selection and **Load Selected Evidence** remain explicit operator actions.

When return context is active, `evidence-coverage.js` hashes the explicitly selected candidate files and requires a receipt match before return-driven evidence can be accepted. The matching report must also retain the returned row, exact commit, and readiness after the existing coverage normalizer. Receipt mismatch or metadata drift fails visibly with zero return-driven reports accepted. When `evidence.html` is opened normally without return context, the established manual evidence-import workflow remains unchanged.

The SHA-256 receipt proves only byte equality between the explicitly downloaded metadata payload and an explicitly selected local candidate. It does not authenticate an operator, attest a physical device, validate screenshots or traces, or prove authorization, delivery, legal approval, regulatory compliance, or production readiness.

`performance.html` accepts only explicitly selected metadata-only Workspace Capacity rehearsal reports. Accepted evidence is normalized through `performance-evidence-core.js`, bounded to 20 runs, held in memory only, and compared without reading or writing browser storage.

None of the evidence workspaces proves a software defect, device identity, delivery, authorization, legal approval, regulatory compliance, or production readiness by itself.

## Data and deployment boundaries

- Browser-local storage remains the default meeting-record provider.
- Workspace Home does not read meeting records on page load.
- Field Rehearsal does not read meeting records or browser-local business values.
- Field Rehearsal launch carries metadata only and does not read or write browser storage.
- Field Rehearsal launch makes no provider, GitHub API, synchronization, transfer, or background-automation call.
- Field Evidence Integrity hashes only explicitly supplied metadata-report text and has no storage, provider, network, or meeting-record authority.
- Field Rehearsal return carries metadata plus a SHA-256 receipt only after an explicit evidence download and does not read or write browser storage.
- Field Rehearsal return transfers no report bytes or file path and does not import evidence automatically.
- Field Evidence Coverage does not read or write browser storage and evaluates only explicitly imported metadata reports.
- Receipt verification occurs only after explicit file selection and **Load Selected Evidence**; coverage evaluation remains separate and explicit.
- Field Evidence Remediation reads only the in-memory evaluated coverage object after an explicit operator action.
- Field Evidence Remediation does not use browser storage, call GitHub, or create issues automatically.
- Field Evidence Rerun reads only the in-memory coverage/remediation pair after an explicit operator action.
- Field Evidence Rerun does not use browser storage, call GitHub/providers, run device tests, schedule work, or mutate meetings.
- Performance Evidence does not read or write browser storage and imports reports only after explicit operator action.
- The service worker caches static assets only and never reads business records.
- No production Firebase, Supabase, Drive, CRM, or Methodz API provider is active.
- Browser-local workflow evidence and integrity receipts do not prove identity, authority, delivery, legal approval, or regulatory compliance.
- This task-focused repository must not be deployed over `hub.methodz.ca`.
