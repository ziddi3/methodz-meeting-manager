/* Methodz Meeting Manager v0.7 organization and representative directory. */

window.addEventListener("DOMContentLoaded", initializeV07OrganizationDirectory);

function initializeV07OrganizationDirectory() {
  installOrganizationDirectoryPanelV07();
  patchOrganizationDataFlowV07();
  refreshOrganizationChecklistV07();
  renderOrganizationDirectoryV07();
}

function installOrganizationDirectoryPanelV07() {
  const organizationCard = document.getElementById("organizationList")?.closest(".card");
  if (!organizationCard || document.getElementById("organizationDirectoryPanelV07")) return;

  const panel = document.createElement("div");
  panel.id = "organizationDirectoryPanelV07";
  panel.className = "organization-directory-panel";
  panel.innerHTML = `
    <div class="section-subheader">
      <div>
        <h3>Organization / Representative Directory</h3>
        <p class="helper-text">Store reusable organization details locally. Selecting an entry can also add its primary representative to attendance.</p>
      </div>
      <div class="directory-count" id="organizationDirectoryCountV07">0 custom entries</div>
    </div>

    <div class="form-grid">
      <div>
        <label for="organizationNameV07">Organization / Representative Group</label>
        <input id="organizationNameV07" type="text" placeholder="Organization or representative group name">
      </div>
      <div>
        <label for="organizationTypeV07">Type</label>
        <select id="organizationTypeV07"></select>
      </div>
      <div>
        <label for="organizationRepresentativeV07">Primary Representative</label>
        <input id="organizationRepresentativeV07" type="text" placeholder="Name">
      </div>
      <div>
        <label for="organizationContactV07">Contact Detail</label>
        <input id="organizationContactV07" type="text" placeholder="Email, phone, or preferred contact method">
      </div>
    </div>

    <label for="organizationNotesV07">Directory Notes</label>
    <textarea id="organizationNotesV07" class="compact-textarea" placeholder="Role, relationship, agreement context, or other non-sensitive notes"></textarea>

    <div class="button-row">
      <button type="button" onclick="saveOrganizationEntryV07()">Save Directory Entry</button>
      <button type="button" onclick="exportOrganizationDirectoryV07()">Export Directory</button>
      <label class="button-like" for="importOrganizationDirectoryFileV07">Import Directory</label>
    </div>
    <input id="importOrganizationDirectoryFileV07" class="import-control" type="file" accept="application/json,.json" onchange="importOrganizationDirectoryV07(event)">

    <div id="organizationDirectoryListV07" class="organization-directory-list"></div>
  `;

  organizationCard.appendChild(panel);
  renderOrganizationTypeOptionsV07();
}

function renderOrganizationTypeOptionsV07() {
  const select = document.getElementById("organizationTypeV07");
  if (!select) return;
  const types = window.METHODZ_MEETING_CONFIG?.organizationTypes || [
    "Corporation",
    "Sole Proprietor",
    "Partner Organization",
    "Contractor",
    "Guest / Other"
  ];
  select.innerHTML = types.map((type) => `<option value="${escapeOrganizationV07(type)}">${escapeOrganizationV07(type)}</option>`).join("");
}

function patchOrganizationDataFlowV07() {
  if (!window.__methodzV07OrganizationCollectPatched && typeof window.collectMeetingData === "function") {
    const originalCollectMeetingData = window.collectMeetingData;
    window.collectMeetingData = function collectMeetingDataV07Organizations(options = {}) {
      const meeting = originalCollectMeetingData(options);
      const directoryByName = new Map(getOrganizationDirectoryV07().map((entry) => [normalizeOrganizationNameV07(entry.name), entry]));
      meeting.organizationDetails = (meeting.organizations || [])
        .map((name) => directoryByName.get(normalizeOrganizationNameV07(name)))
        .filter(Boolean)
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          type: entry.type,
          primaryRepresentative: entry.primaryRepresentative,
          contact: entry.contact,
          notes: entry.notes
        }));
      return meeting;
    };
    window.__methodzV07OrganizationCollectPatched = true;
  }

  if (!window.__methodzV07OrganizationPopulatePatched && typeof window.populateForm === "function") {
    const originalPopulateForm = window.populateForm;
    window.populateForm = function populateFormV07Organizations(record, options = {}) {
      refreshOrganizationChecklistV07(record.organizations || []);
      originalPopulateForm(record, options);
      document.querySelectorAll(".company-present").forEach((box) => {
        box.checked = (record.organizations || []).includes(box.value);
      });
    };
    window.__methodzV07OrganizationPopulatePatched = true;
  }

  if (!window.__methodzV07OrganizationNormalizePatched && typeof window.normalizeImportedRecord === "function") {
    const originalNormalizeImportedRecord = window.normalizeImportedRecord;
    window.normalizeImportedRecord = function normalizeImportedRecordV07Organizations(record) {
      const normalized = originalNormalizeImportedRecord(record);
      return {
        ...normalized,
        schemaVersion: record.schemaVersion || window.METHODZ_MEETING_CONFIG?.schemaVersion || "0.7.0",
        organizationDetails: Array.isArray(record.organizationDetails) ? record.organizationDetails : []
      };
    };
    window.__methodzV07OrganizationNormalizePatched = true;
  }
}

function refreshOrganizationChecklistV07(forceSelected = null) {
  const container = document.getElementById("organizationList");
  if (!container) return;

  const selected = new Set(
    Array.isArray(forceSelected)
      ? forceSelected
      : Array.from(container.querySelectorAll(".company-present:checked")).map((box) => box.value)
  );

  const defaultNames = window.METHODZ_MEETING_CONFIG?.organizations || [];
  const customNames = getOrganizationDirectoryV07().map((entry) => entry.name);
  const names = Array.from(new Map([...defaultNames, ...customNames].map((name) => [normalizeOrganizationNameV07(name), name])).values());

  container.innerHTML = names.map((name) => `
    <label>
      <input type="checkbox" class="company-present" value="${escapeOrganizationV07(name)}"${selected.has(name) ? " checked" : ""}>
      ${escapeOrganizationV07(name)}
    </label>
  `).join("");
}

function saveOrganizationEntryV07() {
  const name = readOrganizationValueV07("organizationNameV07").trim();
  if (!name) return alert("Enter an organization or representative group name.");

  const entries = getOrganizationDirectoryV07();
  const normalizedName = normalizeOrganizationNameV07(name);
  const existing = entries.find((entry) => normalizeOrganizationNameV07(entry.name) === normalizedName);
  const now = new Date().toISOString();
  const entry = {
    id: existing?.id || `organization-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name,
    type: readOrganizationValueV07("organizationTypeV07"),
    primaryRepresentative: readOrganizationValueV07("organizationRepresentativeV07").trim(),
    contact: readOrganizationValueV07("organizationContactV07").trim(),
    notes: readOrganizationValueV07("organizationNotesV07").trim(),
    createdAt: existing?.createdAt || now,
    updatedAt: now
  };

  const next = entries.filter((item) => item.id !== entry.id);
  next.push(entry);
  setOrganizationDirectoryV07(next);
  clearOrganizationDirectoryFormV07();
  refreshOrganizationChecklistV07();
  renderOrganizationDirectoryV07();
}

function renderOrganizationDirectoryV07() {
  const container = document.getElementById("organizationDirectoryListV07");
  const count = document.getElementById("organizationDirectoryCountV07");
  if (!container) return;

  const entries = getOrganizationDirectoryV07()
    .slice()
    .sort((a, b) => String(a.name).localeCompare(String(b.name)));

  if (count) count.textContent = `${entries.length} custom entr${entries.length === 1 ? "y" : "ies"}`;

  if (!entries.length) {
    container.innerHTML = `<p class="helper-text">No custom organization directory entries yet.</p>`;
    return;
  }

  container.innerHTML = entries.map((entry) => `
    <article class="organization-directory-entry">
      <div>
        <strong>${escapeOrganizationV07(entry.name)}</strong>
        <p>${escapeOrganizationV07(entry.type || "Unspecified type")}${entry.primaryRepresentative ? ` • Representative: ${escapeOrganizationV07(entry.primaryRepresentative)}` : ""}</p>
        ${entry.contact ? `<p class="helper-text">Contact: ${escapeOrganizationV07(entry.contact)}</p>` : ""}
        ${entry.notes ? `<p class="helper-text">${escapeOrganizationV07(entry.notes)}</p>` : ""}
      </div>
      <div class="button-row">
        <button type="button" onclick="selectOrganizationEntryV07('${encodeURIComponent(entry.id)}', false)">Select</button>
        <button type="button" onclick="selectOrganizationEntryV07('${encodeURIComponent(entry.id)}', true)">Select + Add Representative</button>
        <button type="button" onclick="editOrganizationEntryV07('${encodeURIComponent(entry.id)}')">Edit</button>
        <button type="button" class="small-danger" onclick="deleteOrganizationEntryV07('${encodeURIComponent(entry.id)}')">Delete</button>
      </div>
    </article>
  `).join("");
}

function selectOrganizationEntryV07(entryId, addRepresentative) {
  entryId = decodeURIComponent(entryId);
  const entry = getOrganizationDirectoryV07().find((item) => item.id === entryId);
  if (!entry) return;
  refreshOrganizationChecklistV07();
  const checkbox = Array.from(document.querySelectorAll(".company-present")).find((box) => box.value === entry.name);
  if (checkbox) checkbox.checked = true;

  if (addRepresentative && entry.primaryRepresentative && typeof window.addAttendee === "function") {
    window.addAttendee({
      name: entry.primaryRepresentative,
      organizationRole: `${entry.name}${entry.type ? ` / ${entry.type}` : ""}`,
      attendanceType: "In Person",
      signature: ""
    });
  }

  if (typeof window.scheduleDraftSave === "function") window.scheduleDraftSave();
}

function editOrganizationEntryV07(entryId) {
  entryId = decodeURIComponent(entryId);
  const entry = getOrganizationDirectoryV07().find((item) => item.id === entryId);
  if (!entry) return;
  setOrganizationValueV07("organizationNameV07", entry.name);
  setOrganizationValueV07("organizationTypeV07", entry.type);
  setOrganizationValueV07("organizationRepresentativeV07", entry.primaryRepresentative);
  setOrganizationValueV07("organizationContactV07", entry.contact);
  setOrganizationValueV07("organizationNotesV07", entry.notes);
  document.getElementById("organizationDirectoryPanelV07")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function deleteOrganizationEntryV07(entryId) {
  entryId = decodeURIComponent(entryId);
  const entry = getOrganizationDirectoryV07().find((item) => item.id === entryId);
  if (!entry) return;
  if (!confirm(`Delete "${entry.name}" from the local organization directory? Saved meeting records will keep their existing snapshots.`)) return;
  setOrganizationDirectoryV07(getOrganizationDirectoryV07().filter((item) => item.id !== entryId));
  refreshOrganizationChecklistV07();
  renderOrganizationDirectoryV07();
}

function exportOrganizationDirectoryV07() {
  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: window.METHODZ_MEETING_CONFIG?.schemaVersion || "0.7.0",
    organizationDirectory: getOrganizationDirectoryV07()
  };
  if (typeof window.downloadBlob === "function") {
    window.downloadBlob(JSON.stringify(payload, null, 2), `methodz-organization-directory-${todayOrganizationV07()}.json`, "application/json");
  }
}

function importOrganizationDirectoryV07(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.organizationDirectory;
      if (!Array.isArray(incoming)) throw new Error("No organizationDirectory array found.");

      const current = getOrganizationDirectoryV07();
      const byName = new Map(current.map((entry) => [normalizeOrganizationNameV07(entry.name), entry]));
      let accepted = 0;

      incoming.forEach((entry) => {
        if (!entry || typeof entry !== "object" || !String(entry.name || "").trim()) return;
        const name = String(entry.name).trim();
        const key = normalizeOrganizationNameV07(name);
        const existing = byName.get(key);
        byName.set(key, {
          id: existing?.id || entry.id || `organization-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name,
          type: String(entry.type || "Guest / Other"),
          primaryRepresentative: String(entry.primaryRepresentative || ""),
          contact: String(entry.contact || ""),
          notes: String(entry.notes || ""),
          createdAt: existing?.createdAt || entry.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        accepted++;
      });

      setOrganizationDirectoryV07(Array.from(byName.values()));
      refreshOrganizationChecklistV07();
      renderOrganizationDirectoryV07();
      alert(`Imported ${accepted} organization directory entr${accepted === 1 ? "y" : "ies"}.`);
    } catch (error) {
      console.error(error);
      alert("Could not import that organization directory JSON file.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function getOrganizationDirectoryV07() {
  try {
    const parsed = JSON.parse(localStorage.getItem(getOrganizationDirectoryKeyV07())) || [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Unable to read organization directory", error);
    return [];
  }
}

function setOrganizationDirectoryV07(entries) {
  localStorage.setItem(getOrganizationDirectoryKeyV07(), JSON.stringify(entries));
}

function getOrganizationDirectoryKeyV07() {
  return window.METHODZ_MEETING_CONFIG?.storageKeys?.organizationDirectory || "methodzOrganizationDirectory";
}

function clearOrganizationDirectoryFormV07() {
  ["organizationNameV07", "organizationRepresentativeV07", "organizationContactV07", "organizationNotesV07"]
    .forEach((id) => setOrganizationValueV07(id, ""));
}

function normalizeOrganizationNameV07(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function readOrganizationValueV07(id) {
  return document.getElementById(id)?.value || "";
}

function setOrganizationValueV07(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value || "";
}

function escapeOrganizationV07(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayOrganizationV07() {
  return new Date().toISOString().slice(0, 10);
}
