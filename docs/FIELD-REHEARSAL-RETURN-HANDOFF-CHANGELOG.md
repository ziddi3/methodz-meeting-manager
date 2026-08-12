# Field Rehearsal Return Handoff Changelog

## v1.1.0 · Methodz Meeting Manager v1.6.27

- added portable `field-evidence-integrity-core.js` with strict SHA-256 receipt normalization and exact-text hashing;
- advanced the Field Rehearsal return contract from `1.0.0` to `1.1.0`;
- generated a SHA-256 receipt only as part of the explicit **Download Metadata Evidence** action;
- kept the evidence JSON bytes, local file path, file name, meeting data, credentials, provider state, queues, and arbitrary notes out of the URL handoff;
- added the receipt as the only new return metadata alongside row key, exact commit SHA, readiness, and contract version;
- required a valid receipt before enabling exact-file return navigation;
- verified explicitly selected local file bytes against the returned receipt before accepting return-driven evidence in `evidence.html`;
- added normalized row, exact-commit, and readiness cross-checks after receipt matching;
- made receipt mismatch and metadata drift fail visibly with zero return-driven reports accepted;
- preserved ordinary manual evidence import when no return context is present;
- added portable integrity/return tests and Chromium coverage for exact downloaded bytes, tampered valid JSON, launch drift, malformed fragments, storage non-use, and narrow-phone containment;
- pre-cached the integrity helper as an ordinary static app-shell asset without changing app-shell identity;
- preserved application shell `1.6.12`, meeting-record schema `1.6.0`, browser-local default meeting storage, static deployment, and the `hub.methodz.ca` boundary;
- documented that receipt verification proves byte equality only, not device identity, operator identity, external evidence authenticity, authorization, delivery, legal approval, regulatory compliance, or production readiness.

## v1.0.0 · Methodz Meeting Manager v1.6.26

- added portable `field-rehearsal-return-core.js`;
- added `field-rehearsal-return.js` as the browser presentation layer for rehearsal and coverage workspaces;
- added an explicit return action that remains disabled until metadata evidence has been downloaded;
- derived only the six documented coverage rows from metadata-complete rehearsal evidence;
- added row-drift and target-commit-drift rejection when the rehearsal originated from the exact-commit launch handoff;
- added a bounded return fragment containing only contract version, row key, exact commit SHA, and readiness;
- added a visible Returned rehearsal context card in `evidence.html`;
- kept report file selection, loading, commit selection, and coverage evaluation explicit;
- added fail-visible handling for malformed or tampered return metadata;
- added portable and Chromium coverage plus static boundary validation;
- pre-cached the return core and browser layer as static app-shell assets;
- preserved application shell `1.6.12`, meeting-record schema `1.6.0`, browser-local default meeting storage, static deployment, and the `hub.methodz.ca` boundary.
