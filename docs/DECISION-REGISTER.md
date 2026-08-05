# Decision Register

## Purpose

The Decision Register is a read-only static workspace at `decisions.html`. It helps an operator review structured decisions across saved meeting records, identify incomplete decision metadata, and open the source meeting for deliberate editing.

It does not approve, reverse, interpret, save, archive, assign, notify, transfer, deliver, call a provider, or synchronize anything.

## Decision lanes

The portable core recognizes the configured structured-decision statuses:

- Approved
- Proposed
- Deferred
- Reversed

An entry is placed in **Needs Review** when it has any of these conditions:

- decision text is missing;
- Approved / Confirmed By is missing;
- decision date is missing;
- decision date is invalid;
- status is missing;
- status is outside the configured lanes.

The core does not infer approval or status from prose.

## Free-form decision boundary

Older or less structured records may contain text in the meeting-level `decisions` field without entries in `decisionsList`.

Those records appear as **Free-form Source Review** items. The register reports that source review is required, but it does not copy, split, summarize, classify, or interpret the free-form prose. The operator must open the source meeting and decide whether structured entries should be created.

## Architecture

```text
Browser-local saved records
  -> data-adapter.js / fail-closed local read
  -> decision-register-core.js
  -> decision-register.js
  -> decisions.html
```

`decision-register-core.js` is portable and side-effect free. It has no DOM, storage, network, provider, timer, download, service-worker, or mutation dependency.

The existing `meeting-preparation-launch-core.js` advances to version `1.1.0` as a source-aware saved-record launch contract. It preserves all existing Preparation Brief hashes and adds:

- the `decisions` focus target;
- the `decision-register` source route;
- a source-specific return label and destination.

The browser launch feature removes recognized fragments before loading the selected record, validates that the record exists, uses the established editor function, and focuses the Decisions panel only after the operator clicks **Open Source Meeting**.

## Bounded processing

Default Decision Register bounds are:

- 500 saved records;
- 100 meaningful structured decisions per record;
- 500 structured entries in the rendered report;
- 100 free-form source-review items.

Structured text is also bounded before it reaches the derived register. Truncation and over-limit records are reported visibly. A bounded result must not be treated as a complete register when a limit warning is present.

## Protected business data

The on-screen register and explicit CSV may include:

- structured decision text;
- decision status;
- decision date;
- Approved / Confirmed By;
- decision conditions or notes;
- source meeting title, number, date, and status.

They exclude:

- raw record identifiers from CSV output;
- attendee data;
- signatures and consent values;
- agenda content;
- discussion notes;
- follow-up tasks and Assigned To values;
- meeting summaries;
- attachments;
- credentials and private keys;
- provider secrets;
- synchronization payloads;
- hidden governance metadata;
- free-form decision prose.

The register and CSV must be protected as business data.

## Operator workflow

1. Save structured decisions in the Meeting Manager.
2. Open `decisions.html` directly or through the Preparation Brief.
3. Review **Needs Review**, Proposed, and Deferred lanes first.
4. Use the text filter for a decision, meeting, status, or approval label.
5. Open the source meeting when an entry needs correction or context.
6. Make changes only in the Meeting Manager and save explicitly.
7. Refresh the Decision Register.
8. Download a visible CSV only when a protected working copy is required.

## Deployment boundary

The feature preserves:

- application shell `1.6.12`;
- meeting-record schema `1.6.0`;
- plain HTML, CSS, and JavaScript;
- direct-file and ordinary static hosting;
- browser-local storage as the default provider;
- no runtime package or build command;
- no backend or production endpoint;
- static-asset-only service-worker caching;
- no deployment over `hub.methodz.ca`.
