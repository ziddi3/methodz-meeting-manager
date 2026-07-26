/* Methodz Meeting Manager v1.6.8 guided cross-device transfer rehearsal workspace. */
(function initializeCrossDeviceTransferV168(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.crossDeviceTransfer || {};
  const storageKeys = config.storageKeys || {};
  const preRestoreKey = storageKeys.preRestoreBackup || "methodzPreRestoreBackup";
  let pendingTransfer = null;
  let recoveryDrill = null;
  let lastReport = null;

  function api() {
    if (!global.MethodzCrossDeviceTransferV168) throw new Error("The v1.6.8 transfer rehearsal core is unavailable.");
    if (!global.MethodzWorkspacePackageCore) throw new Error("The workspace package core is unavailable.");
    if (!global.MethodzSyncQueuePortabilityV166) throw new Error("The queue portability core is unavailable.");
    return global.MethodzCrossDeviceTransferV168;
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

  function isRecognizedKey(key) {
    return typeof key === "string" && (key.startsWith("methodz") || key === "meetingRecords");
  }

  function preservedControlKeys() {
    return new Set([
      preRestoreKey,
      storageKeys.crossDeviceTransferState,
      storageKeys.crossDeviceTransferReports
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

  function currentCoordinator() {
    try { return global.MethodzSyncRehearsalWorkspaceV165?.getCoordinator?.() || null; } catch (error) { return null; }
  }

  function currentTenantId() {
    return currentCoordinator()?.tenantId
      || document.getElementById("syncTenantV165")?.value.trim()
      || config.syncRehearsal?.defaultTenantId
      || "methodz-rehearsal";
  }

  function tenantHash(tenantId) {
    return global.MethodzHostedProviderContract.fnv1a32(String(tenantId));
  }

  function currentQueueEntries() {
    const coordinator = currentCoordinator();
    return coordinator?.listQueue?.() || [];
  }

  function currentOperatorEvents(tenantId) {
    const base = storageKeys.syncRehearsalOperatorEvents || "methodzSyncRehearsalOperatorEventsV166";
    return parseJson(global.localStorage.getItem(`${base}:${tenantHash(tenantId)}`), []);
  }

  function workspaceLimits() {
    const recovery = config.workspaceRecovery || {};
    return {
      maxEntries: recovery.maximumEntries,
      maxEntryBytes: recovery.maximumEntryBytes,
      maxTotalBytes: recovery.maximumPackageBytes
    };
  }

  function inspectionOptions() {
    return {
      storageKeys,
      workspaceLimits: workspaceLimits(),
      preRestoreKey,
      maximumQueueEntries: config.syncRehearsal?.maximumImportedQueueEntries || config.syncRehearsal?.maximumQueueEntries || 250,
      currentWorkspaceEntries: collectWorkspaceEntries(),
      currentQueueEntries: currentQueueEntries()
    };
  }

  function downloadJson(payload, filename) {
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

  function setStatus(message, tone = "ready") {
    const element = document.getElementById("transferStatusV168");
    if (!element) return;
    element.textContent = message;
    element.className = `transfer-status-v168 is-${tone}`;
    global.announceMethodzStatus?.(message);
  }

  function installPanel() {
    if (document.getElementById("crossDeviceTransferPanelV168")) return;
    const anchor = document.getElementById("deviceReadinessV167") || document.getElementById("workspaceBackupPanelV08");
    const main = document.getElementById("mainContent");
    if (!main) return;

    const panel = document.createElement("section");
    panel.id = "crossDeviceTransferPanelV168";
    panel.className = "card cross-device-transfer-v168";
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="section-subheader transfer-header-v168">
        <div>
          <p class="eyebrow">Guided Recovery Rehearsal</p>
          <h2>Cross-Device Transfer</h2>
        </div>
        <span class="status-pill">v1.6.8</span>
      </div>
      <p class="helper-text">Build one integrity-checked rehearsal bundle, inspect it on the destination, run a no-write recovery drill, review collisions, and apply only after explicit approval. The source workspace remains unchanged.</p>
      <div id="transferStatusV168" class="transfer-status-v168 is-ready" aria-live="polite">Transfer rehearsal is ready. Nothing moves automatically.</div>

      <div class="transfer-grid-v168">
        <section class="transfer-stage-v168">
          <h3>1. Source Package</h3>
          <label class="transfer-check-v168"><input id="transferSourceSavedV168" type="checkbox" /> Current meeting and pending edits are saved.</label>
          <label class="transfer-check-v168"><input id="transferKeysSeparatedV168" type="checkbox" /> Private signing keys are stored separately and will not be included.</label>
          <div class="button-row">
            <button type="button" onclick="buildCrossDeviceTransferV168()">Build & Download Transfer Bundle</button>
          </div>
          <p class="helper-text">The bundle contains workspace values and queue entries. Protect it like a complete business backup.</p>
        </section>

        <section class="transfer-stage-v168">
          <h3>2. Destination Inspection</h3>
          <label class="button-like" for="transferImportFileV168">Choose Transfer Bundle</label>
          <input id="transferImportFileV168" class="import-control" type="file" accept="application/json,.json" />
          <div id="transferInspectionV168" class="transfer-preview-v168 is-hidden" aria-live="polite"></div>
        </section>
      </div>

      <section class="transfer-stage-v168 transfer-approval-v168">
        <h3>3. Recovery Drill & Controlled Import</h3>
        <div class="button-row">
          <button type="button" onclick="runCrossDeviceRecoveryDrillV168()">Run No-Write Recovery Drill</button>
          <button type="button" onclick="downloadCrossDeviceTransferReportV168()">Download Latest Metadata Report</button>
        </div>
        <div id="transferDrillV168" class="transfer-preview-v168 is-hidden" aria-live="polite"></div>
        <div class="transfer-confirmations-v168">
          <label class="transfer-check-v168"><input id="transferDestinationReadyV168" type="checkbox" /> Device Readiness was reviewed on this destination.</label>
          <label class="transfer-check-v168"><input id="transferCollisionReviewedV168" type="checkbox" /> Package integrity and all destination collisions were reviewed.</label>
          <label class="transfer-check-v168"><input id="transferSourceUnchangedV168" type="checkbox" /> The source workspace will remain unchanged until destination verification is complete.</label>
          <label class="transfer-check-v168"><input id="transferImportApprovedV168" type="checkbox" /> I explicitly approve replacing destination Methodz workspace data with the verified package.</label>
          <label for="transferApprovalPhraseV168">Type <strong>${escapeHtml(settings.approvalPhrase || "TRANSFER")}</strong> to unlock import</label>
          <input id="transferApprovalPhraseV168" type="text" autocomplete="off" spellcheck="false" />
        </div>
        <div class="button-row">
          <button type="button" class="small-danger" onclick="applyCrossDeviceTransferV168()">Apply Verified Transfer</button>
          <button type="button" onclick="cancelCrossDeviceTransferV168()">Cancel Rehearsal</button>
        </div>
        <p class="crypto-warning-v16"><strong>Boundary:</strong> this browser-local rehearsal does not authenticate a person or device and does not prove delivery, authorization, approval legitimacy, or legal compliance. It never performs background transfer or synchronization.</p>
      </section>
    `;

    if (anchor) anchor.insertAdjacentElement("afterend", panel);
    else main.prepend(panel);
    document.getElementById("transferImportFileV168")?.addEventListener("change", previewCrossDeviceTransferV168);
  }

  async function buildCrossDeviceTransferV168() {
    try {
      if (!document.getElementById("transferSourceSavedV168")?.checked) throw new Error("Confirm that current meeting work is saved before building the bundle.");
      if (!document.getElementById("transferKeysSeparatedV168")?.checked) throw new Error("Confirm that private signing keys are being kept separately.");
      if (typeof global.createWorkspacePackageV08 !== "function") throw new Error("Workspace backup creation is unavailable.");

      const tenantId = currentTenantId();
      const coordinator = currentCoordinator();
      const workspacePackage = global.createWorkspacePackageV08();
      const queuePackage = global.MethodzSyncQueuePortabilityV166.buildQueuePackage({
        tenantId,
        providerId: coordinator?.remoteProvider?.id || config.syncRehearsal?.provider || "disposable-http-pilot",
        entries: coordinator?.listQueue?.() || [],
        maximumEntries: config.syncRehearsal?.maximumImportedQueueEntries || config.syncRehearsal?.maximumQueueEntries || 250
      });
      const operatorEvidencePackage = global.MethodzSyncQueuePortabilityV166.buildOperatorEvidencePackage({
        tenantId,
        events: currentOperatorEvents(tenantId)
      });
      const readinessReport = await global.collectDeviceReadinessV167();
      const payload = api().buildTransferPackage({
        workspacePackage,
        queuePackage,
        operatorEvidencePackage,
        readinessReport,
        storageKeys,
        workspaceLimits: workspaceLimits(),
        preRestoreKey,
        maximumQueueEntries: config.syncRehearsal?.maximumImportedQueueEntries || 250,
        expectedTenantId: tenantId,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion,
        checkpoints: {
          sourceWorkspaceSaved: true,
          privateKeysSeparated: true,
          sourceKeptUnchanged: true
        }
      });
      downloadJson(payload, `methodz-cross-device-transfer-${new Date().toISOString().slice(0, 10)}.json`);
      const state = {
        stage: "source-exported",
        generatedAt: payload.generatedAt,
        sourceSessionReference: payload.sourceSessionReference,
        workspaceSummary: payload.manifest.workspace.summary,
        queueSummary: payload.manifest.synchronizationQueue.summary
      };
      global.localStorage.setItem(storageKeys.crossDeviceTransferState, JSON.stringify(state));
      lastReport = api().buildRehearsalReport({
        stage: "source-exported",
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion,
        inspection: {
          valid: true,
          checksumVerified: true,
          sourceSessionReference: payload.sourceSessionReference,
          workspaceReport: { checksumVerified: true, summary: payload.manifest.workspace.summary },
          queueReport: { checksumVerified: true, summary: payload.manifest.synchronizationQueue.summary },
          operatorEvidenceReport: { checksumVerified: true, events: operatorEvidencePackage.events },
          readinessReport: { valid: true },
          collisions: { total: 0, counts: {} }
        },
        checkpoints: payload.checkpoints
      });
      persistReport(lastReport);
      setStatus("Transfer bundle downloaded. Store it off-device and keep the source workspace unchanged until destination verification is complete.", "ready");
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  async function previewCrossDeviceTransferV168(event) {
    const file = event.target.files?.[0];
    const preview = document.getElementById("transferInspectionV168");
    pendingTransfer = null;
    recoveryDrill = null;
    resetDrillPreview();
    if (!file || !preview) return;
    try {
      const payload = JSON.parse(await file.text());
      const inspection = api().inspectTransferPackage(payload, inspectionOptions());
      if (!inspection.valid) throw new Error(inspection.errors.join(" ") || "Transfer package validation failed.");
      pendingTransfer = { payload, inspection, filename: file.name };
      preview.classList.remove("is-hidden", "has-error");
      preview.innerHTML = renderInspection(inspection, file.name);
      lastReport = api().buildRehearsalReport({
        stage: "destination-inspected",
        inspection,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion,
        checkpoints: {
          ...inspection.checkpoints,
          destinationReadinessRun: false,
          packageInspected: true
        }
      });
      persistReport(lastReport);
      setStatus(inspection.collisions.total ? `Package verified. ${inspection.collisions.total} opaque destination collision reference(s) require review before import.` : "Package verified. No destination identifier collisions were found.", inspection.collisions.total ? "warning" : "ready");
    } catch (error) {
      preview.classList.remove("is-hidden");
      preview.classList.add("has-error");
      preview.innerHTML = `<h4>Transfer Package Rejected</h4><p>${escapeHtml(error.message || String(error))}</p>`;
      setStatus("Transfer inspection failed closed. Destination workspace data was not changed.", "error");
    }
  }

  function renderInspection(inspection, filename) {
    const collisionRows = Object.entries(inspection.collisions.counts)
      .filter(([, count]) => count > 0)
      .map(([name, count]) => `<li><strong>${escapeHtml(humanize(name))}</strong>: ${count}</li>`)
      .join("");
    return `
      <h4>Verified Destination Preview</h4>
      <p><strong>${escapeHtml(filename)}</strong></p>
      <div class="transfer-metrics-v168">
        <span><strong>${inspection.workspaceReport.summary.activeRecords || 0}</strong> active</span>
        <span><strong>${inspection.workspaceReport.summary.archivedRecords || 0}</strong> archived</span>
        <span><strong>${inspection.workspaceReport.summary.revisionGroups || 0}</strong> revision groups</span>
        <span><strong>${inspection.queueReport.summary.entryCount || 0}</strong> queue entries</span>
        <span><strong>${inspection.operatorEvidenceReport.events.length}</strong> operator events</span>
        <span><strong>${inspection.collisions.total}</strong> collisions</span>
      </div>
      <p class="helper-text">Transfer, workspace, queue, and operator-evidence integrity verified. Source ${escapeHtml(inspection.sourceSessionReference)}.</p>
      ${collisionRows ? `<div class="transfer-collisions-v168"><h5>Collision Review</h5><ul>${collisionRows}</ul><p>References are hashed. Review does not expose raw record, key, or queue identifiers.</p></div>` : `<p class="transfer-clear-v168">No identifier collisions were detected across active records, Archive Vault entries, revisions, public verification keys, or queue entries.</p>`}
    `;
  }

  function runCrossDeviceRecoveryDrillV168() {
    try {
      if (!pendingTransfer?.inspection?.valid) throw new Error("Choose and verify a transfer bundle first.");
      const current = collectWorkspaceEntries();
      const plan = global.MethodzWorkspacePackageCore.buildRestorePlan(
        pendingTransfer.payload.components.workspace,
        current,
        {
          mode: "replace",
          storageKeys,
          limits: workspaceLimits(),
          preRestoreKey
        }
      );
      if (!plan.report.valid || !plan.report.checksumVerified) throw new Error("The no-write recovery drill could not verify the workspace package.");
      recoveryDrill = {
        passed: true,
        generatedAt: new Date().toISOString(),
        counts: plan.counts,
        collisionCount: pendingTransfer.inspection.collisions.total
      };
      const preview = document.getElementById("transferDrillV168");
      preview?.classList.remove("is-hidden", "has-error");
      if (preview) preview.innerHTML = `
        <h4>No-Write Recovery Drill Passed</h4>
        <div class="transfer-metrics-v168">
          <span><strong>${plan.counts.add || 0}</strong> add</span>
          <span><strong>${plan.counts.replace || 0}</strong> replace</span>
          <span><strong>${plan.counts.unchanged || 0}</strong> unchanged</span>
          <span><strong>${plan.counts.remove || 0}</strong> remove</span>
          <span><strong>${plan.counts.ignored || 0}</strong> ignored</span>
        </div>
        <p class="helper-text">No browser storage value was changed. The package was revalidated and a replacement mutation plan was generated.</p>
      `;
      lastReport = api().buildRehearsalReport({
        stage: "recovery-drill-passed",
        inspection: pendingTransfer.inspection,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion,
        checkpoints: {
          ...pendingTransfer.inspection.checkpoints,
          packageInspected: true,
          recoveryDrillPassed: true
        }
      });
      persistReport(lastReport);
      setStatus("No-write recovery drill passed. Review collisions and complete every destination confirmation before import.", "ready");
      return true;
    } catch (error) {
      recoveryDrill = null;
      const preview = document.getElementById("transferDrillV168");
      preview?.classList.remove("is-hidden");
      preview?.classList.add("has-error");
      if (preview) preview.innerHTML = `<h4>Recovery Drill Failed</h4><p>${escapeHtml(error.message || String(error))}</p>`;
      setStatus("Recovery drill failed closed. Destination workspace data was not changed.", "error");
      return false;
    }
  }

  function applyCrossDeviceTransferV168() {
    const phrase = settings.approvalPhrase || "TRANSFER";
    let recoveryCreated = false;
    let mutationApplied = false;
    let rollbackApplied = false;
    try {
      if (!pendingTransfer?.inspection?.valid) throw new Error("Choose and verify a transfer bundle first.");
      if (!recoveryDrill?.passed) throw new Error("Run and pass the no-write recovery drill first.");
      if (!document.getElementById("transferDestinationReadyV168")?.checked) throw new Error("Confirm that Device Readiness was reviewed on this destination.");
      if (!document.getElementById("transferCollisionReviewedV168")?.checked) throw new Error("Confirm that integrity and destination collisions were reviewed.");
      if (!document.getElementById("transferSourceUnchangedV168")?.checked) throw new Error("Confirm that the source workspace will remain unchanged until verification is complete.");
      if (!document.getElementById("transferImportApprovedV168")?.checked) throw new Error("Explicit import approval is required.");
      if (document.getElementById("transferApprovalPhraseV168")?.value.trim() !== phrase) throw new Error(`Type ${phrase} exactly to unlock import.`);

      const freshInspection = api().inspectTransferPackage(pendingTransfer.payload, inspectionOptions());
      if (!freshInspection.valid) throw new Error(freshInspection.errors.join(" ") || "Transfer package revalidation failed immediately before mutation.");
      if (!global.confirm("Replace destination Methodz workspace data with this verified transfer package? A complete local pre-import recovery package will be created first.")) return;

      const beforeEntries = collectWorkspaceEntries();
      const recoveryPackage = global.createWorkspacePackageV08();
      global.localStorage.setItem(preRestoreKey, JSON.stringify(recoveryPackage));
      recoveryCreated = true;

      try {
        applyEntriesTransaction(freshInspection.workspaceReport.recognizedEntries, beforeEntries);
        verifyAppliedEntries(freshInspection.workspaceReport.recognizedEntries);
        mutationApplied = true;
      } catch (error) {
        restoreSnapshot(beforeEntries);
        rollbackApplied = true;
        throw error;
      }

      const checkpoints = {
        ...freshInspection.checkpoints,
        destinationReadinessRun: true,
        packageInspected: true,
        recoveryDrillPassed: true,
        importApproved: true,
        sourceKeptUnchanged: true,
        postImportVerified: true
      };
      lastReport = api().buildRehearsalReport({
        stage: "destination-import-verified",
        inspection: freshInspection,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion,
        checkpoints,
        recoveryCreated,
        mutationApplied,
        rollbackApplied
      });
      persistReport(lastReport);
      global.localStorage.setItem(storageKeys.crossDeviceTransferState, JSON.stringify({
        stage: "destination-import-verified",
        completedAt: new Date().toISOString(),
        sourceSessionReference: freshInspection.sourceSessionReference,
        reportChecksum: lastReport.checksum
      }));
      setStatus("Verified transfer applied. The imported storage values match the package and a pre-import recovery package is available. Reload to activate the destination workspace.", "ready");
      renderReloadAction();
    } catch (error) {
      lastReport = pendingTransfer?.inspection ? api().buildRehearsalReport({
        stage: rollbackApplied ? "import-rolled-back" : "import-blocked",
        inspection: pendingTransfer.inspection,
        appShellVersion: config.appShellVersion,
        recordSchemaVersion: config.schemaVersion,
        checkpoints: pendingTransfer.inspection.checkpoints,
        recoveryCreated,
        mutationApplied,
        rollbackApplied
      }) : lastReport;
      if (lastReport) persistReport(lastReport);
      setStatus(rollbackApplied ? `Import failed and the original destination snapshot was restored: ${error.message}` : error.message || String(error), "error");
    }
  }

  function applyEntriesTransaction(incomingEntries, beforeEntries) {
    const preserve = preservedControlKeys();
    Object.keys(beforeEntries).forEach((key) => {
      if (!preserve.has(key)) global.localStorage.removeItem(key);
    });
    Object.entries(incomingEntries).forEach(([key, value]) => {
      if (!isRecognizedKey(key) || preserve.has(key) || typeof value !== "string") return;
      global.localStorage.setItem(key, value);
    });
  }

  function verifyAppliedEntries(incomingEntries) {
    const preserve = preservedControlKeys();
    for (const [key, value] of Object.entries(incomingEntries)) {
      if (!isRecognizedKey(key) || preserve.has(key)) continue;
      if (global.localStorage.getItem(key) !== value) throw new Error(`Post-import verification failed for storage entry ${key}.`);
    }
  }

  function restoreSnapshot(beforeEntries) {
    const preserve = preservedControlKeys();
    const current = collectWorkspaceEntries();
    Object.keys(current).forEach((key) => {
      if (!preserve.has(key)) global.localStorage.removeItem(key);
    });
    Object.entries(beforeEntries).forEach(([key, value]) => {
      if (!preserve.has(key)) global.localStorage.setItem(key, value);
    });
  }

  function persistReport(report) {
    if (!report) return;
    const key = storageKeys.crossDeviceTransferReports || "methodzCrossDeviceTransferReportsV168";
    const reports = parseJson(global.localStorage.getItem(key), []);
    const next = (Array.isArray(reports) ? reports : []).concat(report).slice(-(Number(settings.maximumReports) || 50));
    global.localStorage.setItem(key, JSON.stringify(next));
  }

  function downloadCrossDeviceTransferReportV168() {
    try {
      if (!lastReport) {
        const reports = parseJson(global.localStorage.getItem(storageKeys.crossDeviceTransferReports), []);
        lastReport = Array.isArray(reports) ? reports.at(-1) : null;
      }
      if (!lastReport) throw new Error("No transfer rehearsal report is available yet.");
      downloadJson(lastReport, `methodz-cross-device-transfer-report-${new Date().toISOString().slice(0, 10)}.json`);
      setStatus("Metadata-only transfer rehearsal report downloaded.", "ready");
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  function cancelCrossDeviceTransferV168() {
    pendingTransfer = null;
    recoveryDrill = null;
    const input = document.getElementById("transferImportFileV168");
    if (input) input.value = "";
    const inspection = document.getElementById("transferInspectionV168");
    if (inspection) {
      inspection.innerHTML = "";
      inspection.classList.add("is-hidden");
      inspection.classList.remove("has-error");
    }
    resetDrillPreview();
    ["transferDestinationReadyV168", "transferCollisionReviewedV168", "transferSourceUnchangedV168", "transferImportApprovedV168"].forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.checked = false;
    });
    const phrase = document.getElementById("transferApprovalPhraseV168");
    if (phrase) phrase.value = "";
    setStatus("Transfer rehearsal cancelled. Destination workspace data was not changed.", "ready");
  }

  function resetDrillPreview() {
    const preview = document.getElementById("transferDrillV168");
    if (!preview) return;
    preview.innerHTML = "";
    preview.classList.add("is-hidden");
    preview.classList.remove("has-error");
  }

  function renderReloadAction() {
    const preview = document.getElementById("transferDrillV168");
    if (!preview) return;
    preview.classList.remove("is-hidden", "has-error");
    preview.innerHTML = `<h4>Destination Verification Complete</h4><p>The transfer package values were written and verified. A pre-import recovery package is stored locally.</p><div class="button-row"><button type="button" onclick="location.reload()">Reload Destination Workspace</button><button type="button" onclick="downloadPreRestoreBackupV08()">Download Pre-Import Recovery</button></div>`;
  }

  function humanize(value) {
    return String(value).replace(/([A-Z])/g, " $1").replace(/^./, (char) => char.toUpperCase());
  }

  function start() {
    if (settings.enabled === false) return;
    try {
      api();
      installPanel();
      setStatus("Transfer rehearsal is ready. Nothing moves automatically.", "ready");
    } catch (error) {
      console.error(error);
    }
  }

  global.buildCrossDeviceTransferV168 = buildCrossDeviceTransferV168;
  global.previewCrossDeviceTransferV168 = previewCrossDeviceTransferV168;
  global.runCrossDeviceRecoveryDrillV168 = runCrossDeviceRecoveryDrillV168;
  global.applyCrossDeviceTransferV168 = applyCrossDeviceTransferV168;
  global.downloadCrossDeviceTransferReportV168 = downloadCrossDeviceTransferReportV168;
  global.cancelCrossDeviceTransferV168 = cancelCrossDeviceTransferV168;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
