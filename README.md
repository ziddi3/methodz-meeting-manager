# Methodz Meeting Manager

Offline-first meeting preparation, capture, analysis, archive, recovery, transfer, and follow-up workflows for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**App shell 1.6.12 · Record schema 1.6.0 · Meeting review core 1.1.0 · Follow-up planning core 1.0.0 · Workspace capacity core 1.0.0 · Panel registry 1.0.0 · Hosted-provider contract 1.0.0**

The application remains plain HTML, CSS, and JavaScript with no required runtime packages and no build command. Open `meeting.html` directly for core meeting workflows or deploy the repository to any ordinary static host.

Version 1.6.12 adds:

- an explicit **Workspace Capacity** panel;
- bounded, deterministic localStorage collection and aggregate category and byte reporting without raw keys or values;
- an explicit unavailable state when browser-local key enumeration or value reads fail;
- optional browser origin-usage and quota comparison;
- a bounded, in-memory large-workspace Follow-Up Review rehearsal;
- metadata-only capacity and performance report downloads;
- no backend, credential, framework, build step, schema migration, automatic cleanup, record mutation, or background synchronization.

The current 1.x hardening layer also adds a read-only **Daily Focus** inside Follow-Up Review. It prioritizes incomplete saved tasks by deadline risk, missing setup, configured priority, and due date, then summarizes **Assigned To** workload. It does not update records, assign people, send reminders, contact assignees, or synchronize data.

The read-only **Follow-Up Planning Brief** extends that workflow with explicit 7, 14, and 30 day horizons. It groups incomplete tasks into overdue, due-today, within-window, needs-scheduling, and later lanes, then provides a bounded Assigned To outlook. Operators may open the source meeting or explicitly download a planning CSV, but the brief never changes records, assigns people, sends reminders, or synchronizes data.

## Entry points

```text
meeting.html   Main meeting and operator workspace
archive.html   Dedicated detail and print view
verify.html    Standalone signed-package verifier
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
- Review, focus, planning, capacity, recovery, synchronization, transfer, acceptance, and rollback operations remain explicit and user controlled.
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

Application shell and meeting workflow
  panel-registry-core.js
  panel-registry-definitions.js
  meeting-review-core.js
  follow-up-planning-core.js
  workspace-capacity-core.js
  app.js
  ordered features-v*.js layers

Archive, verification, and static shell
  archive*.js
  verify.js
  manifest.webmanifest
  service-worker.js
```

Script order is part of the runtime contract. Later layers intentionally extend stable functions created by earlier layers. v1.6.12 loads its portable capacity core before browser features, creates the dynamic capacity panel after the Follow-Up Review, and lets the v1.6.10 registry bind the completed shell before Meeting-Day navigation consumes registry metadata.

The planning layer preserves that contract by loading a standalone, DOM-free planning core and browser presentation through `config-v1611.js`. The service worker pre-caches those static assets. The browser presentation waits for the established Follow-Up Review panel, derives a report through the existing review core, and never writes source records.

## Hosted-provider boundary

No production provider is active. Passing the disposable provider conformance suite proves client-contract compatibility only. A production provider still requires authentication, server-enforced authorization, tenant isolation, encryption, durable audit, retention enforcement, backup, recovery, residency review, and incident response.

## Signing and verification

Optional ECDSA P-256 / SHA-256 signatures protect exported JSON package bytes and bound signature metadata. Private signing keys exist only in current page memory and may be downloaded only through an explicit sensitive-backup action.

A valid signature confirms integrity relative to the matching public key. It does not independently prove human identity, authority, recipient identity, approval legitimacy, delivery, or legal compliance.

## Static deployment

Supported modes include direct `file:` use, localhost, GitHub Pages, Cloudflare Pages, Netlify, Vercel static hosting, Render static hosting, and ordinary web servers. HTTPS or localhost is recommended for service-worker and Web Crypto availability.

Do not deploy this repository over `hub.methodz.ca`. Methodz Meeting Manager is a task-focused tool, not Method Hub, Nexus Hub, the Cathedral, a storefront, or a business container.

## Automated validation

GitHub Actions covers:

- JavaScript syntax and required-file wiring;
- panel registry and Meeting-Day behavior;
- live pulse, follow-up review, Daily Focus ordering, planning-lane ordering, bounded Assigned To workload, and no-mutation logic;
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

- execute documented Android, iOS, tablet, and two-device field rehearsals;
- continue real-device and large-workspace performance evidence collection;
- improve meeting-day review, Daily Focus, and planning ergonomics without silent automation;
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
