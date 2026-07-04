// js/search.js
// Full-text search across meetings

/**
 * Search meetings by query string.
 * Matches against title, organizer, company, location, minutes, agenda,
 * attendee names, action descriptions, and decision descriptions.
 */
function searchMeetings(meetings, query) {
  const q = (query || '').toLowerCase().trim();
  if (!q) return meetings;

  return meetings.filter(m => {
    const fields = [
      m.title, m.organizer, m.company, m.location, m.minutes,
      m.type, m.status
    ];

    if (fields.some(f => (f || '').toLowerCase().includes(q))) return true;

    if ((m.agenda || []).some(a => (a || '').toLowerCase().includes(q))) return true;

    if ((m.attendees || []).some(a =>
      (a.name || '').toLowerCase().includes(q) ||
      (a.email || '').toLowerCase().includes(q) ||
      (a.company || '').toLowerCase().includes(q)
    )) return true;

    if ((m.actionItems || []).some(i =>
      (i.description || '').toLowerCase().includes(q) ||
      (i.assignee || '').toLowerCase().includes(q)
    )) return true;

    if ((m.decisions || []).some(d =>
      (d.description || '').toLowerCase().includes(q) ||
      (d.madeBy || '').toLowerCase().includes(q)
    )) return true;

    return false;
  });
}

export { searchMeetings };
