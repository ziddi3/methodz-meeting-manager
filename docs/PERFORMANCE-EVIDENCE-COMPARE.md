# Performance Evidence Compare

## Purpose

`performance.html` implements the next 1.x evidence-roadmap step after Field Rehearsal: compare large-workspace timing evidence already produced by the Workspace Capacity rehearsal without opening meeting records or introducing a hosted provider.

The workspace accepts only metadata-only `methodz-workspace-capacity-rehearsal` version `1.0.0` JSON reports. File selection is inert until the operator selects **Load Selected Evidence**. Accepted reports remain in memory only.

## Architecture

```text
Explicitly selected JSON files
        ↓ explicit load
performance-evidence-core.js
        ↓ validated bounded run metadata
in-memory run ledger (maximum 20)
        ↓ explicit compare
performance-evidence.js
        ↓
comparison metrics / explicit JSON summary download
```

The portable core has no DOM, storage, provider, network, synchronization, transfer, rollback, or mutation dependency.

## Accepted source contract

A source report must match the existing Workspace Capacity metadata report contract and provide:

- report type `methodz-workspace-capacity-rehearsal`;
- report version `1.0.0`;
- valid generated timestamp;
- app-shell and record-schema version tokens;
- capacity status and optional utilization percentage;
- performance duration, target, throughput, and bounded synthetic-workload counts;
- the established root, capacity, and performance privacy-boundary flags.

Unknown properties are ignored. A report that claims meeting content, raw storage keys or values, record identifiers, credentials, private keys, signatures, persisted synthetic data, browser-storage writes, automatic cleanup, record mutation, or synchronization is rejected.

## Comparison rules

Accepted runs are ordered by `generatedAt`.

- earliest accepted run = baseline;
- latest accepted run = current comparison point;
- fastest, median, and slowest duration are calculated across accepted runs;
- target passes are counted from `durationMs <= targetDurationMs`;
- baseline-to-latest percentage is `(latest - baseline) / baseline × 100` when baseline duration is non-zero;
- regression = duration increase above 10%;
- improvement = duration decrease greater than 5%;
- stable = all other comparable changes;
- one accepted run = `baseline-only`.

These thresholds are comparison signals, not production service-level guarantees.

## Bounds

- maximum imported runs: 20;
- maximum file size before parsing: 512 KiB;
- duration: `0..86,400,000` ms;
- target duration: `1..60,000` ms;
- throughput: `0..1,000,000,000` tasks/s;
- synthetic records: `1..5,000`;
- synthetic tasks/classified tasks: up to `100,000`;
- returned review items: up to `5,000`;
- utilization: `0..100%`.

## Privacy and authority boundary

The comparison output contains only normalized evidence metadata. It excludes meeting text, record identifiers, attendee names, raw storage keys or values, signatures, credentials, private keys, provider secrets, queue payloads, and transfer contents.

The workspace does not read or write browser storage, call a provider, synchronize, transfer, rollback, clean up, or mutate meeting records.

## Operator workflow

1. Run the existing Workspace Capacity synthetic rehearsal from Meeting Manager on the environment being measured.
2. Download its metadata report explicitly.
3. Repeat the same workload on later commits, browsers, or devices using consistent rehearsal parameters.
4. Open `performance.html` from Workspace Home.
5. Select up to 20 capacity-rehearsal reports.
6. Select **Load Selected Evidence**.
7. Review accepted and rejected counts. Resolve rejected reports instead of weakening validation.
8. Select **Compare Loaded Evidence**.
9. If useful, select **Download Comparison Summary** and store the metadata summary with the external evidence set.
10. Use concrete regressions to drive targeted GitHub issues rather than broad architectural expansion.

## Deployment boundary

- application shell remains `1.6.12`;
- meeting-record schema remains `1.6.0`;
- Performance Evidence Compare core is `1.0.0`;
- plain HTML, CSS, and JavaScript;
- no runtime package or build command;
- browser-local storage remains the default meeting-record provider, but this workspace does not access it;
- no production hosted provider;
- service worker caches static application assets only;
- the repository remains separate from Method Hub and must not claim `hub.methodz.ca`.
