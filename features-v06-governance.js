/* Methodz Meeting Manager v0.6 duplicate detection and sync-readiness tools. */

window.addEventListener("DOMContentLoaded", initializeV06Governance);

function initializeV06Governance() {
  installDuplicateReviewPanelV06();
  installSyncReadinessPanelV06();
  patchGovernanceDataFlowV06();
  refreshDuplicateReviewV06();
  refreshSyncStatusV06();
}

function installDuplicateReviewPanelV06() {
  const savedCard = document.getElementById("savedRecords")?.closest(".card");
  if (!savedCard || document.getElementById("duplicateReviewPanelV06")) return;
  const panel = document.createElement("section");
  panel.id = "duplicateReviewPanelV06";
  panel.className = "card v06-card duplicate-review-card";
  panel.innerHTML = `
    <div class="section-subheader">
      <div><h2>Duplicate Record Review</h2><p class="helper-text">Find likely duplicate meeting records before exporting, importing, or syncing.</p></div>
      <div class="button-row"><button type="button" onclick="refreshDuplicateReviewV06()">Scan Records</button><button type="button" onclick="exportDuplicateReportV06()">Export Report</button></div>
    </div>
    <div id="duplicateReviewBodyV06"></div>
  `;
  savedCard.insertAdjacentElement("beforebegin", panel);
}

function installSyncReadinessPanelV06() {
  const savedCard = document.getElementById("savedRecords")?.closest(".card");
  if (!savedCard || document.getElementById("syncReadinessPanelV06")) return;
  const panel = document.createElement("section");
  panel.id = "syncReadinessPanelV06";
  panel.className = "card v06-card sync-readiness-card";
  panel.innerHTML = `
    <div class="section-subheader">
      <div><h2>Local Sync Readiness</h2><p class="helper-text">Prepare a cloud-sync-safe export package while the app still runs offline.</p></div>
      <div class="button-row"><button type="button" onclick="exportSyncPackageV06()">Export Sync Package</button><button type="button" onclick="queueAllRecordsForSyncV06()">Mark All Queued</button><button type="button" onclick="clearSyncQueueV06()">Clear Queue</button></div>
    </div>
    <div id="syncReadinessBodyV06"></div>
  `;
  savedCard.insertAdjacentElement("beforebegin", panel);
}

function patchGovernanceDataFlowV06() {
  if (!window.__methodzV06SaveGovernancePatched && typeof window.saveMeeting === "function") {
    const originalSaveMeeting = window.saveMeeting;
    window.saveMeeting = function saveMeetingV06Governance() {
      const before = mapRecordVersionsV06();
      originalSaveMeeting();
      const after = typeof window.getRecords === "function" ? window.getRecords() : [];
      after.forEach((record) => {
        const currentVersion = record.updatedAt || record.savedAt || "";
        if (!before.has(record.id) || before.get(record.id) !== currentVersion) enqueueSyncChangeV06("upsert", record.id, record.title || "Untitled Meeting");
      });
      refreshDuplicateReviewV06();
      refreshSyncStatusV06();
    };
    window.__methodzV06SaveGovernancePatched = true;
  }

  if (!window.__methodzV06DeleteGovernancePatched && typeof window.deleteRecord === "function") {
    const originalDeleteRecord = window.deleteRecord;
    window.deleteRecord = function deleteRecordV06Governance(recordId) {
      const before = new Set((typeof window.getRecords === "function" ? window.getRecords() : []).map((record) => record.id));
      const record = (typeof window.getRecords === "function" ? window.getRecords() : []).find((item) => item.id === recordId);
      originalDeleteRecord(recordId);
      const after = new Set((typeof window.getRecords === "function" ? window.getRecords() : []).map((item) => item.id));
      if (before.has(recordId) && !after.has(recordId)) enqueueSyncChangeV06("delete", recordId, record?.title || "Deleted meeting");
      refreshDuplicateReviewV06();
      refreshSyncStatusV06();
    };
    window.__methodzV06DeleteGovernancePatched = true;
  }

  if (!window.__methodzV06SetRecordsGovernancePatched && typeof window.setRecords === "function") {
    const originalSetRecords = window.setRecords;
    window.setRecords = function setRecordsV06Governance(records) {
      originalSetRecords(records);
      setTimeout(() => { refreshDuplicateReviewV06(); refreshSyncStatusV06(); }, 0);
    };
    window.__methodzV06SetRecordsGovernancePatched = true;
  }

  if (!window.__methodzV06ImportNormalizationPatched && typeof window.normalizeImportedRecord === "function") {
    const originalNormalizeImportedRecord = window.normalizeImportedRecord;
    window.normalizeImportedRecord = function normalizeImportedRecordV06(record) {
      const normalized = originalNormalizeImportedRecord(record);
      return {
        ...normalized,
        schemaVersion: record.schemaVersion || window.METHODZ_MEETING_CONFIG?.schemaVersion || "0.6.0",
        numbering: record.numbering || normalized.numbering || null,
        syncMeta: record.syncMeta || normalized.syncMeta || null,
        duplicateReview: record.duplicateReview || normalized.duplicateReview || null
      };
    };
    window.__methodzV06ImportNormalizationPatched = true;
  }
}

function refreshDuplicateReviewV06() {
  const body = document.getElementById("duplicateReviewBodyV06");
  if (!body) return;
  const groups = findDuplicateGroupsV06();
  const duplicateRecords = new Set(groups.flatMap((group) => group.records.map((record) => record.id))).size;
  if (!groups.length) {
    body.innerHTML = `<div class="metric-grid"><div><strong>0</strong><span>duplicate groups</span></div><div><strong>0</strong><span>records to review</span></div></div><p>No likely duplicates found in saved records.</p>`;
    return;
  }
  body.innerHTML = `
    <div class="metric-grid">
      <div><strong>${groups.length}</strong><span>duplicate groups</span></div>
      <div><strong>${duplicateRecords}</strong><span>records to review</span></div>
      <div><strong>${groups.filter((group) => group.reason === "same title/date").length}</strong><span>same title/date</span></div>
      <div><strong>${groups.filter((group) => group.reason === "same date/attendees").length}</strong><span>same attendees/date</span></div>
    </div>
    ${groups.map(renderDuplicateGroupV06).join("")}
  `;
}

function renderDuplicateGroupV06(group, index) {
  return `
    <div class="duplicate-group">
      <h3>Possible Duplicate Group ${index + 1}</h3>
      <p class="helper-text">Reason: ${escapeGovernanceV06(group.reason)}.</p>
      <table class="compact-table">
        <thead><tr><th>#</th><th>Title</th><th>Date</th><th>Status</th><th>Updated</th><th></th></tr></thead>
        <tbody>${group.records.map((record) => `
          <tr>
            <td>${escapeGovernanceV06(record.meetingNumber || "?")}</td>
            <td>${escapeGovernanceV06(record.title || "Untitled Meeting")}</td>
            <td>${escapeGovernanceV06(record.date || "No date")}</td>
            <td>${escapeGovernanceV06(record.status || "No status")}</td>
            <td>${escapeGovernanceV06(formatGovernanceDateV06(record.updatedAt || record.savedAt))}</td>
            <td><button type="button" onclick="openDuplicateRecordV06('${escapeGovernanceV06(record.id)}')">Open</button></td>
          </tr>`).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function findDuplicateGroupsV06() {
  const records = typeof window.getRecords === "function" ? window.getRecords() : [];
  const groups = [];
  const seenKeys = new Set();
  groupRecordsV06(records, duplicateTitleDateKeyV06).forEach((matches, key) => {
    if (matches.length > 1) {
      groups.push({ key, reason: "same title/date", records: sortDuplicateRecordsV06(matches) });
      seenKeys.add(key);
    }
  });
  groupRecordsV06(records, duplicateAttendeeDateKeyV06).forEach((matches, key) => {
    if (matches.length > 1 && !seenKeys.has(key)) groups.push({ key, reason: "same date/attendees", records: sortDuplicateRecordsV06(matches) });
  });
  return groups;
}

function groupRecordsV06(records, keyFn) {
  const map = new Map();
  records.forEach((record) => {
    const key = keyFn(record);
    if (!key) return;
    map.set(key, [...(map.get(key) || []), record]);
  });
  return map;
}

function duplicateTitleDateKeyV06(record) {
  const title = normalizeDuplicateTextV06(record.title);
  const date = record.date || "";
  return title && date ? `title-date|${date}|${title}` : "";
}

function duplicateAttendeeDateKeyV06(record) {
  const date = record.date || "";
  const attendees = (record.attendees || []).map((attendee) => normalizeDuplicateTextV06(attendee.name)).filter(Boolean).sort().join("|");
  return date && attendees ? `attendees-date|${date}|${attendees}` : "";
}

function normalizeDuplicateTextV06(value) {
  return String(value || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ");
}

function sortDuplicateRecordsV06(records) {
  return records.slice().sort((a, b) => (b.updatedAt || b.savedAt || "").localeCompare(a.updatedAt || a.savedAt || ""));
}

function openDuplicateRecordV06(recordId) {
  if (typeof window.loadRecordForEditing === "function") window.loadRecordForEditing(recordId);
}

function exportDuplicateReportV06() {
  const payload = { exportedAt: new Date().toISOString(), schemaVersion: window.METHODZ_MEETING_CONFIG?.schemaVersion || "0.6.0", duplicateGroups: findDuplicateGroupsV06() };
  if (typeof window.downloadBlob === "function") window.downloadBlob(JSON.stringify(payload, null, 2), `methodz-duplicate-report-${todayGovernanceV06()}.json`, "application/json");
}

function refreshSyncStatusV06() {
  const body = document.getElementById("syncReadinessBodyV06");
  if (!body) return;
  const records = typeof window.getRecords === "function" ? window.getRecords() : [];
  const queue = getSyncQueueV06();
  const duplicateGroups = findDuplicateGroupsV06();
  const lastExport = localStorage.getItem(getSyncLastExportStorageKeyV06()) || "";
  body.innerHTML = `
    <div class="metric-grid">
      <div><strong>${records.length}</strong><span>saved records</span></div>
      <div><strong>${queue.length}</strong><span>queued changes</span></div>
      <div><strong>${duplicateGroups.length}</strong><span>duplicate groups</span></div>
      <div><strong>${lastExport ? formatGovernanceDateV06(lastExport) : "Never"}</strong><span>last sync export</span></div>
    </div>
    <p class="helper-text">This is a local export adapter stub. It does not send data anywhere; it prepares a clean JSON package for future Firebase, Supabase, CRM, Drive, or Methodz API sync.</p>
  `;
}

function exportSyncPackageV06() {
  const payload = {
    exportedAt: new Date().toISOString(),
    adapterVersion: "0.6.0-local-export",
    mode: "offline-sync-package",
    appName: window.METHODZ_MEETING_CONFIG?.brand?.appName || "Methodz Meeting Manager",
    schemaVersion: window.METHODZ_MEETING_CONFIG?.schemaVersion || "0.6.0",
    records: typeof window.getRecords === "function" ? window.getRecords() : [],
    duplicateReview: findDuplicateGroupsV06(),
    syncQueue: getSyncQueueV06(),
    numberingSettings: typeof window.getNumberingSettingsV06 === "function" ? window.getNumberingSettingsV06() : null,
    organizationPresets: typeof window.getOrganizationPresetsV06 === "function" ? window.getOrganizationPresetsV06() : [],
    attendeeDirectory: typeof window.getDirectoryEntriesV05 === "function" ? window.getDirectoryEntriesV05() : [],
    customTemplates: getCustomTemplatesForSyncV06()
  };
  localStorage.setItem(getSyncLastExportStorageKeyV06(), payload.exportedAt);
  if (typeof window.downloadBlob === "function") window.downloadBlob(JSON.stringify(payload, null, 2), `methodz-sync-package-${todayGovernanceV06()}.json`, "application/json");
  refreshSyncStatusV06();
}

function queueAllRecordsForSyncV06() {
  const records = typeof window.getRecords === "function" ? window.getRecords() : [];
  records.forEach((record) => enqueueSyncChangeV06("upsert", record.id, record.title || "Untitled Meeting", false));
  saveSyncQueueV06(dedupeSyncQueueV06(getSyncQueueV06()));
  refreshSyncStatusV06();
  alert(`Queued ${records.length} saved record(s) for the next sync export package.`);
}

function clearSyncQueueV06() {
  if (!confirm("Clear the local sync queue? Saved meeting records will not be changed.")) return;
  saveSyncQueueV06([]);
  refreshSyncStatusV06();
}

function enqueueSyncChangeV06(operation, recordId, title, refresh = true) {
  if (!recordId) return;
  const queue = getSyncQueueV06();
  queue.push({ id: `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`, operation, recordId, title, queuedAt: new Date().toISOString() });
  saveSyncQueueV06(dedupeSyncQueueV06(queue));
  if (refresh) refreshSyncStatusV06();
}

function getSyncQueueV06() {
  try {
    const queue = JSON.parse(localStorage.getItem(getSyncQueueStorageKeyV06())) || [];
    return Array.isArray(queue) ? queue : [];
  } catch (error) {
    console.error("Unable to read sync queue", error);
    return [];
  }
}

function saveSyncQueueV06(queue) {
  localStorage.setItem(getSyncQueueStorageKeyV06(), JSON.stringify(queue));
}

function dedupeSyncQueueV06(queue) {
  const byRecord = new Map();
  queue.forEach((item) => byRecord.set(`${item.operation}|${item.recordId}`, item));
  return Array.from(byRecord.values()).sort((a, b) => (b.queuedAt || "").localeCompare(a.queuedAt || ""));
}

function getSyncQueueStorageKeyV06() {
  return window.METHODZ_MEETING_CONFIG?.storageKeys?.syncQueue || "methodzSyncQueue";
}

function getSyncLastExportStorageKeyV06() {
  return window.METHODZ_MEETING_CONFIG?.storageKeys?.syncLastExport || "methodzSyncLastExport";
}

function getCustomTemplatesForSyncV06() {
  const key = window.METHODZ_MEETING_CONFIG?.storageKeys?.templates || "methodzMeetingTemplates";
  try {
    const templates = JSON.parse(localStorage.getItem(key)) || [];
    return Array.isArray(templates) ? templates : [];
  } catch (error) {
    return [];
  }
}

function mapRecordVersionsV06() {
  const records = typeof window.getRecords === "function" ? window.getRecords() : [];
  return new Map(records.map((record) => [record.id, record.updatedAt || record.savedAt || ""]));
}

function formatGovernanceDateV06(value) {
  if (!value) return "not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function todayGovernanceV06() {
  return new Date().toISOString().slice(0, 10);
}

function escapeGovernanceV06(value) {
  return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}
