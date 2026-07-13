/* Methodz Meeting Manager v1.1 partner-safe redaction and integrity export. */
(function initializeMethodzRedactionV11(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const archiveKey = config.storageKeys?.archivedRecords || "methodzArchivedMeetingRecords";
  const logKey = config.storageKeys?.redactionLog || "methodzRedactionExportLog";
  let lastPreviewPackage = null;

  global.addEventListener("DOMContentLoaded", initialize);
  global.addEventListener("methodz:migrations-complete", refreshSourceOptions);

  function initialize() {
    installPanel();
    patchRecordCards();
    patchRecordRefresh();
    refreshSourceOptions();
    updateProfileHelp();
  }

  function profiles() {
    return Array.isArray(config.redactionProfiles) && config.redactionProfiles.length
      ? config.redactionProfiles
      : [
          { id: "partner-safe", label: "Partner Safe", description: "External operational copy without signatures or internal notes." },
          { id: "public-summary", label: "Public Summary", description: "High-level summary only." },
          { id: "custom", label: "Custom External Copy", description: "Choose included sections." }
        ];
  }

  function installPanel() {
    const savedCard = document.getElementById("savedRecords")?.closest(".card");
    const retentionDashboard = document.getElementById("retentionDashboardV11");
    const anchor = retentionDashboard || savedCard;
    if (!anchor || document.getElementById("externalExportPanelV11")) return;

    const panel = document.createElement("section");
    panel.id = "externalExportPanelV11";
    panel.className = "card v11-card external-export-v11";
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Partner-Safe Export</h2>
          <p class="helper-text">Create a separate external copy without changing the source meeting record. Typed signatures and signature-verification details are never included.</p>
        </div>
        <span class="release-badge-v11">v1.1</span>
      </div>

      <div class="form-grid external-export-grid-v11">
        <div>
          <label for="externalRecordSourceV11">Source Record</label>
          <select id="externalRecordSourceV11"><option value="current">Current Meeting Form</option></select>
        </div>
        <div>
          <label for="externalProfileV11">Redaction Profile</label>
          <select id="externalProfileV11">${profiles().map((profile) => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.label)}</option>`).join("")}</select>
        </div>
      </div>

      <p id="externalProfileHelpV11" class="helper-text"></p>

      <fieldset id="customExportFieldsV11" class="custom-export-fields-v11" hidden>
        <legend>Custom Included Sections</legend>
        <div class="checkbox-grid">
          <label><input id="externalIncludeAttendeesV11" type="checkbox" /> Attendee names and roles</label>
          <label><input id="externalIncludeAgendaV11" type="checkbox" checked /> Agenda</label>
          <label><input id="externalIncludeNotesV11" type="checkbox" /> Discussion notes</label>
          <label><input id="externalIncludeDecisionsV11" type="checkbox" checked /> Decisions</label>
          <label><input id="externalIncludeTasksV11" type="checkbox" checked /> Follow-up tasks</label>
          <label><input id="externalIncludeAttachmentsV11" type="checkbox" /> Attachment metadata</label>
          <label><input id="externalIncludeRetentionV11" type="checkbox" /> Retention summary</label>
        </div>
      </fieldset>

      <div class="button-row">
        <button type="button" onclick="previewExternalExportV11()">Preview External Copy</button>
        <button type="button" onclick="downloadExternalJsonV11()">Download JSON</button>
        <button type="button" onclick="downloadExternalHtmlV11()">Download HTML</button>
        <button type="button" onclick="exportRedactionLogV11()">Export Activity Log</button>
      </div>

      <div id="externalExportStatusV11" class="external-export-status-v11" aria-live="polite">Choose a source and profile, then preview the redacted copy.</div>
      <details id="externalExportPreviewV11" class="external-export-preview-v11">
        <summary>Redacted Package Preview</summary>
        <pre id="externalExportPreviewBodyV11"></pre>
      </details>
    `;

    anchor.insertAdjacentElement("beforebegin", panel);
    document.getElementById("externalProfileV11")?.addEventListener("change", () => {
      lastPreviewPackage = null;
      updateProfileHelp();
    });
    document.getElementById("externalRecordSourceV11")?.addEventListener("change", () => { lastPreviewPackage = null; });
    panel.querySelectorAll("input").forEach((input) => input.addEventListener("change", () => { lastPreviewPackage = null; }));
  }

  function updateProfileHelp() {
    const profileId = readValue("externalProfileV11") || "partner-safe";
    const profile = profiles().find((item) => item.id === profileId);
    const help = document.getElementById("externalProfileHelpV11");
    if (help) help.textContent = profile?.description || "Create an external copy with sensitive fields removed.";
    const custom = document.getElementById("customExportFieldsV11");
    if (custom) custom.hidden = profileId !== "custom";
  }

  function patchRecordRefresh() {
    if (global.__methodzV11RedactionRefreshPatched || typeof global.loadSavedRecords !== "function") return;
    const original = global.loadSavedRecords;
    global.loadSavedRecords = function loadSavedRecordsRedactionV11(...args) {
      const result = original.apply(this, args);
      refreshSourceOptions();
      return result;
    };
    global.__methodzV11RedactionRefreshPatched = true;
  }

  function patchRecordCards() {
    if (global.__methodzV11RedactionCardsPatched || typeof global.createRecordCard !== "function") return;
    const original = global.createRecordCard;
    global.createRecordCard = function createRecordCardRedactionV11(record) {
      const card = original(record);
      const row = card.querySelector(".button-row");
      if (row && !row.querySelector(".external-export-button-v11")) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "external-export-button-v11";
        button.textContent = "Partner Export";
        button.addEventListener("click", () => selectRecordForExternalExport(record.id));
        row.appendChild(button);
      }
      return card;
    };
    global.__methodzV11RedactionCardsPatched = true;
    if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
  }

  function refreshSourceOptions() {
    const select = document.getElementById("externalRecordSourceV11");
    if (!select) return;
    const current = select.value || "current";
    const active = typeof global.getRecords === "function" ? global.getRecords() : [];
    const archived = readArchived();
    select.innerHTML = '<option value="current">Current Meeting Form</option>'
      + '<optgroup label="Active Records">'
      + active.map((record) => `<option value="active:${escapeHtml(record.id)}">#${escapeHtml(record.meetingNumber || "?")} ${escapeHtml(record.title || "Untitled Meeting")}</option>`).join("")
      + '</optgroup>'
      + '<optgroup label="Archived Records">'
      + archived.map((entry) => `<option value="archived:${escapeHtml(entry.archiveId)}">#${escapeHtml(entry.record?.meetingNumber || "?")} ${escapeHtml(entry.record?.title || "Untitled Meeting")}</option>`).join("")
      + '</optgroup>';
    if (Array.from(select.options).some((option) => option.value === current)) select.value = current;
  }

  function selectRecordForExternalExport(recordId) {
    refreshSourceOptions();
    const select = document.getElementById("externalRecordSourceV11");
    if (select) select.value = `active:${recordId}`;
    const panel = document.getElementById("externalExportPanelV11");
    panel?.focus();
    panel?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    lastPreviewPackage = null;
  }

  function resolveSourceRecord() {
    const source = readValue("externalRecordSourceV11") || "current";
    if (source === "current") {
      if (typeof global.collectMeetingData !== "function") return null;
      return { sourceType: "current", record: global.collectMeetingData() };
    }
    if (source.startsWith("active:")) {
      const id = source.slice("active:".length);
      const record = (typeof global.getRecords === "function" ? global.getRecords() : []).find((item) => item.id === id);
      return record ? { sourceType: "active", record } : null;
    }
    if (source.startsWith("archived:")) {
      const archiveId = source.slice("archived:".length);
      const entry = readArchived().find((item) => item.archiveId === archiveId);
      return entry?.record ? { sourceType: "archived", archiveId, record: entry.record } : null;
    }
    return null;
  }

  function canExport(record) {
    if (!record) return false;
    if (global.MethodzGovernanceV10?.canRolePerform) {
      return global.MethodzGovernanceV10.canRolePerform(record, "export");
    }
    return true;
  }

  function customSections() {
    return {
      attendees: checked("externalIncludeAttendeesV11"),
      agenda: checked("externalIncludeAgendaV11"),
      notes: checked("externalIncludeNotesV11"),
      decisions: checked("externalIncludeDecisionsV11"),
      tasks: checked("externalIncludeTasksV11"),
      attachments: checked("externalIncludeAttachmentsV11"),
      retention: checked("externalIncludeRetentionV11")
    };
  }

  function redactRecord(record, profileId = "partner-safe", sections = customSections()) {
    const source = clone(record || {});
    const removed = [];
    const warnings = [];
    let externalRecord;

    if (profileId === "public-summary") {
      externalRecord = buildPublicSummary(source, removed);
    } else if (profileId === "custom") {
      externalRecord = buildCustomCopy(source, sections, removed, warnings);
    } else {
      externalRecord = buildPartnerCopy(source, removed);
    }

    stripUnsafeFields(externalRecord, removed);
    externalRecord.externalCopy = {
      profile: profileId,
      generatedAt: new Date().toISOString(),
      sourceSchemaVersion: source.schemaVersion || "unknown",
      notice: "This is a redacted external copy. Refer to the controlled source record for the complete meeting record."
    };

    return {
      record: externalRecord,
      manifest: {
        profile: profileId,
        profileLabel: profiles().find((item) => item.id === profileId)?.label || profileId,
        generatedAt: externalRecord.externalCopy.generatedAt,
        sourceReference: {
          meetingNumber: source.meetingNumber || "",
          title: source.title || "",
          date: source.date || ""
        },
        removedPaths: Array.from(new Set(removed)).sort(),
        warnings,
        irreversible: true,
        signatureDataIncluded: false
      }
    };
  }

  function buildPartnerCopy(source, removed) {
    removed.push(
      "notes",
      "accessControl.policyNote",
      "accessControl.allowedRoles",
      "accessControl.protectedFields",
      "organizationDetails.contact",
      "attachments.location",
      "attachments.addedBy",
      "directorySnapshot",
      "recordMeta",
      "schemaAudit",
      "releaseMetadata",
      "adapterMetadata",
      "attachmentAdapterMetadata",
      "syncMetadata"
    );
    return {
      schemaVersion: "external-1.1",
      meetingNumber: source.meetingNumber || "",
      title: source.title || "",
      status: source.status || "",
      date: source.date || "",
      location: source.location || "",
      facilitator: source.facilitator || "",
      organizations: clone(source.organizations || []),
      organizationDetails: sanitizeOrganizations(source.organizationDetails || []),
      attendees: sanitizeAttendees(source.attendees || []),
      agenda: clone(source.agenda || []),
      decisions: source.decisions || "",
      decisionsList: sanitizeDecisions(source.decisionsList || []),
      tasks: sanitizeTasks(source.tasks || []),
      attachments: sanitizeAttachments(source.attachments || []),
      attachmentSummary: { itemCount: (source.attachments || []).length },
      summary: source.summary || "",
      accessControl: {
        classification: "Partner Shared",
        reviewStatus: source.accessControl?.reviewStatus || "Not Reviewed"
      },
      retentionMetadata: sanitizeRetention(source.retentionMetadata)
    };
  }

  function buildPublicSummary(source, removed) {
    removed.push(
      "id",
      "location",
      "facilitator",
      "attendees",
      "notes",
      "tasks",
      "attachments",
      "organizationDetails",
      "signatureAudit",
      "accessControl",
      "retentionMetadata",
      "directorySnapshot",
      "recordMeta",
      "schemaAudit",
      "releaseMetadata",
      "adapterMetadata",
      "attachmentAdapterMetadata",
      "syncMetadata"
    );
    return {
      schemaVersion: "external-1.1",
      meetingNumber: source.meetingNumber || "",
      title: source.title || "",
      status: source.status || "",
      date: source.date || "",
      organizations: clone(source.organizations || []),
      agenda: (source.agenda || []).filter((item) => item?.completed).map((item) => ({ group: item.group || "General", item: item.item || "", completed: true })),
      decisions: source.decisions || "",
      decisionsList: sanitizeDecisions(source.decisionsList || []).filter((item) => ["Approved", "Confirmed", "Completed"].includes(item.status)),
      summary: source.summary || ""
    };
  }

  function buildCustomCopy(source, sections, removed, warnings) {
    const record = {
      schemaVersion: "external-1.1",
      meetingNumber: source.meetingNumber || "",
      title: source.title || "",
      status: source.status || "",
      date: source.date || "",
      location: source.location || "",
      facilitator: source.facilitator || "",
      organizations: clone(source.organizations || []),
      organizationDetails: sanitizeOrganizations(source.organizationDetails || []),
      summary: source.summary || ""
    };

    if (sections.attendees) record.attendees = sanitizeAttendees(source.attendees || []);
    else removed.push("attendees");
    if (sections.agenda) record.agenda = clone(source.agenda || []);
    else removed.push("agenda");
    if (sections.notes) {
      record.notes = source.notes || "";
      warnings.push("Discussion notes were intentionally included. Review them manually before sharing.");
    } else removed.push("notes");
    if (sections.decisions) {
      record.decisions = source.decisions || "";
      record.decisionsList = sanitizeDecisions(source.decisionsList || []);
    } else removed.push("decisions", "decisionsList");
    if (sections.tasks) record.tasks = sanitizeTasks(source.tasks || []);
    else removed.push("tasks");
    if (sections.attachments) record.attachments = sanitizeAttachments(source.attachments || []);
    else removed.push("attachments");
    if (sections.retention) record.retentionMetadata = sanitizeRetention(source.retentionMetadata);
    else removed.push("retentionMetadata");

    removed.push("accessControl", "signatureAudit", "directorySnapshot", "recordMeta", "schemaAudit", "releaseMetadata", "adapterMetadata", "attachmentAdapterMetadata", "syncMetadata");
    return record;
  }

  function sanitizeAttendees(attendees) {
    return attendees.map((person) => ({
      name: person?.name || "",
      organizationRole: person?.organizationRole || "",
      attendanceType: person?.attendanceType || ""
    }));
  }

  function sanitizeOrganizations(items) {
    return items.map((item) => ({
      name: item?.name || item?.organization || "",
      type: item?.type || item?.organizationType || "",
      primaryRepresentative: item?.primaryRepresentative || ""
    }));
  }

  function sanitizeDecisions(items) {
    return items.map((item) => ({
      decision: item?.decision || item?.item || "",
      approvedBy: item?.approvedBy || item?.confirmedBy || "",
      date: item?.date || "",
      status: item?.status || "",
      conditions: item?.conditions || item?.notes || ""
    }));
  }

  function sanitizeTasks(items) {
    return items.map((item) => ({
      task: item?.task || "",
      assignedTo: item?.assignedTo || "",
      priority: item?.priority || "",
      due: item?.due || "",
      status: item?.status || ""
    }));
  }

  function sanitizeAttachments(items) {
    return items.map((item) => ({
      name: item?.name || item?.referenceName || "",
      type: item?.type || "",
      date: item?.date || ""
    }));
  }

  function sanitizeRetention(value) {
    const retention = value && typeof value === "object" ? value : {};
    return {
      policyId: retention.policyId || "",
      reviewDate: retention.reviewDate || "",
      lifecycleStatus: retention.lifecycleStatus || "",
      legalHoldActive: Boolean(retention.legalHold?.active)
    };
  }

  function stripUnsafeFields(value, removed, path = "") {
    if (Array.isArray(value)) {
      value.forEach((item, index) => stripUnsafeFields(item, removed, `${path}[${index}]`));
      return;
    }
    if (!value || typeof value !== "object") return;

    Object.keys(value).forEach((key) => {
      const currentPath = path ? `${path}.${key}` : key;
      const normalized = key.toLowerCase();
      const unsafe = [
        "signature",
        "signatureconsent",
        "signatureverification",
        "signedat",
        "verifiedat",
        "verifiedby",
        "contact",
        "email",
        "phone",
        "address",
        "locationreference",
        "filepath",
        "filelocation",
        "contentlocation",
        "dataurl",
        "base64"
      ].includes(normalized);
      if (unsafe) {
        delete value[key];
        removed.push(currentPath);
      } else {
        stripUnsafeFields(value[key], removed, currentPath);
      }
    });
  }

  async function buildExternalPackage() {
    const resolved = resolveSourceRecord();
    if (!resolved?.record) throw new Error("The selected meeting record is not available.");
    if (!canExport(resolved.record)) throw new Error("The current workspace role is not allowed to export this record.");

    const profileId = readValue("externalProfileV11") || "partner-safe";
    const redacted = redactRecord(resolved.record, profileId, customSections());
    const unsigned = {
      packageType: "methodz-external-meeting-copy",
      packageVersion: 1,
      schemaVersion: config.schemaVersion || "1.1.0",
      exportedAt: new Date().toISOString(),
      sourceType: resolved.sourceType,
      manifest: redacted.manifest,
      record: redacted.record
    };
    const integrity = await computeIntegrity(unsigned);
    return { ...unsigned, integrity };
  }

  async function previewExternalExport() {
    setStatus("Preparing redacted preview...", "working");
    try {
      lastPreviewPackage = await buildExternalPackage();
      const preview = document.getElementById("externalExportPreviewV11");
      const body = document.getElementById("externalExportPreviewBodyV11");
      if (body) body.textContent = JSON.stringify(lastPreviewPackage, null, 2);
      if (preview) preview.open = true;
      setStatus(`${lastPreviewPackage.manifest.profileLabel} preview ready. ${lastPreviewPackage.manifest.removedPaths.length} sensitive field path(s) removed. Integrity: ${lastPreviewPackage.integrity.algorithm}.`, "ready");
      return lastPreviewPackage;
    } catch (error) {
      lastPreviewPackage = null;
      setStatus(error.message || String(error), "error");
      alert(error.message || String(error));
      return null;
    }
  }

  async function packageForDownload() {
    return lastPreviewPackage || previewExternalExport();
  }

  async function downloadExternalJson() {
    const payload = await packageForDownload();
    if (!payload || typeof global.downloadBlob !== "function") return;
    global.downloadBlob(JSON.stringify(payload, null, 2), filenameFor(payload, "json"), "application/json");
    recordExportActivity(payload, "json");
    setStatus("Redacted JSON copy downloaded. The source record was not changed.", "ready");
  }

  async function downloadExternalHtml() {
    const payload = await packageForDownload();
    if (!payload || typeof global.downloadBlob !== "function") return;
    global.downloadBlob(renderExternalHtml(payload), filenameFor(payload, "html"), "text/html");
    recordExportActivity(payload, "html");
    setStatus("Redacted HTML copy downloaded. The source record was not changed.", "ready");
  }

  function renderExternalHtml(payload) {
    const record = payload.record || {};
    const manifest = payload.manifest || {};
    const section = (title, content) => content == null || content === "" || (Array.isArray(content) && !content.length)
      ? ""
      : `<section><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(typeof content === "string" ? content : JSON.stringify(content, null, 2))}</pre></section>`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(record.title || "Meeting Export")}</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:0 auto;padding:28px;color:#222}header{border-bottom:3px solid #111;margin-bottom:24px}section{border:1px solid #ddd;border-radius:8px;padding:16px;margin:16px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f6f6f6;padding:12px;border-radius:6px}.notice{background:#fff8df;border-color:#d8b24c}dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 16px}dt{font-weight:700}@media print{body{padding:0}section{break-inside:avoid}}</style></head><body><header><p>Methodz Meeting Manager External Copy</p><h1>${escapeHtml(record.title || "Untitled Meeting")}</h1><p>Meeting #${escapeHtml(record.meetingNumber || "?")} • ${escapeHtml(record.date || "No date")} • ${escapeHtml(manifest.profileLabel || manifest.profile || "Redacted")}</p></header><section class="notice"><h2>Redaction Notice</h2><p>This is a redacted external copy. Typed signatures and signature-verification details are not included.</p><dl><dt>Integrity</dt><dd>${escapeHtml(payload.integrity?.algorithm || "unknown")}: ${escapeHtml(payload.integrity?.digest || "")}</dd><dt>Generated</dt><dd>${escapeHtml(payload.exportedAt || "")}</dd><dt>Removed paths</dt><dd>${escapeHtml(String(manifest.removedPaths?.length || 0))}</dd></dl></section>${section("Meeting Details", { status: record.status, location: record.location, facilitator: record.facilitator, organizations: record.organizations })}${section("Attendance", record.attendees)}${section("Agenda", record.agenda)}${section("Discussion Notes", record.notes)}${section("Decisions", record.decisionsList?.length ? record.decisionsList : record.decisions)}${section("Follow-Up Tasks", record.tasks)}${section("Attachment References", record.attachments)}${section("Meeting Summary", record.summary)}${section("Retention Summary", record.retentionMetadata)}</body></html>`;
  }

  async function computeIntegrity(value) {
    const canonical = stableStringify(value);
    if (global.crypto?.subtle && global.TextEncoder) {
      try {
        const bytes = new TextEncoder().encode(canonical);
        const digest = await global.crypto.subtle.digest("SHA-256", bytes);
        return {
          algorithm: "SHA-256",
          digest: Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join(""),
          canonicalization: "methodz-stable-json-v1",
          note: "Digest detects accidental or unauthorized package changes. It is not a digital signature and does not prove who created the package."
        };
      } catch (error) {
        console.warn("SHA-256 unavailable; using compatibility checksum", error);
      }
    }
    return {
      algorithm: "FNV-1a-32 compatibility checksum",
      digest: fnv1a(canonical),
      canonicalization: "methodz-stable-json-v1",
      note: "Non-cryptographic fallback used because Web Crypto was unavailable."
    };
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function fnv1a(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function recordExportActivity(payload, format) {
    const source = resolveSourceRecord();
    const log = readJson(logKey, []);
    log.push({
      id: `redaction-export-${Date.now()}`,
      exportedAt: new Date().toISOString(),
      format,
      profile: payload.manifest?.profile || "",
      meetingNumber: payload.manifest?.sourceReference?.meetingNumber || "",
      title: payload.manifest?.sourceReference?.title || "",
      sourceType: source?.sourceType || payload.sourceType,
      sourceRecordId: source?.record?.id || "current-form",
      integrityAlgorithm: payload.integrity?.algorithm || "",
      integrityDigest: payload.integrity?.digest || ""
    });
    global.localStorage.setItem(logKey, JSON.stringify(log.slice(-200)));
  }

  function exportRedactionLog() {
    const log = readJson(logKey, []);
    const payload = {
      packageType: "methodz-redaction-export-log",
      packageVersion: 1,
      generatedAt: new Date().toISOString(),
      count: log.length,
      entries: log
    };
    if (typeof global.downloadBlob === "function") {
      global.downloadBlob(JSON.stringify(payload, null, 2), `methodz-redaction-export-log-${today()}.json`, "application/json");
    }
  }

  function filenameFor(payload, extension) {
    const number = String(payload.manifest?.sourceReference?.meetingNumber || "meeting").replace(/[^a-z0-9_-]+/gi, "-");
    const profile = String(payload.manifest?.profile || "external").replace(/[^a-z0-9_-]+/gi, "-");
    return `methodz-${number}-${profile}-${today()}.${extension}`;
  }

  function readArchived() {
    return readJson(archiveKey, []).filter((entry) => entry?.record);
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(global.localStorage.getItem(key));
      return value ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function readValue(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function checked(id) {
    return Boolean(document.getElementById(id)?.checked);
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function setStatus(message, state) {
    const element = document.getElementById("externalExportStatusV11");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state || "";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function prefersReducedMotion() {
    return global.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  global.previewExternalExportV11 = previewExternalExport;
  global.downloadExternalJsonV11 = downloadExternalJson;
  global.downloadExternalHtmlV11 = downloadExternalHtml;
  global.exportRedactionLogV11 = exportRedactionLog;
  global.selectRecordForExternalExportV11 = selectRecordForExternalExport;
  global.MethodzRedactionV11 = {
    version: "1.1.0",
    redactRecord,
    buildExternalPackage,
    computeIntegrity,
    stableStringify
  };
})(window);
