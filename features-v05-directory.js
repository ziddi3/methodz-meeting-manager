/* Methodz Meeting Manager v0.5 attendee directory and signature tools. */

window.addEventListener("DOMContentLoaded", initializeV05Directory);

function initializeV05Directory() {
  installAttendeeDirectoryPanelV05();
  installSignatureControlsV05();
  patchDirectoryDataFlowV05();
  renderDirectoryOptionsV05();
  refreshSignatureSummaryV05();
}

function installAttendeeDirectoryPanelV05() {
  const attendanceCard = document.getElementById("attendeeList")?.closest(".card");
  if (!attendanceCard || document.getElementById("attendeeDirectoryPanel")) return;

  const panel = document.createElement("section");
  panel.id = "attendeeDirectoryPanel";
  panel.className = "card v05-card directory-card";
  panel.innerHTML = `
    <div class="section-subheader">
      <div>
        <h2>Attendee Directory</h2>
        <p class="helper-text">Save repeat attendees as local presets. Signatures are not stored in the directory.</p>
      </div>
      <div class="button-row">
        <button type="button" onclick="saveCurrentAttendeesToDirectoryV05()">Save Current Attendees</button>
        <button type="button" onclick="exportDirectoryJsonV05()">Export Directory</button>
        <button type="button" onclick="exportDirectoryCsvV05()">Export CSV</button>
      </div>
    </div>

    <div class="form-grid">
      <div>
        <label for="attendeeDirectorySelect">Saved Attendee</label>
        <select id="attendeeDirectorySelect"></select>
      </div>
      <div class="directory-actions">
        <button type="button" onclick="addSelectedDirectoryAttendeeV05()">Add to Meeting</button>
        <button type="button" onclick="deleteSelectedDirectoryAttendeeV05()">Delete Preset</button>
        <label class="button-like" for="importDirectoryFile">Import Directory</label>
        <input id="importDirectoryFile" class="import-control" type="file" accept="application/json,.json" onchange="importDirectoryJsonV05(event)">
      </div>
    </div>

    <p class="helper-text" id="directorySummary">No directory entries yet.</p>
  `;

  attendanceCard.insertAdjacentElement("beforebegin", panel);
}

function installSignatureControlsV05() {
  const attendanceCard = document.getElementById("attendeeList")?.closest(".card");
  if (!attendanceCard || document.getElementById("signatureControlPanel")) return;

  const panel = document.createElement("div");
  panel.id = "signatureControlPanel";
  panel.className = "signature-control-panel";
  panel.innerHTML = `
    <div class="section-subheader compact-subheader">
      <div>
        <h3>Signature Controls</h3>
        <p class="helper-text">Typed signatures remain part of the meeting record. Use the helper only when everyone agrees their typed name is their sign-off.</p>
      </div>
      <div class="button-row">
        <button type="button" onclick="fillUnsignedSignaturesFromNamesV05()">Fill Unsigned From Names</button>
        <button type="button" onclick="removeEmptyAttendeesV05()">Remove Empty Rows</button>
      </div>
    </div>
    <div id="signatureSummary" class="signature-summary">No attendee signatures yet.</div>
  `;

  document.getElementById("attendeeList").insertAdjacentElement("beforebegin", panel);
  document.querySelector(".app-shell")?.addEventListener("input", debounceV05(refreshSignatureSummaryV05, 200));
  document.querySelector(".app-shell")?.addEventListener("change", debounceV05(refreshSignatureSummaryV05, 200));
}

function patchDirectoryDataFlowV05() {
  if (!window.__methodzV05DirectoryCollectPatched && typeof window.collectMeetingData === "function") {
    const originalCollectMeetingData = window.collectMeetingData;
    window.collectMeetingData = function collectMeetingDataV05Directory(options = {}) {
      const meeting = originalCollectMeetingData(options);
      meeting.attendees = (meeting.attendees || []).map((attendee) => ({
        ...attendee,
        signatureStatus: attendee.signature ? "Signed" : "Unsigned",
        signatureMethod: attendee.signature ? "Typed name" : "None"
      }));
      meeting.signatureAudit = buildSignatureAuditV05(meeting.attendees);
      meeting.directorySnapshot = buildDirectorySnapshotV05(meeting.attendees);
      return meeting;
    };
    window.__methodzV05DirectoryCollectPatched = true;
  }

  if (!window.__methodzV05DirectoryAddPatched && typeof window.addAttendee === "function") {
    const originalAddAttendee = window.addAttendee;
    window.addAttendee = function addAttendeeV05Directory(data = {}) {
      originalAddAttendee(data);
      refreshSignatureSummaryV05();
    };
    window.__methodzV05DirectoryAddPatched = true;
  }

  if (!window.__methodzV05DirectoryPopulatePatched && typeof window.populateForm === "function") {
    const originalPopulateForm = window.populateForm;
    window.populateForm = function populateFormV05Directory(record, options = {}) {
      originalPopulateForm(record, options);
      refreshSignatureSummaryV05();
    };
    window.__methodzV05DirectoryPopulatePatched = true;
  }

  if (!window.__methodzV05DirectoryResetPatched && typeof window.resetForm === "function") {
    const originalResetForm = window.resetForm;
    window.resetForm = function resetFormV05Directory() {
      originalResetForm();
      refreshSignatureSummaryV05();
    };
    window.__methodzV05DirectoryResetPatched = true;
  }

  if (!window.__methodzV05DirectoryTextPatched && typeof window.createPlainTextMeeting === "function") {
    const originalCreatePlainTextMeeting = window.createPlainTextMeeting;
    window.createPlainTextMeeting = function createPlainTextMeetingV05Directory(meeting) {
      const baseText = originalCreatePlainTextMeeting(meeting);
      return `${baseText}\nSIGNATURE AUDIT\n${formatSignatureAuditForTextV05(meeting.signatureAudit || buildSignatureAuditV05(meeting.attendees || []))}\n`;
    };
    window.__methodzV05DirectoryTextPatched = true;
  }

  if (!window.__methodzV05DirectoryMinutesPatched && typeof window.renderMinutesHtml === "function") {
    const originalRenderMinutesHtml = window.renderMinutesHtml;
    window.renderMinutesHtml = function renderMinutesHtmlV05Directory(meeting, options = {}) {
      const html = originalRenderMinutesHtml(meeting, options);
      const section = renderSignatureAuditMinutesSectionV05(meeting.signatureAudit || buildSignatureAuditV05(meeting.attendees || []));
      return html.includes("</article>") ? html.replace("</article>", `${section}</article>`) : `${html}${section}`;
    };
    window.__methodzV05DirectoryMinutesPatched = true;
  }
}

function saveCurrentAttendeesToDirectoryV05() {
  const entries = collectCurrentAttendeeDirectoryEntriesV05();
  if (!entries.length) {
    alert("Add at least one attendee name before saving directory presets.");
    return;
  }

  const directory = getDirectoryEntriesV05();
  const byKey = new Map(directory.map((entry) => [directoryKeyV05(entry), entry]));

  entries.forEach((entry) => {
    byKey.set(directoryKeyV05(entry), {
      ...byKey.get(directoryKeyV05(entry)),
      ...entry,
      updatedAt: new Date().toISOString()
    });
  });

  setDirectoryEntriesV05(Array.from(byKey.values()));
  alert(`Saved ${entries.length} attendee preset(s).`);
}

function collectCurrentAttendeeDirectoryEntriesV05() {
  return Array.from(document.querySelectorAll(".attendee"))
    .map((item) => {
      const name = readScopedDirectoryV05(item, ".attendee-name");
      const organizationRole = readScopedDirectoryV05(item, ".attendee-role");
      const attendanceType = readScopedDirectoryV05(item, ".attendee-type") || "In Person";
      if (!name) return null;

      return {
        id: `person-${slugV05(name)}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name,
        organizationRole,
        attendanceType,
        notes: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
    })
    .filter(Boolean);
}

function addSelectedDirectoryAttendeeV05() {
  const entry = getSelectedDirectoryEntryV05();
  if (!entry) {
    alert("Choose a saved attendee first.");
    return;
  }

  if (typeof window.addAttendee === "function") {
    window.addAttendee({
      name: entry.name,
      organizationRole: entry.organizationRole,
      attendanceType: entry.attendanceType,
      signature: ""
    });
  }

  if (typeof window.scheduleDraftSave === "function") window.scheduleDraftSave();
  refreshSignatureSummaryV05();
}

function deleteSelectedDirectoryAttendeeV05() {
  const entry = getSelectedDirectoryEntryV05();
  if (!entry) {
    alert("Choose a saved attendee first.");
    return;
  }

  const proceed = confirm(`Delete attendee preset for ${entry.name}? Saved meeting records will not be changed.`);
  if (!proceed) return;

  setDirectoryEntriesV05(getDirectoryEntriesV05().filter((item) => item.id !== entry.id));
}

function getSelectedDirectoryEntryV05() {
  const id = document.getElementById("attendeeDirectorySelect")?.value || "";
  return getDirectoryEntriesV05().find((entry) => entry.id === id);
}

function getDirectoryEntriesV05() {
  const key = getDirectoryStorageKeyV05();
  try {
    const entries = JSON.parse(localStorage.getItem(key)) || [];
    return Array.isArray(entries) ? entries : [];
  } catch (error) {
    console.error("Unable to read attendee directory", error);
    return [];
  }
}

function setDirectoryEntriesV05(entries) {
  localStorage.setItem(getDirectoryStorageKeyV05(), JSON.stringify(entries));
  renderDirectoryOptionsV05();
}

function getDirectoryStorageKeyV05() {
  return window.METHODZ_MEETING_CONFIG?.storageKeys?.directory || "methodzMeetingDirectory";
}

function renderDirectoryOptionsV05() {
  const select = document.getElementById("attendeeDirectorySelect");
  const summary = document.getElementById("directorySummary");
  if (!select) return;

  const entries = getDirectoryEntriesV05().sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  select.innerHTML = entries.length
    ? entries.map((entry) => `<option value="${escapeDirectoryV05(entry.id)}">${escapeDirectoryV05(entry.name)}${entry.organizationRole ? ` - ${escapeDirectoryV05(entry.organizationRole)}` : ""}</option>`).join("")
    : `<option value="">No saved attendees yet</option>`;

  if (summary) summary.textContent = `${entries.length} saved attendee preset(s).`;
}

function exportDirectoryJsonV05() {
  const payload = {
    exportedAt: new Date().toISOString(),
    schemaVersion: window.METHODZ_MEETING_CONFIG?.schemaVersion || "0.5.0",
    directory: getDirectoryEntriesV05()
  };

  if (typeof window.downloadBlob === "function") {
    window.downloadBlob(JSON.stringify(payload, null, 2), `methodz-attendee-directory-${todayDirectoryV05()}.json`, "application/json");
  }
}

function exportDirectoryCsvV05() {
  const rows = getDirectoryEntriesV05().map((entry) => [entry.name, entry.organizationRole, entry.attendanceType, entry.notes, entry.updatedAt]);
  const csv = [["Name", "Organization / Role", "Attendance Type", "Notes", "Updated At"], ...rows]
    .map((row) => row.map(csvCellDirectoryV05).join(","))
    .join("\n");

  if (typeof window.downloadBlob === "function") {
    window.downloadBlob(csv, `methodz-attendee-directory-${todayDirectoryV05()}.csv`, "text/csv");
  }
}

function importDirectoryJsonV05(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.directory;
      if (!Array.isArray(incoming)) {
        alert("Directory import must contain an array or a directory array.");
        return;
      }

      const current = getDirectoryEntriesV05();
      const byKey = new Map(current.map((entry) => [directoryKeyV05(entry), entry]));
      let imported = 0;

      incoming.forEach((entry) => {
        if (!entry || typeof entry !== "object" || !entry.name) return;
        const safeEntry = {
          id: entry.id || `person-${slugV05(entry.name)}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          name: entry.name || "",
          organizationRole: entry.organizationRole || entry.role || "",
          attendanceType: entry.attendanceType || "In Person",
          notes: entry.notes || "",
          createdAt: entry.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        byKey.set(directoryKeyV05(safeEntry), safeEntry);
        imported++;
      });

      setDirectoryEntriesV05(Array.from(byKey.values()));
      alert(`Imported ${imported} attendee preset(s).`);
    } catch (error) {
      console.error(error);
      alert("Could not import that directory JSON file.");
    } finally {
      event.target.value = "";
    }
  };

  reader.readAsText(file);
}

function fillUnsignedSignaturesFromNamesV05() {
  let filled = 0;
  document.querySelectorAll(".attendee").forEach((item) => {
    const nameInput = item.querySelector(".attendee-name");
    const signatureInput = item.querySelector(".attendee-signature");
    if (nameInput?.value.trim() && signatureInput && !signatureInput.value.trim()) {
      signatureInput.value = nameInput.value.trim();
      filled++;
    }
  });

  refreshSignatureSummaryV05();
  if (typeof window.scheduleDraftSave === "function") window.scheduleDraftSave();
  alert(`Filled ${filled} unsigned signature field(s).`);
}

function removeEmptyAttendeesV05() {
  let removed = 0;
  document.querySelectorAll(".attendee").forEach((item) => {
    const name = readScopedDirectoryV05(item, ".attendee-name");
    const role = readScopedDirectoryV05(item, ".attendee-role");
    const signature = readScopedDirectoryV05(item, ".attendee-signature");
    if (!name && !role && !signature && document.querySelectorAll(".attendee").length > 1) {
      item.remove();
      removed++;
    }
  });

  refreshSignatureSummaryV05();
  if (typeof window.scheduleDraftSave === "function") window.scheduleDraftSave();
  alert(`Removed ${removed} empty attendee row(s).`);
}

function refreshSignatureSummaryV05() {
  const summary = document.getElementById("signatureSummary");
  if (!summary) return;

  const attendees = Array.from(document.querySelectorAll(".attendee")).map((item) => ({
    name: readScopedDirectoryV05(item, ".attendee-name"),
    signature: readScopedDirectoryV05(item, ".attendee-signature")
  })).filter((person) => person.name || person.signature);

  const signed = attendees.filter((person) => person.signature).length;
  const unsigned = attendees.filter((person) => person.name && !person.signature).length;
  summary.className = `signature-summary ${unsigned ? "has-warnings" : signed ? "is-clean" : ""}`;
  summary.textContent = `${signed}/${attendees.length} attendee(s) signed. ${unsigned} named attendee(s) still unsigned.`;
}

function buildSignatureAuditV05(attendees) {
  const list = attendees || [];
  const named = list.filter((person) => person.name).length;
  const signed = list.filter((person) => person.signature).length;
  const unsignedNamed = list.filter((person) => person.name && !person.signature).length;

  return {
    totalAttendees: list.length,
    namedAttendees: named,
    signedAttendees: signed,
    unsignedNamedAttendees: unsignedNamed,
    completed: unsignedNamed === 0 && signed > 0,
    generatedAt: new Date().toISOString()
  };
}

function buildDirectorySnapshotV05(attendees) {
  return (attendees || []).map((person) => ({
    name: person.name || "",
    organizationRole: person.organizationRole || "",
    attendanceType: person.attendanceType || "",
    signatureStatus: person.signature ? "Signed" : "Unsigned"
  }));
}

function formatSignatureAuditForTextV05(audit) {
  return [
    `Total attendees: ${audit.totalAttendees}`,
    `Named attendees: ${audit.namedAttendees}`,
    `Signed attendees: ${audit.signedAttendees}`,
    `Unsigned named attendees: ${audit.unsignedNamedAttendees}`,
    `Completed: ${audit.completed ? "Yes" : "No"}`,
    `Generated: ${audit.generatedAt}`
  ].join("\n");
}

function renderSignatureAuditMinutesSectionV05(audit) {
  return `
    <section>
      <h2>Signature Audit</h2>
      <dl>
        <dt>Total attendees</dt><dd>${escapeDirectoryV05(audit.totalAttendees)}</dd>
        <dt>Named attendees</dt><dd>${escapeDirectoryV05(audit.namedAttendees)}</dd>
        <dt>Signed attendees</dt><dd>${escapeDirectoryV05(audit.signedAttendees)}</dd>
        <dt>Unsigned named attendees</dt><dd>${escapeDirectoryV05(audit.unsignedNamedAttendees)}</dd>
        <dt>Completed</dt><dd>${audit.completed ? "Yes" : "No"}</dd>
      </dl>
    </section>
  `;
}

function directoryKeyV05(entry) {
  return `${slugV05(entry.name || "")}|${slugV05(entry.organizationRole || "")}`;
}

function readScopedDirectoryV05(root, selector) {
  const element = root.querySelector(selector);
  return element ? element.value.trim() : "";
}

function csvCellDirectoryV05(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function slugV05(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "entry";
}

function escapeDirectoryV05(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function todayDirectoryV05() {
  return new Date().toISOString().slice(0, 10);
}

function debounceV05(fn, delay) {
  let timer = null;
  return function debouncedV05(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}
