# Field Rehearsal Return Handoff Changelog

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
