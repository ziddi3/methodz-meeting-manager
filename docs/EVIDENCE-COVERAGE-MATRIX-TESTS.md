# Field Evidence Coverage Matrix Tests

## Portable core

Run:

```bash
node tests/evidence-coverage-core.mjs
```

Coverage includes source type/version validation, complete environment metadata, strict privacy-boundary enforcement, unknown-property exclusion, six-row same-commit classification, mixed-commit isolation, repeated-row latest-evidence selection, blocking issue references, metadata-only summary output, and the 50-report processing bound.

## Chromium coverage

The dedicated browser workflow verifies:

- file selection is inert until **Load Selected Evidence** is selected;
- no browser-storage reads occur on page load, file selection, import, evaluation, clearing, or summary download;
- mixed commits require explicit commit selection and are not silently combined;
- a complete six-row same-commit set reports `coverage-complete`;
- unsafe privacy-boundary evidence is rejected visibly;
- coverage-summary download remains metadata-only;
- clearing removes imported evidence from memory;
- 390px phone layout remains contained;
- primary controls and Workspace Home navigation meet the 44px minimum touch target.

## Static boundary checks

CI fails if required files or Workspace Home/service-worker wiring are missing, if the portable or browser layer references browser storage, if meeting-record mutation/provider write patterns appear, if a background sync handler is introduced, or if the new workspace claims the Method Hub deployment identity.

## Evidence CI does not create

Automated tests validate the coverage machinery. They do not substitute for Android, iOS, tablet, desktop, or two-device physical rehearsals. `coverage-complete` can only be meaningful when the imported reports were actually produced by the environments they describe.
