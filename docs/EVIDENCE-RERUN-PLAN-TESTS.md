# Field Evidence Rerun Plan Tests

## Portable core coverage

Run:

```bash
node tests/evidence-rerun-core.mjs
```

The portable suite verifies:

- code-remediation expands the next evidence cycle to all six rows on a new commit;
- rows that were ready on the source commit become revalidation rows after code changes;
- blocked, incomplete, and missing rows remain same-commit work when no code remediation exists;
- exact coverage/worklist commit matching fails closed;
- privacy-boundary violations fail closed;
- remediation state/action mismatches fail closed;
- no-rerun-needed behavior for complete coverage;
- source objects are not mutated;
- metadata summary and Markdown checklist generation.

## Chromium coverage

Run:

```bash
npx playwright test tests/evidence-rerun.spec.js --reporter=line
```

The browser suite verifies:

- rerun planning stays disabled until a current remediation worklist exists;
- explicit Build Rerun Plan action;
- new-commit cycle rendering across all six rows;
- same-commit unresolved-row rendering;
- coverage changes invalidate both remediation and rerun outputs;
- explicit JSON and Markdown downloads;
- browser-storage non-use by the rerun layer;
- 390px containment and 44px minimum controls.

## Static boundary checks

The dedicated GitHub Actions workflow also checks syntax, required assets, service-worker caching, event wiring, and absence of provider calls, browser-storage access, meeting mutation, synchronization, or `hub.methodz.ca` deployment identity in the rerun implementation.
