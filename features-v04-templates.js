/* Methodz Meeting Manager v0.4 template tools. */

window.addEventListener("DOMContentLoaded", initializeV04Templates);

function initializeV04Templates() {
  installMeetingTemplatePanel();
  patchPopulateForCustomAgenda();
}

function installMeetingTemplatePanel() {
  const quickActions = document.querySelector(".quick-actions");
  if (!quickActions || document.getElementById("meetingTemplatePanel")) return;

  const panel = document.createElement("section");
  panel.id = "meetingTemplatePanel";
  panel.className = "card template-card";
  panel.innerHTML = `
    <div class="section-subheader">
      <div>
        <h2>Meeting Templates</h2>
        <p class="helper-text">Apply repeatable meeting setups or save the current form as a browser-local template.</p>
      </div>
      <button type="button" onclick="saveCurrentAsTemplate()">Save Current as Template</button>
    </div>

    <div class="form-grid">
      <div>
        <label for="meetingTemplateSelect">Template</label>
        <select id="meetingTemplateSelect"></select>
      </div>
      <div class="template-actions">
        <button type="button" onclick="applySelectedTemplate()">Apply Template</button>
        <button type="button" onclick="exportMeetingTemplates()">Export Templates</button>
        <label class="button-like" for="importTemplatesFile">Import Templates</label>
        <input id="importTemplatesFile" class="import-control" type="file" accept="application/json,.json" onchange="importMeetingTemplates(event)">
      </div>
    </div>

    <div class="custom-agenda-builder">
      <h3>Add Custom Agenda Item</h3>
      <div class="form-grid">
        <div>
          <label for="customAgendaGroup">Group</label>
          <select id="customAgendaGroup"></select>
        </div>
        <div>
          <label for="customAgendaItem">Agenda Item</label>
          <input id="customAgendaItem" type="text" placeholder="Add a one-off agenda item...">
        </div>
      </div>
      <button type="button" onclick="addCustomAgendaItemFromForm()">Add Agenda Item</button>
    </div>
  `;

  quickActions.insertAdjacentElement("afterend", panel);
  renderMeetingTemplateOptions();
  renderCustomAgendaGroupOptions();
}

function renderMeetingTemplateOptions() {
  const select = document.getElementById("meetingTemplateSelect");
  if (!select) return;

  const templates = getAllMeetingTemplates();
  select.innerHTML = templates.length
    ? templates.map((template) => `<option value="${template.source}:${template.id}">${escapeV04(template.label)}</option>`).join("")
    : `<option value="">No templates available</option>`;
}

function renderCustomAgendaGroupOptions() {
  const select = document.getElementById("customAgendaGroup");
  if (!select) return;

  const groups = (window.METHODZ_MEETING_CONFIG?.agendaGroups || []).map((group) => group.name);
  const uniqueGroups = Array.from(new Set([...groups, "Custom"]));
  select.innerHTML = uniqueGroups.map((group) => `<option>${escapeV04(group)}</option>`).join("");
}

function getAllMeetingTemplates() {
  const defaults = (window.METHODZ_MEETING_CONFIG?.meetingTemplates || []).map((template) => ({ ...template, source: "default" }));
  const custom = getCustomTemplates().map((template) => ({ ...template, source: "custom" }));
  return [...defaults, ...custom];
}

function getTemplateStorageKey() {
  return window.METHODZ_MEETING_CONFIG?.storageKeys?.templates || "methodzMeetingTemplates";
}

function getCustomTemplates() {
  try {
    const templates = JSON.parse(localStorage.getItem(getTemplateStorageKey())) || [];
    return Array.isArray(templates) ? templates : [];
  } catch (error) {
    console.error("Unable to read custom templates", error);
    return [];
  }
}

function setCustomTemplates(templates) {
  localStorage.setItem(getTemplateStorageKey(), JSON.stringify(templates));
  renderMeetingTemplateOptions();
}

function findSelectedTemplate() {
  const selected = document.getElementById("meetingTemplateSelect")?.value || "";
  const separator = selected.indexOf(":");
  const source = selected.slice(0, separator);
  const id = selected.slice(separator + 1);
  return getAllMeetingTemplates().find((template) => template.source === source && template.id === id);
}

function applySelectedTemplate() {
  const template = findSelectedTemplate();
  if (!template) {
    alert("Choose a template first.");
    return;
  }

  if (formHasTemplateSensitiveContent()) {
    const proceed = confirm("Apply this template to the current form? Saved records will not be changed.");
    if (!proceed) return;
  }

  setIfPresent("meetingTitle", template.title);
  setIfPresent("meetingStatus", template.status);
  setIfPresent("meetingLocation", template.location);
  setIfPresent("meetingChair", template.facilitator);

  if (Array.isArray(template.organizations)) {
    document.querySelectorAll(".company-present").forEach((box) => {
      box.checked = template.organizations.includes(box.value);
    });
  }

  setIfEmpty("notes", template.notesPrompt);
  setIfEmpty("decisions", template.decisionsPrompt);
  setIfEmpty("summary", template.summaryPrompt);

  if (Array.isArray(template.customAgendaItems)) {
    template.customAgendaItems.forEach((item) => appendCustomAgendaItem(item.group || "Custom", item.item || item, Boolean(item.completed)));
  }

  if (Array.isArray(template.starterTasks) && template.starterTasks.length) {
    removeEmptyTaskRowsV04();
    template.starterTasks.forEach((task) => {
      if (typeof window.addTask === "function") window.addTask(task);
    });
  }

  if (typeof window.updateStatusPill === "function") window.updateStatusPill();
  if (typeof window.refreshValidationPanel === "function") window.refreshValidationPanel();
  if (typeof window.scheduleDraftSave === "function") window.scheduleDraftSave();
  alert(`Applied template: ${template.label}`);
}

function saveCurrentAsTemplate() {
  if (typeof window.collectMeetingData !== "function") return;

  const label = prompt("Template name?");
  if (!label) return;

  const meeting = window.collectMeetingData({ keepEmptyRows: false, forceNewId: true });
  const template = {
    id: `custom-${Date.now()}`,
    label,
    title: meeting.title,
    status: meeting.status || "Scheduled",
    location: meeting.location,
    facilitator: meeting.facilitator,
    organizations: meeting.organizations || [],
    notesPrompt: meeting.notes || "",
    decisionsPrompt: meeting.decisions || "",
    summaryPrompt: meeting.summary || "",
    starterTasks: meeting.tasks || [],
    starterDecisions: meeting.decisionsList || [],
    customAgendaItems: (meeting.agenda || [])
      .filter((item) => !isDefaultAgendaItemV04(item.item))
      .map((item) => ({ group: item.group || "Custom", item: item.item, completed: Boolean(item.completed) }))
  };

  const templates = getCustomTemplates();
  templates.push(template);
  setCustomTemplates(templates);
  alert(`Saved template: ${label}`);
}

function exportMeetingTemplates() {
  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: window.METHODZ_MEETING_CONFIG?.schemaVersion || "0.4.0",
    templates: getCustomTemplates()
  };
  downloadBlob(JSON.stringify(payload, null, 2), `methodz-meeting-templates-${todayV04()}.json`, "application/json");
}

function importMeetingTemplates(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.templates;
      if (!Array.isArray(incoming)) {
        alert("Template import must contain an array or a templates array.");
        return;
      }

      const byId = new Map(getCustomTemplates().map((template) => [template.id, template]));
      incoming.forEach((template) => {
        if (!template || typeof template !== "object") return;
        const safeTemplate = {
          ...template,
          id: template.id || `custom-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          label: template.label || "Imported Template"
        };
        byId.set(safeTemplate.id, safeTemplate);
      });

      setCustomTemplates(Array.from(byId.values()));
      alert(`Imported ${incoming.length} template(s).`);
    } catch (error) {
      console.error(error);
      alert("Could not import that template JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file);
}

function addCustomAgendaItemFromForm() {
  const group = readV04("customAgendaGroup") || "Custom";
  const item = readV04("customAgendaItem");
  if (!item) {
    alert("Enter an agenda item first.");
    return;
  }

  appendCustomAgendaItem(group, item, false);
  setValueV04("customAgendaItem", "");
  if (typeof window.scheduleDraftSave === "function") window.scheduleDraftSave();
}

function appendCustomAgendaItem(group, item, completed = false) {
  const agendaList = document.getElementById("agendaList");
  if (!agendaList || !item) return;

  const duplicate = Array.from(agendaList.querySelectorAll("input[type='checkbox']")).some((box) => box.dataset.item === item && box.dataset.group === group);
  if (duplicate) return;

  let customGroup = Array.from(agendaList.querySelectorAll(".custom-agenda-group")).find((groupElement) => groupElement.dataset.customAgendaGroup === group);
  if (!customGroup) {
    customGroup = document.createElement("div");
    customGroup.className = "custom-agenda-group";
    customGroup.dataset.customAgendaGroup = group;
    customGroup.innerHTML = `<h3>${escapeV04(group)}</h3>`;
    agendaList.appendChild(customGroup);
  }

  const row = document.createElement("label");
  row.className = "custom-agenda-row";
  row.innerHTML = `
    <input type="checkbox" data-group="${escapeV04(group)}" data-item="${escapeV04(item)}" data-custom="true" ${completed ? "checked" : ""}>
    ${escapeV04(item)}
    <button type="button" class="small-danger inline-remove" onclick="removeCustomAgendaItem(this)">Remove</button>
  `;
  customGroup.appendChild(row);
}

function removeCustomAgendaItem(button) {
  const row = button.closest(".custom-agenda-row");
  const group = row?.closest(".custom-agenda-group");
  if (row) row.remove();
  if (group && !group.querySelector(".custom-agenda-row")) group.remove();
  if (typeof window.scheduleDraftSave === "function") window.scheduleDraftSave();
}

function patchPopulateForCustomAgenda() {
  if (window.__methodzV04AgendaPatched || typeof window.populateForm !== "function") return;
  const originalPopulateForm = window.populateForm;
  window.populateForm = function populateFormWithCustomAgenda(record, options = {}) {
    removeCustomAgendaItemsV04();
    renderCustomAgendaFromRecord(record);
    originalPopulateForm(record, options);
  };
  window.__methodzV04AgendaPatched = true;
}

function renderCustomAgendaFromRecord(record) {
  const agenda = Array.isArray(record?.agenda) ? record.agenda : [];
  agenda.forEach((item) => {
    if (item?.item && !isDefaultAgendaItemV04(item.item)) appendCustomAgendaItem(item.group || "Custom", item.item, Boolean(item.completed));
  });
}

function removeCustomAgendaItemsV04() {
  document.querySelectorAll(".custom-agenda-group").forEach((group) => group.remove());
}

function isDefaultAgendaItemV04(itemText) {
  const groups = window.METHODZ_MEETING_CONFIG?.agendaGroups || [];
  return groups.some((group) => Array.isArray(group.items) && group.items.includes(itemText));
}

function removeEmptyTaskRowsV04() {
  document.querySelectorAll(".task").forEach((task) => {
    const taskName = task.querySelector(".task-name")?.value.trim();
    const assignedTo = task.querySelector(".task-assigned")?.value.trim();
    if (!taskName && !assignedTo) task.remove();
  });
}

function formHasTemplateSensitiveContent() {
  if (readV04("meetingTitle") || readV04("notes") || readV04("decisions") || readV04("summary")) return true;
  return Array.from(document.querySelectorAll(".attendee-name, .attendee-signature, .task-name, .task-assigned")).some((input) => input.value.trim());
}

function setIfPresent(id, value) {
  if (value) setValueV04(id, value);
}

function setIfEmpty(id, value) {
  if (value && !readV04(id)) setValueV04(id, value);
}

function setValueV04(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function readV04(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

function todayV04() {
  return new Date().toISOString().slice(0, 10);
}

function escapeV04(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
