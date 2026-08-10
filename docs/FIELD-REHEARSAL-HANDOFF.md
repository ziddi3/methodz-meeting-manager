# Field Rehearsal Launch Handoff

## Purpose

The Field Rehearsal Launch Handoff closes the operator gap between the exact-commit rerun plan in `evidence.html` and the real-hardware evidence form in `rehearsal.html`.

It does not run a device test. It carries only enough metadata to open the correct rehearsal row against the correct evidence boundary.

## Operator flow

1. Load Field Rehearsal evidence in `evidence.html`.
2. Evaluate one exact commit.
3. Build the remediation worklist.
4. Build the rerun plan.
5. For a same-commit cycle, the target commit is pinned to the source commit.
6. For a new-commit cycle, enter the actual resulting code-remediation commit SHA. It must be valid and different from the source commit.
7. Select **Open Rehearsal** for the row you are about to run.
8. `rehearsal.html` validates the handoff, removes the recognized URL fragment, shows the row and commit policy, and prefills only deterministic metadata.
9. Select **Inspect Current Environment** on the actual device before recording results.
10. Complete the eight required checks and download the metadata-only evidence report explicitly.

## Architecture

```text
exact-commit coverage
        ↓
remediation worklist
        ↓
rerun plan
        ↓
explicit target commit
        ↓
field-rehearsal-launch-core.js
        ↓
metadata-only URL fragment
        ↓
rehearsal.html
        ↓
validated + consumed handoff
        ↓
real-hardware rehearsal
```

`field-rehearsal-launch-core.js` is portable and side-effect free. It has no DOM, storage, provider, network, timer, synchronization, transfer, or service-worker dependency.

## Launch contract

The fragment contains only:

- contract version;
- coverage row key;
- source commit SHA;
- target commit SHA;
- commit policy.

The portable core recognizes the six documented Field Evidence rows only:

- Desktop Chromium;
- Desktop non-Chromium;
- Android Chrome;
- iOS Safari;
- Tablet;
- Two-device.

The accepted commit policies are:

- `new-commit-required`;
- `same-commit-required`;
- `same-commit-if-no-code-change`.

## Commit-boundary rules

### Same-commit launch

The target SHA must equal the source SHA. The browser layer pins the field so the operator cannot silently turn same-commit evidence into a different-commit rehearsal.

### New-commit launch

The target SHA must be a valid 7-to-40-character hexadecimal commit reference and must differ from the source SHA. The row launch remains disabled until that condition is satisfied.

This prevents an old-commit rerun plan from being used to claim replacement evidence without identifying the actual resulting commit.

## Prefill rules

The handoff may prefill deterministic hints such as Android + Chrome or iOS + Safari and the exact target commit. It does not infer or populate operating-system version or browser version.

`Inspect Current Environment` remains an explicit action and may replace the hinted viewport class with the measured viewport class of the device actually running the rehearsal.

## Failure behavior

A recognized handoff fails closed when:

- the version is unsupported;
- a row is unknown;
- a source or target SHA is malformed;
- a same-commit policy points to a different target SHA;
- a new-commit policy points back to the source SHA;
- duplicate or unknown fragment fields are present;
- the bounded fragment length is exceeded.

Recognized handoff fragments are removed from the address bar before the rehearsal continues. A rejected handoff leaves the rehearsal form available for manual entry and displays the validation failure.

## Privacy and authority boundary

The handoff carries no meeting title, note, decision, summary, task text, attendee data, signature, record identifier, storage key or value, credential, private key, provider secret, queue payload, transfer contents, screenshot, trace, arbitrary operator prose, or attachment.

The handoff does not read or write browser storage or meeting records. It does not contact GitHub or a provider, create issues, synchronize data, transfer records, run tests, schedule work, or prove production readiness, device identity, authorization, delivery, legal approval, or regulatory compliance.

## Deployment contract

- application shell remains `1.6.12`;
- meeting-record schema remains `1.6.0`;
- Field Rehearsal launch core is `1.0.0`;
- plain HTML, CSS, and JavaScript;
- no build command or runtime dependency;
- browser-local storage remains the default meeting-record provider;
- the new core is a static app-shell asset only;
- no production hosted provider is introduced;
- this repository is not deployed over `hub.methodz.ca`.
