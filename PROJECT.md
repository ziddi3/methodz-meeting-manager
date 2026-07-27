# Methodz Meeting Manager | Project Specification

## Purpose

Methodz Meeting Manager is an offline-first meeting preparation, capture, analysis, archive, recovery, and records-governance application for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations connected through the Methodz brand ecosystem.

Methodz is a brand identity and operating ecosystem, not a separate company. The application must preserve that distinction in wording, data labels, exports, and documentation.

## Product goals

- Work offline first.
- Remain usable on phones, tablets, and desktops.
- Store records locally before a hosted provider exists.
- Keep meeting information organized, recoverable, exportable, and reviewable.
- Support separate organizations, sole proprietors, partners, guests, and future recipient groups.
- Preserve controlled source records separately from external copies.
- Make backup, recovery, device transfer, and synchronization operations explicit and reversible.
- Define provider boundaries for future Firebase, Supabase, CRM, Drive, or Methodz API integration.
- Add governance controls without presenting browser-local workflow metadata as authenticated identity or legal proof.

## Deployment contract

The application uses plain HTML, CSS, and JavaScript.

```text
meeting.html   Main meeting workspace
archive.html   Record detail and print surface
verify.html    Standalone signed-package verifier
```

Core meeting operation must require:

- no runtime package installation;
- no framework;
- no build command;
- no mandatory server;
- no network connection.

The optional service worker may cache static application assets on HTTPS or localhost. It must never read, cache, transmit, import, merge, or process meeting records, workspace backups, transfer bundles, private keys, or synchronization queue work.

Do not deploy this repository over `hub.methodz.ca`. It is a task-focused meeting tool, not Method Hub, Nexus Hub, the Cathedral, or a storefront container.

## Current release: app shell 1.6.8, record schema 1.6.0

The application currently includes:

- meeting information and status;
- Organizations / Representatives Present;
- meeting-specific attendance and typed-signature consent;
- agenda, discussion notes, structured decisions, tasks, and summary;
- templates, directories, attachment references, and task dashboards;
- draft recovery, import/export, search, print, and archive views;
- revision history, comparison, and restore;
- non-destructive Archive Vault;
- workspace backup, replacement restore, merge recovery, and pre-restore recovery packages;
- ordered, repeatable schema migration;
- synchronous, asynchronous, attachment, and hosted-provider contracts;
- classification, retention, preservation holds, and disposition approval;
- governed external-copy redaction, recipient policies, destination-bound approval, and release receipts;
- optional ECDSA P-256 package signing with memory-only private keys;
- public-key registry, rotation, revocation, custody, and recovery-rehearsal evidence;
- fail-closed package inspection and no-write recovery drills;
- disposable hosted-provider and synchronization rehearsals;
- tenant-scoped queue export, import, collision review, compaction, and metadata-only operator evidence;
- mobile Device Readiness, persistent-storage controls, touch-target hardening, and phone navigation;
- guided cross-device transfer bundles with component integrity validation, collision review, no-write drills, pre-import recovery, post-write verification, and rollback;
- CI-only Node and Playwright regression suites.

## Important label rules

Do not use **Owner** for task responsibility. Use **Assigned To**.

Use **Organizations / Representatives Present** instead of **Companies Present**.

Use **Methodz Brand Mark** instead of **Methodz Company Logo**.

## Brand context

Canadian Soft Water Corporation and Method HVAC Inc. are separate business entities.

Methodz is the shared brand identity, design language, operating ecosystem, and future platform layer. Do not imply Methodz is a registered company unless future business records explicitly establish that status.

## Default organizations

- Canadian Soft Water Corporation
- Method HVAC Inc.
- Sole Proprietor / Partner
- Guest / Other

## Default agenda categories

### Operations

- Scheduling and advance notice
- Childcare support for last-minute jobs
- Compensation and workload review
- Travel, meals, and weekend policy
- Employee retention and workload sustainability

### Marketing & Branding

- Current marketing channels
- Method HVAC marketing inclusion
- Canadian Soft Water logo decision
- Old franchise logo removal
- New merchandise and branded materials
- Vehicle decals, uniforms, hats, business cards, and print materials
- Brand relationship between CSW, Method HVAC, and the Methodz brand identity
- Visual separation versus shared brand alignment

### Technology & Workflow

- CRM and workflow improvements
- Meeting records app proposal
- Customer communication process
- Installer scheduling workflow
- Records, signatures, and meeting archive process

## Record architecture

The schema is additive and JSON-friendly. Records may include:

```text
identity and meeting metadata
organizations and organization snapshots
attendance, signature consent, and verification metadata
agenda and discussion notes
free-form and structured decisions
follow-up tasks
attachment references
summary and validation
revision and adapter metadata
classification and access-control metadata
retention and preservation-hold metadata
external release-control metadata
recipient-control and receipt references
disposition-control metadata
public signature and custody references
recovery and synchronization metadata
schema and release audit metadata
```

Unknown fields must survive migration, backup, merge, revision, archive, restore, provider operations, synchronization rehearsal, and cross-device transfer.

## Architecture standards

- Use semantic HTML and accessible controls.
- Keep labels explicit and business-safe.
- Keep JavaScript inspectable and dependency-free at runtime.
- Avoid hardcoding values that belong in configuration.
- Preserve direct-file operation for core meeting workflows.
- Confirm before clearing, replacing, deleting, importing, releasing, or synchronizing data.
- Archive non-destructively by default.
- Create recovery material before replacement mutations.
- Revalidate imported packages immediately before mutation.
- Roll back when a staged multi-entry mutation cannot be verified.
- Do not remove features without an intentional replacement.
- Later feature modules may wrap stable functions, so script order is part of the runtime contract.
- Keep migrations ordered, idempotent, additive, and safe to repeat.
- Keep service-worker responsibilities limited to static application assets.

## Governance boundaries

Browser-local roles, requester names, reviewer names, policy stewards, recipient contacts, typed signatures, approvals, receipts, custody events, readiness results, synchronization events, and transfer reports are workflow metadata.

They do not independently prove:

- identity;
- legal authority;
- recipient identity;
- device identity;
- transmission or delivery;
- non-repudiation;
- production-provider durability;
- regulatory compliance.

A future hosted provider must enforce authenticated permissions, tenant isolation, encryption, retention, durable audit, backup, recovery, and incident response server-side.

## External copy pipeline

```text
controlled source record
  -> redaction profile
  -> recipient field allow-list
  -> policy governance version
  -> integrity calculation
  -> destination-bound approval
  -> approved external package
  -> release receipt
```

A later layer may remove additional content or bind metadata. It must never restore sensitive content removed by an earlier layer.

Typed signatures, consent records, signature-verification data, and signed timestamps must remain excluded from every external copy.

## Backup and transfer pipeline

```text
saved source workspace
  -> complete workspace package
  -> tenant queue package
  -> metadata-only operator evidence
  -> metadata-only Device Readiness report
  -> integrity-checked transfer bundle
  -> destination inspection
  -> collision review
  -> no-write recovery drill
  -> explicit approval
  -> pre-import recovery package
  -> staged replacement and verification
  -> rollback on failure
  -> metadata-only rehearsal report
```

A transfer bundle contains meeting and workspace values and must be protected like a complete business backup. A rehearsal report contains only aggregate and opaque operational metadata.

## Integrity terminology

- Use ECDSA P-256 / SHA-256 signatures only through the established cryptographic package boundary.
- Keep private signing keys memory-only unless the operator explicitly downloads a sensitive backup.
- Use clearly labeled checksums for direct-file-compatible package change detection.
- Never call a checksum proof of identity, authority, approval, delivery, or immutable audit.
- A valid digital signature proves package integrity relative to a matching public key. It does not independently prove who controlled the key or whether a release was authorized.

## Testing standards

CI may install testing dependencies that are not deployed with the application.

Required automated gates:

1. JavaScript syntax checks.
2. Required-file and script-order checks.
3. Manifest and service-worker boundary validation.
4. Cryptographic, recovery, custody, provider, synchronization, mobile, and transfer core tests.
5. Browser regression tests for current and earlier workflows.
6. Tamper, private-material, cancellation, rollback, and no-write assertions.

Manual release testing remains required for direct-file operation, real mobile devices, printing, backup and restore, key custody, cross-device transfer, service-worker behavior, and destructive-action gates.

## Roadmap

### 1.x hardening

- Complete real-device Android and iOS regression testing.
- Complete a documented two-device transfer and rollback rehearsal.
- Consolidate older feature layers without breaking direct-file compatibility.
- Improve the direct meeting capture experience before adding more infrastructure.
- Improve large-workspace performance and bounded-storage reporting.
- Evaluate production-provider candidates against the evidence gate.
- Keep synchronization explicit and user-controlled.
- Preserve browser-local storage as the default until a hosted provider is explicitly approved.

### 2.0 hosted provider

- Explicitly approved Firebase, Supabase, or Methodz API provider.
- Authenticated user accounts.
- Server-enforced role permissions and tenant isolation.
- Organization-managed recipient-policy, retention, preservation, approval, and disposition controls.
- Append-only remote audit and release receipt storage.
- Controlled synchronization with conflict resolution and recovery evidence.
- Calendar and CRM integration.
- AI-assisted summaries with explicit human review.
- Audio and video workflows with consent controls.

## Agent rules

Any AI agent working on this repository must:

- preserve offline functionality;
- keep the interface professional and mobile-friendly;
- use Methodz as a brand identity, not a company;
- use **Assigned To** for task responsibility;
- build incrementally and document meaningful changes;
- avoid unnecessary dependencies;
- preserve migration order, package integrity, and recovery paths;
- keep private keys and credentials out of storage and exports;
- avoid unsupported claims about identity, signatures, compliance, devices, authority, or delivery;
- run or prepare regression checks for every release layer;
- stop rather than silently crossing the Method Hub, Nexus Hub, Cathedral, storefront, or production-provider boundaries.
