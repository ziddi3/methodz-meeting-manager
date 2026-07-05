const CONFIG = window.METHODZ_MEETING_CONFIG || {
  schemaVersion: "0.2.0",
  storageKeys: {
    records: "methodzMeetingRecords",
    draft: "methodzMeetingDraft"
  },
  brand: {
    appName: "Methodz Meeting Manager",
    subtitle: "Partnership Records",
    note: "Methodz is used here as a shared brand identity and operating ecosystem."
  },
  logos: [],
  organizations: ["Canadian Soft Water Corporation", "Method HVAC Inc.", "Sole Proprietor / Partner", "Guest / Other"],
  attendanceTypes: ["In Person", "Remote", "Phone"],
  priorities: ["Normal", "Low", "High", "Critical"],
  taskStatuses: ["Pending", "In Progress", "Completed"],
  meetingStatuses: ["Scheduled", "In Progress", "Completed", "Archived"],
  agendaGroups: []
};

const LEGACY_STORAGE_KEY = "meetingRecords";
let attendeeCount = 0;
let taskCount = 0;
let autoSaveTimer = null;

window.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
  migrateLegacyRecords();
  applyBranding();
  renderLogos();
  renderMeetingStatusOptions();
  renderOrganizationOptions();
  renderAgendaChecklist();
  bindEvents();
  prepareBlankMeeting();
  loadDraftIfAvailable();
  loadSavedRecords();
  updateMeetingNumberLabel();
  updateStatusPill();
  updateStorageStats();
}

function applyBranding() {
  setText("appTitle", CONFIG.brand.appName);
  setText("appSubtitle", CONFIG.brand.subtitle);
}

function renderLogos() {
  const logoRow = document.getElementById("logoRow");
  if (!logoRow) return;

  logoRow.innerHTML = "";
  CONFIG.logos.forEach((logo) => {
    const img = document.createElement("img");
    img.id = logo.id;
    img.className = "company-logo";
    img.src = logo.path;
    img.alt = logo.alt;
    img.addEventListener("error", () => {
      img.replaceWith(createLogoFallback(logo.fallback));
    });
    logoRow.appendChild(img);
  });
}

function renderMeetingStatusOptions() {
  const select = document.getElementById("meetingStatus");
  if (!select) return;

  select.innerHTML = CONFIG.meetingStatuses
    .map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`)
    .join("");
}

function renderOrganizationOptions() {
  const container = document.getElementById("organizationList");
  if (!container) return;

  container.innerHTML = CONFIG.organizations
    .map((organization) => {
      return `
        <label>
          <input type="checkbox" class="company-present" value="${escapeHtml(organization)}" />
          ${escapeHtml(organization)}
        </label>
      `;
    })
    .join("");
}

function renderAgendaChecklist() {
  const container = document.getElementById("agendaList");
  if (!container) return;

  container.innerHTML = CONFIG.agendaGroups
    .map((group) => {
      const items = group.items
        .map((item) => {
          return `
            <label>
              <input type="checkbox" data-group="${escapeHtml(group.name)}" data-item="${escapeHtml(item)}" />
              ${escapeHtml(item)}
            </label>
          `;
        })
        .join("");

      return `<h3>${escapeHtml(group.name)}</h3>${items}`;
    })
    .join("");
}

function bindEvents() {
  document.getElementById("meetingStatus").addEventListener("change", updateStatusPill);
  document.getElementById("recordSearch").addEventListener("input", loadSavedRecords);

  document.querySelector(".app-shell").addEventListener("input", scheduleDraftSave);
  document.querySelector(".app-shell").addEventListener("change", scheduleDraftSave);
}

function prepareBlankMeeting() {
  document.getElementById("meetingDate").valueAsDate = new Date();
  addAttendee();
  addTask();
}

function createLogoFallback(text) {
  const div = document.createElement("div");
  div.className = "logo-fallback";
  div.textContent = text;
  return div;
}

function addAttendee(data = {}) {
  attendeeCount++;
  const container = document.getElementById("attendeeList");
  const div = document.createElement("div");
  div.className = "attendee";

  div.innerHTML = `
    <div class="item-header">
      <h3>Attendee ${attendeeCount}</h3>
      <button type="button" class="small-danger" onclick="removeBlock(this)">Remove</button>
    </div>

    <label>Name</label>
    <input type="text" class="attendee-name" placeholder="Full name" value="${escapeHtml(data.name || "")}">

    <label>Organization / Role</label>
    <input type="text" class="attendee-role" placeholder="CSW, Method HVAC, partner, guest..." value="${escapeHtml(data.organizationRole || "")}">

    <label>Attendance Type</label>
    <select class="attendee-type">
      ${CONFIG.attendanceTypes.map((type) => optionHtml(type, data.attendanceType)).join("")}
    </select>

    <label>Digital Signature</label>
    <input type="text" class="attendee-signature" placeholder="Type full legal name as signature" value="${escapeHtml(data.signature || "")}">
  `;

  container.appendChild(div);
}

function addTask(data = {}) {
  taskCount++;
  const container = document.getElementById("taskList");
  const div = document.createElement("div");
  div.className = "task";

  div.innerHTML = `
    <div class="item-header">
      <h3>Task ${taskCount}</h3>
      <button type="button" class="small-danger" onclick="removeBlock(this)">Remove</button>
    </div>

    <label>Task / Follow-Up</label>
    <input type="text" class="task-name" placeholder="What needs to be done?" value="${escapeHtml(data.task || "")}">

    <label>Assigned To</label>
    <input type="text" class="task-assigned" placeholder="Who is handling this?" value="${escapeHtml(data.assignedTo || "")}">

    <label>Priority</label>
    <select class="task-priority">
      ${CONFIG.priorities.map((priority) => optionHtml(priority, data.priority)).join("")}
    </select>

    <label>Target Date</label>
    <input type="date" class="task-due" value="${escapeHtml(data.due || "")}">

    <label>Progress</label>
    <select class="task-status">
      ${CONFIG.taskStatuses.map((status) => optionHtml(status, data.status)).join("")}
    </select>
  `;

  container.appendChild(div);
}

function optionHtml(value, selectedValue) {
  const selected = value === selectedValue ? " selected" : "";
  return `<option value="${escapeHtml(value)}"${selected}>${escapeHtml(value)}</option>`;
}

function removeBlock(button) {
  const block = button.closest(".attendee, .task");
  if (!block) return;
  block.remove();
  scheduleDraftSave();
}

function getRecords() {
  try {
    const records = JSON.parse(localStorage.getItem(CONFIG.storageKeys.records)) || [];
    return Array.isArray(records) ? records : [];
  } catch (error) {
    console.error("Unable to read saved records", error);
    return [];
  }
}

function setRecords(records) {
  localStorage.setItem(CONFIG.storageKeys.records, JSON.stringify(records));
  updateStorageStats();
}

function migrateLegacyRecords() {
  const current = localStorage.getItem(CONFIG.storageKeys.records);
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);

  if (!current && legacy) {
    localStorage.setItem(CONFIG.storageKeys.records, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

function collectMeetingData(options = {}) {
  const records = getRecords();
  const editingRecordId = document.getElementById("editingRecordId").value;
  const existingRecord = records.find((record) => record.id === editingRecordId);
  const isSavedEdit = Boolean(existingRecord && !options.forceNewId);
  const meetingNumber = isSavedEdit
    ? existingRecord.meetingNumber
    : String(records.length + 1).padStart(3, "0");

  const organizations = [];
  document.querySelectorAll(".company-present").forEach((box) => {
    if (box.checked) organizations.push(box.value);
  });

  const attendees = [];
  document.querySelectorAll(".attendee").forEach((item) => {
    const name = readValue(item, ".attendee-name");
    const role = readValue(item, ".attendee-role");
    const signature = readValue(item, ".attendee-signature");

    if (!name && !role && !signature && !options.keepEmptyRows) return;

    attendees.push({
      name,
      organizationRole: role,
      attendanceType: readValue(item, ".attendee-type"),
      signature,
      signedAt: signature ? new Date().toISOString() : ""
    });
  });

  const agenda = [];
  document.querySelectorAll("#agendaList input[type='checkbox']").forEach((box) => {
    agenda.push({
      group: box.dataset.group || "General",
      item: box.dataset.item || box.parentElement.innerText.trim(),
      completed: box.checked
    });
  });

  const tasks = [];
  document.querySelectorAll(".task").forEach((item) => {
    const task = readValue(item, ".task-name");
    const assignedTo = readValue(item, ".task-assigned");

    if (!task && !assignedTo && !options.keepEmptyRows) return;

    tasks.push({
      task,
      assignedTo,
      priority: readValue(item, ".task-priority"),
      due: readValue(item, ".task-due"),
      status: readValue(item, ".task-status")
    });
  });

  const now = new Date().toISOString();

  return {
    id: isSavedEdit ? existingRecord.id : `meeting-${Date.now()}`,
    schemaVersion: CONFIG.schemaVersion,
    meetingNumber,
    title: readValue(document, "#meetingTitle"),
    status: readValue(document, "#meetingStatus"),
    date: readValue(document, "#meetingDate"),
    location: readValue(document, "#meetingLocation"),
    facilitator: readValue(document, "#meetingChair"),
    organizations,
    attendees,
    agenda,
    notes: readValue(document, "#notes"),
    decisions: readValue(document, "#decisions"),
    tasks,
    summary: readValue(document, "#summary"),
    createdAt: existingRecord?.createdAt || now,
    updatedAt: now,
    savedAt: existingRecord?.savedAt || now
  };
}

function validateMeeting(meeting) {
  if (!meeting.title) return "Please enter a meeting title.";
  if (!meeting.date) return "Please choose a meeting date.";
  return null;
}

function saveMeeting() {
  const meeting = collectMeetingData();
  const error = validateMeeting(meeting);

  if (error) {
    alert(error);
    return;
  }

  const records = getRecords();
  const recordIndex = records.findIndex((record) => record.id === meeting.id);

  if (recordIndex >= 0) {
    records[recordIndex] = { ...records[recordIndex], ...meeting, updatedAt: new Date().toISOString() };
  } else {
    records.push(meeting);
    document.getElementById("editingRecordId").value = meeting.id;
  }

  setRecords(records);
  clearStoredDraft(false);
  setDraftStatus("Saved");
  loadSavedRecords();
  updateMeetingNumberLabel();
  alert("Meeting record saved.");
}

function loadSavedRecords() {
  const container = document.getElementById("savedRecords");
  const query = readValue(document, "#recordSearch").toLowerCase();
  container.innerHTML = "";

  const records = getRecords();
  const filteredRecords = records.filter((record) => searchableRecordText(record).includes(query));

  if (records.length === 0) {
    container.innerHTML = "<p>No saved records yet.</p>";
    updateStorageStats();
    return;
  }

  if (filteredRecords.length === 0) {
    container.innerHTML = "<p>No records match that search.</p>";
    updateStorageStats();
    return;
  }

  filteredRecords
    .slice()
    .sort((a, b) => (b.updatedAt || b.savedAt || "").localeCompare(a.updatedAt || a.savedAt || ""))
    .forEach((record) => container.appendChild(createRecordCard(record)));

  updateStorageStats();
}

function createRecordCard(record) {
  const div = document.createElement("div");
  div.className = "saved-record";
  div.dataset.recordId = record.id;

  const completedTasks = (record.tasks || []).filter((task) => task.status === "Completed").length;
  const totalTasks = (record.tasks || []).length;
  const completedAgenda = (record.agenda || []).filter((agenda) => agenda.completed).length;
  const totalAgenda = (record.agenda || []).length;

  div.innerHTML = `
    <div class="saved-record-header">
      <div>
        <strong>Meeting #${escapeHtml(record.meetingNumber || "?")}: ${escapeHtml(record.title || "Untitled Meeting")}</strong>
        <p>${escapeHtml(record.date || "No date")} • ${escapeHtml(record.status || "No status")} • Updated ${formatDateTime(record.updatedAt || record.savedAt)}</p>
      </div>
      <span class="record-badge">${completedTasks}/${totalTasks} tasks</span>
    </div>
    <p class="record-summary">Agenda: ${completedAgenda}/${totalAgenda} complete. Organizations: ${escapeHtml((record.organizations || []).join(", ") || "None selected")}.</p>
    <div class="button-row">
      <button type="button" onclick="loadRecordForEditing('${escapeHtml(record.id)}')">Open / Edit</button>
      <button type="button" onclick="viewRecord('${escapeHtml(record.id)}')">View JSON</button>
      <button type="button" onclick="downloadSavedRecord('${escapeHtml(record.id)}')">Download</button>
      <button type="button" onclick="deleteRecord('${escapeHtml(record.id)}')">Delete</button>
    </div>
  `;

  return div;
}

function loadRecordForEditing(recordId) {
  const record = getRecords().find((item) => item.id === recordId);
  if (!record) {
    alert("Record not found.");
    return;
  }

  populateForm(record, { editing: true });
  setDraftStatus(`Editing Meeting #${record.meetingNumber}`);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function populateForm(record, options = {}) {
  document.getElementById("editingRecordId").value = options.editing ? record.id : "";
  document.getElementById("meetingTitle").value = record.title || "";
  document.getElementById("meetingStatus").value = record.status || "Scheduled";
  document.getElementById("meetingDate").value = record.date || "";
  document.getElementById("meetingLocation").value = record.location || "";
  document.getElementById("meetingChair").value = record.facilitator || "";
  document.getElementById("notes").value = record.notes || "";
  document.getElementById("decisions").value = record.decisions || "";
  document.getElementById("summary").value = record.summary || "";

  document.querySelectorAll(".company-present").forEach((box) => {
    box.checked = (record.organizations || []).includes(box.value);
  });

  document.querySelectorAll("#agendaList input[type='checkbox']").forEach((box) => {
    const match = (record.agenda || []).find((agenda) => agenda.item === box.dataset.item);
    box.checked = Boolean(match?.completed);
  });

  document.getElementById("attendeeList").innerHTML = "";
  document.getElementById("taskList").innerHTML = "";
  attendeeCount = 0;
  taskCount = 0;

  const attendees = record.attendees?.length ? record.attendees : [{}];
  attendees.forEach((attendee) => addAttendee(attendee));

  const tasks = record.tasks?.length ? record.tasks : [{}];
  tasks.forEach((task) => addTask(task));

  updateStatusPill();
  updateMeetingNumberLabel(record.meetingNumber);
}

function viewRecord(recordId) {
  const records = getRecords();
  const record = records.find((item) => item.id === recordId);
  const container = document.querySelector(`[data-record-id="${cssEscape(recordId)}"]`);
  if (!record || !container) return;

  const existing = container.querySelector("pre");
  if (existing) {
    existing.remove();
    return;
  }

  const pre = document.createElement("pre");
  pre.textContent = JSON.stringify(record, null, 2);
  container.appendChild(pre);
}

function deleteRecord(recordId) {
  const confirmDelete = confirm("Delete this saved meeting record?");
  if (!confirmDelete) return;

  const records = getRecords().filter((record) => record.id !== recordId);
  setRecords(records);

  if (document.getElementById("editingRecordId").value === recordId) {
    document.getElementById("editingRecordId").value = "";
  }

  loadSavedRecords();
  updateMeetingNumberLabel();
}

function printMeeting() {
  window.print();
}

function downloadMeetingText() {
  const meeting = collectMeetingData({ forceNewId: true });
  const text = createPlainTextMeeting(meeting);
  downloadBlob(text, `meeting-record-${meeting.date || "undated"}.txt`, "text/plain");
}

function downloadMeetingJson() {
  const meeting = collectMeetingData({ forceNewId: true });
  downloadBlob(JSON.stringify(meeting, null, 2), `meeting-record-${meeting.date || "undated"}.json`, "application/json");
}

function downloadSavedRecord(recordId) {
  const record = getRecords().find((item) => item.id === recordId);
  if (!record) return;
  downloadBlob(JSON.stringify(record, null, 2), `meeting-${record.meetingNumber || record.id}.json`, "application/json");
}

function exportAllRecords() {
  const records = getRecords();
  const payload = {
    exportedAt: new Date().toISOString(),
    appName: CONFIG.brand.appName,
    schemaVersion: CONFIG.schemaVersion,
    records
  };

  downloadBlob(JSON.stringify(payload, null, 2), `methodz-meeting-records-${todayString()}.json`, "application/json");
}

function importRecords(event) {
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

      const records = getRecords();
      const byId = new Map(records.map((record) => [record.id, record]));

      incomingRecords.forEach((record) => {
        const safeRecord = normalizeImportedRecord(record);
        byId.set(safeRecord.id, safeRecord);
      });

      setRecords(Array.from(byId.values()));
      loadSavedRecords();
      updateMeetingNumberLabel();
      alert(`Imported ${incomingRecords.length} record(s).`);
    } catch (error) {
      console.error(error);
      alert("Could not import that JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file);
}

function normalizeImportedRecord(record) {
  const now = new Date().toISOString();
  return {
    id: record.id || `meeting-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    schemaVersion: record.schemaVersion || CONFIG.schemaVersion,
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
    tasks: Array.isArray(record.tasks) ? record.tasks : [],
    summary: record.summary || "",
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
    savedAt: record.savedAt || now
  };
}

function clearMeeting() {
  const confirmClear = confirm("Clear the current meeting form? Save first if needed.");
  if (!confirmClear) return;
  resetForm();
  scheduleDraftSave();
}

function startNewMeeting() {
  const confirmNew = confirm("Start a new blank meeting? Unsaved changes in the current form will be cleared.");
  if (!confirmNew) return;
  resetForm();
  clearStoredDraft(false);
  setDraftStatus("New meeting ready");
}

function resetForm() {
  document.getElementById("editingRecordId").value = "";
  document.getElementById("meetingTitle").value = "";
  document.getElementById("meetingStatus").value = "Scheduled";
  document.getElementById("meetingDate").valueAsDate = new Date();
  document.getElementById("meetingLocation").value = "";
  document.getElementById("meetingChair").value = "";
  document.getElementById("notes").value = "";
  document.getElementById("decisions").value = "";
  document.getElementById("summary").value = "";

  document.getElementById("attendeeList").innerHTML = "";
  document.getElementById("taskList").innerHTML = "";

  document.querySelectorAll("#agendaList input[type='checkbox'], .company-present").forEach((box) => {
    box.checked = false;
  });

  attendeeCount = 0;
  taskCount = 0;

  addAttendee();
  addTask();
  updateStatusPill();
  updateMeetingNumberLabel();
}

function scheduleDraftSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(saveDraft, 350);
}

function saveDraft() {
  const draft = collectMeetingData({ keepEmptyRows: true, forceNewId: true });
  localStorage.setItem(CONFIG.storageKeys.draft, JSON.stringify({ ...draft, draftSavedAt: new Date().toISOString() }));
  setDraftStatus("Draft auto-saved");
}

function loadDraftIfAvailable() {
  try {
    const draft = JSON.parse(localStorage.getItem(CONFIG.storageKeys.draft));
    if (!draft) return;

    const hasMeaningfulDraft = draft.title || draft.notes || draft.decisions || draft.summary || draft.attendees?.some((person) => person.name || person.signature);
    if (!hasMeaningfulDraft) return;

    populateForm(draft, { editing: false });
    setDraftStatus(`Draft restored from ${formatDateTime(draft.draftSavedAt)}`);
  } catch (error) {
    console.error("Unable to load draft", error);
  }
}

function clearDraft() {
  clearStoredDraft(true);
}

function clearStoredDraft(showAlert = true) {
  localStorage.removeItem(CONFIG.storageKeys.draft);
  setDraftStatus("Draft cleared");
  if (showAlert) alert("Draft cleared. Saved meeting records were not changed.");
}

function updateMeetingNumberLabel(forcedNumber) {
  const editingRecordId = document.getElementById("editingRecordId").value;
  const records = getRecords();
  const editingRecord = records.find((record) => record.id === editingRecordId);
  const number = forcedNumber || editingRecord?.meetingNumber || String(records.length + 1).padStart(3, "0");
  document.getElementById("meetingNumberLabel").textContent = `Meeting #${number}`;
}

function updateStatusPill() {
  const status = document.getElementById("meetingStatus").value;
  document.getElementById("statusPill").textContent = status;
}

function updateStorageStats() {
  const records = getRecords();
  const stats = document.getElementById("storageStats");
  if (!stats) return;

  const bytes = new Blob([JSON.stringify(records)]).size;
  stats.textContent = `${records.length} saved record(s). Local storage used by records: ${formatBytes(bytes)}.`;
}

function setDraftStatus(text) {
  setText("draftStatus", text);
}

function searchableRecordText(record) {
  return JSON.stringify(record).toLowerCase();
}

function createPlainTextMeeting(meeting) {
  const completedAgenda = meeting.agenda.filter((item) => item.completed).map((item) => `- [x] ${item.group}: ${item.item}`).join("\n");
  const openAgenda = meeting.agenda.filter((item) => !item.completed).map((item) => `- [ ] ${item.group}: ${item.item}`).join("\n");
  const attendees = meeting.attendees.map((person) => `- ${person.name || "Unnamed"} | ${person.organizationRole || "No role"} | ${person.attendanceType} | Signature: ${person.signature || "Not signed"}`).join("\n");
  const tasks = meeting.tasks.map((task) => `- ${task.task || "Untitled task"} | Assigned To: ${task.assignedTo || "Unassigned"} | Priority: ${task.priority} | Due: ${task.due || "No due date"} | Status: ${task.status}`).join("\n");

  return `METHODZ MEETING MANAGER RECORD

Meeting #${meeting.meetingNumber}: ${meeting.title}
Status: ${meeting.status}
Date: ${meeting.date}
Location: ${meeting.location || "Not listed"}
Facilitator: ${meeting.facilitator || "Not listed"}
Organizations / Representatives: ${meeting.organizations.join(", ") || "None selected"}

ATTENDANCE
${attendees || "No attendees listed."}

AGENDA COMPLETE
${completedAgenda || "No completed agenda items."}

AGENDA OPEN
${openAgenda || "No open agenda items."}

DISCUSSION NOTES
${meeting.notes || "No notes entered."}

DECISIONS MADE
${meeting.decisions || "No decisions entered."}

FOLLOW-UP TASKS
${tasks || "No follow-up tasks entered."}

MEETING SUMMARY
${meeting.summary || "No summary entered."}

Created: ${formatDateTime(meeting.createdAt)}
Updated: ${formatDateTime(meeting.updatedAt)}
`;
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value) {
  if (!value) return "not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readValue(root, selector) {
  const element = root.querySelector(selector);
  return element ? element.value.trim() : "";
}

function setText(id, text) {
  const element = document.getElementById(id);
  if (element) element.textContent = text;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(value);
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}
