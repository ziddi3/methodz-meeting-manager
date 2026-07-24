/* Methodz Meeting Manager v1.6.5 browser synchronization rehearsal workspace. */
(function initializeMethodzSyncRehearsalWorkspace(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.syncRehearsal || {};
  let coordinator = null;
  let remoteProvider = null;
  let simulator = null;
  let pullPreview = null;

  global.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    if (!settings.enabled) return;
    try {
      installPanel();
      initializeCoordinator();
      renderAll();
      setStatus("Ready. Synchronization runs only when you press a rehearsal action.", "ready");
    } catch (error) {
      setStatus(`Rehearsal unavailable: ${error.message}`, "error");
    }
  }

  function requireApi() {
    if (!global.MethodzSyncRehearsalV165) throw new Error("The synchronization rehearsal core is unavailable.");
    if (!global.MethodzHttpProviderPilot) throw new Error("The disposable HTTP-style provider pilot is unavailable.");
    if (!global.MethodzHostedProviderAdapters) throw new Error("Hosted-provider adapters are unavailable.");
    return global.MethodzSyncRehearsalV165;
  }

  function installPanel() {
    if (document.getElementById("syncRehearsalPanelV165")) return;
    const anchor = document.getElementById("savedRecords")?.closest(".card") || document.querySelector("main");
    if (!anchor) return;
    const panel = document.createElement("section");
    panel.id = "syncRehearsalPanelV165";
    panel.className = "card sync-rehearsal-v165";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <p class="eyebrow">Offline Synchronization Laboratory</p>
          <h2>Synchronization Rehearsal Coordinator</h2>
          <p class="helper-text">Explicitly queue, preview, push, pull, retry, discard, and review conflicts against a disposable local HTTP-style provider simulator. No production endpoint or credential is used.</p>
        </div>
        <span class="release-badge-v165">v1.6.5</span>
      </div>

      <div id="syncRehearsalStatusV165" class="sync-status-v165" aria-live="polite"></div>

      <div class="sync-controls-v165">
        <label for="syncTenantV165">Rehearsal Tenant</label>
        <input id="syncTenantV165" type="text" value="${escapeHtml(settings.defaultTenantId || "methodz-rehearsal")}" maxlength="100" />
        <button type="button" onclick="applySyncTenantV165()">Apply Tenant</button>
        <button type="button" id="syncConnectivityButtonV165" onclick="toggleSyncConnectivityV165()">Go Offline</button>
        <button type="button" onclick="refreshSyncRehearsalV165()">Refresh</button>
      </div>

      <details open>
        <summary>Local records and outbound push queue</summary>
        <div id="syncLocalRecordsV165" class="sync-record-list-v165"></div>
        <div class="button-row">
          <button type="button" onclick="enqueueSelectedPushV165()">Enqueue Selected Push</button>
          <button type="button" onclick="processPendingSyncV165()">Process Pending Queue</button>
        </div>
      </details>

      <details>
        <summary>Remote pull preview</summary>
        <p class="helper-text">Preview compares fingerprints only. Nothing is written locally until a queued pull is processed.</p>
        <div class="button-row">
          <button type="button" onclick="previewRemotePullV165()">Preview Remote Changes</button>
          <button type="button" onclick="enqueuePreviewedPullsV165()">Enqueue Previewed Pulls</button>
        </div>
        <div id="syncPullPreviewV165" class="sync-preview-v165"></div>
      </details>

      <details open>
        <summary>Durable rehearsal queue</summary>
        <div id="syncQueueSummaryV165" class="helper-text"></div>
        <div id="syncQueueV165" class="sync-queue-v165"></div>
      </details>

      <details>
        <summary>Rehearsal evidence</summary>
        <div class="button-row">
          <button type="button" onclick="exportSyncRehearsalReportV165()">Export Metadata-Only Report</button>
          <button type="button" onclick="clearCompletedSyncEntriesV165()">Clear Completed Entries</button>
          <button type="button" class="small-danger" onclick="resetDisposableRemoteV165()">Reset Disposable Remote</button>
        </div>
        <p class="crypto-warning-v16"><strong>Boundary:</strong> queue snapshots remain browser-local. Exported reports omit meeting values, credentials, tokens, signatures, private keys, private JWK parameters, and raw conflict tokens.</p>
      </details>
    `;
    anchor.insertAdjacentElement("beforebegin", panel);
  }

  function initializeCoordinator() {
    const Api = requireApi();
    const tenantId = document.getElementById("syncTenantV165")?.value.trim() || settings.defaultTenantId || "methodz-rehearsal";
    const tenantHash = global.MethodzHostedProviderContract.fnv1a32(tenantId);
    const remoteKeys = {
      activeRecords: `methodzRehearsalRemoteActive:${tenantHash}`,
      archivedRecords: `methodzRehearsalRemoteArchived:${tenantHash}`,
      revisions: `methodzRehearsalRemoteRevisions:${tenantHash}`,
      idempotency: `methodzRehearsalRemoteIdempotency:${tenantHash}`
    };

    simulator = new global.MethodzHttpProviderPilot.HttpProviderSimulator({
      id: `methodz-sync-rehearsal-simulator:${tenantHash}`,
      providerFactory: () => new global.MethodzHostedProviderAdapters.LocalStorageHostedProvider({
        id: `methodz-sync-rehearsal-remote:${tenantHash}`,
        label: "Disposable Rehearsal Remote",
        storage: global.localStorage,
        keys: remoteKeys
      })
    });
    remoteProvider = new global.MethodzHttpProviderPilot.HttpHostedProviderClient({
      simulator,
      tenantId,
      id: `methodz-sync-rehearsal-client:${tenantHash}`,
      maxRetries: 0,
      timeoutMs: 700
    });

    coordinator = new Api.SyncRehearsalCoordinator({
      tenantId,
      remoteProvider,
      localRepository: createLocalRepository(),
      queueStore: new Api.StorageQueueStore({
        storage: global.localStorage,
        key: config.storageKeys?.syncRehearsalQueue,
        maximumEntries: settings.maximumQueueEntries
      })
    });
    coordinator.subscribe(renderAll);
    global.MethodzSyncRehearsalWorkspaceV165 = Object.freeze({
      getCoordinator: () => coordinator,
      getRemoteProvider: () => remoteProvider,
      getSimulator: () => simulator,
      refresh: renderAll
    });
  }

  function createLocalRepository() {
    const activeKey = config.storageKeys?.records || "methodzMeetingRecords";
    const archivedKey = config.storageKeys?.archivedRecords || "methodzArchivedMeetingRecords";
    const read = (key, fallback) => {
      try {
        const parsed = JSON.parse(global.localStorage.getItem(key) || JSON.stringify(fallback));
        return parsed;
      } catch (error) {
        return fallback;
      }
    };
    const write = (key, value) => global.localStorage.setItem(key, JSON.stringify(value));
    return {
      async getRecord(recordId) {
        return read(activeKey, []).find((record) => record.id === recordId)
          || read(archivedKey, []).find((record) => record.id === recordId)
          || null;
      },
      async upsertRecord(record, options = {}) {
        const validated = global.MethodzHostedProviderContract.assertRecord(record, "localRehearsalUpsert", "browser-local-workspace");
        let active = read(activeKey, []);
        let archived = read(archivedKey, []);
        active = active.filter((item) => item.id !== validated.id);
        archived = archived.filter((item) => item.id !== validated.id);
        if (options.archived || validated.providerMetadata?.archivedAt) archived.push(validated);
        else active.push(validated);
        write(activeKey, active);
        write(archivedKey, archived);
        if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
        if (typeof global.updateStorageStats === "function") global.updateStorageStats();
        return validated;
      }
    };
  }

  function readLocalRecords() {
    try {
      const records = JSON.parse(global.localStorage.getItem(config.storageKeys?.records) || "[]");
      return Array.isArray(records) ? records : [];
    } catch (error) {
      return [];
    }
  }

  function renderAll() {
    renderLocalRecords();
    renderQueue();
    renderPullPreview();
    const button = document.getElementById("syncConnectivityButtonV165");
    if (button && coordinator) button.textContent = coordinator.online ? "Go Offline" : "Reconnect";
  }

  function renderLocalRecords() {
    const container = document.getElementById("syncLocalRecordsV165");
    if (!container) return;
    const records = readLocalRecords();
    if (!records.length) {
      container.innerHTML = '<p class="helper-text">Save a meeting record before rehearsing a push.</p>';
      return;
    }
    container.innerHTML = records.map((record) => `
      <label class="sync-record-option-v165">
        <input type="checkbox" class="sync-local-record-v165" value="${escapeHtml(record.id)}" />
        <span><strong>${escapeHtml(record.title || "Untitled meeting")}</strong><small>${escapeHtml(record.date || "No date")} · ${escapeHtml(record.status || "No status")} · ${escapeHtml(safeRef(record.id))}</small></span>
      </label>
    `).join("");
  }

  function renderQueue() {
    const container = document.getElementById("syncQueueV165");
    const summary = document.getElementById("syncQueueSummaryV165");
    if (!container || !coordinator) return;
    const entries = coordinator.listQueue();
    const counts = entries.reduce((result, entry) => ({ ...result, [entry.state]: (result[entry.state] || 0) + 1 }), {});
    if (summary) summary.textContent = `${entries.length} queue entries · ${Object.entries(counts).map(([state, count]) => `${state}: ${count}`).join(" · ") || "empty"}`;
    if (!entries.length) {
      container.innerHTML = '<p class="helper-text">The durable rehearsal queue is empty.</p>';
      return;
    }
    container.innerHTML = entries.map((entry) => {
      const preview = coordinator.previewEntry(entry.id);
      const conflict = entry.state === "blocked-conflict" ? coordinator.conflictPreview(entry.id) : null;
      return `
        <article class="sync-entry-v165 sync-state-${escapeHtml(entry.state)}">
          <div class="item-header">
            <div><strong>${escapeHtml(entry.operation.toUpperCase())}</strong> · ${escapeHtml(preview.recordRef)}<br><small>${escapeHtml(entry.state)} · attempts ${Number(entry.attempts || 0)} · ${escapeHtml(entry.contentFingerprint)}</small></div>
            <span class="sync-state-badge-v165">${escapeHtml(entry.state)}</span>
          </div>
          ${entry.lastError ? `<p class="sync-error-v165"><strong>${escapeHtml(entry.lastError.code)}</strong>: ${escapeHtml(entry.lastError.message)}</p>` : ""}
          ${conflict ? `<details><summary>Three-way conflict paths</summary><p><strong>Local:</strong> ${escapeHtml(conflict.localChangedPaths.join(", ") || "none")}</p><p><strong>Remote:</strong> ${escapeHtml(conflict.remoteChangedPaths.join(", ") || "none")}</p><p><strong>Overlap:</strong> ${escapeHtml(conflict.overlappingPaths.join(", ") || "none")}</p></details>` : ""}
          <div class="button-row sync-entry-actions-v165">
            ${["pending", "retryable-error", "offline"].includes(entry.state) ? `<button type="button" onclick="processSyncEntryV165('${escapeJs(entry.id)}')">Process</button>` : ""}
            ${["retryable-error", "offline"].includes(entry.state) ? `<button type="button" onclick="retrySyncEntryV165('${escapeJs(entry.id)}')">Retry</button>` : ""}
            ${entry.state === "blocked-conflict" ? `<button type="button" onclick="resolveSyncConflictV165('${escapeJs(entry.id)}','accept-remote')">Accept Remote</button><button type="button" onclick="resolveSyncConflictV165('${escapeJs(entry.id)}','keep-local')">Keep Local</button>${entry.operation === "push" ? `<button type="button" onclick="resolveSyncConflictV165('${escapeJs(entry.id)}','rebase-and-push')">Rebase & Push</button>` : ""}` : ""}
            <button type="button" class="small-danger" onclick="discardSyncEntryV165('${escapeJs(entry.id)}')">Discard</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderPullPreview() {
    const container = document.getElementById("syncPullPreviewV165");
    if (!container) return;
    if (!pullPreview) {
      container.innerHTML = '<p class="helper-text">No remote preview has been run.</p>';
      return;
    }
    if (!pullPreview.online) {
      container.innerHTML = '<p class="sync-error-v165">Reconnect before previewing remote changes.</p>';
      return;
    }
    if (!pullPreview.candidates.length) {
      container.innerHTML = `<p class="helper-text">Remote active: ${pullPreview.active}; remote archived: ${pullPreview.archived}. No differing records found.</p>`;
      return;
    }
    container.innerHTML = `<p class="helper-text">${pullPreview.candidates.length} differing remote record(s).</p>${pullPreview.candidates.map((item) => `
      <label class="sync-record-option-v165">
        <input type="checkbox" class="sync-pull-candidate-v165" value="${escapeHtml(item.recordId)}" checked />
        <span><strong>${escapeHtml(item.recordRef)}</strong><small>${item.localExists ? "Local copy differs" : "Remote-only record"} · ${item.remoteArchived ? "remote archived" : "remote active"}</small></span>
      </label>
    `).join("")}`;
  }

  async function guarded(action, successMessage) {
    try {
      await action();
      renderAll();
      if (successMessage) setStatus(successMessage, "ready");
    } catch (error) {
      setStatus(error.message || String(error), "error");
    }
  }

  global.applySyncTenantV165 = () => guarded(async () => {
    initializeCoordinator();
    pullPreview = null;
  }, "Rehearsal tenant applied. Queue and disposable remote storage are tenant-scoped.");

  global.toggleSyncConnectivityV165 = () => {
    coordinator.setOnline(!coordinator.online);
    setStatus(coordinator.online ? "Reconnected. Pending entries remain user-controlled." : "Offline rehearsal mode enabled. No remote operation will run.", coordinator.online ? "ready" : "warning");
  };

  global.refreshSyncRehearsalV165 = renderAll;

  global.enqueueSelectedPushV165 = () => guarded(async () => {
    const selected = [...document.querySelectorAll(".sync-local-record-v165:checked")].map((input) => input.value);
    if (!selected.length) throw new Error("Select at least one local record.");
    const records = readLocalRecords();
    selected.forEach((id) => {
      const record = records.find((item) => item.id === id);
      if (record) coordinator.enqueuePush(record, { sourceConflictToken: record.providerMetadata?.conflictToken || null });
    });
  }, "Selected local records were queued. No remote write occurs until Process is pressed.");

  global.processSyncEntryV165 = (entryId) => guarded(() => coordinator.process(entryId), "Queue entry processed.");
  global.retrySyncEntryV165 = (entryId) => guarded(async () => {
    coordinator.retry(entryId);
    await coordinator.process(entryId);
  }, "Retry completed using the original idempotency key.");
  global.discardSyncEntryV165 = (entryId) => {
    if (!global.confirm("Discard this rehearsal queue entry? This does not delete a meeting record.")) return;
    coordinator.discard(entryId);
    setStatus("Queue entry discarded.", "ready");
  };
  global.processPendingSyncV165 = () => guarded(async () => {
    for (const entry of coordinator.listQueue().filter((item) => ["pending", "retryable-error", "offline"].includes(item.state))) {
      await coordinator.process(entry.id);
    }
  }, "Pending rehearsal entries processed in queue order.");

  global.previewRemotePullV165 = () => guarded(async () => {
    pullPreview = await coordinator.previewPull();
  }, "Remote pull preview refreshed without changing local records.");

  global.enqueuePreviewedPullsV165 = () => guarded(async () => {
    const selected = [...document.querySelectorAll(".sync-pull-candidate-v165:checked")].map((input) => input.value);
    if (!selected.length) throw new Error("Select at least one remote candidate.");
    for (const recordId of selected) await coordinator.enqueuePull(recordId);
  }, "Selected remote candidates were queued. Local records remain unchanged until Process is pressed.");

  global.resolveSyncConflictV165 = (entryId, strategy) => guarded(() => coordinator.resolveConflict(entryId, strategy), `Conflict action recorded: ${strategy}.`);

  global.exportSyncRehearsalReportV165 = () => {
    const report = coordinator.createReport();
    downloadJson(report, `methodz-sync-rehearsal-${new Date().toISOString().slice(0, 10)}.json`);
    setStatus("Metadata-only rehearsal report exported.", "ready");
  };

  global.clearCompletedSyncEntriesV165 = () => {
    const remaining = coordinator.listQueue().filter((entry) => entry.state !== "completed");
    coordinator.queueStore.write(remaining);
    coordinator.emit();
    setStatus("Completed queue entries cleared.", "ready");
  };

  global.resetDisposableRemoteV165 = () => {
    if (!global.confirm("Reset the disposable remote for this tenant? Local meeting records are not deleted.")) return;
    const tenantId = document.getElementById("syncTenantV165")?.value.trim() || settings.defaultTenantId;
    const tenantHash = global.MethodzHostedProviderContract.fnv1a32(tenantId);
    ["Active", "Archived", "Revisions", "Idempotency"].forEach((suffix) => global.localStorage.removeItem(`methodzRehearsalRemote${suffix}:${tenantHash}`));
    initializeCoordinator();
    pullPreview = null;
    renderAll();
    setStatus("Disposable remote state reset. Local records and queue entries were preserved.", "warning");
  };

  function setStatus(message, state) {
    const element = document.getElementById("syncRehearsalStatusV165");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state || "ready";
  }

  function safeRef(recordId) {
    return global.MethodzSyncRehearsalV165?.safeRecordReference(recordId) || "record";
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

  function escapeJs(value) {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  }
})(window);
