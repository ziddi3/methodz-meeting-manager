/* Methodz Meeting Manager v1.6.11 panel registry binding and startup diagnostics. */
(function initializePanelRegistryV1610(global) {
  "use strict";

  const startedAtMs = global.performance?.now?.() || 0;
  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.panelRegistry || {};
  const storageKey = config.storageKeys?.panelRegistryDiagnostics || "methodzPanelRegistryDiagnosticsV1610";
  let latestReport = null;

  function registry() {
    if (!global.MethodzPanelRegistryV1610) throw new Error("The v1.6.10 panel registry core is unavailable.");
    return global.MethodzPanelRegistryV1610;
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

  function persistReport(report) {
    const current = parseJson(global.localStorage.getItem(storageKey), []);
    const list = Array.isArray(current) ? current : [];
    const maximum = Math.max(1, Number(settings.maximumDiagnosticsReports) || 25);
    global.localStorage.setItem(storageKey, JSON.stringify(list.concat(report).slice(-maximum)));
  }

  function installDiagnosticsPanel() {
    if (document.getElementById("panelRegistryDiagnosticsV1610")) return;
    const main = document.getElementById("mainContent");
    if (!main) return;
    const panel = document.createElement("section");
    panel.id = "panelRegistryDiagnosticsV1610";
    panel.className = "card panel-registry-diagnostics-v1610";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <p class="eyebrow">Application Shell</p>
          <h2>Panel Registry Diagnostics</h2>
          <p class="helper-text">Validates stable panel IDs, groups, anchors, Meeting-Day metadata, and document order without reading meeting values.</p>
        </div>
        <span id="panelRegistryBadgeV1610" class="status-pill">Checking</span>
      </div>
      <div id="panelRegistryStatusV1610" class="panel-registry-status-v1610" aria-live="polite"></div>
      <div class="button-row">
        <button type="button" onclick="refreshPanelRegistryV1610()">Run Shell Validation</button>
        <button type="button" onclick="downloadPanelRegistryDiagnosticsV1610()">Download Metadata Report</button>
      </div>
      <div id="panelRegistryDetailsV1610"></div>
      <p class="crypto-warning-v16"><strong>Boundary:</strong> this report contains static panel metadata and aggregate timing only. It excludes meeting content, record identifiers, attendee names, signatures, credentials, private keys, and storage values.</p>`;
    const anchor = document.getElementById("transferAcceptancePanelV169") || document.getElementById("deviceReadinessV167");
    if (anchor) anchor.insertAdjacentElement("afterend", panel);
    else main.appendChild(panel);
  }

  function render(report) {
    const panel = document.getElementById("panelRegistryDiagnosticsV1610");
    const badge = document.getElementById("panelRegistryBadgeV1610");
    const status = document.getElementById("panelRegistryStatusV1610");
    const details = document.getElementById("panelRegistryDetailsV1610");
    if (!panel || !badge || !status || !details) return;

    panel.hidden = report.valid;
    panel.classList.toggle("has-errors", !report.valid);
    panel.classList.toggle("has-warnings", report.valid && report.counts.warnings > 0);
    badge.textContent = report.valid ? "Registry ready" : "Registry blocked";
    status.textContent = report.valid
      ? `${report.counts.resolved} of ${report.counts.registered} registered panels resolved. Meeting-Day registry controls are available.`
      : `${report.counts.errors} blocking registry error(s) were found. Meeting-Day panel collapsing is disabled until the shell is repaired.`;

    const issues = [...report.errors, ...report.warnings];
    details.innerHTML = `
      <div class="metric-grid panel-registry-metrics-v1610">
        <div><strong>${report.counts.registered}</strong><span>registered</span></div>
        <div><strong>${report.counts.resolved}</strong><span>resolved</span></div>
        <div><strong>${report.counts.capturePanels}</strong><span>capture panels</span></div>
        <div><strong>${report.counts.meetingDayPanels}</strong><span>Meeting-Day panels</span></div>
        <div><strong>${report.timing.registrationDurationMs.toFixed(1)} ms</strong><span>registration</span></div>
        <div><strong>${report.timing.aggregateScriptLoadDurationMs.toFixed(1)} ms</strong><span>aggregate script load</span></div>
      </div>
      ${issues.length ? `<ul class="panel-registry-issues-v1610">${issues.map((issue) => `<li><strong>${escapeHtml(issue.code)}</strong>: ${escapeHtml(issue.message)}</li>`).join("")}</ul>` : `<p class="helper-text">No registry errors or warnings were found.</p>`}`;
  }

  function refreshPanelRegistryV1610(options = {}) {
    try {
      const api = registry();
      api.bindDocument(document);
      latestReport = api.validateDocument(document, {
        startedAtMs,
        requiredCapturePanelIds: settings.requiredCapturePanelIds
      });
      document.body.classList.toggle("methodz-panel-registry-invalid-v1610", !latestReport.valid);
      persistReport(latestReport);
      render(latestReport);
      global.dispatchEvent(new CustomEvent("methodz:panel-registry-ready", { detail: { valid: latestReport.valid } }));
      if (options.announce !== false) {
        global.announceMethodzStatus?.(latestReport.valid ? "Application shell panel registry ready." : "Application shell panel registry blocked by visible errors.");
      }
      return latestReport;
    } catch (error) {
      const panel = document.getElementById("panelRegistryDiagnosticsV1610");
      if (panel) panel.hidden = false;
      const status = document.getElementById("panelRegistryStatusV1610");
      if (status) status.textContent = error.message || String(error);
      document.body.classList.add("methodz-panel-registry-invalid-v1610");
      return null;
    }
  }

  function downloadPanelRegistryDiagnosticsV1610() {
    if (!latestReport) latestReport = refreshPanelRegistryV1610({ announce: false });
    if (!latestReport) return;
    const content = JSON.stringify(latestReport, null, 2);
    if (typeof global.downloadBlob === "function") {
      global.downloadBlob(content, `methodz-panel-registry-${new Date().toISOString().slice(0, 10)}.json`, "application/json");
      return;
    }
    const url = URL.createObjectURL(new Blob([content], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `methodz-panel-registry-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    global.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function start() {
    if (settings.enabled === false) return;
    installDiagnosticsPanel();
    refreshPanelRegistryV1610({ announce: false });
    // A zero-delay second pass binds panels created by later DOMContentLoaded listeners without hiding controls during startup.
    global.setTimeout(() => refreshPanelRegistryV1610({ announce: false }), 0);
  }

  global.refreshPanelRegistryV1610 = refreshPanelRegistryV1610;
  global.downloadPanelRegistryDiagnosticsV1610 = downloadPanelRegistryDiagnosticsV1610;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
