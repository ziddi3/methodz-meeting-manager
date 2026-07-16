# Methodz Meeting Manager | Project Specification

## Purpose

Methodz Meeting Manager is an offline-first meeting management and records-governance application for Canadian Soft Water Corporation, Method HVAC Inc., and future partner organizations connected through the Methodz brand ecosystem.

Methodz is a brand identity and operating ecosystem, not a separate company. The application must preserve that distinction in wording, data labels, exports, and documentation.

## Product goals

- Work offline first.
- Remain usable on phones, tablets, and desktops.
- Store records locally before a hosted provider exists.
- Keep meeting information organized, recoverable, exportable, and reviewable.
- Support separate organizations, sole proprietors, partners, guests, and future recipient groups.
- Preserve controlled source records separately from external copies.
- Define provider boundaries for future Firebase, Supabase, CRM, Drive, or Methodz API integration.
- Add governance controls without presenting browser-local workflow metadata as authenticated identity or legal proof.

## Deployment contract

The current application uses plain HTML, CSS, and JavaScript.

```text
meeting.html   Main workspace
archive.html   Record detail and print surface
```

Core operation must require:

- no runtime package installation;
- no framework;
- no build command;
- no server;
- no network connection.

The optional service worker may cache static application assets on HTTPS or localhost. It must never cache meeting records or attachment payloads.

## Current release: 1.5.0

The application currently includes:

- meeting information and status;
- Organizations / Representatives Present;
- meeting-specific attendance and typed-signature consent;
- agenda, discussion notes, structured decisions, tasks, and summary;
- templates, directories, attachment references, and task dashboards;
- draft recovery, import/export, search, and print output;
- revision history, comparison, and restore;
- non-destructive Archive Vault;
- workspace backup, replacement restore, and merge recovery;
- ordered schema migration;
- synchronous, asynchronous, and attachment-provider contracts;
- classification, retention, preservation holds, and disposition approval;
- Partner Safe, Public Summary, and Custom External Copy profiles;
- destination-bound external release approval;
- named recipient-specific export policies and field allow-lists;
- policy stewardship, business purpose, risk tier, review cadence, and review queue;
- release receipts for approved external downloads;
- a locally chained receipt ledger with verification and export;
- optional PWA shell and CI-only Playwright browser tests.

## Important label rules

Do not use **Owner** for task responsibility. Preferred label:

- **Assigned To**

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

The schema is additive and JSON-friendly. Current records may include:

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
recipient-control and latest receipt references
disposition-control metadata
schema and release audit metadata
```

Unknown fields must survive migration, backup, merge, revision, archive, restore, and provider operations.

## Architecture standards

- Use semantic HTML.
- Keep labels explicit and business-safe.
- Keep JavaScript inspectable and dependency-free at runtime.
- Avoid hardcoding values that belong in configuration.
- Preserve direct-file operation.
- Confirm before clearing or destructive actions.
- Archive non-destructively by default.
- Do not remove features without an intentional replacement.
- Later feature modules may wrap stable functions, so script order is part of the runtime contract.
- Keep migrations ordered, idempotent, additive, and safe to repeat.

## Governance boundaries

Browser-local roles, requester names, reviewer names, policy stewards, recipient contacts, typed signatures, approvals, and release receipts are workflow metadata.

They do not independently prove:

- identity;
- legal authority;
- recipient identity;
- transmission;
- delivery;
- non-repudiation;
- regulatory compliance.

A future hosted provider must enforce authenticated permissions and durable audit controls server-side.

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

## Integrity terminology

Prefer SHA-256 through Web Crypto when available. Direct-file compatibility may use a clearly labeled checksum.

Never call a checksum or digest:

- a digital signature;
- proof of identity;
- proof of approval;
- proof of delivery;
- an immutable audit ledger.

Public-key signing may be added only after explicit design for key generation, custody, rotation, revocation, and verification.

## Testing standards

CI may install testing dependencies that are not deployed with the application.

Required automated gates:

1. JavaScript syntax checks.
2. Required-file checks.
3. HTML and service-worker wiring checks.
4. Manifest validation.
5. Browser smoke tests for current and regression workflows.

Manual release testing remains required for direct-file operation, mobile layout, printing, backup/restore, import safety, service-worker behavior, and destructive-action gates.

## Roadmap

### 1.x hardening

- Complete browser and device regression coverage.
- Add tamper and recovery simulations for receipt, approval, preservation, and disposition logs.
- Strengthen import validation and conflict reporting.
- Add provider conformance tests.
- Consolidate older feature layers without breaking direct-file compatibility.
- Improve large-workspace performance and bounded-storage reporting.
- Add optional public-key signatures only with a complete key-management design.

### 2.0 hosted provider

- Firebase, Supabase, or Methodz API provider.
- Authenticated user accounts.
- Server-enforced role permissions.
- Organization-managed recipient-policy administration.
- Server-enforced retention, preservation, approval, and disposition.
- Append-only remote audit and release receipt storage.
- Calendar integration.
- CRM integration.
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
- preserve migration order and data recovery;
- avoid unsupported claims about identity, signatures, compliance, or delivery;
- run or prepare regression checks for every release layer.
