# Performance Evidence Compare Tests

## Portable core

Run:

```bash
node tests/performance-evidence-core.mjs
```

Coverage includes source report type/version validation, privacy-boundary enforcement, bounded numeric normalization, unknown-property exclusion, deterministic chronological baseline selection, fastest/median/slowest duration math, target-pass counts, regression/improvement/stable classification, 20-run bounding, and metadata-only comparison summary output.

## Chromium coverage

The dedicated static-server browser workflow verifies:

- file selection is inert until **Load Selected Evidence** is selected;
- no browser-storage reads occur on page load, file selection, load, comparison, or download;
- accepted and rejected files are reported visibly;
- unsafe privacy-boundary evidence is rejected;
- comparison calculates the expected baseline-to-latest regression;
- comparison summary download is explicit and metadata-only;
- clearing removes all in-memory evidence;
- 390px phone layout remains contained;
- primary controls and Workspace Home navigation meet the 44px minimum touch target.

## Static boundary checks

CI rejects the change if required files are missing, Workspace Home or service-worker wiring is absent, the new core/browser layer references browser storage, the browser layer contains meeting-record mutation/provider write calls, a background sync handler appears, or the new workspace claims the Method Hub deployment identity.

## Evidence not proven by CI

Automated tests validate the comparison machinery, not real-device performance. Meaningful timing evidence still requires repeated Workspace Capacity rehearsals on the actual browsers/devices being evaluated with consistent synthetic workload parameters.
