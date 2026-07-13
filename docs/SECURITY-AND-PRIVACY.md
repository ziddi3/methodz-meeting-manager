# Security and Privacy Boundaries

## Local Storage

Meeting data is stored in browser local storage. It is not encrypted by this application.

Anyone with access to the same browser profile and device may be able to inspect the records.

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

## Typed Signatures

Typed signatures are stored as record text.

The application records consent and verification metadata, but it does not provide legal advice, biometric verification, certificate-based signing, or cryptographic non-repudiation.

“Name Match” is a text equality check only.

## Attachments

The default attachment provider stores references and notes, not files.

Do not paste base64 file data into attachment locations or notes.

External file systems should have their own access controls and retention rules.

## Exports

JSON, TXT, HTML, CSV, and print exports can contain private meeting information. Store exported files in an appropriately protected location.

## Service Worker

The service worker caches static application assets. It does not intentionally cache meeting records.

Local storage remains the record source.
