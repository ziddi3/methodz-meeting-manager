# Meeting Closeout Review Tests

## Portable coverage

`tests/meeting-closeout-core.mjs` verifies:

- deterministic seven-checkpoint ordering;
- complete and incomplete closeout states;
- first-incomplete focus selection;
- valid and invalid task due dates;
- missing task, Assigned To, due-date, and status counts;
- bounded attendee, agenda, and task behavior;
- fail-closed truncation;
- source-record immutability;
- exclusion of meeting text, names, signatures, identifiers, credentials, private keys, and queue content.

Run locally:

```bash
node tests/meeting-closeout-core.mjs
```

## Browser coverage

`tests/meeting-closeout.spec.js` verifies in Chromium that:

- review runs only after operator action;
- the current form and browser-local records are not saved or changed;
- the first incomplete checkpoint receives focus only after operator action;
- changing the meeting form invalidates the stale review and disables focus and download until a fresh review;
- the metadata report excludes meeting title, attendee name, and task text;
- the panel is present in Meeting-Day navigation between Summary and Save;
- controls retain a 44-pixel minimum touch height;
- the page remains contained at a 390-pixel viewport.

The no-mutation browser test allows the existing draft timer to settle before capturing its baseline. This isolates closeout actions from ordinary form-edit autosave behavior.

## Static boundary checks

The dedicated workflow verifies:

- required files exist;
- JavaScript parses;
- `meeting.html` includes the CSS, core, panel, and browser feature;
- the panel registry includes the closeout panel;
- the service worker caches only the new static assets;
- the browser feature contains no storage writes, save, archive, delete, transfer, provider, or synchronization calls;
- no background sync handler or Method Hub deployment identity is introduced.
