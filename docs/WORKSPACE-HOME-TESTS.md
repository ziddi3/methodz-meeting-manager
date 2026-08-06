# Workspace Home Tests

## Portable core

Run:

```bash
node tests/workspace-home-core.mjs
```

Coverage includes status classification, strict date validation, upcoming 7-day and 30-day counts, active unscheduled meetings, incomplete/overdue/unassigned/needs-scheduling task counts, archive exclusion from task totals, input immutability, bounded record and task-list handling, and aggregate-only output with no copied meeting identity or content.

## Chromium rehearsal

The dedicated workflow starts an ordinary Python static server and runs `tests/workspace-home.spec.js` in Chromium.

Coverage includes the static root launchpad, lifecycle links, no saved-record read before explicit refresh, aggregate metrics after refresh, protected-content exclusion, malformed-storage failure without replacement writes, phone-width containment, and a 44-pixel minimum refresh control.

## Static boundary checks

The workflow verifies JavaScript syntax, required static asset wiring, service-worker registration of home assets, root launch configuration in the web manifest, absence of browser-storage writes in the home browser layer, absence of save/delete/archive/provider-write/synchronization/background-sync paths, and the Method Hub deployment boundary.
