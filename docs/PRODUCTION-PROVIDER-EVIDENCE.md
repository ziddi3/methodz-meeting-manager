# Production Hosted-Provider Evidence Gate

Passing the Methodz provider conformance suite proves interface compatibility. It does not establish that a service is safe, authorized, durable, compliant, or operationally ready.

A Firebase, Supabase, Drive, CRM, Methodz API, or other hosted provider must supply reviewed evidence for every applicable section before production activation.

## 1. Provider identity and ownership

- [ ] Named provider, service owner, technical owner, and incident contact
- [ ] Approved production domains, project IDs, tenant IDs, and environments
- [ ] Documented separation of development, test, staging, and production
- [ ] Change-management and release-approval process
- [ ] Current architecture and data-flow diagram

## 2. Authentication

- [ ] Supported authentication mechanism and identity provider
- [ ] Session lifetime, refresh, revocation, and logout behavior
- [ ] Multi-factor authentication policy for privileged operators
- [ ] Machine identity and workload credential lifecycle
- [ ] Proof that credentials are never shipped in static client files

## 3. Authorization and separation of duties

- [ ] Server-enforced organization and record permissions
- [ ] Server-enforced role model for organizer, attendee, reviewer, auditor, and administrator actions
- [ ] Server-enforced requester/reviewer separation where required
- [ ] Authorization tests for direct API calls, not only UI controls
- [ ] Privileged-access review and emergency-access procedure

## 4. Tenant isolation

- [ ] Tenant key derivation and validation rules
- [ ] Storage-level tenant partitioning
- [ ] Cross-tenant read, write, archive, export, and idempotency tests
- [ ] Background-job and cache isolation tests
- [ ] Logging and metrics that do not reveal another tenant’s content

## 5. Transport and encryption

- [ ] TLS configuration and certificate ownership
- [ ] Encryption-at-rest scope and key-management owner
- [ ] Key rotation and revocation procedure
- [ ] Backup encryption and restore-key availability
- [ ] Explicit prohibition on private signing-key ingestion

## 6. Idempotency, conflicts, and retries

- [ ] Tenant-scoped idempotency storage and expiry policy
- [ ] Deterministic replay for the same key and request
- [ ] Rejection when a key is reused with different input
- [ ] Expected-conflict-token enforcement on updates
- [ ] Documented retryable and non-retryable error mapping
- [ ] Rate-limit and retry-after behavior
- [ ] Timeout behavior before and after a possible commit
- [ ] Partial-write detection and reconciliation process

## 7. Record lifecycle

- [ ] Active and archived records remain distinct
- [ ] Restore conflict protection
- [ ] Revision preservation and retention
- [ ] Unknown-field preservation during round trips
- [ ] Permanent deletion requires explicit intent and server policy
- [ ] Preservation holds block disposition server-side
- [ ] Disposition approval remains fingerprint-bound and separation-of-duties controlled

## 8. Governance metadata

- [ ] Retention classification and review dates survive synchronization
- [ ] Preservation events and holds survive synchronization
- [ ] Redaction profiles and recipient policies survive synchronization
- [ ] Export approvals and release receipts survive synchronization
- [ ] Signature metadata and public-key custody metadata survive synchronization
- [ ] Recovery-package and source-integrity metadata survive synchronization
- [ ] Hosted sync never silently converts local workflow labels into authenticated identity claims

## 9. Attachments

- [ ] Reference-only attachment behavior is supported
- [ ] Binary transfer, if introduced, uses a separate reviewed contract
- [ ] Malware scanning, content-type validation, size limits, and quarantine are documented
- [ ] Signed URL lifetime and authorization are documented
- [ ] Attachment deletion, retention, backup, and legal-hold behavior are documented

## 10. Logging and audit

- [ ] Logs exclude meeting content unless an explicitly approved secure audit design requires it
- [ ] Logs exclude passwords, credentials, authorization headers, tokens, private keys, and private JWK parameters
- [ ] Correlation IDs are opaque and non-secret
- [ ] Durable audit records are append-only or otherwise tamper-evident
- [ ] Audit retention and access controls are documented
- [ ] Operators can trace a failed request without exposing the record body

## 11. Backup and recovery

- [ ] Backup frequency, retention, encryption, and geographic scope
- [ ] Point-in-time recovery capability and limits
- [ ] Documented recovery-time and recovery-point objectives
- [ ] Successful restore evidence from a non-production rehearsal
- [ ] Verification that archives, revisions, holds, receipts, custody metadata, and integrity values survive restore
- [ ] Lost-key and unavailable-key recovery procedure

## 12. Availability and incident response

- [ ] Availability objective and monitoring coverage
- [ ] Rate-limit, dependency-failure, and degraded-mode behavior
- [ ] Incident severity definitions and escalation paths
- [ ] Breach and privacy-incident response procedure
- [ ] Customer and organization notification process
- [ ] Post-incident review and corrective-action tracking

## 13. Privacy, residency, and retention

- [ ] Data classification and privacy impact review
- [ ] Applicable legal and contractual requirements
- [ ] Data residency locations and subprocessors
- [ ] Retention and deletion guarantees
- [ ] Export and access-request procedures
- [ ] Production data is prohibited from disposable test environments

## 14. Conformance evidence

- [ ] Provider contract version declared
- [ ] Complete `provider-conformance.js` suite passes
- [ ] Complete HTTP-style pilot scenarios pass
- [ ] Cross-tenant idempotency and isolation tests pass
- [ ] Serialization preserves all required metadata
- [ ] Tamper and unsafe-payload tests pass
- [ ] Diagnostic-redaction tests pass
- [ ] Results are linked to an immutable commit and reviewed release candidate

## Decision record

A production-provider decision should record:

- provider and version;
- reviewed commit or release;
- evidence owner;
- reviewers;
- unresolved risks and accepted exceptions;
- approval date and expiry/review date;
- rollback provider and recovery procedure.

No provider should replace the offline localStorage default solely because it passes automated conformance tests.
