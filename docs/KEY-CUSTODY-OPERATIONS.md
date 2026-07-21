# Signing-Key Custody Operations

## Purpose

This checklist governs Methodz package-signing keys. It is an operational control, not legal advice and not proof of a person's identity or authority.

## New key ceremony

1. Generate the key pair on a controlled device using HTTPS or localhost.
2. Download the private-key backup once.
3. Store the private backup in a protected location separate from meeting packages, workspace backups, and public-key manifests.
4. Download the public verification key.
5. Confirm its `p256:` key ID through a second trusted channel.
6. Register the public key on every verification workstation that needs it.
7. Record a completed recovery rehearsal before relying on the key for important releases.
8. Clear the private key from page memory and close the page.

## Planned rotation

1. Generate the replacement key and protect its private backup.
2. Independently confirm the replacement public-key ID.
3. Register both old and replacement public keys.
4. Record a planned rotation event with the effective date, operator, witness, and reason.
5. Test signing with the replacement key and verify the package independently.
6. At the effective time, revoke the retiring key in the browser registry.
7. Record a completed rotation event with all checklist controls confirmed.
8. Export and preserve the public custody manifest separately from private backups.

## Lost or suspected-compromised key

1. Stop using the key immediately.
2. Mark the public key revoked in every controlled registry.
3. Record a completed lost-key response event.
4. Identify the last package known to be valid under the old key.
5. Generate and confirm a replacement key using the new-key ceremony.
6. Review packages signed after the suspected compromise time.
7. Communicate the revoked key ID through an independent trusted channel.
8. Never delete historical public keys required to verify old packages.

## Recovery rehearsal

At least periodically, and before depending on a new key:

1. Use a disposable copy of the private backup on a controlled device.
2. Sign a non-sensitive test package.
3. Verify it in `verify.html` on another browser or device.
4. Confirm the public-key ID against the independent record.
5. Delete the disposable private-key copy securely according to local policy.
6. Record a completed recovery-rehearsal event without storing private data or secret locations in the browser.

## Separation rules

- Private backups must not be placed in the repository.
- Private backups must not be included in workspace backups or Notion command logs.
- Public custody manifests may be distributed, but fingerprint confirmation remains a separate responsibility.
- Real private keys must never be used in tests, examples, screenshots, support requests, or issue attachments.
- Revocation metadata is workflow state, not a certificate authority or universal revocation service.
