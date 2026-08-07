# Field Rehearsal Evidence Workspace

## Purpose

`rehearsal.html` turns the existing physical-device field-rehearsal protocol into a static operator workspace that can be launched directly from Workspace Home.

The workspace records structured metadata only. It does not read meeting records, browser-local business values, transfer packages, recovery packages, credentials, private signing keys, provider secrets, queue payloads, or hidden governance data.

## Architecture

```text
Explicit operator inputs
        +
Explicit environment inspection
        ↓
field-rehearsal-core.js
        ↓
normalized bounded evidence
        ↓
field-rehearsal.js
        ↓
readiness review or explicit JSON download
```

`field-rehearsal-core.js` is portable and side-effect free. It has no DOM, storage, provider, network, service-worker, transfer, synchronization, or mutation dependency.

The browser layer reads current viewport dimensions, current protocol, online state, and service-worker controller state only after **Inspect Current Environment** is selected. Browser family and version remain operator-entered instead of being inferred from a user-agent fingerprint.

## Required checks

A device evidence row contains eight required results:

1. Panel Registry
2. Core meeting workflow
3. Meeting-Day Mode
4. Offline reload
5. Print / PDF
6. Transfer import
7. Destination acceptance
8. Pre-import rollback

Every result is one of:

```text
not-run
pass
fail
blocked
not-applicable
```

Readiness is deterministic:

- `fail` if any required check fails;
- `blocked` if no check fails and at least one is blocked;
- `ready` only when all eight required checks pass;
- `incomplete` otherwise.

`not-applicable` is deliberately not treated as a pass. This prevents a partially exercised platform row from being labeled field-ready.

## Structured evidence fields

The generated JSON may contain:

- app-shell and record-schema versions;
- commit SHA when it is valid hexadecimal text;
- platform family;
- OS and browser version tokens;
- browser family;
- viewport class and dimensions;
- HTTPS, localhost, or direct-file mode;
- online state and service-worker controller state;
- the eight structured results;
- aggregate panel counts and bounded duration measurements;
- up to 20 numeric GitHub blocking issue numbers;
- fixed privacy and proof-boundary declarations.

The report does not accept free-form operator notes or arbitrary evidence descriptions. Screenshots, traces, PDFs, and transfer packages remain external evidence and should be protected separately.

## Bounds

- version tokens: 32 characters and a restricted version-token alphabet;
- commit SHA: 7 to 40 hexadecimal characters;
- panel counts: `0..1,000,000`;
- durations: `0..86,400,000` milliseconds;
- blocking issue numbers: positive 32-bit integers, deduplicated, maximum 20;
- viewport dimensions: `0..10,000` pixels.

Out-of-contract values are rejected, normalized, or bounded by the portable core. Unknown properties are ignored.

## Privacy boundary

Generated evidence declares and enforces absence of:

- meeting content;
- record identifiers;
- attendee names;
- typed signatures;
- credentials;
- private key material;
- raw storage keys and values;
- provider secrets;
- queue payloads;
- transfer contents.

A field-rehearsal report does not prove device identity, delivery, authorization, or legal approval.

## Operator workflow

1. Open `index.html` and select **Open Field Rehearsal**.
2. Select **Inspect Current Environment** on the physical device being exercised.
3. Enter platform, OS, browser, and commit metadata.
4. Run the established physical-device rehearsal using disposable meeting records.
5. Record each required result and aggregate measurements.
6. Enter only numeric GitHub issue numbers for blocking defects.
7. Select **Review Evidence Readiness**.
8. If the row is complete, select **Download Metadata Evidence**.
9. Store screenshots, traces, PDFs, transfer bundles, recovery packages, and backups separately from the metadata report.
10. Repeat for Android phone, iPhone, tablet, desktop, and the two-device transfer pair.

## Deployment boundary

- app shell remains `1.6.12`;
- meeting-record schema remains `1.6.0`;
- Field Rehearsal core is `1.0.0`;
- plain HTML, CSS, and JavaScript;
- no runtime package or build command;
- browser-local storage remains the default meeting-record provider;
- no hosted production provider;
- no automatic meeting read, write, assignment, notification, provider call, synchronization, transfer, rollback, or cleanup;
- service worker caches static assets only;
- the application remains separate from Method Hub.
