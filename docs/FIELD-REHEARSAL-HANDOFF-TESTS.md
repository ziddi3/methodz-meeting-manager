# Field Rehearsal Launch Handoff Tests

## Portable core

Run:

```bash
node tests/field-rehearsal-launch-core.mjs
```

The portable suite verifies:

- same-commit launches stay pinned to the source commit;
- new-commit launches reject the source commit as the target;
- a different valid target commit is accepted for a new-commit cycle;
- launch fragments round-trip through deterministic encode/parse logic;
- Android Chrome, iOS Safari, and desktop non-Chromium hints remain bounded and deterministic;
- tampered same-commit metadata fails closed;
- unknown fragment properties are rejected rather than retained;
- unrelated URL fragments are ignored;
- source rerun-plan objects are not mutated.

## Chromium browser coverage

Run:

```bash
npx playwright test tests/field-rehearsal-launch.spec.js --reporter=line
```

The browser suite verifies:

- a same-commit rerun row opens Field Rehearsal with the source commit pinned;
- new-commit row actions remain disabled until the operator enters a different valid resulting commit SHA;
- the selected row and exact commit boundary arrive in `rehearsal.html`;
- recognized launch fragments are removed from the address bar;
- deterministic platform/browser hints are applied without filling OS or browser versions;
- malformed/tampered handoffs fail visibly and do not populate the commit field;
- the launch layer does not require localStorage or sessionStorage;
- the Field Rehearsal surface remains contained at a 390px viewport and preserves 44px minimum action height.

## Static boundary checks

The dedicated GitHub Actions workflow checks:

- required static assets and documentation exist;
- JavaScript and test files pass syntax validation;
- both evidence and rehearsal entry points load `field-rehearsal-launch-core.js`;
- the service worker pre-caches the launch core as a static asset;
- no browser-storage, provider, network, synchronization, transfer, meeting-mutation, or background-sync implementation is introduced into the launch layer;
- the repository keeps the `hub.methodz.ca` deployment boundary.
