/* Methodz Meeting Manager v1.6.6 mobile and cross-device readiness workspace. */
(function initializeDeviceReadinessV166(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const readinessConfig = config.deviceReadiness || {};
  const storageKeys = config.storageKeys || {};
  let latestReport = null;
  let resizeTimer = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeParse(value, fallback) {
    try {
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function readArrayCount(key) {
    if (!key) return 0;
    const parsed = safeParse(global.localStorage.getItem(key), []);
    return Array.isArray(parsed) ? parsed.length : 0;
  }

  function hasStoredValue(key) {
    if (!key) return false;
    try {
      return global.localStorage.getItem(key) !== null;
    } catch (error) {
      return false;
    }
  }

  function formatBytes(bytes) {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value < 0) return "Unavailable";
    if (value < 1024) return `${Math.round(value)} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KiB`;
    if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
    return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GiB`;
  }

  function getViewportBucket() {
    const width = Math.max(0, global.innerWidth || document.documentElement.clientWidth || 0);
    if (width < 480) return "phone-narrow";
    if (width < 768) return "phone-wide";
    if (width < 1100) return "tablet";
    return "desktop";
  }

  function getDisplayMode() {
    if (global.matchMedia?.("(display-mode: standalone)").matches || global.navigator.standalone === true) {
      return "standalone";
    }
    return global.location.protocol === "file:" ? "direct-file" : "browser-tab";
  }

  function probeLocalStorage() {
    const key = `methodz-device-readiness-probe-${Date.now()}`;
    try {
      global.localStorage.setItem(key, "ok");
      const verified = global.localStorage.getItem(key) === "ok";
      global.localStorage.removeItem(key);
      return verified;
    } catch (error) {
      try {
        global.localStorage.removeItem(key);
      } catch (cleanupError) {
        // Nothing else should be attempted when storage is unavailable.
      }
      return false;
    }
  }

  async function readStorageEstimate() {
    if (!global.navigator.storage?.estimate) {
      return { supported: false, usage: null, quota: null, percent: null };
    }

    try {
      const estimate = await global.navigator.storage.estimate();
      const usage = Number(estimate.usage);
      const quota = Number(estimate.quota);
      const percent = Number.isFinite(usage) && Number.isFinite(quota) && quota > 0
        ? Math.round((usage / quota) * 1000) / 10
        : null;
      return {
        supported: true,
        usage: Number.isFinite(usage) ? usage : null,
        quota: Number.isFinite(quota) ? quota : null,
        percent
      };
    } catch (error) {
      return { supported: true, usage: null, quota: null, percent: null };
    }
  }

  async function readPersistenceState() {
    if (!global.navigator.storage?.persisted) {
      return { supported: false, persisted: null };
    }

    try {
      return { supported: true, persisted: await global.navigator.storage.persisted() };
    } catch (error) {
      return { supported: true, persisted: null };
    }
  }

  function collectWorkspaceCounts() {
    return {
      activeRecords: readArrayCount(storageKeys.records),
      archivedRecords: readArrayCount(storageKeys.archivedRecords),
      revisionGroups: Object.keys(safeParse(global.localStorage.getItem(storageKeys.revisions), {})).length,
      hasDraft: hasStoredValue(storageKeys.draft),
      customTemplates: readArrayCount(storageKeys.templates),
      attendeeDirectoryEntries: readArrayCount(storageKeys.directory),
      organizationDirectoryEntries: readArrayCount(storageKeys.organizationDirectory),
      queuedSyncRehearsals: readArrayCount(storageKeys.syncRehearsalQueue)
    };
  }

  function createCheck(id, label, status, value, detail) {
    return { id, label, status, value, detail };
  }

  function deriveOverall(checks) {
    if (checks.some((check) => check.status === "limited")) return "Limited";
    if (checks.some((check) => check.status === "review")) return "Review";
    return "Ready";
  }

  async function collectDeviceReadinessV166() {
    const storageAvailable = probeLocalStorage();
    const estimate = await readStorageEstimate();
    const persistence = await readPersistenceState();
    const protocol = global.location.protocol.replace(":", "") || "unknown";
    const directFile = protocol === "file";
    const serviceWorkerSupported = "serviceWorker" in global.navigator;
    const serviceWorkerActive = Boolean(global.navigator.serviceWorker?.controller);
    const cryptoSupported = Boolean(global.crypto?.subtle);
    const online = global.navigator.onLine !== false;
    const viewportFits = document.documentElement.scrollWidth <= global.innerWidth + 2;
    const storageWarningPercent = Number(readinessConfig.storageWarningPercent) || 80;
    const workspaceCounts = collectWorkspaceCounts();

    const checks = [
      createCheck(
        "browser-storage",
        "Browser storage",
        storageAvailable ? "ready" : "limited",
        storageAvailable ? "Writable" : "Unavailable",
        storageAvailable
          ? "Local meeting records can be written in this browser context."
          : "The offline workspace cannot safely save records in this browser context."
      ),
      createCheck(
        "storage-capacity",
        "Storage capacity",
        estimate.percent !== null && estimate.percent >= storageWarningPercent ? "review" : "ready",
        estimate.percent === null
          ? "Estimate unavailable"
          : `${estimate.percent}% used · ${formatBytes(estimate.usage)} of ${formatBytes(estimate.quota)}`,
        estimate.percent !== null && estimate.percent >= storageWarningPercent
          ? "Storage use is high. Export a workspace backup and clear unrelated browser data carefully."
          : "Capacity estimates are browser-provided and may change without notice."
      ),
      createCheck(
        "persistent-storage",
        "Persistent storage",
        persistence.persisted === false ? "review" : "ready",
        persistence.supported
          ? (persistence.persisted === true ? "Granted" : persistence.persisted === false ? "Not granted" : "Unknown")
          : "Not supported",
        persistence.persisted === true
          ? "The browser reports that this origin has persistent storage."
          : "Persistence reduces eviction risk but never replaces an off-device backup."
      ),
      createCheck(
        "service-worker",
        "Offline app shell",
        directFile || serviceWorkerActive ? "ready" : serviceWorkerSupported ? "review" : "ready",
        directFile
          ? "Direct-file mode"
          : serviceWorkerActive
            ? "Service worker active"
            : serviceWorkerSupported
              ? "Service worker not controlling this page"
              : "Service worker unsupported",
        directFile
          ? "Core meeting workflows remain available without a service worker."
          : "Hosted offline caching requires HTTPS or localhost and an active service worker."
      ),
      createCheck(
        "web-crypto",
        "Package signing and verification",
        cryptoSupported ? "ready" : "review",
        cryptoSupported ? "Web Crypto available" : "Web Crypto unavailable",
        cryptoSupported
          ? "Optional signing and verification features are available in this browser context."
          : "Core meeting capture still works, but cryptographic package features are limited."
      ),
      createCheck(
        "network-state",
        "Current connection",
        online ? "ready" : "review",
        online ? "Online" : "Offline",
        online
          ? "Network-dependent optional features may be reachable."
          : "The offline-first workspace remains usable; external services are unavailable."
      ),
      createCheck(
        "viewport-fit",
        "Mobile layout fit",
        viewportFits ? "ready" : "review",
        viewportFits ? "No page-level horizontal overflow" : "Horizontal overflow detected",
        viewportFits
          ? "The current viewport fits the main workspace."
          : "Review the visible section before relying on this device during a meeting."
      )
    ];

    const report = {
      type: "methodz-device-readiness-report",
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      appShellVersion: config.appShellVersion || "unknown",
      recordSchemaVersion: config.schemaVersion || "unknown",
      overall: deriveOverall(checks),
      environment: {
        protocol,
        displayMode: getDisplayMode(),
        viewportBucket: getViewportBucket(),
        online
      },
      workspaceCounts,
      storageEstimate: {
        supported: estimate.supported,
        usageBytes: estimate.usage,
        quotaBytes: estimate.quota,
        percentUsed: estimate.percent,
        persistentStorageSupported: persistence.supported,
        persistentStorageGranted: persistence.persisted
      },
      checks: checks.map(({ id, label, status, value }) => ({ id, label, status, value })),
      boundaries: {
        containsMeetingContent: false,
        containsRecordIds: false,
        containsAttendeeNames: false,
        containsSignatures: false,
        containsCredentials: false,
        containsPrivateKeyMaterial: false,
        provesBackupExists: false,
        provesRecoveryWillSucceed: false
      }
    };

    latestReport = { ...report, checks };
    try {
      global.localStorage.setItem(storageKeys.deviceReadinessState, JSON.stringify({
        generatedAt: report.generatedAt,
        overall: report.overall,
        appShellVersion: report.appShellVersion
      }));
    } catch (error) {
      // Readiness must remain usable even when storage is blocked.
    }

    return latestReport;
  }

  function renderCheck(check) {
    const statusLabel = check.status === "ready" ? "Ready" : check.status === "limited" ? "Limited" : "Review";
    return `
      <article class="device-check-v166 is-${escapeHtml(check.status)}">
        <div class="device-check-heading-v166">
          <h3>${escapeHtml(check.label)}</h3>
          <span class="device-check-status-v166">${statusLabel}</span>
        </div>
        <p class="device-check-value-v166">${escapeHtml(check.value)}</p>
        <p class="helper-text">${escapeHtml(check.detail)}</p>
      </article>
    `;
  }

  function renderReadiness(report) {
    const panel = document.getElementById("deviceReadinessV166");
    if (!panel || !report) return;

    const badge = panel.querySelector("#deviceReadinessBadgeV166");
    const grid = panel.querySelector("#deviceReadinessGridV166");
    const summary = panel.querySelector("#deviceReadinessSummaryV166");
    const counts = report.workspaceCounts;

    badge.textContent = report.overall;
    badge.className = `status-pill device-readiness-badge-v166 is-${report.overall.toLowerCase()}`;
    grid.innerHTML = report.checks.map(renderCheck).join("");
    summary.textContent = `${counts.activeRecords} active · ${counts.archivedRecords} archived · ${counts.hasDraft ? "draft present" : "no draft"} · ${report.environment.viewportBucket}`;
  }

  async function refreshDeviceReadinessV166() {
    const message = document.getElementById("deviceReadinessMessageV166");
    if (message) message.textContent = "Checking this device...";

    const report = await collectDeviceReadinessV166();
    renderReadiness(report);

    if (message) {
      message.textContent = report.overall === "Ready"
        ? "This device passed the current capability checks. Export a workspace backup before changing devices."
        : "Review the highlighted items. A readiness check is not a backup or recovery guarantee.";
    }
    return report;
  }

  function createDownload(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function downloadDeviceReadinessReportV166() {
    const report = await collectDeviceReadinessV166();
    const exportReport = {
      ...report,
      checks: report.checks.map(({ id, label, status, value }) => ({ id, label, status, value }))
    };
    createDownload(
      `methodz-device-readiness-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(exportReport, null, 2),
      "application/json"
    );
  }

  function getTransferChecklistText() {
    return [
      "Methodz Meeting Manager cross-device transfer checklist",
      "1. Save the current meeting record and confirm it appears under Saved Meeting Records.",
      "2. Export a complete Workspace Backup from the recovery workspace.",
      "3. Store the backup in a protected location outside this browser and device.",
      "4. Keep private signing keys separate from workspace backups and signed packages.",
      "5. Open the destination browser and run Device Readiness before importing anything.",
      "6. Inspect the backup and run a no-write recovery drill before applying a restore.",
      "7. Confirm active, archived, revision, directory, template, governance, and receipt counts.",
      "8. Verify important meeting records and public-key IDs independently.",
      "9. Keep the source device unchanged until the destination workspace is confirmed.",
      "10. Export a new backup after the transfer is verified."
    ].join("\n");
  }

  async function copyDeviceTransferChecklistV166() {
    const message = document.getElementById("deviceReadinessMessageV166");
    try {
      await global.navigator.clipboard.writeText(getTransferChecklistText());
      if (message) message.textContent = "Cross-device transfer checklist copied.";
    } catch (error) {
      createDownload("methodz-cross-device-transfer-checklist.txt", getTransferChecklistText(), "text/plain");
      if (message) message.textContent = "Clipboard access was unavailable, so the checklist was downloaded instead.";
    }
  }

  async function requestPersistentStorageV166() {
    const message = document.getElementById("deviceReadinessMessageV166");
    if (!global.navigator.storage?.persist) {
      if (message) message.textContent = "This browser does not expose a persistent-storage request API.";
      return false;
    }

    try {
      const granted = await global.navigator.storage.persist();
      if (message) {
        message.textContent = granted
          ? "Persistent storage was granted. Keep exporting protected off-device backups."
          : "Persistent storage was not granted. The app remains usable, but browser eviction risk is higher.";
      }
      await refreshDeviceReadinessV166();
      return granted;
    } catch (error) {
      if (message) message.textContent = "The persistent-storage request could not be completed in this browser context.";
      return false;
    }
  }

  function scrollToSection(selector) {
    const target = document.querySelector(selector);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof target.focus === "function") target.focus({ preventScroll: true });
  }

  function createMobileActionDock() {
    if (document.getElementById("mobileActionDockV166")) return;

    const savedRecordsHeading = Array.from(document.querySelectorAll("h2")).find((heading) => heading.textContent.trim() === "Saved Meeting Records");
    const savedRecordsSection = savedRecordsHeading?.closest("section");
    if (savedRecordsSection && !savedRecordsSection.id) savedRecordsSection.id = "savedRecordsSectionV166";

    const dock = document.createElement("nav");
    dock.id = "mobileActionDockV166";
    dock.className = "mobile-action-dock-v166";
    dock.setAttribute("aria-label", "Mobile meeting actions");
    dock.innerHTML = `
      <button type="button" data-action="save">Save</button>
      <button type="button" data-action="new">New</button>
      <button type="button" data-action="records">Records</button>
      <button type="button" data-action="readiness">Device</button>
    `;

    dock.addEventListener("click", (event) => {
      const action = event.target.closest("button")?.dataset.action;
      if (action === "save" && typeof global.saveMeeting === "function") global.saveMeeting();
      if (action === "new" && typeof global.startNewMeeting === "function") global.startNewMeeting();
      if (action === "records") scrollToSection("#savedRecordsSectionV166");
      if (action === "readiness") scrollToSection("#deviceReadinessV166");
    });

    document.body.appendChild(dock);
  }

  function createReadinessPanel() {
    if (document.getElementById("deviceReadinessV166")) return;
    const quickActions = document.querySelector(".quick-actions");
    const main = document.getElementById("mainContent") || document.querySelector("main");
    if (!main) return;

    const section = document.createElement("section");
    section.className = "card device-readiness-card-v166";
    section.id = "deviceReadinessV166";
    section.tabIndex = -1;
    section.innerHTML = `
      <div class="section-subheader device-readiness-header-v166">
        <div>
          <p class="eyebrow">Mobile & Cross-Device</p>
          <h2>Device Readiness</h2>
        </div>
        <div id="deviceReadinessBadgeV166" class="status-pill device-readiness-badge-v166">Checking</div>
      </div>
      <p class="helper-text">Capability checks use metadata only. They do not include meeting content and do not prove that a protected backup exists.</p>
      <p id="deviceReadinessSummaryV166" class="device-readiness-summary-v166">Reading browser capabilities...</p>
      <div id="deviceReadinessGridV166" class="device-readiness-grid-v166"></div>
      <div class="button-row device-readiness-actions-v166">
        <button type="button" onclick="refreshDeviceReadinessV166()">Refresh Check</button>
        <button type="button" onclick="requestPersistentStorageV166()">Request Persistent Storage</button>
        <button type="button" onclick="downloadDeviceReadinessReportV166()">Download Readiness Report</button>
        <button type="button" onclick="copyDeviceTransferChecklistV166()">Copy Transfer Checklist</button>
      </div>
      <p id="deviceReadinessMessageV166" class="helper-text" aria-live="polite">Checking this device...</p>
      <details class="device-transfer-details-v166">
        <summary>Cross-device transfer boundary</summary>
        <p>Browser storage does not automatically move between devices, browser profiles, or hosting origins. Export a complete workspace backup, inspect it, rehearse recovery, and keep the source workspace unchanged until the destination is verified.</p>
      </details>
    `;

    if (quickActions) quickActions.insertAdjacentElement("afterend", section);
    else main.prepend(section);
  }

  function scheduleResizeRefresh() {
    global.clearTimeout(resizeTimer);
    resizeTimer = global.setTimeout(() => refreshDeviceReadinessV166(), 250);
  }

  function start() {
    if (readinessConfig.enabled === false) return;
    createReadinessPanel();
    createMobileActionDock();
    refreshDeviceReadinessV166();
    global.addEventListener("online", refreshDeviceReadinessV166);
    global.addEventListener("offline", refreshDeviceReadinessV166);
    global.addEventListener("resize", scheduleResizeRefresh, { passive: true });
  }

  global.collectDeviceReadinessV166 = collectDeviceReadinessV166;
  global.refreshDeviceReadinessV166 = refreshDeviceReadinessV166;
  global.downloadDeviceReadinessReportV166 = downloadDeviceReadinessReportV166;
  global.copyDeviceTransferChecklistV166 = copyDeviceTransferChecklistV166;
  global.requestPersistentStorageV166 = requestPersistentStorageV166;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
