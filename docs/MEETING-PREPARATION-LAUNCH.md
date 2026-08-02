# Meeting Preparation Launch Bridge

## Purpose

The preparation launch bridge connects the read-only `preparation.html` workspace to the existing saved-record editor in `meeting.html`.

It solves one direct operator problem: after the Preparation Brief identifies missing setup, the operator can explicitly open that saved meeting and arrive at the first incomplete preparation field without searching the saved-record list again.

The bridge is part of Methodz Meeting Manager, a task-focused meeting preparation, capture, analysis, archive, recovery, transfer, follow-up, and records tool. It is not Method Hub, Nexus Hub, the Cathedral, a storefront, a calendar service, or a hosted synchronization layer.

## Operator flow

```text
Saved active records
  -> Meeting Preparation Brief
  -> operator selects Open Meeting to Prepare
  -> validated URL fragment
  -> meeting.html loads the selected saved record
  -> first missing preparation field receives focus
  -> operator edits and saves through the existing controls
```

Opening a record is explicit. Saving remains a separate explicit action.

## Launch contract

`meeting-preparation-launch-core.js` defines the portable launch contract.

A valid fragment has this form:

```text
#prepare-record=<encoded record id>&focus=<allowed preparation key>
```

Allowed focus keys are:

```text
title
date
location
facilitator
organizations
attendees
agenda
```

The core maps those keys only to stable v1.6.10 panel and field selectors. It rejects missing, control-character, overlong, or unsupported values. It has no DOM, storage, provider, network, timer, service-worker, or mutation dependency.

The record reference is placed in a URL fragment rather than a query string. Browsers do not include the fragment in the HTTP request for `meeting.html`. The destination removes the fragment from the address bar immediately after recognizing it.

The fragment is a navigation hint, not an authentication credential, authorization token, signature, approval, or proof of identity.

## Browser orchestration

`features-v1614-preparation-launch.js` has two bounded roles.

On `preparation.html`, it:

- derives the same bounded preparation report used by the visible cards;
- adds one explicit **Open Meeting to Prepare** link to each card with a saved record ID;
- chooses the first incomplete readiness key, or the title field when the meeting is already complete;
- never changes a meeting, task, draft, queue, archive, revision, or governance value.

On `meeting.html`, it:

- ignores unrelated fragments;
- parses and validates recognized preparation fragments;
- removes the fragment before loading a record;
- confirms the record exists in the current browser-local workspace;
- calls the established `loadRecordForEditing()` function;
- confirms the requested record actually loaded;
- marks the stable containing panel and focuses the selected field;
- presents a visible **Back to Preparation Brief** route;
- states that nothing was saved automatically.

Malformed or missing record references fail visibly and leave the workspace unchanged.

## Data and privacy boundary

The launch fragment contains only:

- the selected saved record ID;
- one allowed preparation focus key.

It does not contain meeting title, date, location, facilitator, organizations, attendees, agenda text, notes, decisions, tasks, summary, signatures, consent, credentials, private keys, provider secrets, queue payloads, or hidden governance metadata.

The selected record is read from the same established data-adapter or browser-local boundary already used by the application. The bridge does not export or transmit the record.

## Deployment boundary

The bridge preserves the current release contract:

- application shell remains `1.6.12`;
- meeting-record schema remains `1.6.0`;
- launch-core version is `1.0.0`;
- plain HTML, CSS, and JavaScript;
- no build command or required runtime package;
- direct static hosting and direct `meeting.html` operation remain supported;
- browser-local storage remains the default provider;
- no automatic save, assignment, completion, reminder, archive, transfer, release, provider call, or synchronization;
- no deployment over `hub.methodz.ca`.

The optional service worker caches only the bridge's static files. It never reads or processes a launch fragment or meeting record.

## Limitations

- A record must exist in the destination browser-local workspace.
- The bridge does not transfer a record between devices or origins.
- Field focus identifies the first missing checklist item, not every preparation task an operator may need to complete.
- Opening a meeting does not prove authority to edit it.
- The operator must still review the full record and explicitly save any changes.
