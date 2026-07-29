/* Methodz Meeting Manager v1.6.12 explicit workspace capacity and performance rehearsal browser layer. */
(function initializeWorkspaceCapacityV1612(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.workspaceCapacity || {};
  const Capacity = global.MethodzWorkspaceCapacityCoreV1612;
  const Review = global.MethodzMeetingReviewCoreV1611;
  let currentCapacityReport = null;
  let currentPerformanceReport = null;

  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const boundedInteger = (value, fallback, minimum, maximum) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.trunc(numeric)));
  };
  const formatBytes = (value) => {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes < 0) return "Unavailable";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  function insertPanel() {
    if (document.getElementById("workspaceCapacityPanelV1612")) return;
    const anchor = document.getElementById("followUpReviewPanelV1611") || document.getElementById("savedRecordsPanelV1610");
    if (!anchor) return;
    const panel = document.createElement("section");
    panel.id = "workspaceCapacityPanelV1612";
    panel.className = "card workspace-capacity-v1612";
    panel.innerHTML = `
      <p class="eyebrow">Explicit Local Rehearsal</p>
      <h2>Workspace Capacity</h2>
      <p class="helper-text">Measure aggregate browser-local usage and rehearse a large Follow-Up Review entirely in memory. Nothing is cleaned, deleted, synchronized, saved, or changed automatically.</p>
      <div id="workspaceCapacityMetricsV1612" class="workspace-capacity-metrics-v1612">
        <div><strong>Not run</strong><span>Capacity status</span></div>
      </div>
      <div id="workspaceCapacityCategoriesV1612" class="workspace-capacity-categories-v1612"></div>
      <div class="workspace-capacity-controls-v1612">
        <button id="runWorkspaceCapacityV1612" type="button">Run Capacity Check</button>
        <label for="workspaceSyntheticRecordsV1612">Synthetic records
          <input id="workspaceSyntheticRecordsV1612" type="number" min="1" max="${escapeHtml(settings.maximumSyntheticRecords || 5000)}" step="1" value="${escapeHtml(settings.defaultSyntheticRecords || 1000)}" inputmode="numeric" />
        </label>
        <label for="workspaceSyntheticTasksV1612">Tasks per record
          <input id="workspaceSyntheticTasksV1612" type="number" min="1" max="${escapeHtml(settings.maximumSyntheticTasksPerRecord || 20)}" step="1" value="${escapeHtml(settings.defaultSyntheticTasksPerRecord || 4)}" inputmode="numeric" />
        </label>
        <button id="runWorkspacePerformanceV1612" type="button">Run In-Memory Rehearsal</button>
        <button id="downloadWorkspaceCapacityV1612" type="button" disabled>Download Metadata Report</button>
      </div>
      <p id="workspaceCapacityStatusV1612" class="helper-text" aria-live="polite">No capacity or performance rehearsal has run.</p>
      <div id="workspaceCapacityRecommendationsV1612" class="workspace-capacity-recommendations-v1612"></div>`;
    anchor.insertAdjacentElement("afterend", panel);
  }

  function storageSnapshot() {
    const snapshot = {};
    try {
      for (let index = 0; index < global.localStorage.length; index += 1) {
        const key = global.localStorage.key(index);
        if (key === null) continue;
        snapshot[key] = global.localStorage.getItem(key) || "";
      }
    } catch (error) {
      console.warn("Unable to read browser-local capacity snapshot", error);
    }
    return snapshot;
  }

  async function browserStorageEstimate() {
    try {
      if (!global.navigator?.storage?.estimate) return {};
      const estimate = await global.navigator.storage.estimate();
      return { browserUsageBytes: estimate?.usage, quotaBytes: estimate?.quota };
    } catch (error) {
      console.warn("Browser storage estimate unavailable", error);
      return {};
    }
  }

  function renderCapacity() {
    const metrics = document.getElementById("workspaceCapacityMetricsV1612");
    const categories = document.getElementById("workspaceCapacityCategoriesV1612");
    const recommendations = document.getElementById("workspaceCapacityRecommendationsV1612");
    if (!currentCapacityReport) return;
    const report = currentCapacityReport;
    const utilization = report.utilizationPercent === null ? "Quota unavailable" : `${report.utilizationPercent}%`;
    if (metrics) metrics.innerHTML = [
      [report.status, "Capacity status"],
      [formatBytes(report.bytes.measuredLocalStorage), "Measured localStorage"],
      [formatBytes(report.bytes.browserReportedOriginUsage), "Browser origin usage"],
      [utilization, "Quota utilization"],
      [report.counts.scannedEntries, "Entries scanned"]
    ].map(([value, label]) => `<div><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`).join("");
    if (categories) categories.innerHTML = report.categories.length
      ? report.categories.map((category) => `<div><span>${escapeHtml(category.label)}</span><strong>${escapeHtml(category.entries)} · ${escapeHtml(formatBytes(category.bytes))}</strong></div>`).join("")
      : "<p>No browser-local entries were measured.</p>";
    if (recommendations) recommendations.innerHTML = `<ul>${report.recommendations.map((item) => `<li>${escapeHtml(item.message)}</li>`).join("")}</ul>`;
  }

  function renderPerformance() {
    const status = document.getElementById("workspaceCapacityStatusV1612");
    if (!status || !currentPerformanceReport) return;
    const report = currentPerformanceReport;
    const throughput = report.throughputTasksPerSecond === null ? "instantaneous timer result" : `${report.throughputTasksPerSecond.toLocaleString()} tasks/second`;
    status.textContent = `In-memory rehearsal ${report.status}: ${report.counts.syntheticRecords.toLocaleString()} records and ${report.counts.syntheticTasks.toLocaleString()} tasks classified in ${report.durationMs} ms (${throughput}). No synthetic record was stored.`;
  }

  function updateDownloadState() {
    const button = document.getElementById("downloadWorkspaceCapacityV1612");
    if (button) button.disabled = !currentCapacityReport && !currentPerformanceReport;
  }

  async function runWorkspaceCapacityCheckV1612() {
    const status = document.getElementById("workspaceCapacityStatusV1612");
    if (status) status.textContent = "Measuring aggregate browser-local capacity without changing stored data...";
    const estimate = await browserStorageEstimate();
    currentCapacityReport = Capacity.buildCapacityReport(storageSnapshot(), {
      ...estimate,
      maximumEntries: settings.maximumStorageEntries,
      softBudgetBytes: settings.softBudgetBytes,
      warningPercent: settings.warningPercent,
      criticalPercent: settings.criticalPercent
    });
    renderCapacity();
    if (status) status.textContent = `Capacity check complete: ${currentCapacityReport.status}. ${currentCapacityReport.counts.scannedEntries} browser-local entr${currentCapacityReport.counts.scannedEntries === 1 ? "y" : "ies"} measured. No cleanup or record mutation occurred.`;
    if (currentPerformanceReport) renderPerformance();
    updateDownloadState();
    return currentCapacityReport;
  }

  function runWorkspacePerformanceRehearsalV1612() {
    const status = document.getElementById("workspaceCapacityStatusV1612");
    const recordInput = document.getElementById("workspaceSyntheticRecordsV1612");
    const taskInput = document.getElementById("workspaceSyntheticTasksV1612");
    const recordCount = boundedInteger(recordInput?.value, settings.defaultSyntheticRecords || 1000, 1, settings.maximumSyntheticRecords || 5000);
    const tasksPerRecord = boundedInteger(taskInput?.value, settings.defaultSyntheticTasksPerRecord || 4, 1, settings.maximumSyntheticTasksPerRecord || 20);
    if (recordInput) recordInput.value = String(recordCount);
    if (taskInput) taskInput.value = String(tasksPerRecord);
    if (status) status.textContent = "Running bounded synthetic review in memory...";
    const storageEntriesBefore = (() => { try { return global.localStorage.length; } catch (error) { return null; } })();
    currentPerformanceReport = Capacity.runFollowUpPerformanceRehearsal(Review, {
      recordCount,
      tasksPerRecord,
      targetDurationMs: settings.performanceTargetMs,
      maximumReviewItems: config.followUpReview?.maximumItems || 500
    });
    const storageEntriesAfter = (() => { try { return global.localStorage.length; } catch (error) { return null; } })();
    currentPerformanceReport.storageEntryCountStable = storageEntriesBefore === null || storageEntriesAfter === null ? null : storageEntriesBefore === storageEntriesAfter;
    renderPerformance();
    updateDownloadState();
    return currentPerformanceReport;
  }

  function downloadWorkspaceCapacityReportV1612() {
    const report = Capacity.buildMetadataReport(currentCapacityReport, currentPerformanceReport, {
      appShellVersion: config.appShellVersion,
      recordSchemaVersion: config.schemaVersion
    });
    const payload = JSON.stringify(report, null, 2);
    const filename = `methodz-workspace-capacity-${new Date().toISOString().slice(0, 10)}.json`;
    if (typeof global.downloadBlob === "function") return global.downloadBlob(payload, filename, "application/json");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function bindEvents() {
    document.getElementById("runWorkspaceCapacityV1612")?.addEventListener("click", runWorkspaceCapacityCheckV1612);
    document.getElementById("runWorkspacePerformanceV1612")?.addEventListener("click", runWorkspacePerformanceRehearsalV1612);
    document.getElementById("downloadWorkspaceCapacityV1612")?.addEventListener("click", downloadWorkspaceCapacityReportV1612);
  }

  function start() {
    if (settings.enabled === false || !Capacity || !Review) return;
    insertPanel();
    bindEvents();
  }

  global.runWorkspaceCapacityCheckV1612 = runWorkspaceCapacityCheckV1612;
  global.runWorkspacePerformanceRehearsalV1612 = runWorkspacePerformanceRehearsalV1612;
  global.downloadWorkspaceCapacityReportV1612 = downloadWorkspaceCapacityReportV1612;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
