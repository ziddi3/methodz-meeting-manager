// js/app.js
// Main application: initialisation, routing, and event coordination

import {
  createEmptyMeeting, saveMeeting, removeMeeting,
  getAllMeetings, getUpcomingMeetings, getArchivedMeetings, getMeeting
} from './meetings.js';
import {
  createAttendee, togglePresence, addAttendee, removeAttendee, updateAttendee
} from './attendance.js';
import { createActionItem, addActionItem, removeActionItem, toggleActionStatus } from './actions.js';
import { createDecision, addDecision, removeDecision } from './decisions.js';
import { sanitizeMinutes } from './minutes.js';
import { initSignaturePad } from './signatures.js';
import { searchMeetings } from './search.js';
import { printMeeting } from './pdf.js';
import {
  showToast, openModal, closeModal,
  setActiveView, setActiveTab,
  renderDashboardView, renderMeetingForm, renderMeetingDetail,
  renderArchiveView, renderSearchView,
  renderMeetingCard,
  renderAttendeesTab, renderActionsTab, renderDecisionsTab,
  renderSignaturesTab,
  appendAgendaItem
} from './ui.js';
import { debounce, generateId } from './utils.js';

/* ── App State ─────────────────────────────────────────────────────── */
const state = {
  view: 'dashboard',
  meetingId: null,
  meetingTab: 'overview',
  archivePage: 0,
  archivePageSize: 10,
  searchQuery: '',
  // Map of attendeeId -> signature pad controller
  signaturePads: {}
};

/* ── Main content area ─────────────────────────────────────────────── */
function getMain() {
  return document.getElementById('app-main');
}

/* ── View renderers ────────────────────────────────────────────────── */

function showDashboard() {
  state.view = 'dashboard';
  state.meetingId = null;
  const all = getAllMeetings();
  const upcoming = getUpcomingMeetings();
  getMain().innerHTML = renderDashboardView(all, upcoming);
  setActiveView('dashboard');
  bindDashboardEvents();
}

function showMeetingForm(meetingId = null) {
  state.view = 'meeting-form';
  const meeting = meetingId ? getMeeting(meetingId) : createEmptyMeeting();
  if (!meeting) { showToast('Meeting not found.', 'danger'); showDashboard(); return; }
  state.meetingId = meeting.id;
  getMain().innerHTML = renderMeetingForm(meeting, Boolean(meetingId));
  setActiveView('meeting-form');
  bindFormEvents(meeting);
}

function showMeetingDetail(meetingId, tab = 'overview') {
  state.view = 'meeting-detail';
  state.meetingId = meetingId;
  state.meetingTab = tab;
  state.signaturePads = {};
  const meeting = getMeeting(meetingId);
  if (!meeting) { showToast('Meeting not found.', 'danger'); showDashboard(); return; }
  getMain().innerHTML = renderMeetingDetail(meeting);
  setActiveView('meeting-detail');
  switchTab(tab);
  bindDetailEvents(meetingId);
}

function showArchive() {
  state.view = 'archive';
  state.meetingId = null;
  const meetings = getArchivedMeetings();
  getMain().innerHTML = renderArchiveView(meetings, state.archivePage, state.archivePageSize);
  setActiveView('archive');
  bindArchiveEvents(meetings);
}

function showSearch(query = '') {
  state.view = 'search';
  state.meetingId = null;
  state.searchQuery = query;
  const results = query ? searchMeetings(getAllMeetings(), query) : [];
  getMain().innerHTML = renderSearchView(results, query);
  setActiveView('search');
  bindSearchEvents();
}

/* ── Tab switching (inside meeting detail) ─────────────────────────── */

function switchTab(tabName) {
  state.meetingTab = tabName;
  setActiveTab(tabName);
  if (tabName === 'signatures') {
    initSignaturePads(state.meetingId);
  }
}

/* ── Dashboard events ──────────────────────────────────────────────── */

function bindDashboardEvents() {
  const main = getMain();

  on(main, '#btn-new-meeting-dash', 'click', () => showMeetingForm());
  on(main, '#btn-create-first', 'click', () => showMeetingForm());
  on(main, '#btn-view-all', 'click', () => { state.archivePage = 0; showArchive(); });

  // Meeting card clicks
  main.querySelectorAll('.meeting-card').forEach(card => {
    card.addEventListener('click', () => showMeetingDetail(card.dataset.meetingId));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') showMeetingDetail(card.dataset.meetingId);
    });
  });
}

/* ── Archive events ────────────────────────────────────────────────── */

function bindArchiveEvents(meetings) {
  const main = getMain();
  on(main, '#btn-prev-page', 'click', () => {
    state.archivePage = Math.max(0, state.archivePage - 1);
    showArchive();
  });
  on(main, '#btn-next-page', 'click', () => {
    const maxPage = Math.ceil(meetings.length / state.archivePageSize) - 1;
    state.archivePage = Math.min(maxPage, state.archivePage + 1);
    showArchive();
  });
  main.querySelectorAll('.meeting-card').forEach(card => {
    card.addEventListener('click', () => showMeetingDetail(card.dataset.meetingId));
    card.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') showMeetingDetail(card.dataset.meetingId);
    });
  });
}

/* ── Search events ─────────────────────────────────────────────────── */

function bindSearchEvents() {
  const main = getMain();
  const input = main.querySelector('#search-input');
  if (!input) return;

  const doSearch = debounce(() => {
    const q = input.value.trim();
    state.searchQuery = q;
    const results = q ? searchMeetings(getAllMeetings(), q) : [];
    const resultsDiv = main.querySelector('#search-results');
    if (!resultsDiv) return;
    if (!q) {
      resultsDiv.innerHTML = '<p class="text-muted text-sm">Start typing to search across all meetings.</p>';
      return;
    }
    if (results.length === 0) {
      resultsDiv.innerHTML = `<p class="text-muted text-sm">No results for "<strong>${escapeHtmlInline(q)}</strong>".</p>`;
      return;
    }
    resultsDiv.innerHTML = `
      <p class="text-muted text-sm" style="margin-bottom:12px;">${results.length} result${results.length !== 1 ? 's' : ''}</p>
      <div class="meeting-list">${results.map(m => renderMeetingCard(m)).join('')}</div>`;

    resultsDiv.querySelectorAll('.meeting-card').forEach(card => {
      card.addEventListener('click', () => showMeetingDetail(card.dataset.meetingId));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') showMeetingDetail(card.dataset.meetingId);
      });
    });
  }, 200);

  input.addEventListener('input', doSearch);

  // Also bind any cards already rendered
  main.querySelectorAll('.meeting-card').forEach(card => {
    card.addEventListener('click', () => showMeetingDetail(card.dataset.meetingId));
  });
}

/* ── Meeting form events ───────────────────────────────────────────── */

// Track agenda items locally in the form
let formAgenda = [];

function bindFormEvents(meeting) {
  formAgenda = [...(meeting.agenda || [])];
  const main = getMain();
  const form = main.querySelector('#meeting-form');

  on(main, '#btn-back-from-form', 'click', () => navigateBack());
  on(main, '#btn-cancel-form', 'click', () => navigateBack());
  on(main, '#btn-add-agenda', 'click', () => addAgendaItem());

  // Enter key in agenda input adds item
  const agendaInput = main.querySelector('#agenda-input');
  if (agendaInput) {
    agendaInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); addAgendaItem(); }
    });
  }

  // Remove agenda items via delegation
  main.querySelector('#agenda-list').addEventListener('click', e => {
    const btn = e.target.closest('.btn-remove-agenda');
    if (!btn) return;
    const idx = parseInt(btn.dataset.index, 10);
    formAgenda.splice(idx, 1);
    refreshAgendaList();
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    handleFormSubmit(meeting, form);
  });
}

function addAgendaItem() {
  const input = getMain().querySelector('#agenda-input');
  const text = (input.value || '').trim();
  if (!text) return;
  formAgenda.push(text);
  appendAgendaItem(text, formAgenda.length - 1);
  input.value = '';
  input.focus();
}

function refreshAgendaList() {
  const list = getMain().querySelector('#agenda-list');
  list.innerHTML = formAgenda.map((a, i) => `
    <div class="item-row agenda-item" data-index="${i}">
      <span class="item-row__main">${escapeHtmlInline(a)}</span>
      <button type="button" class="btn btn--ghost btn--icon btn-remove-agenda"
              data-index="${i}" aria-label="Remove agenda item">✕</button>
    </div>`).join('');
}

function escapeHtmlInline(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function handleFormSubmit(originalMeeting, form) {
  const data = new FormData(form);
  const updated = {
    ...originalMeeting,
    title:     (data.get('title') || '').trim(),
    date:      data.get('date') || '',
    time:      data.get('time') || '',
    endTime:   data.get('endTime') || '',
    location:  (data.get('location') || '').trim(),
    organizer: (data.get('organizer') || '').trim(),
    company:   (data.get('company') || '').trim(),
    type:      data.get('type') || 'team',
    status:    data.get('status') || 'planned',
    agenda:    [...formAgenda]
  };

  if (!updated.title) { showToast('Meeting title is required.', 'danger'); return; }
  if (!updated.date)  { showToast('Date is required.', 'danger'); return; }

  saveMeeting(updated);
  showToast(state.view === 'meeting-form' && !originalMeeting.createdAt
    ? 'Meeting created!' : 'Meeting updated!', 'success');
  showMeetingDetail(updated.id);
}

/* ── Meeting detail events ─────────────────────────────────────────── */

function bindDetailEvents(meetingId) {
  const main = getMain();

  // Tab switching via delegation (tab-bar is outside re-rendered panes)
  main.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  // Single delegated click handler covers all dynamic buttons in detail view
  main.addEventListener('click', e => {
    // Header actions
    if (e.target.closest('#btn-back-to-dashboard'))  { navigateBack(); return; }
    if (e.target.closest('#btn-edit-meeting'))        { showMeetingForm(meetingId); return; }
    if (e.target.closest('#btn-print-meeting'))       { const m = getMeeting(meetingId); if (m) printMeeting(m); return; }
    if (e.target.closest('#btn-delete-meeting'))      { confirmDeleteMeeting(meetingId); return; }

    // Attendees
    if (e.target.closest('#btn-add-attendee'))        { showAddAttendeeModal(meetingId); return; }
    const removeAtt = e.target.closest('.btn-remove-attendee');
    if (removeAtt) {
      const m = getMeeting(meetingId);
      if (!m) return;
      m.attendees = removeAttendee(m.attendees, removeAtt.dataset.attendeeId);
      saveMeeting(m);
      refreshAttendeesTab(meetingId, main);
      showToast('Attendee removed.');
      return;
    }

    // Minutes save
    if (e.target.closest('#btn-save-minutes')) {
      const editor = main.querySelector('#minutes-editor');
      if (!editor) return;
      const m = getMeeting(meetingId);
      if (!m) return;
      m.minutes = sanitizeMinutes(editor.value);
      saveMeeting(m);
      showToast('Minutes saved.', 'success');
      return;
    }

    // Actions
    if (e.target.closest('#btn-add-action'))          { showAddActionModal(meetingId, main); return; }
    const toggleAct = e.target.closest('.btn-toggle-action');
    if (toggleAct) {
      const m = getMeeting(meetingId);
      if (!m) return;
      m.actionItems = toggleActionStatus(m.actionItems, toggleAct.dataset.actionId);
      saveMeeting(m);
      refreshActionsTab(meetingId, main);
      return;
    }
    const removeAct = e.target.closest('.btn-remove-action');
    if (removeAct) {
      const m = getMeeting(meetingId);
      if (!m) return;
      m.actionItems = removeActionItem(m.actionItems, removeAct.dataset.actionId);
      saveMeeting(m);
      refreshActionsTab(meetingId, main);
      showToast('Action removed.');
      return;
    }

    // Decisions
    if (e.target.closest('#btn-add-decision'))        { showAddDecisionModal(meetingId, main); return; }
    const removeDec = e.target.closest('.btn-remove-decision');
    if (removeDec) {
      const m = getMeeting(meetingId);
      if (!m) return;
      m.decisions = removeDecision(m.decisions, removeDec.dataset.decisionId);
      saveMeeting(m);
      refreshDecisionsTab(meetingId, main);
      showToast('Decision removed.');
      return;
    }
  });

  // Attendance checkbox delegation (separate 'change' event)
  main.addEventListener('change', e => {
    const cb = e.target.closest('.attendance-check');
    if (!cb) return;
    const m = getMeeting(meetingId);
    if (!m) return;
    m.attendees = togglePresence(m.attendees, cb.dataset.attendeeId);
    saveMeeting(m);
    refreshAttendeesTab(meetingId, main);
  });
}

/* Attendee modal */
function showAddAttendeeModal(meetingId) {
  openModal('Add Attendee',
    `<div class="form-grid" style="grid-template-columns:1fr;">
      <div class="form-field">
        <label class="form-label" for="att-name">Name <span>*</span></label>
        <input class="form-input" id="att-name" type="text" placeholder="Full name" autocomplete="name">
      </div>
      <div class="form-field">
        <label class="form-label" for="att-email">Email</label>
        <input class="form-input" id="att-email" type="email" placeholder="email@example.com" autocomplete="email">
      </div>
      <div class="form-field">
        <label class="form-label" for="att-role">Role / Title</label>
        <input class="form-input" id="att-role" type="text" placeholder="e.g. Project Manager">
      </div>
      <div class="form-field">
        <label class="form-label" for="att-company">Company</label>
        <input class="form-input" id="att-company" type="text" placeholder="e.g. Method HVAC Inc.">
      </div>
    </div>`,
    `<button class="btn btn--secondary" id="modal-cancel">Cancel</button>
     <button class="btn btn--primary" id="modal-confirm">Add Attendee</button>`
  );

  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', () => {
    const name = (document.getElementById('att-name').value || '').trim();
    if (!name) { showToast('Name is required.', 'danger'); return; }
    const attendee = createAttendee(
      name,
      document.getElementById('att-email').value.trim(),
      document.getElementById('att-role').value.trim(),
      document.getElementById('att-company').value.trim()
    );
    const m = getMeeting(meetingId);
    if (!m) return;
    m.attendees = addAttendee(m.attendees, attendee);
    saveMeeting(m);
    closeModal();
    refreshAttendeesTab(meetingId, getMain());
    showToast('Attendee added.', 'success');
  });

  document.getElementById('att-name').focus();
}

function refreshAttendeesTab(meetingId, main) {
  const m = getMeeting(meetingId);
  if (!m) return;
  const pane = main.querySelector('#tab-attendees');
  if (!pane) return;
  pane.innerHTML = renderAttendeesTab(m);
}

/* Minutes save — handled via delegated click in bindDetailEvents */

/* Actions modal and refresh */
function refreshActionsTab(meetingId, main) {
  const m = getMeeting(meetingId);
  if (!m) return;
  const pane = main.querySelector('#tab-actions');
  if (!pane) return;
  pane.innerHTML = renderActionsTab(m);
}

function showAddActionModal(meetingId, main) {
  openModal('Add Action Item',
    `<div class="form-grid" style="grid-template-columns:1fr;">
      <div class="form-field">
        <label class="form-label" for="act-desc">Task Description <span>*</span></label>
        <input class="form-input" id="act-desc" type="text" placeholder="What needs to be done?">
      </div>
      <div class="form-field">
        <label class="form-label" for="act-assignee">Assignee</label>
        <input class="form-input" id="act-assignee" type="text" placeholder="Who is responsible?">
      </div>
      <div class="form-field">
        <label class="form-label" for="act-due">Due Date</label>
        <input class="form-input" id="act-due" type="date">
      </div>
      <div class="form-field">
        <label class="form-label" for="act-priority">Priority</label>
        <select class="form-select" id="act-priority">
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="low">Low</option>
        </select>
      </div>
    </div>`,
    `<button class="btn btn--secondary" id="modal-cancel">Cancel</button>
     <button class="btn btn--primary" id="modal-confirm">Add Action</button>`
  );

  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', () => {
    const desc = (document.getElementById('act-desc').value || '').trim();
    if (!desc) { showToast('Description is required.', 'danger'); return; }
    const item = createActionItem(
      desc,
      document.getElementById('act-assignee').value.trim(),
      document.getElementById('act-due').value,
      document.getElementById('act-priority').value
    );
    const m = getMeeting(meetingId);
    if (!m) return;
    m.actionItems = addActionItem(m.actionItems, item);
    saveMeeting(m);
    closeModal();
    refreshActionsTab(meetingId, main);
    showToast('Action item added.', 'success');
  });

  document.getElementById('act-desc').focus();
}

/* Decisions modal and refresh */
function showAddDecisionModal(meetingId, main) {
  openModal('Add Decision',
    `<div class="form-grid" style="grid-template-columns:1fr;">
      <div class="form-field">
        <label class="form-label" for="dec-desc">Decision <span>*</span></label>
        <textarea class="form-textarea" id="dec-desc" rows="3"
                  placeholder="Describe the decision made…"></textarea>
      </div>
      <div class="form-field">
        <label class="form-label" for="dec-by">Made By</label>
        <input class="form-input" id="dec-by" type="text" placeholder="Person or group who decided">
      </div>
    </div>`,
    `<button class="btn btn--secondary" id="modal-cancel">Cancel</button>
     <button class="btn btn--primary" id="modal-confirm">Add Decision</button>`
  );

  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', () => {
    const desc = (document.getElementById('dec-desc').value || '').trim();
    if (!desc) { showToast('Decision description is required.', 'danger'); return; }
    const decision = createDecision(desc, document.getElementById('dec-by').value.trim());
    const m = getMeeting(meetingId);
    if (!m) return;
    m.decisions = addDecision(m.decisions, decision);
    saveMeeting(m);
    closeModal();
    refreshDecisionsTab(meetingId, main);
    showToast('Decision recorded.', 'success');
  });

  document.getElementById('dec-desc').focus();
}

function refreshDecisionsTab(meetingId, main) {
  const m = getMeeting(meetingId);
  if (!m) return;
  const pane = main.querySelector('#tab-decisions');
  if (!pane) return;
  pane.innerHTML = renderDecisionsTab(m);
}

/* Signatures */
function initSignaturePads(meetingId) {
  const main = getMain();
  const m = getMeeting(meetingId);
  if (!m) return;

  (m.attendees || []).forEach(attendee => {
    if (attendee.signatureData) return; // already signed
    const canvas = main.querySelector(`#sig-canvas-${attendee.id}`);
    if (!canvas || state.signaturePads[attendee.id]) return;
    state.signaturePads[attendee.id] = initSignaturePad(canvas);
  });

  // Save signature
  main.querySelectorAll('.btn-sig-save').forEach(btn => {
    // Remove existing listener before adding (avoid duplicates on re-init)
    btn.replaceWith(btn.cloneNode(true));
  });
  main.querySelectorAll('.btn-sig-save').forEach(btn => {
    btn.addEventListener('click', () => {
      const aId = btn.dataset.attendeeId;
      const pad = state.signaturePads[aId];
      if (!pad || pad.isEmpty()) { showToast('Please draw your signature first.', 'danger'); return; }
      const dataUrl = pad.getDataURL();
      const m2 = getMeeting(meetingId);
      if (!m2) return;
      m2.attendees = m2.attendees.map(a =>
        a.id === aId ? { ...a, signatureData: dataUrl } : a
      );
      saveMeeting(m2);
      // Re-render signatures tab
      const pane = main.querySelector('#tab-signatures');
      if (pane) {
        pane.innerHTML = renderSignaturesTab(getMeeting(meetingId));
        initSignaturePads(meetingId);
      }
      showToast('Signature saved.', 'success');
    });
  });

  // Clear signature
  main.querySelectorAll('.btn-sig-clear').forEach(btn => {
    btn.addEventListener('click', () => {
      const pad = state.signaturePads[btn.dataset.attendeeId];
      if (pad) pad.clear();
    });
  });

  // Re-sign (remove existing)
  main.querySelectorAll('.btn-sig-redo').forEach(btn => {
    btn.addEventListener('click', () => {
      const aId = btn.dataset.attendeeId;
      const m2 = getMeeting(meetingId);
      if (!m2) return;
      m2.attendees = m2.attendees.map(a =>
        a.id === aId ? { ...a, signatureData: null } : a
      );
      saveMeeting(m2);
      const pane = main.querySelector('#tab-signatures');
      if (pane) {
        pane.innerHTML = renderSignaturesTab(getMeeting(meetingId));
        delete state.signaturePads[aId];
        initSignaturePads(meetingId);
      }
    });
  });
}

/* ── Delete confirmation ───────────────────────────────────────────── */

function confirmDeleteMeeting(meetingId) {
  const m = getMeeting(meetingId);
  if (!m) return;
  openModal('Delete Meeting',
    `<p>Are you sure you want to permanently delete <strong>${escapeHtmlInline(m.title)}</strong>?
     This cannot be undone.</p>`,
    `<button class="btn btn--secondary" id="modal-cancel">Cancel</button>
     <button class="btn btn--danger" id="modal-confirm">Delete</button>`
  );
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-confirm').addEventListener('click', () => {
    removeMeeting(meetingId);
    closeModal();
    showToast('Meeting deleted.', 'success');
    state.meetingId = null;
    showDashboard();
  });
}

/* ── Back navigation ───────────────────────────────────────────────── */

function navigateBack() {
  if (state.view === 'meeting-form' && state.meetingId) {
    // If meeting was already saved (edit), go back to detail
    const m = getMeeting(state.meetingId);
    if (m && m.createdAt) { showMeetingDetail(state.meetingId); return; }
  }
  showDashboard();
}

/* ── Header navigation ─────────────────────────────────────────────── */

function bindNavEvents() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'dashboard') showDashboard();
      else if (view === 'new-meeting') showMeetingForm();
      else if (view === 'archive') { state.archivePage = 0; showArchive(); }
      else if (view === 'search') showSearch(state.searchQuery);
    });
  });
}

/* ── Modal close on overlay click ──────────────────────────────────── */

function bindModalEvents() {
  const overlay = document.getElementById('modal-overlay');
  overlay.addEventListener('click', e => {
    if (e.target === overlay) closeModal();
  });
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeModal();
  });
}

/* ── Event delegation helper ───────────────────────────────────────── */

function on(root, selector, event, handler) {
  const el = root.querySelector(selector);
  if (el) el.addEventListener(event, handler);
}

/* ── Initialise ────────────────────────────────────────────────────── */

function init() {
  bindNavEvents();
  bindModalEvents();
  showDashboard();
}

document.addEventListener('DOMContentLoaded', init);
