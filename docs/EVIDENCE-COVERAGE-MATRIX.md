# Field Evidence Coverage Matrix

## Purpose

`evidence.html` turns existing metadata-only Field Rehearsal reports into a deterministic physical-device coverage view for one exact application commit at a time.

It does not create field evidence. Use `rehearsal.html` on the actual environment being tested, download the resulting `methodz-field-rehearsal-evidence` version `1.0.0` report, then import those reports here.

## Architecture

```text
physical-device rehearsal
  -> explicit metadata-only JSON download
  -> explicit file selection in evidence.html
  -> explicit Load Selected Evidence
  -> evidence-coverage-core.js validation + normalization
  -> bounded in-memory evidence ledger
  -> explicit exact-commit selection
  -> deterministic six-row coverage matrix
  -> optional metadata-only summary download
```

The portable core has no DOM, browser-storage, provider, network, synchronization, transfer, rollback, cleanup, or meeting-record dependency.

## Accepted source contract

A report is accepted only when it:

- has report type `methodz-field-rehearsal-evidence`;
- has report version `1.0.0`;
- has a valid 7 to 40 character hexadecimal commit SHA;
- has valid app-shell and meeting-record schema version tokens;
- has a valid generation timestamp;
- includes complete platform, operating-system, browser, viewport, and service-worker metadata;
- reports `summary.metadataComplete: true`;
- uses a supported readiness state: `ready`, `fail`, `blocked`, or `incomplete`;
- exactly satisfies the established Field Rehearsal privacy and authority boundary flags.

Unknown properties are discarded during normalization instead of being copied into the coverage ledger.

## Required coverage rows

The current documented matrix contains six rows:

1. **Desktop Chromium**: desktop platform with Chrome or Edge.
2. **Desktop non-Chromium**: desktop platform with Firefox or Safari.
3. **Android Chrome**: Android platform with Chrome.
4. **iOS Safari**: iOS platform with Safari.
5. **Tablet**: tablet platform with an accepted browser family.
6. **Two-device**: two-device rehearsal platform with an accepted browser family.

A report that is valid but does not match one of these rows remains valid source evidence but does not satisfy a matrix row.

## Same-commit rule

Coverage is never calculated across different commits.

When imported evidence contains more than one commit SHA, the operator must explicitly choose a commit before evaluation. The matrix filters to that exact SHA. This prevents a passing Android rehearsal from one build from silently filling a missing Android row for another build.

## Repeated evidence

Multiple reports may match the same row for the selected commit. The latest `generatedAt` report controls the row state, while the row retains the number of matching evidence reports.

This lets a failed or blocked rehearsal remain historically visible through its evidence count and referenced issue numbers while a later same-commit rerun can establish the current row state.

## Coverage status

- `coverage-complete`: all six latest row states are `ready` for the selected commit.
- `coverage-incomplete`: the selected commit has evidence, but one or more rows are missing, failed, blocked, or incomplete.
- `no-evidence`: the selected commit has no accepted evidence.

These are evidence-coverage states only. They are not production deployment approvals or service-level guarantees.

## Bounds

- maximum selected/accepted reports per load: 50;
- maximum file size before parsing: 512 KiB;
- maximum blocking issue references retained per source report: 20;
- maximum unique referenced issue numbers retained in a coverage result: 50;
- source strings and numeric environment fields are normalized to explicit bounds.

## Privacy and authority boundary

The normalized ledger and downloaded summary exclude meeting content, record identifiers, attendee names, signatures, storage key names and values, credentials, private keys, provider secrets, queue payloads, and transfer contents.

The workspace never reads or writes browser storage and never calls a provider, synchronizes data, transfers records, rolls back state, cleans storage, or mutates a meeting.

A complete matrix does **not** prove:

- production readiness;
- authenticated device identity;
- authorization;
- delivery;
- legal approval;
- regulatory compliance.

Those claims require separate evidence and explicit approval gates.

## Operator workflow

1. Run Field Rehearsal on each required physical environment.
2. Download each metadata-only evidence report explicitly.
3. Open `evidence.html` from Workspace Home.
4. Select the reports and choose **Load Selected Evidence**.
5. Review accepted/rejected counts and resolve rejected evidence instead of weakening validation.
6. If multiple commits are present, select the exact commit under review.
7. Choose **Evaluate Selected Commit**.
8. Use missing, failed, blocked, or incomplete rows to drive narrowly scoped remediation issues.
9. After a fix, rerun the affected row and evaluate the new commit separately.
10. Download a metadata-only coverage summary only when an external evidence record is useful.
