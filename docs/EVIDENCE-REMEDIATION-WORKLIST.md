# Field Evidence Remediation Worklist

## Purpose

The Field Evidence Remediation Worklist converts one already-evaluated, same-commit Field Evidence Coverage matrix into bounded operator-controlled next actions.

It exists to implement the evidence-driven 1.x rule: remediation should follow concrete physical-device evidence rather than speculative architecture.

## Input

The portable core accepts only Field Evidence Coverage version `1.0.0` objects produced by the established coverage layer:

- `methodz-field-evidence-coverage`
- `methodz-field-evidence-coverage-summary`

The selected commit SHA must be valid, all six documented coverage rows must be present, and the source metadata-only privacy boundary must remain intact.

Unknown input properties are discarded during normalization.

## Deterministic work types

Only unresolved rows enter the worklist:

| Coverage state | Work type | Priority | Intended next step |
| --- | --- | ---: | --- |
| `fail` | `code-remediation` | 1 | reproduce, isolate the smallest code/configuration cause, fix, then rerun on the new commit |
| `blocked` | `environment-remediation` | 2 | resolve the blocking condition or linked issue, then rerun the same commit when code did not change |
| `incomplete` | `evidence-completion` | 3 | complete the documented checks and capture replacement evidence |
| `missing` | `evidence-collection` | 4 | run the required physical-device rehearsal for the exact commit |

`ready` rows are excluded.

The worklist is bounded to the six documented coverage rows and sorted by priority, then row label.

## Operator flow

1. Open `evidence.html`.
2. Explicitly load Field Rehearsal evidence.
3. Select one exact commit.
4. Evaluate the Field Evidence Coverage matrix.
5. Select **Build Remediation Worklist**.
6. Review the deterministic unresolved rows.
7. Optionally download the metadata-only worklist JSON.
8. Optionally download Markdown issue drafts.
9. Review and edit any draft before manually creating a GitHub issue.

The application never submits a GitHub issue and never calls the GitHub API.

## Issue-draft rule

A generated draft is an operator aid, not a conclusion that a software defect exists.

Each draft carries only:

- exact commit SHA;
- coverage row label;
- latest row state;
- deterministic work type;
- accepted evidence count;
- latest accepted evidence timestamp, when available;
- bounded platform/browser metadata;
- bounded numeric blocking-issue references;
- deterministic next action and acceptance criteria.

If a code change is made, replacement evidence belongs to the new commit. Old passing evidence must not be carried across commits.

## Privacy and deployment boundaries

The remediation layer:

- does not read or write meeting records;
- does not use `localStorage`, `sessionStorage`, or IndexedDB;
- does not persist imported evidence or worklists;
- does not call a hosted provider;
- does not create GitHub issues;
- does not synchronize, transfer, archive, assign, notify, or mutate anything;
- contains no meeting content, record IDs, attendee names, signatures, credentials, private keys, storage keys/values, queue payloads, or transfer contents;
- does not prove a software defect, production readiness, device identity, authorization, delivery, legal approval, or regulatory compliance.

The application remains plain HTML, CSS, and JavaScript with no runtime dependency or build command. App shell `1.6.12` and meeting-record schema `1.6.0` are unchanged.
