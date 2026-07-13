# Methodz Meeting Manager

Offline-first meeting records for Canadian Soft Water Corporation, Method HVAC Inc., and future partner workflows connected through the Methodz brand ecosystem.

> Methodz is treated as a shared brand identity and operating ecosystem, not as a separate company.

## Current Release

**Version 1.0.0**

The application remains a static HTML/CSS/JavaScript app with no runtime package dependencies and no build command. It works by opening `meeting.html` directly and can also be deployed to any ordinary static host.

Version 1.0 adds:

- a consolidated active and archived records workspace
- role-aware record policies and classifications
- explicit electronic-signature consent
- signature verification status and audit fields
- a Promise-based meeting-provider contract
- an attachment-reference provider contract
- final release schema migration and validation
- automated v1.0 browser smoke coverage

## Entry Points

```text
meeting.html   Main meeting workspace
archive.html   Dedicated detail and print view
```

## Core Principles

- Offline first
- Static and directly deployable
- No required server
- No runtime framework
- Exportable records before cloud sync
- Non-destructive archive and revision history
- Explicit confirmation before destructive actions
- **Assigned To**, never “Owner,” for task responsibility
- **Organizations / Representatives Present** for participating groups
- Methodz described as a brand and operating ecosystem

## Main Architecture

```text
Configuration
  config.js

Schema and migration
  migrations.js
  migrations-v10.js

Record providers
  data-adapter.js
  async-data-adapter.js

Attachment providers
  attachment-adapter.js

Core workspace
  app.js

Feature layers
  features-v03*.js through features-v10*.js

Archive detail
  archive.js
  archive-v10.js

Static app shell
  manifest.webmanifest
  service-worker.js
```

## v1.0 Record Governance

Each record can carry:

- classification
- policy ID
- allowed viewing roles
- prepared-by and reviewed-by names
- review status
- protected record areas
- a policy note

Default roles:

```text
Administrator
Facilitator
Recorder
Participant
Auditor
Guest
```

Default policies:

```text
Standard Internal Record
Restricted Record
Read-Only Archive
Partner Shared Record
```

These controls enforce workflow behavior in the local interface. They are not an authentication boundary. A future remote provider must enforce permissions on the server.

## Electronic Signature Consent

A typed signature now requires explicit consent before the record can be saved.

Recorded fields include:

- consent accepted state
- consent statement version
- consent method
- consent timestamp
- verification status
- verifier
- verification timestamp
- verification note

“Name Match” means only that the normalized typed signature text matches the attendee name. It does not prove identity.

## Consolidated Records Workspace

Version 1.0 provides one searchable index for:

- active records
- archived records
- classifications
- policies
- release-readiness results

The workspace can export the filtered index as JSON without changing records.

## Data Provider Contracts

### Synchronous contract

`data-adapter.js` remains the immediate local record boundary.

Required methods:

```text
listRecords()
getRecord(recordId)
replaceRecords(records)
upsertRecord(record)
deleteRecord(recordId)
healthCheck()
```

### Asynchronous contract

`async-data-adapter.js` defines the Promise-based boundary for future Firebase, Supabase, CRM, Drive, or Methodz API providers.

The default `local-storage-async` provider wraps the current local adapter and transmits nothing.

Register a future provider with:

```js
window.MethodzMeetingAsyncData.registerAdapter(adapter);
window.MethodzMeetingAsyncData.useAdapter(adapter.id);
```

## Attachment Provider Contract

`attachment-adapter.js` defines a replaceable reference-storage boundary.

The default provider stores metadata references inside meeting records. It does not store binary files and rejects base64 or `data:` payloads.

Required methods:

```text
listReferences(record)
getReference(record, referenceId)
upsertReference(record, reference)
deleteReference(record, referenceId)
validateReference(reference)
healthCheck()
```

## Release Validation

The v1.0 release gate checks:

- record schema shape
- title and date
- governance fields
- signature consent
- declined or unverified signatures
- task assignment gaps
- attachment-reference safety and completeness

The audit can be exported as JSON.

## Storage Keys

```text
methodzMeetingRecords
methodzMeetingDraft
methodzMeetingTemplates
methodzMeetingDirectory
methodzMeetingNumbering
methodzOrganizationPresets
methodzOrganizationDirectory
methodzSyncQueue
methodzSyncLastExport
methodzMeetingRevisions
methodzArchivedMeetingRecords
methodzPreRestoreBackup
methodzAccessibilityPreferences
methodzMigrationState
methodzWorkspaceMergeLog
methodzMeetingRoleContext
methodzMeetingReleaseState
```

The original prototype key `meetingRecords` is still migrated when needed.

## Local Storage Warning

Records live in the browser and device where they were created unless exported. Clearing browser data can remove them.

Recommended practice:

1. Export a Workspace Backup after important meetings.
2. Export before changing devices, browsers, or hosting origins.
3. Keep backups in a separate protected folder or Drive location.
4. Preserve pre-restore and pre-merge recovery packages until the workspace is verified.

## Static Deployment

No build step is required.

Supported targets include:

- GitHub Pages
- Cloudflare Pages
- Netlify
- Vercel static hosting
- Render static hosting
- any ordinary web server
- localhost
- direct `file:` use for the core app

Service workers are available only on HTTPS or localhost. Direct-file mode keeps the meeting workflow but does not register the service worker.

## Automated Validation

GitHub Actions performs:

1. JavaScript syntax checks
2. required static-file checks
3. v1.0 module-wiring checks
4. manifest JSON validation
5. Playwright browser smoke tests

Playwright is installed only in CI.

## Documentation

```text
docs/ARCHITECTURE.md
docs/MANUAL-TEST-CHECKLIST.md
docs/V1.0-NOTES.md
docs/V1.0-ARCHITECTURE.md
docs/V1.0-TESTS.md
docs/V1.0-CHANGELOG.md
docs/SECURITY-AND-PRIVACY.md
docs/RELEASE-CHECKLIST.md
```

## Roadmap

### 1.x hardening

- complete browser and device regression testing
- improve record redaction and partner-safe export
- add cryptographic package signatures where appropriate
- refine retention and legal-hold workflows
- consolidate older feature layers without breaking direct-file compatibility

### 2.0

- Firebase or Supabase provider
- authenticated user accounts and server permissions
- calendar integration
- CRM integration
- AI-assisted summaries with explicit review
- audio or video recording workflows with consent controls
