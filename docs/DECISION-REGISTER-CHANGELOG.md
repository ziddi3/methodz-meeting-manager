# Decision Register Changelog

## 1.0.0

- Added a portable, side-effect-free Decision Register core.
- Added deterministic Approved, Proposed, Deferred, Reversed, Other, and Needs Review lanes.
- Added explicit review issues for missing or invalid structured-decision metadata.
- Added free-form-only source-review items without parsing or copying prose.
- Added the static `decisions.html` workspace with local filters, explicit refresh, and protected visible CSV download.
- Advanced the existing preparation launch core and browser bridge to source-aware version `1.1.0` while preserving existing Preparation Brief hashes.
- Added a validated Decision Register handoff that opens the source meeting and focuses Decisions after operator action.
- Added bounded rendering, visible truncation evidence, malformed-storage handling, mobile containment, portable tests, Chromium tests, architecture notes, and operator guidance.
- Added the Decision Register route to the Meeting Preparation Brief.
- Pre-cached only the new static assets.
- Preserved app shell `1.6.12`, meeting-record schema `1.6.0`, browser-local storage, static deployment, explicit operator control, and the Method Hub deployment boundary.
