/* Methodz Meeting Manager v0.5 attachment reference workflow. */

window.addEventListener("DOMContentLoaded", initializeV05Attachments);

function initializeV05Attachments() {
  installAttachmentRegisterV05();
  installAttachmentDashboardV05();
  patchAttachmentDataFlowV05();
  renderAttachmentReferencesV05([]);
  refreshAttachmentDashboardV05();
}

function installAttachmentRegisterV05() {
  const summaryCard = document.getElementById("summary")?.closest(".card");
  if (!summaryCard || document.getElementById("attachmentRegisterPanel")) return;

  const panel = document.createElement("section");
  panel.id = "attachmentRegisterPanel";
  panel.className = "card v05-card attachment-card";
  panel.innerHTML = `
    <div class="section-subheader">
      <div>
        <h2>Attachment References</h2>
        <p class="helper-text">Track files, photos, quotes, drawings, or external evidence without storing private files inside browser local storage.</p>
      </div>
      <div class="button-row">
        <button type="button" onclick="addAttachmentReferenceV05()">Add Reference</button>
        <button type="button" onclick="exportCurrentAttachmentsCsvV05()">Export Attachment CSV</button>
      </div>
    </div>
    <p class="helper-text">Use clear locations such as Drive folder names, quote numbers, invoice numbers, phone gallery labels, or CRM references.</p>
    <div id="attachmentReferenceList" class="attachment-reference-list"></div>
  `;

  summaryCard.insertAdjacentElement("afterend", panel);
}

function installAttachmentDashboardV05() {
  const savedCard = document.getElementById("savedRecords")?.closest(".card");
  if (!savedCard || document.getElementById("attachmentDashboard")) return;

  const dashboard = document.createElement("section");
  dashboard.id = "attachmentDashboard";
  dashboard.className = "card v05-card attachment-dashboard";
  dashboard.innerHTML = `
    <div class="section-subheader">
      <div>
        <h2>Attachment Index</h2>
        <p class="helper-text">Cross-meeting list of referenced files and evidence locations.</p>
      </div>
      <div class="button-row">
        <button type="button" onclick="refreshAttachmentDashboardV05()">Refresh</button>
        <button type="button" onclick="exportAttachmentIndexCsvV05()">Export Index CSV</button>
      </div>
    </div>
    <div id="attachmentDashboardBody"></div>
  `;

  savedCard.insertAdjacentElement("beforebegin", dashboard);
}

function patchAttachmentDataFlowV05() {
  if (!window.__methodzV05AttachmentsPatched && typeof window.collectMeetingData === "function") {
    const originalCollectMeetingData = window.collectMeetingData;
    window.collectMeetingData = function collectMeetingDataV05Attachments(options = {}) {
      const meeting = originalCollectMeetingData(options);
      meeting.attachments = collectAttachmentReferencesV05(options);
      meeting.attachmentSummary = summarizeAttachmentsV05(meeting.attachments);
      return meeting;
    };
    window.__methodzV05AttachmentsPatched = true;
  }

  if (!window.__methodzV05AttachmentPopulatePatched && typeof window.populateForm === "function") {
    const originalPopulateForm = window.populateForm;
    window.populateForm = function populateFormV05Attachments(record, options = {}) {
      originalPopulateForm(record, options);
      renderAttachmentReferencesV05(record.attachments || record.attachmentReferences || []);
    };
    window.__methodzV05AttachmentPopulatePatched = true;
  }

  if (!window.__methodzV05AttachmentResetPatched && typeof window.resetForm === "function") {
    const originalResetForm = window.resetForm;
    window.resetForm = function resetFormV05Attachments() {
      originalResetForm();
      renderAttachmentReferencesV05([]);
      refreshAttachmentDashboardV05();
    };
    window.__methodzV05AttachmentResetPatched = true;
  }

  if (!window.__methodzV05AttachmentTextPatched && typeof window.createPlainTextMeeting === "function") {
    const originalCreatePlainTextMeeting = window.createPlainTextMeeting;
    window.createPlainTextMeeting = function createPlainTextMeetingV05Attachments(meeting) {
      const baseText = originalCreatePlainTextMeeting(meeting);
      return `${baseText}\nATTACHMENT REFERENCES\n${formatAttachmentsForTextV05(meeting.attachments || [])}\n`;
    };
    window.__methodzV05AttachmentTextPatched = true;
  }

  if (!window.__methodzV05AttachmentMinutesPatched && typeof window.renderMinutesHtml === "function") {
    const originalRenderMinutesHtml = window.renderMinutesHtml;
    window.renderMinutesHtml = function renderMinutesHtmlV05Attachments(meeting, options = {}) {
      const html = originalRenderMinutesHtml(meeting, options);
      const section = renderAttachmentMinutesSectionV05(meeting.attachments || []);
      return html.includes("</article>") ? html.replace("</article>", `${section}</article>`) : `${html}${section}`;
    };
    window.__methodzV05AttachmentMinutesPatched = true;
  }

  if (!window.__methodzV05AttachmentLoadPatched && typeof window.loadSavedRecords === "function") {
    const originalLoadSavedRecords = window.loadSavedRecords;
    window.loadSavedRecords = function loadSavedRecordsV05Attachments() {
      originalLoadSavedRecords();
      refreshAttachmentDashboardV05();
    };
    window.__methodzV05AttachmentLoadPatched = true;
  }
}

function addAttachmentReferenceV05(data = {}) {
  const container = document.getElementById("attachmentReferenceList");
  if (!container) return;

  const item = document.createElement("div");
  item.className = "attachment-reference-item";
  item.innerHTML = `
    <div class="item-header">
      <h3>Attachment Reference</h3>
      <button type="button" class="small-danger" onclick="removeAttachmentReferenceV05(this)">Remove</button>
    </div>

    <label>Reference Name</label>
    <input type="text" class="attachment-label" placeholder="Install photo, signed quote, logo file, invoice..." value="${escapeV05(data.label || data.name || "")}">

    <div class="form-grid">
      <div>
        <label>Reference Type</label>
        <select class="attachment-type">
          ${getAttachmentTypesV05().map((type) => optionV05(type, data.type || "Photo")).join("")}
        </select>
      </div>
      <div>
        <label>Reference Date</label>
        <input type="date" class="attachment-date" value="${escapeV05(data.date || todayV05())}">
      </div>
    </div>

    <label>File / Evidence Location</label>
    <input type="text" class="attachment-location" placeholder="Drive folder, phone gallery label, quote #, invoice #, CRM link..." value="${escapeV05(data.location || "")}">

    <label>Added By</label>
    <input type="text" class="attachment-added-by" placeholder="Who referenced this?" value="${escapeV05(data.addedBy || "")}">

    <label>Notes</label>
    <textarea class="attachment-notes" placeholder="Context, version, approval notes, or what this file proves...">${escapeV05(data.notes || "")}</textarea>
  `;

  container.appendChild(item);
  scheduleDraftV05();
}

function removeAttachmentReferenceV05(button) {
  const item = button.closest(".attachment-reference-item");
  if (item) item.remove();
  scheduleDraftV05();
}

function renderAttachmentReferencesV05(attachments) {
  const container = document.getElementById("attachmentReferenceList");
  if (!container) return;

  container.innerHTML = "";
  (attachments || []).forEach((attachment) => addAttachmentReferenceV05(attachment));
}

function collectAttachmentReferencesV05(options = {}) {
  const references = [];

  document.querySelectorAll(".attachment-reference-item").forEach((item) => {
    const label = readScopedV05(item, ".attachment-label");
    const type = readScopedV05(item, ".attachment-type") || "Other";
    const location = readScopedV05(item, ".attachment-location");
    const date = readScopedV05(item, ".attachment-date");
    const addedBy = readScopedV05(item, ".attachment-added-by");
    const notes = readScopedV05(item, ".attachment-notes");

    if (!options.keepEmptyRows && !label && !location && !notes) return;

    references.push({
      id: item.dataset.attachmentId || `attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label,
      type,
      location,
      date,
      addedBy,
      notes
    });
  });

  return references;
}

function summarizeAttachmentsV05(attachments) {
  const byType = {};
  (attachments || []).forEach((attachment) => {
    const type = attachment.type || "Other";
    byType[type] = (byType[type] || 0) + 1;
  });

  return {
    total: (attachments || []).length,
    byType
  };
}

function refreshAttachmentDashboardV05() {
  const body = document.getElementById("attachmentDashboardBody");
  if (!body) return;

  const rows = getAttachmentIndexRowsV05();
  if (!rows.length) {
    body.innerHTML = "<p>No attachment references found in saved records.</p>";
    return;
  }

  const typeCount = new Set(rows.map((row) => row.type).filter(Boolean)).size;
  const missingLocation = rows.filter((row) => !row.location).length;

  body.innerHTML = `
    <div class="metric-grid">
      <div><strong>${rows.length}</strong><span>references</span></div>
      <div><strong>${typeCount}</strong><span>types</span></div>
      <div><strong>${missingLocation}</strong><span>missing locations</span></div>
      <div><strong>${new Set(rows.map((row) => row.meetingId)).size}</strong><span>meetings</span></div>
    </div>
    <table class="compact-table">
      <thead><tr><th>Reference</th><th>Type</th><th>Location</th><th>Date</th><th>Meeting</th><th></th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr class="${row.location ? "" : "needs-location"}">
            <td>${escapeV05(row.label || "Untitled reference")}</td>
            <td>${escapeV05(row.type || "Other")}</td>
            <td>${escapeV05(row.location || "Location needed")}</td>
            <td>${escapeV05(row.date || "No date")}</td>
            <td>${escapeV05(row.meetingTitle)}</td>
            <td><button type="button" onclick="openAttachmentRecordV05('${escapeV05(row.meetingId)}')">Open</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function getAttachmentIndexRowsV05() {
  const records = typeof window.getRecords === "function" ? window.getRecords() : [];
  return records
    .flatMap((record) => (record.attachments || []).map((attachment) => ({
      meetingId: record.id,
      meetingNumber: record.meetingNumber,
      meetingTitle: `#${record.meetingNumber || "?"} ${record.title || "Untitled Meeting"}`,
      label: attachment.label || attachment.name || "",
      type: attachment.type || "Other",
      location: attachment.location || "",
      date: attachment.date || record.date || "",
      addedBy: attachment.addedBy || "",
      notes: attachment.notes || ""
    })))
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
}

function openAttachmentRecordV05(recordId) {
  if (typeof window.loadRecordForEditing === "function") window.loadRecordForEditing(recordId);
}

function exportCurrentAttachmentsCsvV05() {
  const meeting = typeof window.collectMeetingData === "function" ? window.collectMeetingData({ forceNewId: true }) : { attachments: [] };
  const rows = (meeting.attachments || []).map((attachment) => [
    meeting.meetingNumber || "Draft",
    meeting.title || "Untitled Meeting",
    attachment.label,
    attachment.type,
    attachment.location,
    attachment.date,
    attachment.addedBy,
    attachment.notes
  ]);
  exportCsvV05(["Meeting Number", "Meeting Title", "Reference", "Type", "Location", "Date", "Added By", "Notes"], rows, `methodz-current-attachments-${todayV05()}.csv`);
}

function exportAttachmentIndexCsvV05() {
  const rows = getAttachmentIndexRowsV05().map((row) => [
    row.meetingNumber,
    row.meetingTitle,
    row.label,
    row.type,
    row.location,
    row.date,
    row.addedBy,
    row.notes
  ]);
  exportCsvV05(["Meeting Number", "Meeting Title", "Reference", "Type", "Location", "Date", "Added By", "Notes"], rows, `methodz-attachment-index-${todayV05()}.csv`);
}

function formatAttachmentsForTextV05(attachments) {
  if (!attachments.length) return "No attachment references listed.";
  return attachments
    .map((attachment) => `- ${attachment.label || "Untitled reference"} | Type: ${attachment.type || "Other"} | Location: ${attachment.location || "Location needed"} | Date: ${attachment.date || "No date"} | Added By: ${attachment.addedBy || "Not listed"} | Notes: ${attachment.notes || "None"}`)
    .join("\n");
}

function renderAttachmentMinutesSectionV05(attachments) {
  const rows = (attachments || []).map((attachment) => [
    attachment.label || "Untitled reference",
    attachment.type || "Other",
    attachment.location || "Location needed",
    attachment.date || "No date",
    attachment.addedBy || "Not listed",
    attachment.notes || ""
  ]);

  return `
    <section>
      <h2>Attachment References</h2>
      ${renderSimpleTableV05(["Reference", "Type", "Location", "Date", "Added By", "Notes"], rows, "No attachment references listed.")}
    </section>
  `;
}

function getAttachmentTypesV05() {
  return window.METHODZ_MEETING_CONFIG?.attachmentTypes || ["Photo", "Quote", "Invoice", "Drawing", "Logo / Brand Asset", "Install Note", "Customer Communication", "Other"];
}

function renderSimpleTableV05(headers, rows, emptyText) {
  if (!rows.length) return `<p>${escapeV05(emptyText)}</p>`;
  return `
    <table>
      <thead><tr>${headers.map((header) => `<th>${escapeV05(header)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${safeMultilineV05(cell || "")}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}

function exportCsvV05(headers, rows, filename) {
  const csv = [headers, ...rows].map((row) => row.map(csvCellV05).join(",")).join("\n");
  if (typeof window.downloadBlob === "function") {
    window.downloadBlob(csv, filename, "text/csv");
  }
}

function optionV05(value, selectedValue) {
  const selected = value === selectedValue ? " selected" : "";
  return `<option value="${escapeV05(value)}"${selected}>${escapeV05(value)}</option>`;
}

function readScopedV05(root, selector) {
  const element = root.querySelector(selector);
  return element ? element.value.trim() : "";
}

function csvCellV05(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function safeMultilineV05(value) {
  return escapeV05(value).replaceAll("\n", "<br>");
}

function escapeV05(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayV05() {
  return new Date().toISOString().slice(0, 10);
}

function scheduleDraftV05() {
  if (typeof window.scheduleDraftSave === "function") window.scheduleDraftSave();
}
