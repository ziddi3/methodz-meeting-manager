/* Read-only browser presentation for the Methodz Meeting Manager Workspace Home. */
(function initializeMethodzWorkspaceHome(global) {
  "use strict";

  const VERSION = "1.0.0";
  let currentSnapshot = null;

  const byId = (id) => document.getElementById(id);

  function setStatus(message, tone = "neutral") {
    const status = byId("workspaceSnapshotStatus");
    if (!status) return;
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function readLocalRecordsFailClosed() {
    const key = global.METHODZ_MEETING_CONFIG?.storageKeys?.records || "methodzMeetingRecords";
    const raw = global.localStorage.getItem(key);
    if (raw === null || raw === "") return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("Saved meeting storage is not an array.");
    return parsed;
  }

  function setMetric(id, value) {
    const node = byId(id);
    if (node) node.textContent = String(value);
  }

  function resetMetrics() {
    [
      "snapshotActive",
      "snapshotCompleted",
      "snapshotArchived",
      "snapshotUpcoming",
      "snapshotUnscheduled",
      "snapshotOverdue",
      "snapshotUnassigned",
      "snapshotNeedsScheduling"
    ].forEach((id) => setMetric(id, "—"));
    const bounds = byId("workspaceSnapshotBounds");
    if (bounds) bounds.hidden = true;
  }

  function renderSnapshot(snapshot) {
    setMetric("snapshotActive", snapshot.counts.activeMeetings);
    setMetric("snapshotCompleted", snapshot.counts.completedMeetings);
    setMetric("snapshotArchived", snapshot.counts.archivedMeetings);
    setMetric("snapshotUpcoming", snapshot.counts.upcomingMeetings);
    setMetric("snapshotUnscheduled", snapshot.counts.unscheduledMeetings);
    setMetric("snapshotOverdue", snapshot.counts.overdueTasks);
    setMetric("snapshotUnassigned", snapshot.counts.unassignedTasks);
    setMetric("snapshotNeedsScheduling", snapshot.counts.needsSchedulingTasks);

    const bounds = byId("workspaceSnapshotBounds");
    if (bounds) {
      const warnings = [];
      if (snapshot.truncated.records) warnings.push(`record processing reached the ${snapshot.bounds.maximumRecords}-record bound`);
      if (snapshot.truncated.taskLists) warnings.push(`${snapshot.truncated.taskListsTruncated} task list${snapshot.truncated.taskListsTruncated === 1 ? "" : "s"} reached the ${snapshot.bounds.maximumTasksPerRecord}-task bound`);
      bounds.hidden = warnings.length === 0;
      bounds.textContent = warnings.length
        ? `Snapshot is intentionally bounded: ${warnings.join("; ")}. Open the detailed workspaces before treating these counts as complete.`
        : "";
    }

    setStatus(
      `Snapshot refreshed for ${snapshot.counts.savedRecords} saved record${snapshot.counts.savedRecords === 1 ? "" : "s"}. Counts only are retained by this view.`,
      "success"
    );
  }

  function refreshSnapshot() {
    const core = global.MethodzWorkspaceHomeCore;
    if (!core || typeof core.buildWorkspaceSnapshot !== "function") {
      currentSnapshot = null;
      resetMetrics();
      setStatus("Workspace snapshot core is unavailable. No records were changed.", "error");
      return null;
    }

    try {
      const records = readLocalRecordsFailClosed();
      currentSnapshot = core.buildWorkspaceSnapshot(records, {
        maximumRecords: 1000,
        maximumTasksPerRecord: 250
      });
      renderSnapshot(currentSnapshot);
      return currentSnapshot;
    } catch (error) {
      console.error("Unable to build Workspace Home snapshot", error);
      currentSnapshot = null;
      resetMetrics();
      setStatus("Saved meeting records could not be read. No records were changed or replaced.", "error");
      return null;
    }
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator) || global.location.protocol === "file:") return;
    navigator.serviceWorker.register("service-worker.js").catch((error) => {
      console.warn("Workspace Home service worker registration was unavailable", error);
    });
  }

  function initialize() {
    resetMetrics();
    byId("refreshWorkspaceSnapshot")?.addEventListener("click", refreshSnapshot);
    registerServiceWorker();
  }

  global.MethodzWorkspaceHomeV1619 = Object.freeze({
    version: VERSION,
    refreshSnapshot,
    getCurrentSnapshot() {
      return currentSnapshot;
    }
  });

  document.addEventListener("DOMContentLoaded", initialize, { once: true });
})(window);
