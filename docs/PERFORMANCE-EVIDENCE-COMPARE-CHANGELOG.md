# Performance Evidence Compare Changelog

## 1.0.0

- added `performance.html` as a dedicated static large-workspace timing comparison workspace;
- added portable `performance-evidence-core.js` with strict Workspace Capacity report validation and deterministic comparison math;
- added explicit file load, compare, clear, and metadata-summary download actions;
- bounded evidence to 20 in-memory runs and 512 KiB per selected file;
- added earliest-baseline, latest-run, fastest, median, slowest, target-pass, and regression trend signals;
- rejected unsupported reports and privacy-boundary violations fail visibly;
- ignored unknown properties instead of copying them into the comparison;
- excluded meeting content, record identifiers, storage keys/values, signatures, credentials, private keys, provider secrets, queue payloads, and transfer contents;
- added portable and Chromium coverage plus static deployment guards;
- linked the workspace from Workspace Home and added its static assets to the app-shell cache;
- preserved application shell `1.6.12` and meeting-record schema `1.6.0`.
