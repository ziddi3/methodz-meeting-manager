// js/ui.js
// DOM rendering helpers and view builders

import {
  escapeHtml, formatDate, formatDateTime, capitalize,
  statusClass, priorityClass, actionStatusClass
} from './utils.js';

/* ── Toast notifications ─────────────────────────────────────────────── */

let toastContainer = null;

function getToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

export function showToast(message, type = '') {
  const el = document.createElement('div');
  el.className = ['toast', type ? `toast--${type}` : ''].filter(Boolean).join(' ');
  el.textContent = message;
  getToastContainer().appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

/* ── Modal ───────────────────────────────────────────────────────────── */

export function openModal(titleText, bodyHtml, footerHtml = '') {
  const overlay = document.getElementById('modal-overlay');
  document.getElementById('modal-title').textContent = titleText;
  document.getElementById('modal-body').innerHTML = bodyHtml;
  document.getElementById('modal-footer').innerHTML = footerHtml;
  overlay.classList.add('open');
}

export function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

/* ── Navigation helpers ──────────────────────────────────────────────── */

export function setActiveNav(viewName) {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewName);
  });
}

export function setActiveView(viewName) {
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${viewName}`);
  });
  setActiveNav(viewName);
}

export function setActiveTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-pane').forEach(p => {
    p.classList.toggle('active', p.id === `tab-${tabName}`);
    p.style.display = p.id === `tab-${tabName}` ? '' : 'none';
  });
}

/* ── Meeting card ─────────────────────────────────────────────────────── */

export function renderMeetingCard(meeting) {
  const attendeeCount = (meeting.attendees || []).length;
  const actionCount = (meeting.actionItems || []).filter(a => a.status !== 'done').length;
  const decisionCount = (meeting.decisions || []).length;
  const time = [meeting.time, meeting.endTime].filter(Boolean).join('–');

  return `
<article class="meeting-card" role="button" tabindex="0"
         data-meeting-id="${escapeHtml(meeting.id)}"
         aria-label="Open meeting: ${escapeHtml(meeting.title)}">
  <div class="meeting-card__header">
    <div class="meeting-card__title">${escapeHtml(meeting.title || 'Untitled Meeting')}</div>
    <span class="badge ${statusClass(meeting.status)}">${escapeHtml(capitalize(meeting.status))}</span>
  </div>
  <div class="meeting-card__meta">
    <span>📅 ${escapeHtml(formatDate(meeting.date))}</span>
    ${time ? `<span>🕐 ${escapeHtml(time)}</span>` : ''}
    ${meeting.location ? `<span>📍 ${escapeHtml(meeting.location)}</span>` : ''}
    ${meeting.company ? `<span>🏢 ${escapeHtml(meeting.company)}</span>` : ''}
    ${meeting.organizer ? `<span>👤 ${escapeHtml(meeting.organizer)}</span>` : ''}
  </div>
  <div class="meeting-card__stats">
    <span>👥 ${attendeeCount} attendee${attendeeCount !== 1 ? 's' : ''}</span>
    ${actionCount > 0 ? `<span>✅ ${actionCount} open action${actionCount !== 1 ? 's' : ''}</span>` : ''}
    ${decisionCount > 0 ? `<span>🔖 ${decisionCount} decision${decisionCount !== 1 ? 's' : ''}</span>` : ''}
  </div>
</article>`;
}

/* ── Dashboard stats ──────────────────────────────────────────────────── */

export function renderDashboardStats(meetings) {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = meetings.filter(m => m.date >= today && m.status !== 'cancelled').length;
  const completed = meetings.filter(m => m.status === 'completed').length;
  const openActions = meetings.reduce((sum, m) =>
    sum + (m.actionItems || []).filter(a => a.status !== 'done').length, 0);
  const totalDecisions = meetings.reduce((sum, m) =>
    sum + (m.decisions || []).length, 0);

  return `
<div class="stats-row">
  <div class="stat-card">
    <div class="stat-card__value">${upcoming}</div>
    <div class="stat-card__label">Upcoming</div>
  </div>
  <div class="stat-card">
    <div class="stat-card__value">${completed}</div>
    <div class="stat-card__label">Completed</div>
  </div>
  <div class="stat-card">
    <div class="stat-card__value">${openActions}</div>
    <div class="stat-card__label">Open Actions</div>
  </div>
  <div class="stat-card">
    <div class="stat-card__value">${totalDecisions}</div>
    <div class="stat-card__label">Decisions</div>
  </div>
</div>`;
}

/* ── Empty state ─────────────────────────────────────────────────────── */

export function renderEmptyState(icon, title, text, actionHtml = '') {
  return `
<div class="empty-state">
  <div class="empty-state__icon">${icon}</div>
  <div class="empty-state__title">${escapeHtml(title)}</div>
  <p class="empty-state__text">${escapeHtml(text)}</p>
  ${actionHtml}
</div>`;
}

/* ── Meeting form ─────────────────────────────────────────────────────── */

export function renderMeetingForm(meeting, isEdit = false) {
  const title = isEdit ? 'Edit Meeting' : 'New Meeting';
  const agendaItems = (meeting.agenda || []).map((a, i) => renderAgendaItem(a, i)).join('');

  return `
<div id="view-meeting-form" class="view active">
  <div class="flex items-center gap-8 mt-8" style="margin-bottom:20px;">
    <button class="btn btn--ghost btn--sm" id="btn-back-from-form">← Back</button>
    <h1 class="page-title" style="margin:0">${title}</h1>
  </div>

  <form id="meeting-form" class="card" autocomplete="off" novalidate>
    <div class="form-grid">
      <div class="form-field form-field--full">
        <label class="form-label" for="f-title">Meeting Title <span>*</span></label>
        <input class="form-input" id="f-title" type="text" name="title"
               value="${escapeHtml(meeting.title)}" placeholder="e.g. Q3 Strategy Review" required>
      </div>

      <div class="form-field">
        <label class="form-label" for="f-date">Date <span>*</span></label>
        <input class="form-input" id="f-date" type="date" name="date"
               value="${escapeHtml(meeting.date)}" required>
      </div>

      <div class="form-field">
        <label class="form-label" for="f-time">Start Time</label>
        <input class="form-input" id="f-time" type="time" name="time"
               value="${escapeHtml(meeting.time)}">
      </div>

      <div class="form-field">
        <label class="form-label" for="f-endtime">End Time</label>
        <input class="form-input" id="f-endtime" type="time" name="endTime"
               value="${escapeHtml(meeting.endTime)}">
      </div>

      <div class="form-field">
        <label class="form-label" for="f-location">Location</label>
        <input class="form-input" id="f-location" type="text" name="location"
               value="${escapeHtml(meeting.location)}" placeholder="e.g. Boardroom A or Zoom">
      </div>

      <div class="form-field">
        <label class="form-label" for="f-organizer">Organizer</label>
        <input class="form-input" id="f-organizer" type="text" name="organizer"
               value="${escapeHtml(meeting.organizer)}" placeholder="Full name">
      </div>

      <div class="form-field">
        <label class="form-label" for="f-company">Company</label>
        <input class="form-input" id="f-company" type="text" name="company"
               value="${escapeHtml(meeting.company)}" placeholder="e.g. Method HVAC Inc.">
      </div>

      <div class="form-field">
        <label class="form-label" for="f-type">Meeting Type</label>
        <select class="form-select" id="f-type" name="type">
          ${['team','board','client','other'].map(t =>
            `<option value="${t}" ${meeting.type === t ? 'selected' : ''}>${capitalize(t)}</option>`
          ).join('')}
        </select>
      </div>

      <div class="form-field">
        <label class="form-label" for="f-status">Status</label>
        <select class="form-select" id="f-status" name="status">
          ${['planned','in-progress','completed','cancelled'].map(s =>
            `<option value="${s}" ${meeting.status === s ? 'selected' : ''}>${capitalize(s.replace('-',' '))}</option>`
          ).join('')}
        </select>
      </div>

      <div class="form-field form-field--full">
        <label class="form-label">Agenda Items</label>
        <div id="agenda-list">${agendaItems}</div>
        <div class="agenda-add-row">
          <input class="form-input" id="agenda-input" type="text" placeholder="Add agenda item…" maxlength="200">
          <button type="button" class="btn btn--secondary btn--sm" id="btn-add-agenda">+ Add</button>
        </div>
      </div>
    </div>

    <div class="form-actions">
      <button type="button" class="btn btn--secondary" id="btn-cancel-form">Cancel</button>
      <button type="submit" class="btn btn--primary" id="btn-save-meeting">
        ${isEdit ? 'Save Changes' : 'Create Meeting'}
      </button>
    </div>
  </form>
</div>`;
}

function renderAgendaItem(text, index) {
  return `
<div class="item-row agenda-item" data-index="${index}">
  <span class="item-row__main">${escapeHtml(text)}</span>
  <button type="button" class="btn btn--ghost btn--icon btn-remove-agenda"
          data-index="${index}" aria-label="Remove agenda item">✕</button>
</div>`;
}

export function appendAgendaItem(text, index) {
  const list = document.getElementById('agenda-list');
  const div = document.createElement('div');
  div.innerHTML = renderAgendaItem(text, index);
  list.appendChild(div.firstElementChild);
}

/* ── Meeting detail ───────────────────────────────────────────────────── */

export function renderMeetingDetail(meeting) {
  const time = [meeting.time, meeting.endTime].filter(Boolean).join(' – ');

  return `
<div id="view-meeting-detail" class="view active">
  <button class="btn btn--ghost btn--sm" id="btn-back-to-dashboard" style="margin-bottom:16px;">← Back</button>

  <div class="detail-header">
    <div class="detail-header__top">
      <div>
        <h1 class="detail-header__title">${escapeHtml(meeting.title || 'Untitled Meeting')}</h1>
        <div class="detail-header__meta">
          <span>📅 ${escapeHtml(formatDate(meeting.date))}</span>
          ${time ? `<span>🕐 ${escapeHtml(time)}</span>` : ''}
          ${meeting.location ? `<span>📍 ${escapeHtml(meeting.location)}</span>` : ''}
          ${meeting.company ? `<span>🏢 ${escapeHtml(meeting.company)}</span>` : ''}
          ${meeting.organizer ? `<span>👤 ${escapeHtml(meeting.organizer)}</span>` : ''}
          <span class="badge ${statusClass(meeting.status)}">${escapeHtml(capitalize(meeting.status))}</span>
        </div>
      </div>
      <div class="detail-header__actions">
        <button class="btn btn--secondary btn--sm" id="btn-edit-meeting">✏️ Edit</button>
        <button class="btn btn--secondary btn--sm" id="btn-print-meeting">🖨️ Export PDF</button>
        <button class="btn btn--danger btn--sm" id="btn-delete-meeting">🗑️ Delete</button>
      </div>
    </div>
  </div>

  <nav class="tab-bar" role="tablist" aria-label="Meeting sections">
    ${['overview','attendees','minutes','actions','decisions','signatures'].map(tab => `
    <button class="tab-btn" role="tab" data-tab="${tab}"
            aria-selected="false" aria-controls="tab-${tab}">
      ${tabLabel(tab)}
    </button>`).join('')}
  </nav>

  <div id="tab-overview"    class="tab-pane view" style="display:none">${renderOverviewTab(meeting)}</div>
  <div id="tab-attendees"   class="tab-pane view" style="display:none">${renderAttendeesTab(meeting)}</div>
  <div id="tab-minutes"     class="tab-pane view" style="display:none">${renderMinutesTab(meeting)}</div>
  <div id="tab-actions"     class="tab-pane view" style="display:none">${renderActionsTab(meeting)}</div>
  <div id="tab-decisions"   class="tab-pane view" style="display:none">${renderDecisionsTab(meeting)}</div>
  <div id="tab-signatures"  class="tab-pane view" style="display:none">${renderSignaturesTab(meeting)}</div>
</div>`;
}

function tabLabel(tab) {
  const labels = {
    overview: 'Overview',
    attendees: 'Attendees',
    minutes: 'Minutes',
    actions: 'Action Items',
    decisions: 'Decisions',
    signatures: 'Signatures'
  };
  return labels[tab] || capitalize(tab);
}

/* Overview tab */
function renderOverviewTab(meeting) {
  const agenda = meeting.agenda || [];
  return `
<div class="card">
  <p class="section-title">Details</p>
  <dl class="form-grid" style="gap:12px 20px;">
    ${detailRow('Type', capitalize(meeting.type || '—'))}
    ${detailRow('Status', capitalize((meeting.status || '').replace('-',' ') || '—'))}
    ${detailRow('Date', formatDate(meeting.date))}
    ${detailRow('Time', [meeting.time, meeting.endTime].filter(Boolean).join(' – ') || '—')}
    ${detailRow('Location', meeting.location || '—')}
    ${detailRow('Organizer', meeting.organizer || '—')}
    ${detailRow('Company', meeting.company || '—')}
  </dl>

  ${agenda.length ? `
  <div class="divider"></div>
  <p class="section-title">Agenda</p>
  <ol style="margin-left:20px;display:flex;flex-direction:column;gap:6px;">
    ${agenda.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
  </ol>` : ''}
</div>`;
}

function detailRow(label, value) {
  return `
<div>
  <dt style="font-size:.75rem;font-weight:600;color:var(--color-text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;">${escapeHtml(label)}</dt>
  <dd style="font-size:.9375rem;">${escapeHtml(String(value))}</dd>
</div>`;
}

/* Attendees tab */
export function renderAttendeesTab(meeting) {
  const attendees = meeting.attendees || [];
  const presentN = attendees.filter(a => a.present).length;

  return `
<div class="card">
  <div class="section-head">
    <p class="section-title">Attendees (${presentN}/${attendees.length} present)</p>
    <button class="btn btn--primary btn--sm" id="btn-add-attendee">+ Add Attendee</button>
  </div>
  <div id="attendees-list">
    ${attendees.length
      ? attendees.map(a => renderAttendeeRow(a)).join('')
      : `<p class="text-muted text-sm" style="padding:12px 0;">No attendees yet.</p>`
    }
  </div>
</div>`;
}

export function renderAttendeeRow(a) {
  return `
<div class="item-row attendee-row" data-attendee-id="${escapeHtml(a.id)}">
  <input type="checkbox" class="attendance-check" ${a.present ? 'checked' : ''}
         data-attendee-id="${escapeHtml(a.id)}" aria-label="Mark ${escapeHtml(a.name)} present"
         title="Toggle attendance">
  <div class="item-row__main">
    <div class="item-row__label font-semibold">${escapeHtml(a.name || '(No name)')}</div>
    <div class="item-row__sub">
      ${[a.role, a.company, a.email].filter(Boolean).map(escapeHtml).join(' · ')}
    </div>
  </div>
  <button class="btn btn--ghost btn--icon btn-remove-attendee"
          data-attendee-id="${escapeHtml(a.id)}" aria-label="Remove attendee">✕</button>
</div>`;
}

/* Minutes tab */
export function renderMinutesTab(meeting) {
  return `
<div class="card">
  <div class="section-head">
    <p class="section-title">Meeting Minutes</p>
    <button class="btn btn--primary btn--sm" id="btn-save-minutes">Save</button>
  </div>
  <textarea class="form-textarea w-full" id="minutes-editor"
            placeholder="Record meeting notes, discussions, and key points here…"
            rows="16">${escapeHtml(meeting.minutes || '')}</textarea>
  <p class="text-muted text-sm mt-8">Minutes are auto-saved when you click Save.</p>
</div>`;
}

/* Action items tab */
export function renderActionsTab(meeting) {
  const items = meeting.actionItems || [];
  const open = items.filter(i => i.status !== 'done').length;

  return `
<div class="card">
  <div class="section-head">
    <p class="section-title">Action Items (${open} open)</p>
    <button class="btn btn--primary btn--sm" id="btn-add-action">+ Add Action</button>
  </div>
  <div id="actions-list">
    ${items.length
      ? items.map(i => renderActionRow(i)).join('')
      : `<p class="text-muted text-sm" style="padding:12px 0;">No action items yet.</p>`
    }
  </div>
</div>`;
}

export function renderActionRow(item) {
  return `
<div class="item-row" data-action-id="${escapeHtml(item.id)}">
  <div class="item-row__main">
    <div class="item-row__label ${item.status === 'done' ? 'text-muted' : ''}"
         style="${item.status === 'done' ? 'text-decoration:line-through' : ''}">
      ${escapeHtml(item.description)}
    </div>
    <div class="item-row__sub">
      ${item.assignee ? `👤 ${escapeHtml(item.assignee)}` : ''}
      ${item.dueDate ? ` · Due: ${escapeHtml(item.dueDate)}` : ''}
    </div>
  </div>
  <span class="badge ${priorityClass(item.priority)}">${escapeHtml(capitalize(item.priority))}</span>
  <span class="badge ${actionStatusClass(item.status)}">${escapeHtml(capitalize(item.status))}</span>
  <button class="btn btn--ghost btn--sm btn-toggle-action" data-action-id="${escapeHtml(item.id)}"
          title="${item.status === 'done' ? 'Reopen' : 'Mark done'}">
    ${item.status === 'done' ? '↩' : '✓'}
  </button>
  <button class="btn btn--ghost btn--icon btn-remove-action"
          data-action-id="${escapeHtml(item.id)}" aria-label="Remove action">✕</button>
</div>`;
}

/* Decisions tab */
export function renderDecisionsTab(meeting) {
  const items = meeting.decisions || [];

  return `
<div class="card">
  <div class="section-head">
    <p class="section-title">Decisions (${items.length})</p>
    <button class="btn btn--primary btn--sm" id="btn-add-decision">+ Add Decision</button>
  </div>
  <div id="decisions-list">
    ${items.length
      ? items.map(d => renderDecisionRow(d)).join('')
      : `<p class="text-muted text-sm" style="padding:12px 0;">No decisions recorded yet.</p>`
    }
  </div>
</div>`;
}

export function renderDecisionRow(d) {
  return `
<div class="item-row" data-decision-id="${escapeHtml(d.id)}">
  <div class="item-row__main">
    <div class="item-row__label">${escapeHtml(d.description)}</div>
    <div class="item-row__sub">
      ${d.madeBy ? `By: ${escapeHtml(d.madeBy)}` : ''}
      ${d.timestamp ? ` · ${escapeHtml(formatDateTime(d.timestamp))}` : ''}
    </div>
  </div>
  <button class="btn btn--ghost btn--icon btn-remove-decision"
          data-decision-id="${escapeHtml(d.id)}" aria-label="Remove decision">✕</button>
</div>`;
}

/* Signatures tab */
export function renderSignaturesTab(meeting) {
  const attendees = meeting.attendees || [];
  if (!attendees.length) {
    return `<div class="card"><p class="text-muted text-sm">Add attendees first to collect signatures.</p></div>`;
  }
  return `
<div class="card">
  <p class="section-title" style="margin-bottom:16px;">Digital Signatures</p>
  ${attendees.map(a => renderSignaturePadBlock(a)).join('')}
</div>`;
}

export function renderSignaturePadBlock(a) {
  const hasSig = Boolean(a.signatureData);
  return `
<div class="mt-16" data-sig-attendee="${escapeHtml(a.id)}">
  <p class="font-semibold text-sm" style="margin-bottom:6px;">${escapeHtml(a.name || '(No name)')}</p>
  ${hasSig
    ? `<img class="sig-preview" src="${a.signatureData}" alt="Signature of ${escapeHtml(a.name)}">`
    : ''
  }
  <div class="sig-pad-wrap ${hasSig ? 'hidden' : ''}" id="sig-wrap-${escapeHtml(a.id)}">
    <canvas class="sig-canvas" id="sig-canvas-${escapeHtml(a.id)}"
            aria-label="Signature pad for ${escapeHtml(a.name)}"></canvas>
    <div class="sig-controls">
      <button class="btn btn--secondary btn--sm btn-sig-clear"
              data-attendee-id="${escapeHtml(a.id)}">Clear</button>
      <button class="btn btn--primary btn--sm btn-sig-save"
              data-attendee-id="${escapeHtml(a.id)}">Save Signature</button>
    </div>
  </div>
  ${hasSig
    ? `<button class="btn btn--ghost btn--sm btn-sig-redo" data-attendee-id="${escapeHtml(a.id)}"
              style="margin-top:4px;">Re-sign</button>`
    : ''
  }
</div>`;
}

/* ── Archive view ──────────────────────────────────────────────────────── */

export function renderArchiveView(meetings, page, pageSize) {
  const total = meetings.length;
  const start = page * pageSize;
  const slice = meetings.slice(start, start + pageSize);
  const totalPages = Math.ceil(total / pageSize);

  return `
<div id="view-archive" class="view active">
  <h1 class="page-title">Meeting Archive</h1>
  ${total === 0
    ? renderEmptyState('📂', 'No archived meetings', 'Completed or past meetings will appear here.')
    : `
  <p class="text-muted text-sm" style="margin-bottom:12px;">Showing ${start + 1}–${Math.min(start + pageSize, total)} of ${total} meetings</p>
  <div class="meeting-list">
    ${slice.map(m => renderMeetingCard(m)).join('')}
  </div>
  ${totalPages > 1 ? `
  <div class="pagination">
    <button class="btn btn--secondary btn--sm" id="btn-prev-page" ${page === 0 ? 'disabled' : ''}>← Prev</button>
    <span class="text-muted text-sm" style="align-self:center;">Page ${page + 1} / ${totalPages}</span>
    <button class="btn btn--secondary btn--sm" id="btn-next-page" ${page >= totalPages - 1 ? 'disabled' : ''}>Next →</button>
  </div>` : ''}`
  }
</div>`;
}

/* ── Search view ───────────────────────────────────────────────────────── */

export function renderSearchView(results, query) {
  const hasQuery = Boolean(query && query.trim());
  return `
<div id="view-search" class="view active">
  <h1 class="page-title">Search Meetings</h1>
  <div class="search-bar">
    <input class="form-input" id="search-input" type="search"
           placeholder="Search by title, attendee, topic, action…"
           value="${escapeHtml(query)}" autofocus>
  </div>
  <div id="search-results">
    ${!hasQuery
      ? `<p class="text-muted text-sm">Start typing to search across all meetings.</p>`
      : results.length === 0
        ? renderEmptyState('🔍', 'No results', `No meetings match "${escapeHtml(query)}".`)
        : `<p class="text-muted text-sm" style="margin-bottom:12px;">${results.length} result${results.length !== 1 ? 's' : ''}</p>
           <div class="meeting-list">${results.map(m => renderMeetingCard(m)).join('')}</div>`
    }
  </div>
</div>`;
}

/* ── Dashboard view ────────────────────────────────────────────────────── */

export function renderDashboardView(allMeetings, upcoming) {
  const recent = allMeetings.slice(0, 5);

  return `
<div id="view-dashboard" class="view active">
  <div class="flex items-center justify-between" style="margin-bottom:20px;">
    <h1 class="page-title" style="margin:0;">Dashboard</h1>
    <button class="btn btn--primary" id="btn-new-meeting-dash">+ New Meeting</button>
  </div>

  ${renderDashboardStats(allMeetings)}

  <div class="section-head" style="margin-top:8px;">
    <p class="section-title">Upcoming Meetings</p>
    <button class="btn btn--ghost btn--sm" id="btn-view-all">View Archive →</button>
  </div>
  ${upcoming.length
    ? `<div class="meeting-list">${upcoming.map(m => renderMeetingCard(m)).join('')}</div>`
    : renderEmptyState('📅', 'No upcoming meetings', 'Create your first meeting to get started.',
        `<button class="btn btn--primary" id="btn-create-first">Create Meeting</button>`)
  }

  ${recent.length > 0 ? `
  <div class="section-head mt-20">
    <p class="section-title">Recent Meetings</p>
  </div>
  <div class="meeting-list">
    ${recent.map(m => renderMeetingCard(m)).join('')}
  </div>` : ''}
</div>`;
}
