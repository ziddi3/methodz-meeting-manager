/* Methodz Meeting Manager v1.3 record lifecycle approval and preservation-event governance. */
(function initializeMethodzDispositionV13(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.dispositionApproval || {};
  const storage = config.storageKeys || {};
  const keys = {
    records: storage.records || "methodzMeetingRecords",
    archive: storage.archivedRecords || "methodzArchivedMeetingRecords",
    revisions: storage.revisions || "methodzMeetingRevisions",
    approvals: storage.dispositionApprovals || "methodzDispositionApprovals",
    audit: storage.dispositionAuditLog || "methodzDispositionAuditLog",
    chain: storage.preservationEventChain || "methodzPreservationEventChain"
  };
  let selectedApprovalId = "";

  global.addEventListener("DOMContentLoaded", initialize);
  global.addEventListener("methodz:role-context-changed", refreshAll);

  function initialize() {
    installDispositionPanel();
    installPreservationAuditPanel();
    patchMeetingCollection();
    patchSaveWorkflow();
    patchArchiveWorkflow();
    renderDispositionSources();
    renderApprovals();
    renderEventChain();
  }

  function currentRole() {
    return global.MethodzGovernanceV10?.getCurrentRole?.() || "Administrator";
  }

  function approvalRoles() {
    return Array.isArray(settings.approvalRoles) && settings.approvalRoles.length ? settings.approvalRoles : ["Administrator", "Auditor"];
  }

  function installDispositionPanel() {
    const vault = document.getElementById("archiveVaultV08");
    const savedCard = document.getElementById("savedRecords")?.closest(".card");
    const anchor = vault || savedCard;
    if (!anchor || document.getElementById("dispositionPanelV13")) return;

    const panel = document.createElement("section");
    panel.id = "dispositionPanelV13";
    panel.className = "card v13-card";
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Permanent Disposition Approval</h2>
          <p class="helper-text">Permanent archive removal requires a documented request, a separate authorized reviewer, a matching archived-record fingerprint, and no active preservation hold.</p>
        </div>
        <span class="release-badge-v13">v1.3</span>
      </div>
      <div class="form-grid">
        <div><label for="dispositionArchiveSourceV13">Archived Record</label><select id="dispositionArchiveSourceV13"></select></div>
        <div><label for="dispositionDecisionDateV13">Decision Date</label><input id="dispositionDecisionDateV13" type="date"></div>
        <div><label for="dispositionRequestedByV13">Requested By</label><input id="dispositionRequestedByV13" type="text" autocomplete="name" placeholder="Person requesting disposition"></div>
        <div><label for="dispositionReviewedByV13">Reviewed By</label><input id="dispositionReviewedByV13" type="text" autocomplete="name" placeholder="Authorized reviewer"></div>
      </div>
      <label for="dispositionBasisV13">Disposition Basis</label>
      <textarea id="dispositionBasisV13" placeholder="Retention review outcome, policy authority, supporting evidence, and required conditions..."></textarea>
      <label for="dispositionReviewNoteV13">Reviewer Note</label>
      <textarea id="dispositionReviewNoteV13" placeholder="Approval conditions, rejection reason, revocation reason, or verification note..."></textarea>
      <div class="button-row">
        <button type="button" onclick="requestDispositionApprovalV13()">Request Disposition Review</button>
        <button type="button" onclick="approveDispositionV13()">Approve Selected</button>
        <button type="button" onclick="rejectDispositionV13()">Reject Selected</button>
        <button type="button" onclick="revokeDispositionV13()">Revoke Selected</button>
        <button type="button" onclick="exportDispositionAuditV13()">Export Disposition Audit</button>
      </div>
      <div class="form-grid">
        <div><label for="dispositionRequestSelectV13">Disposition Request</label><select id="dispositionRequestSelectV13"><option value="">No requests yet</option></select></div>
      </div>
      <div id="dispositionStatusV13" class="disposition-status-v13" aria-live="polite">No archived record selected.</div>
      <div id="dispositionRequestListV13" class="disposition-list-v13"></div>
    `;
    anchor.insertAdjacentElement("beforebegin", panel);
    document.getElementById("dispositionDecisionDateV13").value = today();
    document.getElementById("dispositionArchiveSourceV13")?.addEventListener("change", refreshDispositionStatus);
    document.getElementById("dispositionRequestSelectV13")?.addEventListener("change", (event) => {
      selectedApprovalId = event.target.value;
      applyApprovalContext(selectedApproval());
      renderApprovals();
    });
  }

  function installPreservationAuditPanel() {
    const panel = document.getElementById("dispositionPanelV13");
    if (!panel || document.getElementById("preservationAuditPanelV13")) return;
    const audit = document.createElement("section");
    audit.id = "preservationAuditPanelV13";
    audit.className = "card v13-card";
    audit.innerHTML = `
      <div class="section-subheader"><div><h2>Preservation & Disposition Event Chain</h2><p class="helper-text">A browser-local hash chain records hold transitions and disposition decisions. It can reveal local edits, but it is not immutable, authenticated, or a substitute for a server audit ledger.</p></div><span class="release-badge-v13">v1.3</span></div>
      <div class="button-row"><button type="button" onclick="verifyPreservationChainV13()">Verify Event Chain</button><button type="button" onclick="exportPreservationChainV13()">Export Event Chain</button></div>
      <div id="preservationChainStatusV13" class="chain-status-v13" aria-live="polite"></div>
      <div id="preservationEventListV13" class="event-chain-v13"></div>
    `;
    panel.insertAdjacentElement("afterend", audit);
  }

  function patchMeetingCollection() {
    if (global.__methodzV13CollectionPatched || typeof global.collectMeetingData !== "function") return;
    const original = global.collectMeetingData;
    global.collectMeetingData = function collectMeetingDataV13(...args) {
      const record = original.apply(this, args);
      const editingId = String(document.getElementById("editingRecordId")?.value || "");
      const existing = editingId && typeof global.getRecords === "function" ? global.getRecords().find((item) => item.id === editingId) : null;
      const previous = existing?.dispositionControl || record.dispositionControl || {};
      record.dispositionControl = {
        approvalRequired: previous.approvalRequired !== false,
        lastRequestId: previous.lastRequestId || "",
        lastApprovedAt: previous.lastApprovedAt || "",
        lastDispositionAt: previous.lastDispositionAt || "",
        preservationEventHead: latestEventDigest(record.id) || previous.preservationEventHead || ""
      };
      record.schemaVersion = config.schemaVersion || "1.3.0";
      record.releaseMetadata = { ...(record.releaseMetadata || {}), release: "1.3.0", appShellVersion: config.appShellVersion || "1.3.0" };
      if (global.MethodzReleaseV10?.validateRecord) record.schemaAudit = global.MethodzReleaseV10.validateRecord(record);
      return record;
    };
    global.__methodzV13CollectionPatched = true;
  }

  function patchSaveWorkflow() {
    if (global.__methodzV13SavePatched || typeof global.saveMeeting !== "function") return;
    const original = global.saveMeeting;
    global.saveMeeting = function saveMeetingV13(...args) {
      const beforeId = document.getElementById("editingRecordId")?.value || "";
      const before = beforeId && typeof global.getRecords === "function" ? clone(global.getRecords().find((item) => item.id === beforeId)) : null;
      const result = original.apply(this, args);
      const afterId = document.getElementById("editingRecordId")?.value || beforeId;
      const after = afterId && typeof global.getRecords === "function" ? global.getRecords().find((item) => item.id === afterId) : null;
      if (!after) return result;

      const wasHeld = Boolean(before?.retentionMetadata?.legalHold?.active);
      const isHeld = Boolean(after.retentionMetadata?.legalHold?.active);
      if (wasHeld !== isHeld) {
        const hold = after.retentionMetadata?.legalHold || {};
        appendEvent(isHeld ? "legal-hold-placed" : "legal-hold-released", {
          record: after,
          actor: isHeld ? hold.placedBy : hold.releasedBy,
          note: isHeld ? hold.reason : hold.releaseNote,
          details: { placedAt: hold.placedAt || "", releasedAt: hold.releasedAt || "" }
        });
        updateRecordEventHead(after.id);
      }
      refreshAll();
      return result;
    };
    global.__methodzV13SavePatched = true;
  }

  function patchArchiveWorkflow() {
    const list = document.getElementById("archiveVaultListV08");
    if (!list || global.__methodzV13ArchiveGatePatched) return;

    list.addEventListener("click", (event) => {
      const button = event.target.closest('button[data-action="delete"]');
      if (!button) return;
      const entry = archiveEntryForCard(button.closest(".archived-record-v08"));
      if (!entry) return;
      if (entry.record?.retentionMetadata?.legalHold?.active) return;
      const approval = findValidDispositionApproval(entry);
      if (!approval) {
        event.preventDefault();
        event.stopImmediatePropagation();
        alert("Permanent archive removal is blocked until an authorized disposition approval matches this archived-record fingerprint.");
        selectArchive(entry.archiveId);
        return;
      }
      const archiveId = entry.archiveId;
      global.setTimeout(() => {
        if (!readArchived().some((item) => item.archiveId === archiveId)) consumeApproval(entry, approval);
      }, 0);
    }, true);

    if (typeof global.renderArchiveVaultV08 === "function") {
      const original = global.renderArchiveVaultV08;
      global.renderArchiveVaultV08 = function renderArchiveVaultV13(...args) {
        const result = original.apply(this, args);
        global.setTimeout(() => {
          decorateArchiveCards();
          renderDispositionSources();
        }, 0);
        return result;
      };
    }
    new MutationObserver(() => global.setTimeout(() => { decorateArchiveCards(); renderDispositionSources(); }, 0)).observe(list, { childList: true });
    decorateArchiveCards();
    global.__methodzV13ArchiveGatePatched = true;
  }

  function renderDispositionSources() {
    const select = document.getElementById("dispositionArchiveSourceV13");
    if (!select) return;
    const current = select.value;
    const entries = sortedArchived();
    select.innerHTML = entries.length ? entries.map((entry) => `<option value="${escapeHtml(entry.archiveId)}">#${escapeHtml(entry.record?.meetingNumber || "?")} ${escapeHtml(entry.record?.title || "Untitled Meeting")}</option>`).join("") : '<option value="">No archived records</option>';
    if (entries.some((entry) => entry.archiveId === current)) select.value = current;
    refreshDispositionStatus();
  }

  function requestDispositionApproval() {
    try {
      const entry = selectedArchiveEntry();
      const requester = readValue("dispositionRequestedByV13");
      const basis = readValue("dispositionBasisV13");
      if (!entry) throw new Error("Select an archived record.");
      if (entry.record?.retentionMetadata?.legalHold?.active) throw new Error("A disposition request cannot proceed while a preservation hold is active.");
      if (!requester) throw new Error("Enter the person requesting disposition review.");
      if (!basis) throw new Error("Enter the documented disposition basis.");
      const now = new Date().toISOString();
      const request = {
        id: `disposition-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        status: "Pending",
        archiveId: entry.archiveId,
        sourceRecordId: entry.record?.id || entry.originalRecordId || "",
        meetingNumber: entry.record?.meetingNumber || "",
        title: entry.record?.title || "",
        recordFingerprint: fingerprintRecord(entry.record),
        requestedBy: requester,
        requestedAt: now,
        decisionDate: readValue("dispositionDecisionDateV13") || today(),
        basis,
        reviewedBy: "",
        reviewedAt: "",
        reviewNote: "",
        releaseHistory: []
      };
      const approvals = readApprovals();
      approvals.push(request);
      writeApprovals(approvals);
      selectedApprovalId = request.id;
      appendAudit("disposition-requested", request, { actor: requester });
      appendEvent("disposition-requested", { entry, actor: requester, note: basis, details: { approvalId: request.id, recordFingerprint: request.recordFingerprint } });
      renderApprovals();
      refreshDispositionStatus();
      return request;
    } catch (error) {
      return handleError(error);
    }
  }

  function approveDisposition() { return reviewSelected("Approved"); }
  function rejectDisposition() { return reviewSelected("Rejected"); }

  function reviewSelected(status) {
    try {
      const request = selectedApproval();
      const reviewer = readValue("dispositionReviewedByV13");
      const entry = request ? readArchived().find((item) => item.archiveId === request.archiveId) : null;
      if (!request) throw new Error("Select a disposition request.");
      if (request.status !== "Pending") throw new Error("Only pending requests can be reviewed.");
      if (!reviewer) throw new Error("Enter the authorized reviewer.");
      if (!approvalRoles().includes(currentRole())) throw new Error(`The ${currentRole()} role is not authorized to review permanent disposition.`);
      if (settings.requireSeparateReviewer !== false && normalizeName(reviewer) === normalizeName(request.requestedBy)) throw new Error("The disposition reviewer must be different from the requester.");
      if (!entry) throw new Error("The archived record is no longer available.");
      if (entry.record?.retentionMetadata?.legalHold?.active) throw new Error("Disposition cannot be approved while a preservation hold is active.");
      if (status === "Approved" && request.recordFingerprint !== fingerprintRecord(entry.record)) throw new Error("The archived record changed after review was requested. Create a new request.");
      request.status = status;
      request.reviewedBy = reviewer;
      request.reviewedAt = new Date().toISOString();
      request.reviewNote = readValue("dispositionReviewNoteV13");
      replaceApproval(request);
      appendAudit(status === "Approved" ? "disposition-approved" : "disposition-rejected", request, { actor: reviewer, note: request.reviewNote });
      appendEvent(status === "Approved" ? "disposition-approved" : "disposition-rejected", { entry, actor: reviewer, note: request.reviewNote, details: { approvalId: request.id, recordFingerprint: request.recordFingerprint } });
      renderApprovals();
      refreshDispositionStatus();
      decorateArchiveCards();
      return request;
    } catch (error) {
      return handleError(error);
    }
  }

  function revokeDisposition() {
    try {
      const request = selectedApproval();
      const reviewer = readValue("dispositionReviewedByV13");
      if (!request || request.status !== "Approved") throw new Error("Select an approved disposition request.");
      if (!reviewer) throw new Error("Enter the authorized reviewer.");
      if (!approvalRoles().includes(currentRole())) throw new Error(`The ${currentRole()} role is not authorized to revoke disposition approval.`);
      request.status = "Revoked";
      request.revokedBy = reviewer;
      request.revokedAt = new Date().toISOString();
      request.revocationNote = readValue("dispositionReviewNoteV13");
      replaceApproval(request);
      const entry = readArchived().find((item) => item.archiveId === request.archiveId);
      appendAudit("disposition-revoked", request, { actor: reviewer, note: request.revocationNote });
      appendEvent("disposition-revoked", { entry, record: entry?.record, actor: reviewer, note: request.revocationNote, details: { approvalId: request.id } });
      renderApprovals();
      refreshDispositionStatus();
      decorateArchiveCards();
      return request;
    } catch (error) {
      return handleError(error);
    }
  }

  function consumeApproval(entry, approval) {
    approval.status = "Consumed";
    approval.consumedAt = new Date().toISOString();
    approval.releaseHistory = [...(approval.releaseHistory || []), { action: "permanent-delete-completed", occurredAt: approval.consumedAt }].slice(-100);
    replaceApproval(approval);
    appendAudit("permanent-delete-completed", approval, { actor: currentRole() });
    appendEvent("permanent-delete-completed", { entry, actor: currentRole(), note: "Archive entry and revision history removed after approved disposition.", details: { approvalId: approval.id, recordFingerprint: approval.recordFingerprint } });
    renderApprovals();
    renderDispositionSources();
  }

  function findValidDispositionApproval(entry) {
    if (!entry?.record || entry.record.retentionMetadata?.legalHold?.active) return null;
    const fingerprint = fingerprintRecord(entry.record);
    return readApprovals().filter((item) => item.status === "Approved" && item.archiveId === entry.archiveId && item.recordFingerprint === fingerprint).sort((a, b) => Date.parse(b.reviewedAt || 0) - Date.parse(a.reviewedAt || 0))[0] || null;
  }

  function renderApprovals() {
    const approvals = readApprovals().sort((a, b) => Date.parse(b.requestedAt || 0) - Date.parse(a.requestedAt || 0));
    const select = document.getElementById("dispositionRequestSelectV13");
    if (select) {
      const current = selectedApprovalId || select.value;
      select.innerHTML = approvals.length ? approvals.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.status)} • #${escapeHtml(item.meetingNumber || "?")} ${escapeHtml(item.title || "Untitled Meeting")}</option>`).join("") : '<option value="">No requests yet</option>';
      if (approvals.some((item) => item.id === current)) select.value = current;
      selectedApprovalId = select.value;
    }
    const list = document.getElementById("dispositionRequestListV13");
    if (!list) return;
    list.innerHTML = approvals.length ? approvals.slice(0, 25).map((item) => `<article class="disposition-card-v13"><strong>#${escapeHtml(item.meetingNumber || "?")} ${escapeHtml(item.title || "Untitled Meeting")}</strong><span class="disposition-badge-v13">${escapeHtml(item.status)}</span><dl><dt>Requested</dt><dd>${escapeHtml(formatDateTime(item.requestedAt))} by ${escapeHtml(item.requestedBy)}</dd><dt>Reviewed</dt><dd>${escapeHtml(item.reviewedAt ? `${formatDateTime(item.reviewedAt)} by ${item.reviewedBy}` : "Pending")}</dd><dt>Fingerprint</dt><dd><code>${escapeHtml(shortDigest(item.recordFingerprint))}</code></dd><dt>Basis</dt><dd>${escapeHtml(item.basis)}</dd></dl><button type="button" data-disposition-id="${escapeHtml(item.id)}">Select</button></article>`).join("") : '<p class="helper-text">No disposition requests have been created.</p>';
    list.querySelectorAll("button[data-disposition-id]").forEach((button) => button.addEventListener("click", () => {
      selectedApprovalId = button.dataset.dispositionId || "";
      if (select) select.value = selectedApprovalId;
      applyApprovalContext(selectedApproval());
      renderApprovals();
      refreshDispositionStatus();
    }));
  }

  function refreshDispositionStatus() {
    const element = document.getElementById("dispositionStatusV13");
    if (!element) return;
    const entry = selectedArchiveEntry();
    const valid = findValidDispositionApproval(entry);
    const request = entry ? readApprovals().filter((item) => item.archiveId === entry.archiveId).sort((a, b) => Date.parse(b.requestedAt || 0) - Date.parse(a.requestedAt || 0))[0] : null;
    const held = Boolean(entry?.record?.retentionMetadata?.legalHold?.active);
    element.className = `disposition-status-v13 ${valid && !held ? "is-approved-v13" : "is-blocked-v13"}`;
    element.textContent = !entry ? "No archived record selected." : held ? "Preservation hold active. Permanent disposition is blocked." : valid ? `Disposition approved by ${valid.reviewedBy} for fingerprint ${shortDigest(valid.recordFingerprint)}.` : `Disposition status: ${request?.status || "Not Requested"}. Permanent archive removal remains blocked.`;
  }

  function decorateArchiveCards() {
    const entries = sortedArchived();
    const cards = Array.from(document.querySelectorAll("#archiveVaultListV08 .archived-record-v08"));
    cards.forEach((card, index) => {
      const entry = entries[index];
      if (!entry) return;
      card.dataset.archiveId = entry.archiveId;
      const held = Boolean(entry.record?.retentionMetadata?.legalHold?.active);
      const valid = findValidDispositionApproval(entry);
      const latest = readApprovals().filter((item) => item.archiveId === entry.archiveId).sort((a, b) => Date.parse(b.requestedAt || 0) - Date.parse(a.requestedAt || 0))[0];
      const meta = card.querySelector("div p") || card.firstElementChild;
      if (meta) {
        let badge = meta.querySelector(".disposition-badge-v13");
        if (!badge) { badge = document.createElement("span"); badge.className = "disposition-badge-v13"; meta.append(" ", badge); }
        badge.textContent = held ? "Preservation Hold" : valid ? "Disposition Approved" : latest?.status === "Pending" ? "Disposition Pending" : "Approval Required";
      }
      const deleteButton = card.querySelector('button[data-action="delete"]');
      if (deleteButton && !held) {
        deleteButton.disabled = false;
        deleteButton.title = valid ? "Disposition approval matches this archived record." : "Approval is required before permanent archive removal.";
      }
    });
  }

  function appendEvent(action, context = {}) {
    const chain = readChain();
    const previousDigest = chain.at(-1)?.digest || "GENESIS";
    const record = context.record || context.entry?.record || {};
    const core = {
      sequence: chain.length + 1,
      action,
      occurredAt: new Date().toISOString(),
      sourceRecordId: record.id || context.entry?.originalRecordId || "",
      archiveId: context.entry?.archiveId || "",
      meetingNumber: record.meetingNumber || "",
      title: record.title || "",
      actor: context.actor || currentRole(),
      roleContext: currentRole(),
      note: context.note || "",
      details: clone(context.details || {}),
      previousDigest,
      algorithm: "FNV-1a-32 local chain checksum"
    };
    const event = { ...core, digest: fnv1a(stableStringify(core)) };
    chain.push(event);
    writeJson(keys.chain, chain.slice(-(Number(settings.eventLimit) || 2000)));
    renderEventChain();
    return event;
  }

  function verifyChain() {
    const chain = readChain();
    const errors = [];
    chain.forEach((event, index) => {
      const expectedPrevious = index ? chain[index - 1].digest : "GENESIS";
      if (event.previousDigest !== expectedPrevious) errors.push(`Event ${index + 1} previous digest does not match.`);
      const core = clone(event);
      delete core.digest;
      if (event.digest !== fnv1a(stableStringify(core))) errors.push(`Event ${index + 1} digest does not match its content.`);
    });
    return { valid: errors.length === 0, count: chain.length, head: chain.at(-1)?.digest || "GENESIS", errors };
  }

  function verifyPreservationChain() {
    const result = verifyChain();
    const element = document.getElementById("preservationChainStatusV13");
    if (element) {
      element.className = `chain-status-v13 ${result.valid ? "is-approved-v13" : "is-error-v13"}`;
      element.textContent = result.valid ? `${result.count} event${result.count === 1 ? "" : "s"} verified. Chain head: ${shortDigest(result.head)}.` : `Chain verification failed: ${result.errors.join(" ")}`;
    }
    return result;
  }

  function renderEventChain() {
    const list = document.getElementById("preservationEventListV13");
    if (!list) return;
    const chain = readChain().slice().reverse();
    list.innerHTML = chain.length ? `<ol>${chain.slice(0, 100).map((event) => `<li><strong>${escapeHtml(event.action)}</strong> • #${escapeHtml(event.meetingNumber || "?")} ${escapeHtml(event.title || "Untitled Meeting")} • ${escapeHtml(formatDateTime(event.occurredAt))}<br><span>${escapeHtml(event.actor || "Unknown")} • <code>${escapeHtml(shortDigest(event.digest))}</code>${event.note ? ` • ${escapeHtml(event.note)}` : ""}</span></li>`).join("")}</ol>` : '<p class="helper-text">No preservation or disposition events recorded yet.</p>';
    verifyPreservationChain();
  }

  function exportDispositionAudit() {
    const verification = verifyChain();
    const payload = { packageType: "methodz-disposition-approval-audit", packageVersion: 1, schemaVersion: config.schemaVersion || "1.3.0", generatedAt: new Date().toISOString(), notice: "Browser-local workflow history. This is tamper-evident only within this local chain and is not immutable or authenticated.", approvals: readApprovals(), events: readJson(keys.audit, []), preservationChainVerification: verification };
    global.downloadBlob?.(JSON.stringify(payload, null, 2), `methodz-disposition-audit-${today()}.json`, "application/json");
  }

  function exportPreservationChain() {
    const payload = { packageType: "methodz-preservation-event-chain", packageVersion: 1, generatedAt: new Date().toISOString(), notice: "Browser-local tamper-evident chain; not an immutable or authenticated ledger.", verification: verifyChain(), events: readChain() };
    global.downloadBlob?.(JSON.stringify(payload, null, 2), `methodz-preservation-event-chain-${today()}.json`, "application/json");
  }

  function appendAudit(action, approval, details = {}) {
    const log = readJson(keys.audit, []);
    log.push({ id: `disposition-audit-${Date.now()}-${Math.random().toString(16).slice(2)}`, action, occurredAt: new Date().toISOString(), approvalId: approval?.id || "", archiveId: approval?.archiveId || "", sourceRecordId: approval?.sourceRecordId || "", meetingNumber: approval?.meetingNumber || "", title: approval?.title || "", roleContext: currentRole(), ...clone(details) });
    writeJson(keys.audit, log.slice(-1000));
  }

  function updateRecordEventHead(recordId) {
    if (!recordId) return;
    const records = readJson(keys.records, []);
    const index = records.findIndex((item) => item.id === recordId);
    if (index < 0) return;
    records[index].dispositionControl = { ...(records[index].dispositionControl || {}), approvalRequired: true, preservationEventHead: latestEventDigest(recordId) };
    writeJson(keys.records, records);
  }

  function latestEventDigest(recordId) {
    return readChain().filter((event) => event.sourceRecordId === recordId).at(-1)?.digest || "";
  }

  function applyApprovalContext(request) {
    if (!request) return;
    const archiveSelect = document.getElementById("dispositionArchiveSourceV13");
    if (archiveSelect && Array.from(archiveSelect.options).some((option) => option.value === request.archiveId)) archiveSelect.value = request.archiveId;
    setValue("dispositionRequestedByV13", request.requestedBy);
    setValue("dispositionReviewedByV13", request.reviewedBy);
    setValue("dispositionDecisionDateV13", request.decisionDate);
    setValue("dispositionBasisV13", request.basis);
    setValue("dispositionReviewNoteV13", request.reviewNote || request.revocationNote);
    refreshDispositionStatus();
  }

  function selectArchive(archiveId) {
    const select = document.getElementById("dispositionArchiveSourceV13");
    if (select) select.value = archiveId;
    refreshDispositionStatus();
    document.getElementById("dispositionPanelV13")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  }

  function selectedArchiveEntry() { return readArchived().find((entry) => entry.archiveId === readValue("dispositionArchiveSourceV13")) || null; }
  function selectedApproval() { const id = selectedApprovalId || readValue("dispositionRequestSelectV13"); return readApprovals().find((item) => item.id === id) || null; }
  function readApprovals() { return readJson(keys.approvals, []).filter((item) => item && typeof item === "object"); }
  function writeApprovals(items) { writeJson(keys.approvals, items.slice(-(Number(settings.approvalLimit) || 500))); }
  function replaceApproval(updated) { const items = readApprovals(); const index = items.findIndex((item) => item.id === updated.id); if (index < 0) throw new Error("Disposition request is no longer available."); items[index] = clone(updated); writeApprovals(items); }
  function readArchived() { return readJson(keys.archive, []).filter((entry) => entry?.record); }
  function sortedArchived() { return readArchived().slice().sort((a, b) => String(b.archivedAt || "").localeCompare(String(a.archivedAt || ""))); }
  function readChain() { return readJson(keys.chain, []).filter((event) => event && typeof event === "object"); }
  function archiveEntryForCard(card) { if (!card) return null; const entries = sortedArchived(); if (card.dataset.archiveId) return entries.find((entry) => entry.archiveId === card.dataset.archiveId) || null; return entries[Array.from(document.querySelectorAll("#archiveVaultListV08 .archived-record-v08")).indexOf(card)] || null; }

  function fingerprintRecord(record) {
    const copy = clone(record || {});
    ["schemaAudit", "releaseMetadata", "dispositionControl", "adapterMetadata", "attachmentAdapterMetadata", "syncMetadata"].forEach((key) => delete copy[key]);
    if (copy.retentionMetadata) delete copy.retentionMetadata.updatedAt;
    return fnv1a(stableStringify(copy));
  }

  function stableStringify(value) { if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`; return JSON.stringify(value); }
  function fnv1a(text) { let hash = 2166136261; for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); } return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`; }
  function refreshAll() { renderDispositionSources(); renderApprovals(); decorateArchiveCards(); renderEventChain(); }
  function handleError(error) { const message = error?.message || String(error); const status = document.getElementById("dispositionStatusV13"); if (status) { status.className = "disposition-status-v13 is-error-v13"; status.textContent = message; } alert(message); return null; }
  function readJson(key, fallback) { try { return JSON.parse(global.localStorage.getItem(key)) ?? fallback; } catch (error) { return fallback; } }
  function writeJson(key, value) { global.localStorage.setItem(key, JSON.stringify(value)); }
  function readValue(id) { return String(document.getElementById(id)?.value || "").trim(); }
  function setValue(id, value) { const element = document.getElementById(id); if (element) element.value = value || ""; }
  function clone(value) { return value == null ? value : JSON.parse(JSON.stringify(value)); }
  function normalizeName(value) { return String(value || "").trim().toLowerCase().replace(/\s+/g, " "); }
  function formatDateTime(value) { if (!value) return "Not recorded"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(); }
  function shortDigest(value) { const text = String(value || ""); return text.length > 20 ? `${text.slice(0, 12)}…${text.slice(-6)}` : text || "none"; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function prefersReducedMotion() { return global.matchMedia?.("(prefers-reduced-motion: reduce)").matches; }
  function escapeHtml(value) { return String(value == null ? "" : value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }

  global.requestDispositionApprovalV13 = requestDispositionApproval;
  global.approveDispositionV13 = approveDisposition;
  global.rejectDispositionV13 = rejectDisposition;
  global.revokeDispositionV13 = revokeDisposition;
  global.exportDispositionAuditV13 = exportDispositionAudit;
  global.verifyPreservationChainV13 = verifyPreservationChain;
  global.exportPreservationChainV13 = exportPreservationChain;
  global.MethodzDispositionV13 = { version: "1.3.0", fingerprintRecord, findValidDispositionApproval, verifyChain, appendEvent, refresh: refreshAll };
})(window);
