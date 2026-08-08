# Field Evidence Coverage Matrix Changelog

## 1.0.0

- added `evidence.html` as a static same-commit physical-device coverage workspace;
- added portable `evidence-coverage-core.js` with strict Field Rehearsal report validation and normalization;
- added explicit file load, commit selection, coverage evaluation, clearing, and metadata-summary download actions;
- bounded imported evidence to 50 in-memory reports and 512 KiB per selected file;
- added six documented coverage rows for Desktop Chromium, Desktop non-Chromium, Android Chrome, iOS Safari, Tablet, and Two-device rehearsals;
- prevented evidence from different commit SHAs from being silently combined;
- made the latest same-row report control current row state while retaining evidence counts and issue references;
- excluded meeting content, identifiers, attendees, storage values, signatures, credentials, private keys, provider secrets, queues, and transfer contents;
- added portable, Chromium, mobile, and static deployment checks;
- preserved application shell `1.6.12`, meeting-record schema `1.6.0`, static deployment, browser-local default meeting storage, and the Method Hub deployment boundary.
