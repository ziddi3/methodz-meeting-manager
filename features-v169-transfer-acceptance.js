/* Methodz Meeting Manager v1.6.9 transfer acceptance, rollback rehearsal, and aggregate diagnostics. */
(function initializeTransferAcceptanceV169(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.transferAcceptance || {};
  const storageKeys = config.storageKeys || {};
  const core = global.MethodzTransferAcceptanceCoreV169;
  const transferStateKey = storageKeys.crossDeviceTransferState || "methodzCrossDeviceTransferStateV168";
  const acceptanceStateKey = storageKeys.transferAcceptanceState || "methodzTransferAcceptanceStateV169";
  const acceptanceReportsKey = storageKeys.transferAcceptanceReports || "methodzTransferAcceptanceReportsV169";
  const diagnosticsReportsKey = storageKeys.workspaceDiagnosticsReports || "methodzWorkspaceDiagnosticsReportsV169";
  const rollbackRecoveryKey = storageKeys.transferRollbackRecovery || "methodzTransferRollbackRecoveryV169";
  const preRestoreKey = storageKeys.preRestoreBackup || "methodzPreRestoreBackup";
  let pendingRollback = null;
  let latestAcceptanceReport = null;
  let latestDiagnosticsReport = null;
  let latestRollbackReport = null;

  function requireDependencies() {
    if (!core) throw new Error("The v1.6.9 transfer acceptance core is unavailable.");
    if (!global.MethodzWorkspacePackageCore) throw new Error("The workspace package core is unavailable.");
    return global.MethodzWorkspacePackageCore;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function parseJson(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }

  function isWorkspaceKey(key) {
    return typeof key === "string" && (key.startsWith("methodz") || key === "meetingRecords");
  }

  function protectedKeys() {
    return new Set([
      preRestoreKey,
      acceptanceStateKey,
      acceptanceReportsKey,
      diagnosticsReportsKey,
      rollbackRecoveryKey,
      transferStateKey
    ].filter(Boolean));
  }

  function collectEntries(options = {}) {
    const includeProtected = options.includeProtected === true;
    const entries = {};
    const protectedSet = protectedKeys();
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (!isWorkspaceKey(key) || (!includeProtected && protectedSet.has(key))) continue;
      const value = global.localStorage.getItem(key);
      if (value !== null) entries[key] = value;
    }
    return entries;
  }

  function workspaceLimits() {
    const recovery = config.workspaceRecovery || {};
    return {
      maxEntries: recovery.maximumEntries,
      maxEntryBytes: recovery.maximumEntryBytes,
      maxTotalBytes: recovery.maximumPackageBytes
    };
  }

  function setStatus(message, tone = "ready") {
    const element = document.getElementById("transferAcceptanceStatusV169");
    if (!element) return;
    element.textContent = message;
    element.className = `acceptance-status-v169 is-${tone}`;
    global.announceMethodzStatus?.(message);
  }

  function persistBounded(key, value, maximum) {
    const current = parseJson(global.localStorage.getItem(key), []);
    const list = Array.isArray(current) ? current : [];
    const limit = Math.max(1, Number(maximum) || 25);
    global.localStorage.setItem(key, JSON.stringify(list.concat(value).slice(-limit)));
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  function downloadJson(payload, filename) {
    if (!payload) throw new Error("No report is available.");
    const content = JSON.stringify(payload, null, 2);
    if (typeof global.downloadBlob === "function") {
      global.downloadBlob(content, filename, "application/json");
      return;
    }
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    global.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function currentTransferState() {
    return parseJson(global.localStorage.getItem(transferStateKey), {});
  }

  function buildSummary() {
    return core.buildComponentSummary({ entries: collectEntries({ includeProtected: true }), storageKeys });
  }

  function installPanel() {
    if (document.getElementById("transferAcceptancePanelV169")) return;
    const anchor = document.getElementById("crossDeviceTransferPanelV168") || document.getElementById("deviceReadinessV167");
    const main = document.getElementById("mainContent");
    if (!main) return;

    const panel = document.createElement("section");
    panel.id = "transferAcceptancePanelV169";
    panel.className = "card transfer-acceptance-v169";
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="section-subheader acceptance-header-v169">
        <div><p class="eyebrow">Destination Verification</p><h2>Transfer Acceptance & Rollback</h2></div>
        <span class="status-pill">v1.6.9</span>
      </div>
      <p class="helper-text">Review the destination after a verified transfer, record metadata-only acceptance evidence, and rehearse restoration of the pre-import recovery package. Nothing is accepted or rolled back automatically.</p>
      <div id="transferAcceptanceStatusV169" class="acceptance-status-v169 is-ready" aria-live="polite">Acceptance review is ready.</div>

      <div class="acceptance-grid-v169">
        <section class="acceptance-stage-v169">
          <h3>Post-Transfer Acceptance Checklist</h3>
          <p id="transferAcceptanceTransferStateV169" class="helper-text"></p>
          <div id="transferAcceptanceSummaryV169" class="acceptance-summary-v169"></div>
          <div id="transferAcceptanceChecklistV169" class="acceptance-checklist-v169"></div>
          <div class="button-row">
            <button type="button" onclick="refreshTransferAcceptanceV169()">Refresh Review</button>
            <button type="button" onclick="completeTransferAcceptanceV169()">Complete Acceptance</button>
            <button type="button" onclick="downloadTransferAcceptanceReportV169()">Download Acceptance Report</button>
          </div>
        </section>

        <section class="acceptance-stage-v169">
          <h3>Pre-Import Rollback Rehearsal</h3>
          <p class="helper-text">Preview the locally stored pre-import recovery package, preserve the current destination as a rollback-recovery package, then restore only after explicit approval.</p>
          <div class="button-row">
            <button type="button" onclick="prepareTransferRollbackV169()">Preview Rollback</button>
            <button type="button" onclick="downloadTransferRollbackReportV169()">Download Rollback Report</button>
          </div>
          <div id="transferRollbackPreviewV169" class="acceptance-preview-v169 is-hidden" aria-live="polite"></div>
          <div class="acceptance-confirmations-v169">
            <label><input id="transferRollbackReviewedV169" type="checkbox" /> I reviewed the restore counts and understand the destination workspace will be replaced.</label>
            <label for="transferRollbackPhraseV169">Type <strong>${escapeHtml(settings.rollbackApprovalPhrase || "ROLLBACK")}</strong> to unlock the rehearsal</label>
            <input id="transferRollbackPhraseV169" type="text" autocomplete="off" spellcheck="false" />
          </div>
          <div class="button-row">
            <button type="button" class="small-danger" onclick="applyTransferRollbackV169()">Restore Pre-Import Recovery</button>
            <button type="button" onclick="cancelTransferRollbackV169()">Cancel Rollback</button>
          </div>
        </section>
      </div>

      <section class="acceptance-stage-v169 diagnostics-stage-v169">
        <h3>Large Workspace Diagnostics</h3>
        <p class="helper-text">Measure aggregate storage size, parsing counts, component totals, quota ratio, and scan duration. Reports contain no meeting values, storage-key names, raw record identifiers, credentials, or private keys.</p>
        <div class="button-row">
          <button type="button" onclick="runWorkspaceDiagnosticsV169()">Run Diagnostics</button>
          <button type="button" onclick="downloadWorkspaceDiagnosticsV169()">Download Diagnostics</button>
        </div>
        <div id="workspaceDiagnosticsV169" class="acceptance-preview-v169 is-hidden" aria-live="polite"></div>
      </section>

      <p class="crypto-warning-v16"><strong>Boundary:</strong> browser-local acceptance and rollback evidence does not authenticate a person or device and does not prove delivery, authority, legal approval, or remote audit.</p>`;

    if (anchor) anchor.insertAdjacentElement("afterend", panel);
    else main.appendChild(panel);
  }

  function renderAcceptance() {
    const summary = buildSummary();
    const transferState = currentTransferState();
    const stateText = document.getElementById("transferAcceptanceTransferStateV169");
    const summaryElement = document.getElementById("transferAcceptanceSummaryV169");
    const checklist = document.getElementById("transferAcceptanceChecklistV169");
    if (!summaryElement || !checklist) return;

    const verified = transferState.stage === "destination-import-verified";
    if (stateText) {
      stateText.textContent = verified
        ? `Verified destination transfer detected${transferState.completedAt ? ` (${new Date(transferState.completedAt).toLocaleString()})` : ""}.`
        : "No verified destination transfer state is currently recorded. Complete the v1.6.8 destination import before acceptance.";
    }

    summaryElement.innerHTML = `
      <div class="acceptance-metrics-v169">
        <span><strong>${summary.totalEntries}</strong> workspace entries</span>
        <span><strong>${formatBytes(summary.totalBytes)}</strong> aggregate size</span>
        <span><strong>${summary.parseableEntries}</strong> parseable</span>
        <span><strong>${summary.unparseableEntries}</strong> unparseable</span>
      </div>`;

    checklist.innerHTML = core.COMPONENTS.map((component) => {
      const value = summary.components[component.id] || {};
      return `<label class="acceptance-check-v169">
        <input type="checkbox" data-acceptance-check-v169="${escapeHtml(component.id)}" />
        <span><strong>${escapeHtml(component.label)}</strong><small>${Number(value.itemCount || 0)} item(s) across ${Number(value.entryCount || 0)} storage entr${Number(value.entryCount || 0) === 1 ? "y" : "ies"}, ${formatBytes(value.bytes || 0)}</small></span>
      </label>`;
    }).join("");

    const saved = parseJson(global.localStorage.getItem(acceptanceStateKey), {});
    if (saved.stage === "accepted" && saved.componentFingerprint === summary.fingerprint) {
      document.querySelectorAll("[data-acceptance-check-v169]").forEach((box) => { box.checked = true; });
      setStatus("This destination snapshot has a completed acceptance report. Refresh after any workspace change.", "ready");
    } else if (!verified) {
      setStatus("Acceptance is blocked until a verified destination transfer is recorded.", "warning");
    } else {
      setStatus("Verified transfer detected. Review every component before completing acceptance.", "ready");
    }
  }

  function refreshTransferAcceptanceV169() {
    renderAcceptance();
  }

  function collectChecks() {
    const checks = {};
    document.querySelectorAll("[data-acceptance-check-v169]").forEach((box) => {
      checks[box.dataset.acceptanceCheckV169] = box.checked;
    });
    return checks;
  }

  function completeTransferAcceptanceV169() {
    try {
      const transferState = currentTransferState();
      const summary = buildSummary();
      const report = core.buildAcceptanceReport({
        checks: collectChecks(),
        summary,
        transferStage: transferState.stage,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion
      });
      if (!report.verifiedTransfer) throw new Error("A verified v1.6.8 destination import is required before acceptance.");
      if (!report.accepted) throw new Error(`Review every checklist component. ${report.missingComponents.length} component(s) remain unchecked.`);
      if (!global.confirm("Record this destination snapshot as accepted? This writes metadata-only local evidence and does not alter meeting records.")) return;

      latestAcceptanceReport = report;
      persistBounded(acceptanceReportsKey, report, settings.maximumReports);
      global.localStorage.setItem(acceptanceStateKey, JSON.stringify({
        stage: "accepted",
        acceptedAt: report.generatedAt,
        reportChecksum: report.checksum,
        componentFingerprint: summary.fingerprint,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion
      }));
      setStatus("Destination acceptance completed. Metadata-only evidence was stored locally.", "ready");
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  function downloadTransferAcceptanceReportV169() {
    try {
      if (!latestAcceptanceReport) {
        const reports = parseJson(global.localStorage.getItem(acceptanceReportsKey), []);
        latestAcceptanceReport = Array.isArray(reports) ? reports.at(-1) : null;
      }
      downloadJson(latestAcceptanceReport, `methodz-transfer-acceptance-${new Date().toISOString().slice(0, 10)}.json`);
      setStatus("Metadata-only transfer acceptance report downloaded.", "ready");
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  function prepareTransferRollbackV169() {
    const preview = document.getElementById("transferRollbackPreviewV169");
    try {
      const workspaceCore = requireDependencies();
      const payload = parseJson(global.localStorage.getItem(preRestoreKey), null);
      if (!payload) throw new Error("No pre-import recovery package is available on this browser profile.");
      const report = workspaceCore.inspectWorkspacePackage(payload, { storageKeys, limits: workspaceLimits(), preRestoreKey });
      if (!report.valid || !report.checksumVerified) throw new Error("The pre-import recovery package failed integrity validation.");
      const currentEntries = collectEntries();
      const plan = workspaceCore.buildRestorePlan(payload, currentEntries, { mode: "replace", storageKeys, limits: workspaceLimits(), preRestoreKey });
      if (!plan.report.valid || !plan.report.checksumVerified) throw new Error("A verified rollback plan could not be created.");

      pendingRollback = {
        payload,
        report,
        counts: plan.counts,
        currentFingerprint: core.hashText(core.stableStringify(currentEntries))
      };
      if (preview) {
        preview.classList.remove("is-hidden", "has-error");
        preview.innerHTML = `<h4>Verified Rollback Preview</h4>
          <div class="acceptance-metrics-v169">
            <span><strong>${Number(plan.counts.add || 0)}</strong> add</span>
            <span><strong>${Number(plan.counts.replace || 0)}</strong> replace</span>
            <span><strong>${Number(plan.counts.unchanged || 0)}</strong> unchanged</span>
            <span><strong>${Number(plan.counts.remove || 0)}</strong> remove</span>
            <span><strong>${Number(plan.counts.ignored || 0)}</strong> ignored</span>
          </div>
          <p class="helper-text">Checksum verified. No workspace value has been changed. The current destination will be preserved separately before the restore is applied.</p>`;
      }
      resetRollbackApproval();
      setStatus("Rollback preview verified. Review the counts and complete explicit approval before restoration.", "warning");
    } catch (error) {
      pendingRollback = null;
      if (preview) {
        preview.classList.remove("is-hidden");
        preview.classList.add("has-error");
        preview.innerHTML = `<h4>Rollback Preview Rejected</h4><p>${escapeHtml(error.message || String(error))}</p>`;
      }
      setStatus("Rollback rehearsal failed closed. Workspace data was not changed.", "error");
    }
  }

  function applyTransferRollbackV169() {
    let recoveryCreated = false;
    let mutationApplied = false;
    let readBackVerified = false;
    let automaticRecoveryApplied = false;
    try {
      const workspaceCore = requireDependencies();
      if (!pendingRollback) throw new Error("Preview and verify the pre-import recovery package first.");
      if (!document.getElementById("transferRollbackReviewedV169")?.checked) throw new Error("Confirm that the rollback plan was reviewed.");
      const phrase = settings.rollbackApprovalPhrase || "ROLLBACK";
      if (document.getElementById("transferRollbackPhraseV169")?.value.trim() !== phrase) throw new Error(`Type ${phrase} exactly to unlock the rollback rehearsal.`);

      const currentEntries = collectEntries();
      const currentFingerprint = core.hashText(core.stableStringify(currentEntries));
      if (currentFingerprint !== pendingRollback.currentFingerprint) {
        pendingRollback = null;
        throw new Error("The destination workspace changed after the rollback preview. Run the preview again.");
      }
      const freshReport = workspaceCore.inspectWorkspacePackage(pendingRollback.payload, { storageKeys, limits: workspaceLimits(), preRestoreKey });
      if (!freshReport.valid || !freshReport.checksumVerified) throw new Error("The recovery package failed final validation.");
      if (!global.confirm("Restore the verified pre-import recovery package now? The current destination will be preserved in a separate rollback-recovery package first.")) return;

      const currentPackage = typeof global.createWorkspacePackageV08 === "function"
        ? global.createWorkspacePackageV08()
        : null;
      if (!currentPackage) throw new Error("Current workspace recovery creation is unavailable.");
      global.localStorage.setItem(rollbackRecoveryKey, JSON.stringify(currentPackage));
      recoveryCreated = true;

      const beforeEntries = collectEntries();
      try {
        applyEntries(freshReport.recognizedEntries || {});
        verifyEntries(freshReport.recognizedEntries || {});
        mutationApplied = true;
        readBackVerified = true;
      } catch (mutationError) {
        restoreEntries(beforeEntries);
        verifyEntries(beforeEntries);
        automaticRecoveryApplied = true;
        throw mutationError;
      }

      latestRollbackReport = core.buildRollbackReport({
        stage: "pre-import-recovery-restored",
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion,
        checksumVerified: true,
        recoveryCreated,
        mutationApplied,
        readBackVerified,
        automaticRecoveryApplied,
        counts: pendingRollback.counts
      });
      persistBounded(acceptanceReportsKey, latestRollbackReport, settings.maximumReports);
      global.localStorage.setItem(acceptanceStateKey, JSON.stringify({
        stage: "rollback-rehearsal-completed",
        completedAt: latestRollbackReport.generatedAt,
        reportChecksum: latestRollbackReport.checksum,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion
      }));
      setStatus("Pre-import recovery restored and verified. A rollback-recovery package preserves the replaced destination snapshot. Reload when ready.", "ready");
      renderRollbackComplete();
    } catch (error) {
      latestRollbackReport = core.buildRollbackReport({
        stage: automaticRecoveryApplied ? "rollback-failed-destination-restored" : "rollback-blocked",
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion,
        checksumVerified: pendingRollback?.report?.checksumVerified === true,
        recoveryCreated,
        mutationApplied,
        readBackVerified,
        automaticRecoveryApplied,
        counts: pendingRollback?.counts
      });
      persistBounded(acceptanceReportsKey, latestRollbackReport, settings.maximumReports);
      setStatus(automaticRecoveryApplied ? `Rollback failed and the destination snapshot was restored: ${error.message}` : error.message || String(error), "error");
    }
  }

  function applyEntries(incomingEntries) {
    const preserve = protectedKeys();
    Object.keys(collectEntries()).forEach((key) => {
      if (!preserve.has(key)) global.localStorage.removeItem(key);
    });
    Object.entries(incomingEntries).forEach(([key, value]) => {
      if (isWorkspaceKey(key) && !preserve.has(key) && typeof value === "string") global.localStorage.setItem(key, value);
    });
  }

  function restoreEntries(entries) {
    const preserve = protectedKeys();
    Object.keys(collectEntries()).forEach((key) => {
      if (!preserve.has(key)) global.localStorage.removeItem(key);
    });
    Object.entries(entries).forEach(([key, value]) => {
      if (isWorkspaceKey(key) && !preserve.has(key) && typeof value === "string") global.localStorage.setItem(key, value);
    });
  }

  function verifyEntries(expectedEntries) {
    const preserve = protectedKeys();
    const actual = collectEntries();
    const expected = Object.fromEntries(Object.entries(expectedEntries).filter(([key, value]) => isWorkspaceKey(key) && !preserve.has(key) && typeof value === "string"));
    const actualKeys = Object.keys(actual).filter((key) => !preserve.has(key)).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (core.stableStringify(actualKeys) !== core.stableStringify(expectedKeys)) throw new Error("Rollback read-back verification found an unexpected workspace entry set.");
    expectedKeys.forEach((key) => {
      if (actual[key] !== expected[key]) throw new Error("Rollback read-back verification found a mismatched storage value.");
    });
  }

  function resetRollbackApproval() {
    const reviewed = document.getElementById("transferRollbackReviewedV169");
    const phrase = document.getElementById("transferRollbackPhraseV169");
    if (reviewed) reviewed.checked = false;
    if (phrase) phrase.value = "";
  }

  function cancelTransferRollbackV169() {
    pendingRollback = null;
    resetRollbackApproval();
    const preview = document.getElementById("transferRollbackPreviewV169");
    if (preview) {
      preview.innerHTML = "";
      preview.classList.add("is-hidden");
      preview.classList.remove("has-error");
    }
    setStatus("Rollback rehearsal cancelled. Workspace data was not changed.", "ready");
  }

  function renderRollbackComplete() {
    const preview = document.getElementById("transferRollbackPreviewV169");
    if (!preview) return;
    preview.classList.remove("is-hidden", "has-error");
    preview.innerHTML = `<h4>Rollback Rehearsal Verified</h4><p>The pre-import package was restored and read back successfully. The replaced destination snapshot is preserved locally.</p><div class="button-row"><button type="button" onclick="location.reload()">Reload Restored Workspace</button></div>`;
  }

  function downloadTransferRollbackReportV169() {
    try {
      if (!latestRollbackReport) {
        const reports = parseJson(global.localStorage.getItem(acceptanceReportsKey), []);
        latestRollbackReport = Array.isArray(reports)
          ? [...reports].reverse().find((report) => report?.reportType === "methodz-transfer-rollback-rehearsal-report")
          : null;
      }
      downloadJson(latestRollbackReport, `methodz-transfer-rollback-rehearsal-${new Date().toISOString().slice(0, 10)}.json`);
      setStatus("Metadata-only rollback rehearsal report downloaded.", "ready");
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  async function runWorkspaceDiagnosticsV169() {
    const preview = document.getElementById("workspaceDiagnosticsV169");
    try {
      const startedAt = global.performance?.now?.() ?? Date.now();
      const summary = buildSummary();
      let estimate = {};
      let persisted = false;
      try {
        estimate = await global.navigator?.storage?.estimate?.() || {};
        persisted = await global.navigator?.storage?.persisted?.() || false;
      } catch (error) {
        estimate = {};
      }
      const finishedAt = global.performance?.now?.() ?? Date.now();
      latestDiagnosticsReport = core.buildDiagnosticsReport({
        summary,
        durationMilliseconds: finishedAt - startedAt,
        usageBytes: estimate.usage,
        quotaBytes: estimate.quota,
        persisted,
        softStorageByteLimit: settings.softStorageByteLimit,
        storageWarningRatio: settings.storageWarningRatio,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion
      });
      persistBounded(diagnosticsReportsKey, latestDiagnosticsReport, settings.maximumDiagnosticsReports);
      if (preview) {
        const usageRatio = latestDiagnosticsReport.browserStorage.usageRatio;
        preview.classList.remove("is-hidden", "has-error");
        preview.innerHTML = `<h4>Aggregate Diagnostics Complete</h4>
          <div class="acceptance-metrics-v169">
            <span><strong>${latestDiagnosticsReport.workspace.totalEntries}</strong> workspace entries</span>
            <span><strong>${formatBytes(latestDiagnosticsReport.workspace.totalBytes)}</strong> measured values</span>
            <span><strong>${latestDiagnosticsReport.durationMilliseconds.toFixed(2)} ms</strong> scan</span>
            <span><strong>${usageRatio === null ? "Unavailable" : `${(usageRatio * 100).toFixed(1)}%`}</strong> quota use</span>
          </div>
          <p class="helper-text">${latestDiagnosticsReport.warnings.length ? `Warnings: ${latestDiagnosticsReport.warnings.map(escapeHtml).join(", ")}.` : "No aggregate storage warning threshold was reached."}</p>`;
      }
      setStatus("Metadata-only workspace diagnostics completed.", latestDiagnosticsReport.warnings.length ? "warning" : "ready");
    } catch (error) {
      if (preview) {
        preview.classList.remove("is-hidden");
        preview.classList.add("has-error");
        preview.innerHTML = `<h4>Diagnostics Failed</h4><p>${escapeHtml(error.message || String(error))}</p>`;
      }
      setStatus(error.message || String(error), "error");
    }
  }

  function downloadWorkspaceDiagnosticsV169() {
    try {
      if (!latestDiagnosticsReport) {
        const reports = parseJson(global.localStorage.getItem(diagnosticsReportsKey), []);
        latestDiagnosticsReport = Array.isArray(reports) ? reports.at(-1) : null;
      }
      downloadJson(latestDiagnosticsReport, `methodz-workspace-diagnostics-${new Date().toISOString().slice(0, 10)}.json`);
      setStatus("Metadata-only workspace diagnostics downloaded.", "ready");
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  function start() {
    if (settings.enabled === false) return;
    try {
      requireDependencies();
      installPanel();
      renderAcceptance();
    } catch (error) {
      console.error(error);
    }
  }

  global.refreshTransferAcceptanceV169 = refreshTransferAcceptanceV169;
  global.completeTransferAcceptanceV169 = completeTransferAcceptanceV169;
  global.downloadTransferAcceptanceReportV169 = downloadTransferAcceptanceReportV169;
  global.prepareTransferRollbackV169 = prepareTransferRollbackV169;
  global.applyTransferRollbackV169 = applyTransferRollbackV169;
  global.cancelTransferRollbackV169 = cancelTransferRollbackV169;
  global.downloadTransferRollbackReportV169 = downloadTransferRollbackReportV169;
  global.runWorkspaceDiagnosticsV169 = runWorkspaceDiagnosticsV169;
  global.downloadWorkspaceDiagnosticsV169 = downloadWorkspaceDiagnosticsV169;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
