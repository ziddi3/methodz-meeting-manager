/* Methodz Meeting Manager v1.5 policy review operations and chained external release receipts. */
(function initializeMethodzPolicyOperationsV15(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const options = config.policyOperations || {};
  const governanceKey = config.storageKeys?.recipientPolicyGovernance || "methodzRecipientPolicyGovernance";
  const receiptKey = config.storageKeys?.externalReleaseReceipts || "methodzExternalReleaseReceipts";
  const policyAuditKey = config.storageKeys?.recipientPolicyAudit || "methodzRecipientPolicyAudit";
  const recordsKey = config.storageKeys?.records || "methodzMeetingRecords";
  const archiveKey = config.storageKeys?.archivedRecords || "methodzArchivedMeetingRecords";
  let selectedPolicyId = "";
  let queueFilter = "all";

  global.addEventListener("DOMContentLoaded", initialize);
  global.addEventListener("methodz:migrations-complete", renderAll);

  function initialize() {
    installPanel();
    patchPolicyMutations();
    patchPreviewGovernanceBinding();
    patchApprovedDownloadReceipts();
    bindControls();
    renderAll();
  }

  function policyApi() {
    return global.MethodzRecipientPolicyV14 || null;
  }

  function policies() {
    return policyApi()?.readPolicies?.() || [];
  }

  function installPanel() {
    const anchor = document.getElementById("recipientPolicyPanelV14") || document.getElementById("externalApprovalPanelV12");
    if (!anchor || document.getElementById("policyOperationsPanelV15")) return;

    const panel = document.createElement("section");
    panel.id = "policyOperationsPanelV15";
    panel.className = "card v15-card policy-operations-v15";
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Policy Operations & Release Receipts</h2>
          <p class="helper-text">Assign browser-local policy stewardship, manage policy review dates, and retain a chained receipt for every approved external download. These controls support operations but do not authenticate users or prove delivery.</p>
        </div>
        <span class="release-badge-v15">v1.5</span>
      </div>

      <div id="policyOperationsStatusV15" class="policy-operations-status-v15" aria-live="polite">Policy operations ready.</div>
      <div id="policyOperationsMetricsV15" class="policy-metrics-v15"></div>

      <details open>
        <summary>Policy Stewardship and Review</summary>
        <div class="form-grid governance-form-v15">
          <div>
            <label for="governancePolicySelectV15">Recipient Policy</label>
            <select id="governancePolicySelectV15"><option value="">No recipient policies</option></select>
          </div>
          <div>
            <label for="policyStewardNameV15">Policy Steward</label>
            <input id="policyStewardNameV15" type="text" autocomplete="name" placeholder="Person accountable for this policy" />
          </div>
          <div>
            <label for="policyStewardRoleV15">Steward Role</label>
            <select id="policyStewardRoleV15">${(options.stewardRoles || []).map((role) => `<option>${escapeHtml(role)}</option>`).join("")}</select>
          </div>
          <div>
            <label for="policyRiskTierV15">Information Risk Tier</label>
            <select id="policyRiskTierV15">${(options.riskTiers || []).map((tier) => `<option>${escapeHtml(tier)}</option>`).join("")}</select>
          </div>
          <div>
            <label for="policyReviewCadenceV15">Review Cadence (days)</label>
            <input id="policyReviewCadenceV15" type="number" min="1" max="3650" value="${escapeHtml(String(options.defaultCadenceDays || 180))}" />
          </div>
          <div>
            <label for="policyReviewerNameV15">Reviewed By</label>
            <input id="policyReviewerNameV15" type="text" autocomplete="name" placeholder="Person completing the review" />
          </div>
        </div>

        <label for="policyBusinessPurposeV15">Approved Business Purpose</label>
        <textarea id="policyBusinessPurposeV15" class="compact-textarea-v15" placeholder="Why this recipient may receive the permitted information."></textarea>

        <label for="policyReviewNoteV15">Review Note</label>
        <textarea id="policyReviewNoteV15" class="compact-textarea-v15" placeholder="What was checked and any conditions or limitations."></textarea>

        <div class="button-row">
          <button type="button" onclick="savePolicyGovernanceV15()">Save Stewardship</button>
          <button type="button" onclick="markPolicyReviewedV15()">Mark Reviewed Now</button>
          <button type="button" onclick="exportPolicyOperationsReportV15()">Export Governance Report</button>
        </div>
      </details>

      <details open>
        <summary>Policy Review Queue</summary>
        <div class="form-grid policy-queue-toolbar-v15">
          <div>
            <label for="policyQueueFilterV15">Review State</label>
            <select id="policyQueueFilterV15">
              <option value="all">All policies</option>
              <option value="overdue">Overdue</option>
              <option value="due-soon">Due soon</option>
              <option value="no-date">No review date</option>
              <option value="current">Current</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div id="policyReviewQueueV15" class="policy-review-queue-v15"></div>
      </details>

      <details open>
        <summary>External Release Receipt Ledger</summary>
        <div class="form-grid receipt-toolbar-v15">
          <div>
            <label for="releaseReceiptSearchV15">Search Receipts</label>
            <input id="releaseReceiptSearchV15" type="search" placeholder="Recipient, organization, meeting, approval, digest..." />
          </div>
          <div class="button-row receipt-actions-v15">
            <button type="button" onclick="verifyReleaseReceiptLedgerV15()">Verify Ledger</button>
            <button type="button" onclick="exportReleaseReceiptsV15()">Export Receipt Ledger</button>
          </div>
        </div>
        <div id="releaseReceiptLedgerStatusV15" class="receipt-ledger-status-v15" aria-live="polite">No release receipts recorded yet.</div>
        <div id="releaseReceiptListV15" class="release-receipt-list-v15"></div>
      </details>
    `;
    anchor.insertAdjacentElement("afterend", panel);
  }

  function bindControls() {
    document.getElementById("governancePolicySelectV15")?.addEventListener("change", (event) => {
      selectedPolicyId = event.target.value || "";
      loadGovernanceForm();
      renderQueue();
    });
    document.getElementById("policyQueueFilterV15")?.addEventListener("change", (event) => {
      queueFilter = event.target.value || "all";
      renderQueue();
    });
    document.getElementById("releaseReceiptSearchV15")?.addEventListener("input", renderReceipts);
    document.getElementById("importRecipientPoliciesFileV14")?.addEventListener("change", () => global.setTimeout(renderAll, 250));
  }

  function patchPolicyMutations() {
    ["saveRecipientPolicyV14", "toggleRecipientPolicyV14"].forEach((name) => {
      const original = global[name];
      const marker = `__methodzV15Wrapped_${name}`;
      if (typeof original !== "function" || global[marker]) return;
      global[name] = function policyMutationWithOperationsRefreshV15(...args) {
        const result = original.apply(this, args);
        global.setTimeout(renderAll, 0);
        return result;
      };
      global[marker] = true;
    });
  }

  function patchPreviewGovernanceBinding() {
    if (global.__methodzV15PreviewGovernancePatched || typeof global.previewExternalExportV11 !== "function") return;
    const original = global.previewExternalExportV11;
    global.previewExternalExportV11 = async function previewExternalExportGovernanceV15(...args) {
      const payload = await original.apply(this, args);
      const policyId = payload?.manifest?.recipientPolicy?.id || "";
      if (!payload?.record || !policyId) return payload;
      const governance = governanceFor(policyId);
      if (!governance) return payload;

      payload.record.externalCopy = {
        ...(payload.record.externalCopy || {}),
        recipientGovernanceVersion: governance.updatedAt || "",
        recipientRiskTier: governance.riskTier || "Standard"
      };
      payload.manifest.recipientGovernance = governanceSnapshot(governance);
      const unsigned = clone(payload);
      delete unsigned.integrity;
      if (global.MethodzRedactionV11?.computeIntegrity) {
        payload.integrity = await global.MethodzRedactionV11.computeIntegrity(unsigned);
      }
      const preview = document.getElementById("externalExportPreviewBodyV11");
      if (preview) preview.textContent = JSON.stringify(payload, null, 2);
      return payload;
    };
    global.__methodzV15PreviewGovernancePatched = true;
  }

  function patchApprovedDownloadReceipts() {
    if (global.__methodzV15ApprovedDownloadPatched || typeof global.downloadApprovedExternalV12 !== "function") return;
    const original = global.downloadApprovedExternalV12;
    global.downloadApprovedExternalV12 = async function downloadApprovedExternalWithReceiptV15(format = "json", ...args) {
      const packageValue = await original.call(this, format, ...args);
      if (!packageValue?.approval?.approvalId || !packageValue?.integrity?.digest) return packageValue;
      const receipt = appendReleaseReceipt(packageValue, String(format || "json"));
      updateSourceReceiptMetadata(receipt);
      appendPolicyAudit(receipt);
      renderAll();
      setStatus(`Release receipt ${receipt.id} recorded for approval ${receipt.approvalId}.`, "ready");
      return packageValue;
    };
    global.__methodzV15ApprovedDownloadPatched = true;
  }

  function normalizeGovernance(input) {
    const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    return {
      policyId: String(source.policyId || ""),
      stewardName: String(source.stewardName || "").trim(),
      stewardRole: String(source.stewardRole || options.stewardRoles?.[0] || "Administrator"),
      riskTier: String(source.riskTier || options.riskTiers?.[0] || "Standard"),
      businessPurpose: String(source.businessPurpose || "").trim(),
      cadenceDays: clampNumber(source.cadenceDays, 1, 3650, options.defaultCadenceDays || 180),
      lastReviewedAt: String(source.lastReviewedAt || ""),
      lastReviewedBy: String(source.lastReviewedBy || "").trim(),
      reviewNote: String(source.reviewNote || "").trim(),
      createdAt: String(source.createdAt || new Date().toISOString()),
      updatedAt: String(source.updatedAt || new Date().toISOString())
    };
  }

  function readGovernance() {
    const value = readJson(governanceKey, []);
    return Array.isArray(value) ? value.map(normalizeGovernance).filter((item) => item.policyId) : [];
  }

  function writeGovernance(entries) {
    const maximum = Number(options.maximumGovernanceEntries || 500);
    const normalized = entries.map(normalizeGovernance).slice(-maximum);
    global.localStorage.setItem(governanceKey, JSON.stringify(normalized));
    return normalized;
  }

  function governanceFor(policyId) {
    return readGovernance().find((item) => item.policyId === policyId) || null;
  }

  function saveGovernance() {
    try {
      const policy = selectedPolicy();
      if (!policy) throw new Error("Select a recipient policy first.");
      const existing = governanceFor(policy.id);
      const entry = normalizeGovernance({
        ...existing,
        policyId: policy.id,
        stewardName: readValue("policyStewardNameV15"),
        stewardRole: readValue("policyStewardRoleV15"),
        riskTier: readValue("policyRiskTierV15"),
        businessPurpose: readValue("policyBusinessPurposeV15"),
        cadenceDays: Number(readValue("policyReviewCadenceV15")),
        lastReviewedAt: existing?.lastReviewedAt || "",
        lastReviewedBy: existing?.lastReviewedBy || "",
        reviewNote: readValue("policyReviewNoteV15") || existing?.reviewNote || "",
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      validateGovernance(entry);
      const entries = readGovernance();
      const index = entries.findIndex((item) => item.policyId === entry.policyId);
      if (index >= 0) entries[index] = entry;
      else entries.push(entry);
      writeGovernance(entries);
      appendGovernanceAudit("policy-governance-saved", policy, entry, entry.stewardName);
      renderAll();
      setStatus(`Saved stewardship metadata for “${policy.label}”.`, "ready");
      return entry;
    } catch (error) {
      return handleError(error);
    }
  }

  function markReviewed() {
    try {
      const policy = selectedPolicy();
      if (!policy) throw new Error("Select a recipient policy first.");
      const reviewer = readValue("policyReviewerNameV15");
      const note = readValue("policyReviewNoteV15");
      if (!reviewer) throw new Error("Enter the person completing the policy review.");
      if (note.length < 8) throw new Error("Add a meaningful policy review note.");
      let governance = governanceFor(policy.id) || normalizeGovernance({ policyId: policy.id });
      governance = normalizeGovernance({
        ...governance,
        stewardName: readValue("policyStewardNameV15") || governance.stewardName,
        stewardRole: readValue("policyStewardRoleV15") || governance.stewardRole,
        riskTier: readValue("policyRiskTierV15") || governance.riskTier,
        businessPurpose: readValue("policyBusinessPurposeV15") || governance.businessPurpose,
        cadenceDays: Number(readValue("policyReviewCadenceV15")) || governance.cadenceDays,
        lastReviewedAt: new Date().toISOString(),
        lastReviewedBy: reviewer,
        reviewNote: note,
        updatedAt: new Date().toISOString()
      });
      validateGovernance(governance);

      const nextReview = addDays(new Date(), governance.cadenceDays).toISOString().slice(0, 10);
      const updatedPolicy = {
        ...policy,
        reviewDate: nextReview,
        updatedAt: new Date().toISOString()
      };
      policyApi().writePolicies(policies().map((item) => item.id === updatedPolicy.id ? updatedPolicy : item));

      const entries = readGovernance();
      const index = entries.findIndex((item) => item.policyId === governance.policyId);
      if (index >= 0) entries[index] = governance;
      else entries.push(governance);
      writeGovernance(entries);
      appendGovernanceAudit("policy-reviewed-v15", updatedPolicy, governance, reviewer, { nextReviewDate: nextReview, note });
      renderAll();
      setStatus(`“${updatedPolicy.label}” reviewed by ${reviewer}. Next review: ${nextReview}.`, "ready");
      return { policy: updatedPolicy, governance };
    } catch (error) {
      return handleError(error);
    }
  }

  function validateGovernance(entry) {
    if (!entry.policyId) throw new Error("Policy ID is required.");
    if (!entry.stewardName) throw new Error("Enter a policy steward.");
    if (!entry.businessPurpose) throw new Error("Enter the approved business purpose.");
    if (!Number.isFinite(entry.cadenceDays) || entry.cadenceDays < 1) throw new Error("Review cadence must be at least one day.");
    return true;
  }

  function reviewState(policy, now = Date.now()) {
    if (policy?.status !== "Active") return "inactive";
    if (!policy?.reviewDate) return "no-date";
    const due = Date.parse(`${policy.reviewDate}T23:59:59.999`);
    if (!Number.isFinite(due)) return "no-date";
    if (due < now) return "overdue";
    const windowMs = Number(options.reviewWindowDays || 30) * 86400000;
    if (due <= now + windowMs) return "due-soon";
    return "current";
  }

  function renderAll() {
    renderPolicySelect();
    loadGovernanceForm();
    renderMetrics();
    renderQueue();
    renderReceipts();
  }

  function renderPolicySelect() {
    const select = document.getElementById("governancePolicySelectV15");
    if (!select) return;
    const list = policies().sort((a, b) => String(a.label).localeCompare(String(b.label)));
    const current = selectedPolicyId || select.value;
    select.innerHTML = list.length
      ? list.map((policy) => `<option value="${escapeHtml(policy.id)}">${escapeHtml(policy.status)} • ${escapeHtml(policy.label)} • ${escapeHtml(policy.recipientName)}</option>`).join("")
      : '<option value="">No recipient policies</option>';
    if (list.some((item) => item.id === current)) select.value = current;
    selectedPolicyId = select.value || "";
  }

  function loadGovernanceForm() {
    const policy = selectedPolicy();
    const entry = policy ? governanceFor(policy.id) : null;
    setValue("policyStewardNameV15", entry?.stewardName || "");
    setValue("policyStewardRoleV15", entry?.stewardRole || options.stewardRoles?.[0] || "Administrator");
    setValue("policyRiskTierV15", entry?.riskTier || options.riskTiers?.[0] || "Standard");
    setValue("policyReviewCadenceV15", entry?.cadenceDays || options.defaultCadenceDays || 180);
    setValue("policyBusinessPurposeV15", entry?.businessPurpose || "");
    setValue("policyReviewerNameV15", entry?.lastReviewedBy || "");
    setValue("policyReviewNoteV15", entry?.reviewNote || "");
  }

  function renderMetrics() {
    const element = document.getElementById("policyOperationsMetricsV15");
    if (!element) return;
    const list = policies();
    const counts = list.reduce((result, policy) => {
      const state = reviewState(policy);
      result[state] = (result[state] || 0) + 1;
      return result;
    }, {});
    const receiptVerification = verifyReceiptLedger();
    element.innerHTML = [
      ["Active policies", list.filter((item) => item.status === "Active").length],
      ["Overdue", counts.overdue || 0],
      ["Due soon", counts["due-soon"] || 0],
      ["No review date", counts["no-date"] || 0],
      ["Release receipts", readReceipts().length],
      ["Receipt chain", receiptVerification.valid ? "Valid" : "Review required"]
    ].map(([label, value]) => `<div><strong>${escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></div>`).join("");
  }

  function renderQueue() {
    const element = document.getElementById("policyReviewQueueV15");
    if (!element) return;
    const stateOrder = { overdue: 0, "due-soon": 1, "no-date": 2, current: 3, inactive: 4 };
    const governance = new Map(readGovernance().map((item) => [item.policyId, item]));
    const list = policies()
      .map((policy) => ({ policy, entry: governance.get(policy.id) || null, state: reviewState(policy) }))
      .filter((item) => queueFilter === "all" || item.state === queueFilter)
      .sort((a, b) => (stateOrder[a.state] - stateOrder[b.state]) || String(a.policy.reviewDate || "9999").localeCompare(String(b.policy.reviewDate || "9999")));

    if (!list.length) {
      element.innerHTML = '<p class="helper-text">No recipient policies match this review state.</p>';
      return;
    }

    element.innerHTML = list.map(({ policy, entry, state }) => `
      <article class="policy-review-card-v15" data-review-state="${escapeHtml(state)}">
        <div class="policy-review-heading-v15">
          <strong>${escapeHtml(policy.label)}</strong>
          <span>${escapeHtml(reviewStateLabel(state))}</span>
        </div>
        <p>${escapeHtml(policy.recipientName)}${policy.organization ? ` • ${escapeHtml(policy.organization)}` : ""}</p>
        <dl>
          <dt>Review date</dt><dd>${escapeHtml(policy.reviewDate || "Not set")}</dd>
          <dt>Steward</dt><dd>${escapeHtml(entry?.stewardName || "Not assigned")}${entry?.stewardRole ? ` • ${escapeHtml(entry.stewardRole)}` : ""}</dd>
          <dt>Risk tier</dt><dd>${escapeHtml(entry?.riskTier || "Standard")}</dd>
          <dt>Business purpose</dt><dd>${escapeHtml(entry?.businessPurpose || "Not documented")}</dd>
          <dt>Last reviewed</dt><dd>${escapeHtml(entry?.lastReviewedAt ? `${formatDateTime(entry.lastReviewedAt)} by ${entry.lastReviewedBy || "Unknown"}` : "Not recorded")}</dd>
        </dl>
        <button type="button" data-governance-policy-id="${escapeHtml(policy.id)}">Manage</button>
      </article>`).join("");

    element.querySelectorAll("button[data-governance-policy-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedPolicyId = button.dataset.governancePolicyId || "";
        const select = document.getElementById("governancePolicySelectV15");
        if (select) select.value = selectedPolicyId;
        loadGovernanceForm();
        document.getElementById("policyOperationsPanelV15")?.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
      });
    });
  }

  function appendReleaseReceipt(packageValue, format) {
    const receipts = readReceipts();
    const previous = receipts[receipts.length - 1] || null;
    const approval = packageValue.approval || {};
    const policy = packageValue.manifest?.recipientPolicy || null;
    const governance = packageValue.manifest?.recipientGovernance || (policy?.id ? governanceSnapshot(governanceFor(policy.id)) : null);
    const base = {
      id: `release-receipt-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      receiptVersion: 1,
      releasedAt: packageValue.exportedAt || new Date().toISOString(),
      format: format === "html" ? "html" : "json",
      approvalId: String(approval.approvalId || ""),
      destinationPolicyId: String(approval.destinationPolicyId || ""),
      destinationLabel: String(approval.destinationLabel || ""),
      redactionProfile: String(packageValue.manifest?.profile || ""),
      sourceReference: clone(packageValue.manifest?.sourceReference || {}),
      contentFingerprint: clone(approval.contentFingerprint || {}),
      packageIntegrity: clone(packageValue.integrity || {}),
      recipientPolicy: clone(policy),
      recipientGovernance: clone(governance),
      approvalSnapshot: {
        requestedBy: String(approval.requestedBy || ""),
        approvedBy: String(approval.approvedBy || ""),
        approvedAt: String(approval.approvedAt || ""),
        expiresAt: String(approval.expiresAt || ""),
        purpose: String(approval.purpose || "")
      },
      notice: "Browser-local release receipt. It records application workflow state but does not prove recipient identity, transmission, delivery, or receipt by another party."
    };
    const receipt = {
      ...base,
      chain: {
        algorithm: "FNV-1a-32",
        sequence: receipts.length + 1,
        previousDigest: previous?.chain?.digest || "GENESIS",
        digest: ""
      }
    };
    receipt.chain.digest = receiptDigest(receipt);
    receipts.push(receipt);
    const maximum = Number(options.maximumReleaseReceipts || 5000);
    const retained = rechainReceipts(receipts.slice(-maximum));
    global.localStorage.setItem(receiptKey, JSON.stringify(retained));
    return retained[retained.length - 1];
  }

  function rechainReceipts(receipts) {
    let previous = "GENESIS";
    return receipts.map((input, index) => {
      const receipt = clone(input);
      receipt.chain = {
        algorithm: "FNV-1a-32",
        sequence: index + 1,
        previousDigest: previous,
        digest: ""
      };
      receipt.chain.digest = receiptDigest(receipt);
      previous = receipt.chain.digest;
      return receipt;
    });
  }

  function readReceipts() {
    const value = readJson(receiptKey, []);
    return Array.isArray(value) ? value : [];
  }

  function receiptDigest(receipt) {
    const copy = clone(receipt);
    if (copy?.chain) copy.chain.digest = "";
    return fnv1a32(canonicalJson(copy));
  }

  function verifyReceiptLedger(receipts = readReceipts()) {
    let previous = "GENESIS";
    for (let index = 0; index < receipts.length; index += 1) {
      const receipt = receipts[index];
      const expectedSequence = index + 1;
      if (receipt?.chain?.sequence !== expectedSequence) {
        return { valid: false, checked: index, error: `Receipt ${receipt?.id || index + 1} has an invalid sequence.` };
      }
      if (receipt?.chain?.previousDigest !== previous) {
        return { valid: false, checked: index, error: `Receipt ${receipt?.id || index + 1} does not match the previous digest.` };
      }
      const digest = receiptDigest(receipt);
      if (receipt?.chain?.digest !== digest) {
        return { valid: false, checked: index, error: `Receipt ${receipt?.id || index + 1} failed digest verification.` };
      }
      previous = digest;
    }
    return { valid: true, checked: receipts.length, headDigest: previous };
  }

  function verifyLedgerFromUi() {
    const result = verifyReceiptLedger();
    setReceiptStatus(result.valid
      ? `Receipt ledger verified: ${result.checked} receipt(s), head digest ${shortDigest(result.headDigest)}.`
      : `Receipt ledger verification failed after ${result.checked} receipt(s): ${result.error}`,
    result.valid ? "ready" : "error");
    renderMetrics();
    return result;
  }

  function renderReceipts() {
    const element = document.getElementById("releaseReceiptListV15");
    if (!element) return;
    const query = readValue("releaseReceiptSearchV15").toLowerCase();
    const allReceipts = readReceipts();
    const receipts = allReceipts.slice().reverse().filter((receipt) => {
      if (!query) return true;
      return canonicalJson(receipt).toLowerCase().includes(query);
    });
    const verification = verifyReceiptLedger(allReceipts);
    setReceiptStatus(allReceipts.length
      ? `${allReceipts.length} release receipt(s). Chain ${verification.valid ? "verified" : "requires review"}.`
      : "No approved external downloads have produced a release receipt yet.",
    verification.valid ? "ready" : "warning");

    if (!receipts.length) {
      element.innerHTML = `<p class="helper-text">${query ? "No release receipts match the search." : "No release receipts recorded yet."}</p>`;
      return;
    }
    element.innerHTML = receipts.slice(0, 50).map((receipt) => `
      <article class="release-receipt-card-v15">
        <div class="release-receipt-heading-v15">
          <strong>${escapeHtml(receipt.sourceReference?.title || "Untitled Meeting")}</strong>
          <span>#${escapeHtml(String(receipt.chain?.sequence || "?"))} • ${escapeHtml(String(receipt.format || "json").toUpperCase())}</span>
        </div>
        <p>${escapeHtml(receipt.recipientPolicy?.recipientName || receipt.destinationLabel || "External recipient")}${receipt.recipientPolicy?.organization ? ` • ${escapeHtml(receipt.recipientPolicy.organization)}` : ""}</p>
        <dl>
          <dt>Released</dt><dd>${escapeHtml(formatDateTime(receipt.releasedAt))}</dd>
          <dt>Approval</dt><dd><code>${escapeHtml(receipt.approvalId)}</code></dd>
          <dt>Package digest</dt><dd><code>${escapeHtml(shortDigest(receipt.packageIntegrity?.digest))}</code></dd>
          <dt>Receipt digest</dt><dd><code>${escapeHtml(shortDigest(receipt.chain?.digest))}</code></dd>
          <dt>Previous</dt><dd><code>${escapeHtml(shortDigest(receipt.chain?.previousDigest))}</code></dd>
        </dl>
        <button type="button" data-release-receipt-id="${escapeHtml(receipt.id)}">Download Receipt JSON</button>
      </article>`).join("");
    element.querySelectorAll("button[data-release-receipt-id]").forEach((button) => {
      button.addEventListener("click", () => downloadReceipt(button.dataset.releaseReceiptId));
    });
  }

  function downloadReceipt(id) {
    const receipt = readReceipts().find((item) => item.id === id);
    if (!receipt) return handleError(new Error("Release receipt not found."));
    downloadJson(receipt, `${safeFilename(receipt.sourceReference?.title || "meeting")}-${receipt.id}.json`);
    return receipt;
  }

  function exportReceipts() {
    const receipts = readReceipts();
    const verification = verifyReceiptLedger(receipts);
    const packageValue = {
      packageType: "methodz-external-release-receipt-ledger",
      packageVersion: 1,
      schemaVersion: "1.5.0",
      exportedAt: new Date().toISOString(),
      verification,
      receipts
    };
    downloadJson(packageValue, `methodz-release-receipts-${today()}.json`);
    return packageValue;
  }

  function exportOperationsReport() {
    const policyList = policies();
    const governance = readGovernance();
    const packageValue = {
      packageType: "methodz-recipient-policy-operations-report",
      packageVersion: 1,
      schemaVersion: "1.5.0",
      exportedAt: new Date().toISOString(),
      reviewWindowDays: Number(options.reviewWindowDays || 30),
      policies: policyList.map((policy) => ({
        policy: policyApi()?.policySnapshot?.(policy) || clone(policy),
        governance: governanceSnapshot(governance.find((item) => item.policyId === policy.id) || null),
        reviewState: reviewState(policy)
      })),
      releaseReceiptSummary: {
        count: readReceipts().length,
        verification: verifyReceiptLedger()
      },
      notice: "Browser-local governance report. Confirm organizational authority and applicable legal requirements outside this application."
    };
    downloadJson(packageValue, `methodz-policy-operations-${today()}.json`);
    return packageValue;
  }

  function updateSourceReceiptMetadata(receipt) {
    const sourceId = String(receipt.sourceReference?.id || "");
    if (!sourceId) return;
    const update = (record) => {
      if (!record || record.id !== sourceId) return record;
      return {
        ...record,
        externalRecipientControl: {
          ...(record.externalRecipientControl || {}),
          lastReleaseReceiptId: receipt.id,
          lastReleaseReceiptAt: receipt.releasedAt,
          lastReleaseIntegrityAlgorithm: String(receipt.packageIntegrity?.algorithm || ""),
          lastReleaseIntegrityDigest: String(receipt.packageIntegrity?.digest || "")
        }
      };
    };

    const active = readJson(recordsKey, []);
    let changed = false;
    const updatedActive = active.map((record) => {
      if (record?.id !== sourceId) return record;
      changed = true;
      return update(record);
    });
    if (changed) {
      global.localStorage.setItem(recordsKey, JSON.stringify(updatedActive));
      if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
      return;
    }

    const archived = readJson(archiveKey, []);
    const updatedArchive = archived.map((entry) => {
      if (entry?.record?.id !== sourceId) return entry;
      changed = true;
      return { ...entry, record: update(entry.record) };
    });
    if (changed) global.localStorage.setItem(archiveKey, JSON.stringify(updatedArchive));
  }

  function appendPolicyAudit(receipt) {
    const events = readJson(policyAuditKey, []);
    events.push({
      id: `recipient-policy-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action: "release-receipt-recorded-v15",
      at: receipt.releasedAt,
      policyId: receipt.recipientPolicy?.id || "",
      policyLabel: receipt.recipientPolicy?.label || "",
      recipientName: receipt.recipientPolicy?.recipientName || "",
      organization: receipt.recipientPolicy?.organization || "",
      approvalId: receipt.approvalId,
      receiptId: receipt.id,
      receiptDigest: receipt.chain?.digest || "",
      packageIntegrity: clone(receipt.packageIntegrity || {})
    });
    global.localStorage.setItem(policyAuditKey, JSON.stringify(events.slice(-2000)));
  }

  function appendGovernanceAudit(action, policy, governance, actor, detail = {}) {
    const events = readJson(policyAuditKey, []);
    events.push({
      id: `recipient-policy-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      at: new Date().toISOString(),
      policyId: policy?.id || governance?.policyId || "",
      policyLabel: policy?.label || "",
      recipientName: policy?.recipientName || "",
      organization: policy?.organization || "",
      actor: actor || "",
      stewardName: governance?.stewardName || "",
      stewardRole: governance?.stewardRole || "",
      riskTier: governance?.riskTier || "",
      ...clone(detail)
    });
    global.localStorage.setItem(policyAuditKey, JSON.stringify(events.slice(-2000)));
  }

  function governanceSnapshot(entry) {
    if (!entry) return null;
    return {
      policyId: entry.policyId,
      stewardName: entry.stewardName,
      stewardRole: entry.stewardRole,
      riskTier: entry.riskTier,
      businessPurpose: entry.businessPurpose,
      cadenceDays: entry.cadenceDays,
      lastReviewedAt: entry.lastReviewedAt,
      lastReviewedBy: entry.lastReviewedBy,
      reviewNote: entry.reviewNote,
      governanceUpdatedAt: entry.updatedAt,
      notice: "Browser-local policy stewardship metadata. It does not authenticate the steward or reviewer."
    };
  }

  function selectedPolicy() {
    const id = selectedPolicyId || readValue("governancePolicySelectV15");
    return policies().find((item) => item.id === id) || null;
  }

  function setStatus(message, state = "") {
    const element = document.getElementById("policyOperationsStatusV15");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state;
  }

  function setReceiptStatus(message, state = "") {
    const element = document.getElementById("releaseReceiptLedgerStatusV15");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state;
  }

  function handleError(error) {
    const message = error?.message || String(error);
    setStatus(message, "error");
    global.alert(message);
    return null;
  }

  function readJson(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) ?? fallback);
    } catch (error) {
      console.warn(`Unable to read ${key}`, error);
      return fallback;
    }
  }

  function readValue(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value == null ? "" : String(value);
  }

  function reviewStateLabel(state) {
    return ({ overdue: "Overdue", "due-soon": "Due soon", "no-date": "No review date", current: "Current", inactive: "Inactive" })[state] || state;
  }

  function clampNumber(value, minimum, maximum, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
  }

  function addDays(date, days) {
    const copy = new Date(date.getTime());
    copy.setUTCDate(copy.getUTCDate() + Number(days || 0));
    return copy;
  }

  function canonicalJson(value) {
    return JSON.stringify(sortValue(value));
  }

  function sortValue(value) {
    if (Array.isArray(value)) return value.map(sortValue);
    if (value && typeof value === "object") {
      return Object.keys(value).sort().reduce((result, key) => {
        result[key] = sortValue(value[key]);
        return result;
      }, {});
    }
    return value;
  }

  function fnv1a32(text) {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return `fnv1a32-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function downloadJson(value, filename) {
    const text = JSON.stringify(value, null, 2);
    if (typeof global.downloadBlob === "function") {
      global.downloadBlob(text, filename, "application/json");
      return;
    }
    const blob = new Blob([text], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatDateTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value || "Unknown") : date.toLocaleString();
  }

  function shortDigest(value) {
    const text = String(value || "");
    if (!text) return "Unavailable";
    if (text === "GENESIS") return text;
    return text.length > 20 ? `${text.slice(0, 10)}…${text.slice(-8)}` : text;
  }

  function safeFilename(value) {
    return String(value || "record").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "record";
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function reducedMotion() {
    return global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  }

  global.savePolicyGovernanceV15 = saveGovernance;
  global.markPolicyReviewedV15 = markReviewed;
  global.verifyReleaseReceiptLedgerV15 = verifyLedgerFromUi;
  global.exportReleaseReceiptsV15 = exportReceipts;
  global.exportPolicyOperationsReportV15 = exportOperationsReport;
  global.downloadReleaseReceiptV15 = downloadReceipt;
  global.MethodzPolicyOperationsV15 = {
    version: "1.5.0",
    readGovernance,
    writeGovernance,
    governanceFor,
    governanceSnapshot,
    reviewState,
    readReceipts,
    appendReleaseReceipt,
    receiptDigest,
    verifyReceiptLedger,
    exportOperationsReport
  };
})(window);
