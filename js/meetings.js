// js/meetings.js
// Meeting business-logic: create, update, delete, list helpers

import { generateId, today, currentTime } from './utils.js';
import { upsertMeeting, deleteMeeting, loadMeetings, getMeetingById } from './db.js';

/** Build an empty meeting object with defaults */
function createEmptyMeeting() {
  return {
    id: generateId(),
    title: '',
    date: today(),
    time: currentTime(),
    endTime: '',
    location: '',
    type: 'team',
    company: '',
    organizer: '',
    status: 'planned',
    agenda: [],
    attendees: [],
    minutes: '',
    actionItems: [],
    decisions: [],
    createdAt: null,
    updatedAt: null
  };
}

/** Save (create or update) a meeting */
function saveMeeting(meeting) {
  return upsertMeeting(meeting);
}

/** Remove a meeting permanently */
function removeMeeting(id) {
  deleteMeeting(id);
}

/** Get all meetings sorted newest-first by date */
function getAllMeetings() {
  return loadMeetings().sort((a, b) => {
    const da = new Date(a.date + 'T' + (a.time || '00:00'));
    const db2 = new Date(b.date + 'T' + (b.time || '00:00'));
    return db2 - da;
  });
}

/** Get upcoming meetings (today and future, status != cancelled) */
function getUpcomingMeetings() {
  const now = today();
  return getAllMeetings()
    .filter(m => m.date >= now && m.status !== 'cancelled')
    .reverse(); // earliest first
}

/** Get past/completed meetings */
function getArchivedMeetings() {
  const now = today();
  return getAllMeetings().filter(m => m.date < now || m.status === 'completed' || m.status === 'cancelled');
}

/** Get a meeting by id */
function getMeeting(id) {
  return getMeetingById(id);
}

/** Update just the status of a meeting */
function updateMeetingStatus(id, status) {
  const meeting = getMeetingById(id);
  if (!meeting) return;
  saveMeeting({ ...meeting, status });
}

export {
  createEmptyMeeting, saveMeeting, removeMeeting,
  getAllMeetings, getUpcomingMeetings, getArchivedMeetings,
  getMeeting, updateMeetingStatus
};
