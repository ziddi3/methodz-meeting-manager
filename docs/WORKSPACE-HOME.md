# Workspace Home

## Purpose

`index.html` is the static root entry point for Methodz Meeting Manager. It makes the established meeting lifecycle discoverable from an ordinary static deployment without turning the repository into a framework application or changing the meeting-record schema.

The Workspace Home has two responsibilities:

1. provide explicit navigation to the established lifecycle workspaces;
2. optionally derive an aggregate-only browser-local snapshot after an operator presses **Refresh Workspace Snapshot**.

It is not a dashboard service, background monitor, synchronization agent, or record editor.

## Lifecycle routes

```text
Workspace Home
  -> Preparation Brief
  -> Meeting Manager / Meeting-Day
  -> Decision Register
  -> Meeting Outcomes Review

Supporting routes
  -> Archive Vault
  -> Device Readiness
  -> Verify Package
```

The home route does not replace any of those workspaces. It only makes their existing authority boundaries easier to reach.

## Aggregate snapshot contract

`workspace-home-core.js` is portable and side-effect free. It has no DOM, storage, network, provider, timer, service-worker, or download dependency.

The browser layer reads saved records only after an explicit refresh and passes them to the core. The returned report retains counts only:

- saved and scanned records;
- active, completed, and archived meeting counts;
- active meetings in the next 7 and 30 days;
- active meetings without a valid date;
- incomplete, overdue, unassigned, and unscheduled follow-up counts;
- bounded-scan coverage and truncation metadata.

Archived records are excluded from task totals. Completed records may still contribute incomplete follow-up work because post-meeting follow-up can remain open after the meeting itself is completed.

## Privacy boundary

The derived report does not retain meeting titles, meeting numbers, record identifiers, attendee names, organization names, notes, decisions, summaries, task text, Assigned To values, signatures, consent data, credentials, private keys, provider secrets, queue payloads, or hidden governance metadata.

The browser presentation renders only the aggregate report. There is no home-page CSV or JSON export.

## Bounded processing

Default limits are:

```text
Records:          1000
Tasks per record: 250
```

If either limit is exceeded, the report marks itself incomplete and the interface states that aggregate counts may understate the full workspace. It does not silently present a truncated scan as complete.

## Failure behavior

Malformed browser-local record storage fails visibly. The page clears derived metrics and states that records could not be read. It does not replace, repair, migrate, delete, or otherwise mutate the source data.

## Deployment boundary

The Workspace Home remains plain static HTML, CSS, and JavaScript. It requires no build command, runtime package, backend, production provider, account, or mandatory network connection. `manifest.webmanifest` keeps the existing PWA identity stable while using the repository root as the launch route.

The service worker caches only static home assets. It never reads browser-local business data.

This repository remains separate from Method Hub and must not be deployed over `hub.methodz.ca`.
