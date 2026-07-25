# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**App shell 1.6.6 · Record schema 1.6.0 · Hosted-provider contract 1.0.0 · Pilot transport 1.0.0 · Synchronization queue package 1.0.0**

The application remains a static HTML, CSS, and JavaScript system with no runtime package dependencies and no build command. Open `meeting.html` directly for the core meeting workflow or deploy the repository to an ordinary static host.

Version 1.6.6 extends the explicit offline synchronization rehearsal with:

- durable tenant-scoped push and pull queues;
- integrity-checked queue export and import;
- no-write import preview and explicit approval;
- keep-local, newest-metadata, and retain-both merge strategies;
- fail-closed rejection of tampering, unsupported versions, cross-tenant packages, private keys, credentials, and embedded binary payloads;
- completed-entry compaction that protects pending, offline, retryable, and blocked-conflict work;
- bounded metadata-only operator evidence;
- workspace backup and recovery-plan coverage for tenant queue keys;
- browser regression tests for tenant isolation, reload recovery, uncertain-write replay, conflict-token persistence, archived pulls, reset instrumentation, and no automatic processing;
- no production endpoint, credential, backend, framework, or automatic background synchronization.

All earlier archive, revision, retention, preservation, redaction, export approval, recipient policy, disposition, signature-consent, directory, task, template, release-receipt, signing, verification, custody, recovery, offline, provider-conformance, and provider-pilot features remain available.

## Entry points

```text
meeting.html   Main meeting workspace
archive.html   Dedicated detail and print view
verify.html    Standalone signed-package verifier
```

## Core principles

- Offline first
- Static and directly deployable
- No required server
- No runtime framework
- Exportable records before hosted synchronization
- Non-destructive archive and revision history
- Explicit confirmation before destructive actions
- Active preservation holds block permanent disposition
- External downloads require matching approval metadata
- Recipient allow-lists apply only after redaction
- Typed signatures require consent and remain excluded from external copies
- Private signing keys never enter browser storage or provider exports
- Public-key custody evidence never mutates registry status automatically
- Workspace imports are validated immediately before mutation
- Recovery reports exclude meeting and workspace values
- Hosted-provider compatibility never substitutes for authentication or authority
- Synchronization rehearsal never substitutes for approval, identity, delivery, or remote audit
- Service workers cache static assets only and never process queue work
- **Assigned To**, never “Owner,” for task responsibility
- **Organizations / Representatives Present** for participating groups

## Architecture

```text
Configuration
  config.js
  config-v11.js through config-v16.js
  config-v162.js through config-v166.js

Schema and migration
  migrations.js
  migrations-v10.js through migrations-v16.js

Record providers
  data-adapter.js
  async-data-adapter.js
  provider-contract.js
  hosted-provider-adapters.js
  provider-conformance.js

Disposable provider pilot
  http-provider-pilot.js
  tests/v164-provider-pilot.mjs
  .github/workflows/provider-pilot.yml

Synchronization rehearsal
  sync-rehearsal-core.js
  sync-rehearsal-hardening.js
  features-v165-sync-rehearsal.js
  sync-queue-portability.js
  features-v166-sync-portability.js
  tests/v165-sync-rehearsal.mjs
  tests/v166-sync-portability.mjs
  tests/v166-sync-portability.spec.js
  .github/workflows/sync-rehearsal.yml

Attachment provider
  attachment-adapter.js

Package boundaries
  crypto-package-core.js
  key-custody-core.js
  workspace-package-core.js

Core workspace
  app.js
  features-v03*.js through features-v166*.js

Archive detail
  archive.js
  archive-v10.js
  archive-v11.js
  archive-v13.js

Standalone verification
  verify.html
  verify.js

Static app shell
  manifest.webmanifest
  service-worker.js
```

Later feature layers intentionally wrap stable functions created by earlier layers. Script order in the HTML entry points is part of the application contract.

## Synchronization rehearsal

The synchronization workspace uses a disposable, browser-local HTTP-style provider simulator. It supports explicit enqueue, preview, process, retry, discard, reconnect, and conflict-resolution operations.

It does **not** provide:

- a production endpoint;
- authenticated users;
- server-side permissions;
- durable remote audit;
- background synchronization;
- production credentials;
- automatic conflict resolution.

Queue packages can move pending rehearsal work between browser profiles. A queue package may contain meeting-record snapshots required for an explicit future operation and must therefore be protected like a full workspace backup.

Import is always a two-stage operation:

```text
choose package
  -> validate package type, version, tenant, entries, unsafe material, and integrity
  -> show a no-write preview
  -> choose merge strategy
  -> explicit approval
  -> update browser-local queue only
```

Imported work remains unprocessed until an operator presses **Process**.

Completed-entry compaction never removes pending, offline, retryable, or blocked-conflict entries. The browser-local operator log contains opaque references and bounded operational metadata only. It is not authenticated remote evidence.

See:

- `docs/V1.6.5-SYNC-REHEARSAL.md`
- `docs/V1.6.6-SYNC-PORTABILITY.md`
- `docs/V1.6.6-TESTS.md`

## Hosted-provider contract

`provider-contract.js` exports the portable `MethodzHostedProviderContract` browser global and CommonJS module.

A conforming provider implements Promise-returning operations:

```text
listRecords(options?)
getRecord(recordId, options?)
upsertRecord(record, options?)
archiveRecord(recordId, options?)
restoreRecord(recordId, options?)
deleteRecord(recordId, options?)
exportWorkspace(options?)
healthCheck()
```

Stored records receive a provider version and deterministic conflict token. Updating an existing record requires the token returned by the latest read or write. Repeating the same idempotency key and request replays the original result; reusing a key for different input fails.

Providers must preserve active and archived separation, revision snapshots, unknown fields, attachment references, integrity metadata, and all retention, hold, disposition, redaction, approval, receipt, signature, custody, and recovery metadata.

Private JWK material, credentials, embedded binary fields, and data URLs are rejected before provider writes and exports.

Passing conformance proves client-contract compatibility only. A production provider still requires server-side authentication, authorization, tenant isolation, encryption, key management, durable audit, retention enforcement, backup, recovery, residency review, and incident response.

See:

- `docs/V1.6.3-PROVIDER-CONTRACT.md`
- `docs/V1.6.4-PROVIDER-PILOT.md`
- `docs/PRODUCTION-PROVIDER-EVIDENCE.md`

## Recovery readiness

The Recovery Readiness panel provides no-write backup inspection and dry recovery drills. It validates package type, checksum, entry and byte limits, unsupported keys, private JWK material, summary counts, and the proposed storage mutation plan.

Default import limits:

```text
500 recognized storage entries
2 MiB per recognized entry
12 MiB total recognized workspace data
```

Workspace backup captures Methodz-prefixed browser-storage entries, including tenant-scoped rehearsal queues and operator-event logs. Private signing keys are absent because they are never written to browser storage.

Recommended practice:

1. Export a Workspace Backup after important meetings.
2. Run a recovery drill after material workflow or browser changes.
3. Export before changing devices, browsers, or hosting origins.
4. Keep backups in a separate protected location.
5. Store private signing keys separately from signed packages, custody manifests, and workspace backups.
6. Preserve controlled source records separately from external copies.
7. Use a separate browser profile or device for restore rehearsals.
8. Independently confirm public-key IDs after generation, import, or rotation.

See `docs/V1.6.1-RECOVERY-HARDENING.md`.

## Cryptographic package signatures and custody

Recommended external release flow:

```text
controlled source record
  -> redaction profile
  -> recipient field allow-list
  -> governance-version binding
  -> content fingerprint
  -> destination-bound approval
  -> approved download and release receipt
  -> optional ECDSA package signature
  -> independent verification
```

Private signing JWKs exist only in current page memory. Workspace validation and provider boundaries reject private JWK material.

A valid signature confirms package and signature-metadata integrity against the included public key. It does not independently prove signer identity, authority, recipient identity, delivery, approval legitimacy, or legal compliance.

The custody workspace records rotation, revocation, lost-key response, and recovery-rehearsal evidence. Custody exports contain public JWKs and lifecycle metadata only. Recording a custody event does not automatically change registry status.

See:

- `docs/KEY-CUSTODY-OPERATIONS.md`
- `docs/V1.6.2-VERIFICATION-CONFORMANCE.md`

## Retention, preservation, and disposition

Permanent Archive Vault removal requires:

1. no active preservation hold;
2. a documented disposition request and basis;
3. review by an authorized role;
4. a reviewer different from the requester;
5. a fingerprint matching the current archived record;
6. final deletion confirmation.

A hosted provider must preserve these controls and may strengthen them server-side. Synchronization is never itself approval or authority.

## Static deployment

No build step is required. Supported targets include:

- direct `file:` use for the core meeting workflow;
- localhost;
- GitHub Pages;
- Cloudflare Pages;
- Netlify;
- Vercel static hosting;
- Render static hosting;
- any ordinary web server.

Service workers and Web Crypto are normally available on HTTPS or localhost. Direct-file mode keeps core meeting, provider, recovery, and queue-package logic, although some browser security capabilities may vary by context.

## Automated validation

GitHub Actions performs:

1. JavaScript syntax checks;
2. required static-file and app-shell wiring checks;
3. Node Web Crypto signing and tamper tests;
4. workspace-package validation and recovery-plan tests;
5. public-key custody manifest tests;
6. hosted-provider conformance for disposable memory and isolated storage providers;
7. serialized HTTP-style pilot conformance and network-fault tests;
8. synchronization rehearsal and queue portability contracts;
9. manifest validation;
10. isolated Playwright browser regression suites, including portable verification in Chromium, Firefox, and WebKit.

Playwright is installed only in CI and is not a deployed dependency.

## Documentation

```text
docs/ARCHITECTURE.md
docs/MANUAL-TEST-CHECKLIST.md
docs/SECURITY-AND-PRIVACY.md
docs/RELEASE-CHECKLIST.md
docs/V1.6-NOTES.md
docs/V1.6-ARCHITECTURE.md
docs/V1.6-TESTS.md
docs/V1.6.1-RECOVERY-HARDENING.md
docs/V1.6.2-NOTES.md
docs/V1.6.2-ARCHITECTURE.md
docs/V1.6.2-TESTS.md
docs/V1.6.2-VERIFICATION-CONFORMANCE.md
docs/V1.6.3-PROVIDER-CONTRACT.md
docs/V1.6.3-TESTS.md
docs/V1.6.4-PROVIDER-PILOT.md
docs/V1.6.4-TESTS.md
docs/V1.6.5-SYNC-REHEARSAL.md
docs/V1.6.5-TESTS.md
docs/V1.6.6-SYNC-PORTABILITY.md
docs/V1.6.6-TESTS.md
docs/PRODUCTION-PROVIDER-EVIDENCE.md
docs/KEY-CUSTODY-OPERATIONS.md
```

Earlier version-specific documents remain in `docs/` for historical context.

## Roadmap

### 1.x hardening

- complete mobile and cross-device regression testing;
- consolidate older feature layers without breaking direct-file compatibility;
- run documented cross-device recovery, queue-transfer, and key-rotation rehearsals;
- evaluate production-provider candidates against the evidence gate;
- keep synchronization explicit and user-controlled until a production provider is approved;
- preserve localStorage as the default provider.

### 2.0 hosted provider

- Firebase, Supabase, or Methodz API provider;
- authenticated user accounts and server-enforced permissions;
- organization and tenant isolation;
- organization-managed recipient policy and public-key administration;
- durable key revocation and rotation records;
- server-enforced retention, preservation, export approval, and disposition approval;
- append-only remote audit, release receipt, synchronization, and recovery-drill storage;
- calendar and CRM integration;
- AI-assisted summaries with explicit human review;
- audio or video recording workflows with consent controls.
