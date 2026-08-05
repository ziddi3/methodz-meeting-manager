# Decision Register Tests

## Portable coverage

`tests/decision-register-core.mjs` verifies:

- deterministic flattening of structured decisions;
- Approved, Proposed, Deferred, Reversed, Other, and Needs Review classification;
- missing decision text, Approved / Confirmed By, date, status, invalid date, and unsupported status handling;
- free-form-only source review without prose parsing;
- bounded records, per-record decisions, entries, and truncation evidence;
- source-record immutability;
- exclusion of attendee data, signatures, discussion notes, tasks, summaries, credentials, and free-form decision prose;
- source-aware Decision Register launch hashes;
- preservation of exact saved-record identifiers through URL encoding and decoding;
- preservation of the existing Preparation Brief hash format.

Run locally:

```bash
node tests/decision-register-core.mjs
```

## Browser coverage

`tests/decision-register.spec.js` verifies in Chromium that:

- saved structured decisions and free-form source-review items render without changing records;
- review gaps appear visibly;
- lane filters are deterministic;
- generated CSV contains only the visible register working set;
- spreadsheet formula-like values are neutralized before CSV serialization;
- CSV excludes raw record IDs, attendee data, signatures, discussion notes, tasks, summaries, and free-form prose;
- an explicit source link opens the correct saved record;
- the launch fragment is removed;
- the Decisions field receives focus and its panel is highlighted;
- the correct return route is shown;
- malformed storage and missing records fail visibly without mutation;
- controls retain a 44-pixel minimum touch height;
- the register remains contained at a 390-pixel viewport.

## Static boundary checks

The dedicated workflow verifies:

- all required files exist;
- JavaScript parses;
- `decisions.html` includes the correct static assets;
- `preparation.html` exposes the Decision Register route;
- the service worker pre-caches the new static files;
- the browser register does not invoke the application data adapter or a hosted provider;
- no Decision Register script calls meeting write, archive, delete, transfer, provider-write, or synchronization functions;
- no background-sync handler or Method Hub deployment identity is introduced.
