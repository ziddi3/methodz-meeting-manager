/* Methodz Meeting Manager v0.9 non-destructive workspace package merge mode. */
(function initializeV09WorkspaceMerge(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const keys = config.storageKeys || {};
  const recordsKey = keys.records || "methodzMeetingRecords";
  const archiveKey = keys.archivedRecords || "methodzArchivedMeetingRecords";
  const revisionsKey = keys.revisions || "methodzMeetingRevisions";
  const preRestoreKey = keys.preRestoreBackup || "methodzPreRestoreBackup";
  const mergeLogKey = keys.mergeLog || "methodzWorkspaceMergeLog";
  const migrationStateKey = keys.migrationState || "methodzMigrationState";
  let pendingPackage = null;
  let pendingFileName = "";

  global.addEventListener("DOMContentLoaded", initializeWorkspaceMergeV09);

  function initializeWorkspaceMergeV09() {
    installWorkspaceMergePanelV09();
  }

  function installWorkspaceMergePanelV09() {
    const backupPanel = document.getElementById("workspaceBackupPanelV08");
    const savedCard = document.getElementById("savedRecords")?.closest(".card");
    if ((!backupPanel && !savedCard) || document.getElementById("workspaceMergePanelV09")) return;

    const panel = document.createElement("section");
    panel.id = "workspaceMergePanelV09";
    panel.className = "card v09-card workspace-merge-v09";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Workspace Package Merge</h2>
          <p class="helper-text">Merge another Methodz workspace package into this browser without replacing the complete local workspace. A valid pre-merge recovery package is saved automatically.</p>
        </div>
        <span class="workspace-badge-v09">Non-destructive import</span>
      </div>
      <div class="workspace-merge-controls-v09">
        <div>
          <label for="workspaceMergeStrategyV09">Conflict Strategy</label>
          <select id="workspaceMergeStrategyV09">
            <option value="prefer-newest">Prefer the newest record</option>
            <option value="keep-local">Keep local values</option>
            <option value="keep-both">Keep both record versions</option>
          </select>
        </div>
        <div>
          <label class="button-like" for="workspaceMergeFileV09">Choose Workspace Package</label>
          <input id="workspaceMergeFileV09" class="import-control" type="file" accept="application/json,.json" />
        </div>
      </div>
      <div id="workspaceMergePreviewV09" class="workspace-merge-preview-v09 is-hidden" aria-live="polite"></div>
    `;

    if (backupPanel) backupPanel.insertAdjacentElement("afterend", panel);
    else savedCard.insertAdjacentElement("beforebegin", panel);

    document.getElementById("workspaceMergeFileV09")?.addEventListener("change", previewWorkspaceMergeV09);
    document.getElementById("workspaceMergeStrategyV09")?.addEventListener("change", refreshMergePreviewV09);
  }

  async function previewWorkspaceMergeV09(event) {
    const file = event.target.files?.[0];
    const preview = document.getElementById("workspaceMergePreviewV09");
    pendingPackage = null;
    pendingFileName = "";
    if (!file || !preview) return;

    try {
      const parsed = JSON.parse(await file.text());
      validateWorkspacePackageV09(parsed);
      pendingPackage = parsed;
      pendingFileName = file.name;
      refreshMergePreviewV09();
    } catch (error) {
      preview.classList.remove("is-hidden");
      preview.classList.add("has-error");
      preview.innerHTML = `<h3>Merge Package Rejected</h3><p>${escapeV09(error.message || error)}</p>`;
    }
  }

  function refreshMergePreviewV09() {
    const preview = document.getElementById("workspaceMergePreviewV09");
    if (!preview || !pendingPackage) return;
    const strategy = document.getElementById("workspaceMergeStrategyV09")?.value || "prefer-newest";
    const analysis = analyzeWorkspaceMergeV09(pendingPackage, strategy);

    preview.classList.remove("is-hidden", "has-error");
    preview.innerHTML = `
      <h3>Merge Preview</h3>
      <p><strong>${escapeV09(pendingFileName || "Workspace package")}</strong></p>
      <div class="metric-grid">
        <div><strong>${analysis.incomingActive}</strong><span>incoming active records</span></div>
        <div><strong>${analysis.incomingArchived}</strong><span>incoming archived records</span></div>
        <div><strong>${analysis.storageEntries}</strong><span>incoming storage entries</span></div>
        <div><strong>${formatBytesV09(analysis.byteEstimate)}</strong><span>package data</span></div>
      </div>
      <ul class="merge-analysis-v09">
        <li>${analysis.newActive} active record IDs are new to this workspace.</li>
        <li>${analysis.activeConflicts} active record ID conflicts will use <strong>${escapeV09(strategyLabelV09(strategy))}</strong>.</li>
        <li>${analysis.newArchived} archive entries are new; ${analysis.archiveConflicts} archive IDs already exist.</li>
        <li>Revision snapshots, directories, templates, presets, settings, and sync metadata are merged by storage type.</li>
      </ul>
      <p class="helper-text">Current local-only keys remain in place. Migration and merge log metadata from the incoming package are not imported.</p>
      <div class="button-row">
        <button type="button" onclick="applyWorkspaceMergeV09()">Apply Workspace Merge</button>
        <button type="button" onclick="cancelWorkspaceMergeV09()">Cancel</button>
      </div>
    `;
  }

  function validateWorkspacePackageV09(payload) {
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("The selected file is not a JSON object.");
    if (payload.packageType !== "methodz-meeting-manager-workspace") throw new Error("This is not a Methodz Meeting Manager workspace package.");
    if (!payload.entries || typeof payload.entries !== "object" || Array.isArray(payload.entries)) throw new Error("The package does not contain a valid entries object.");

    const recognized = Object.entries(payload.entries).filter(([key, value]) => {
      return typeof key === "string" && typeof value === "string" && (key.startsWith("methodz") || key === "meetingRecords");
    });
    if (!recognized.length) throw new Error("No recognized Methodz workspace entries were found.");

    if (payload.checksum) {
      const body = { ...payload };
      delete body.checksum;
      const actual = hashTextV09(stableStringifyV09(body));
      if (actual !== payload.checksum) throw new Error("Package checksum validation failed. The file may be incomplete or modified.");
    }
    return true;
  }

  function analyzeWorkspaceMergeV09(payload, strategy) {
    const incomingRecords = arrayV09(parseEntryV09(payload.entries[recordsKey], []));
    const localRecords = arrayV09(readLocalJsonV09(recordsKey, []));
    const incomingArchive = arrayV09(parseEntryV09(payload.entries[archiveKey], []));
    const localArchive = arrayV09(readLocalJsonV09(archiveKey, []));
    const localRecordIds = new Set(localRecords.map((record) => record?.id).filter(Boolean));
    const localArchiveIds = new Set(localArchive.map((entry) => entry?.archiveId).filter(Boolean));
    const incomingRecordIds = incomingRecords.map((record) => record?.id).filter(Boolean);
    const incomingArchiveIds = incomingArchive.map((entry) => entry?.archiveId).filter(Boolean);

    return {
      strategy,
      incomingActive: incomingRecords.length,
      incomingArchived: incomingArchive.length,
      newActive: incomingRecordIds.filter((id) => !localRecordIds.has(id)).length,
      activeConflicts: incomingRecordIds.filter((id) => localRecordIds.has(id)).length,
      newArchived: incomingArchiveIds.filter((id) => !localArchiveIds.has(id)).length,
      archiveConflicts: incomingArchiveIds.filter((id) => localArchiveIds.has(id)).length,
      storageEntries: Object.keys(payload.entries || {}).length,
      byteEstimate: new Blob(Object.values(payload.entries || {})).size
    };
  }

  function applyWorkspaceMergeV09() {
    if (!pendingPackage) return alert("Choose and preview a workspace package first.");
    const strategy = document.getElementById("workspaceMergeStrategyV09")?.value || "prefer-newest";
    const confirmed = global.confirm(`Merge this workspace package using “${strategyLabelV09(strategy)}”?\n\nCurrent local-only data will remain. A pre-merge recovery package will be saved first.`);
    if (!confirmed) return;

    try {
      const recovery = typeof global.createWorkspacePackageV08 === "function"
        ? global.createWorkspacePackageV08()
        : createFallbackPackageV09();

      // Keep the recovery package byte-for-byte valid so its checksum can be verified by the v0.8 restore workflow.
      global.localStorage.setItem(preRestoreKey, JSON.stringify(recovery));

      const skippedKeys = new Set([preRestoreKey, mergeLogKey, migrationStateKey]);
      Object.entries(pendingPackage.entries).forEach(([key, incomingRaw]) => {
        if (!(key.startsWith("methodz") || key === "meetingRecords") || skippedKeys.has(key) || typeof incomingRaw !== "string") return;
        const localRaw = global.localStorage.getItem(key);
        const mergedRaw = mergeStorageEntryV09(key, localRaw, incomingRaw, strategy);
        if (mergedRaw !== null) global.localStorage.setItem(key, mergedRaw);
      });

      const report = {
        mergedAt: new Date().toISOString(),
        sourceFile: pendingFileName,
        sourceExportedAt: pendingPackage.exportedAt || "",
        strategy,
        analysis: analyzeWorkspaceMergeV09(pendingPackage, strategy)
      };
      global.localStorage.setItem(mergeLogKey, JSON.stringify(report));
      announceV09("Workspace merge applied. Reloading the application.");
      global.location.reload();
    } catch (error) {
      console.error("Workspace merge failed", error);
      alert(`Workspace merge failed: ${error.message || error}`);
    }
  }

  function mergeStorageEntryV09(key, localRaw, incomingRaw, strategy) {
    if (localRaw == null) return incomingRaw;
    const local = parseEntryV09(localRaw, localRaw);
    const incoming = parseEntryV09(incomingRaw, incomingRaw);

    if (key === recordsKey) return JSON.stringify(mergeRecordsV09(arrayV09(local), arrayV09(incoming), strategy));
    if (key === archiveKey) return JSON.stringify(mergeArchiveV09(arrayV09(local), arrayV09(incoming), strategy));
    if (key === revisionsKey) return JSON.stringify(mergeRevisionMapsV09(objectV09(local), objectV09(incoming)));
    if (Array.isArray(local) && Array.isArray(incoming)) return JSON.stringify(mergeGenericArraysV09(local, incoming, strategy));
    if (isObjectV09(local) && isObjectV09(incoming)) return JSON.stringify(mergeObjectsV09(local, incoming, strategy));
    return strategy === "prefer-newest" ? incomingRaw : localRaw;
  }

  function mergeRecordsV09(local, incoming, strategy) {
    const result = local.map(cloneV09);
    const byId = new Map(result.map((record, index) => [record?.id, index]).filter(([id]) => id));

    incoming.forEach((source) => {
      const record = cloneV09(source);
      if (!record?.id || !byId.has(record.id)) {
        result.push(record);
        if (record?.id) byId.set(record.id, result.length - 1);
        return;
      }

      const index = byId.get(record.id);
      const existing = result[index];
      if (JSON.stringify(existing) === JSON.stringify(record) || strategy === "keep-local") return;

      if (strategy === "prefer-newest") {
        if (recordTimestampV09(record) > recordTimestampV09(existing)) result[index] = record;
        return;
      }

      result.push({
        ...record,
        id: uniqueIdV09("meeting-merged"),
        importedFromRecordId: record.id,
        title: `${record.title || "Imported Meeting"} (Imported Copy)`,
        updatedAt: new Date().toISOString()
      });
    });
    return result;
  }

  function mergeArchiveV09(local, incoming, strategy) {
    const result = local.map(cloneV09);
    const byId = new Map(result.map((entry, index) => [entry?.archiveId, index]).filter(([id]) => id));

    incoming.forEach((source) => {
      const entry = cloneV09(source);
      if (!entry?.archiveId || !byId.has(entry.archiveId)) {
        result.push(entry);
        if (entry?.archiveId) byId.set(entry.archiveId, result.length - 1);
        return;
      }

      const index = byId.get(entry.archiveId);
      if (JSON.stringify(result[index]) === JSON.stringify(entry) || strategy === "keep-local") return;

      if (strategy === "prefer-newest") {
        if (recordTimestampV09(entry.record || entry) > recordTimestampV09(result[index].record || result[index])) result[index] = entry;
      } else {
        result.push({ ...entry, archiveId: uniqueIdV09("archive-merged"), mergedFromArchiveId: entry.archiveId });
      }
    });
    return result;
  }

  function mergeRevisionMapsV09(local, incoming) {
    const result = cloneV09(local);
    Object.entries(incoming).forEach(([recordId, revisions]) => {
      const existing = arrayV09(result[recordId]);
      const seen = new Set(existing.map(revisionIdentityV09));
      arrayV09(revisions).forEach((revision) => {
        const identity = revisionIdentityV09(revision);
        if (!seen.has(identity)) {
          existing.push(cloneV09(revision));
          seen.add(identity);
        }
      });
      existing.sort((a, b) => String(a?.capturedAt || "").localeCompare(String(b?.capturedAt || "")));
      result[recordId] = existing.map((revision, index) => ({ ...revision, revisionNumber: index + 1 }));
    });
    return result;
  }

  function revisionIdentityV09(revision) {
    return revision?.id || `${revision?.contentHash || ""}|${revision?.capturedAt || ""}|${revision?.reason || ""}`;
  }

  function mergeGenericArraysV09(local, incoming, strategy) {
    const result = local.map(cloneV09);
    const identity = (item) => item?.id || item?.email || item?.name || item?.label || JSON.stringify(item);
    const indexByIdentity = new Map(result.map((item, index) => [identity(item), index]));

    incoming.forEach((item) => {
      const id = identity(item);
      if (!indexByIdentity.has(id)) {
        result.push(cloneV09(item));
        indexByIdentity.set(id, result.length - 1);
      } else if (strategy === "prefer-newest") {
        const index = indexByIdentity.get(id);
        result[index] = isObjectV09(result[index]) && isObjectV09(item)
          ? { ...result[index], ...cloneV09(item) }
          : cloneV09(item);
      } else if (strategy === "keep-both" && JSON.stringify(result[indexByIdentity.get(id)]) !== JSON.stringify(item)) {
        result.push(cloneV09(item));
      }
    });
    return result;
  }

  function mergeObjectsV09(local, incoming, strategy) {
    if (strategy === "keep-local") return { ...incoming, ...local };
    if (strategy === "keep-both") return { ...local, ...Object.fromEntries(Object.entries(incoming).filter(([key]) => !(key in local))) };
    return { ...local, ...incoming };
  }

  function cancelWorkspaceMergeV09() {
    pendingPackage = null;
    pendingFileName = "";
    const input = document.getElementById("workspaceMergeFileV09");
    const preview = document.getElementById("workspaceMergePreviewV09");
    if (input) input.value = "";
    if (preview) {
      preview.innerHTML = "";
      preview.classList.add("is-hidden");
      preview.classList.remove("has-error");
    }
  }

  function createFallbackPackageV09() {
    const entries = {};
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (key && key !== preRestoreKey && (key.startsWith("methodz") || key === "meetingRecords")) entries[key] = global.localStorage.getItem(key);
    }
    return {
      packageType: "methodz-meeting-manager-workspace",
      packageVersion: 1,
      schemaVersion: config.schemaVersion || "0.9.0",
      exportedAt: new Date().toISOString(),
      entries
    };
  }

  function readLocalJsonV09(key, fallback) {
    return parseEntryV09(global.localStorage.getItem(key), fallback);
  }

  function parseEntryV09(raw, fallback) {
    if (raw == null) return fallback;
    if (typeof raw !== "string") return raw;
    try {
      return JSON.parse(raw);
    } catch (error) {
      return fallback;
    }
  }

  function arrayV09(value) {
    return Array.isArray(value) ? value : [];
  }

  function objectV09(value) {
    return isObjectV09(value) ? value : {};
  }

  function isObjectV09(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function cloneV09(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function recordTimestampV09(record) {
    const value = record?.updatedAt || record?.savedAt || record?.createdAt || record?.archivedAt || "";
    const time = new Date(value).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  function uniqueIdV09(prefix) {
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function strategyLabelV09(strategy) {
    if (strategy === "keep-local") return "Keep local values";
    if (strategy === "keep-both") return "Keep both record versions";
    return "Prefer the newest record";
  }

  function formatBytesV09(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function hashTextV09(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function stableStringifyV09(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringifyV09).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringifyV09(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function escapeV09(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function announceV09(message) {
    if (typeof global.announceMethodzStatus === "function") global.announceMethodzStatus(message);
  }

  global.MethodzWorkspaceMergeV09 = {
    validateWorkspacePackage: validateWorkspacePackageV09,
    analyzeWorkspaceMerge: analyzeWorkspaceMergeV09,
    mergeRecords: mergeRecordsV09,
    mergeArchive: mergeArchiveV09,
    mergeRevisionMaps: mergeRevisionMapsV09
  };
  global.refreshMergePreviewV09 = refreshMergePreviewV09;
  global.applyWorkspaceMergeV09 = applyWorkspaceMergeV09;
  global.cancelWorkspaceMergeV09 = cancelWorkspaceMergeV09;
})(window);
