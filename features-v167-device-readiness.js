/* Methodz Meeting Manager v1.6.7 mobile and cross-device readiness. */
(function initializeDeviceReadinessV167(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const readinessConfig = config.deviceReadiness || {};
  const storageKeys = config.storageKeys || {};
  let resizeTimer = 0;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeStorageGet(key) {
    if (!key) return null;
    try {
      return global.localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function countArray(key) {
    const value = safeParse(safeStorageGet(key), []);
    return Array.isArray(value) ? value.length : 0;
  }

  function countObjectKeys(key) {
    const value = safeParse(safeStorageGet(key), {});
    return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value).length : 0;
  }

  function localStorageWritable() {
    const key = `methodz-readiness-${Date.now()}`;
    try {
      global.localStorage.setItem(key, "ok");
      const verified = global.localStorage.getItem(key) === "ok";
      global.localStorage.removeItem(key);
      return verified;
    } catch (error) {
      try { global.localStorage.removeItem(key); } catch (cleanupError) { /* storage is blocked */ }
      return false;
    }
  }

  function displayMode() {
    if (global.matchMedia?.("(display-mode: standalone)").matches || global.navigator.standalone === true) return "standalone";
    return global.location.protocol === "file:" ? "direct-file" : "browser-tab";
  }

  function viewportBucket() {
    const width = Math.max(global.innerWidth || 0, document.documentElement.clientWidth || 0);
    if (width < 480) return "phone-narrow";
    if (width < 768) return "phone-wide";
    if (width < 1100) return "tablet";
    return "desktop";
  }

  function formatBytes(value) {
    if (!Number.isFinite(value) || value < 0) return "Unavailable";
    if (value < 1024) return `${Math.round(value)} B`;
    if (value < 1048576) return `${(value / 1024).toFixed(1)} KiB`;
    if (value < 1073741824) return `${(value / 1048576).toFixed(1)} MiB`;
    return `${(value / 1073741824).toFixed(2)} GiB`;
  }

  async function storageEstimate() {
    if (!global.navigator.storage?.estimate) return { supported: false, usage: null, quota: null, percent: null };
    try {
      const result = await global.navigator.storage.estimate();
      const usage = Number(result.usage);
      const quota = Number(result.quota);
      return {
        supported: true,
        usage: Number.isFinite(usage) ? usage : null,
        quota: Number.isFinite(quota) ? quota : null,
        percent: Number.isFinite(usage) && Number.isFinite(quota) && quota > 0
          ? Math.round((usage / quota) * 1000) / 10
          : null
      };
    } catch (error) {
      return { supported: true, usage: null, quota: null, percent: null };
    }
  }

  async function persistenceState() {
    if (!global.navigator.storage?.persisted) return { supported: false, granted: null };
    try {
      return { supported: true, granted: await global.navigator.storage.persisted() };
    } catch (error) {
      return { supported: true, granted: null };
    }
  }

  function workspaceCounts() {
    const queueKey = typeof global.MethodzSyncQueuePortabilityV166?.tenantQueueKey === "function"
      ? global.MethodzSyncQueuePortabilityV166.tenantQueueKey("default")
      : storageKeys.syncRehearsalQueue;
    return {
      activeRecords: countArray(storageKeys.records),
      archivedRecords: countArray(storageKeys.archivedRecords),
      revisionGroups: countObjectKeys(storageKeys.revisions),
      hasDraft: safeStorageGet(storageKeys.draft) !== null,
      customTemplates: countArray(storageKeys.templates),
      attendeeDirectoryEntries: countArray(storageKeys.directory),
      organizationDirectoryEntries: countArray(storageKeys.organizationDirectory),
      queuedSyncRehearsals: countArray(queueKey)
    };
  }

  function check(id, label, status, value, detail) {
    return { id, label, status, value, detail };
  }

  function overallStatus(checks) {
    if (checks.some((item) => item.status === "limited")) return "Limited";
    if (checks.some((item) => item.status === "review")) return "Review";
    return "Ready";
  }

  async function collectDeviceReadinessV167() {
    const writable = localStorageWritable();
    const estimate = await storageEstimate();
    const persistence = await persistenceState();
    const directFile = global.location.protocol === "file:";
    const workerSupported = "serviceWorker" in global.navigator;
    const workerActive = Boolean(global.navigator.serviceWorker?.controller);
    const cryptoAvailable = Boolean(global.crypto?.subtle);
    const online = global.navigator.onLine !== false;
    const viewportFits = document.documentElement.scrollWidth <= global.innerWidth + 2;
    const warningPercent = Number(readinessConfig.storageWarningPercent) || 80;
    const counts = workspaceCounts();

    const checks = [
      check("browser-storage", "Browser storage", writable ? "ready" : "limited", writable ? "Writable" : "Unavailable", writable ? "This browser context can save local meeting data." : "Do not use this context for meeting capture until browser storage is available."),
      check("storage-capacity", "Storage capacity", estimate.percent !== null && estimate.percent >= warningPercent ? "review" : "ready", estimate.percent === null ? "Estimate unavailable" : `${estimate.percent}% used · ${formatBytes(estimate.usage)} of ${formatBytes(estimate.quota)}`, "Browser-provided quota estimates can change and never replace an off-device backup."),
      check("persistent-storage", "Persistent storage", persistence.granted === false ? "review" : "ready", persistence.supported ? (persistence.granted === true ? "Granted" : persistence.granted === false ? "Not granted" : "Unknown") : "Unsupported", "Persistence may reduce eviction risk but does not prove backup or recovery."),
      check("offline-shell", "Offline app shell", directFile || workerActive ? "ready" : workerSupported ? "review" : "ready", directFile ? "Direct-file mode" : workerActive ? "Service worker active" : workerSupported ? "Not controlling this page" : "Service worker unsupported", directFile ? "Core workflows remain available without a service worker." : "Hosted offline caching requires HTTPS or localhost and an active service worker."),
      check("web-crypto", "Package signing and verification", cryptoAvailable ? "ready" : "review", cryptoAvailable ? "Web Crypto available" : "Web Crypto unavailable", "Core meeting capture remains available when optional cryptographic features are limited."),
      check("network", "Current connection", online ? "ready" : "review", online ? "Online" : "Offline", online ? "Optional network-dependent services may be reachable." : "The local meeting workflow remains available; external services are unreachable."),
      check("viewport", "Mobile layout fit", viewportFits ? "ready" : "review", viewportFits ? "No page-level overflow" : "Horizontal overflow detected", viewportFits ? "The current viewport fits the workspace." : "Review the visible section before relying on this device during a meeting.")
    ];

    const report = {
      type: "methodz-device-readiness-report",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      appShellVersion: config.appShellVersion || "unknown",
      recordSchemaVersion: config.schemaVersion || "unknown",
      overall: overallStatus(checks),
      environment: {
        protocol: global.location.protocol.replace(":", "") || "unknown",
        displayMode: displayMode(),
        viewportBucket: viewportBucket(),
        online
      },
      workspaceCounts: counts,
      storageEstimate: {
        supported: estimate.supported,
        usageBytes: estimate.usage,
        quotaBytes: estimate.quota,
        percentUsed: estimate.percent,
        persistentStorageSupported: persistence.supported,
        persistentStorageGranted: persistence.granted
      },
      checks: checks.map(({ id, label, status, value }) => ({ id, label, status, value })),
      boundaries: {
        containsMeetingContent: false,
        containsRecordIds: false,
        containsAttendeeNames: false,
        containsSignatures: false,
        containsCredentials: false,
        containsKeyMaterial: false,
        provesBackupExists: false,
        provesRecoveryWillSucceed: false
      }
    };

    try {
      global.localStorage.setItem(storageKeys.deviceReadinessState, JSON.stringify({ generatedAt: report.generatedAt, overall: report.overall }));
    } catch (error) { /* readiness still works when storage is blocked */ }

    return { report, checks };
  }

  function renderCheck(item) {
    const statusText = item.status === "ready" ? "Ready" : item.status === "limited" ? "Limited" : "Review";
    return `<article class="device-check-v167 is-${escapeHtml(item.status)}"><div class="device-check-heading-v167"><h3>${escapeHtml(item.label)}</h3><span>${statusText}</span></div><p class="device-check-value-v167">${escapeHtml(item.value)}</p><p class="helper-text">${escapeHtml(item.detail)}</p></article>`;
  }

  async function refreshDeviceReadinessV167() {
    const message = document.getElementById("deviceReadinessMessageV167");
    if (message) message.textContent = "Checking this device...";
    const { report, checks } = await collectDeviceReadinessV167();
    const badge = document.getElementById("deviceReadinessBadgeV167");
    const grid = document.getElementById("deviceReadinessGridV167");
    const summary = document.getElementById("deviceReadinessSummaryV167");
    if (badge) {
      badge.textContent = report.overall;
      badge.className = `status-pill device-readiness-badge-v167 is-${report.overall.toLowerCase()}`;
    }
    if (grid) grid.innerHTML = checks.map(renderCheck).join("");
    if (summary) summary.textContent = `${report.workspaceCounts.activeRecords} active · ${report.workspaceCounts.archivedRecords} archived · ${report.workspaceCounts.hasDraft ? "draft present" : "no draft"} · ${report.environment.viewportBucket}`;
    if (message) message.textContent = report.overall === "Ready" ? "This device passed the current capability checks. Export a workspace backup before changing devices." : "Review the highlighted items. A readiness check is not a backup or recovery guarantee.";
    return report;
  }

  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadDeviceReadinessReportV167() {
    const { report } = await collectDeviceReadinessV167();
    download(`methodz-device-readiness-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(report, null, 2), "application/json");
  }

  function transferChecklist() {
    return [
      "Methodz Meeting Manager cross-device transfer checklist",
      "1. Save the current meeting and confirm it appears in Saved Meeting Records.",
      "2. Export a complete Workspace Backup.",
      "3. Store the backup outside this browser and device.",
      "4. Keep private signing keys separate from backups and signed packages.",
      "5. Run Device Readiness on the destination browser.",
      "6. Inspect the backup and run a no-write recovery drill.",
      "7. Confirm the mutation plan before restoring.",
      "8. Verify active, archived, revision, directory, template, governance, receipt, key-registry, and synchronization queue counts.",
      "9. Keep the source workspace unchanged until the destination is verified.",
      "10. Export a fresh backup after verification."
    ].join("\n");
  }

  async function copyDeviceTransferChecklistV167() {
    const message = document.getElementById("deviceReadinessMessageV167");
    try {
      await global.navigator.clipboard.writeText(transferChecklist());
      if (message) message.textContent = "Cross-device transfer checklist copied.";
    } catch (error) {
      download("methodz-cross-device-transfer-checklist.txt", transferChecklist(), "text/plain");
      if (message) message.textContent = "Clipboard access was unavailable, so the checklist was downloaded instead.";
    }
  }

  async function requestPersistentStorageV167() {
    const message = document.getElementById("deviceReadinessMessageV167");
    if (!global.navigator.storage?.persist) {
      if (message) message.textContent = "This browser does not expose a persistent-storage request API.";
      return false;
    }
    try {
      const granted = await global.navigator.storage.persist();
      if (message) message.textContent = granted ? "Persistent storage was granted. Keep exporting protected off-device backups." : "Persistent storage was not granted. The app remains usable, but eviction risk is higher.";
      await refreshDeviceReadinessV167();
      return granted;
    } catch (error) {
      if (message) message.textContent = "The persistent-storage request could not be completed in this browser context.";
      return false;
    }
  }

  function scrollTo(selector) {
    const target = document.querySelector(selector);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    target.focus?.({ preventScroll: true });
  }

  function createPanel() {
    if (document.getElementById("deviceReadinessV167")) return;
    const quickActions = document.querySelector(".quick-actions");
    const main = document.getElementById("mainContent");
    if (!main) return;
    const panel = document.createElement("section");
    panel.id = "deviceReadinessV167";
    panel.className = "card device-readiness-card-v167";
    panel.tabIndex = -1;
    panel.innerHTML = `<div class="section-subheader device-readiness-header-v167"><div><p class="eyebrow">Mobile & Cross-Device</p><h2>Device Readiness</h2></div><div id="deviceReadinessBadgeV167" class="status-pill">Checking</div></div><p class="helper-text">Capability checks use metadata only. They do not include meeting content and do not prove that a protected backup exists.</p><p id="deviceReadinessSummaryV167" class="device-readiness-summary-v167">Reading browser capabilities...</p><div id="deviceReadinessGridV167" class="device-readiness-grid-v167"></div><div class="button-row device-readiness-actions-v167"><button type="button" onclick="refreshDeviceReadinessV167()">Refresh Check</button><button type="button" onclick="requestPersistentStorageV167()">Request Persistent Storage</button><button type="button" onclick="downloadDeviceReadinessReportV167()">Download Readiness Report</button><button type="button" onclick="copyDeviceTransferChecklistV167()">Copy Transfer Checklist</button></div><p id="deviceReadinessMessageV167" class="helper-text" aria-live="polite">Checking this device...</p><details class="device-transfer-details-v167"><summary>Cross-device transfer boundary</summary><p>Browser storage does not automatically move between devices, profiles, or hosting origins. Export a complete backup, inspect it, rehearse recovery, and keep the source unchanged until the destination is verified.</p></details>`;
    if (quickActions) quickActions.insertAdjacentElement("afterend", panel); else main.prepend(panel);
  }

  function createMobileDock() {
    if (document.getElementById("mobileActionDockV167")) return;
    const savedHeading = [...document.querySelectorAll("h2")].find((heading) => heading.textContent.trim() === "Saved Meeting Records");
    const savedSection = savedHeading?.closest("section");
    if (savedSection && !savedSection.id) savedSection.id = "savedRecordsSectionV167";
    const dock = document.createElement("nav");
    dock.id = "mobileActionDockV167";
    dock.className = "mobile-action-dock-v167";
    dock.setAttribute("aria-label", "Mobile meeting actions");
    dock.innerHTML = `<button type="button" data-action="save">Save</button><button type="button" data-action="new">New</button><button type="button" data-action="records">Records</button><button type="button" data-action="device">Device</button>`;
    dock.addEventListener("click", (event) => {
      const action = event.target.closest("button")?.dataset.action;
      if (action === "save") global.saveMeeting?.();
      if (action === "new") global.startNewMeeting?.();
      if (action === "records") scrollTo("#savedRecordsSectionV167");
      if (action === "device") scrollTo("#deviceReadinessV167");
    });
    document.body.appendChild(dock);
  }

  function start() {
    if (readinessConfig.enabled === false) return;
    createPanel();
    createMobileDock();
    refreshDeviceReadinessV167();
    global.addEventListener("online", refreshDeviceReadinessV167);
    global.addEventListener("offline", refreshDeviceReadinessV167);
    global.addEventListener("resize", () => {
      global.clearTimeout(resizeTimer);
      resizeTimer = global.setTimeout(refreshDeviceReadinessV167, 250);
    }, { passive: true });
  }

  global.collectDeviceReadinessV167 = async () => (await collectDeviceReadinessV167()).report;
  global.refreshDeviceReadinessV167 = refreshDeviceReadinessV167;
  global.downloadDeviceReadinessReportV167 = downloadDeviceReadinessReportV167;
  global.copyDeviceTransferChecklistV167 = copyDeviceTransferChecklistV167;
  global.requestPersistentStorageV167 = requestPersistentStorageV167;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
