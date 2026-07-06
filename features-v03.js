/*
  Methodz Meeting Manager v0.3 enhancements.
  This file intentionally layers new workflow features on top of the stable offline core.
  No build step, framework, or external dependency is required.
*/

window.addEventListener("DOMContentLoaded", initializeV03Enhancements);

function initializeV03Enhancements() {
  installDecisionBuilder();
  installValidationPanel();
  installTaskFilters();
  installMinutesPreview();
  installExportButtons();
  patchCoreFunctionsForV03();
  refreshValidationPanel();
}

function patchCoreFunctionsForV03() {
  const originalCollectMeetingData = window.collectMeetingData;
  const originalPopulateForm = window.populateForm;
  const originalResetForm = window.resetForm;
  const originalAddTask = window.addTask;
  const originalCreateRecordCard = window.createRecordCard;
  const originalCreatePlainTextMeeting = window.createPlainTextMeeting;

  if (typeof originalCollectMeetingData === "function") {
    window.collectMeetingData = function collectMeetingDataV03(options = {}) {
      const meeting = originalCollectMeetingData(options);
      meeting.decisionsList = collectStructuredDecisions(options);
      meeting.validation = buildValidationChecklist(meeting);
      return meeting;
    };
  }

  if (typeof originalPopulateForm === "function") {
    window.populateForm = function populateFormV03(record, options = {}) {
      originalPopulateForm(record, options);
      renderStructuredDecisions(record.decisionsList || []);
      refreshValidationPanel();
    };
  }

  if (typeof originalResetForm === "function") {
    window.resetForm = function resetFormV03() {
      originalResetForm();
      renderStructuredDecisions([]);
      resetTaskFilters();
      refreshValidationPanel();
      clearMinutesPreview();
    };
  }

  if (typeof originalAddTask === "function") {
    window.addTask = function addTaskV03(data = {}) {
      originalAddTask(data);
      applyTaskFilters();
      refreshValidationPanel();
    };
  }

  if (typeof originalCreateRecordCard === "function") {
    window.createRecordCard = function createRecordCardV03(record) {
      const card = originalCreateRecordCard(record);
      const row = card.querySelector(".button-row");
      if (row && !row.querySelector(".export-html-button")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "export-html-button";
        button.textContent = "Export HTML";
        button.addEventListener("click", () => downloadRecordHtml(record));
        row.appendChild(button);
      }
      return card;
    };
  }

  if (typeof originalCreatePlainTextMeeting === "function") {
    window.createPlainTextMeeting = function createPlainTextMeetingV03(meeting) {
      const baseText = originalCreatePlainTextMeeting(meeting);
      const structuredDecisions = formatStructuredDecisionsForText(meeting.decisionsList || []);
      const validation = formatValidationForText(meeting.validation || buildValidationChecklist(meeting));
      return `${baseText}\nSTRUCTURED DECISIONS\n${structuredDecisions}\n\nRECORD REVIEW\n${validation}\n`;
    };
  }
}

function installDecisionBuilder() {
  const decisionsField = document.getElementById("decisions");
  if (!decisionsField || document.getElementById("structuredDecisionShell")) return;

  const shell = document.createElement("div");
  shell.id = "structuredDecisionShell";
  shell.className = "structured-shell";
  shell.innerHTML = `
    <div class="section-subheader">
      <div>
        <h3>Structured Decision Log</h3>
        <p class="helper-text">Use this for clear, auditable decisions. The notes box above remains available for free-form detail.</p>
      </div>
      <button type="button" onclick="addStructuredDecision()">Add Decision</button>
    </div>
    <div id="structuredDecisionList"></div>
  `;

  decisionsField.insertAdjacentElement("afterend", shell);
}

function addStructuredDecision(data = {}) {
  const container = document.getElementById("structuredDecisionList");
  if (!container) return;

  const div = document.createElement("div");
  div.className = "decision-item";
  div.innerHTML = `
    <div class="item-header">
      <h3>Decision</h3>
      <button type="button" class="small-danger" onclick="removeDecision(this)">Remove</button>
    </div>

    <label>Decision</label>
    <input type="text" class="decision-text" placeholder="What was decided?" value="${safeText(data.decision || "")}">

    <div class="form-grid">
      <div>
        <label>Approved / Confirmed By</label>
        <input type="text" class="decision-approved-by" placeholder="Name or group" value="${safeText(data.approvedBy || "")}">
      </div>
      <div>
        <label>Decision Date</label>
        <input type="date" class="decision-date" value="${safeText(data.date || todayIsoDate())}">
      </div>
      <div>
        <label>Decision Status</label>
        <select class="decision-status">
          ${["Approved", "Proposed", "Deferred", "Reversed"].map((status) => optionText(status, data.status || "Approved")).join("")}
        </select>
      </div>
    </div>

    <label>Notes / Conditions</label>
    <input type="text" class="decision-notes" placeholder="Conditions, limits, or context" value="${safeText(data.notes || "")}">
  `;

  container.appendChild(div);
  scheduleDraftFromEnhancement();
  refreshValidationPanel();
}

function removeDecision(button) {
  const item = button.closest(".decision-item");
  if (item) item.remove();
  scheduleDraftFromEnhancement();
  refreshValidationPanel();
}

function renderStructuredDecisions(decisions) {
  const container = document.getElementById("structuredDecisionList");
  if (!container) return;

  container.innerHTML = "";
  decisions.forEach((decision) => addStructuredDecision(decision));
}

function collectStructuredDecisions(options = {}) {
  const decisions = [];

  document.querySelectorAll(".decision-item").forEach((item) => {
    const decision = readScopedValue(item, ".decision-text");
    const approvedBy = readScopedValue(item, ".decision-approved-by");
    const date = readScopedValue(item, ".decision-date");
    const status = readScopedValue(item, ".decision-status");
    const notes = readScopedValue(item, ".decision-notes");

    if (!options.keepEmptyRows && !decision && !approvedBy && !notes) return;

    decisions.push({ decision, approvedBy, date, status, notes });
  });

  return decisions;
}

function installValidationPanel() {
  const quickActions = document.querySelector(".quick-actions");
  if (!quickActions || document.getElementById("validationPanel")) return;

  const panel = document.createElement("section");
  panel.className = "card validation-card";
  panel.id = "validationPanel";
  panel.innerHTML = `
    <div class="section-subheader">
      <div>
        <h2>Record Readiness Review</h2>
        <p class="helper-text">A lightweight pre-save check for missing signatures, unresolved tasks, and meeting completeness.</p>
      </div>
      <button type="button" onclick="refreshValidationPanel()">Review Now</button>
    </div>
    <div id="validationSummary" class="validation-summary">Ready for review.</div>
    <ul id="validationList" class="validation-list"></ul>
  `;

  quickActions.insertAdjacentElement("afterend", panel);
  document.querySelector(".app-shell").addEventListener("input", debounceEnhancement(refreshValidationPanel, 250));
  document.querySelector(".app-shell").addEventListener("change", debounceEnhancement(refreshValidationPanel, 250));
}

function buildValidationChecklist(meeting) {
  const attendees = meeting.attendees || [];
  const tasks = meeting.tasks || [];
  const decisionsList = meeting.decisionsList || [];
  const openCriticalTasks = tasks.filter((task) => task.priority === "Critical" && task.status !== "Completed").length;
  const unsignedAttendees = attendees.filter((person) => person.name && !person.signature).length;
  const assignedTaskGaps = tasks.filter((task) => task.task && !task.assignedTo).length;

  return [
    {
      key: "title",
      level: meeting.title ? "pass" : "blocker",
      label: meeting.title ? "Meeting title is present." : "Meeting title is missing."
    },
    {
      key: "date",
      level: meeting.date ? "pass" : "blocker",
      label: meeting.date ? "Meeting date is present." : "Meeting date is missing."
    },
    {
      key: "organizations",
      level: meeting.organizations?.length ? "pass" : "warning",
      label: meeting.organizations?.length ? "At least one organization / representative group is selected." : "No organization / representative group is selected."
    },
    {
      key: "attendance",
      level: attendees.length ? "pass" : "warning",
      label: attendees.length ? `${attendees.length} attendee(s) listed.` : "No attendees are listed."
    },
    {
      key: "signatures",
      level: unsignedAttendees === 0 ? "pass" : "warning",
      label: unsignedAttendees === 0 ? "No listed attendees are missing signatures." : `${unsignedAttendees} attendee(s) have names but no signature.`
    },
    {
      key: "decisions",
      level: meeting.decisions || decisionsList.length ? "pass" : "warning",
      label: meeting.decisions || decisionsList.length ? "Decisions are recorded." : "No decisions are recorded yet."
    },
    {
      key: "task-assignment",
      level: assignedTaskGaps === 0 ? "pass" : "warning",
      label: assignedTaskGaps === 0 ? "All named tasks have an assigned person." : `${assignedTaskGaps} task(s) need an Assigned To value.`
    },
    {
      key: "critical-tasks",
      level: openCriticalTasks === 0 ? "pass" : "warning",
      label: openCriticalTasks === 0 ? "No open critical tasks." : `${openCriticalTasks} critical task(s) are still open.`
    },
    {
      key: "summary",
      level: meeting.summary ? "pass" : "warning",
      label: meeting.summary ? "Meeting summary is present." : "Meeting summary is empty."
    }
  ];
}

function refreshValidationPanel() {
  const list = document.getElementById("validationList");
  const summary = document.getElementById("validationSummary");
  if (!list || !summary || typeof window.collectMeetingData !== "function") return;

  const meeting = window.collectMeetingData({ keepEmptyRows: false, forceNewId: true });
  const checks = buildValidationChecklist(meeting);
  const blockers = checks.filter((check) => check.level === "blocker").length;
  const warnings = checks.filter((check) => check.level === "warning").length;

  summary.textContent = blockers
    ? `${blockers} required item(s) missing. ${warnings} warning(s).`
    : warnings
      ? `Record can be saved. ${warnings} warning(s) to review.`
      : "Record looks complete.";

  summary.className = `validation-summary ${blockers ? "has-blockers" : warnings ? "has-warnings" : "is-clean"}`;
  list.innerHTML = checks.map((check) => `<li class="validation-${check.level}">${safeText(check.label)}</li>`).join("");
}

function installTaskFilters() {
  const taskList = document.getElementById("taskList");
  if (!taskList || document.getElementById("taskFilterPanel")) return;

  const panel = document.createElement("div");
  panel.id = "taskFilterPanel";
  panel.className = "task-filter-panel";
  panel.innerHTML = `
    <div class="form-grid">
      <div>
        <label for="taskSearchFilter">Filter Tasks</label>
        <input id="taskSearchFilter" type="search" placeholder="Search task or assigned person...">
      </div>
      <div>
        <label for="taskStatusFilter">Progress</label>
        <select id="taskStatusFilter">
          <option value="">All</option>
          <option>Pending</option>
          <option>In Progress</option>
          <option>Completed</option>
        </select>
      </div>
      <div>
        <label for="taskPriorityFilter">Priority</label>
        <select id="taskPriorityFilter">
          <option value="">All</option>
          <option>Low</option>
          <option>Normal</option>
          <option>High</option>
          <option>Critical</option>
        </select>
      </div>
    </div>
    <p class="helper-text" id="taskFilterSummary">Showing all tasks.</p>
  `;

  taskList.insertAdjacentElement("beforebegin", panel);
  panel.addEventListener("input", applyTaskFilters);
  panel.addEventListener("change", applyTaskFilters);
}

function applyTaskFilters() {
  const query = readElementValue("taskSearchFilter").toLowerCase();
  const status = readElementValue("taskStatusFilter");
  const priority = readElementValue("taskPriorityFilter");
  const tasks = Array.from(document.querySelectorAll(".task"));
  let visibleCount = 0;

  tasks.forEach((task) => {
    const taskText = `${readScopedValue(task, ".task-name")} ${readScopedValue(task, ".task-assigned")}`.toLowerCase();
    const taskStatus = readScopedValue(task, ".task-status");
    const taskPriority = readScopedValue(task, ".task-priority");
    const matchesQuery = !query || taskText.includes(query);
    const matchesStatus = !status || taskStatus === status;
    const matchesPriority = !priority || taskPriority === priority;
    const visible = matchesQuery && matchesStatus && matchesPriority;

    task.hidden = !visible;
    if (visible) visibleCount++;
  });

  const summary = document.getElementById("taskFilterSummary");
  if (summary) summary.textContent = `Showing ${visibleCount} of ${tasks.length} task(s).`;
}

function resetTaskFilters() {
  setElementValue("taskSearchFilter", "");
  setElementValue("taskStatusFilter", "");
  setElementValue("taskPriorityFilter", "");
  applyTaskFilters();
}

function installMinutesPreview() {
  const controls = document.querySelector(".controls .button-row");
  if (!controls || document.getElementById("minutesPreview")) return;

  const previewButton = document.createElement("button");
  previewButton.type = "button";
  previewButton.textContent = "Preview Minutes";
  previewButton.addEventListener("click", showMinutesPreview);
  controls.prepend(previewButton);

  const preview = document.createElement("section");
  preview.id = "minutesPreview";
  preview.className = "card minutes-preview";
  preview.hidden = true;
  preview.innerHTML = `
    <div class="section-subheader">
      <div>
        <h2>Meeting Minutes Preview</h2>
        <p class="helper-text">Printable, readable minutes generated from the current form.</p>
      </div>
      <div class="button-row">
        <button type="button" onclick="downloadCurrentMeetingHtml()">Export HTML</button>
        <button type="button" onclick="clearMinutesPreview()">Close Preview</button>
      </div>
    </div>
    <div id="minutesPreviewBody"></div>
  `;

  document.querySelector(".controls").insertAdjacentElement("afterend", preview);
}

function installExportButtons() {
  const quickActions = document.querySelector(".quick-actions");
  if (quickActions && !document.getElementById("quickHtmlExportButton")) {
    const button = document.createElement("button");
    button.id = "quickHtmlExportButton";
    button.type = "button";
    button.textContent = "Export HTML";
    button.addEventListener("click", downloadCurrentMeetingHtml);
    quickActions.appendChild(button);
  }
}

function showMinutesPreview() {
  const preview = document.getElementById("minutesPreview");
  const body = document.getElementById("minutesPreviewBody");
  if (!preview || !body) return;

  const meeting = window.collectMeetingData({ forceNewId: true });
  body.innerHTML = renderMinutesHtml(meeting, { includeDocumentShell: false });
  preview.hidden = false;
  preview.scrollIntoView({ behavior: "smooth", block: "start" });
}

function clearMinutesPreview() {
  const preview = document.getElementById("minutesPreview");
  const body = document.getElementById("minutesPreviewBody");
  if (body) body.innerHTML = "";
  if (preview) preview.hidden = true;
}

function downloadCurrentMeetingHtml() {
  const meeting = window.collectMeetingData({ forceNewId: true });
  downloadRecordHtml(meeting);
}

function downloadRecordHtml(record) {
  const html = renderMinutesHtml(record, { includeDocumentShell: true });
  const safeDate = record.date || todayIsoDate();
  const safeNumber = record.meetingNumber || "draft";
  downloadBlob(html, `meeting-minutes-${safeNumber}-${safeDate}.html`, "text/html");
}

function renderMinutesHtml(meeting, options = {}) {
  const decisionsList = meeting.decisionsList || [];
  const tasks = meeting.tasks || [];
  const attendees = meeting.attendees || [];
  const agenda = meeting.agenda || [];
  const completedAgenda = agenda.filter((item) => item.completed);
  const openAgenda = agenda.filter((item) => !item.completed);
  const checks = meeting.validation || buildValidationChecklist(meeting);

  const body = `
    <article class="minutes-document">
      <header>
        <p class="eyebrow">Methodz Meeting Manager</p>
        <h1>Meeting #${safeText(meeting.meetingNumber || "Draft")}: ${safeText(meeting.title || "Untitled Meeting")}</h1>
        <p>${safeText(meeting.status || "No status")} • ${safeText(meeting.date || "No date")} • ${safeText(meeting.location || "No location listed")}</p>
      </header>

      <section>
        <h2>Meeting Details</h2>
        <dl>
          <dt>Facilitator</dt><dd>${safeText(meeting.facilitator || "Not listed")}</dd>
          <dt>Organizations / Representatives</dt><dd>${safeText((meeting.organizations || []).join(", ") || "None selected")}</dd>
          <dt>Created</dt><dd>${safeText(formatEnhancementDate(meeting.createdAt))}</dd>
          <dt>Updated</dt><dd>${safeText(formatEnhancementDate(meeting.updatedAt))}</dd>
        </dl>
      </section>

      <section>
        <h2>Attendance</h2>
        ${renderTable(
          ["Name", "Organization / Role", "Attendance", "Signature"],
          attendees.map((person) => [person.name, person.organizationRole, person.attendanceType, person.signature])
        )}
      </section>

      <section>
        <h2>Structured Decisions</h2>
        ${renderTable(
          ["Decision", "Confirmed By", "Date", "Status", "Notes"],
          decisionsList.map((decision) => [decision.decision, decision.approvedBy, decision.date, decision.status, decision.notes])
        )}
        ${meeting.decisions ? `<h3>Decision Notes</h3><p>${safeMultiline(meeting.decisions)}</p>` : ""}
      </section>

      <section>
        <h2>Follow-Up Tasks</h2>
        ${renderTable(
          ["Task", "Assigned To", "Priority", "Due", "Progress"],
          tasks.map((task) => [task.task, task.assignedTo, task.priority, task.due, task.status])
        )}
      </section>

      <section>
        <h2>Agenda Complete</h2>
        ${renderList(completedAgenda.map((item) => `${item.group}: ${item.item}`), "No completed agenda items.")}
      </section>

      <section>
        <h2>Agenda Open</h2>
        ${renderList(openAgenda.map((item) => `${item.group}: ${item.item}`), "No open agenda items.")}
      </section>

      <section>
        <h2>Discussion Notes</h2>
        <p>${safeMultiline(meeting.notes || "No discussion notes entered.")}</p>
      </section>

      <section>
        <h2>Meeting Summary</h2>
        <p>${safeMultiline(meeting.summary || "No summary entered.")}</p>
      </section>

      <section>
        <h2>Record Readiness Review</h2>
        ${renderList(checks.map((check) => `${check.level.toUpperCase()}: ${check.label}`), "No validation checks available.")}
      </section>
    </article>
  `;

  if (!options.includeDocumentShell) return body;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Meeting #${safeText(meeting.meetingNumber || "Draft")} Minutes</title>
  <style>
    body { font-family: Arial, sans-serif; color: #222; line-height: 1.5; margin: 32px; }
    .minutes-document { max-width: 920px; margin: 0 auto; }
    .eyebrow { text-transform: uppercase; letter-spacing: 0.08em; color: #8a6415; font-weight: 700; }
    h1 { border-bottom: 2px solid #111; padding-bottom: 12px; }
    h2 { border-bottom: 1px solid #ddd; padding-bottom: 6px; margin-top: 28px; }
    table { border-collapse: collapse; width: 100%; margin-top: 10px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; vertical-align: top; }
    th { background: #f4f4f4; }
    dl { display: grid; grid-template-columns: 180px 1fr; gap: 6px 12px; }
    dt { font-weight: bold; }
    @media print { body { margin: 0.5in; } }
  </style>
</head>
<body>
${body}
</body>
</html>`;
}

function renderTable(headers, rows) {
  if (!rows.length) return "<p>No entries recorded.</p>";

  return `
    <table>
      <thead><tr>${headers.map((header) => `<th>${safeText(header)}</th>`).join("")}</tr></thead>
      <tbody>
        ${rows.map((row) => `<tr>${row.map((cell) => `<td>${safeMultiline(cell || "")}</td>`).join("")}</tr>`).join("")}
      </tbody>
    </table>
  `;
}

function renderList(items, emptyText) {
  if (!items.length) return `<p>${safeText(emptyText)}</p>`;
  return `<ul>${items.map((item) => `<li>${safeText(item)}</li>`).join("")}</ul>`;
}

function formatStructuredDecisionsForText(decisions) {
  if (!decisions.length) return "No structured decisions recorded.";
  return decisions
    .map((decision) => `- ${decision.decision || "Untitled decision"} | Confirmed By: ${decision.approvedBy || "Not listed"} | Date: ${decision.date || "No date"} | Status: ${decision.status || "No status"} | Notes: ${decision.notes || "None"}`)
    .join("\n");
}

function formatValidationForText(checks) {
  if (!checks.length) return "No validation checks available.";
  return checks.map((check) => `- ${check.level.toUpperCase()}: ${check.label}`).join("\n");
}

function scheduleDraftFromEnhancement() {
  if (typeof window.scheduleDraftSave === "function") window.scheduleDraftSave();
}

function readScopedValue(root, selector) {
  const element = root.querySelector(selector);
  return element ? element.value.trim() : "";
}

function readElementValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function setElementValue(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function optionText(value, selectedValue) {
  const selected = value === selectedValue ? " selected" : "";
  return `<option value="${safeText(value)}"${selected}>${safeText(value)}</option>`;
}

function safeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeMultiline(value) {
  return safeText(value).replaceAll("\n", "<br>");
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatEnhancementDate(value) {
  if (typeof window.formatDateTime === "function") return window.formatDateTime(value);
  if (!value) return "not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function debounceEnhancement(fn, delay) {
  let timer = null;
  return function debouncedEnhancement(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}
