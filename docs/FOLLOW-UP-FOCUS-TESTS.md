# Follow-Up Focus Validation

## Portable core

Run:

```bash
node tests/v1611-meeting-review.mjs
node tests/v1613-follow-up-focus.mjs
```

Coverage includes:

- deterministic urgency and setup classification;
- priority and due-date ordering;
- overdue-day explanations;
- exclusion of completed tasks;
- bounded focus and Assigned To summaries;
- explicit unassigned workload reporting;
- empty input handling;
- no mutation of the source Follow-Up Review report.

## Browser workflow

Run the existing Follow-Up Review Playwright suite:

```bash
npx playwright test tests/v1611-follow-up-review.spec.js --reporter=line
```

Coverage includes:

- visible Daily Focus rendering from saved records;
- exclusion of completed tasks from the focus queue;
- explicit source-meeting opening;
- refresh behavior without record or draft mutation;
- stable panel registry and record schema;
- narrow-phone viewport containment and touch-ready controls.

## Static gate

`.github/workflows/follow-up-review.yml` checks required files, JavaScript syntax, app-shell wiring, service-worker boundaries, portable tests, and Chromium behavior. No production endpoint, background synchronization event, automatic reminder delivery, or record mutation is introduced.
