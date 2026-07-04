// js/db.js
// Local data persistence using localStorage — offline-first data layer

const MEETINGS_KEY = 'methodz_meetings';
const CONTACTS_KEY = 'methodz_contacts';
const SETTINGS_KEY = 'methodz_settings';

/* ── Meetings ── */

/** Load all meetings from storage */
function loadMeetings() {
  try {
    return JSON.parse(localStorage.getItem(MEETINGS_KEY)) || [];
  } catch {
    return [];
  }
}

/** Persist the full meetings array */
function saveMeetings(meetings) {
  localStorage.setItem(MEETINGS_KEY, JSON.stringify(meetings));
}

/** Find a single meeting by id */
function getMeetingById(id) {
  return loadMeetings().find(m => m.id === id) || null;
}

/** Insert or update a meeting record */
function upsertMeeting(meeting) {
  const meetings = loadMeetings();
  const now = new Date().toISOString();
  const idx = meetings.findIndex(m => m.id === meeting.id);
  if (idx >= 0) {
    meetings[idx] = { ...meetings[idx], ...meeting, updatedAt: now };
  } else {
    meetings.push({ ...meeting, createdAt: now, updatedAt: now });
  }
  saveMeetings(meetings);
  return getMeetingById(meeting.id);
}

/** Delete a meeting by id */
function deleteMeeting(id) {
  saveMeetings(loadMeetings().filter(m => m.id !== id));
}

/* ── Contacts ── */

/** Load saved contacts (reusable attendees) */
function loadContacts() {
  try {
    return JSON.parse(localStorage.getItem(CONTACTS_KEY)) || [];
  } catch {
    return [];
  }
}

/** Save the contacts list */
function saveContacts(contacts) {
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
}

/* ── Settings ── */

/** Load app settings */
function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

/** Save app settings */
function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export {
  loadMeetings, saveMeetings, getMeetingById, upsertMeeting, deleteMeeting,
  loadContacts, saveContacts,
  loadSettings, saveSettings
};
