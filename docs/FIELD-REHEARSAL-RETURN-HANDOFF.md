# Field Rehearsal Return Handoff

## Purpose

The return handoff closes the operator gap between downloading one metadata-only Field Rehearsal report in `rehearsal.html` and explicitly importing that file into the exact-commit Coverage Matrix in `evidence.html`.

It does not move the JSON report between pages. The browser's file-selection boundary remains intact.

## Operator flow

1. Open the required row from the exact-commit rerun plan, or open Field Rehearsal manually.
2. Inspect the real device environment and record the required checks.
3. Select **Download Metadata Evidence**.
4. Only after that explicit download, select **Open Coverage Matrix to Import This Report**.
5. `evidence.html` validates the return fragment, removes it from the address bar, and shows the expected coverage row, exact commit, and downloaded readiness.
6. Select the JSON report through the normal file picker.
7. Select **Load Selected Evidence**.
8. Select the exact commit and explicitly evaluate coverage.

## Architecture

```text
real-hardware rehearsal
        ↓
explicit Review / Download
        ↓
methodz:field-rehearsal-downloaded
        ↓
field-rehearsal-return-core.js
        ↓
row + exact-commit drift validation
        ↓
explicit Open Coverage Matrix
        ↓
metadata-only URL fragment
        ↓
evidence.html
        ↓
validate + consume fragment
        ↓
operator file selection
        ↓
explicit Load Selected Evidence
        ↓
exact-commit Coverage Matrix
```

`field-rehearsal-return-core.js` is portable and side-effect free. It has no DOM, browser-storage, provider, network, timer, synchronization, transfer, service-worker, or GitHub dependency.

`field-rehearsal-return.js` is the browser presentation layer. It enables the return control only after the existing download action emits the completed evidence object. The destination presentation consumes only the validated fragment and never receives the downloaded file automatically.

## Return contract

The fragment contains only:

- contract version;
- coverage row key;
- exact commit SHA;
- readiness (`ready`, `fail`, `blocked`, or `incomplete`).

The six recognized rows are Desktop Chromium, Desktop non-Chromium, Android Chrome, iOS Safari, Tablet, and Two-device.

The portable row classifier deliberately mirrors the established Coverage Matrix classification:

```text
desktop + Chrome/Edge    -> Desktop Chromium
desktop + Firefox/Safari -> Desktop non-Chromium
android + Chrome         -> Android Chrome
ios + Safari             -> iOS Safari
tablet                   -> Tablet
two-device               -> Two-device
```

Other platform/browser combinations do not acquire an invented coverage row.

## Exact-commit drift protection

When the rehearsal arrived through `field-rehearsal-launch-core.js`, the return core checks both the generated evidence row against the launch row and the generated evidence commit against the launch target commit.

If either value drifts, the report may still exist as a downloaded local file, but the exact-commit return button stays disabled and the browser reports the mismatch. This avoids turning a rerun-plan target into evidence for a different row or commit through UI edits.

A manually opened rehearsal has no launch object to compare. In that case the return core derives the row directly from the metadata-complete evidence report.

## Explicit download gate

Reviewing evidence alone does not enable return navigation. The return layer listens only for the event emitted after **Download Metadata Evidence** is activated and the download has been initiated.

This preserves a useful evidence invariant: the operator should possess the report that the Coverage Matrix will ask them to select next.

## Destination behavior

A recognized return fragment is removed from the address bar before normal coverage work continues. Valid metadata opens a visible **Returned rehearsal context** card with the expected row, exact commit, readiness, and an explicit instruction to choose the downloaded JSON file.

The destination does not open a local file path, populate the file input, load or parse a report automatically, evaluate coverage automatically, read browser-local meeting storage, or persist return metadata.

Malformed return fragments fail visibly and still leave the ordinary manual import workflow available.

## Privacy and authority boundary

The handoff never carries report JSON contents, local file names or paths, meeting content, record identifiers, attendee names, signatures, screenshots, traces, PDFs, transfer contents, credentials, private keys, provider secrets, queue payloads, hidden governance metadata, or arbitrary operator notes.

The return metadata is navigational context only. It does not prove device identity, operator identity, authorization, delivery, legal approval, regulatory compliance, production readiness, or that the selected JSON file actually matches the hint. The Coverage Matrix remains responsible for validating the explicitly imported report.

## Deployment boundary

The feature preserves application shell `1.6.12`, meeting-record schema `1.6.0`, plain static HTML/CSS/JavaScript, no required build command or runtime package, browser-local meeting records as the default provider, no production backend/provider, no automatic synchronization, transfer mutation, issue creation, evidence import, or background work, and no deployment identity for `hub.methodz.ca`.
