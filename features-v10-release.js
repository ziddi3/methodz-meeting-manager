/* Methodz Meeting Manager v1.0 consolidated workspace and release gate. */
(function initializeMethodzReleaseV10(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const archiveKey = config.storageKeys?.archivedRecords || "methodzArchivedMeetingRecords";
  const releaseStateKey = config.storageKeys?.releaseState || "methodzMeetingReleaseState";

  global.addEventListener("DOMContentLoaded", initialize);
  global.addEventListener("methodz:role-context-changed", refreshWorkspace);
  global.addEventListener("methodz:migrations-complete", refreshReleaseGate);

  function initialize() {
    installPanels();
    patchDataFlow();
    bindFilters();
    refreshWorkspace();
    refreshProviders();
    refreshReleaseGate();
  }

  function installPanels() {
    const savedCard = document.getElementById("savedRecords")?.closest(".card");
    if (!savedCard || document.getElementById("recordsWorkspaceV10")) return;

    const workspace = document.createElement("section");
    workspace.id = "recordsWorkspaceV10";
    workspace.className = "card v10-card records-workspace-v10";
    workspace.innerHTML = `
      <div class="section-subheader"><div><h2>Consolidated Records Workspace</h2><p class="helper-text">Search active and archived records from one workspace.</p></div><div class="button-row"><button type="button" onclick="refreshRecordsWorkspaceV10()">Refresh</button><button type="button" onclick="exportRecordsWorkspaceV10()">Export Filtered Index</button></div></div>
      <div id="recordsWorkspaceMetricsV10" class="metric-grid"></div>
      <div class="workspace-filter-grid-v10">
        <div><label for="recordsWorkspaceSearchV10">Search All Records</label><input id="recordsWorkspaceSearchV10" type="search" placeholder="Title, organization, task, attendee..." /></div>
        <div><label for="recordsWorkspaceSourceV10">Record Source</label><select id="recordsWorkspaceSourceV10"><option value="all">Active and Archived</option><option value="active">Active Only</option><option value="archived">Archived Only</option></select></div>
        <div><label for="recordsWorkspaceClassificationV10">Classification</label><select id="recordsWorkspaceClassificationV10"><option value="all">All Classifications</option>${(config.recordClassifications || ["Internal", "Confidential", "Partner Shared", "Public Summary"]).map((value) => `<option>${escapeHtml(value)}</option>`).join("")}</select></div>
        <div><label for="recordsWorkspaceValidationV10">Release Readiness</label><select id="recordsWorkspaceValidationV10"><option value="all">All Records</option><option value="ready">Release Ready</option><option value="issues">Has Issues</option></select></div>
      </div>
      <div id="recordsWorkspaceBodyV10" aria-live="polite"></div>`;
    savedCard.insertAdjacentElement("beforebegin", workspace);

    const providers = document.createElement("section");
    providers.id = "providerReadinessV10";
    providers.className = "card v10-card provider-readiness-v10";
    providers.innerHTML = `<div class="section-subheader"><div><h2>Provider Boundaries</h2><p class="helper-text">Local storage remains active while replaceable asynchronous meeting and attachment contracts are available.</p></div><button type="button" onclick="refreshProviderReadinessV10()">Run Health Checks</button></div><div id="providerReadinessBodyV10"></div><button type="button" onclick="exportProviderContractV10()">Export Provider Contract</button>`;
    workspace.insertAdjacentElement("afterend", providers);

    const gate = document.createElement("section");
    gate.id = "releaseGateV10";
    gate.className = "card v10-card release-gate-v10";
    gate.innerHTML = `<div class="section-subheader"><div><h2>v1.0 Release Gate</h2><p class="helper-text">Validate schema, governance, consent, tasks, and attachment references.</p></div><div class="button-row"><button type="button" onclick="refreshReleaseGateV10()">Run Audit</button><button type="button" onclick="exportReleaseAuditV10()">Export Audit JSON</button></div></div><div id="releaseGateBodyV10" aria-live="polite"></div>`;
    providers.insertAdjacentElement("afterend", gate);
  }

  function bindFilters() {
    ["recordsWorkspaceSearchV10", "recordsWorkspaceSourceV10", "recordsWorkspaceClassificationV10", "recordsWorkspaceValidationV10"].forEach((id) => {
      const control = document.getElementById(id);
      control?.addEventListener(control.tagName === "INPUT" ? "input" : "change", refreshWorkspace);
    });
  }

  function readArchived() {
    try {
      const value = JSON.parse(global.localStorage.getItem(archiveKey));
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function rows() {
    const active = (typeof global.getRecords === "function" ? global.getRecords() : []).map((record) => ({ source: "active", record }));
    const archived = readArchived().filter((entry) => entry?.record).map((entry) => ({ source: "archived", archiveId: entry.archiveId, archivedAt: entry.archivedAt, record: entry.record }));
    return [...active, ...archived];
  }

  function validateRecord(record) {
    const base = global.MethodzMigrations?.validateRecord?.(record) || { valid: true, errors: [], warnings: [] };
    const errors = [...(base.errors || [])];
    const warnings = [...(base.warnings || [])];
    if (!record?.accessControl?.policyId) errors.push("Record policy is missing.");
    (record?.attendees || []).forEach((person, index) => {
      if (person.signature && !person.signatureConsent?.accepted) errors.push(`Attendee ${index + 1} signature consent is missing.`);
      if (person.signature && (!person.signatureVerification?.status || person.signatureVerification.status === "Unverified")) warnings.push(`Attendee ${index + 1} signature is unverified.`);
    });
    (record?.tasks || []).forEach((task, index) => {
      if (task.task && !task.assignedTo) warnings.push(`Task ${index + 1} is not assigned.`);
    });
    (record?.attachments || []).forEach((attachment, index) => {
      const result = global.MethodzAttachmentData?.validateReference?.(attachment);
      (result?.errors || []).forEach((message) => errors.push(`Attachment ${index + 1}: ${message}`));
      (result?.warnings || []).forEach((message) => warnings.push(`Attachment ${index + 1}: ${message}`));
    });
    return { valid: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)], checkedAt: new Date().toISOString(), schemaVersion: config.schemaVersion || "1.0.0" };
  }

  function filteredRows() {
    const query = String(document.getElementById("recordsWorkspaceSearchV10")?.value || "").trim().toLowerCase();
    const source = document.getElementById("recordsWorkspaceSourceV10")?.value || "all";
    const classification = document.getElementById("recordsWorkspaceClassificationV10")?.value || "all";
    const readiness = document.getElementById("recordsWorkspaceValidationV10")?.value || "all";
    return rows().filter((row) => {
      const audit = validateRecord(row.record);
      return (source === "all" || row.source === source)
        && (classification === "all" || (row.record.accessControl?.classification || "Internal") === classification)
        && (readiness === "all" || (readiness === "ready" ? audit.valid : !audit.valid))
        && (!query || JSON.stringify(row.record).toLowerCase().includes(query));
    });
  }

  function refreshWorkspace() {
    const body = document.getElementById("recordsWorkspaceBodyV10");
    const metrics = document.getElementById("recordsWorkspaceMetricsV10");
    if (!body || !metrics) return;
    const all = rows();
    const filtered = filteredRows();
    metrics.innerHTML = `<div><strong>${all.filter((row) => row.source === "active").length}</strong><span>active</span></div><div><strong>${all.filter((row) => row.source === "archived").length}</strong><span>archived</span></div><div><strong>${filtered.length}</strong><span>filtered</span></div><div><strong>${all.filter((row) => !validateRecord(row.record).valid).length}</strong><span>with issues</span></div>`;
    if (!filtered.length) {
      body.innerHTML = '<p class="helper-text">No records match the filters.</p>';
      return;
    }
    body.innerHTML = filtered.map((row) => {
      const record = row.record;
      const audit = validateRecord(record);
      return `<article class="workspace-record-v10"><div><strong>#${escapeHtml(record.meetingNumber || "?")} ${escapeHtml(record.title || "Untitled Meeting")}</strong><p>${escapeHtml(row.source)} • ${escapeHtml(record.date || "No date")} • ${escapeHtml(record.accessControl?.classification || "Internal")}</p></div><span class="${audit.valid ? "is-ready-v10" : "has-issue-v10"}">${audit.valid ? "Ready" : `${audit.errors.length} issue(s)`}</span><button type="button" onclick="openWorkspaceRecordV10('${escapeHtml(record.id)}','${row.source}','${escapeHtml(row.archiveId || "")}')">Open</button></article>`;
    }).join("");
  }

  function openWorkspaceRecord(recordId, source, archiveId) {
    const row = rows().find((item) => item.record.id === recordId && item.source === source && (!archiveId || item.archiveId === archiveId));
    if (!row) return alert("Record not found.");
    if (source === "active" && typeof global.loadRecordForEditing === "function") return global.loadRecordForEditing(recordId);
    sessionStorage.setItem("methodzArchivePreviewRecord", JSON.stringify({ ...row.record, archivePreview: true }));
    global.open("archive.html?preview=current", "_blank", "noopener");
  }

  function buildAudit() {
    const records = rows().map((row) => ({ source: row.source, archiveId: row.archiveId || null, id: row.record.id, meetingNumber: row.record.meetingNumber, title: row.record.title, audit: validateRecord(row.record) }));
    return { packageType: "methodz-meeting-manager-release-audit", release: "1.0.0", generatedAt: new Date().toISOString(), summary: { totalRecords: records.length, readyRecords: records.filter((item) => item.audit.valid).length, recordsWithErrors: records.filter((item) => item.audit.errors.length).length, recordsWithWarnings: records.filter((item) => item.audit.warnings.length).length }, records };
  }

  function refreshReleaseGate() {
    const body = document.getElementById("releaseGateBodyV10");
    if (!body) return;
    const audit = buildAudit();
    global.localStorage.setItem(releaseStateKey, JSON.stringify(audit));
    body.innerHTML = `<div class="metric-grid"><div><strong>${audit.summary.totalRecords}</strong><span>checked</span></div><div><strong>${audit.summary.readyRecords}</strong><span>ready</span></div><div><strong>${audit.summary.recordsWithErrors}</strong><span>with errors</span></div><div><strong>${audit.summary.recordsWithWarnings}</strong><span>with warnings</span></div></div>`;
  }

  async function refreshProviders() {
    const body = document.getElementById("providerReadinessBodyV10");
    if (!body) return;
    const results = [];
    try { results.push(["Synchronous Records", await Promise.resolve(global.MethodzMeetingData?.healthCheck?.())]); } catch (error) { results.push(["Synchronous Records", { ok: false, error: error.message }]); }
    try { results.push(["Asynchronous Records", await global.MethodzMeetingAsyncData?.healthCheck?.()]); } catch (error) { results.push(["Asynchronous Records", { ok: false, error: error.message }]); }
    try { results.push(["Attachment References", await Promise.resolve(global.MethodzAttachmentData?.healthCheck?.())]); } catch (error) { results.push(["Attachment References", { ok: false, error: error.message }]); }
    body.innerHTML = `<div class="provider-grid-v10">${results.map(([label, health]) => `<article class="provider-card-v10 ${health?.ok ? "is-ready-v10" : "has-issue-v10"}"><strong>${label}</strong><p>${health?.ok ? "Ready" : "Unavailable"}</p><p class="helper-text">${escapeHtml(health?.adapterId || health?.error || "No details")}</p></article>`).join("")}</div><p class="helper-text">No cloud endpoint is configured and no meeting data is transmitted.</p>`;
  }

  function patchDataFlow() {
    if (!global.__methodzV10ReleaseCollectPatched && typeof global.collectMeetingData === "function") {
      const original = global.collectMeetingData;
      global.collectMeetingData = function collectMeetingDataReleaseV10(options = {}) {
        let meeting = original(options);
        if (global.MethodzAttachmentData?.normalizeRecord) meeting = global.MethodzAttachmentData.normalizeRecord(meeting);
        meeting.schemaAudit = validateRecord(meeting);
        meeting.releaseMetadata = { ...(meeting.releaseMetadata || {}), release: "1.0.0", appShellVersion: config.appShellVersion || "1.0.0", auditedAt: meeting.schemaAudit.checkedAt };
        return meeting;
      };
      global.__methodzV10ReleaseCollectPatched = true;
    }
    if (!global.__methodzV10ReleaseLoadPatched && typeof global.loadSavedRecords === "function") {
      const original = global.loadSavedRecords;
      global.loadSavedRecords = function loadSavedRecordsReleaseV10(...args) {
        const result = original.apply(this, args);
        refreshWorkspace();
        refreshReleaseGate();
        return result;
      };
      global.__methodzV10ReleaseLoadPatched = true;
    }
  }

  function downloadJson(payload, filename) {
    if (typeof global.downloadBlob !== "function") return alert("Download support is unavailable.");
    global.downloadBlob(JSON.stringify(payload, null, 2), filename, "application/json");
  }

  function exportWorkspace() {
    const records = filteredRows().map((row) => ({ ...row, releaseAudit: validateRecord(row.record) }));
    downloadJson({ packageType: "methodz-consolidated-record-index", release: "1.0.0", exportedAt: new Date().toISOString(), records }, `methodz-consolidated-record-index-${today()}.json`);
  }

  function exportAudit() { downloadJson(buildAudit(), `methodz-v1-release-audit-${today()}.json`); }

  function exportProviderContract() {
    downloadJson({ packageType: "methodz-provider-contract-template", release: "1.0.0", generatedAt: new Date().toISOString(), meetingProvider: { contractVersion: global.MethodzMeetingAsyncData?.version, requiredMethods: global.MethodzMeetingAsyncData?.requiredMethods || [] }, attachmentProvider: { contractVersion: global.MethodzAttachmentData?.version, requiredMethods: global.MethodzAttachmentData?.requiredMethods || [], currentMode: "reference-only" }, securityNote: "Static role policies are workflow controls. Remote providers must enforce authenticated server-side permissions." }, `methodz-provider-contract-v1-${today()}.json`);
  }

  function today() { return new Date().toISOString().slice(0, 10); }
  function escapeHtml(value) { return String(value == null ? "" : value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

  global.refreshRecordsWorkspaceV10 = refreshWorkspace;
  global.openWorkspaceRecordV10 = openWorkspaceRecord;
  global.exportRecordsWorkspaceV10 = exportWorkspace;
  global.refreshProviderReadinessV10 = refreshProviders;
  global.exportProviderContractV10 = exportProviderContract;
  global.refreshReleaseGateV10 = refreshReleaseGate;
  global.exportReleaseAuditV10 = exportAudit;
  global.MethodzReleaseV10 = { version: "1.0.0", validateRecord, buildAudit, refreshWorkspace };
})(window);
