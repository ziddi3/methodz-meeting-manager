# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**App shell 1.6.4 · Record schema 1.6.0 · Hosted-provider contract 1.0.0 · Pilot transport 1.0.0**

The application is a static HTML, CSS, and JavaScript system with no runtime package dependencies and no build command. Open `meeting.html` directly or deploy the repository to an ordinary static host.

Version 1.6.4 adds a disposable, CI-only hosted-provider pilot without connecting production infrastructure:

- JSON-serialized HTTP-style request and response envelopes;
- a Promise-based client adapter that implements the complete provider contract;
- disposable tenant-isolated in-memory provider instances;
- bounded retries for retryable provider errors;
- rate-limit, timeout, unavailable, dropped-response, and partial-success fault injection;
- tenant-scoped idempotency and deterministic conflict behavior;
- uncertain-write recovery through idempotent replay;
- preservation tests for revisions, attachments, unknown fields, governance metadata, receipts, signatures, custody, and recovery metadata;
- diagnostics that exclude meeting content, record IDs, credentials, tokens, signatures, private JWK material, request bodies, and response bodies;
- a production-provider evidence gate covering authentication, authorization, tenant isolation, encryption, durable audit, recovery, residency, and incident response;
- no schema migration, production endpoint, credential, backend, framework, or deployed runtime dependency.

All earlier archive, revision, retention, preservation, redaction, export approval, recipient policy, disposition, signature-consent, directory, task, template, release-receipt, signing, verification, custody, recovery, offline, and provider-conformance features remain available.

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
- Exportable records before cloud sync
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
- Pilot transport logs never contain meeting payloads or credentials
- **Assigned To**, never “Owner,” for task responsibility
- **Organizations / Representatives Present** for participating groups

## Architecture

```text
Configuration
  config.js
  config-v11.js through config-v16.js
  config-v162.js
  config-v163.js
  config-v164.js

Schema and migration
  migrations.js
  migrations-v10.js through migrations-v16.js

Record providers
  data-adapter.js
  async-data-adapter.js
  provider-contract.js
  hosted-provider-adapters.js
  provider-conformance.js

CI-only provider pilot
  http-provider-pilot.js
  tests/v164-provider-pilot.mjs
  .github/workflows/provider-pilot.yml

Attachment provider
  attachment-adapter.js

Package boundaries
  crypto-package-core.js
  key-custody-core.js
  workspace-package-core.js

Core workspace
  app.js

Feature layers
  features-v03*.js through features-v16*.js
  features-v16-recovery.js
  features-v16-recovery-guards.js
  features-v162-custody.js

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

### Conflict behavior

Stored records receive a provider version and deterministic conflict token. Updating an existing record requires the token returned by the last read or write. Missing or stale tokens fail with a non-retryable `CONFLICT` error.

### Idempotency

`upsertRecord` accepts an idempotency key. Repeating the same key and request replays the original result. Reusing the key for different input fails with `IDEMPOTENCY_CONFLICT`.

### Archive, revisions, and unknown fields

Providers must preserve:

- active and archived record separation;
- revision snapshots;
- unknown current and future fields;
- retention, hold, disposition, redaction, approval, receipt, signature, custody, and recovery metadata;
- source integrity metadata.

An archived record must be restored before update. Permanent deletion requires explicit `{ permanent: true }` and may be strengthened by server-side policy.

### Provider exports

A provider export includes active records, archived records, revisions, provider metadata, and integrity metadata. Private JWK parameters and recognized private-key fields are rejected before export.

The compatibility integrity value detects changes. It is not a digital signature, identity proof, delivery proof, or immutable remote audit.

### Reference providers

- `InMemoryHostedProvider` is disposable and test-only.
- `LocalStorageHostedProvider` can bind to Methodz browser storage.
- CI uses isolated Storage-compatible objects and never writes to active user records.

Passing the conformance suite proves client-contract compatibility only. A production provider still needs server-side authentication, authorization, tenant isolation, encryption, credential handling, durable audit, retention enforcement, backup, recovery, and incident response.

See `docs/V1.6.3-PROVIDER-CONTRACT.md`.

## Hosted-provider pilot

`http-provider-pilot.js` places the provider contract behind a disposable serialized transport. It simulates uncertainty that does not appear in direct in-process adapters, including response loss after commit, rate limiting, timeouts, and partial success.

The pilot is deliberately excluded from all application entry points and the service-worker cache. It is executed only by Node-based CI tests. No production URL or credential is accepted or stored.

A production provider must pass both the v1.6.3 direct conformance suite and the v1.6.4 serialized transport suite, then satisfy the operational evidence gate.

See:

- `docs/V1.6.4-PROVIDER-PILOT.md`
- `docs/V1.6.4-TESTS.md`
- `docs/PRODUCTION-PROVIDER-EVIDENCE.md`

## Attachment boundary

The current attachment provider stores metadata references only:

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

Binary transfer is outside the v1.6.3 hosted-provider contract. Base64 blobs and `data:` payloads remain rejected.

## Recovery readiness

The Recovery Readiness panel provides no-write backup inspection and dry recovery drills. It validates package type, checksum, entry and byte limits, unsupported keys, private JWK material, summary counts, and the proposed storage mutation plan.

Default import limits:

```text
500 recognized storage entries
2 MiB per recognized entry
12 MiB total recognized workspace data
```

The existing replacement-restore and merge interfaces remain available. Shared recovery guards validate the selected package immediately before mutation.

See `docs/V1.6.1-RECOVERY-HARDENING.md`.

## Cryptographic package signatures

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

Private signing JWKs exist only in current page memory. Workspace validation blocks private JWK material from restore and merge. Provider exports add another fail-closed boundary.

A valid signature confirms package and signature-metadata integrity against the included public key. It does not independently prove signer identity, authority, recipient identity, delivery, approval legitimacy, or legal compliance.

## Public-key custody and rotation

The custody workspace records planned or completed rotation, revocation, lost-key response, and recovery-rehearsal evidence. Custody exports contain public JWKs and lifecycle metadata only. Recording a custody event does not automatically change key registry status.

See `docs/KEY-CUSTODY-OPERATIONS.md` and `docs/V1.6.2-VERIFICATION-CONFORMANCE.md`.

## External release controls

Approval remains bound to the source, redacted-content fingerprint, redaction profile, destination policy, optional recipient policy, governance version, status, and expiration.

Every successful approved external download creates a local release receipt with approval and destination snapshots, package integrity, release time, and receipt-chain metadata. The local chain provides change detection, not authenticated identity, delivery proof, or an immutable remote ledger.

## Retention, preservation, and disposition

Permanent Archive Vault removal requires:

1. no active preservation hold;
2. a documented disposition request and basis;
3. review by an authorized role;
4. a reviewer different from the requester;
5. a fingerprint matching the current archived record;
6. final deletion confirmation.

A hosted provider must preserve these controls and may strengthen them server-side. Provider synchronization is never itself approval or authority.

## Browser storage and backup practice

Workspace backup captures Methodz-prefixed browser-storage entries. Private signing keys are intentionally absent because they are never written to browser storage.

Recommended practice:

1. Export a Workspace Backup after important meetings.
2. Run a recovery drill after material workflow or browser changes.
3. Export before changing devices, browsers, or hosting origins.
4. Keep backups in a separate protected location.
5. Store private signing keys separately from signed packages, custody manifests, and workspace backups.
6. Preserve controlled source records separately from external copies.
7. Use a separate browser profile or device for restore rehearsals.
8. Independently confirm public-key IDs after generation, import, or rotation.

Clearing browser data can remove records and local governance metadata.

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

Service workers and Web Crypto are normally available on HTTPS or localhost. Direct-file mode keeps core meeting, provider, and recovery workflows, although cryptographic availability may vary by browser context.

## Automated validation

GitHub Actions performs:

1. JavaScript syntax checks;
2. required static-file and app-shell wiring checks;
3. Node Web Crypto signing and tamper tests;
4. Node workspace-package validation and restore-plan tests;
5. Node public-key custody manifest tests;
6. isolated hosted-provider conformance for disposable memory and localStorage providers;
7. serialized HTTP-style pilot conformance and network-fault scenarios;
8. manifest JSON validation;
9. isolated Playwright browser regression suites across supported engines.

Provider conformance and provider-pilot tests are separate jobs, so their failures are not blended with browser-engine failures. Playwright is installed only in CI and is not a deployed dependency.

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
docs/PRODUCTION-PROVIDER-EVIDENCE.md
docs/KEY-CUSTODY-OPERATIONS.md
```

Earlier version-specific documents remain in `docs/` for historical context.

## Roadmap

### 1.x hardening

- complete mobile and cross-device regression testing;
- consolidate older feature layers without breaking direct-file compatibility;
- run documented cross-device recovery and key-rotation rehearsals;
- evaluate production-provider candidates against the evidence gate;
- add a disposable synchronization coordinator for offline queue, conflict review, and explicit user-controlled push/pull rehearsals;
- preserve localStorage as the default until a hosted provider is explicitly approved.

### 2.0 hosted provider

- Firebase, Supabase, or Methodz API provider;
- authenticated user accounts and server-enforced permissions;
- organization and tenant isolation;
- organization-managed recipient policy and public-key administration;
- durable key revocation and rotation records;
- server-enforced retention, preservation, export approval, and disposition approval;
- append-only remote audit, release receipt, and recovery-drill storage;
- calendar and CRM integration;
- AI-assisted summaries with explicit human review;
- audio or video recording workflows with consent controls.
