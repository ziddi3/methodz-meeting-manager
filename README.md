# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is a shared brand identity and operating ecosystem, not a separate company.

## Current release

**Version 1.5.0**

The application remains a static HTML, CSS, and JavaScript app with no runtime package dependencies and no build command. Open `meeting.html` directly or deploy the repository to an ordinary static host.

Version 1.5 adds:

- recipient-policy stewardship and accountable roles;
- approved business-purpose and information-risk metadata;
- configurable policy review cadence;
- a review queue for overdue, due-soon, current, undated, and inactive policies;
- governance-version binding in external export fingerprints;
- release receipts for approved external JSON and HTML downloads;
- a locally chained receipt ledger with verification and export;
- latest receipt references on active and archived source records;
- browser smoke coverage for the new workflow.

All earlier archive, revision, recovery, retention, preservation, redaction, export approval, recipient policy, disposition, signature-consent, directory, task, template, and offline features remain available.

## Entry points

```text
meeting.html   Main meeting workspace
archive.html   Dedicated detail and print view
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
- External copies remain separate from controlled source records
- Recipient allow-lists apply only after redaction
- Typed signatures require consent and remain excluded from external copies
- **Assigned To**, never “Owner,” for task responsibility
- **Organizations / Representatives Present** for participating groups
- Methodz described as a brand and operating ecosystem

## Architecture

```text
Configuration
  config.js
  config-v11.js through config-v15.js

Schema and migration
  migrations.js
  migrations-v10.js through migrations-v15.js

Record providers
  data-adapter.js
  async-data-adapter.js

Attachment provider
  attachment-adapter.js

Core workspace
  app.js

Feature layers
  features-v03*.js through features-v15*.js

Archive detail
  archive.js
  archive-v10.js
  archive-v11.js
  archive-v13.js

Static app shell
  manifest.webmanifest
  service-worker.js
```

Later feature layers intentionally wrap stable functions created by earlier layers. Script order in the HTML entry points is part of the application contract.

## v1.5 policy operations

Each recipient policy may have a separate governance record:

```text
policyId
stewardName
stewardRole
riskTier
businessPurpose
cadenceDays
lastReviewedAt
lastReviewedBy
reviewNote
createdAt
updatedAt
```

Marking a policy reviewed records the reviewer and note, then advances the policy review date using the configured cadence. Existing v1.4 enforcement still blocks inactive or overdue recipient policies.

When governance metadata exists, a recipient-specific preview includes a governance snapshot and version marker. That marker participates in the redacted-content fingerprint. Changing stewardship, risk, purpose, cadence, or review metadata therefore requires a new matching approval.

## External release receipts

Every successful approved external download creates a receipt containing:

- approval ID and approval snapshot;
- source meeting reference;
- destination and recipient policy snapshot;
- policy governance snapshot when available;
- redaction profile;
- JSON or HTML format;
- package integrity value;
- release timestamp;
- previous receipt digest and current receipt digest.

The local ledger can be searched, verified, exported, or downloaded one receipt at a time. All legacy external-download controls are routed through the approved receipt-producing path.

Receipt chaining uses canonical JSON and FNV-1a-32 for direct-file compatibility. This provides local change detection only. It is not a digital signature, identity proof, delivery receipt from another party, or immutable compliance ledger.

## Recipient-specific export policies

A recipient policy records:

```text
policy label
named recipient or accountable contact
organization
contact reference
base destination policy
allowed redaction profiles
maximum permitted field groups
status
review date
verification note
```

Every active policy becomes a unique runtime destination:

```text
recipient:<policy-id>
```

The export pipeline is:

```text
controlled source record
  -> redaction profile
  -> recipient field allow-list
  -> governance-version binding
  -> integrity calculation
  -> destination-bound approval
  -> approved download
  -> release receipt
```

Recipient policies are subtractive. They can remove additional information but cannot restore anything removed by the selected redaction profile.

## Approval and disposition controls

External release approval is bound to:

- the source record or current meeting form;
- the redacted-content fingerprint;
- the redaction profile;
- the destination policy;
- the recipient policy when selected;
- the governance version when available;
- approval status and expiration.

Permanent Archive Vault removal requires:

1. no active preservation hold;
2. a documented disposition request and basis;
3. review by an authorized role;
4. a reviewer different from the requester;
5. a fingerprint matching the current archived record;
6. final deletion confirmation.

Browser-local requester, reviewer, steward, and recipient names are workflow metadata. They are not authenticated identities or legal signatures.

## Retention and preservation

Records may carry retention policy, review date, lifecycle state, notes, legal-hold state, and hold history. Included presets are workflow aids, not legal advice. Confirm applicable business, tax, employment, privacy, insurance, safety, litigation, and contractual requirements before disposition.

## Partner-safe external copies

- **Partner Safe** keeps operational content while removing typed signatures, internal notes, contact details, protected governance notes, file locations, and internal provider metadata.
- **Public Summary** exports high-level metadata, organizations, completed agenda items, approved structured decisions, and the reviewed summary.
- **Custom External Copy** permits destination-approved sections while always removing signature and signature-verification data.

Preferred package integrity is SHA-256 through Web Crypto. Direct-file mode uses a clearly labeled FNV-1a-32 compatibility checksum when Web Crypto is unavailable.

## Provider contracts

### Synchronous record adapter

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

### Asynchronous record adapter

`async-data-adapter.js` defines the Promise-based boundary for future Firebase, Supabase, CRM, Drive, or Methodz API providers. The default provider wraps local storage and transmits nothing.

### Attachment adapter

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

The default attachment provider stores metadata references only. It rejects base64 and `data:` binary payloads.

## Browser storage

Primary v1.x collections include:

```text
methodzMeetingRecords
methodzMeetingDraft
methodzMeetingTemplates
methodzMeetingDirectory
methodzMeetingNumbering
methodzOrganizationPresets
methodzOrganizationDirectory
methodzMeetingRevisions
methodzArchivedMeetingRecords
methodzPreRestoreBackup
methodzMigrationState
methodzMeetingRoleContext
methodzRedactionExportLog
methodzExternalExportApprovals
methodzExternalExportApprovalLog
methodzDispositionApprovals
methodzDispositionAuditLog
methodzPreservationEventChain
methodzRecipientExportPolicies
methodzRecipientPolicyAudit
methodzRecipientPolicyGovernance
methodzExternalReleaseReceipts
```

Workspace backup captures Methodz-prefixed browser-storage entries, including the v1.5 collections.

Records and governance data live in the browser and device where they were created unless exported. Clearing browser data can remove them.

Recommended practice:

1. Export a Workspace Backup after important meetings.
2. Export before changing devices, browsers, or hosting origins.
3. Keep backups in a separate protected folder or Drive location.
4. Preserve controlled source records separately from external copies.
5. Export approval, disposition, preservation, recipient-policy, governance, and receipt reports for important decisions.
6. Do not treat browser-local logs or receipts as immutable remote audit records.

## Static deployment

No build step is required.

Supported targets include:

- direct `file:` use for the core app;
- localhost;
- GitHub Pages;
- Cloudflare Pages;
- Netlify;
- Vercel static hosting;
- Render static hosting;
- any ordinary web server.

Service workers and Web Crypto are normally available on HTTPS or localhost. Direct-file mode keeps the meeting workflow and uses compatibility checksums where required.

## Automated validation

GitHub Actions performs:

1. JavaScript syntax checks;
2. required static-file checks;
3. v1.5 module-wiring and service-worker checks;
4. manifest JSON validation;
5. Playwright browser smoke tests.

Playwright is installed only in CI and is not a deployed dependency.

## Documentation

```text
docs/ARCHITECTURE.md
docs/MANUAL-TEST-CHECKLIST.md
docs/SECURITY-AND-PRIVACY.md
docs/RELEASE-CHECKLIST.md
docs/V1.5-NOTES.md
docs/V1.5-ARCHITECTURE.md
docs/V1.5-TESTS.md
docs/V1.5-CHANGELOG.md
```

Earlier version-specific documents remain in `docs/` for historical context.

## Roadmap

### 1.x hardening

- complete browser and device regression testing;
- consolidate older feature layers without breaking direct-file compatibility;
- add optional public-key signatures only with explicit key custody and rotation design;
- strengthen import validation and recovery simulations;
- prepare hosted provider conformance tests.

### 2.0 hosted provider

- Firebase, Supabase, or Methodz API provider;
- authenticated user accounts and server-enforced permissions;
- organization-managed recipient policy administration;
- server-enforced retention, preservation, export approval, and disposition approval;
- append-only remote audit and release receipt storage;
- calendar and CRM integration;
- AI-assisted summaries with explicit human review;
- audio or video recording workflows with consent controls.
