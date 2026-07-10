/* Methodz Meeting Manager v0.7 dedicated archive detail page. */

let activeArchiveRecordV07 = null;

window.addEventListener("DOMContentLoaded", initializeArchivePageV07);

function initializeArchivePageV07() {
  const record = resolveArchiveRecordV07();
  document.getElementById("archiveLoading").hidden = true;

  if (!record) {
    showArchiveErrorV07("The requested meeting record was not found in local storage or the same-session fallback cache.");
    return;
  }

  activeArchiveRecordV07 = record;
  renderArchiveRecordV07(record);
}

function resolveArchiveRecordV07() {
  const params = new URLSearchParams(window.location.search);
  const isPreview = params.get("preview") === "current";
  const recordId = params.get("id") || "";

  if (isPreview) {
    return readSessionRecordV07("methodzArchivePreviewRecord");
  }

  if (recordId && window.MethodzMeetingData) {
    const stored = window.MethodzMeetingData.getRecord(recordId);
    if (stored) return stored;
  }

  const fallback = readSessionRecordV07("methodzArchiveFallbackRecord");
  if (fallback && (!recordId || fallback.id === recordId)) return fallback;

  return null;
}

function readSessionRecordV07(key) {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(key));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (error) {
    console.warn(`Unable to read ${key}`, error);
    return null;
  }
}

function renderArchiveRecordV07(record) {
  document.getElementById("archiveRecord").hidden = false;
  document.getElementById("archivePageTitle").textContent = `Meeting #${record.meetingNumber || "?"}`;
  document.getElementById("archiveMeetingTitle").textContent = record.title || "Untitled Meeting";
  document.getElementById("archiveStatus").textContent = record.status || "Unknown";
  document.getElementById("archiveMeetingMeta").textContent =
    `${record.date || "No date"} • ${record.location || "No location"} • Facilitator: ${record.facilitator || "Not listed"}`;

  const editButton = document.getElementById("archiveEditButton");
  if (editButton) editButton.hidden = Boolean(record.archivePreview);

  renderDefinitionListV07("archiveMeetingInformation", [
    ["Meeting Number", record.meetingNumber || "Not assigned"],
    ["Title", record.title || "Untitled Meeting"],
    ["Status", record.status || "Not listed"],
    ["Date", record.date || "Not listed"],
    ["Location / Video Link", record.location || "Not listed"],
    ["Meeting Facilitator", record.facilitator || "Not listed"]
  ]);

  renderOrganizationsV07(record);
  renderAttendanceV07(record);
  renderAgendaV07(record);
  renderNotesV07(record);
  renderDecisionsV07(record);
  renderTasksV07(record);
  renderAttachmentsV07(record);
  renderSummaryV07(record);
  renderRecordAuditV07(record);
}

function renderOrganizationsV07(record) {
  const container = document.getElementById("archiveOrganizations");
  const organizations = Array.isArray(record.organizations) ? record.organizations : [];
  const details = Array.isArray(record.organizationDetails) ? record.organizationDetails : [];
  const detailsByName = new Map(details.map((entry) => [normalizeArchiveTextV07(entry.name), entry]));

  if (!organizations.length) {
    container.innerHTML = `<p>No organizations or representative groups were selected.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="archive-card-grid">
      ${organizations.map((name) => {
        const detail = detailsByName.get(normalizeArchiveTextV07(name));
        return `
          <article class="archive-mini-card">
            <strong>${escapeArchiveV07(name)}</strong>
            ${detail?.type ? `<p>${escapeArchiveV07(detail.type)}</p>` : ""}
            ${detail?.primaryRepresentative ? `<p>Primary Representative: ${escapeArchiveV07(detail.primaryRepresentative)}</p>` : ""}
            ${detail?.contact ? `<p>Contact: ${escapeArchiveV07(detail.contact)}</p>` : ""}
            ${detail?.notes ? `<p class="helper-text">${escapeArchiveV07(detail.notes)}</p>` : ""}
          </article>
        `;
      }).join("")}
    </div>
  `;
}

function renderAttendanceV07(record) {
  const container = document.getElementById("archiveAttendance");
  const attendees = Array.isArray(record.attendees) ? record.attendees : [];

  if (!attendees.length) {
    container.innerHTML = `<p>No attendees were listed.</p>`;
  } else {
    container.innerHTML = `
      <div class="archive-table-wrap">
        <table class="compact-table archive-table">
          <thead>
            <tr><th>Name</th><th>Organization / Role</th><th>Attendance</th><th>Signature</th><th>Signed</th></tr>
          </thead>
          <tbody>
            ${attendees.map((person) => `
              <tr>
                <td>${escapeArchiveV07(person.name || "Unnamed")}</td>
                <td>${escapeArchiveV07(person.organizationRole || "Not listed")}</td>
                <td>${escapeArchiveV07(person.attendanceType || "Not listed")}</td>
                <td>${escapeArchiveV07(person.signature || "Not signed")}</td>
                <td>${escapeArchiveV07(formatArchiveDateTimeV07(person.signedAt))}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  const audit = document.getElementById("archiveSignatureAudit");
  const signatureAudit = record.signatureAudit;
  if (!signatureAudit) {
    audit.innerHTML = `<h3>Signature Audit</h3><p>No signature audit metadata was recorded.</p>`;
    return;
  }

  audit.innerHTML = `
    <h3>Signature Audit</h3>
    ${renderGenericObjectV07(signatureAudit)}
  `;
}

function renderAgendaV07(record) {
  const container = document.getElementById("archiveAgenda");
  const agenda = Array.isArray(record.agenda) ? record.agenda : [];

  if (!agenda.length) {
    container.innerHTML = `<p>No agenda items were recorded.</p>`;
    return;
  }

  const groups = new Map();
  agenda.forEach((item) => {
    const group = item.group || "General";
    groups.set(group, [...(groups.get(group) || []), item]);
  });

  container.innerHTML = Array.from(groups.entries()).map(([group, items]) => `
    <section class="archive-agenda-group">
      <h3>${escapeArchiveV07(group)}</h3>
      <ul class="archive-check-list">
        ${items.map((item) => `
          <li class="${item.completed ? "is-complete" : "is-open"}">
            <span aria-hidden="true">${item.completed ? "✓" : "○"}</span>
            ${escapeArchiveV07(item.item || "Untitled agenda item")}
          </li>
        `).join("")}
      </ul>
    </section>
  `).join("");
}

function renderNotesV07(record) {
  document.getElementById("archiveNotes").innerHTML = formatArchiveParagraphsV07(record.notes, "No discussion notes were entered.");
}

function renderDecisionsV07(record) {
  const container = document.getElementById("archiveDecisions");
  const decisions = Array.isArray(record.decisionsList) ? record.decisionsList : [];

  const structured = decisions.length
    ? `
      <div class="archive-card-grid">
        ${decisions.map((decision) => `
          <article class="archive-mini-card">
            <strong>${escapeArchiveV07(decision.decision || "Untitled decision")}</strong>
            <p>Status: ${escapeArchiveV07(decision.status || "Not listed")}</p>
            <p>Confirmed By: ${escapeArchiveV07(decision.approvedBy || "Not listed")}</p>
            <p>Date: ${escapeArchiveV07(decision.date || "Not listed")}</p>
            ${decision.notes ? `<p class="helper-text">${escapeArchiveV07(decision.notes)}</p>` : ""}
          </article>
        `).join("")}
      </div>
    `
    : `<p>No structured decisions were recorded.</p>`;

  container.innerHTML = `
    ${structured}
    <h3>Free-Form Decision Notes</h3>
    <div class="archive-prose">${formatArchiveParagraphsV07(record.decisions, "No additional decision notes were entered.")}</div>
  `;
}

function renderTasksV07(record) {
  const container = document.getElementById("archiveTasks");
  const tasks = Array.isArray(record.tasks) ? record.tasks : [];

  if (!tasks.length) {
    container.innerHTML = `<p>No follow-up tasks were recorded.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="archive-table-wrap">
      <table class="compact-table archive-table">
        <thead>
          <tr><th>Task</th><th>Assigned To</th><th>Priority</th><th>Due</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${tasks.map((task) => `
            <tr>
              <td>${escapeArchiveV07(task.task || "Untitled task")}</td>
              <td>${escapeArchiveV07(task.assignedTo || "Unassigned")}</td>
              <td>${escapeArchiveV07(task.priority || "Normal")}</td>
              <td>${escapeArchiveV07(task.due || "No due date")}</td>
              <td>${escapeArchiveV07(task.status || "Pending")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderAttachmentsV07(record) {
  const container = document.getElementById("archiveAttachments");
  const attachments = Array.isArray(record.attachments) ? record.attachments : [];

  if (!attachments.length) {
    container.innerHTML = `<p>No attachment references were recorded.</p>`;
    return;
  }

  container.innerHTML = `
    <div class="archive-table-wrap">
      <table class="compact-table archive-table">
        <thead>
          <tr><th>Name</th><th>Type</th><th>Date</th><th>Location</th><th>Added By</th><th>Notes</th></tr>
        </thead>
        <tbody>
          ${attachments.map((item) => `
            <tr>
              <td>${escapeArchiveV07(item.label || item.name || item.referenceName || "Untitled reference")}</td>
              <td>${escapeArchiveV07(item.type || "Other")}</td>
              <td>${escapeArchiveV07(item.date || "Not listed")}</td>
              <td class="archive-break-word">${escapeArchiveV07(item.location || item.fileLocation || "Not listed")}</td>
              <td>${escapeArchiveV07(item.addedBy || "Not listed")}</td>
              <td>${escapeArchiveV07(item.notes || "")}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderSummaryV07(record) {
  document.getElementById("archiveSummary").innerHTML = formatArchiveParagraphsV07(record.summary, "No meeting summary was entered.");
}

function renderRecordAuditV07(record) {
  renderDefinitionListV07("archiveRecordAudit", [
    ["Record ID", record.id || "Not listed"],
    ["Schema Version", record.schemaVersion || "Not listed"],
    ["Created", formatArchiveDateTimeV07(record.createdAt)],
    ["Updated", formatArchiveDateTimeV07(record.updatedAt)],
    ["First Saved", formatArchiveDateTimeV07(record.savedAt)],
    ["Archive Mode", record.archivePreview ? "Unsaved preview" : "Saved record"]
  ]);
}

function renderDefinitionListV07(elementId, entries) {
  const element = document.getElementById(elementId);
  if (!element) return;
  element.innerHTML = entries.map(([label, value]) => `
    <div>
      <dt>${escapeArchiveV07(label)}</dt>
      <dd>${escapeArchiveV07(value)}</dd>
    </div>
  `).join("");
}

function renderGenericObjectV07(value) {
  if (value === null || value === undefined) return `<p>Not recorded.</p>`;
  if (Array.isArray(value)) {
    if (!value.length) return `<p>No audit entries.</p>`;
    return `<ul>${value.map((item) => `<li>${typeof item === "object" ? renderGenericObjectV07(item) : escapeArchiveV07(item)}</li>`).join("")}</ul>`;
  }
  if (typeof value !== "object") return `<p>${escapeArchiveV07(value)}</p>`;

  return `
    <dl class="archive-definition-grid compact-definition-grid">
      ${Object.entries(value).map(([key, item]) => `
        <div>
          <dt>${escapeArchiveV07(humanizeArchiveKeyV07(key))}</dt>
          <dd>${typeof item === "object" && item !== null ? renderGenericObjectV07(item) : escapeArchiveV07(item ?? "Not recorded")}</dd>
        </div>
      `).join("")}
    </dl>
  `;
}

function editArchiveRecordV07() {
  if (!activeArchiveRecordV07 || activeArchiveRecordV07.archivePreview) return;
  try {
    sessionStorage.setItem("methodzArchiveEditRecordId", activeArchiveRecordV07.id);
  } catch (error) {
    console.warn("Unable to stage edit request", error);
  }
  window.location.href = "meeting.html";
}

function downloadArchiveRecordV07() {
  if (!activeArchiveRecordV07) return;
  const blob = new Blob([JSON.stringify(activeArchiveRecordV07, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `meeting-${activeArchiveRecordV07.meetingNumber || activeArchiveRecordV07.id || "archive"}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function showArchiveErrorV07(message) {
  const panel = document.getElementById("archiveError");
  const text = document.getElementById("archiveErrorMessage");
  if (text) text.textContent = message;
  if (panel) panel.hidden = false;
}

function formatArchiveParagraphsV07(value, emptyText) {
  const text = String(value || "").trim();
  if (!text) return `<p>${escapeArchiveV07(emptyText)}</p>`;
  return text.split(/\n{2,}/).map((paragraph) => `<p>${escapeArchiveV07(paragraph).replaceAll("\n", "<br>")}</p>`).join("");
}

function formatArchiveDateTimeV07(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

function humanizeArchiveKeyV07(key) {
  return String(key || "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeArchiveTextV07(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeArchiveV07(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
