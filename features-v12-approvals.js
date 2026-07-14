/* Methodz Meeting Manager v1.2 approval and disposition workflow. */
(function initMethodzApprovalsV12(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const storage = config.storageKeys || {};
  const keys = {
    archive: storage.archivedRecords || "methodzArchivedMeetingRecords",
    exports: storage.exportApprovals || "methodzExternalExportApprovals",
    exportLog: storage.exportApprovalLog || "methodzExternalExportApprovalLog",
    dispositions: storage.dispositionApprovals || "methodzDispositionApprovals",
    dispositionLog: storage.dispositionLog || "methodzDispositionLog",
    redactionLog: storage.redactionLog || "methodzRedactionExportLog"
  };

  global.addEventListener("DOMContentLoaded", initialize);
  global.addEventListener("methodz:migrations-complete", refreshAll);
  global.addEventListener("methodz:role-context-changed", refreshAll);

  function initialize() {
    installExportPanel();
    installDispositionPanel();
    patchRecordCollection();
    patchExternalExports();
    patchArchiveDeletion();
    patchRefreshHooks();
    trackFormChanges();
    refreshAll();
  }

  function role() {
    return global.MethodzGovernanceV10?.getCurrentRole?.() || "Administrator";
  }

  function policies() {
    return config.exportRecipientPolicies || [{
      id: "approved-partner",
      label: "Approved Partner Organization",
      allowedProfiles: ["partner-safe"]
    }];
  }

  function installExportPanel() {
    const anchor = document.getElementById("externalExportPanelV11") || document.getElementById("retentionDashboardV11");
    if (!anchor || document.getElementById("externalApprovalPanelV12")) return;
    const panel = document.createElement("section");
    panel.id = "externalApprovalPanelV12";
    panel.className = "card v12-card";
    panel.innerHTML = `
      <div class="section-subheader"><div><h2>External Export Approval</h2><p class="helper-text">Approval is bound to the source fingerprint, redaction profile, and recipient policy. Preview is allowed before approval; download is not.</p></div><span class="release-badge-v12">v1.2</span></div>
      <div class="form-grid">
        <div><label for="exportRecipientPolicyV12">Recipient Policy</label><select id="exportRecipientPolicyV12">${policies().map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join("")}</select></div>
        <div><label for="exportApprovalExpiresV12">Approval Expires</label><input id="exportApprovalExpiresV12" type="date"></div>
        <div><label for="exportApprovalRequestedByV12">Requested By</label><input id="exportApprovalRequestedByV12" type="text" placeholder="Person requesting the copy"></div>
        <div><label for="exportApprovalReviewedByV12">Reviewed / Approved By</label><input id="exportApprovalReviewedByV12" type="text" placeholder="Authorized reviewer"></div>
      </div>
      <label for="exportApprovalNoteV12">Recipient Purpose / Approval Note</label><textarea id="exportApprovalNoteV12" placeholder="Recipient, purpose, sharing limits, and approval conditions..."></textarea>
      <div class="button-row"><button type="button" onclick="requestExternalExportApprovalV12()">Request Review</button><button type="button" onclick="approveExternalExportV12()">Approve</button><button type="button" onclick="rejectExternalExportV12()">Reject / Revoke</button><button type="button" onclick="exportApprovalAuditV12()">Export Approval Log</button></div>
      <div id="externalApprovalStatusV12" class="approval-status-v12" aria-live="polite"></div><div id="externalApprovalHistoryV12" class="approval-history-v12"></div>`;
    anchor.insertAdjacentElement("beforebegin", panel);
    ["externalRecordSourceV11", "externalProfileV11", "exportRecipientPolicyV12"].forEach((id) => document.getElementById(id)?.addEventListener("change", refreshExport));
  }

  function installDispositionPanel() {
    const anchor = document.getElementById("archiveVaultV08") || document.getElementById("savedRecords")?.closest(".card");
    if (!anchor || document.getElementById("dispositionApprovalPanelV12")) return;
    const panel = document.createElement("section");
    panel.id = "dispositionApprovalPanelV12";
    panel.className = "card v12-card";
    panel.innerHTML = `
      <div class="section-subheader"><div><h2>Permanent Disposition Approval</h2><p class="helper-text">Permanent archive deletion requires approval for the current fingerprint and remains blocked by an active preservation hold.</p></div><span class="release-badge-v12">v1.2</span></div>
      <div class="form-grid">
        <div><label for="dispositionArchiveSourceV12">Archived Record</label><select id="dispositionArchiveSourceV12"></select></div>
        <div><label for="dispositionRequestedByV12">Requested By</label><input id="dispositionRequestedByV12" type="text"></div>
        <div><label for="dispositionReviewedByV12">Reviewed / Approved By</label><input id="dispositionReviewedByV12" type="text"></div>
        <div><label for="dispositionDecisionDateV12">Decision Date</label><input id="dispositionDecisionDateV12" type="date"></div>
      </div>
      <label for="dispositionBasisV12">Disposition Basis</label><textarea id="dispositionBasisV12" placeholder="Retention review outcome, authority, and required evidence..."></textarea>
      <div class="button-row"><button type="button" onclick="requestDispositionApprovalV12()">Request Review</button><button type="button" onclick="approveDispositionV12()">Approve Disposition</button><button type="button" onclick="rejectDispositionV12()">Reject / Revoke</button><button type="button" onclick="exportDispositionAuditV12()">Export Disposition Log</button></div>
      <div id="dispositionStatusV12" class="approval-status-v12" aria-live="polite"></div><div id="dispositionHistoryV12" class="approval-history-v12"></div>`;
    anchor.insertAdjacentElement("beforebegin", panel);
    document.getElementById("dispositionArchiveSourceV12")?.addEventListener("change", refreshDisposition);
  }

  function patchRecordCollection() {
    if (global.__methodzV12CollectPatched || typeof global.collectMeetingData !== "function") return;
    const original = global.collectMeetingData;
    global.collectMeetingData = function collectMeetingDataV12(options = {}) {
      const record = original(options);
      record.approvalMetadata = {
        exportApprovalRequired: true,
        dispositionApprovalRequired: true,
        lastApprovedExportId: record.approvalMetadata?.lastApprovedExportId || "",
        lastApprovedExportAt: record.approvalMetadata?.lastApprovedExportAt || "",
        lastDispositionApprovalId: record.approvalMetadata?.lastDispositionApprovalId || "",
        lastDispositionApprovedAt: record.approvalMetadata?.lastDispositionApprovedAt || "",
        updatedAt: new Date().toISOString()
      };
      record.schemaVersion = config.schemaVersion || "1.2.0";
      record.releaseMetadata = { ...(record.releaseMetadata || {}), release: "1.2.0", appShellVersion: config.appShellVersion || "1.2.0" };
      if (global.MethodzReleaseV10?.validateRecord) record.schemaAudit = global.MethodzReleaseV10.validateRecord(record);
      return record;
    };
    global.__methodzV12CollectPatched = true;
  }

  function patchExternalExports() {
    if (global.__methodzV12ExportPatched || typeof global.previewExternalExportV11 !== "function") return;
    const originalPreview = global.previewExternalExportV11;
    global.previewExternalExportV11 = async function previewExternalExportV12() {
      const payload = await originalPreview();
      if (!payload) return null;
      const context = exportContext();
      const approval = validExportApproval(context);
      payload.approval = approval ? approvalSnapshot(approval) : {
        required: true,
        status: latestExportApproval(context)?.status || "Not Requested",
        validForCurrentSource: false
      };
      payload.manifest = { ...(payload.manifest || {}), approvalRequired: true, approvalStatus: payload.approval.status, approvalId: payload.approval.id || "" };
      if (global.MethodzRedactionV11?.computeIntegrity) {
        const unsigned = clone(payload);
        delete unsigned.integrity;
        payload.integrity = await global.MethodzRedactionV11.computeIntegrity(unsigned);
      }
      refreshExport();
      return payload;
    };

    global.downloadExternalJsonV11 = async function downloadExternalJsonV12() {
      return downloadApprovedExternal("json");
    };
    global.downloadExternalHtmlV11 = async function downloadExternalHtmlV12() {
      return downloadApprovedExternal("html");
    };
    global.__methodzV12ExportPatched = true;
  }

  async function downloadApprovedExternal(format) {
    const context = exportContext();
    const approval = validExportApproval(context);
    if (!approval) return blockExport();
    const payload = await global.previewExternalExportV11();
    if (!payload || typeof global.downloadBlob !== "function") return null;
    const body = format === "html" ? renderExternalHtml(payload) : JSON.stringify(payload, null, 2);
    global.downloadBlob(body, externalFilename(payload, format), format === "html" ? "text/html" : "application/json");
    logEvent(keys.exportLog, "approved-external-download", {
      approvalId: approval.id,
      sourceRecordId: context.record.id || "current-form",
      meetingNumber: context.record.meetingNumber || "",
      title: context.record.title || "",
      profile: context.profile,
      recipientPolicyId: context.recipientPolicyId,
      format,
      sourceFingerprint: context.fingerprint,
      integrity: payload.integrity
    });
    logEvent(keys.redactionLog, "approved-external-export", {
      approvalId: approval.id,
      format,
      sourceRecordId: context.record.id || "current-form",
      profile: context.profile,
      integrityAlgorithm: payload.integrity?.algorithm || "",
      integrityDigest: payload.integrity?.digest || ""
    });
    return payload;
  }

  function patchArchiveDeletion() {
    const list = document.getElementById("archiveVaultListV08");
    if (!list || global.__methodzV12DeletePatched) return;
    list.addEventListener("click", (event) => {
      const button = event.target.closest('button[data-action="delete"]');
      if (!button) return;
      const entry = archiveEntryForCard(button.closest(".archived-record-v08"));
      if (!entry || entry.record?.retentionMetadata?.legalHold?.active) return;
      const approval = validDispositionApproval(entry);
      if (!approval) {
        event.preventDefault();
        event.stopImmediatePropagation();
        alert("Permanent deletion is blocked until disposition is approved for the current archived-record fingerprint.");
        selectDisposition(entry.archiveId);
        return;
      }
      global.setTimeout(() => {
        if (!archivedEntries().some((item) => item.archiveId === entry.archiveId)) consumeDisposition(entry, approval);
      }, 0);
    }, true);
    new MutationObserver(refreshDispositionSources).observe(list, { childList: true });
    global.__methodzV12DeletePatched = true;
  }

  function patchRefreshHooks() {
    if (!global.__methodzV12RecordsPatched && typeof global.loadSavedRecords === "function") {
      const original = global.loadSavedRecords;
      global.loadSavedRecords = function loadSavedRecordsV12(...args) {
        const result = original.apply(this, args);
        global.setTimeout(refreshAll, 0);
        return result;
      };
      global.__methodzV12RecordsPatched = true;
    }
    if (!global.__methodzV12ArchivePatched && typeof global.renderArchiveVaultV08 === "function") {
      const original = global.renderArchiveVaultV08;
      global.renderArchiveVaultV08 = function renderArchiveVaultV12(...args) {
        const result = original.apply(this, args);
        global.setTimeout(refreshDispositionSources, 0);
        return result;
      };
      global.__methodzV12ArchivePatched = true;
    }
  }

  function trackFormChanges() {
    const root = document.getElementById("mainContent");
    if (!root) return;
    let timer;
    const schedule = (event) => {
      if (event.target?.closest?.("#externalApprovalPanelV12")) return;
      global.clearTimeout(timer);
      timer = global.setTimeout(refreshExport, 100);
    };
    root.addEventListener("input", schedule);
    root.addEventListener("change", schedule);
  }

  function exportContext() {
    const selected = readValue("externalRecordSourceV11") || "current";
    let sourceKey = "current-form";
    let sourceType = "current";
    let record = null;
    if (selected === "current") record = global.collectMeetingData?.();
    else if (selected.startsWith("active:")) {
      sourceKey = selected;
      sourceType = "active";
      record = (global.getRecords?.() || []).find((item) => item.id === selected.slice(7));
    } else if (selected.startsWith("archived:")) {
      sourceKey = selected;
      sourceType = "archived";
      record = archivedEntries().find((item) => item.archiveId === selected.slice(9))?.record;
    }
    if (!record) return null;
    return {
      sourceKey,
      sourceType,
      record,
      profile: readValue("externalProfileV11") || "partner-safe",
      recipientPolicyId: readValue("exportRecipientPolicyV12") || policies()[0].id,
      fingerprint: recordFingerprint(record)
    };
  }

  function latestExportApproval(context) {
    if (!context) return null;
    return readJson(keys.exports, [])
      .filter((item) => item.sourceKey === context.sourceKey && item.profile === context.profile && item.recipientPolicyId === context.recipientPolicyId)
      .sort(sortNewest)[0] || null;
  }

  function validExportApproval(context) {
    const item = latestExportApproval(context);
    return item && item.status === "Approved" && item.sourceFingerprint === context.fingerprint && (!item.expiresAt || item.expiresAt >= today()) ? item : null;
  }

  function requestExportApproval() {
    const context = exportContext();
    const requestedBy = readValue("exportApprovalRequestedByV12");
    const note = readValue("exportApprovalNoteV12");
    const policy = policies().find((item) => item.id === context?.recipientPolicyId);
    if (!context?.record?.title || !context.record.date) return alert("The source record requires a title and date.");
    if (!requestedBy) return alert("Enter the person requesting the external copy.");
    if (!policy?.allowedProfiles?.includes(context.profile)) return alert(`${policy?.label || "This recipient policy"} does not allow the ${context.profile} profile.`);
    if (context.profile === "custom" && policy.requiresNoteForCustom && !note) return alert("A custom external copy requires a purpose and sharing-limits note.");
    const previous = latestExportApproval(context);
    const now = new Date().toISOString();
    const item = {
      id: previous?.id || `export-approval-${Date.now()}`,
      sourceKey: context.sourceKey,
      sourceType: context.sourceType,
      sourceRecordId: context.record.id || "current-form",
      meetingNumber: context.record.meetingNumber || "",
      title: context.record.title,
      profile: context.profile,
      recipientPolicyId: context.recipientPolicyId,
      sourceFingerprint: context.fingerprint,
      status: "Review Requested",
      requestedBy,
      requestedAt: now,
      reviewedBy: "",
      reviewedAt: "",
      expiresAt: readValue("exportApprovalExpiresV12"),
      note,
      updatedAt: now,
      history: [...(previous?.history || []), { action: "review-requested", at: now, by: requestedBy, note }]
    };
    upsert(keys.exports, item);
    logEvent(keys.exportLog, "export-approval-requested", item);
    refreshExport();
  }

  function approveExport() {
    const context = exportContext();
    const item = latestExportApproval(context);
    const reviewer = readValue("exportApprovalReviewedByV12");
    if (!(config.exportApprovalRoles || ["Administrator", "Auditor"]).includes(role())) return alert(`The ${role()} role is not authorized to approve external exports.`);
    if (!reviewer) return alert("Enter the authorized reviewer.");
    if (!item || item.status !== "Review Requested") return alert("Request review for this exact source, recipient policy, and profile first.");
    if (item.sourceFingerprint !== context.fingerprint) return alert("The source changed after review was requested. Submit a new request.");
    decide(keys.exports, keys.exportLog, item, "Approved", reviewer, readValue("exportApprovalNoteV12"));
    refreshExport();
  }

  function rejectExport() {
    const context = exportContext();
    const item = latestExportApproval(context);
    const reviewer = readValue("exportApprovalReviewedByV12");
    if (!(config.exportApprovalRoles || ["Administrator", "Auditor"]).includes(role())) return alert(`The ${role()} role is not authorized to reject or revoke external exports.`);
    if (!item || !reviewer) return alert("Select an approval and enter the authorized reviewer.");
    decide(keys.exports, keys.exportLog, item, item.status === "Approved" ? "Revoked" : "Rejected", reviewer, readValue("exportApprovalNoteV12"));
    refreshExport();
  }

  function refreshExport() {
    const status = document.getElementById("externalApprovalStatusV12");
    const history = document.getElementById("externalApprovalHistoryV12");
    if (!status) return;
    const context = exportContext();
    const item = latestExportApproval(context);
    const valid = validExportApproval(context);
    const policy = policies().find((entry) => entry.id === context?.recipientPolicyId);
    const allowed = Boolean(policy?.allowedProfiles?.includes(context?.profile));
    status.className = `approval-status-v12 ${valid ? "is-approved-v12" : "is-blocked-v12"}`;
    status.textContent = valid ? `Approved by ${valid.reviewedBy}. Downloads are enabled for this fingerprint.`
      : !allowed ? `${policy?.label || "The recipient policy"} does not allow the ${context?.profile || "selected"} profile.`
      : item?.status === "Approved" && item.sourceFingerprint !== context?.fingerprint ? "The source record changed after approval. A new request is required."
      : item?.expiresAt && item.expiresAt < today() ? `Approval expired on ${item.expiresAt}.`
      : `Approval status: ${item?.status || "Not Requested"}. Downloads remain blocked.`;
    if (history) history.innerHTML = renderHistory(item?.history || []);
  }

  function blockExport() {
    refreshExport();
    alert("External download is blocked until an authorized reviewer approves this exact record fingerprint, recipient policy, and redaction profile.");
    document.getElementById("externalApprovalPanelV12")?.scrollIntoView({ behavior: "smooth", block: "start" });
    return null;
  }

  function approvalSnapshot(item) {
    return {
      required: true,
      id: item.id,
      status: item.status,
      recipientPolicyId: item.recipientPolicyId,
      profile: item.profile,
      requestedBy: item.requestedBy,
      requestedAt: item.requestedAt,
      approvedBy: item.reviewedBy,
      approvedAt: item.reviewedAt,
      expiresAt: item.expiresAt || "",
      sourceFingerprint: item.sourceFingerprint,
      validForCurrentSource: true,
      note: item.note || ""
    };
  }

  function refreshDispositionSources() {
    const select = document.getElementById("dispositionArchiveSourceV12");
    if (!select) return;
    const current = select.value;
    const items = archivedEntries().slice().sort((a, b) => String(b.archivedAt || "").localeCompare(String(a.archivedAt || "")));
    select.innerHTML = items.length
      ? items.map((entry) => `<option value="${escapeHtml(entry.archiveId)}">#${escapeHtml(entry.record?.meetingNumber || "?")} ${escapeHtml(entry.record?.title || "Untitled Meeting")}</option>`).join("")
      : '<option value="">No archived records</option>';
    if (items.some((entry) => entry.archiveId === current)) select.value = current;
    refreshDisposition();
  }

  function selectedArchiveEntry() {
    return archivedEntries().find((entry) => entry.archiveId === readValue("dispositionArchiveSourceV12")) || null;
  }

  function latestDispositionApproval(entry) {
    return entry ? readJson(keys.dispositions, []).filter((item) => item.archiveId === entry.archiveId).sort(sortNewest)[0] || null : null;
  }

  function validDispositionApproval(entry) {
    const item = latestDispositionApproval(entry);
    return item && item.status === "Approved" && item.recordFingerprint === recordFingerprint(entry.record) ? item : null;
  }

  function requestDispositionApproval() {
    const entry = selectedArchiveEntry();
    const requestedBy = readValue("dispositionRequestedByV12");
    const basis = readValue("dispositionBasisV12");
    if (!entry) return alert("Select an archived record first.");
    if (entry.record?.retentionMetadata?.legalHold?.active) return alert("Disposition review cannot proceed while a preservation hold is active.");
    if (!requestedBy || !basis) return alert("Enter the requester and documented disposition basis.");
    const previous = latestDispositionApproval(entry);
    const now = new Date().toISOString();
    const item = {
      id: previous?.id || `disposition-approval-${Date.now()}`,
      archiveId: entry.archiveId,
      sourceRecordId: entry.record?.id || "",
      meetingNumber: entry.record?.meetingNumber || "",
      title: entry.record?.title || "",
      recordFingerprint: recordFingerprint(entry.record),
      status: "Review Requested",
      requestedBy,
      requestedAt: now,
      reviewedBy: "",
      reviewedAt: "",
      decisionDate: readValue("dispositionDecisionDateV12") || today(),
      basis,
      updatedAt: now,
      history: [...(previous?.history || []), { action: "review-requested", at: now, by: requestedBy, note: basis }]
    };
    upsert(keys.dispositions, item);
    logEvent(keys.dispositionLog, "disposition-review-requested", item);
    refreshDisposition();
  }

  function approveDisposition() {
    const entry = selectedArchiveEntry();
    const item = latestDispositionApproval(entry);
    const reviewer = readValue("dispositionReviewedByV12");
    if (!entry) return alert("Select an archived record first.");
    if (entry.record?.retentionMetadata?.legalHold?.active) return alert("Disposition cannot be approved while a preservation hold is active.");
    if (!(config.dispositionApprovalRoles || ["Administrator", "Auditor"]).includes(role())) return alert(`The ${role()} role is not authorized to approve permanent disposition.`);
    if (!reviewer || !item || item.status !== "Review Requested") return alert("Request review first and enter the authorized reviewer.");
    if (item.recordFingerprint !== recordFingerprint(entry.record)) return alert("The archived record changed after review was requested.");
    decide(keys.dispositions, keys.dispositionLog, item, "Approved", reviewer, readValue("dispositionBasisV12"));
    refreshDisposition();
  }

  function rejectDisposition() {
    const entry = selectedArchiveEntry();
    const item = latestDispositionApproval(entry);
    const reviewer = readValue("dispositionReviewedByV12");
    if (!(config.dispositionApprovalRoles || ["Administrator", "Auditor"]).includes(role())) return alert(`The ${role()} role is not authorized to reject or revoke disposition.`);
    if (!item || !reviewer) return alert("Select a disposition request and enter the authorized reviewer.");
    decide(keys.dispositions, keys.dispositionLog, item, item.status === "Approved" ? "Revoked" : "Rejected", reviewer, readValue("dispositionBasisV12"));
    refreshDisposition();
  }

  function refreshDisposition() {
    const status = document.getElementById("dispositionStatusV12");
    const history = document.getElementById("dispositionHistoryV12");
    if (!status) return;
    const entry = selectedArchiveEntry();
    const item = latestDispositionApproval(entry);
    const valid = validDispositionApproval(entry);
    const held = Boolean(entry?.record?.retentionMetadata?.legalHold?.active);
    status.className = `approval-status-v12 ${valid && !held ? "is-approved-v12" : "is-blocked-v12"}`;
    status.textContent = !entry ? "No archived record is available."
      : held ? "A preservation hold is active. Permanent disposition remains blocked."
      : valid ? `Disposition approved by ${valid.reviewedBy}. Permanent deletion is enabled for this fingerprint.`
      : item?.status === "Approved" && item.recordFingerprint !== recordFingerprint(entry.record) ? "The archived record changed after approval. A new review is required."
      : `Disposition status: ${item?.status || "Not Requested"}. Permanent deletion remains blocked.`;
    if (history) history.innerHTML = renderHistory(item?.history || []);
  }

  function consumeDisposition(entry, approval) {
    const now = new Date().toISOString();
    const next = {
      ...approval,
      status: "Consumed",
      consumedAt: now,
      updatedAt: now,
      history: [...(approval.history || []), { action: "permanent-delete-completed", at: now, by: role(), note: "Archive entry removed after approved disposition." }]
    };
    upsert(keys.dispositions, next);
    logEvent(keys.dispositionLog, "permanent-delete-completed", next);
    refreshDispositionSources();
  }

  function selectDisposition(archiveId) {
    const select = document.getElementById("dispositionArchiveSourceV12");
    if (select) select.value = archiveId;
    refreshDisposition();
    document.getElementById("dispositionApprovalPanelV12")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function archiveEntryForCard(card) {
    if (!card) return null;
    const items = archivedEntries().slice().sort((a, b) => String(b.archivedAt || "").localeCompare(String(a.archivedAt || "")));
    if (card.dataset.archiveId) return items.find((entry) => entry.archiveId === card.dataset.archiveId) || null;
    const cards = Array.from(document.querySelectorAll("#archiveVaultListV08 .archived-record-v08"));
    return items[cards.indexOf(card)] || null;
  }

  function decide(storageKey, logKey, item, status, reviewer, note) {
    const now = new Date().toISOString();
    const next = {
      ...item,
      status,
      reviewedBy: reviewer,
      reviewedAt: now,
      note: note || item.note || item.basis || "",
      basis: note || item.basis || "",
      updatedAt: now,
      history: [...(item.history || []), { action: status.toLowerCase(), at: now, by: reviewer, note }]
    };
    upsert(storageKey, next);
    logEvent(logKey, status.toLowerCase(), next);
  }

  function renderExternalHtml(payload) {
    const record = payload.record || {};
    const approval = payload.approval || {};
    const section = (title, content) => content == null || content === "" || (Array.isArray(content) && !content.length)
      ? ""
      : `<section><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(typeof content === "string" ? content : JSON.stringify(content, null, 2))}</pre></section>`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(record.title || "Meeting Export")}</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:auto;padding:28px;color:#222}header{border-bottom:3px solid #111}section{border:1px solid #ddd;border-radius:8px;padding:16px;margin:16px 0}pre{white-space:pre-wrap;background:#f6f6f6;padding:12px}.approved{background:#eef8ef;border-color:#4f7f55}</style></head><body><header><p>Methodz Meeting Manager External Copy</p><h1>${escapeHtml(record.title || "Untitled Meeting")}</h1><p>Meeting #${escapeHtml(record.meetingNumber || "?")} • ${escapeHtml(record.date || "No date")}</p></header><section class="approved"><h2>Export Approval</h2><p><strong>${escapeHtml(approval.status || "Unknown")}</strong> • ${escapeHtml(approval.approvedBy || "")}</p><pre>${escapeHtml(JSON.stringify(approval, null, 2))}</pre></section>${section("Meeting Details", { status: record.status, location: record.location, facilitator: record.facilitator, organizations: record.organizations })}${section("Attendance", record.attendees)}${section("Agenda", record.agenda)}${section("Discussion Notes", record.notes)}${section("Decisions", record.decisionsList?.length ? record.decisionsList : record.decisions)}${section("Follow-Up Tasks", record.tasks)}${section("Attachment References", record.attachments)}${section("Meeting Summary", record.summary)}${section("Retention Summary", record.retentionMetadata)}</body></html>`;
  }

  function externalFilename(payload, extension) {
    const number = String(payload.manifest?.sourceReference?.meetingNumber || "meeting").replace(/[^a-z0-9_-]+/gi, "-");
    const profile = String(payload.manifest?.profile || "external").replace(/[^a-z0-9_-]+/gi, "-");
    return `methodz-${number}-${profile}-approved-${today()}.${extension}`;
  }

  function recordFingerprint(record) {
    const copy = clone(record || {});
    ["id", "createdAt", "updatedAt", "savedAt", "schemaAudit", "releaseMetadata", "approvalMetadata", "redactionMetadata", "adapterMetadata", "attachmentAdapterMetadata", "syncMetadata"].forEach((key) => delete copy[key]);
    if (copy.retentionMetadata) delete copy.retentionMetadata.updatedAt;
    const text = global.MethodzRedactionV11?.stableStringify?.(copy) || JSON.stringify(copy);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function renderHistory(items) {
    if (!items.length) return '<p class="helper-text">No approval history yet.</p>';
    return `<ol>${items.slice(-6).reverse().map((item) => `<li><strong>${escapeHtml(item.action)}</strong> • ${escapeHtml(item.by || "Unknown")} • ${escapeHtml(item.at || "")}${item.note ? `<br>${escapeHtml(item.note)}` : ""}</li>`).join("")}</ol>`;
  }

  function exportAudit(packageType, approvalKey, logKey, filenamePart) {
    const payload = {
      packageType,
      packageVersion: 1,
      generatedAt: new Date().toISOString(),
      approvals: readJson(approvalKey, []),
      events: readJson(logKey, [])
    };
    global.downloadBlob?.(JSON.stringify(payload, null, 2), `methodz-${filenamePart}-${today()}.json`, "application/json");
  }

  function refreshAll() {
    refreshDispositionSources();
    refreshExport();
  }

  function archivedEntries() {
    return readJson(keys.archive, []).filter((entry) => entry?.record);
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(global.localStorage.getItem(key)) ?? fallback;
    } catch (error) {
      return fallback;
    }
  }

  function upsert(key, item) {
    const items = readJson(key, []);
    const index = items.findIndex((value) => value.id === item.id);
    if (index >= 0) items[index] = clone(item);
    else items.push(clone(item));
    global.localStorage.setItem(key, JSON.stringify(items.slice(-500)));
  }

  function logEvent(key, action, details) {
    const items = readJson(key, []);
    items.push({ id: `${action}-${Date.now()}`, action, at: new Date().toISOString(), roleContext: role(), details: clone(details) });
    global.localStorage.setItem(key, JSON.stringify(items.slice(-1000)));
  }

  function readValue(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function sortNewest(a, b) {
    return String(b.updatedAt || b.requestedAt || "").localeCompare(String(a.updatedAt || a.requestedAt || ""));
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  global.requestExternalExportApprovalV12 = requestExportApproval;
  global.approveExternalExportV12 = approveExport;
  global.rejectExternalExportV12 = rejectExport;
  global.exportApprovalAuditV12 = () => exportAudit("methodz-external-export-approval-audit", keys.exports, keys.exportLog, "external-export-approval-audit");
  global.requestDispositionApprovalV12 = requestDispositionApproval;
  global.approveDispositionV12 = approveDisposition;
  global.rejectDispositionV12 = rejectDisposition;
  global.exportDispositionAuditV12 = () => exportAudit("methodz-disposition-approval-audit", keys.dispositions, keys.dispositionLog, "disposition-approval-audit");
  global.MethodzApprovalsV12 = {
    version: "1.2.0",
    currentExportContext: exportContext,
    latestExportApproval,
    findValidExportApproval: validExportApproval,
    latestDispositionApproval,
    findValidDispositionApproval: validDispositionApproval,
    recordFingerprint,
    refresh: refreshAll
  };
})(window);
