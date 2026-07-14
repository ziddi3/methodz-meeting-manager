/* Methodz Meeting Manager v1.2 external export approval and reviewer sign-off. */
(function initializeMethodzExportApprovalV12(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const approvalConfig = config.externalExportApproval || {};
  const approvalKey = config.storageKeys?.externalExportApprovals || "methodzExternalExportApprovals";
  const logKey = config.storageKeys?.externalExportApprovalLog || "methodzExternalExportApprovalLog";
  const recordKey = config.storageKeys?.records || "methodzMeetingRecords";
  let selectedApprovalId = "";

  global.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    installPanel();
    patchMeetingCollection();
    patchExternalDownloads();
    bindContextListeners();
    renderApprovalRequests();
  }

  function destinations() {
    return Array.isArray(approvalConfig.destinations) && approvalConfig.destinations.length
      ? approvalConfig.destinations
      : [{
          id: "other-external",
          label: "Other External Recipient",
          allowedProfiles: ["partner-safe", "public-summary"],
          allowedCustomSections: [],
          note: "Manual recipient verification required."
        }];
  }

  function installPanel() {
    const externalPanel = document.getElementById("externalExportPanelV11");
    const savedCard = document.getElementById("savedRecords")?.closest(".card");
    const anchor = externalPanel || savedCard;
    if (!anchor || document.getElementById("externalApprovalPanelV12")) return;

    const panel = document.createElement("section");
    panel.id = "externalApprovalPanelV12";
    panel.className = "card v12-card external-approval-v12";
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>External Export Approval</h2>
          <p class="helper-text">Approve the exact redacted content fingerprint before downloading an external copy. Approval is browser-local workflow metadata, not identity authentication or a legal signature.</p>
        </div>
        <span class="release-badge-v12">v1.2</span>
      </div>

      <div class="approval-context-v12" id="approvalContextV12" aria-live="polite">Preview an external copy above to establish the approval context.</div>

      <div class="form-grid approval-grid-v12">
        <div>
          <label for="externalDestinationV12">Intended Destination</label>
          <select id="externalDestinationV12">${destinations().map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join("")}</select>
          <p id="externalDestinationHelpV12" class="helper-text"></p>
        </div>
        <div>
          <label for="approvalExpiryV12">Approval Expires</label>
          <input id="approvalExpiryV12" type="date" />
        </div>
        <div>
          <label for="approvalRequestedByV12">Requested By</label>
          <input id="approvalRequestedByV12" type="text" autocomplete="name" placeholder="Person preparing the external copy" />
        </div>
        <div>
          <label for="approvalReviewedByV12">Reviewed By</label>
          <input id="approvalReviewedByV12" type="text" autocomplete="name" placeholder="Person approving or rejecting release" />
        </div>
      </div>

      <label for="approvalPurposeV12">Release Purpose / Intended Use</label>
      <input id="approvalPurposeV12" type="text" placeholder="Why this copy is being shared and with whom" />

      <label for="approvalReviewNoteV12">Reviewer Note</label>
      <textarea id="approvalReviewNoteV12" class="compact-textarea-v12" placeholder="Approval conditions, rejection reason, or verification note"></textarea>

      <div class="button-row">
        <button type="button" onclick="requestExternalApprovalV12()">Request Approval</button>
        <button type="button" onclick="approveExternalRequestV12()">Approve Selected</button>
        <button type="button" onclick="rejectExternalRequestV12()">Reject Selected</button>
        <button type="button" onclick="revokeExternalApprovalV12()">Revoke Selected</button>
      </div>

      <div class="form-grid approval-release-grid-v12">
        <div>
          <label for="approvalRequestSelectV12">Approval Request</label>
          <select id="approvalRequestSelectV12"><option value="">No approval requests yet</option></select>
        </div>
        <div class="button-row approval-downloads-v12">
          <button type="button" onclick="downloadApprovedExternalV12('json')">Download Approved JSON</button>
          <button type="button" onclick="downloadApprovedExternalV12('html')">Download Approved HTML</button>
          <button type="button" onclick="exportApprovalLogV12()">Export Approval Audit</button>
        </div>
      </div>

      <div id="approvalStatusV12" class="approval-status-v12" aria-live="polite">No approval request selected.</div>
      <div id="approvalRequestListV12" class="approval-list-v12"></div>
    `;

    anchor.insertAdjacentElement("afterend", panel);

    const expiry = document.getElementById("approvalExpiryV12");
    if (expiry) expiry.value = defaultExpiryDate();
    document.getElementById("externalDestinationV12")?.addEventListener("change", () => {
      updateDestinationHelp();
      updateContextStatus();
    });
    document.getElementById("approvalRequestSelectV12")?.addEventListener("change", (event) => {
      selectedApprovalId = event.target.value;
      applyRequestContext(selectedApproval());
      renderApprovalRequests();
    });
    updateDestinationHelp();
  }

  function patchMeetingCollection() {
    if (global.__methodzV12CollectionPatched || typeof global.collectMeetingData !== "function") return;
    const original = global.collectMeetingData;
    global.collectMeetingData = function collectMeetingDataV12(...args) {
      const record = original.apply(this, args);
      const editingId = String(document.getElementById("editingRecordId")?.value || "");
      const existing = editingId && typeof global.getRecords === "function"
        ? global.getRecords().find((item) => item.id === editingId)
        : null;
      const previous = existing?.externalReleaseControl || record.externalReleaseControl || {};
      return {
        ...record,
        externalReleaseControl: {
          approvalRequired: previous.approvalRequired !== false,
          defaultDestinationPolicyId: readValue("externalDestinationV12") || previous.defaultDestinationPolicyId || "other-external",
          lastApprovalId: previous.lastApprovalId || "",
          lastApprovedAt: previous.lastApprovedAt || "",
          lastExportAt: previous.lastExportAt || ""
        }
      };
    };
    global.__methodzV12CollectionPatched = true;
  }

  function patchExternalDownloads() {
    if (global.__methodzV12DownloadGatePatched) return;
    global.downloadExternalJsonV11 = () => downloadApprovedExternal("json");
    global.downloadExternalHtmlV11 = () => downloadApprovedExternal("html");
    global.__methodzV12DownloadGatePatched = true;
  }

  function bindContextListeners() {
    [
      "externalRecordSourceV11",
      "externalProfileV11",
      "externalIncludeAttendeesV11",
      "externalIncludeAgendaV11",
      "externalIncludeNotesV11",
      "externalIncludeDecisionsV11",
      "externalIncludeTasksV11",
      "externalIncludeAttachmentsV11",
      "externalIncludeRetentionV11"
    ].forEach((id) => {
      document.getElementById(id)?.addEventListener("change", updateContextStatus);
    });
  }

  function updateDestinationHelp() {
    const policy = selectedDestination();
    const element = document.getElementById("externalDestinationHelpV12");
    if (element) element.textContent = policy?.note || "Choose the destination policy for this external copy.";
  }

  function updateContextStatus() {
    const element = document.getElementById("approvalContextV12");
    if (!element) return;
    const source = selectedText("externalRecordSourceV11") || "Current Meeting Form";
    const profile = selectedText("externalProfileV11") || "Partner Safe";
    const destination = selectedDestination()?.label || "Other External Recipient";
    element.textContent = `${source} • ${profile} • Destination: ${destination}. A new fingerprint check will run before approval or download.`;
  }

  function selectedDestination() {
    const id = readValue("externalDestinationV12") || "other-external";
    return destinations().find((item) => item.id === id) || destinations()[0];
  }

  function selectedCustomSections() {
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

  function validateDestinationPolicy(profileId, destination = selectedDestination(), sections = selectedCustomSections()) {
    const errors = [];
    if (!destination) errors.push("Destination policy is unavailable.");
    if (destination && !destination.allowedProfiles?.includes(profileId)) {
      errors.push(`${destination.label} does not allow the ${profileId} redaction profile.`);
    }
    if (profileId === "custom" && destination) {
      const allowed = new Set(destination.allowedCustomSections || []);
      Object.entries(sections).forEach(([section, included]) => {
        if (included && !allowed.has(section)) errors.push(`${destination.label} does not allow the custom section: ${section}.`);
      });
    }
    return { valid: errors.length === 0, errors };
  }

  async function buildContext() {
    if (!global.MethodzRedactionV11 || typeof global.previewExternalExportV11 !== "function") {
      throw new Error("Partner-safe export services are unavailable.");
    }
    const payload = await global.previewExternalExportV11();
    if (!payload) throw new Error("Unable to prepare the selected external copy.");
    const destination = selectedDestination();
    const profileId = payload.manifest?.profile || readValue("externalProfileV11") || "partner-safe";
    const policy = validateDestinationPolicy(profileId, destination);
    if (!policy.valid) throw new Error(policy.errors.join(" "));
    const contentFingerprint = await computeContentFingerprint(payload, destination.id);
    return { payload, destination, profileId, contentFingerprint };
  }

  async function computeContentFingerprint(payload, destinationPolicyId) {
    return global.MethodzRedactionV11.computeIntegrity({
      fingerprintType: "methodz-external-content-v1",
      destinationPolicyId,
      profile: payload.manifest?.profile || "",
      record: payload.record || {}
    });
  }

  async function requestExternalApproval() {
    setStatus("Preparing approval request...", "working");
    try {
      const requestedBy = readValue("approvalRequestedByV12");
      const purpose = readValue("approvalPurposeV12");
      if (!requestedBy) throw new Error("Enter the person requesting approval.");
      if (!purpose) throw new Error("Enter the release purpose or intended use.");

      const context = await buildContext();
      const request = {
        id: `external-approval-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        status: "Pending",
        destinationPolicyId: context.destination.id,
        destinationLabel: context.destination.label,
        profile: context.profileId,
        profileLabel: context.payload.manifest?.profileLabel || context.profileId,
        sourceType: context.payload.sourceType || "current",
        sourceSelector: readValue("externalRecordSourceV11") || "current",
        sourceReference: {
          ...clone(context.payload.manifest?.sourceReference || {}),
          id: sourceRecordId(readValue("externalRecordSourceV11"))
        },
        customSections: context.profileId === "custom" ? selectedCustomSections() : {},
        requestedBy,
        requestedAt: new Date().toISOString(),
        purpose,
        expiresAt: dateToEndOfDay(readValue("approvalExpiryV12") || defaultExpiryDate()),
        reviewedBy: "",
        reviewedAt: "",
        reviewNote: "",
        contentFingerprint: context.contentFingerprint,
        manifestSummary: {
          removedPathCount: context.payload.manifest?.removedPaths?.length || 0,
          warningCount: context.payload.manifest?.warnings?.length || 0,
          signatureDataIncluded: Boolean(context.payload.manifest?.signatureDataIncluded)
        },
        releaseHistory: []
      };

      const approvals = readApprovals();
      approvals.push(request);
      writeApprovals(approvals);
      selectedApprovalId = request.id;
      appendAudit("approval-requested", request, { actor: requestedBy });
      renderApprovalRequests();
      setStatus(`Approval requested for ${request.destinationLabel}. Fingerprint: ${shortDigest(request.contentFingerprint?.digest)}.`, "ready");
      return request;
    } catch (error) {
      return handleError(error);
    }
  }

  async function approveSelectedRequest() {
    return reviewSelected("Approved");
  }

  async function rejectSelectedRequest() {
    return reviewSelected("Rejected");
  }

  async function reviewSelected(status) {
    setStatus(`${status === "Approved" ? "Approving" : "Rejecting"} request...`, "working");
    try {
      const reviewer = readValue("approvalReviewedByV12");
      if (!reviewer) throw new Error("Enter the person reviewing this request.");
      const request = selectedApproval();
      if (!request) throw new Error("Select an approval request.");
      if (request.status !== "Pending") throw new Error("Only pending requests can be reviewed.");

      if (status === "Approved") {
        const context = await buildContext();
        assertRequestMatchesContext(request, context);
      }

      request.status = status;
      request.reviewedBy = reviewer;
      request.reviewedAt = new Date().toISOString();
      request.reviewNote = readValue("approvalReviewNoteV12");
      replaceApproval(request);
      appendAudit(status === "Approved" ? "approval-approved" : "approval-rejected", request, { actor: reviewer, note: request.reviewNote });
      renderApprovalRequests();
      setStatus(`${request.profileLabel} request ${status.toLowerCase()} by ${reviewer}.`, status === "Approved" ? "ready" : "warning");
      return request;
    } catch (error) {
      return handleError(error);
    }
  }

  function revokeSelectedApproval() {
    try {
      const reviewer = readValue("approvalReviewedByV12");
      if (!reviewer) throw new Error("Enter the person revoking this approval.");
      const request = selectedApproval();
      if (!request) throw new Error("Select an approval request.");
      if (request.status !== "Approved") throw new Error("Only approved requests can be revoked.");
      request.status = "Revoked";
      request.revokedBy = reviewer;
      request.revokedAt = new Date().toISOString();
      request.revocationNote = readValue("approvalReviewNoteV12");
      replaceApproval(request);
      appendAudit("approval-revoked", request, { actor: reviewer, note: request.revocationNote });
      renderApprovalRequests();
      setStatus(`Approval revoked by ${reviewer}.`, "warning");
      return request;
    } catch (error) {
      return handleError(error);
    }
  }

  async function downloadApprovedExternal(format) {
    setStatus(`Validating approved ${String(format).toUpperCase()} release...`, "working");
    try {
      const context = await buildContext();
      const approval = findValidApproval(context);
      if (!approval) {
        throw new Error("No current approved request matches this destination, profile, and redacted content fingerprint. Request and approve this exact copy first.");
      }

      const unsigned = {
        ...clone(context.payload),
        packageType: "methodz-approved-external-meeting-copy",
        packageVersion: 2,
        exportedAt: new Date().toISOString(),
        approval: approvalManifest(approval)
      };
      delete unsigned.integrity;
      const integrity = await global.MethodzRedactionV11.computeIntegrity(unsigned);
      const approvedPackage = { ...unsigned, integrity };

      if (format === "html") {
        global.downloadBlob(renderApprovedHtml(approvedPackage), filenameFor(approvedPackage, "html"), "text/html");
      } else {
        global.downloadBlob(JSON.stringify(approvedPackage, null, 2), filenameFor(approvedPackage, "json"), "application/json");
      }

      const releaseEvent = {
        releasedAt: new Date().toISOString(),
        format,
        packageIntegrity: integrity,
        destinationPolicyId: approval.destinationPolicyId
      };
      approval.releaseHistory = [...(approval.releaseHistory || []), releaseEvent].slice(-100);
      replaceApproval(approval);
      updateSourceReleaseMetadata(approval, releaseEvent.releasedAt);
      appendAudit("approved-copy-downloaded", approval, {
        actor: approval.reviewedBy,
        format,
        packageIntegrity: integrity
      });
      renderApprovalRequests();
      setStatus(`Approved ${String(format).toUpperCase()} downloaded for ${approval.destinationLabel}. Approval ${approval.id}.`, "ready");
      return approvedPackage;
    } catch (error) {
      return handleError(error);
    }
  }

  function assertRequestMatchesContext(request, context) {
    if (request.destinationPolicyId !== context.destination.id) throw new Error("The selected destination does not match this request.");
    if (request.profile !== context.profileId) throw new Error("The selected redaction profile does not match this request.");
    if (request.contentFingerprint?.digest !== context.contentFingerprint?.digest) {
      throw new Error("The redacted content changed after the request was created. Create a new approval request for the current content.");
    }
  }

  function findValidApproval(context) {
    const now = Date.now();
    return readApprovals()
      .filter((item) => item.status === "Approved")
      .filter((item) => item.destinationPolicyId === context.destination.id)
      .filter((item) => item.profile === context.profileId)
      .filter((item) => item.contentFingerprint?.digest === context.contentFingerprint?.digest)
      .filter((item) => !item.expiresAt || Date.parse(item.expiresAt) >= now)
      .sort((left, right) => Date.parse(right.reviewedAt || 0) - Date.parse(left.reviewedAt || 0))[0] || null;
  }

  function approvalManifest(approval) {
    return {
      approvalId: approval.id,
      status: approval.status,
      destinationPolicyId: approval.destinationPolicyId,
      destinationLabel: approval.destinationLabel,
      requestedBy: approval.requestedBy,
      requestedAt: approval.requestedAt,
      approvedBy: approval.reviewedBy,
      approvedAt: approval.reviewedAt,
      expiresAt: approval.expiresAt,
      purpose: approval.purpose,
      reviewNote: approval.reviewNote,
      contentFingerprint: clone(approval.contentFingerprint),
      notice: "Browser-local workflow approval. This metadata does not authenticate identity or replace legal signing requirements."
    };
  }

  function updateSourceReleaseMetadata(approval, exportedAt) {
    const sourceId = approval.sourceReference?.id || "";
    if (!sourceId) return;
    const records = readJson(recordKey, []);
    const index = records.findIndex((record) => record?.id === sourceId);
    if (index < 0) return;
    records[index] = {
      ...records[index],
      externalReleaseControl: {
        ...(records[index].externalReleaseControl || {}),
        approvalRequired: true,
        defaultDestinationPolicyId: approval.destinationPolicyId,
        lastApprovalId: approval.id,
        lastApprovedAt: approval.reviewedAt,
        lastExportAt: exportedAt
      }
    };
    global.localStorage.setItem(recordKey, JSON.stringify(records));
    if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
  }

  function renderApprovalRequests() {
    const approvals = readApprovals().sort((left, right) => Date.parse(right.requestedAt || 0) - Date.parse(left.requestedAt || 0));
    const select = document.getElementById("approvalRequestSelectV12");
    if (select) {
      const current = selectedApprovalId || select.value;
      select.innerHTML = approvals.length
        ? approvals.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.status)} • ${escapeHtml(item.destinationLabel)} • ${escapeHtml(item.sourceReference?.title || "Untitled Meeting")}</option>`).join("")
        : '<option value="">No approval requests yet</option>';
      if (approvals.some((item) => item.id === current)) select.value = current;
      selectedApprovalId = select.value;
    }

    const list = document.getElementById("approvalRequestListV12");
    if (!list) return;
    if (!approvals.length) {
      list.innerHTML = '<p class="helper-text">No external export approval requests have been created.</p>';
      return;
    }

    list.innerHTML = approvals.slice(0, 25).map((item) => {
      const selected = item.id === selectedApprovalId ? " selected-approval-v12" : "";
      const expired = item.expiresAt && Date.parse(item.expiresAt) < Date.now();
      return `<article class="approval-card-v12${selected}" data-status="${escapeHtml(item.status.toLowerCase())}">
        <div class="approval-card-heading-v12">
          <strong>${escapeHtml(item.sourceReference?.title || "Untitled Meeting")}</strong>
          <span class="approval-state-v12">${escapeHtml(expired && item.status === "Approved" ? "Approved • Expired" : item.status)}</span>
        </div>
        <p>${escapeHtml(item.destinationLabel)} • ${escapeHtml(item.profileLabel)} • #${escapeHtml(item.sourceReference?.meetingNumber || "?")}</p>
        <dl>
          <dt>Requested</dt><dd>${escapeHtml(formatDateTime(item.requestedAt))} by ${escapeHtml(item.requestedBy)}</dd>
          <dt>Reviewed</dt><dd>${escapeHtml(item.reviewedAt ? `${formatDateTime(item.reviewedAt)} by ${item.reviewedBy}` : "Pending")}</dd>
          <dt>Expires</dt><dd>${escapeHtml(item.expiresAt ? formatDateTime(item.expiresAt) : "No expiry")}</dd>
          <dt>Fingerprint</dt><dd><code>${escapeHtml(shortDigest(item.contentFingerprint?.digest))}</code></dd>
          <dt>Releases</dt><dd>${escapeHtml(String(item.releaseHistory?.length || 0))}</dd>
        </dl>
        <button type="button" data-approval-id="${escapeHtml(item.id)}">Select</button>
      </article>`;
    }).join("");

    list.querySelectorAll("button[data-approval-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedApprovalId = button.dataset.approvalId || "";
        if (select) select.value = selectedApprovalId;
        applyRequestContext(selectedApproval());
        renderApprovalRequests();
        const selected = selectedApproval();
        if (selected) setStatus(`${selected.status} request selected for ${selected.destinationLabel}.`, "ready");
      });
    });
  }

  function applyRequestContext(request) {
    if (!request) return;
    const source = document.getElementById("externalRecordSourceV11");
    if (source && Array.from(source.options).some((option) => option.value === request.sourceSelector)) {
      source.value = request.sourceSelector;
      source.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const profile = document.getElementById("externalProfileV11");
    if (profile && Array.from(profile.options).some((option) => option.value === request.profile)) {
      profile.value = request.profile;
      profile.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const destination = document.getElementById("externalDestinationV12");
    if (destination && Array.from(destination.options).some((option) => option.value === request.destinationPolicyId)) {
      destination.value = request.destinationPolicyId;
      destination.dispatchEvent(new Event("change", { bubbles: true }));
    }
    if (request.profile === "custom") {
      const controls = {
        attendees: "externalIncludeAttendeesV11",
        agenda: "externalIncludeAgendaV11",
        notes: "externalIncludeNotesV11",
        decisions: "externalIncludeDecisionsV11",
        tasks: "externalIncludeTasksV11",
        attachments: "externalIncludeAttachmentsV11",
        retention: "externalIncludeRetentionV11"
      };
      Object.entries(controls).forEach(([section, id]) => {
        const input = document.getElementById(id);
        if (input) input.checked = Boolean(request.customSections?.[section]);
      });
    }
    updateContextStatus();
  }

  function sourceRecordId(selector) {
    const value = String(selector || "");
    if (value.startsWith("active:")) return value.slice("active:".length);
    if (value.startsWith("archived:")) return value.slice("archived:".length);
    return "";
  }

  function selectedApproval() {
    const id = selectedApprovalId || readValue("approvalRequestSelectV12");
    return readApprovals().find((item) => item.id === id) || null;
  }

  function replaceApproval(updated) {
    const approvals = readApprovals();
    const index = approvals.findIndex((item) => item.id === updated.id);
    if (index < 0) throw new Error("Approval request is no longer available.");
    approvals[index] = updated;
    writeApprovals(approvals);
  }

  function readApprovals() {
    return readJson(approvalKey, []).filter((item) => item && typeof item === "object");
  }

  function writeApprovals(approvals) {
    global.localStorage.setItem(approvalKey, JSON.stringify(approvals.slice(-500)));
  }

  function appendAudit(action, approval, details = {}) {
    const log = readJson(logKey, []);
    log.push({
      id: `approval-audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      occurredAt: new Date().toISOString(),
      approvalId: approval?.id || "",
      sourceReference: clone(approval?.sourceReference || {}),
      destinationPolicyId: approval?.destinationPolicyId || "",
      profile: approval?.profile || "",
      ...clone(details)
    });
    global.localStorage.setItem(logKey, JSON.stringify(log.slice(-1000)));
  }

  function exportApprovalLog() {
    const approvals = readApprovals();
    const events = readJson(logKey, []);
    const payload = {
      packageType: "methodz-external-export-approval-audit",
      packageVersion: 1,
      generatedAt: new Date().toISOString(),
      notice: "Browser-local workflow history. This is not an immutable or authenticated audit ledger.",
      approvalCount: approvals.length,
      eventCount: events.length,
      approvals,
      events
    };
    global.downloadBlob(JSON.stringify(payload, null, 2), `methodz-external-approval-audit-${today()}.json`, "application/json");
    setStatus("External export approval audit downloaded.", "ready");
  }

  function renderApprovedHtml(payload) {
    const record = payload.record || {};
    const manifest = payload.manifest || {};
    const approval = payload.approval || {};
    const section = (title, content) => content == null || content === "" || (Array.isArray(content) && !content.length)
      ? ""
      : `<section><h2>${escapeHtml(title)}</h2><pre>${escapeHtml(typeof content === "string" ? content : JSON.stringify(content, null, 2))}</pre></section>`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(record.title || "Approved Meeting Export")}</title><style>body{font-family:Arial,sans-serif;max-width:920px;margin:0 auto;padding:28px;color:#222}header{border-bottom:3px solid #111;margin-bottom:24px}section{border:1px solid #ddd;border-radius:8px;padding:16px;margin:16px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f6f6f6;padding:12px;border-radius:6px}.notice{background:#eef8ef;border-color:#56855c}dl{display:grid;grid-template-columns:max-content 1fr;gap:8px 16px}dt{font-weight:700}code{overflow-wrap:anywhere}@media print{body{padding:0}section{break-inside:avoid}}</style></head><body><header><p>Methodz Meeting Manager Approved External Copy</p><h1>${escapeHtml(record.title || "Untitled Meeting")}</h1><p>Meeting #${escapeHtml(record.meetingNumber || "?")} • ${escapeHtml(record.date || "No date")} • ${escapeHtml(manifest.profileLabel || manifest.profile || "Redacted")}</p></header><section class="notice"><h2>Release Approval</h2><dl><dt>Destination</dt><dd>${escapeHtml(approval.destinationLabel || "")}</dd><dt>Approved by</dt><dd>${escapeHtml(approval.approvedBy || "")}</dd><dt>Approved at</dt><dd>${escapeHtml(approval.approvedAt || "")}</dd><dt>Expires</dt><dd>${escapeHtml(approval.expiresAt || "")}</dd><dt>Purpose</dt><dd>${escapeHtml(approval.purpose || "")}</dd><dt>Approval ID</dt><dd>${escapeHtml(approval.approvalId || "")}</dd><dt>Package integrity</dt><dd><code>${escapeHtml(payload.integrity?.algorithm || "")}: ${escapeHtml(payload.integrity?.digest || "")}</code></dd></dl><p>${escapeHtml(approval.notice || "")}</p></section>${section("Meeting Details", { status: record.status, location: record.location, facilitator: record.facilitator, organizations: record.organizations })}${section("Attendance", record.attendees)}${section("Agenda", record.agenda)}${section("Discussion Notes", record.notes)}${section("Decisions", record.decisionsList?.length ? record.decisionsList : record.decisions)}${section("Follow-Up Tasks", record.tasks)}${section("Attachment References", record.attachments)}${section("Meeting Summary", record.summary)}${section("Retention Summary", record.retentionMetadata)}</body></html>`;
  }

  function filenameFor(payload, extension) {
    const number = String(payload.manifest?.sourceReference?.meetingNumber || "meeting").replace(/[^a-z0-9_-]+/gi, "-");
    const destination = String(payload.approval?.destinationPolicyId || "external").replace(/[^a-z0-9_-]+/gi, "-");
    return `methodz-${number}-${destination}-approved-${today()}.${extension}`;
  }

  function defaultExpiryDate() {
    const date = new Date();
    date.setDate(date.getDate() + Number(approvalConfig.defaultExpiryDays || 30));
    return date.toISOString().slice(0, 10);
  }

  function dateToEndOfDay(dateText) {
    if (!dateText) return "";
    const date = new Date(`${dateText}T23:59:59.999`);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(global.localStorage.getItem(key));
      return value ?? fallback;
    } catch (error) {
      console.warn(`Unable to read ${key}`, error);
      return fallback;
    }
  }

  function readValue(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function selectedText(id) {
    const select = document.getElementById(id);
    return select?.selectedOptions?.[0]?.textContent?.trim() || "";
  }

  function checked(id) {
    return Boolean(document.getElementById(id)?.checked);
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function shortDigest(value) {
    const digest = String(value || "");
    return digest.length > 20 ? `${digest.slice(0, 12)}…${digest.slice(-8)}` : digest || "unavailable";
  }

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  function setStatus(message, state) {
    const element = document.getElementById("approvalStatusV12");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state || "";
  }

  function handleError(error) {
    const message = error?.message || String(error);
    setStatus(message, "error");
    alert(message);
    return null;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  global.requestExternalApprovalV12 = requestExternalApproval;
  global.approveExternalRequestV12 = approveSelectedRequest;
  global.rejectExternalRequestV12 = rejectSelectedRequest;
  global.revokeExternalApprovalV12 = revokeSelectedApproval;
  global.downloadApprovedExternalV12 = downloadApprovedExternal;
  global.exportApprovalLogV12 = exportApprovalLog;
  global.MethodzExportApprovalV12 = {
    version: "1.2.0",
    readApprovals,
    validateDestinationPolicy,
    computeContentFingerprint,
    findValidApproval,
    approvalManifest
  };
})(window);
