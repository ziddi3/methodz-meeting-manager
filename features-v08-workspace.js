/* Methodz Meeting Manager v0.8 workspace backup and restore. */
(function initializeWorkspaceBackup(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const preRestoreKey = config.storageKeys?.preRestoreBackup || "methodzPreRestoreBackup";
  let pendingRestorePackage = null;

  global.addEventListener("DOMContentLoaded", initializeV08Workspace);

  function initializeV08Workspace() {
    installWorkspacePanelV08();
    refreshWorkspaceSummaryV08();
  }

  function installWorkspacePanelV08() {
    const adapterPanel = document.getElementById("dataAdapterPanelV07");
    const savedCard = document.getElementById("savedRecords")?.closest(".card");
    if ((!adapterPanel && !savedCard) || document.getElementById("workspaceBackupPanelV08")) return;

    const panel = document.createElement("section");
    panel.id = "workspaceBackupPanelV08";
    panel.className = "card v08-card workspace-backup-v08";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Workspace Backup & Restore</h2>
          <p class="helper-text">Export all Methodz Meeting Manager browser data as one portable JSON package, including records, directories, templates, revisions, archive data, numbering, and sync metadata.</p>
        </div>
        <div class="workspace-badge-v08" id="workspaceBackupBadgeV08">Local workspace</div>
      </div>
      <div id="workspaceBackupSummaryV08"></div>
      <div class="button-row">
        <button type="button" onclick="exportWorkspaceBackupV08()">Export Workspace Backup</button>
        <label class="button-like" for="workspaceRestoreFileV08">Choose Restore Package</label>
        <button type="button" id="downloadPreRestoreButtonV08" onclick="downloadPreRestoreBackupV08()">Download Pre-Restore Recovery</button>
      </div>
      <input id="workspaceRestoreFileV08" class="import-control" type="file" accept="application/json,.json" />
      <div id="workspaceRestorePreviewV08" class="workspace-restore-preview-v08 is-hidden" aria-live="polite"></div>
    `;

    if (adapterPanel) adapterPanel.insertAdjacentElement("afterend", panel);
    else savedCard.insertAdjacentElement("beforebegin", panel);

    document.getElementById("workspaceRestoreFileV08")?.addEventListener("change", previewWorkspaceRestoreV08);
  }

  function getWorkspaceKeysV08() {
    const configured = Object.values(config.storageKeys || {});
    const discovered = [];

    for (let index = 0; index < global.localStorage.length; index++) {
      const key = global.localStorage.key(index);
      if (key && (key.startsWith("methodz") || key === "meetingRecords")) discovered.push(key);
    }

    return Array.from(new Set([...configured, ...discovered, "meetingRecords"]))
      .filter((key) => key && key !== preRestoreKey)
      .sort();
  }

  function createWorkspacePackageV08() {
    const entries = {};
    const keys = getWorkspaceKeysV08();

    keys.forEach((key) => {
      const value = global.localStorage.getItem(key);
      if (value !== null) entries[key] = value;
    });

    const packageBody = {
      packageType: "methodz-meeting-manager-workspace",
      packageVersion: 1,
      appName: config.brand?.appName || "Methodz Meeting Manager",
      schemaVersion: config.schemaVersion || "0.8.0",
      exportedAt: new Date().toISOString(),
      entries,
      summary: summarizeWorkspaceEntriesV08(entries)
    };

    return {
      ...packageBody,
      checksum: hashTextV08(stableStringifyV08(packageBody))
    };
  }

  function summarizeWorkspaceEntriesV08(entries) {
    const parseCount = (key) => {
      try {
        const parsed = JSON.parse(entries[key] || "null");
        if (Array.isArray(parsed)) return parsed.length;
        if (parsed && typeof parsed === "object") return Object.keys(parsed).length;
      } catch (error) {
        return 0;
      }
      return 0;
    };

    const recordsKey = config.storageKeys?.records || "methodzMeetingRecords";
    const archiveKey = config.storageKeys?.archivedRecords || "methodzArchivedMeetingRecords";
    const revisionsKey = config.storageKeys?.revisions || "methodzMeetingRevisions";

    return {
      entryCount: Object.keys(entries).length,
      activeRecords: parseCount(recordsKey),
      archivedRecords: parseCount(archiveKey),
      revisionGroups: parseCount(revisionsKey),
      byteEstimate: new Blob(Object.values(entries)).size
    };
  }

  function exportWorkspaceBackupV08() {
    if (typeof global.downloadBlob !== "function") return alert("Download support is unavailable.");
    const payload = createWorkspacePackageV08();
    global.downloadBlob(
      JSON.stringify(payload, null, 2),
      `methodz-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json"
    );
    announceV08("Workspace backup exported.");
  }

  async function previewWorkspaceRestoreV08(event) {
    const file = event.target.files?.[0];
    const preview = document.getElementById("workspaceRestorePreviewV08");
    pendingRestorePackage = null;
    if (!file || !preview) return;

    try {
      const parsed = JSON.parse(await file.text());
      validateWorkspacePackageV08(parsed);
      pendingRestorePackage = parsed;
      const summary = parsed.summary || summarizeWorkspaceEntriesV08(parsed.entries || {});
      preview.classList.remove("is-hidden", "has-error");
      preview.innerHTML = `
        <h3>Restore Preview</h3>
        <p><strong>${escapeV08(file.name)}</strong></p>
        <div class="metric-grid">
          <div><strong>${Number(summary.activeRecords || 0)}</strong><span>active records</span></div>
          <div><strong>${Number(summary.archivedRecords || 0)}</strong><span>archived records</span></div>
          <div><strong>${Number(summary.revisionGroups || 0)}</strong><span>revision groups</span></div>
          <div><strong>${Number(summary.entryCount || Object.keys(parsed.entries || {}).length)}</strong><span>storage entries</span></div>
        </div>
        <p class="helper-text">Exported ${escapeV08(formatV08(parsed.exportedAt))}. Applying this package replaces the current Methodz Meeting Manager workspace keys. A local pre-restore recovery package is created first.</p>
        <div class="button-row">
          <button type="button" onclick="applyWorkspaceRestoreV08()">Apply Restore Package</button>
          <button type="button" onclick="cancelWorkspaceRestoreV08()">Cancel</button>
        </div>
      `;
    } catch (error) {
      preview.classList.remove("is-hidden");
      preview.classList.add("has-error");
      preview.innerHTML = `<h3>Restore Package Rejected</h3><p>${escapeV08(error.message)}</p>`;
    }
  }

  function validateWorkspacePackageV08(payload) {
    if (!payload || typeof payload !== "object") throw new Error("The selected file is not a JSON object.");
    if (payload.packageType !== "methodz-meeting-manager-workspace") {
      throw new Error("This is not a Methodz Meeting Manager workspace package.");
    }
    if (!payload.entries || typeof payload.entries !== "object" || Array.isArray(payload.entries)) {
      throw new Error("The workspace package does not contain a valid entries object.");
    }

    const allowedEntries = Object.entries(payload.entries).filter(([key, value]) => {
      return typeof key === "string" && typeof value === "string" && (key.startsWith("methodz") || key === "meetingRecords");
    });

    if (!allowedEntries.length) throw new Error("No recognized Methodz Meeting Manager storage entries were found.");

    if (payload.checksum) {
      const body = { ...payload };
      delete body.checksum;
      const actual = hashTextV08(stableStringifyV08(body));
      if (actual !== payload.checksum) throw new Error("Package checksum validation failed. The file may be incomplete or modified.");
    }

    return true;
  }

  function applyWorkspaceRestoreV08() {
    if (!pendingRestorePackage) return alert("Choose and preview a workspace package first.");
    const confirmed = global.confirm("Replace the current Methodz Meeting Manager workspace with this backup? A local pre-restore recovery package will be saved first.");
    if (!confirmed) return;

    const recovery = createWorkspacePackageV08();
    global.localStorage.setItem(preRestoreKey, JSON.stringify(recovery));

    const currentKeys = getWorkspaceKeysV08();
    currentKeys.forEach((key) => global.localStorage.removeItem(key));

    Object.entries(pendingRestorePackage.entries).forEach(([key, value]) => {
      if ((key.startsWith("methodz") || key === "meetingRecords") && key !== preRestoreKey && typeof value === "string") {
        global.localStorage.setItem(key, value);
      }
    });

    announceV08("Workspace restored. Reloading the application.");
    global.location.reload();
  }

  function cancelWorkspaceRestoreV08() {
    pendingRestorePackage = null;
    const input = document.getElementById("workspaceRestoreFileV08");
    const preview = document.getElementById("workspaceRestorePreviewV08");
    if (input) input.value = "";
    if (preview) {
      preview.innerHTML = "";
      preview.classList.add("is-hidden");
      preview.classList.remove("has-error");
    }
  }

  function downloadPreRestoreBackupV08() {
    const raw = global.localStorage.getItem(preRestoreKey);
    if (!raw) return alert("No pre-restore recovery package is available on this device.");
    if (typeof global.downloadBlob !== "function") return;
    global.downloadBlob(raw, `methodz-pre-restore-recovery-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
  }

  function refreshWorkspaceSummaryV08() {
    const body = document.getElementById("workspaceBackupSummaryV08");
    const recoveryButton = document.getElementById("downloadPreRestoreButtonV08");
    if (!body) return;

    const payload = createWorkspacePackageV08();
    const summary = payload.summary;
    body.innerHTML = `
      <div class="metric-grid">
        <div><strong>${summary.activeRecords}</strong><span>active records</span></div>
        <div><strong>${summary.archivedRecords}</strong><span>archived records</span></div>
        <div><strong>${summary.revisionGroups}</strong><span>revision groups</span></div>
        <div><strong>${formatBytesV08(summary.byteEstimate)}</strong><span>estimated storage</span></div>
      </div>
      <p class="helper-text">${summary.entryCount} Methodz workspace storage entr${summary.entryCount === 1 ? "y" : "ies"} detected on this browser profile.</p>
    `;

    if (recoveryButton) recoveryButton.disabled = !global.localStorage.getItem(preRestoreKey);
  }

  function formatBytesV08(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function hashTextV08(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function stableStringifyV08(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringifyV08).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringifyV08(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function formatV08(value) {
    if (!value) return "unknown time";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  function escapeV08(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function announceV08(message) {
    if (typeof global.announceMethodzStatus === "function") global.announceMethodzStatus(message);
  }

  global.exportWorkspaceBackupV08 = exportWorkspaceBackupV08;
  global.applyWorkspaceRestoreV08 = applyWorkspaceRestoreV08;
  global.cancelWorkspaceRestoreV08 = cancelWorkspaceRestoreV08;
  global.downloadPreRestoreBackupV08 = downloadPreRestoreBackupV08;
  global.refreshWorkspaceSummaryV08 = refreshWorkspaceSummaryV08;
  global.createWorkspacePackageV08 = createWorkspacePackageV08;
})(window);
