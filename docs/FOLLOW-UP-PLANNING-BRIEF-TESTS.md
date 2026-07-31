# Follow-Up Planning Brief Tests

## Portable core coverage

`tests/v1613-follow-up-planning.mjs` validates the side-effect-free planning core with fixed dates and synthetic meeting records.

Coverage includes:

- exact date parsing;
- deterministic overdue, today, within-window, needs-scheduling, and later classification;
- inclusive planning-horizon boundaries;
- completed-task exclusion;
- priority and due-date ordering;
- Assigned To workload aggregation;
- explicit Unassigned reporting;
- bounded item and assignee output;
- 1 through 90 day horizon limits;
- empty-input behavior;
- input report immutability;
- privacy and no-automation boundary declarations.

Run locally with:

```bash
node tests/v1613-follow-up-planning.mjs
```

## Chromium workflow coverage

`tests/v1613-follow-up-planning.spec.js` runs against the statically served application.

Coverage includes:

- planning assets loaded through the existing static configuration path;
- app shell `1.6.12` and record schema `1.6.0` preservation;
- planning-core version exposure;
- lane rendering from disposable saved records;
- completed-task exclusion;
- Unassigned workload visibility;
- refresh and horizon changes without meeting-record or draft mutation;
- planning-window preference recovery after reload;
- source-meeting opening only after an explicit button action;
- explicit CSV download and deterministic filename structure;
- phone-width layout containment;
- 44-pixel minimum mobile control height.

The test data is synthetic. It contains no production meeting content, signatures, credentials, private keys, or provider secrets.

## Static safeguards

The Follow-Up Review workflow verifies that:

- planning core, browser layer, CSS, tests, and documentation exist;
- JavaScript syntax checks pass;
- dynamic asset wiring remains present in `config-v1611.js`;
- the service worker pre-caches the planning assets;
- automatic record mutation, assignment, reminder delivery, and synchronization remain disabled;
- no background sync event is registered;
- no static entry point targets `hub.methodz.ca`.

## Manual checks

1. Save a disposable meeting with overdue, today, upcoming, unscheduled, invalid-date, later, and completed tasks.
2. Open Follow-Up Review and confirm completed work is absent from the Planning Brief.
3. Switch among 7, 14, and 30 day windows and confirm boundary tasks move predictably.
4. Confirm Unassigned work appears before named workload summaries when it exists.
5. Refresh the plan and confirm the source record is unchanged.
6. Reload and confirm the selected planning window is restored.
7. Open a source meeting and confirm no task is edited until the operator changes and saves it.
8. Download the CSV and treat it as protected business data.
9. Repeat at phone width and confirm no horizontal page overflow.
10. Disconnect the network after one successful load and confirm the pre-cached planning assets remain available.
