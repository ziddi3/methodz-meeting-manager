# Methodz Meeting Manager

Offline-first meeting preparation, capture, analysis, archive, recovery, transfer, and follow-up workflows for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**App shell 1.6.12 · Record schema 1.6.0 · Meeting review core 1.1.0 · Follow-up planning core 1.0.0 · Workspace capacity core 1.0.0 · Workspace Home core 1.0.0 · Panel registry 1.0.0 · Hosted-provider contract 1.0.0**

The application remains plain HTML, CSS, and JavaScript with no required runtime packages and no build command. Open `index.html` for the lifecycle launchpad, open `meeting.html` directly for core meeting workflows, or deploy the repository to any ordinary static host.

The current 1.x hardening layer includes:

- an explicit **Workspace Home** with lifecycle links and an operator-triggered aggregate counts-only snapshot;
- an explicit **Workspace Capacity** panel with bounded browser-local storage reporting and synthetic performance rehearsal;
- read-only **Daily Focus** and **Follow-Up Planning Brief** workspaces;
- a read-only **Meeting Preparation Brief** with operator-controlled run-sheet preview and safe source handoff;
- an operator-controlled **Meeting Closeout Review**;
- a read-only **Decision Register** and **Meeting Outcomes Review**;
- no backend, credential, framework, build step, schema migration, automatic cleanup, record mutation, or background synchronization.

## Workspace Home

`index.html` is the static root entry point. It links the established Preparation, Meeting-Day, Decision Register, Meeting Outcomes, Archive, and Verify workflows without requiring a framework or provider.

The optional aggregate launch snapshot reads browser-local meeting records only after **Refresh Workspace Snapshot**. Its portable core retains counts, bounds, and report metadata only. It does not retain meeting titles, attendee names, notes, decisions, summaries, task text, Assigned To values, record identifiers, signatures, credentials, private keys, provider secrets, queue payloads, or hidden governance metadata.

The PWA identity remains `./meeting.html`, while the installed `start_url` is `./index.html`. This changes the launch surface without creating a second installed-app identity.

## Entry points

```text
index.html         Workspace Home and explicit aggregate launch snapshot
meeting.html       Main meeting and operator workspace
preparation.html   Upcoming-meeting preparation brief and run-sheet preview
decisions.html     Structured Decision Register
outcomes.html      Completed / archived Meeting Outcomes Review
archive.html       Dedicated record detail and print view
verify.html        Standalone signed-package verifier
```

## Direct meeting workflow

- Create and edit meeting information.
- Select organizations and representatives present.
- Capture attendance, consent, and typed signatures.
- Work through agenda items and discussion notes.
- Record decisions and follow-up tasks.
- Assign responsibility with **Assigned To**, never “Owner.”
- Create summaries and export TXT, JSON, HTML, CSV, print, and PDF-compatible output.
- Reopen, revise, compare, archive, restore, search, and filter records.
- Preserve governed source records while creating controlled external copies.

## Meeting Pulse

Meeting Pulse derives a read-only view from the current form. It reports readiness for:

```text
Meeting Information
Organizations / Representatives Present
Attendance
Agenda
Notes
Decisions
Follow-Up Tasks
Summary
```

It can focus the next incomplete section through the existing Meeting-Day navigation. Refreshing or navigating does not save the meeting, change its status, or mutate a record.

## Follow-Up Review

Follow-Up Review derives task status across saved active records. Operators can filter and search the local review, inspect the bounded Daily Focus queue, review Assigned To workload, build a Follow-Up Planning Brief, open a source meeting for explicit editing, or download an explicit CSV working copy.

Daily Focus excludes completed work and derives urgency bands and plain-language reasons such as overdue age, due-soon timing, missing Assigned To, invalid or missing due date, active status, and high priority. Ordering is deterministic and bounded by configuration.

The Follow-Up Planning Brief excludes completed work and places each incomplete task into one deterministic lane:

```text
Overdue
Due Today
Within Planning Window
Needs Scheduling
Later
```

The selected 7, 14, or 30 day horizon is stored only as a local display preference. The planning CSV contains meeting and task details and must be protected as business data. It excludes typed signatures, consent details, notes, decisions, credentials, private keys, provider secrets, queue payloads, and hidden governance metadata.

The review does not automatically update task status, assign people, send reminders, contact assignees, or synchronize data. Its review CSV excludes typed signatures, consent details, private keys, credentials, provider secrets, queue payloads, and hidden governance metadata.

## Meeting Preparation and run sheet

`preparation.html` provides a read-only preparation brief for active meetings inside explicit 7, 14, 30, or 60 day horizons. It reports required setup, same-day date pressure, and bounded carryover work without changing the source meeting.

Operators may explicitly open a saved meeting to prepare it or preview a bounded single-meeting run sheet. Preparation handoff uses a validated URL fragment, removes the fragment on arrival, and focuses the first missing preparation requirement without saving automatically.

## Decision Register and Meeting Outcomes

`decisions.html` reads structured decision entries into explicit review lanes and keeps free-form decision prose in source-review status rather than attempting to interpret it.

`outcomes.html` reviews Completed and Archived meetings for summary presence, structured decision readiness, and follow-up state. Both workspaces read browser-local records only after an explicit refresh and preserve source records.

## Workspace Capacity

Workspace Capacity runs only after an explicit operator action. It estimates the UTF-8 size of browser-local entries, groups them into aggregate categories, and may compare the measured total with `navigator.storage.estimate()` when the browser provides it.

For a capacity check, the collector enumerates and sorts all browser-local key names so deterministic selection, `totalEntries`, and truncation remain accurate. It reads values and retains raw snapshot entries only for the configured maximum number of selected keys. Archive-identifying keys are classified before active-record patterns, so real archive storage is reported as **Archive Vault** and cannot also count as active meeting records.

If localStorage length access, key enumeration, value collection, or the final consistency check fails, the report and interface show capacity as **unavailable**. They do not reinterpret the failure as a healthy zero-entry scan or expose a partial measurement. The metadata-only report uses the fixed `local-storage-read-failed` code, null local scan measurements, and empty categories; it never includes the raw error object or message.

The capacity panel also runs a bounded Follow-Up Review rehearsal with synthetic records held only in memory. Synthetic records are never saved, revised, archived, queued, transferred, or synchronized. Downloaded reports contain aggregate counts, byte totals, thresholds, and timing only. They exclude raw storage keys and values, meeting text, record identifiers, signatures, credentials, private keys, queue payloads, and hidden governance metadata.

The panel never cleans, compacts, archives, deletes, or changes data automatically. Its controls are excluded from meeting-draft autosave, so changing rehearsal inputs does not create a draft write. A verified backup remains required before any separate operator-led cleanup decision.

## Meeting-Day Mode

Meeting-Day Mode keeps the live route in front:

```text
Pulse
Meeting Information
Organizations / Representatives Present
Attendance
Agenda
Notes
Decisions
Tasks
Summary
Closeout Review
Save
```

Supporting governance, recovery, provider, synchronization, transfer, acceptance, diagnostics, capacity, planning, and saved-record tools are collapsed rather than removed. **Show Tools** reopens them. The last section and mode preference are restored locally after reload. `Alt+M` toggles Meeting-Day Mode when focus is outside a form control.

## Cross-device transfer and acceptance

The existing transfer workflow remains explicit:

1. save current work and retain a protected source backup;
2. build and download a transfer bundle;
3. inspect and verify it on the destination;
4. review collisions and run the no-write recovery drill;
5. approve the transfer explicitly;
6. complete destination acceptance;
7. retain the pre-import package until actual-use acceptance;
8. use the verified rollback rehearsal only through explicit approval.

Transfer, acceptance, diagnostics, rollback, readiness, registry, capacity, and field-rehearsal reports are metadata-only. Transfer bundles and workspace backups contain business data and must be protected accordingly.

## Core principles

- Offline first.
- Static and directly deployable.
- No required server or runtime framework.
- Browser-local storage remains the default provider.
- Exportable records before hosted synchronization.
- Explicit confirmation before destructive or external actions.
- Non-destructive archive and revision history.
- Active preservation holds block permanent disposition.
- Typed signatures require consent and remain excluded from external copies.
- Private signing keys never enter browser storage, provider exports, workspace backups, transfer bundles, reports, or service-worker caches.
- Review, focus, planning, capacity, preparation, outcomes, recovery, synchronization, transfer, acceptance, and rollback operations remain explicit and user controlled.
- Service workers cache static assets only and never process business data.
- Infrastructure supports the meeting workflow rather than replacing it.

## Architecture

```text
Configuration
  config.js through config-v1612.js

Schema and migration
  migrations.js through migrations-v16.js

Record and provider boundaries
  data-adapter.js
  async-data-adapter.js
  attachment-adapter.js
  provider-contract.js
  hosted-provider-adapters.js
  provider-conformance.js
  http-provider-pilot.js

Synchronization, transfer, acceptance, and recovery
  sync-rehearsal-core.js
  sync-rehearsal-hardening.js
  sync-queue-portability.js
  cross-device-transfer-core.js
  transfer-acceptance-core.js
  crypto-package-core.js
  key-custody-core.js
  workspace-package-core.js

Portable derived-workspace cores
  workspace-home-core.js
  meeting-review-core.js
  follow-up-planning-core.js
  workspace-capacity-core.js
  meeting-preparation-core.js
  meeting-preparation-launch-core.js
  meeting-run-sheet-core.js
  meeting-closeout-core.js
  decision-register-core.js
  meeting-outcomes-core.js

Application shell and browser presentation
  index.html + workspace-home.js
  app.js
  ordered features-v*.js layers
  preparation.html + meeting-preparation.js
  decisions.html + decision-register.js
  outcomes.html + meeting-outcomes.js

Archive, verification, and static shell
  archive*.js
  verify.js
  manifest.webmanifest
  service-worker.js
```

Script order in `meeting.html` remains part of the runtime contract. Later feature layers intentionally extend stable functions created by earlier layers. Dedicated derived workspaces load their own portable core before browser presentation and do not mutate source records implicitly.

## Hosted-provider boundary

No production provider is active. Passing the disposable provider conformance suite proves client-contract compatibility only. A production provider still requires authentication, server-enforced authorization, tenant isolation, encryption, durable audit, retention enforcement, backup, recovery, residency review, and incident response.

## Signing and verification

Optional ECDSA P-256 / SHA-256 signatures protect exported JSON package bytes and bound signature metadata. Private signing keys exist only in current page memory and may be downloaded only through an explicit sensitive-backup action.

A valid signature confirms integrity relative to the matching public key. It does not independently prove human identity, authority, recipient identity, approval legitimacy, delivery, or legal compliance.

## Static deployment

Supported modes include direct `file:` use, localhost, GitHub Pages, Cloudflare Pages, Netlify, Vercel static hosting, Render static hosting, and ordinary web servers. HTTPS or localhost is recommended for service-worker and Web Crypto availability.

Static hosting should serve `index.html` as the root document. Direct `meeting.html` URLs remain supported. Offline navigation uses the cached Workspace Home as the primary shell fallback and `meeting.html` as a secondary fallback.

Do not deploy this repository over `hub.methodz.ca`. Methodz Meeting Manager is a task-focused tool, not Method Hub, Nexus Hub, the Cathedral, a storefront, or a business container.

## Automated validation

GitHub Actions covers:

- Workspace Home explicit-read, aggregate privacy, manifest identity, mobile, and static-boundary behavior;
- JavaScript syntax and required-file wiring;
- panel registry and Meeting-Day behavior;
- live pulse, follow-up review, Daily Focus ordering, planning-lane ordering, bounded Assigned To workload, and no-mutation logic;
- preparation, run-sheet, Decision Register, and Meeting Outcomes derived-workspace behavior;
- explicit planning CSV download, planning-window preference recovery, and phone-width containment;
- deterministic bounded capacity collection, unavailable-read handling, archive precedence, privacy boundaries, and bounded in-memory performance rehearsal;
- cryptographic signing, recovery, and custody;
- hosted-provider conformance and network-fault pilots;
- synchronization rehearsal and queue portability;
- cross-device transfer, acceptance, and rollback;
- Chromium, Firefox, and WebKit verification coverage;
- phone viewport, touch target, navigation, and metadata-exclusion checks.

Playwright and other test packages are installed only in CI and are not deployed runtime dependencies.

## Current documentation

```text
docs/APPLICATION-MAP.md
docs/WORKSPACE-HOME.md
docs/WORKSPACE-HOME-TESTS.md
docs/WORKSPACE-HOME-CHANGELOG.md
docs/V1.6.19-RELEASE-ROADMAP.md
docs/ARCHITECTURE.md
docs/MANUAL-TEST-CHECKLIST.md
docs/SECURITY-AND-PRIVACY.md
docs/RELEASE-CHECKLIST.md
docs/V1.6.8-TRANSFER-REHEARSAL.md
docs/V1.6.9-TRANSFER-ACCEPTANCE.md
docs/V1.6.10-FIELD-REHEARSAL.md
docs/V1.6.10-ARCHITECTURE.md
docs/V1.6.11-ARCHITECTURE.md
docs/V1.6.11-TESTS.md
docs/V1.6.11-CHANGELOG.md
docs/V1.6.12-ARCHITECTURE.md
docs/V1.6.12-TESTS.md
docs/V1.6.12-CHANGELOG.md
docs/FOLLOW-UP-FOCUS.md
docs/FOLLOW-UP-FOCUS-TESTS.md
docs/FOLLOW-UP-PLANNING-BRIEF.md
docs/FOLLOW-UP-PLANNING-BRIEF-TESTS.md
docs/PRODUCTION-PROVIDER-EVIDENCE.md
docs/KEY-CUSTODY-OPERATIONS.md
```

## Roadmap

### 1.x hardening

- execute documented Android, iOS, tablet, and two-device field rehearsals from the Workspace Home launch surface;
- continue real-device and large-workspace performance evidence collection;
- improve meeting-day review, Daily Focus, planning, preparation, and outcomes ergonomics without silent automation;
- evaluate production-provider candidates against the evidence gate;
- keep synchronization explicit and user controlled;
- preserve browser-local storage as the default until a hosted provider is explicitly approved.

### 2.0 hosted provider

- explicitly approved Firebase, Supabase, or Methodz API provider;
- authenticated user accounts;
- server-enforced permissions and tenant isolation;
- durable organization-managed governance, retention, release, and key records;
- controlled synchronization with conflict resolution and recovery evidence;
- calendar and CRM integration;
- AI-assisted summaries with explicit human review;
- audio or video recording workflows with consent controls.

No 2.0 provider is active in this release.
