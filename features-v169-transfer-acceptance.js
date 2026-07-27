/* Methodz Meeting Manager v1.6.9 transfer acceptance, rollback rehearsal, and workspace diagnostics. */
(function initializeTransferAcceptanceV169(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.transferAcceptance || {};
  const diagnosticsSettings = config.workspaceDiagnostics || {};
  const storageKeys = config.storageKeys || {};
  const preRestoreKey = storageKeys.preRestoreBackup || "methodzPreRestoreBackup";
  const preRollbackKey = storageKeys.preRollbackBackup || "methodzPreRollbackBackupV169";
  const acceptanceStateKey = storageKeys.transferAcceptanceState || "methodzTransferAcceptanceStateV169";
  const acceptanceReportsKey = storageKeys.transferAcceptanceReports || "methodzTransferAcceptanceReportsV169";
  const rollbackReportsKey = storageKeys.transferRollbackReports || "methodzTransferRollbackReportsV169";
  const diagnosticsReportsKey = storageKeys.workspaceDiagnosticsReports || "methodzWorkspaceDiagnosticsReportsV169";
  const transferReportsKey = storageKeys.crossDeviceTransferReports || "methodzCrossDeviceTransferReportsV168";
  let latestAcceptance = null;
  let rollbackPreview = null;
  let latestDiagnostics = null;

  function api() {
    if (!global.MethodzTransferAcceptanceV169) throw new Error("The v1.6.9 transfer acceptance core is unavailable.");
    if (!global.MethodzWorkspacePackageCore) throw new Error("The workspace package core is unavailable.");
    return global.MethodzTransferAcceptanceV169;
  }

  function parseJson(raw, fallback = null) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function isRecognizedKey(key) {
    return typeof key === "string" && (key.startsWith("methodz") || key === "meetingRecords");
  }

  function preservedKeys() {
    return new Set([
      preRestoreKey,
      preRollbackKey,
      acceptanceStateKey,
      acceptanceReportsKey,
      rollbackReportsKey,
      diagnosticsReportsKey,
      storageKeys.crossDeviceTransferState,
      transferReportsKey,
      storageKeys.meetingDayPreferences
    ].filter(Boolean));
  }

  function collectWorkspaceEntries() {
    const entries = {};
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (!isRecognizedKey(key)) continue;
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

  function latestVerifiedTransferReport() {
    const reports = parseJson(global.localStorage.getItem(transferReportsKey), []);
    if (!Array.isArray(reports)) return null;
    return [...reports].reverse().find((report) => report?.stage === "destination-import-verified" && report?.result?.postImportVerified === true) || null;
  }

  function preRestorePackage() {
    return parseJson(global.localStorage.getItem(preRestoreKey), null);
  }

  function persistBounded(key, value, maximum) {
    const existing = parseJson(global.localStorage.getItem(key), []);
    const next = (Array.isArray(existing) ? existing : []).concat(value).slice(-Math.max(1, Number(maximum) || 25));
    global.localStorage.setItem(key, JSON.stringify(next));
  }

  function downloadJson(payload, filename) {
    const content = JSON.stringify(payload, null, 2);
    if (typeof global.downloadBlob === "function") return global.downloadBlob(content, filename, "application/json");
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    global.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function setStatus(message, tone = "ready") {
    const element = document.getElementById("transferAcceptanceStatusV169");
    if (element) {
      element.textContent = message;
      element.className = `transfer-acceptance-status-v169 is-${tone}`;
    }
    global.announceMethodzStatus?.(message);
  }

  function installPanel() {
    if (document.getElementById("transferAcceptancePanelV169")) return;
    const transferPanel = document.getElementById("crossDeviceTransferPanelV168");
    const main = document.getElementById("mainContent");
    if (!main) return;
    const panel = document.createElement("section");
    panel.id = "transferAcceptancePanelV169";
    panel.className = "card transfer-acceptance-v169";
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="section-subheader transfer-acceptance-header-v169">
        <div><p class="eyebrow">Destination Acceptance</p><h2>Transfer Acceptance & Rollback</h2></div>
        <span class="status-pill">v1.6.9</span>
      </div>
      <p class="helper-text">Verify the transferred workspace category by category, record explicit operator acceptance, and rehearse restoration of the pre-import destination snapshot. Reports contain aggregate metadata only.</p>
      <div id="transferAcceptanceStatusV169" class="transfer-acceptance-status-v169 is-ready" aria-live="polite">Acceptance checks are ready. Nothing is accepted or rolled back automatically.</div>
      <div class="transfer-acceptance-grid-v169">
        <section class="transfer-acceptance-stage-v169">
          <h3>1. Post-Transfer Acceptance</h3>
          <div class="button-row">
            <button type="button" onclick="runTransferAcceptanceV169()">Run Acceptance Check</button>
            <button type="button" onclick="downloadTransferAcceptanceV169()">Download Acceptance Report</button>
          </div>
          <div id="transferAcceptancePreviewV169" class="transfer-acceptance-preview-v169 is-hidden" aria-live="polite"></div>
          <div id="transferAcceptanceConfirmationsV169" class="transfer-acceptance-confirmations-v169 is-hidden"></div>
        </section>
        <section class="transfer-acceptance-stage-v169">
          <h3>2. Pre-Import Rollback Rehearsal</h3>
          <div class="button-row">
            <button type="button" onclick="previewTransferRollbackV169()">Preview Rollback</button>
            <button type="button" onclick="downloadPreRollbackBackupV169()">Download Current-State Recovery</button>
          </div>
          <div id="transferRollbackPreviewV169" class="transfer-acceptance-preview-v169 is-hidden" aria-live="polite"></div>
          <div class="transfer-rollback-confirm-v169">
            <label><input id="transferRollbackUnderstoodV169" type="checkbox" /> I understand this restores the destination state that existed before the transfer import.</label>
            <label for="transferRollbackPhraseV169">Type <strong>${escapeHtml(settings.rollbackPhrase || "ROLLBACK")}</strong> to unlock the rehearsal</label>
            <input id="transferRollbackPhraseV169" type="text" autocomplete="off" spellcheck="false" />
            <button type="button" class="small-danger" onclick="applyTransferRollbackV169()">Restore Pre-Import Snapshot</button>
          </div>
        </section>
      </div>
      <section class="transfer-acceptance-stage-v169 workspace-diagnostics-v169">
        <h3>3. Large-Workspace Diagnostics</h3>
        <p class="helper-text">Measure aggregate storage size, entry counts, parsing health, quota ratio, and scan duration without exposing meeting content, raw identifiers, or storage-key names.</p>
        <div class="button-row">
          <button type="button" onclick="runWorkspaceDiagnosticsV169()">Run Diagnostics</button>
          <button type="button" onclick="downloadWorkspaceDiagnosticsV169()">Download Diagnostics</button>
        </div>
        <div id="workspaceDiagnosticsPreviewV169" class="transfer-acceptance-preview-v169 is-hidden" aria-live="polite"></div>
      </section>
      <p class="crypto-warning-v16"><strong>Boundary:</strong> browser-local acceptance and rollback evidence confirms only that this browser completed the recorded checks. It does not authenticate a person or device and does not prove delivery, authorization, or legal approval.</p>`;
    if (transferPanel) transferPanel.insertAdjacentElement("afterend", panel);
    else main.prepend(panel);
  }

  function runTransferAcceptanceV169() {
    try {
      const started = global.performance?.now?.() || Date.now();
      latestAcceptance = api().buildAcceptanceReport({
        entries: collectWorkspaceEntries(),
        transferReport: latestVerifiedTransferReport(),
        preRestorePackage: preRestorePackage(),
        storageKeys,
        limits: workspaceLimits(),
        preRestoreKey,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion,
        durationMs: (global.performance?.now?.() || Date.now()) - started
      });
      renderAcceptance(latestAcceptance);
      global.localStorage.setItem(acceptanceStateKey, JSON.stringify({
        stage: latestAcceptance.ready ? "ready-for-operator-acceptance" : "acceptance-review-required",
        checkedAt: latestAcceptance.generatedAt,
        checksum: latestAcceptance.checksum
      }));
      setStatus(latestAcceptance.ready
        ? "Automated acceptance checks passed. Complete each operator confirmation and type the acceptance phrase."
        : "Acceptance found a blocking mismatch. Review the failed category before accepting this destination.", latestAcceptance.ready ? "ready" : "error");
      return latestAcceptance;
    } catch (error) {
      setStatus(error.message || String(error), "error");
      return null;
    }
  }

  function renderAcceptance(report) {
    const preview = document.getElementById("transferAcceptancePreviewV169");
    const confirmations = document.getElementById("transferAcceptanceConfirmationsV169");
    if (!preview || !confirmations) return;
    preview.classList.remove("is-hidden");
    preview.innerHTML = `
      <h4>${report.ready ? "Automated Checks Passed" : "Acceptance Review Required"}</h4>
      <div class="transfer-acceptance-metrics-v169">
        <span><strong>${report.summary.activeRecords}</strong> active</span>
        <span><strong>${report.summary.archivedRecords}</strong> archived</span>
        <span><strong>${report.summary.revisionGroups}</strong> revision groups</span>
        <span><strong>${formatBytes(report.summary.workspaceBytes)}</strong> workspace</span>
        <span><strong>${report.summary.durationMs.toFixed(1)}</strong> ms scan</span>
      </div>
      <ul class="transfer-acceptance-list-v169">${report.categories.map((item) => `
        <li class="is-${escapeHtml(item.status)}"><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.message)}</span></li>`).join("")}</ul>`;
    confirmations.classList.remove("is-hidden");
    confirmations.innerHTML = `
      <h4>Operator Acceptance</h4>
      ${report.categories.map((item) => `<label><input class="transfer-acceptance-check-v169" type="checkbox" ${item.status === "fail" ? "disabled" : ""} /> I reviewed ${escapeHtml(item.label.toLowerCase())}.</label>`).join("")}
      <label><input id="transferAcceptanceRecoveryHeldV169" class="transfer-acceptance-check-v169" type="checkbox" /> The pre-import recovery package will be retained until acceptance is complete.</label>
      <label for="transferAcceptancePhraseV169">Type <strong>${escapeHtml(settings.acceptancePhrase || "ACCEPT")}</strong> to record acceptance</label>
      <input id="transferAcceptancePhraseV169" type="text" autocomplete="off" spellcheck="false" />
      <button type="button" onclick="acceptTransferredWorkspaceV169()" ${report.ready ? "" : "disabled"}>Record Destination Acceptance</button>`;
  }

  function acceptTransferredWorkspaceV169() {
    try {
      if (!latestAcceptance) throw new Error("Run the acceptance check first.");
      if (!latestAcceptance.ready) throw new Error("Blocking acceptance checks must pass before acceptance can be recorded.");
      const checks = [...document.querySelectorAll(".transfer-acceptance-check-v169")];
      if (!checks.length || checks.some((input) => !input.checked)) throw new Error("Complete every operator acceptance confirmation.");
      if (document.getElementById("transferAcceptancePhraseV169")?.value.trim() !== (settings.acceptancePhrase || "ACCEPT")) {
        throw new Error(`Type ${settings.acceptancePhrase || "ACCEPT"} exactly to record acceptance.`);
      }
      const accepted = api().buildAcceptanceReport({
        entries: collectWorkspaceEntries(),
        transferReport: latestVerifiedTransferReport(),
        preRestorePackage: preRestorePackage(),
        storageKeys,
        limits: workspaceLimits(),
        preRestoreKey,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion,
        accepted: true
      });
      if (!accepted.ready || !accepted.accepted) throw new Error("The workspace changed after review. Run the acceptance check again.");
      latestAcceptance = accepted;
      persistBounded(acceptanceReportsKey, accepted, settings.maximumReports || 50);
      global.localStorage.setItem(acceptanceStateKey, JSON.stringify({ stage: "accepted", acceptedAt: accepted.generatedAt, checksum: accepted.checksum }));
      renderAcceptance(accepted);
      setStatus("Destination acceptance recorded. Retain the pre-import recovery package until the transfer is formally closed.", "ready");
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  function previewTransferRollbackV169() {
    try {
      rollbackPreview = api().buildRollbackPreview(preRestorePackage(), collectWorkspaceEntries(), {
        storageKeys,
        limits: workspaceLimits(),
        preRestoreKey
      });
      if (!rollbackPreview.valid) throw new Error(rollbackPreview.errors[0] || "The pre-import recovery package could not be verified.");
      const preview = document.getElementById("transferRollbackPreviewV169");
      preview?.classList.remove("is-hidden");
      if (preview) preview.innerHTML = `
        <h4>No-Write Rollback Preview Passed</h4>
        <div class="transfer-acceptance-metrics-v169">
          <span><strong>${rollbackPreview.counts.add || 0}</strong> add</span>
          <span><strong>${rollbackPreview.counts.replace || 0}</strong> replace</span>
          <span><strong>${rollbackPreview.counts.unchanged || 0}</strong> unchanged</span>
          <span><strong>${rollbackPreview.counts.remove || 0}</strong> remove</span>
          <span><strong>${rollbackPreview.counts.ignored || 0}</strong> ignored</span>
        </div>
        <p class="helper-text">The package checksum verified. No browser storage value was changed by this preview.</p>`;
      setStatus("Rollback preview passed. Applying it remains an explicit replacement operation.", "warning");
      return rollbackPreview;
    } catch (error) {
      rollbackPreview = null;
      const preview = document.getElementById("transferRollbackPreviewV169");
      preview?.classList.remove("is-hidden");
      if (preview) preview.innerHTML = `<h4>Rollback Preview Failed</h4><p>${escapeHtml(error.message || String(error))}</p>`;
      setStatus("Rollback preview failed closed. No workspace data was changed.", "error");
      return null;
    }
  }

  function applyTransferRollbackV169() {
    const started = global.performance?.now?.() || Date.now();
    let report;
    let originalSnapshotRecoveredAfterFailure = false;
    try {
      const freshPreview = previewTransferRollbackV169();
      if (!freshPreview?.valid) throw codedError("ROLLBACK_PREVIEW_INVALID", "Run and pass the rollback preview first.");
      if (!document.getElementById("transferRollbackUnderstoodV169")?.checked) throw codedError("ROLLBACK_CONFIRMATION_MISSING", "Confirm that you understand the rollback replaces the current destination workspace.");
      if (document.getElementById("transferRollbackPhraseV169")?.value.trim() !== (settings.rollbackPhrase || "ROLLBACK")) throw codedError("ROLLBACK_PHRASE_MISMATCH", `Type ${settings.rollbackPhrase || "ROLLBACK"} exactly.`);
      if (!global.confirm("Restore the pre-import destination snapshot now? The current transferred workspace will first be saved as a local pre-rollback recovery package.")) return;

      const beforeEntries = collectWorkspaceEntries();
      const currentPackage = api().buildWorkspacePackage(beforeEntries, {
        storageKeys,
        schemaVersion: config.schemaVersion,
        preRestoreKey
      });
      global.localStorage.setItem(preRollbackKey, JSON.stringify(currentPackage));
      const recoveryPackage = preRestorePackage();
      const inspected = global.MethodzWorkspacePackageCore.inspectWorkspacePackage(recoveryPackage, { storageKeys, limits: workspaceLimits(), preRestoreKey });
      if (!inspected.valid || !inspected.checksumVerified) throw codedError("ROLLBACK_PACKAGE_INVALID", "The pre-import recovery package failed final validation.");
      try {
        replaceWorkspaceEntries(inspected.recognizedEntries);
        verifyReplacement(inspected.recognizedEntries);
      } catch (mutationError) {
        try {
          restoreSnapshot(beforeEntries);
          verifySnapshot(beforeEntries);
          originalSnapshotRecoveredAfterFailure = true;
        } catch (restoreError) {
          throw codedError("ROLLBACK_AND_RECOVERY_FAILED", `Rollback failed and the current-state recovery could not be verified: ${restoreError.message}`);
        }
        throw mutationError;
      }
      const restoredSummary = global.MethodzWorkspacePackageCore.summarizeEntries(collectWorkspaceEntries(), storageKeys);
      report = api().buildRollbackReport({
        preview: freshPreview,
        rollbackApplied: true,
        rollbackVerified: true,
        restoredSummary,
        durationMs: (global.performance?.now?.() || Date.now()) - started,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion
      });
      persistBounded(rollbackReportsKey, report, settings.maximumRollbackReports || 25);
      global.localStorage.setItem(acceptanceStateKey, JSON.stringify({ stage: "pre-import-snapshot-restored", restoredAt: report.generatedAt, checksum: report.checksum }));
      setStatus("Pre-import destination snapshot restored and verified. A pre-rollback recovery package preserves the transferred state. Reload to activate the restored workspace.", "ready");
      renderRollbackReload();
    } catch (error) {
      report = api().buildRollbackReport({
        preview: rollbackPreview || {},
        rollbackApplied: false,
        rollbackVerified: false,
        originalSnapshotRecoveredAfterFailure,
        errorCode: error.code || "ROLLBACK_FAILED",
        durationMs: (global.performance?.now?.() || Date.now()) - started,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion
      });
      persistBounded(rollbackReportsKey, report, settings.maximumRollbackReports || 25);
      setStatus(error.message || String(error), "error");
    }
  }

  function replaceWorkspaceEntries(incomingEntries) {
    const preserve = preservedKeys();
    Object.keys(collectWorkspaceEntries()).forEach((key) => {
      if (!preserve.has(key)) global.localStorage.removeItem(key);
    });
    Object.entries(incomingEntries).forEach(([key, value]) => {
      if (isRecognizedKey(key) && !preserve.has(key) && typeof value === "string") global.localStorage.setItem(key, value);
    });
  }

  function verifyReplacement(incomingEntries) {
    const preserve = preservedKeys();
    for (const [key, value] of Object.entries(incomingEntries)) {
      if (!preserve.has(key) && global.localStorage.getItem(key) !== value) throw codedError("ROLLBACK_WRITE_VERIFICATION_FAILED", "Post-rollback storage verification failed.");
    }
    for (const key of Object.keys(collectWorkspaceEntries())) {
      if (!preserve.has(key) && !(key in incomingEntries)) throw codedError("ROLLBACK_REMOVE_VERIFICATION_FAILED", "Post-rollback removal verification failed.");
    }
  }

  function restoreSnapshot(entries) {
    const preserve = preservedKeys();
    Object.keys(collectWorkspaceEntries()).forEach((key) => {
      if (!preserve.has(key)) global.localStorage.removeItem(key);
    });
    Object.entries(entries).forEach(([key, value]) => {
      if (!preserve.has(key) && typeof value === "string") global.localStorage.setItem(key, value);
    });
  }

  function verifySnapshot(entries) {
    const preserve = preservedKeys();
    for (const [key, value] of Object.entries(entries)) {
      if (!preserve.has(key) && global.localStorage.getItem(key) !== value) throw new Error("Current-state recovery verification failed.");
    }
  }

  function codedError(code, message) {
    const error = new Error(message);
    error.code = code;
    return error;
  }

  async function runWorkspaceDiagnosticsV169() {
    try {
      const started = global.performance?.now?.() || Date.now();
      let estimate = {};
      try { estimate = await global.navigator?.storage?.estimate?.() || {}; } catch (error) { estimate = {}; }
      latestDiagnostics = api().buildDiagnosticsReport({
        entries: collectWorkspaceEntries(),
        storageKeys,
        startedAtMs: started,
        finishedAtMs: global.performance?.now?.() || Date.now(),
        quotaBytes: estimate.quota,
        usageBytes: estimate.usage,
        warningBytes: diagnosticsSettings.warningBytes,
        criticalBytes: diagnosticsSettings.criticalBytes,
        quotaWarningRatio: diagnosticsSettings.quotaWarningRatio,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion
      });
      persistBounded(diagnosticsReportsKey, latestDiagnostics, diagnosticsSettings.maximumReports || 25);
      renderDiagnostics(latestDiagnostics);
      setStatus(`Workspace diagnostics completed with ${latestDiagnostics.level} status.`, latestDiagnostics.level === "critical" ? "error" : latestDiagnostics.level);
      return latestDiagnostics;
    } catch (error) {
      setStatus(error.message || String(error), "error");
      return null;
    }
  }

  function renderDiagnostics(report) {
    const preview = document.getElementById("workspaceDiagnosticsPreviewV169");
    if (!preview) return;
    preview.classList.remove("is-hidden");
    const ratio = report.quota.usageRatio == null ? "Unavailable" : `${(report.quota.usageRatio * 100).toFixed(1)}%`;
    preview.innerHTML = `
      <h4>Workspace Diagnostics: ${escapeHtml(report.level)}</h4>
      <div class="transfer-acceptance-metrics-v169">
        <span><strong>${report.storage.entryCount}</strong> entries</span>
        <span><strong>${formatBytes(report.storage.totalBytes)}</strong> measured</span>
        <span><strong>${formatBytes(report.storage.largestEntryBytes)}</strong> largest entry</span>
        <span><strong>${report.storage.parseErrors}</strong> parse errors</span>
        <span><strong>${report.durationMs.toFixed(1)}</strong> ms scan</span>
        <span><strong>${ratio}</strong> quota use</span>
      </div>
      <p class="helper-text">Size buckets: ${report.storage.buckets.under10KB} under 10 KB, ${report.storage.buckets.from10KBTo100KB} from 10–100 KB, ${report.storage.buckets.from100KBTo1MB} from 100 KB–1 MB, and ${report.storage.buckets.over1MB} over 1 MB.</p>`;
  }

  function downloadTransferAcceptanceV169() {
    if (!latestAcceptance) runTransferAcceptanceV169();
    if (!latestAcceptance) return;
    downloadJson(latestAcceptance, `methodz-transfer-acceptance-${new Date().toISOString().slice(0, 10)}.json`);
  }

  function downloadWorkspaceDiagnosticsV169() {
    if (!latestDiagnostics) return void runWorkspaceDiagnosticsV169().then((report) => report && downloadWorkspaceDiagnosticsV169());
    downloadJson(latestDiagnostics, `methodz-workspace-diagnostics-${new Date().toISOString().slice(0, 10)}.json`);
  }

  function downloadPreRollbackBackupV169() {
    const raw = global.localStorage.getItem(preRollbackKey);
    if (!raw) return alert("No pre-rollback current-state recovery package is available yet.");
    downloadJson(parseJson(raw, {}), `methodz-pre-rollback-recovery-${new Date().toISOString().slice(0, 10)}.json`);
  }

  function renderRollbackReload() {
    const preview = document.getElementById("transferRollbackPreviewV169");
    if (!preview) return;
    preview.classList.remove("is-hidden");
    preview.innerHTML = `<h4>Rollback Verified</h4><p>The pre-import snapshot matches the verified recovery package. The transferred state is preserved in a pre-rollback recovery package.</p><div class="button-row"><button type="button" onclick="location.reload()">Reload Restored Workspace</button><button type="button" onclick="downloadPreRollbackBackupV169()">Download Transferred-State Recovery</button></div>`;
  }

  function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(2)} MB`;
  }

  function start() {
    if (settings.enabled === false) return;
    try {
      api();
      installPanel();
      const state = parseJson(global.localStorage.getItem(acceptanceStateKey), null);
      if (state?.stage === "accepted") setStatus("This destination has a recorded browser-local acceptance report. Re-run checks whenever the workspace or transfer state changes.", "ready");
    } catch (error) {
      console.error(error);
    }
  }

  global.runTransferAcceptanceV169 = runTransferAcceptanceV169;
  global.acceptTransferredWorkspaceV169 = acceptTransferredWorkspaceV169;
  global.downloadTransferAcceptanceV169 = downloadTransferAcceptanceV169;
  global.previewTransferRollbackV169 = previewTransferRollbackV169;
  global.applyTransferRollbackV169 = applyTransferRollbackV169;
  global.downloadPreRollbackBackupV169 = downloadPreRollbackBackupV169;
  global.runWorkspaceDiagnosticsV169 = runWorkspaceDiagnosticsV169;
  global.downloadWorkspaceDiagnosticsV169 = downloadWorkspaceDiagnosticsV169;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
