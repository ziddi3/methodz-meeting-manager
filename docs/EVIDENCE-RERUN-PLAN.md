# Field Evidence Rerun Plan

## Purpose

The Field Evidence Rerun Plan converts the current exact-commit Field Evidence Coverage matrix and its operator-reviewed remediation worklist into the next physical-device rehearsal cycle.

It exists to enforce one rule that becomes easy to lose during remediation: **evidence belongs to the commit it tested**.

## Commit modes

### New-commit cycle

If any unresolved coverage row requires `code-remediation`, the rerun plan enters `new-commit-cycle` mode.

The code fix creates a new evidence boundary. The plan therefore includes all six documented physical-device rows, including rows that were ready on the source commit. Those earlier ready results remain useful history, but they cannot establish coverage for changed code.

The target commit is intentionally represented as `new-commit-after-remediation` until the operator has an actual resulting commit SHA.

### Same-commit cycle

If no code remediation exists, environment and evidence gaps may remain on the current commit.

- `blocked` becomes `same-commit-if-no-code-change`;
- `incomplete` becomes `same-commit-required`;
- `missing` becomes `same-commit-required`;
- ready rows are excluded.

If code changes while resolving one of these rows, stop treating the plan as same-commit evidence and evaluate the resulting commit separately.

## Operator flow

1. Load Field Rehearsal evidence in `evidence.html`.
2. Evaluate one exact commit.
3. Build the remediation worklist.
4. Review the remediation work before changing code or environment.
5. Select **Build Rerun Plan**.
6. Use the visible commit policy to determine whether the next rehearsal belongs to the same commit or a new commit.
7. Optionally download the metadata-only JSON summary or Markdown rehearsal checklist.
8. Run the actual physical-device rehearsals manually and feed the resulting Field Rehearsal evidence back into the coverage matrix.

## Architecture

```text
accepted Field Rehearsal reports
          ↓
exact-commit coverage matrix
          ↓
operator-built remediation worklist
          ↓
explicit Build Rerun Plan
          ↓
evidence-rerun-core.js
          ↓
new-commit cycle OR same-commit cycle
          ↓
visible plan + optional metadata/checklist downloads
```

`evidence-rerun-core.js` is portable and side-effect free. The browser layer only renders the plan and performs explicit local downloads.

## Bounded behavior

- exactly six documented coverage rows are recognized;
- the coverage and worklist must carry the same commit SHA;
- source versions must be `1.0.0`;
- unresolved states and remediation action types must agree;
- code remediation expands the next evidence cycle to all six rows;
- same-commit mode includes unresolved rows only;
- blocking issue references remain bounded numeric metadata;
- any coverage/remediation change invalidates the derived rerun plan.

## Privacy and authority boundary

The rerun plan contains metadata only. It does not include meeting titles, notes, decisions, attendee names, signatures, record identifiers, storage keys or values, credentials, private keys, provider secrets, queue payloads, transfer contents, or arbitrary operator prose.

It does not read or write meeting records or browser storage. It makes no provider or GitHub API call, creates no issue, runs no device test, starts no synchronization, mutates no transfer state, and schedules no background work.

A rerun plan is not production approval. It does not prove device identity, authorization, delivery, legal approval, regulatory compliance, or production readiness.

## Deployment contract

- application shell remains `1.6.12`;
- meeting-record schema remains `1.6.0`;
- rerun core is `1.0.0`;
- plain HTML, CSS, and JavaScript;
- no build command or runtime package;
- browser-local storage remains the default meeting-record provider;
- no hosted production provider;
- no deployment over `hub.methodz.ca`.
