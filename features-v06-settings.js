/* Methodz Meeting Manager v0.6 numbering and organization preset tools. */

window.addEventListener("DOMContentLoaded", initializeV06Settings);

function initializeV06Settings() {
  installNumberingSettingsPanelV06();
  installOrganizationPresetPanelV06();
  patchNumberingFlowV06();
  renderNumberingSettingsV06();
  renderOrganizationPresetsV06();
  refreshNumberingPreviewV06();
}

function installNumberingSettingsPanelV06() {
  const hero = document.querySelector(".hero-card");
  if (!hero || document.getElementById("numberingSettingsPanel")) return;

  const panel = document.createElement("section");
  panel.id = "numberingSettingsPanel";
  panel.className = "card v06-card numbering-card";
  panel.innerHTML = `
    <div class="section-subheader">
      <div>
        <h2>Meeting Numbering Settings</h2>
        <p class="helper-text">Control the next meeting number without changing old saved records.</p>
      </div>
      <div class="numbering-preview" id="numberingPreviewV06">Next: 001</div>
    </div>
    <div class="form-grid">
      <div><label for="numberPrefixV06">Prefix</label><input id="numberPrefixV06" type="text" placeholder="Optional, example MTG"></div>
      <div><label for="numberPaddingV06">Minimum Digits</label><input id="numberPaddingV06" type="number" min="1" max="8" step="1"></div>
      <div><label for="numberNextV06">Next Sequence Number</label><input id="numberNextV06" type="number" min="1" step="1"></div>
    </div>
    <label class="inline-check"><input id="numberIncludeYearV06" type="checkbox"> Include the meeting year in new meeting numbers</label>
    <div class="button-row">
      <button type="button" onclick="saveNumberingSettingsV06()">Save Numbering Settings</button>
      <button type="button" onclick="resetNumberingSettingsV06()">Reset Numbering Settings</button>
    </div>
  `;

  hero.insertAdjacentElement("afterend", panel);
  panel.addEventListener("input", refreshNumberingPreviewV06);
  panel.addEventListener("change", refreshNumberingPreviewV06);
}

function installOrganizationPresetPanelV06() {
  const organizationCard = document.getElementById("organizationList")?.closest(".card");
  if (!organizationCard || document.getElementById("organizationPresetPanel")) return;

  const panel = document.createElement("div");
  panel.id = "organizationPresetPanel";
  panel.className = "organization-preset-panel";
  panel.innerHTML = `
    <div class="section-subheader compact-subheader"><div><h3>Organization Presets</h3><p class="helper-text">Apply common representative groups quickly, or save the current selection as a reusable local preset.</p></div></div>
    <div class="form-grid">
      <div><label for="organizationPresetSelectV06">Preset</label><select id="organizationPresetSelectV06"></select></div>
      <div><label for="organizationPresetNameV06">New Preset Name</label><input id="organizationPresetNameV06" type="text" placeholder="Example: CSW + HVAC + Guest"></div>
    </div>
    <div class="button-row">
      <button type="button" onclick="applySelectedOrganizationPresetV06()">Apply Preset</button>
      <button type="button" onclick="saveCurrentOrganizationPresetV06()">Save Current Selection</button>
      <button type="button" onclick="deleteSelectedOrganizationPresetV06()">Delete Custom Preset</button>
      <button type="button" onclick="exportOrganizationPresetsV06()">Export Presets</button>
      <label class="button-like" for="importOrganizationPresetsFileV06">Import Presets</label>
    </div>
    <input id="importOrganizationPresetsFileV06" class="import-control" type="file" accept="application/json,.json" onchange="importOrganizationPresetsV06(event)">
    <p class="helper-text" id="organizationPresetSummaryV06">No presets loaded yet.</p>
  `;

  organizationCard.appendChild(panel);
}

function patchNumberingFlowV06() {
  if (!window.__methodzV06NumberingCollectPatched && typeof window.collectMeetingData === "function") {
    const originalCollectMeetingData = window.collectMeetingData;
    window.collectMeetingData = function collectMeetingDataV06Numbering(options = {}) {
      const meeting = originalCollectMeetingData(options);
      const editingRecordId = document.getElementById("editingRecordId")?.value || "";
      const existingRecord = (typeof window.getRecords === "function" ? window.getRecords() : []).find((record) => record.id === editingRecordId);
      if (!existingRecord) {
        meeting.meetingNumber = getNextMeetingNumberV06();
        meeting.numbering = getNumberingSettingsV06();
      }
      return meeting;
    };
    window.__methodzV06NumberingCollectPatched = true;
  }

  if (!window.__methodzV06NumberingLabelPatched && typeof window.updateMeetingNumberLabel === "function") {
    const originalUpdateMeetingNumberLabel = window.updateMeetingNumberLabel;
    window.updateMeetingNumberLabel = function updateMeetingNumberLabelV06(forcedNumber) {
      const editingRecordId = document.getElementById("editingRecordId")?.value || "";
      if (!forcedNumber && !editingRecordId) {
        const label = document.getElementById("meetingNumberLabel");
        if (label) label.textContent = `Meeting #${getNextMeetingNumberV06()}`;
        refreshNumberingPreviewV06();
        return;
      }
      originalUpdateMeetingNumberLabel(forcedNumber);
      refreshNumberingPreviewV06();
    };
    window.__methodzV06NumberingLabelPatched = true;
  }

  if (!window.__methodzV06SaveNumberPatched && typeof window.saveMeeting === "function") {
    const originalSaveMeeting = window.saveMeeting;
    window.saveMeeting = function saveMeetingV06Numbering() {
      const beforeIds = new Set((typeof window.getRecords === "function" ? window.getRecords() : []).map((record) => record.id));
      originalSaveMeeting();
      const newRecord = (typeof window.getRecords === "function" ? window.getRecords() : []).find((record) => !beforeIds.has(record.id));
      if (newRecord) advanceNumberingAfterSaveV06(newRecord.meetingNumber);
      refreshNumberingPreviewV06();
    };
    window.__methodzV06SaveNumberPatched = true;
  }
}

function renderNumberingSettingsV06() {
  const settings = getNumberingSettingsV06();
  setValueV06("numberPrefixV06", settings.prefix || "");
  setValueV06("numberPaddingV06", settings.padding || 3);
  setValueV06("numberNextV06", getNextSequenceV06());
  const includeYear = document.getElementById("numberIncludeYearV06");
  if (includeYear) includeYear.checked = Boolean(settings.includeYear);
}

function saveNumberingSettingsV06() {
  const settings = {
    prefix: readValueByIdV06("numberPrefixV06").trim(),
    padding: clampNumberV06(readValueByIdV06("numberPaddingV06"), 1, 8, 3),
    nextNumber: clampNumberV06(readValueByIdV06("numberNextV06"), 1, 99999999, getNextSequenceV06()),
    includeYear: Boolean(document.getElementById("numberIncludeYearV06")?.checked),
    updatedAt: new Date().toISOString()
  };
  localStorage.setItem(getNumberingStorageKeyV06(), JSON.stringify(settings));
  refreshNumberingPreviewV06();
  if (typeof window.updateMeetingNumberLabel === "function") window.updateMeetingNumberLabel();
  alert("Meeting numbering settings saved.");
}

function resetNumberingSettingsV06() {
  if (!confirm("Reset numbering settings to the project defaults?")) return;
  localStorage.removeItem(getNumberingStorageKeyV06());
  renderNumberingSettingsV06();
  refreshNumberingPreviewV06();
  if (typeof window.updateMeetingNumberLabel === "function") window.updateMeetingNumberLabel();
}

function refreshNumberingPreviewV06() {
  const preview = document.getElementById("numberingPreviewV06");
  if (!preview) return;
  const settings = {
    prefix: readValueByIdV06("numberPrefixV06"),
    padding: clampNumberV06(readValueByIdV06("numberPaddingV06"), 1, 8, getNumberingSettingsV06().padding || 3),
    nextNumber: clampNumberV06(readValueByIdV06("numberNextV06"), 1, 99999999, getNextSequenceV06()),
    includeYear: Boolean(document.getElementById("numberIncludeYearV06")?.checked)
  };
  preview.textContent = `Next: ${formatMeetingNumberV06(settings.nextNumber, settings)}`;
}

function getNextMeetingNumberV06() {
  return formatMeetingNumberV06(getNextSequenceV06(), getNumberingSettingsV06());
}

function getNextSequenceV06() {
  const settings = getNumberingSettingsV06();
  if (Number.isFinite(Number(settings.nextNumber)) && Number(settings.nextNumber) > 0) return Number(settings.nextNumber);
  const records = typeof window.getRecords === "function" ? window.getRecords() : [];
  const maxExisting = records.reduce((max, record) => Math.max(max, extractSequenceNumberV06(record.meetingNumber)), 0);
  return maxExisting + 1;
}

function advanceNumberingAfterSaveV06(meetingNumber) {
  const settings = getNumberingSettingsV06();
  const savedSequence = extractSequenceNumberV06(meetingNumber);
  if (!savedSequence) return;
  const nextNumber = Math.max(savedSequence + 1, Number(settings.nextNumber || 0));
  localStorage.setItem(getNumberingStorageKeyV06(), JSON.stringify({ ...settings, nextNumber, updatedAt: new Date().toISOString() }));
  setValueV06("numberNextV06", nextNumber);
}

function getNumberingSettingsV06() {
  const defaults = window.METHODZ_MEETING_CONFIG?.meetingNumbering || {};
  try {
    const stored = JSON.parse(localStorage.getItem(getNumberingStorageKeyV06())) || {};
    return {
      prefix: stored.prefix ?? defaults.prefix ?? "",
      padding: Number(stored.padding ?? defaults.padding ?? 3),
      nextNumber: stored.nextNumber ?? defaults.nextNumber ?? null,
      includeYear: Boolean(stored.includeYear ?? defaults.includeYear ?? false)
    };
  } catch (error) {
    console.error("Unable to read numbering settings", error);
    return { prefix: "", padding: 3, nextNumber: null, includeYear: false };
  }
}

function getNumberingStorageKeyV06() {
  return window.METHODZ_MEETING_CONFIG?.storageKeys?.numbering || "methodzMeetingNumbering";
}

function formatMeetingNumberV06(sequence, settings) {
  const pieces = [];
  if (settings.prefix) pieces.push(String(settings.prefix).trim().toUpperCase());
  if (settings.includeYear) pieces.push(String(new Date().getFullYear()));
  pieces.push(String(sequence).padStart(Number(settings.padding || 3), "0"));
  return pieces.join("-");
}

function extractSequenceNumberV06(meetingNumber) {
  const match = String(meetingNumber || "").match(/(\d+)(?!.*\d)/);
  return match ? Number(match[1]) : 0;
}

function renderOrganizationPresetsV06() {
  const select = document.getElementById("organizationPresetSelectV06");
  const summary = document.getElementById("organizationPresetSummaryV06");
  if (!select) return;
  const presets = getOrganizationPresetsV06();
  select.innerHTML = presets.length ? presets.map((preset) => `<option value="${escapeV06(preset.id)}">${escapeV06(preset.label)}${preset.source === "custom" ? " (custom)" : ""}</option>`).join("") : `<option value="">No organization presets available</option>`;
  if (summary) summary.textContent = `${presets.length} preset(s) available. ${presets.filter((preset) => preset.source === "custom").length} custom preset(s) saved locally.`;
}

function applySelectedOrganizationPresetV06() {
  const preset = getSelectedOrganizationPresetV06();
  if (!preset) return alert("Choose an organization preset first.");
  document.querySelectorAll(".company-present").forEach((box) => { box.checked = (preset.organizations || []).includes(box.value); });
  if (typeof window.scheduleDraftSave === "function") window.scheduleDraftSave();
}

function saveCurrentOrganizationPresetV06() {
  const label = readValueByIdV06("organizationPresetNameV06").trim();
  const organizations = Array.from(document.querySelectorAll(".company-present")).filter((box) => box.checked).map((box) => box.value);
  if (!label) return alert("Name the preset before saving it.");
  if (!organizations.length) return alert("Select at least one organization / representative before saving a preset.");
  const customPresets = getCustomOrganizationPresetsV06().filter((preset) => preset.label.toLowerCase() !== label.toLowerCase());
  customPresets.push({ id: `org-preset-${slugV06(label)}-${Date.now()}`, label, organizations, source: "custom", updatedAt: new Date().toISOString() });
  setCustomOrganizationPresetsV06(customPresets);
  setValueV06("organizationPresetNameV06", "");
  renderOrganizationPresetsV06();
}

function deleteSelectedOrganizationPresetV06() {
  const preset = getSelectedOrganizationPresetV06();
  if (!preset) return;
  if (preset.source !== "custom") return alert("Default presets come from config.js and cannot be deleted here.");
  if (!confirm(`Delete custom organization preset "${preset.label}"?`)) return;
  setCustomOrganizationPresetsV06(getCustomOrganizationPresetsV06().filter((item) => item.id !== preset.id));
  renderOrganizationPresetsV06();
}

function exportOrganizationPresetsV06() {
  const payload = { exportedAt: new Date().toISOString(), schemaVersion: window.METHODZ_MEETING_CONFIG?.schemaVersion || "0.6.0", organizationPresets: getCustomOrganizationPresetsV06() };
  if (typeof window.downloadBlob === "function") window.downloadBlob(JSON.stringify(payload, null, 2), `methodz-organization-presets-${todayV06()}.json`, "application/json");
}

function importOrganizationPresetsV06(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.organizationPresets;
      if (!Array.isArray(incoming)) return alert("Organization preset import must contain an array or organizationPresets array.");
      const byLabel = new Map(getCustomOrganizationPresetsV06().map((preset) => [preset.label.toLowerCase(), preset]));
      let imported = 0;
      incoming.forEach((preset) => {
        if (!preset?.label || !Array.isArray(preset.organizations)) return;
        byLabel.set(preset.label.toLowerCase(), { id: preset.id || `org-preset-${slugV06(preset.label)}-${Date.now()}-${Math.random().toString(16).slice(2)}`, label: preset.label, organizations: preset.organizations, source: "custom", updatedAt: new Date().toISOString() });
        imported++;
      });
      setCustomOrganizationPresetsV06(Array.from(byLabel.values()));
      renderOrganizationPresetsV06();
      alert(`Imported ${imported} organization preset(s).`);
    } catch (error) {
      console.error(error);
      alert("Could not import that organization preset JSON file.");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function getSelectedOrganizationPresetV06() {
  const id = readValueByIdV06("organizationPresetSelectV06");
  return getOrganizationPresetsV06().find((preset) => preset.id === id);
}

function getOrganizationPresetsV06() {
  const defaults = (window.METHODZ_MEETING_CONFIG?.organizationPresets || []).map((preset) => ({ ...preset, source: "default" }));
  return [...defaults, ...getCustomOrganizationPresetsV06()];
}

function getCustomOrganizationPresetsV06() {
  try {
    const presets = JSON.parse(localStorage.getItem(getOrganizationPresetStorageKeyV06())) || [];
    return Array.isArray(presets) ? presets : [];
  } catch (error) {
    console.error("Unable to read organization presets", error);
    return [];
  }
}

function setCustomOrganizationPresetsV06(presets) {
  localStorage.setItem(getOrganizationPresetStorageKeyV06(), JSON.stringify(presets));
}

function getOrganizationPresetStorageKeyV06() {
  return window.METHODZ_MEETING_CONFIG?.storageKeys?.organizationPresets || "methodzOrganizationPresets";
}

function readValueByIdV06(id) {
  const element = document.getElementById(id);
  return element ? element.value : "";
}

function setValueV06(id, value) {
  const element = document.getElementById(id);
  if (element) element.value = value;
}

function clampNumberV06(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(number)));
}

function slugV06(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "preset";
}

function escapeV06(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function todayV06() {
  return new Date().toISOString().slice(0, 10);
}
