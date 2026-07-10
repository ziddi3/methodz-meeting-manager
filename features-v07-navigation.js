/* Methodz Meeting Manager v0.7 archive navigation and adapter integration. */

window.addEventListener("DOMContentLoaded", initializeV07Navigation);

function initializeV07Navigation() {
  patchCoreStorageThroughAdapterV07();
  installDataAdapterPanelV07();
  installCurrentArchiveButtonV07();
  patchSavedRecordCardsV07();
  refreshDataAdapterStatusV07();
  restoreArchiveEditRequestV07();
}

function patchCoreStorageThroughAdapterV07() {
  if (window.__methodzV07AdapterPatched || !window.MethodzMeetingData) return;

  window.getRecords = function getRecordsV07Adapter() {
    return window.MethodzMeetingData.listRecords();
  };

  window.setRecords = function setRecordsV07Adapter(records) {
    window.MethodzMeetingData.replaceRecords(records);
    if (typeof window.updateStorageStats === "function") window.updateStorageStats();
    setTimeout(() => {
      if (typeof window.refreshDuplicateReviewV06 === "function") window.refreshDuplicateReviewV06();
      if (typeof window.refreshSyncStatusV06 === "function") window.refreshSyncStatusV06();
      if (typeof window.refreshOpenTaskDashboardV04 === "function") window.refreshOpenTaskDashboardV04();
      if (typeof window.refreshAttachmentIndexV05 === "function") window.refreshAttachmentIndexV05();
      refreshDataAdapterStatusV07();
    }, 0);
  };

  window.__methodzV07AdapterPatched = true;
}

function installDataAdapterPanelV07() {
  const savedCard = document.getElementById("savedRecords")?.closest(".card");
  if (!savedCard || document.getElementById("dataAdapterPanelV07")) return;

  const panel = document.createElement("section");
  panel.id = "dataAdapterPanelV07";
  panel.className = "card v07-card adapter-card";
  panel.innerHTML = `
    <div class="section-subheader">
      <div>
        <h2>Data Adapter</h2>
        <p class="helper-text">The app now reads and writes records through a stable adapter contract. Browser local storage remains the active provider.</p>
      </div>
      <div class="adapter-badge" id="dataAdapterBadgeV07">Checking adapter...</div>
    </div>
    <div id="dataAdapterStatusV07"></div>
    <div class="button-row">
      <button type="button" onclick="refreshDataAdapterStatusV07()">Run Health Check</button>
      <button type="button" onclick="exportAdapterSnapshotV07()">Export Adapter Snapshot</button>
    </div>
  `;

  const syncPanel = document.getElementById("syncReadinessPanelV06");
  if (syncPanel) syncPanel.insertAdjacentElement("afterend", panel);
  else savedCard.insertAdjacentElement("beforebegin", panel);
}

function refreshDataAdapterStatusV07() {
  const body = document.getElementById("dataAdapterStatusV07");
  const badge = document.getElementById("dataAdapterBadgeV07");
  if (!body || !window.MethodzMeetingData) return;

  const result = window.MethodzMeetingData.healthCheck();
  const adapters = window.MethodzMeetingData.listAdapters();

  if (badge) {
    badge.textContent = result.ok ? `${result.label} ready` : `${result.label} unavailable`;
    badge.className = `adapter-badge ${result.ok ? "is-ready" : "has-error"}`;
  }

  body.innerHTML = `
    <div class="metric-grid">
      <div><strong>${escapeNavigationV07(result.adapterId || "unknown")}</strong><span>active adapter</span></div>
      <div><strong>${Number(result.records || 0)}</strong><span>records available</span></div>
      <div><strong>${adapters.length}</strong><span>registered adapters</span></div>
      <div><strong>${escapeNavigationV07(window.MethodzMeetingData.version || "0.7.0")}</strong><span>contract version</span></div>
    </div>
    <p class="helper-text">${result.ok
      ? "Adapter health check passed. Future cloud providers can implement the same record operations without changing the meeting form."
      : `Adapter health check failed: ${escapeNavigationV07(result.error || "Unknown storage error")}`}</p>
  `;
}

function exportAdapterSnapshotV07() {
  if (!window.MethodzMeetingData || typeof window.downloadBlob !== "function") return;
  const payload = window.MethodzMeetingData.createExportEnvelope({
    mode: "adapter-snapshot",
    organizationDirectory: typeof window.getOrganizationDirectoryV07 === "function" ? window.getOrganizationDirectoryV07() : []
  });
  window.downloadBlob(
    JSON.stringify(payload, null, 2),
    `methodz-adapter-snapshot-${new Date().toISOString().slice(0, 10)}.json`,
    "application/json"
  );
}

function installCurrentArchiveButtonV07() {
  const quickActions = document.querySelector(".quick-actions");
  if (!quickActions || quickActions.querySelector(".archive-preview-button-v07")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "archive-preview-button-v07";
  button.textContent = "Open Archive Preview";
  button.addEventListener("click", openCurrentMeetingArchiveV07);
  quickActions.appendChild(button);
}

function patchSavedRecordCardsV07() {
  if (window.__methodzV07ArchiveCardsPatched || typeof window.createRecordCard !== "function") return;

  const originalCreateRecordCard = window.createRecordCard;
  window.createRecordCard = function createRecordCardV07(record) {
    const card = originalCreateRecordCard(record);
    const row = card.querySelector(".button-row");
    if (row && !row.querySelector(".archive-page-button-v07")) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "archive-page-button-v07";
      button.textContent = "Archive Page";
      button.addEventListener("click", () => openSavedRecordArchiveV07(record.id));
      row.prepend(button);
    }
    return card;
  };

  window.__methodzV07ArchiveCardsPatched = true;
  if (typeof window.loadSavedRecords === "function") window.loadSavedRecords();
}

function openSavedRecordArchiveV07(recordId) {
  const record = typeof window.getRecords === "function"
    ? window.getRecords().find((item) => item.id === recordId)
    : window.MethodzMeetingData?.getRecord(recordId);

  if (!record) return alert("Record not found.");

  try {
    sessionStorage.setItem("methodzArchiveFallbackRecord", JSON.stringify(record));
  } catch (error) {
    console.warn("Unable to stage archive fallback record", error);
  }

  window.location.href = `archive.html?id=${encodeURIComponent(recordId)}`;
}

function openCurrentMeetingArchiveV07() {
  if (typeof window.collectMeetingData !== "function") return;
  const record = window.collectMeetingData({ keepEmptyRows: false, forceNewId: true });
  record.archivePreview = true;

  try {
    sessionStorage.setItem("methodzArchivePreviewRecord", JSON.stringify(record));
  } catch (error) {
    console.error(error);
    return alert("The current meeting could not be staged for archive preview.");
  }

  window.location.href = "archive.html?preview=current";
}

function restoreArchiveEditRequestV07() {
  let recordId = "";
  try {
    recordId = sessionStorage.getItem("methodzArchiveEditRecordId") || "";
    sessionStorage.removeItem("methodzArchiveEditRecordId");
  } catch (error) {
    console.warn("Unable to read archive edit request", error);
  }

  if (!recordId) return;
  setTimeout(() => {
    if (typeof window.loadRecordForEditing === "function") {
      window.loadRecordForEditing(recordId);
    }
  }, 0);
}

function escapeNavigationV07(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
