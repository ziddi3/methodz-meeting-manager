/* Methodz Meeting Manager v1.6.6 browser queue portability and operator evidence workspace. */
(function initializeMethodzSyncPortabilityWorkspace(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.syncRehearsal || {};
  let pendingImport = null;
  let compactionPlan = null;

  global.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    if (!settings.enabled) return;
    try {
      requireApi();
      installPanel();
      instrumentCurrentCoordinator();
      wrapTenantApplication();
      renderEventSummary();
      setPortabilityStatus("Queue portability is ready. Import never mutates the queue until preview and explicit approval.", "ready");
    } catch (error) {
      setPortabilityStatus(`Queue portability unavailable: ${error.message}`, "error");
    }
  }

  function requireApi() {
    if (!global.MethodzSyncQueuePortabilityV166) throw new Error("The v1.6.6 queue portability core is unavailable.");
    if (!global.MethodzHostedProviderContract) throw new Error("The hosted-provider contract is unavailable.");
    return global.MethodzSyncQueuePortabilityV166;
  }

  function workspace() {
    return global.MethodzSyncRehearsalWorkspaceV165 || null;
  }

  function currentCoordinator() {
    const coordinator = workspace()?.getCoordinator?.() || null;
    if (!coordinator) throw new Error("The v1.6.5 synchronization rehearsal coordinator is unavailable.");
    instrumentCoordinator(coordinator);
    return coordinator;
  }

  function currentTenantId() {
    return currentCoordinator().tenantId;
  }

  function tenantHash(tenantId) {
    return global.MethodzHostedProviderContract.fnv1a32(String(tenantId));
  }

  function eventStorageKey(tenantId) {
    const base = config.storageKeys?.syncRehearsalOperatorEvents || "methodzSyncRehearsalOperatorEventsV166";
    return `${base}:${tenantHash(tenantId)}`;
  }

  function readEvents(tenantId = currentTenantId()) {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(eventStorageKey(tenantId)) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeEvents(events, tenantId = currentTenantId()) {
    global.localStorage.setItem(eventStorageKey(tenantId), JSON.stringify(events));
    renderEventSummary();
  }

  function logEvent(options = {}) {
    try {
      const Api = requireApi();
      const tenantId = options.tenantId || currentTenantId();
      const event = Api.createOperatorEvent({ ...options, tenantId });
      const events = Api.appendOperatorEvent(readEvents(tenantId), event, {
        maximumEvents: settings.maximumOperatorEvents || 300
      });
      writeEvents(events, tenantId);
      return event;
    } catch (error) {
      console.warn("Methodz synchronization operator event was not recorded:", error);
      return null;
    }
  }

  function installPanel() {
    if (document.getElementById("syncPortabilityPanelV166")) return;
    const parent = document.getElementById("syncRehearsalPanelV165");
    if (!parent) throw new Error("The synchronization rehearsal panel is unavailable.");
    const section = document.createElement("details");
    section.id = "syncPortabilityPanelV166";
    section.className = "sync-portability-v166";
    section.innerHTML = `
      <summary>Queue portability, compaction, and operator evidence <span class="release-badge-v166">v1.6.6</span></summary>
      <p class="helper-text">Move a tenant-scoped rehearsal queue through an integrity-checked package. Imported work is previewed before an explicit merge. No automatic processing occurs.</p>
      <div id="syncPortabilityStatusV166" class="sync-status-v165" aria-live="polite"></div>

      <div class="sync-portability-grid-v166">
        <section>
          <h3>Queue Package</h3>
          <div class="button-row">
            <button type="button" onclick="exportSyncQueuePackageV166()">Export Queue Package</button>
            <label class="button-like" for="syncQueueImportFileV166">Choose Queue Package</label>
          </div>
          <input id="syncQueueImportFileV166" class="import-control" type="file" accept="application/json,.json" />
          <label for="syncQueueMergeStrategyV166">Import Merge Strategy</label>
          <select id="syncQueueMergeStrategyV166">
            <option value="keep-local">Keep local on matching queue IDs</option>
            <option value="prefer-newest-metadata">Prefer newest updated metadata</option>
            <option value="retain-both">Retain both with regenerated imported IDs</option>
          </select>
          <div id="syncQueueImportPreviewV166" class="sync-import-preview-v166 is-hidden" aria-live="polite"></div>
        </section>

        <section>
          <h3>Completed-Entry Review</h3>
          <p class="helper-text">Only completed entries may be compacted. Pending, retryable, offline, and blocked-conflict work is always protected.</p>
          <div class="button-row">
            <button type="button" onclick="reviewSyncQueueCompactionV166()">Review Stale Completed Entries</button>
          </div>
          <div id="syncQueueCompactionPreviewV166" class="sync-import-preview-v166 is-hidden" aria-live="polite"></div>
        </section>
      </div>

      <section>
        <h3>Metadata-Only Operator Evidence</h3>
        <p id="syncOperatorEventSummaryV166" class="helper-text"></p>
        <div class="button-row">
          <button type="button" onclick="exportSyncOperatorEvidenceV166()">Export Operator Evidence</button>
          <button type="button" class="small-danger" onclick="clearSyncOperatorEvidenceV166()">Clear Local Event Log</button>
        </div>
        <p class="crypto-warning-v16"><strong>Boundary:</strong> this browser-local event log is not authenticated remote audit evidence. It omits meeting content, record IDs, tenant IDs, raw conflict tokens, idempotency keys, signatures, credentials, and private-key material.</p>
      </section>
    `;
    parent.appendChild(section);
    document.getElementById("syncQueueImportFileV166")?.addEventListener("change", previewQueueImport);
  }

  function instrumentCurrentCoordinator() {
    const coordinator = workspace()?.getCoordinator?.();
    if (coordinator) instrumentCoordinator(coordinator);
  }

  function instrumentCoordinator(coordinator) {
    if (!coordinator || coordinator.__methodzV166Instrumented) return coordinator;
    const tenantId = coordinator.tenantId;

    wrapMethod(coordinator, "enqueuePush", (result) => {
      logEvent({ tenantId, eventType: "enqueue", entryId: result?.id, operation: "push", state: result?.state, result: "queued" });
    });
    wrapMethod(coordinator, "enqueuePull", (result) => {
      logEvent({ tenantId, eventType: "enqueue", entryId: result?.id, operation: "pull", state: result?.state, result: "queued" });
    });
    wrapMethod(coordinator, "process", (result, args) => {
      logEvent({
        tenantId,
        eventType: "process",
        entryId: args[0],
        operation: result?.operation,
        state: result?.state,
        result: result?.state === "completed" ? "completed" : "stopped",
        errorCode: result?.lastError?.code || null
      });
    });
    wrapMethod(coordinator, "retry", (result, args) => {
      logEvent({ tenantId, eventType: "retry", entryId: args[0], operation: result?.operation, state: result?.state, result: "prepared" });
    });
    wrapMethod(coordinator, "discard", (result, args, before) => {
      logEvent({ tenantId, eventType: "discard", entryId: args[0], operation: before?.operation, state: before?.state, result: "discarded" });
    }, (args) => coordinator.getEntry?.(args[0]) || null);
    wrapMethod(coordinator, "setOnline", (result) => {
      logEvent({ tenantId, eventType: "reconnect", result: result ? "online" : "offline", counts: { queueEntries: coordinator.listQueue().length } });
    });
    wrapMethod(coordinator, "previewPull", (result) => {
      logEvent({
        tenantId,
        eventType: "pull-preview",
        result: result?.online ? "previewed" : "offline",
        counts: { candidates: result?.candidates?.length || 0, active: result?.active || 0, archived: result?.archived || 0 }
      });
    });
    wrapMethod(coordinator, "resolveConflict", (result, args) => {
      logEvent({
        tenantId,
        eventType: "conflict-decision",
        entryId: args[0],
        operation: result?.operation,
        state: result?.state,
        strategy: args[1],
        result: "recorded"
      });
    });

    Object.defineProperty(coordinator, "__methodzV166Instrumented", { value: true });
    return coordinator;
  }

  function wrapMethod(target, methodName, after, before) {
    const original = target?.[methodName];
    if (typeof original !== "function") return;
    target[methodName] = function instrumentedSyncMethod(...args) {
      const beforeValue = typeof before === "function" ? before(args) : null;
      const result = original.apply(this, args);
      if (result && typeof result.then === "function") {
        return result.then((resolved) => {
          after(resolved, args, beforeValue);
          return resolved;
        }).catch((error) => {
          logEvent({
            tenantId: this.tenantId,
            eventType: methodName === "previewPull" ? "pull-preview" : "process",
            entryId: args[0],
            result: "error",
            errorCode: error?.code || "UNEXPECTED_ERROR"
          });
          throw error;
        });
      }
      after(result, args, beforeValue);
      return result;
    };
  }

  function wrapTenantApplication() {
    const original = global.applySyncTenantV165;
    if (typeof original !== "function" || original.__methodzV166Wrapped) return;
    const wrapped = async function applyTenantWithPortability(...args) {
      const result = await original(...args);
      pendingImport = null;
      compactionPlan = null;
      instrumentCurrentCoordinator();
      resetPreviews();
      renderEventSummary();
      return result;
    };
    Object.defineProperty(wrapped, "__methodzV166Wrapped", { value: true });
    global.applySyncTenantV165 = wrapped;
  }

  global.exportSyncQueuePackageV166 = () => {
    try {
      const coordinator = currentCoordinator();
      const Api = requireApi();
      const payload = Api.buildQueuePackage({
        tenantId: coordinator.tenantId,
        providerId: coordinator.remoteProvider?.id,
        entries: coordinator.listQueue(),
        maximumEntries: settings.maximumImportedQueueEntries || settings.maximumQueueEntries || 250
      });
      downloadJson(payload, `methodz-sync-queue-${tenantHash(coordinator.tenantId)}-${new Date().toISOString().slice(0, 10)}.json`);
      logEvent({
        tenantId: coordinator.tenantId,
        eventType: "queue-export",
        result: "exported",
        counts: { entries: payload.summary.entryCount, conflicts: payload.summary.conflictCount }
      });
      setPortabilityStatus("Integrity-checked tenant queue package exported. Queue work was not processed.", "ready");
    } catch (error) {
      setPortabilityStatus(error.message || String(error), "error");
    }
  };

  async function previewQueueImport(event) {
    const file = event.target.files?.[0];
    const preview = document.getElementById("syncQueueImportPreviewV166");
    pendingImport = null;
    if (!file || !preview) return;
    try {
      const parsed = JSON.parse(await file.text());
      const coordinator = currentCoordinator();
      const report = requireApi().inspectQueuePackage(parsed, {
        expectedTenantId: coordinator.tenantId,
        maximumEntries: settings.maximumImportedQueueEntries || settings.maximumQueueEntries || 250
      });
      if (!report.valid) throw new Error(report.errors.join(" ") || "Queue package validation failed.");
      pendingImport = { payload: parsed, report, filename: file.name };
      preview.classList.remove("is-hidden", "has-error");
      preview.innerHTML = `
        <h4>Verified Queue Import Preview</h4>
        <p><strong>${escapeHtml(file.name)}</strong></p>
        <div class="sync-preview-metrics-v166">
          <span><strong>${report.summary.entryCount}</strong> entries</span>
          <span><strong>${report.summary.operations.push || 0}</strong> pushes</span>
          <span><strong>${report.summary.operations.pull || 0}</strong> pulls</span>
          <span><strong>${report.summary.conflictCount}</strong> conflicts</span>
          <span><strong>${report.summary.protectedCount}</strong> protected</span>
        </div>
        <p class="helper-text">Tenant ${escapeHtml(report.tenantReference)} · generated ${escapeHtml(formatDate(report.generatedAt))} · integrity verified. No local queue data has changed.</p>
        ${report.warnings.length ? `<p class="sync-warning-v166">${escapeHtml(report.warnings.join(" "))}</p>` : ""}
        <div class="button-row">
          <button type="button" onclick="applySyncQueueImportV166()">Approve and Apply Import</button>
          <button type="button" onclick="cancelSyncQueueImportV166()">Cancel</button>
        </div>
      `;
      setPortabilityStatus("Queue package verified. Review the preview and merge strategy before approval.", "warning");
    } catch (error) {
      preview.classList.remove("is-hidden");
      preview.classList.add("has-error");
      preview.innerHTML = `<h4>Queue Package Rejected</h4><p>${escapeHtml(error.message || String(error))}</p>`;
      setPortabilityStatus("Queue import failed closed. Local queue data was not changed.", "error");
    }
  }

  global.applySyncQueueImportV166 = () => {
    try {
      if (!pendingImport?.report?.valid) throw new Error("Choose and verify a queue package first.");
      const coordinator = currentCoordinator();
      const strategy = document.getElementById("syncQueueMergeStrategyV166")?.value || "keep-local";
      if (!global.confirm(`Apply the verified queue package using the ${strategy} strategy? This changes the browser-local rehearsal queue but does not process it.`)) return;
      const merged = requireApi().mergeQueues(coordinator.listQueue(), pendingImport.report.entries, {
        tenantId: coordinator.tenantId,
        strategy,
        maximumEntries: settings.maximumQueueEntries || 250
      });
      coordinator.queueStore.write(merged.entries);
      coordinator.emit();
      logEvent({
        tenantId: coordinator.tenantId,
        eventType: "queue-import",
        result: "applied",
        strategy,
        counts: {
          imported: pendingImport.report.summary.entryCount,
          added: merged.summary.added,
          replaced: merged.summary.replacedByNewer,
          duplicated: merged.summary.duplicated,
          total: merged.summary.total
        }
      });
      pendingImport = null;
      clearImportInput();
      setPortabilityStatus("Verified queue import applied. Imported entries remain unprocessed until an operator presses Process.", "ready");
    } catch (error) {
      setPortabilityStatus(error.message || String(error), "error");
    }
  };

  global.cancelSyncQueueImportV166 = () => {
    pendingImport = null;
    clearImportInput();
    setPortabilityStatus("Queue import cancelled. Local queue data was not changed.", "ready");
  };

  global.reviewSyncQueueCompactionV166 = () => {
    try {
      const coordinator = currentCoordinator();
      compactionPlan = requireApi().planQueueCompaction(coordinator.listQueue(), {
        tenantId: coordinator.tenantId,
        staleDays: settings.staleReviewDays || 30,
        maximumRetained: settings.maximumQueueEntries || 250
      });
      logEvent({
        tenantId: coordinator.tenantId,
        eventType: "compaction-review",
        result: "reviewed",
        counts: {
          candidates: compactionPlan.candidates.length,
          protected: compactionPlan.protectedEntries,
          completed: compactionPlan.completedEntries
        }
      });
      renderCompactionPlan();
      setPortabilityStatus(compactionPlan.candidates.length ? "Completed queue entries are ready for explicit review." : "No stale completed entries require review.", "ready");
    } catch (error) {
      setPortabilityStatus(error.message || String(error), "error");
    }
  };

  function renderCompactionPlan() {
    const preview = document.getElementById("syncQueueCompactionPreviewV166");
    if (!preview || !compactionPlan) return;
    preview.classList.remove("is-hidden", "has-error");
    if (!compactionPlan.candidates.length) {
      preview.innerHTML = `<p>No completed entries are stale before ${escapeHtml(formatDate(compactionPlan.staleBefore))}. ${compactionPlan.protectedEntries} protected entries remain untouched.</p>`;
      return;
    }
    preview.innerHTML = `
      <h4>Completed Entries Eligible for Removal</h4>
      <p class="helper-text">Stale before ${escapeHtml(formatDate(compactionPlan.staleBefore))}. Protected queue work is not listed.</p>
      ${compactionPlan.candidates.map((candidate) => `
        <label class="sync-compaction-option-v166">
          <input type="checkbox" class="sync-compaction-candidate-v166" value="${escapeHtml(candidate.id)}" checked />
          <span><strong>${escapeHtml(candidate.operation.toUpperCase())}</strong> · ${escapeHtml(candidate.entryReference)}<small>completed ${escapeHtml(formatDate(candidate.completedAt || candidate.updatedAt))}</small></span>
        </label>
      `).join("")}
      <div class="button-row">
        <button type="button" class="small-danger" onclick="applySyncQueueCompactionV166()">Remove Selected Completed Entries</button>
        <button type="button" onclick="cancelSyncQueueCompactionV166()">Cancel</button>
      </div>
    `;
  }

  global.applySyncQueueCompactionV166 = () => {
    try {
      if (!compactionPlan) throw new Error("Run the completed-entry review first.");
      const selected = [...document.querySelectorAll(".sync-compaction-candidate-v166:checked")].map((input) => input.value);
      if (!selected.length) throw new Error("Select at least one completed queue entry.");
      if (!global.confirm(`Remove ${selected.length} selected completed queue entr${selected.length === 1 ? "y" : "ies"}? Pending and blocked work remains protected.`)) return;
      const coordinator = currentCoordinator();
      const result = requireApi().applyQueueCompaction(coordinator.listQueue(), selected, {
        tenantId: coordinator.tenantId
      });
      coordinator.queueStore.write(result.entries);
      coordinator.emit();
      logEvent({ tenantId: coordinator.tenantId, eventType: "compaction-apply", result: "applied", counts: { removed: result.removed, remaining: result.entries.length } });
      compactionPlan = null;
      resetCompactionPreview();
      setPortabilityStatus(`${result.removed} completed queue entr${result.removed === 1 ? "y was" : "ies were"} removed after explicit approval.`, "ready");
    } catch (error) {
      setPortabilityStatus(error.message || String(error), "error");
    }
  };

  global.cancelSyncQueueCompactionV166 = () => {
    compactionPlan = null;
    resetCompactionPreview();
    setPortabilityStatus("Completed-entry review cancelled. The queue was not changed.", "ready");
  };

  global.exportSyncOperatorEvidenceV166 = () => {
    try {
      const coordinator = currentCoordinator();
      const events = readEvents(coordinator.tenantId);
      const payload = requireApi().buildOperatorEvidencePackage({ tenantId: coordinator.tenantId, events });
      downloadJson(payload, `methodz-sync-operator-evidence-${tenantHash(coordinator.tenantId)}-${new Date().toISOString().slice(0, 10)}.json`);
      setPortabilityStatus("Metadata-only operator evidence exported. It does not prove remote delivery, identity, authorization, or legal approval.", "ready");
    } catch (error) {
      setPortabilityStatus(error.message || String(error), "error");
    }
  };

  global.clearSyncOperatorEvidenceV166 = () => {
    try {
      const tenantId = currentTenantId();
      if (!global.confirm("Clear the browser-local operator event log for this rehearsal tenant? Queue entries and meeting records are not deleted.")) return;
      global.localStorage.removeItem(eventStorageKey(tenantId));
      renderEventSummary();
      setPortabilityStatus("Browser-local operator event log cleared for this tenant.", "warning");
    } catch (error) {
      setPortabilityStatus(error.message || String(error), "error");
    }
  };

  function renderEventSummary() {
    const element = document.getElementById("syncOperatorEventSummaryV166");
    if (!element) return;
    try {
      const events = readEvents(currentTenantId());
      const latest = events.at(-1)?.occurredAt;
      element.textContent = `${events.length} bounded browser-local event${events.length === 1 ? "" : "s"}${latest ? ` · latest ${formatDate(latest)}` : ""}.`;
    } catch (error) {
      element.textContent = "Operator event summary unavailable.";
    }
  }

  function clearImportInput() {
    const input = document.getElementById("syncQueueImportFileV166");
    const preview = document.getElementById("syncQueueImportPreviewV166");
    if (input) input.value = "";
    if (preview) {
      preview.innerHTML = "";
      preview.classList.add("is-hidden");
      preview.classList.remove("has-error");
    }
  }

  function resetCompactionPreview() {
    const preview = document.getElementById("syncQueueCompactionPreviewV166");
    if (!preview) return;
    preview.innerHTML = "";
    preview.classList.add("is-hidden");
    preview.classList.remove("has-error");
  }

  function resetPreviews() {
    clearImportInput();
    resetCompactionPreview();
  }

  function setPortabilityStatus(message, state) {
    const element = document.getElementById("syncPortabilityStatusV166");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state || "ready";
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value || "unknown") : date.toLocaleString();
  }

  function downloadJson(value, filename) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 0);
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
  }
})(window);
