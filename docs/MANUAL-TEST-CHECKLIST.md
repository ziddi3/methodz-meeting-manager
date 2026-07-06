# Manual Test Checklist

Use this checklist after each major change.

## Open App

- [ ] Open `meeting.html` directly in a browser.
- [ ] Confirm the page loads with no visible script error.
- [ ] Confirm logo placeholders appear if logo image files are missing.
- [ ] Confirm the status pill starts as `Scheduled`.
- [ ] Confirm the date field defaults to today.
- [ ] Confirm the Record Readiness Review panel appears below quick actions.

## Meeting Form

- [ ] Enter a meeting title.
- [ ] Change meeting status.
- [ ] Enter location / video link.
- [ ] Enter meeting facilitator.
- [ ] Select organizations / representatives present.
- [ ] Add at least two attendees.
- [ ] Add typed digital signatures.
- [ ] Check multiple agenda items.
- [ ] Enter notes.
- [ ] Enter free-form decisions.
- [ ] Add at least one structured decision.
- [ ] Confirm structured decisions have decision, confirmed-by, date, status, and notes fields.
- [ ] Add at least two follow-up tasks.
- [ ] Confirm task responsibility label says `Assigned To`.
- [ ] Enter meeting summary.

## Record Readiness Review

- [ ] Clear the meeting title and confirm the review panel reports a required item.
- [ ] Restore the meeting title and confirm the required warning clears.
- [ ] Add an attendee name without a signature and confirm the review warns about missing signatures.
- [ ] Add a task without Assigned To and confirm the review warns about assignment gaps.
- [ ] Add an open Critical task and confirm the review warns about open critical tasks.
- [ ] Click `Review Now` and confirm the panel updates.

## Task Filters

- [ ] Create tasks with different priorities.
- [ ] Create tasks with different progress values.
- [ ] Filter by task text.
- [ ] Filter by progress.
- [ ] Filter by priority.
- [ ] Clear filters and confirm all tasks return.

## Save and Edit

- [ ] Click `Save Record`.
- [ ] Confirm the record appears in Saved Meeting Records.
- [ ] Click `View JSON`.
- [ ] Confirm JSON opens and closes.
- [ ] Confirm JSON includes `decisionsList` and `validation`.
- [ ] Click `Open / Edit`.
- [ ] Change a field.
- [ ] Click `Save Record` again.
- [ ] Confirm the existing record updates instead of creating an accidental duplicate.

## Search

- [ ] Search by meeting title.
- [ ] Search by task text.
- [ ] Search by decision text.
- [ ] Clear the search box.
- [ ] Confirm all records return.

## Export / Import

- [ ] Download current meeting as TXT.
- [ ] Confirm TXT includes structured decisions and record review output.
- [ ] Download current meeting as JSON.
- [ ] Preview meeting minutes.
- [ ] Export current meeting as HTML.
- [ ] Export a saved meeting as HTML.
- [ ] Open the exported HTML file in a browser.
- [ ] Export all records as JSON.
- [ ] Import an exported JSON file.
- [ ] Confirm imported records appear.

## Draft

- [ ] Type in a new unsaved meeting.
- [ ] Wait for draft status to say auto-saved.
- [ ] Refresh the page.
- [ ] Confirm the draft restores.
- [ ] Confirm structured decisions restore.
- [ ] Clear the draft.
- [ ] Confirm saved records remain untouched.

## Print

- [ ] Click Print / Save PDF.
- [ ] Confirm browser print opens.
- [ ] Confirm buttons are hidden in print preview.
- [ ] Confirm cards are readable.
- [ ] Preview meeting minutes, then print.
- [ ] Confirm the minutes preview is readable in print mode.

## Mobile

- [ ] Open on phone width.
- [ ] Confirm buttons stack cleanly.
- [ ] Confirm saved records are readable.
- [ ] Confirm forms are touch-friendly.
- [ ] Confirm the structured decision form is usable on a phone.
- [ ] Confirm task filters stack cleanly.
