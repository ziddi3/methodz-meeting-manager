/* Methodz Meeting Manager v0.4 saved-record tools. */

let pendingImportRecordsV04 = null;

window.addEventListener("DOMContentLoaded", initializeV04Records);

function initializeV04Records() {
  installImportPreviewPanelV04();
  installOpenTaskDashboardV04();
  installArchiveFiltersV04();
  patchSavedRecordToolsV04();
  if (typeof window.loadSavedRecords === "function") window.loadSavedRecords();
  refreshOpenTaskDashboardV04();
}

function patchSavedRecordToolsV04() {
  if (!window.__methodzV04CardsPatched && typeof window.createRecordCard === "function") {
    const originalCreateRecordCard = window.createRecordCard;
    window.createRecordCard = function createRecordCardV04(record) {
      const card = originalCreateRecordCard(record);
      const row = card.querySelector(".button-row");
      if (row && !row.querySelector(".details-button")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "details-button";
        button.textContent = "Details";
        button.addEventListener("click", () => openSavedRecordDetailsV04(record.id));
        row.prepend(button);
      }
      return card;
    };
    window.__methodzV04CardsPatched = true;
  }

  if (!window.__methodzV04LoadPatched && typeof window.loadSavedRecords === "function") {
    const originalLoadSavedRecords = window.loadSavedRecords;
    window.loadSavedRecords = function loadSavedRecordsV04() {
      originalLoadSavedRecords();
      applyArchiveFiltersV04();
      refreshOpenTaskDashboardV04();
    };
    window.__methodzV04LoadPatched = true;
  }

  if (!window.__methodzV04ImportPatched && typeof window.importRecords === "function") {
    window.importRecords = previewImportRecordsV04;
    window.__methodzV04ImportPatched = true;
  }

  const recordSearch = document.getElementById("recordSearch");
  if (recordSearch && !recordSearch.dataset.v04FilterBound) {
    recordSearch.addEventListener("input", () => setTimeout(applyArchiveFiltersV04, 0));
    recordSearch.dataset.v04FilterBound = "true";
  }
}

function installImportPreviewPanelV04() {
  const input = document.getElementById("importRecordsFile");
  if (!input || document.getElementById("importPreviewPanel")) return;

  const panel = document.createElement("div");
  panel.id = "importPreviewPanel";
  panel.className = "import-preview-panel";
  panel.hidden = true;
  input.insertAdjacentElement("afterend", panel);
}

function previewImportRecordsV04(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incomingRecords = Array.isArray(parsed) ? parsed : parsed.records;
      if (!Array.isArray(incomingRecords)) {
        alert("Import file must contain an array of meeting records or a records array.");
        return;
      }

      const normalized = [];
      let skipped = 0;
      incomingRecords.forEach((record) => {
        if (!record || typeof record !== "object") {
          skipped++;
          return;
        }
        normalized.push(typeof window.normalizeImportedRecord === "function" ? window.normalizeImportedRecord(record) : normalizeRecordV04(record));
      });

      pendingImportRecordsV04 = normalized;
      renderImportPreviewV04(file.name, normalized, skipped);
    } catch (error) {
      console.error(error);
      alert("Could not preview that JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file);
}

function renderImportPreviewV04(fileName, records, skipped) {
  const panel = document.getElementById("importPreviewPanel");
  if (!panel) return;

  const existing = typeof window.getRecords === "function" ? window.getRecords() : [];
  const existingIds = new Set(existing.map((record) => record.id));
  const updates = records.filter((record) => existingIds.has(record.id)).length;
  const additions = records.length - updates;
  const sampleRows = records.slice(0, 6).map((record) => `
    <tr>
      <td>${escapeRecordsV04(record.meetingNumber || "?")}</td>
      <td>${escapeRecordsV04(record.title || "Untitled Meeting")}</td>
      <td>${escapeRecordsV04(record.date || "No date")}</td>
      <td>${existingIds.has(record.id) ? "Update" : "New"}</td>
    </tr>
  `).join("");

  panel.hidden = false;
  panel.innerHTML = `
    <div class="section-subheader">
      <div>
        <h3>Import Preview</h3>
        <p class="helper-text">${escapeRecordsV04(fileName)} is staged for review. Nothing is merged until you confirm.</p>
      </div>
      <div class="button-row">
        <button type="button" onclick="mergePendingImportV04()">Merge Import</button>
        <button type="button" onclick="cancelImportPreviewV04()">Cancel</button>
      </div>
    </div>
    <div class="metric-grid">
      <div><strong>${records.length}</strong><span>valid</span></div>
      <div><strong>${additions}</strong><span>new</span></div>
      <div><strong>${updates}</strong><span>updates</span></div>
      <div><strong>${skipped}</strong><span>skipped</span></div>
    </div>
    <table class="compact-table">
      <thead><tr><th>#</th><th>Title</th><th>Date</th><th>Action</th></tr></thead>
      <tbody>${sampleRows || `<tr><td colspan="4">No valid records found.</td></tr>`}</tbody>
    </table>
  `;
}

function mergePendingImportV04() {
  if (!pendingImportRecordsV04?.length) {
    alert("No import preview is waiting to merge.");
    return;
  }

  const records = typeof window.getRecords === "function" ? window.getRecords() : [];
  const byId = new Map(records.map((record) => [record.id, record]));
  pendingImportRecordsV04.forEach((record) => byId.set(record.id, record));

  if (typeof window.setRecords === "function") window.setRecords(Array.from(byId.values()));
  if (typeof window.loadSavedRecords === "function") window.loadSavedRecords();
  if (typeof window.updateMeetingNumberLabel === "function") window.updateMeetingNumberLabel();

  const count = pendingImportRecordsV04.length;
  pendingImportRecordsV04 = null;
  cancelImportPreviewV04(false);
  alert(`Merged ${count} record(s).`);
}

function cancelImportPreviewV04(showAlert = true) {
  pendingImportRecordsV04 = null;
  const panel = document.getElementById("importPreviewPanel");
  if (panel) {
    panel.hidden = true;
    panel.innerHTML = "";
  }
  if (showAlert) alert("Import cancelled. No records were changed.");
}

function installOpenTaskDashboardV04() {
  const savedRecords = document.getElementById("savedRecords");
  const savedCard = savedRecords?.closest(".card");
  if (!savedCard || document.getElementById("openTaskDashboard")) return;

  const dashboard = document.createElement("section");
  dashboard.id = "openTaskDashboard";
  dashboard.className = "card task-dashboard";
  dashboard.innerHTML = `
    <div class="section-subheader">
      <div>
        <h2>Open Task Dashboard</h2>
        <p class="helper-text">Cross-meeting view of unresolved follow-up work.</p>
      </div>
      <div class="button-row">
        <button type="button" onclick="refreshOpenTaskDashboardV04()">Refresh</button>
        <button type="button" onclick="exportOpenTasksCsvV04()">Export CSV</button>
      </div>
    </div>
    <div id="openTaskDashboardBody"></div>
  `;
  savedCard.insertAdjacentElement("beforebegin", dashboard);
}

function refreshOpenTaskDashboardV04() {
  const body = document.getElementById("openTaskDashboardBody");
  if (!body) return;

  const rows = getOpenTaskRowsV04();
  if (!rows.length) {
    body.innerHTML = `<p>No open tasks found in saved records.</p>`;
    return;
  }

  body.innerHTML = `
    <div class="metric-grid">
      <div><strong>${rows.length}</strong><span>open tasks</span></div>
      <div><strong>${rows.filter((row) => row.priority === "Critical").length}</strong><span>critical</span></div>
      <div><strong>${rows.filter((row) => row.isOverdue).length}</strong><span>overdue</span></div>
      <div><strong>${new Set(rows.map((row) => row.assignedTo).filter(Boolean)).size}</strong><span>assigned people</span></div>
    </div>
    <table class="compact-table">
      <thead><tr><th>Task</th><th>Assigned To</th><th>Priority</th><th>Due</th><th>Meeting</th><th></th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr class="${row.isOverdue ? "is-overdue" : ""}">
            <td>${escapeRecordsV04(row.task)}</td>
            <td>${escapeRecordsV04(row.assignedTo || "Unassigned")}</td>
            <td>${escapeRecordsV04(row.priority || "Normal")}</td>
            <td>${escapeRecordsV04(row.due || "No due date")}</td>
            <td>${escapeRecordsV04(row.meetingTitle)}</td>
            <td><button type="button" onclick="openTaskRecordV04('${escapeRecordsV04(row.recordId)}')">Open</button></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function getOpenTaskRowsV04() {
  const today = new Date().toISOString().slice(0, 10);
  const records = typeof window.getRecords === "function" ? window.getRecords() : [];
  return records
    .flatMap((record) => (record.tasks || [])
      .filter((task) => task.task && task.status !== "Completed")
      .map((task) => ({
        recordId: record.id,
        meetingNumber: record.meetingNumber,
        meetingTitle: record.title || "Untitled Meeting",
        task: task.task,
        assignedTo: task.assignedTo,
        priority: task.priority || "Normal",
        due: task.due || "",
        status: task.status || "Pending",
        isOverdue: Boolean(task.due && task.due < today)
      })))
    .sort((a, b) => (a.due || "9999-99-99").localeCompare(b.due || "9999-99-99"));
}

function openTaskRecordV04(recordId) {
  if (typeof window.loadRecordForEditing === "function") window.loadRecordForEditing(recordId);
}

function exportOpenTasksCsvV04() {
  const rows = getOpenTaskRowsV04();
  const headers = ["Meeting Number", "Meeting Title", "Task", "Assigned To", "Priority", "Due", "Status"];
  const csv = [headers, ...rows.map((row) => [row.meetingNumber, row.meetingTitle, row.task, row.assignedTo, row.priority, row.due, row.status])]
    .map((row) => row.map(csvCellRecordsV04).join(","))
    .join("\n");
  downloadBlob(csv, `methodz-open-tasks-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv");
}

function installArchiveFiltersV04() {
  const toolbar = document.querySelector(".records-toolbar");
  if (!toolbar || document.getElementById("archiveFilterPanel")) return;

  const panel = document.createElement("div");
  panel.id = "archiveFilterPanel";
  panel.className = "archive-filter-panel";
  panel.innerHTML = `
    <div class="form-grid">
      <div>
        <label for="archiveStatusFilter">Filter by Status</label>
        <select id="archiveStatusFilter">
          <option value="">All statuses</option>
          ${(window.METHODZ_MEETING_CONFIG?.meetingStatuses || []).map((status) => `<option>${escapeRecordsV04(status)}</option>`).join("")}
        </select>
      </div>
      <div>
        <label for="archiveOrganizationFilter">Filter by Organization / Representative</label>
        <select id="archiveOrganizationFilter">
          <option value="">All organizations</option>
          ${(window.METHODZ_MEETING_CONFIG?.organizations || []).map((organization) => `<option>${escapeRecordsV04(organization)}</option>`).join("")}
        </select>
      </div>
    </div>
    <button type="button" onclick="clearArchiveFiltersV04()">Clear Archive Filters</button>
    <p class="helper-text" id="archiveFilterSummary">Showing all saved records.</p>
  `;

  document.getElementById("storageStats")?.insertAdjacentElement("afterend", panel);
  panel.addEventListener("input", applyArchiveFiltersV04);
  panel.addEventListener("change", applyArchiveFiltersV04);
}

function applyArchiveFiltersV04() {
  const status = document.getElementById("archiveStatusFilter")?.value || "";
  const organization = document.getElementById("archiveOrganizationFilter")?.value || "";
  const records = typeof window.getRecords === "function" ? window.getRecords() : [];
  const cards = Array.from(document.querySelectorAll(".saved-record"));
  let visible = 0;

  cards.forEach((card) => {
    const record = records.find((item) => item.id === card.dataset.recordId);
    const show = Boolean(record)
      && (!status || record.status === status)
      && (!organization || (record.organizations || []).includes(organization));
    card.hidden = !show;
    if (show) visible++;
  });

  const summary = document.getElementById("archiveFilterSummary");
  if (summary) summary.textContent = `Showing ${visible} of ${cards.length} saved record card(s) after archive filters.`;
}

function clearArchiveFiltersV04() {
  const status = document.getElementById("archiveStatusFilter");
  const organization = document.getElementById("archiveOrganizationFilter");
  if (status) status.value = "";
  if (organization) organization.value = "";
  applyArchiveFiltersV04();
}

function openSavedRecordDetailsV04(recordId) {
  const record = (typeof window.getRecords === "function" ? window.getRecords() : []).find((item) => item.id === recordId);
  if (!record) return;

  let panel = document.getElementById("recordDetailPanel");
  if (!panel) {
    panel = document.createElement("section");
    panel.id = "recordDetailPanel";
    panel.className = "card record-detail-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2 id="recordDetailTitle">Saved Record Details</h2>
          <p class="helper-text">Readable saved-record view for review before printing, exporting, or editing.</p>
        </div>
        <button type="button" onclick="closeSavedRecordDetailsV04()">Close Details</button>
      </div>
      <div id="recordDetailBody"></div>
    `;
    document.getElementById("savedRecords")?.closest(".card")?.insertAdjacentElement("afterend", panel);
  }

  const enriched = {
    ...record,
    decisionsList: record.decisionsList || [],
    validation: record.validation?.length ? record.validation : (typeof window.buildValidationChecklist === "function" ? window.buildValidationChecklist(record) : [])
  };

  panel.hidden = false;
  document.getElementById("recordDetailTitle").textContent = `Saved Record Details: Meeting #${record.meetingNumber || "?"}`;
  document.getElementById("recordDetailBody").innerHTML = typeof window.renderMinutesHtml === "function"
    ? window.renderMinutesHtml(enriched, { includeDocumentShell: false })
    : `<pre>${escapeRecordsV04(JSON.stringify(enriched, null, 2))}</pre>`;
  panel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function closeSavedRecordDetailsV04() {
  const panel = document.getElementById("recordDetailPanel");
  if (!panel) return;
  panel.hidden = true;
  document.getElementById("recordDetailBody").innerHTML = "";
}

function normalizeRecordV04(record) {
  const now = new Date().toISOString();
  return {
    id: record.id || `meeting-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    schemaVersion: record.schemaVersion || "0.4.0",
    meetingNumber: record.meetingNumber || "IMP",
    title: record.title || "Imported Meeting",
    status: record.status || "Archived",
    date: record.date || "",
    location: record.location || "",
    facilitator: record.facilitator || "",
    organizations: Array.isArray(record.organizations) ? record.organizations : [],
    attendees: Array.isArray(record.attendees) ? record.attendees : [],
    agenda: Array.isArray(record.agenda) ? record.agenda : [],
    notes: record.notes || "",
    decisions: record.decisions || "",
    decisionsList: Array.isArray(record.decisionsList) ? record.decisionsList : [],
    tasks: Array.isArray(record.tasks) ? record.tasks : [],
    summary: record.summary || "",
    validation: Array.isArray(record.validation) ? record.validation : [],
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
    savedAt: record.savedAt || now
  };
}

function csvCellRecordsV04(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function escapeRecordsV04(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
