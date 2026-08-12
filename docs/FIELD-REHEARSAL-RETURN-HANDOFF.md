# Field Rehearsal Return Handoff

## Purpose

The return handoff closes the operator gap between downloading one metadata-only Field Rehearsal report in `rehearsal.html` and explicitly importing that file into the exact-commit Coverage Matrix in `evidence.html`.

It does not move the JSON report between pages. The browser's file-selection boundary remains intact. As of v1.6.27, the handoff carries a SHA-256 receipt so the Coverage Matrix can verify that the explicitly selected local file has the exact bytes produced by the rehearsal download.

## Operator flow

1. Open the required row from the exact-commit rerun plan, or open Field Rehearsal manually.
2. Inspect the real device environment and record the required checks.
3. Select **Download Metadata Evidence**.
4. The browser hashes the generated metadata-only JSON bytes with SHA-256 as part of that explicit download action.
5. Only after a valid receipt exists, select **Open Coverage Matrix to Import This Report**.
6. `evidence.html` validates and removes the return fragment, then shows the expected row, exact commit, readiness, and shortened receipt.
7. Select the downloaded JSON through the normal file picker.
8. Select **Load Selected Evidence**. When return context is active, at least one selected file must match the returned SHA-256 receipt and its normalized row, commit, and readiness must still agree.
9. Select the exact commit and explicitly evaluate coverage.

## Architecture

```text
real-hardware rehearsal
        ↓
explicit Download Metadata Evidence
        ↓
metadata-only JSON payload
        ├── browser download
        └── field-evidence-integrity-core.js -> SHA-256 receipt
                         ↓
methodz:field-rehearsal-downloaded
                         ↓
field-rehearsal-return-core.js
                         ↓
row + exact-commit + receipt validation
                         ↓
explicit Open Coverage Matrix
                         ↓
metadata-only URL fragment
                         ↓
evidence.html
                         ↓
operator file selection
                         ↓
explicit Load Selected Evidence
                         ↓
SHA-256 exact-byte verification
                         ↓
row + commit + readiness cross-check
                         ↓
exact-commit Coverage Matrix
```

`field-evidence-integrity-core.js` is a small portable computation layer. It normalizes 64-character lowercase SHA-256 digests and hashes text through Web Crypto. It has no DOM, storage, network, provider, timer, synchronization, transfer, GitHub, or meeting-record authority.

`field-rehearsal-return-core.js` remains portable and side-effect free. Return contract version `1.1.0` requires a valid receipt in addition to the established row, commit, and readiness fields.

`field-rehearsal-return.js` presents the handoff. `evidence-coverage.js` performs receipt verification only after the operator selects files and clicks **Load Selected Evidence**.

## Return contract

The fragment contains only:

- contract version;
- coverage row key;
- exact commit SHA;
- readiness (`ready`, `fail`, `blocked`, or `incomplete`);
- SHA-256 receipt for the exact generated JSON bytes.

The report body, file path, local file name, meeting records, credentials, provider state, queues, and arbitrary notes are never transferred in the fragment.

## Exact-commit and exact-file protection

When the rehearsal arrived through `field-rehearsal-launch-core.js`, the return core checks the generated evidence row against the launch row and the generated evidence commit against the launch target commit. Row or target-commit drift disables the return action.

After return, the Coverage Matrix hashes each explicitly selected candidate file. If no file matches the returned receipt, no return-driven evidence is accepted. If the matching file fails the existing evidence validator or its normalized row, commit, or readiness differs from the returned context, the import fails visibly.

Ordinary manual evidence import remains available when `evidence.html` is opened without return context.

## What the receipt proves and does not prove

A successful SHA-256 check establishes one narrow fact: the selected local file bytes are identical to the bytes hashed during the explicit Field Rehearsal download action.

It does **not** prove who operated the browser, which physical device produced the observations, whether screenshots or external artifacts are genuine, whether a device identity is authenticated, or whether the application is production-ready, authorized, delivered, legally approved, or compliant. The receipt is an integrity bridge, not an identity or attestation system.

## Privacy and authority boundary

No report JSON contents, file paths, meeting content, record identifiers, attendee names, signatures, screenshots, traces, PDFs, transfer contents, credentials, private keys, provider secrets, queue payloads, hidden governance metadata, or arbitrary operator notes cross the return URL.

No browser-local meeting records are read or written. No provider, GitHub API, synchronization, transfer mutation, issue creation, automatic evidence import, or background work is introduced.

## Deployment boundary

The feature preserves application shell `1.6.12`, meeting-record schema `1.6.0`, plain static HTML/CSS/JavaScript, no required build command or runtime package, browser-local meeting records as the default provider, no production backend/provider, and no deployment identity for `hub.methodz.ca`.
