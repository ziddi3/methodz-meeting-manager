# Security and Privacy Boundaries

## Local Storage

Meeting data is stored in browser local storage. It is not encrypted by this application.

Anyone with access to the same browser profile and device may be able to inspect the records, drafts, archive, revision history, retention metadata, and export activity log.

Do not treat local role selection as user authentication.

## Role Policies

Role and policy controls are workflow safeguards for a single-browser application. They can reduce accidental edits or exports, but they cannot prove identity or stop a technically capable person with device access.

A future cloud provider must enforce:

- authenticated identity
- server-side authorization
- organization tenancy
- audit logging
- revocation
- secure session handling
- legal-hold and disposition rules
- retention policy
- external-copy authorization

## Typed Signatures

Typed signatures are stored as record text.

The application records consent and verification metadata, but it does not provide legal advice, biometric verification, certificate-based signing, or cryptographic non-repudiation.

“Name Match” is a text equality check only.

Every v1.1 external-copy profile removes typed signatures, consent records, verification details, signer timestamps, and verifier data.

## Attachments

The default attachment provider stores references and notes, not files.

Do not paste base64 file data into attachment locations or notes.

External file systems should have their own access controls and retention rules.

Partner-safe exports remove attachment locations and added-by details. They do not move, copy, protect, or delete the referenced source file.

## Retention and Legal Hold

Retention presets are internal workflow aids and are not legal advice.

The local legal-hold control records preservation metadata and blocks Archive Vault permanent deletion while the hold is active. It does not make browser storage immutable and cannot prevent direct modification through developer tools, localStorage inspection, browser-profile deletion, device loss, or source-code changes.

For regulated or disputed records, use an authenticated provider with server-side hold enforcement, durable audit history, protected backups, and authorized disposition workflows.

## Redacted External Copies

Partner-safe, public-summary, and custom exports create new data packages. They do not change the controlled source record.

The redaction system uses allow-listed profile objects plus a recursive unsafe-key filter. This reduces accidental disclosure but does not replace human review. New business fields, free-text notes, names, decisions, task descriptions, or summaries can still contain sensitive information.

Review every external copy before sharing it.

A redaction manifest lists removed field paths and warnings. It does not prove that a package is safe for every recipient or legal purpose.

## Package Integrity

On HTTPS or localhost, the app normally uses SHA-256 over a stable JSON representation of the external package.

When Web Crypto is unavailable, the app uses a clearly labeled FNV-1a compatibility checksum.

Both values can detect content changes. Neither value proves identity, authorship, authorization, approval, or non-repudiation. They are not digital signatures.

## External Export Activity Log

Completed JSON and HTML external downloads add browser-local metadata to `methodzRedactionExportLog`.

The log is not immutable. A person with browser access can alter or clear it. Do not use it as the sole compliance or legal audit record.

## Exports

JSON, TXT, HTML, CSV, print, workspace backup, archive, retention report, and external-copy exports can contain private meeting information. Store exported files in an appropriately protected location.

A partner-safe label does not itself authorize disclosure. Confirm the recipient, purpose, governing agreement, and current source record before sending.

## Service Worker

The service worker caches static application assets. It does not intentionally cache meeting records, archives, signatures, attachments, redacted packages, or activity logs.

Local storage remains the record source.
