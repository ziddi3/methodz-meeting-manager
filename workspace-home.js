/* Explicit, aggregate-only browser presentation for Methodz Meeting Manager Workspace Home. */
(function initializeMethodzWorkspaceHome(global) {
  "use strict";

  const byId = (id) => document.getElementById(id);

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function readLocalRecordsFailClosed() {
    const key = global.METHODZ_MEETING_CONFIG?.storageKeys?.records || "methodzMeetingRecords";
    const raw = global.localStorage.getItem(key);
    if (raw === null || raw === "") return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new TypeError("Saved meeting storage is not an array.");
    return parsed;
  }

  function readRecords() {
    if (global.MethodzMeetingData && typeof global.MethodzMeetingData.listRecords === "function") {
      const adapterId = typeof global.MethodzMeetingData.getAdapterInfo === "function"
        ? global.MethodzMeetingData.getAdapterInfo().id
        : "local-storage";
      if (adapterId === "local-storage") return readLocalRecordsFailClosed();
      const records = global.MethodzMeetingData.listRecords();
      if (!Array.isArray(records)) throw new TypeError("Meeting data adapter did not return an array.");
      return records;
    }
    return readLocalRecordsFailClosed();
  }

  function setStatus(message, tone = "neutral") {
    const status = byId("workspaceSnapshotStatus");
    status.textContent = message;
    status.dataset.tone = tone;
  }

  function metric(label, value, detail) {
    const card = element("article", "workspace-metric");
    card.append(element("strong", "workspace-metric-value", String(value)));
    card.append(element("span", "workspace-metric-label", label));
    if (detail) card.append(element("span", "workspace-metric-detail", detail));
    return card;
  }

  function renderSnapshot(snapshot) {
    const counts = snapshot.counts;
    const metrics = byId("workspaceSnapshotMetrics");
    metrics.replaceChildren(
      metric("Active meetings", counts.activeMeetings, `${counts.upcoming7Days} in next 7 days`),
      metric("Completed meetings", counts.completedMeetings, "Not archived"),
      metric("Archived meetings", counts.archivedMeetings, "Excluded from task totals"),
      metric("Need scheduling", counts.activeUnscheduled, "Active meetings without a valid date"),
      metric("Open follow-up", counts.incompleteTasks, `${counts.overdueTasks} overdue`),
      metric("Unassigned follow-up", counts.unassignedTasks, `${counts.tasksNeedingSchedule} need a valid due date`)
    );

    const coverage = byId("workspaceSnapshotCoverage");
    if (snapshot.complete) {
      coverage.textContent = `Complete bounded scan of ${counts.scannedRecords} saved record${counts.scannedRecords === 1 ? "" : "s"}. ${counts.upcoming30Days} active meeting${counts.upcoming30Days === 1 ? "" : "s"} fall within the next 30 days.`;
    } else {
      const reasons = [];
      if (snapshot.truncation.records) reasons.push("record limit reached");
      if (snapshot.truncation.taskLists) reasons.push(`${snapshot.truncation.taskLists} task list${snapshot.truncation.taskLists === 1 ? "" : "s"} exceeded the per-record limit`);
      coverage.textContent = `Partial bounded snapshot: ${reasons.join("; ")}. Counts may understate the full workspace.`;
    }
  }

  function refreshSnapshot() {
    const core = global.MethodzWorkspaceHomeCore;
    if (!core || typeof core.buildWorkspaceSnapshot !== "function") {
      setStatus("Workspace snapshot core is unavailable.", "error");
      return;
    }

    try {
      const snapshot = core.buildWorkspaceSnapshot(readRecords(), {
        maximumRecords: 1000,
        maximumTasksPerRecord: 250
      });
      renderSnapshot(snapshot);
      setStatus(`Workspace snapshot refreshed. ${snapshot.counts.savedRecords} saved record${snapshot.counts.savedRecords === 1 ? "" : "s"} detected.`, "success");
    } catch (error) {
      console.error("Unable to build Workspace Home snapshot", error);
      byId("workspaceSnapshotMetrics").replaceChildren();
      byId("workspaceSnapshotCoverage").textContent = "";
      setStatus("Saved meeting records could not be read. No records were changed.", "error");
    }
  }

  function initialize() {
    byId("refreshWorkspaceSnapshot").addEventListener("click", refreshSnapshot);
  }

  document.addEventListener("DOMContentLoaded", initialize, { once: true });
})(window);
