# Field Rehearsal Return Handoff Tests

## Portable core

Run:

```bash
node tests/field-rehearsal-return-core.mjs
```

The portable suite verifies:

- all six documented coverage rows can be derived from accepted environment metadata;
- unsupported platform/browser combinations do not acquire a coverage row;
- metadata-incomplete evidence is rejected;
- launch row drift fails closed;
- launch target-commit drift fails closed;
- matching launch and evidence metadata produces a bounded return target;
- return fragments round-trip through deterministic encode/parse logic;
- unknown fragment properties and duplicate fields are rejected;
- unrelated URL fragments are ignored;
- source evidence and launch objects are not mutated.

## Chromium browser coverage

Run:

```bash
npx playwright test tests/field-rehearsal-return.spec.js --reporter=line
```

The browser suite verifies:

- reviewing evidence alone does not enable the return action;
- explicit metadata download enables the return action for a valid metadata-complete rehearsal;
- the returned row, exact commit, and readiness arrive in `evidence.html`;
- recognized return fragments are removed from the address bar;
- the destination does not auto-populate the file input or load evidence;
- malformed return metadata fails visibly;
- a launched rehearsal whose row is changed before download cannot use the exact-commit return handoff;
- the return layer does not require localStorage or sessionStorage;
- the new controls remain contained at a 390px viewport and preserve 44px minimum action height.

## Static boundary checks

The dedicated GitHub Actions workflow checks:

- required static assets and documentation exist;
- JavaScript and test files pass syntax validation;
- both rehearsal and coverage entry points load the return core and browser layer;
- the service worker pre-caches both return assets as static files;
- no browser-storage, provider, network, synchronization, transfer-mutation, meeting-mutation, automatic-import, or background-sync implementation is introduced by the return layer;
- the repository keeps the `hub.methodz.ca` deployment boundary.
