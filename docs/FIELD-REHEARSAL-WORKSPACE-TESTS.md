# Field Rehearsal Evidence Tests

## Portable core

Run:

```bash
node tests/field-rehearsal-core.mjs
```

Coverage includes:

- core, app-shell, and schema version contracts;
- viewport classification;
- all-pass readiness;
- fail and blocked precedence;
- `not-applicable` remaining incomplete;
- bounded aggregate values;
- deduplicated bounded issue-number handling;
- unknown-property exclusion;
- fixed privacy-boundary declarations.

## Browser coverage

The dedicated Chromium workflow serves the repository as ordinary static files and verifies:

- no storage read occurs on page load;
- environment inspection is explicit;
- inspection does not read browser-local meeting storage;
- all eight pass results produce `ready`;
- blocked results remain blocked;
- generated JSON exposes the current 1.6.12 shell and 1.6.0 schema;
- explicit download produces a metadata-only JSON file;
- privacy-boundary flags remain false;
- phone-width controls meet the 44-pixel minimum target;
- the page does not create horizontal overflow at 390px.

## Static boundary checks

The workflow rejects the change if:

- required static files are missing;
- the page is not reachable from Workspace Home;
- the new static assets are not present in the app-shell cache list;
- the new core or browser layer references `localStorage`, `sessionStorage`, or `indexedDB`;
- the browser layer contains meeting-record mutation calls or provider writes;
- a background sync handler appears;
- the new workspace claims the Method Hub deployment identity.

## Physical-device evidence still required

Automated Chromium coverage does not replace the real-device matrix. Android, iOS, tablet, desktop, print/PDF, offline reload, and two-device transfer/acceptance/rollback evidence must still be produced on physical hardware before a field-readiness claim is made.
