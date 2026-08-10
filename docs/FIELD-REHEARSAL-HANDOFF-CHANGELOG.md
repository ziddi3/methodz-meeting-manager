# Field Rehearsal Launch Handoff Changelog

## v1.0.0 · Methodz Meeting Manager v1.6.25

- added portable `field-rehearsal-launch-core.js`;
- added explicit **Open Rehearsal** actions to rerun-plan rows;
- pinned same-commit launches to the source commit;
- required an explicit different resulting commit SHA before new-commit launches become available;
- added a bounded metadata-only URL-fragment contract;
- added visible target-row, source-commit, target-commit, commit-policy, and browser-requirement guidance in `rehearsal.html`;
- consumed and removed recognized launch fragments before rehearsal continues;
- added fail-visible handling for malformed and tampered launch metadata;
- added portable and Chromium coverage plus static boundary validation;
- pre-cached the new launch core as a static app-shell asset;
- preserved application shell `1.6.12`, meeting-record schema `1.6.0`, browser-local default meeting storage, static deployment, and the `hub.methodz.ca` boundary.
