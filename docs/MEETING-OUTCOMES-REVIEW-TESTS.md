# Meeting Outcomes Review Tests

## Portable coverage

`tests/meeting-outcomes-core.mjs` verifies:

- Completed and Archived eligibility;
- Ready, Needs Summary, Needs Decision Review, Needs Follow-Up Review, and Needs Multiple Reviews classification;
- structured decision lane counts and invalid or incomplete decision review;
- completed, incomplete, and setup-deficient task counts;
- deterministic date ordering;
- record, decision-list, and task-list bounds;
- fail-closed outcome state after source-list truncation;
- source-record immutability;
- exclusion of summary, decision, condition, task, Assigned To, attendee, and signature values from the report;
- outcomes source, Summary target, Tasks target, fragment encoding, and return-route behavior in the shared launch contract.

Run locally:

```bash
node tests/meeting-outcomes-core.mjs
node tests/meeting-preparation-launch-core.mjs
```

## Browser coverage

`tests/meeting-outcomes.spec.js` verifies in Chromium that:

- no review is built until explicit refresh;
- only Completed and Archived meetings appear;
- outcome-state and text filters operate locally;
- protected visible CSV excludes raw IDs and prohibited source content;
- refresh, filtering, download, and source handoff preserve browser-local records;
- the exact source meeting opens through a fragment that is removed on arrival;
- the first outcome gap receives focus and the return route points back to Meeting Outcomes;
- malformed storage fails visibly without replacement or cleanup;
- controls retain a 44-pixel minimum touch height;
- the workspace remains contained at a 390-pixel viewport.

## Static boundary checks

The dedicated workflow verifies:

- required files and documentation exist;
- JavaScript parses;
- `outcomes.html`, navigation surfaces, the shared launch contract, and the service worker reference required static assets;
- browser orchestration contains no storage writes or meeting mutation calls;
- CSV construction omits prohibited field names;
- no background synchronization handler or Method Hub deployment identity is introduced.
