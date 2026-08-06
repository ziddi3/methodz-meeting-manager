# Workspace Home Tests

## Portable coverage

`tests/workspace-home-core.mjs` verifies:

- active, completed, archived, upcoming, and unscheduled meeting counts;
- incomplete-task overdue, unassigned, and needs-scheduling counts;
- completed-task and inactive-meeting task exclusion;
- meaningful-task filtering so empty placeholder rows do not inflate counts;
- valid and invalid date-only parsing;
- record and task-list processing bounds;
- truncation metadata;
- source-record immutability;
- exclusion of meeting identity, meeting text, attendee data, task text, Assigned To values, signatures, credentials, keys, provider secrets, queue payloads, and governance sentinels from the serialized snapshot.

Run locally:

```bash
node tests/workspace-home-core.mjs
```

## Browser coverage

`tests/workspace-home.spec.js` verifies in Chromium that:

- the records key is not read during Workspace Home page initialization;
- the first records-key read occurs only after **Refresh Workspace Snapshot**;
- aggregate counts render after explicit refresh;
- protected source values never appear in the rendered page or retained snapshot;
- source storage remains byte-for-byte unchanged;
- Preparation, Meeting-Day, Decision Register, Meeting Outcomes, Archive, and Verify routes are present;
- the manifest keeps `./meeting.html` as the PWA identity while using `./index.html` as the installed launch route;
- malformed browser-local storage fails visibly without replacement or cleanup;
- the refresh control and lifecycle links preserve a 44-pixel minimum touch height;
- the page remains contained at a 390-pixel viewport.

## Static boundary checks

The dedicated workflow verifies:

- all required Workspace Home files and documentation exist;
- JavaScript parses;
- `index.html`, the manifest, service worker, and application map reference required assets and routes;
- the manifest identity is unchanged while `start_url` points at Workspace Home;
- browser orchestration contains no storage writes, record mutations, provider writes, synchronization calls, or background sync handlers;
- the aggregate core does not expose prohibited source-field names in its returned report shape;
- the service worker caches only static Workspace Home assets;
- no Method Hub deployment identity is introduced.
