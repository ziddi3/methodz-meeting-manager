# Meeting Preparation Launch Bridge Tests

## Automated workflow

The dedicated workflow remains:

```text
.github/workflows/meeting-preparation.yml
```

It validates the original read-only Preparation Brief together with the explicit launch bridge.

## Portable contract coverage

Run with Node 22 or later:

```text
node tests/meeting-preparation-launch-core.mjs
```

The suite verifies:

- exact launch-core version and allowed focus-key order;
- percent-safe fragment construction;
- record-ID decoding without interpreting record content;
- stable panel and control mappings;
- default title focus when no focus key is supplied;
- unrelated-fragment rejection;
- missing, unsupported, overlong, and control-character record-reference rejection;
- construction failure for invalid record IDs or focus keys.

## Chromium coverage

Run against a static server:

```text
npx playwright test tests/meeting-preparation-launch.spec.js --reporter=line
```

The browser rehearsal verifies:

- the Preparation Brief adds an explicit launch action;
- the action uses a URL fragment rather than a query parameter;
- the selected saved record loads through the established editor;
- the first missing preparation field receives focus;
- the stable containing panel is visibly marked;
- the recognized fragment is removed from the address bar;
- the return route to `preparation.html` is visible;
- saved records and the meeting draft remain byte-for-byte unchanged until an operator edits or saves;
- missing record references fail visibly without loading another record;
- unrelated fragments remain untouched;
- the launch action preserves a 44-pixel mobile target and does not cause horizontal overflow.

## Static boundary checks

The workflow checks that:

- both entry points load the portable core, browser feature, and stylesheet;
- the service worker lists the bridge only as static app-shell assets;
- the browser bridge contains no record replacement, upsert, delete, archive, synchronization, or automatic-save call;
- no background-sync or periodic-sync handler is introduced;
- no `hub.methodz.ca` deployment identity appears in feature assets;
- architecture and test documents are present.

## Manual rehearsal

1. Save an upcoming meeting with one or more missing preparation fields.
2. Open `preparation.html` from the same origin.
3. Confirm the meeting card shows **Open Meeting to Prepare**.
4. Inspect the link and confirm the record reference follows `#prepare-record=`.
5. Open the meeting.
6. Confirm the address bar no longer contains the launch fragment.
7. Confirm the intended saved record is loaded.
8. Confirm the first missing preparation control has keyboard focus and its panel is highlighted.
9. Confirm the handoff message says nothing was saved automatically.
10. Use **Back to Preparation Brief**.
11. Reopen the meeting normally and confirm no values changed merely because the bridge was used.

## Failure rehearsal

Open:

```text
meeting.html#prepare-record=missing-record&focus=agenda
```

Confirm that:

- the fragment is removed;
- a visible missing-record message appears;
- no different saved record opens;
- no draft or saved-record value changes;
- the return route remains available.

A passing rehearsal demonstrates bounded client behavior for the tested workspace. It does not establish authenticated identity, authorization, hosted durability, delivery, calendar availability, or legal approval.
