/* Methodz Meeting Manager v1.6.1 recovery readiness inspector and dry-run drills. */
(function initializeRecoveryReadinessV16(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const storageKeys = config.storageKeys || {};
  const recoveryConfig = config.workspaceRecovery || {};
  const recoveryLogKey = storageKeys.recoveryDrillLog || "methodzRecoveryDrillLog";
  const preRestoreKey = storageKeys.preRestoreBackup || "methodzPreRestoreBackup";
  let latestReport = null;

  global.addEventListener("DOMContentLoaded", initializeV16Recovery);

  function initializeV16Recovery() {
    installRecoveryPanelV16();
    renderRecoveryHistoryV16();
  }

  function installRecoveryPanelV16() {
    const mergePanel = document.getElementById("workspaceMergePanelV09");
    const backupPanel = document.getElementById("workspaceBackupPanelV08");
    const anchor = mergePanel || backupPanel;
    if (!anchor || document.getElementById("workspaceRecoveryPanelV16")) return;

    const panel = document.createElement("section");
    panel.id = "workspaceRecoveryPanelV16";
    panel.className = "card workspace-recovery-v16";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Recovery Readiness</h2>
          <p class="helper-text">Inspect a workspace backup without changing browser data, or run a dry recovery drill against the current workspace package.</p>
        </div>
        <span class="recovery-badge-v16">No-write inspection</span>
      </div>
      <div class="button-row">
        <label class="button-like" for="workspaceInspectionFileV16">Inspect Backup Package</label>
        <button type="button" onclick="runCurrentWorkspaceDrillV16()">Run Current Workspace Drill</button>
        <button type="button" id="downloadRecoveryReportV16" onclick="downloadRecoveryReportV16()" disabled>Download Readiness Report</button>
      </div>
      <input id="workspaceInspectionFileV16" class="import-control" type="file" accept="application/json,.json" />
      <div id="workspaceRecoveryResultV16" class="recovery-result-v16" aria-live="polite">
        <p class="helper-text">No package has been inspected in this session.</p>
      </div>
      <div id="workspaceRecoveryHistoryV16"></div>
    `;

    anchor.insertAdjacentElement("afterend", panel);
    document.getElementById("workspaceInspectionFileV16")?.addEventListener("change", inspectSelectedWorkspaceV16);
  }

  async function inspectSelectedWorkspaceV16(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const payload = JSON.parse(await file.text());
      const plan = getCoreV16().buildRestorePlan(
        payload,
        readCurrentWorkspaceEntriesV16(),
        recoveryOptionsV16("replace")
      );
      latestReport = createDownloadableReportV16("backup-inspection", file.name, plan);
      renderRecoveryResultV16(plan, `Inspection: ${file.name}`);
      setReportButtonV16(true);
    } catch (error) {
      latestReport = {
        reportType: "backup-inspection",
        generatedAt: new Date().toISOString(),
        valid: false,
        errors: [String(error.message || error)]
      };
      renderRecoveryErrorV16(error.message || error);
      setReportButtonV16(true);
    }
  }

  function runCurrentWorkspaceDrillV16() {
    try {
      if (typeof global.createWorkspacePackageV08 !== "function") {
        throw new Error("Workspace export support is unavailable.");
      }

      const payload = global.createWorkspacePackageV08();
      const plan = getCoreV16().buildRestorePlan(payload, {}, recoveryOptionsV16("replace"));
      const expected = plan.report.recognizedKeys.length;
      const passed = plan.report.valid
        && plan.report.checksumVerified
        && plan.counts.add === expected
        && expected > 0;
      const event = {
        id: uniqueIdV16("recovery-drill"),
        testedAt: new Date().toISOString(),
        result: passed ? "Passed" : "Failed",
        schemaVersion: String(payload.schemaVersion || config.schemaVersion || ""),
        checksum: String(payload.checksum || ""),
        checksumVerified: Boolean(plan.report.checksumVerified),
        entryCount: expected,
        totalBytes: plan.report.totalBytes,
        warningCount: plan.report.warnings.length,
        errorCount: plan.report.errors.length
      };

      appendRecoveryEventV16(event);
      latestReport = createDownloadableReportV16("current-workspace-drill", "Current browser workspace", plan, event);
      renderRecoveryResultV16(plan, `Current Workspace Drill: ${event.result}`);
      renderRecoveryHistoryV16();
      setReportButtonV16(true);
      announceV16(`Recovery drill ${event.result.toLowerCase()}.`);
    } catch (error) {
      renderRecoveryErrorV16(error.message || error);
      announceV16("Recovery drill failed.");
    }
  }

  function renderRecoveryResultV16(plan, heading) {
    const body = document.getElementById("workspaceRecoveryResultV16");
    if (!body) return;
    const report = plan.report;
    const stateClass = report.valid ? "is-valid" : "has-error";
    const stateLabel = report.valid ? "Ready for controlled restore" : "Restore blocked";
    const issues = [...report.errors.map((message) => `<li><strong>Error:</strong> ${escapeV16(message)}</li>`), ...report.warnings.map((message) => `<li><strong>Warning:</strong> ${escapeV16(message)}</li>`)].join("");

    body.className = `recovery-result-v16 ${stateClass}`;
    body.innerHTML = `
      <div class="section-subheader">
        <div>
          <h3>${escapeV16(heading)}</h3>
          <p><strong>${escapeV16(stateLabel)}</strong></p>
        </div>
        <span class="recovery-state-v16">${report.valid ? "PASS" : "BLOCKED"}</span>
      </div>
      <div class="metric-grid">
        <div><strong>${report.summary.entryCount}</strong><span>recognized entries</span></div>
        <div><strong>${getCoreV16().formatBytes(report.totalBytes)}</strong><span>package data</span></div>
        <div><strong>${plan.counts.replace}</strong><span>local keys replaced</span></div>
        <div><strong>${plan.counts.remove}</strong><span>local keys removed</span></div>
      </div>
      <p class="helper-text">Checksum: ${report.checksumVerified ? "verified" : "not verified"}. Private key findings: ${report.privateMaterialPaths.length}. Ignored keys: ${report.ignoredKeys.length}.</p>
      ${issues ? `<ul class="recovery-issues-v16">${issues}</ul>` : `<p class="helper-text">No validation issues were found.</p>`}
    `;
  }

  function renderRecoveryErrorV16(message) {
    const body = document.getElementById("workspaceRecoveryResultV16");
    if (!body) return;
    body.className = "recovery-result-v16 has-error";
    body.innerHTML = `<h3>Inspection Failed</h3><p>${escapeV16(message)}</p>`;
  }

  function renderRecoveryHistoryV16() {
    const body = document.getElementById("workspaceRecoveryHistoryV16");
    if (!body) return;
    const events = readRecoveryEventsV16().slice(-5).reverse();
    if (!events.length) {
      body.innerHTML = `<p class="helper-text">No recovery drills have been recorded on this browser profile.</p>`;
      return;
    }

    body.innerHTML = `
      <h3>Recent Recovery Drills</h3>
      <div class="recovery-history-v16">
        ${events.map((event) => `
          <div>
            <strong>${escapeV16(event.result || "Unknown")}</strong>
            <span>${escapeV16(formatDateV16(event.testedAt))}</span>
            <small>${Number(event.entryCount || 0)} entries · ${getCoreV16().formatBytes(Number(event.totalBytes || 0))}</small>
          </div>
        `).join("")}
      </div>
    `;
  }

  function createDownloadableReportV16(reportType, source, plan, event = null) {
    const report = plan.report;
    return {
      reportType,
      protocolVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      source,
      event,
      package: {
        packageType: report.packageType,
        packageVersion: report.packageVersion,
        schemaVersion: report.schemaVersion,
        exportedAt: report.exportedAt,
        checksum: report.checksum,
        checksumVerified: report.checksumVerified
      },
      validation: {
        valid: report.valid,
        errors: report.errors,
        warnings: report.warnings,
        recognizedKeys: report.recognizedKeys,
        ignoredKeys: report.ignoredKeys,
        malformedJsonKeys: report.malformedJsonKeys,
        privateMaterialPaths: report.privateMaterialPaths,
        totalBytes: report.totalBytes,
        summary: report.summary,
        limits: report.limits
      },
      restorePlan: {
        mode: plan.mode,
        counts: plan.counts,
        add: plan.plan.add,
        replace: plan.plan.replace,
        unchanged: plan.plan.unchanged,
        ignored: plan.plan.ignored,
        remove: plan.plan.remove
      },
      note: "This report contains validation metadata and storage key names only. It does not contain workspace record values."
    };
  }

  function downloadRecoveryReportV16() {
    if (!latestReport) return alert("Inspect a package or run a recovery drill first.");
    if (typeof global.downloadBlob !== "function") return alert("Download support is unavailable.");
    global.downloadBlob(
      JSON.stringify(latestReport, null, 2),
      `methodz-recovery-readiness-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json"
    );
  }

  function readCurrentWorkspaceEntriesV16() {
    const entries = {};
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (!key || key === preRestoreKey || !getCoreV16().isRecognizedKey(key)) continue;
      const value = global.localStorage.getItem(key);
      if (value !== null) entries[key] = value;
    }
    return entries;
  }

  function readRecoveryEventsV16() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(recoveryLogKey) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function appendRecoveryEventV16(event) {
    const events = readRecoveryEventsV16();
    events.push(event);
    global.localStorage.setItem(recoveryLogKey, JSON.stringify(events.slice(-recoveryEventLimitV16())));
  }

  function recoveryOptionsV16(mode = "merge") {
    return {
      mode: mode === "replace" ? "replace" : "merge",
      preRestoreKey,
      storageKeys,
      limits: getCoreV16().normalizeLimits({
        maxEntries: recoveryConfig.maximumEntries,
        maxEntryBytes: recoveryConfig.maximumEntryBytes,
        maxTotalBytes: recoveryConfig.maximumPackageBytes
      })
    };
  }

  function recoveryEventLimitV16() {
    const configured = Number(recoveryConfig.maximumDrillEvents);
    return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 100;
  }

  function setReportButtonV16(enabled) {
    const button = document.getElementById("downloadRecoveryReportV16");
    if (button) button.disabled = !enabled;
  }

  function getCoreV16() {
    const core = global.MethodzWorkspacePackageCore;
    if (!core) throw new Error("Workspace package validation core is unavailable.");
    return core;
  }

  function uniqueIdV16(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function formatDateV16(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value || "Unknown time") : date.toLocaleString();
  }

  function escapeV16(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function announceV16(message) {
    if (typeof global.announceMethodzStatus === "function") global.announceMethodzStatus(message);
  }

  global.MethodzRecoveryReadinessV16 = {
    inspectWorkspacePackage: (payload) => getCoreV16().inspectWorkspacePackage(payload, recoveryOptionsV16()),
    buildRestorePlan: (payload, currentEntries, mode = "replace") => getCoreV16().buildRestorePlan(payload, currentEntries, recoveryOptionsV16(mode)),
    readRecoveryEvents: readRecoveryEventsV16
  };
  global.runCurrentWorkspaceDrillV16 = runCurrentWorkspaceDrillV16;
  global.downloadRecoveryReportV16 = downloadRecoveryReportV16;
})(window);
