# Field Evidence Remediation Worklist Tests

## Portable core coverage

`tests/evidence-remediation-core.mjs` verifies:

- version and six-row bound;
- complete coverage produces no remediation work;
- `fail`, `blocked`, `incomplete`, and `missing` map to deterministic work types and priorities;
- `ready` rows are excluded;
- blocking GitHub issue references are numeric, de-duplicated, bounded, and sorted;
- unknown input properties are not copied into the worklist;
- source privacy-boundary violations fail closed;
- malformed commit SHAs and malformed row counts fail closed;
- issue drafts remain tied to the exact source commit and row;
- downloaded-summary boundaries explicitly report no storage, provider, GitHub API, issue-creation, synchronization, or mutation behavior.

## Browser coverage

`tests/evidence-remediation.spec.js` verifies:

- the remediation control is disabled until coverage is supplied;
- building the worklist requires an explicit operator action;
- ordering is deterministic and ready rows remain absent;
- source coverage invalidation invalidates the derived worklist;
- worklist JSON and Markdown issue-draft downloads require explicit actions;
- no automatic GitHub issue creation is claimed;
- the layer remains usable when browser storage access throws;
- the 390px layout remains contained and operator controls retain at least 44px height.

## Static boundary checks

The dedicated workflow checks JavaScript syntax, required asset wiring, service-worker static caching, the Method Hub deployment boundary, and absence of browser-storage, provider-write, synchronization, or GitHub-network behavior from the remediation layer.
