/* Methodz Meeting Manager operator-controlled Workspace Home browser layer. */
(function initializeMethodzWorkspaceHome(global) {
  "use strict";

  const VERSION = "1.0.0";
  const core = global.MethodzWorkspaceHomeCore;
  if (!core) throw new Error("Workspace Home core is unavailable.");

  function element(id) {
    return document.getElementById(id);
  }

  const refreshButton = element("refreshWorkspaceSnapshot");
  const status = element("workspaceSnapshotStatus");
  const metricElements = Object.freeze({
    activeMeetings: element("metricActive"),
    completedMeetings: element("metricCompleted"),
    archivedMeetings: element("metricArchived"),
    upcomingMeetings: element("metricUpcoming"),
    unscheduledMeetings: element("metricUnscheduled"),
    overdueTasks: element("metricOverdue"),
    unassignedTasks: element("metricUnassigned"),
    needsSchedulingTasks: element("metricNeedsScheduling")
  });

  function recordsKey() {
    return global.METHODZ_MEETING_CONFIG?.storageKeys?.records || "methodzMeetingRecords";
  }

  function readRecordsExplicitly() {
    const raw = global.localStorage.getItem(recordsKey());
    if (raw === null || raw === "") return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("Saved meeting storage is not a record array.");
    return parsed;
  }

  function localToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  }

  function setMetricValues(counts) {
    Object.entries(metricElements).forEach(([key, node]) => {
      if (node) node.textContent = String(counts[key] ?? 0);
    });
  }

  function setStatus(message, state) {
    if (!status) return;
    status.textContent = message;
    status.dataset.state = state || "ready";
  }

  function refreshSnapshot() {
    if (!refreshButton) return;
    refreshButton.disabled = true;
    setStatus("Reading browser-local meeting records for an aggregate snapshot…", "working");
    try {
      const records = readRecordsExplicitly();
      const snapshot = core.buildWorkspaceSnapshot(records, {
        today: localToday(),
        maximumRecords: 2000,
        maximumTasksPerRecord: 500
      });
      setMetricValues(snapshot.counts);
      const truncation = snapshot.truncation.records || snapshot.truncation.taskLists > 0;
      const coverage = `Scanned ${snapshot.counts.scannedRecords} of ${snapshot.counts.savedRecords} saved records and ${snapshot.counts.scannedTasks} bounded task entries.`;
      setStatus(
        truncation
          ? `${coverage} Snapshot limits were reached, so these signals are partial and must not be treated as complete.`
          : `${coverage} Counts only; no meeting identity or meeting text is retained by the snapshot.`,
        truncation ? "warning" : "ready"
      );
      global.MethodzWorkspaceHome.lastSnapshot = snapshot;
    } catch (error) {
      setStatus("Workspace snapshot unavailable because browser-local meeting storage could not be read as a valid record array.", "error");
      global.MethodzWorkspaceHome.lastSnapshot = null;
      console.error("Unable to build Methodz Workspace Home snapshot", error);
    } finally {
      refreshButton.disabled = false;
    }
  }

  if (refreshButton) refreshButton.addEventListener("click", refreshSnapshot);

  if ("serviceWorker" in navigator && global.location.protocol !== "file:") {
    global.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // The Workspace Home remains fully usable when service-worker registration is unavailable.
      });
    }, { once: true });
  }

  global.MethodzWorkspaceHome = {
    version: VERSION,
    lastSnapshot: null,
    refreshSnapshot
  };
})(window);
