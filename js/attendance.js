// js/attendance.js
// Attendance management helpers

import { generateId } from './utils.js';

/** Build an empty attendee object */
function createAttendee(name = '', email = '', role = '', company = '') {
  return { id: generateId(), name, email, role, company, present: false, signatureData: null };
}

/** Toggle the presence flag for an attendee */
function togglePresence(attendees, attendeeId) {
  return attendees.map(a =>
    a.id === attendeeId ? { ...a, present: !a.present } : a
  );
}

/** Add an attendee to the list (no duplicates by email) */
function addAttendee(attendees, attendee) {
  if (attendee.email && attendees.some(a => a.email === attendee.email)) {
    return attendees; // already in list
  }
  return [...attendees, attendee];
}

/** Remove an attendee by id */
function removeAttendee(attendees, attendeeId) {
  return attendees.filter(a => a.id !== attendeeId);
}

/** Update one attendee field */
function updateAttendee(attendees, attendeeId, changes) {
  return attendees.map(a => a.id === attendeeId ? { ...a, ...changes } : a);
}

/** Count attendees who were present */
function presentCount(attendees) {
  return attendees.filter(a => a.present).length;
}

export { createAttendee, togglePresence, addAttendee, removeAttendee, updateAttendee, presentCount };
