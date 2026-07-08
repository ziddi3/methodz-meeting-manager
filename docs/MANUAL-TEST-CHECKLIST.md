# Manual Test Checklist

Use this checklist after each major change.

## Open App

- [ ] Open `meeting.html` directly in a browser.
- [ ] Confirm the page loads with no visible script error.
- [ ] Confirm logo placeholders appear if logo image files are missing.
- [ ] Confirm the status pill starts as `Scheduled`.
- [ ] Confirm the date field defaults to today.
- [ ] Confirm the Record Readiness Review panel appears below quick actions.
- [ ] Confirm Meeting Templates appear.
- [ ] Confirm Attendee Directory appears before Attendance Sign-On.
- [ ] Confirm Attachment References appears after Meeting Summary.
- [ ] Confirm Open Task Dashboard and Attachment Index appear near Saved Meeting Records.

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
- [ ] Add at least one attachment reference.
- [ ] Confirm attachment reference fields include name, type, date, location, added-by, and notes.

## Attendee Directory

- [ ] Enter two attendee names and organization / role values.
- [ ] Click `Save Current Attendees`.
- [ ] Confirm the Attendee Directory dropdown updates.
- [ ] Add a saved attendee preset back into the meeting.
- [ ] Confirm the preset does not auto-fill a signature.
- [ ] Export the directory as JSON.
- [ ] Export the directory as CSV.
- [ ] Import a directory JSON file.
- [ ] Delete a directory preset.
- [ ] Confirm saved meeting records are not changed when deleting a directory preset.

## Signature Controls

- [ ] Add attendee names with blank signatures.
- [ ] Confirm Signature Controls shows unsigned attendees.
- [ ] Click `Fill Unsigned From Names` only after confirming this is the intended sign-off.
- [ ] Confirm signature fields are filled from attendee names.
- [ ] Add an empty attendee row.
- [ ] Click `Remove Empty Rows`.
- [ ] Confirm at least one attendee row remains.

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
- [ ] Confirm JSON includes `decisionsList`, `validation`, `attachments`, `signatureAudit`, and `directorySnapshot`.
- [ ] Click `Open / Edit`.
- [ ] Confirm attachment references restore.
- [ ] Confirm attendee signatures and signature audit summary restore.
- [ ] Change a field.
- [ ] Click `Save Record` again.
- [ ] Confirm the existing record updates instead of creating an accidental duplicate.

## Search and Archive Filters

- [ ] Search by meeting title.
- [ ] Search by task text.
- [ ] Search by decision text.
- [ ] Search by attachment reference text.
- [ ] Clear the search box.
- [ ] Confirm all records return.
- [ ] Filter saved records by status.
- [ ] Filter saved records by organization / representative.
- [ ] Clear archive filters.

## Attachment Index

- [ ] Save at least one record with attachment references.
- [ ] Confirm the Attachment Index shows those references.
- [ ] Confirm references without locations are visually flagged.
- [ ] Click `Open` from the Attachment Index and confirm the related record opens.
- [ ] Export the Attachment Index as CSV.
- [ ] Export current meeting attachments as CSV.

## Export / Import

- [ ] Download current meeting as TXT.
- [ ] Confirm TXT includes structured decisions, record review output, attachment references, and signature audit.
- [ ] Download current meeting as JSON.
- [ ] Preview meeting minutes.
- [ ] Confirm HTML minutes include attachment references and signature audit.
- [ ] Export current meeting as HTML.
- [ ] Export a saved meeting as HTML.
- [ ] Open the exported HTML file in a browser.
- [ ] Export all records as JSON.
- [ ] Import an exported JSON file.
- [ ] Confirm imported records appear.

## Draft

- [ ] Type in a new unsaved meeting.
- [ ] Add a structured decision.
- [ ] Add an attachment reference.
- [ ] Wait for draft status to say auto-saved.
- [ ] Refresh the page.
- [ ] Confirm the draft restores.
- [ ] Confirm structured decisions restore.
- [ ] Confirm attachment references restore.
- [ ] Clear the draft.
- [ ] Confirm saved records remain untouched.

## Print

- [ ] Click Print / Save PDF.
- [ ] Confirm browser print opens.
- [ ] Confirm buttons are hidden in print preview.
- [ ] Confirm cards are readable.
- [ ] Preview meeting minutes, then print.
- [ ] Confirm the minutes preview is readable in print mode.
- [ ] Confirm directory controls and attachment dashboard controls are not printed as operational controls.

## Mobile

- [ ] Open on phone width.
- [ ] Confirm buttons stack cleanly.
- [ ] Confirm saved records are readable.
- [ ] Confirm forms are touch-friendly.
- [ ] Confirm the structured decision form is usable on a phone.
- [ ] Confirm task filters stack cleanly.
- [ ] Confirm Attendee Directory controls stack cleanly.
- [ ] Confirm Attachment Reference fields are usable on a phone.
