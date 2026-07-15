/* Methodz Meeting Manager v1.4 recipient-specific export policy registry and field allow-list enforcement. */
(function initializeMethodzRecipientPolicyV14(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const policyConfig = config.recipientPolicy || {};
  const storageKey = config.storageKeys?.recipientPolicies || "methodzRecipientExportPolicies";
  const auditKey = config.storageKeys?.recipientPolicyAudit || "methodzRecipientPolicyAudit";
  const approvalKey = config.storageKeys?.externalExportApprovals || "methodzExternalExportApprovals";
  const prefix = policyConfig.destinationPrefix || "recipient:";
  let selectedPolicyId = "";

  global.addEventListener("DOMContentLoaded", initialize);
  global.addEventListener("methodz:migrations-complete", () => {
    syncDynamicDestinations();
    renderPolicies();
  });

  function initialize() {
    installPanel();
    syncDynamicDestinations();
    patchMeetingCollection();
    patchExternalPreview();
    patchApprovalRequest();
    bindDestinationChanges();
    renderPolicies();
    updatePolicyStatus();
  }

  function fieldCatalog() {
    return Array.isArray(policyConfig.fieldCatalog) ? policyConfig.fieldCatalog : [];
  }

  function availableProfiles() {
    return Array.isArray(config.redactionProfiles) ? config.redactionProfiles : [];
  }

  function baseDestinations() {
    return (config.externalExportApproval?.destinations || []).filter((item) => !String(item?.id || "").startsWith(prefix));
  }

  function installPanel() {
    const approvalPanel = document.getElementById("externalApprovalPanelV12");
    const exportPanel = document.getElementById("externalExportPanelV11");
    const anchor = approvalPanel || exportPanel;
    if (!anchor || document.getElementById("recipientPolicyPanelV14")) return;

    const panel = document.createElement("section");
    panel.id = "recipientPolicyPanelV14";
    panel.className = "card v14-card recipient-policy-v14";
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Recipient-Specific Export Policies</h2>
          <p class="helper-text">Bind an external export to a named recipient policy and a minimum field allow-list. These browser-local policies refine the redaction profile; they never add fields that the selected profile already removed.</p>
        </div>
        <span class="release-badge-v14">v1.4</span>
      </div>

      <div class="recipient-policy-summary-v14" id="recipientPolicyStatusV14" aria-live="polite">No recipient-specific policy selected.</div>

      <div class="form-grid recipient-policy-selection-v14">
        <div>
          <label for="recipientPolicySelectV14">Saved Recipient Policy</label>
          <select id="recipientPolicySelectV14"><option value="">No saved recipient policies</option></select>
        </div>
        <div class="button-row recipient-policy-selection-actions-v14">
          <button type="button" onclick="applyRecipientPolicyToExportV14()">Apply to Export</button>
          <button type="button" onclick="editRecipientPolicyV14()">Edit Selected</button>
          <button type="button" onclick="toggleRecipientPolicyV14()">Activate / Deactivate</button>
        </div>
      </div>

      <details class="recipient-policy-editor-v14" open>
        <summary>Create or Update Recipient Policy</summary>
        <input id="recipientPolicyIdV14" type="hidden" />
        <div class="form-grid">
          <div>
            <label for="recipientPolicyLabelV14">Policy Label</label>
            <input id="recipientPolicyLabelV14" type="text" placeholder="CSW operations recipient" />
          </div>
          <div>
            <label for="recipientNameV14">Recipient / Contact</label>
            <input id="recipientNameV14" type="text" placeholder="Named recipient or accountable contact" autocomplete="name" />
          </div>
          <div>
            <label for="recipientOrganizationV14">Organization</label>
            <input id="recipientOrganizationV14" type="text" placeholder="Canadian Soft Water Corporation" />
          </div>
          <div>
            <label for="recipientContactReferenceV14">Contact Reference</label>
            <input id="recipientContactReferenceV14" type="text" placeholder="Email, role, file reference, or internal identifier" />
          </div>
          <div>
            <label for="recipientBaseDestinationV14">Base Destination Policy</label>
            <select id="recipientBaseDestinationV14">${baseDestinations().map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join("")}</select>
          </div>
          <div>
            <label for="recipientReviewDateV14">Policy Review Date</label>
            <input id="recipientReviewDateV14" type="date" />
          </div>
          <div>
            <label for="recipientPolicyStatusFieldV14">Policy Status</label>
            <select id="recipientPolicyStatusFieldV14">
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
        </div>

        <fieldset>
          <legend>Allowed Redaction Profiles</legend>
          <div class="checkbox-grid" id="recipientProfilesV14">
            ${availableProfiles().map((profile) => `<label><input type="checkbox" data-recipient-profile="${escapeHtml(profile.id)}" ${profile.id === "partner-safe" || profile.id === "custom" ? "checked" : ""} /> ${escapeHtml(profile.label)}</label>`).join("")}
          </div>
        </fieldset>

        <fieldset>
          <legend>Maximum Fields Allowed for This Recipient</legend>
          <div class="recipient-field-grid-v14" id="recipientFieldsV14">
            ${fieldCatalog().map((field) => `<label class="recipient-field-option-v14${field.sensitive ? " sensitive-field-v14" : ""}">
              <input type="checkbox" data-recipient-field="${escapeHtml(field.id)}" ${field.required || ["organizations", "agenda", "decisions", "tasks", "summary"].includes(field.id) ? "checked" : ""} ${field.required ? "disabled" : ""} />
              <span><strong>${escapeHtml(field.label)}</strong><small>${escapeHtml(field.description || "")}</small></span>
            </label>`).join("")}
          </div>
        </fieldset>

        <label for="recipientVerificationNoteV14">Verification / Policy Note</label>
        <textarea id="recipientVerificationNoteV14" class="compact-textarea-v14" placeholder="How the recipient and permitted information were verified. A meaningful note is required before discussion notes can be allowed."></textarea>

        <div class="button-row">
          <button type="button" onclick="saveRecipientPolicyV14()">Save Recipient Policy</button>
          <button type="button" onclick="resetRecipientPolicyFormV14()">New Policy</button>
          <button type="button" onclick="exportRecipientPoliciesV14()">Export Policies JSON</button>
          <label class="button-like" for="importRecipientPoliciesFileV14">Import Policies JSON</label>
          <button type="button" onclick="exportRecipientPolicyAuditV14()">Export Policy Audit</button>
        </div>
        <input id="importRecipientPoliciesFileV14" class="import-control" type="file" accept="application/json,.json" onchange="importRecipientPoliciesV14(event)" />
      </details>

      <div id="recipientPolicyListV14" class="recipient-policy-list-v14"></div>
    `;

    anchor.insertAdjacentElement("afterend", panel);
    document.getElementById("recipientPolicySelectV14")?.addEventListener("change", (event) => {
      selectedPolicyId = event.target.value || "";
      updatePolicyStatus();
    });
  }

  function normalizePolicy(input) {
    const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
    const validProfileIds = new Set(availableProfiles().map((item) => item.id));
    const validFieldIds = new Set(fieldCatalog().map((item) => item.id));
    const allowedFields = Array.from(new Set(["core", ...(Array.isArray(source.allowedFields) ? source.allowedFields : [])]))
      .filter((item) => validFieldIds.has(item));
    const allowedProfiles = Array.from(new Set(Array.isArray(source.allowedProfiles) ? source.allowedProfiles : []))
      .filter((item) => validProfileIds.has(item));
    const baseIds = new Set(baseDestinations().map((item) => item.id));

    return {
      id: String(source.id || `recipient-policy-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      label: String(source.label || "").trim(),
      recipientName: String(source.recipientName || "").trim(),
      organization: String(source.organization || "").trim(),
      contactReference: String(source.contactReference || "").trim(),
      baseDestinationId: baseIds.has(source.baseDestinationId) ? source.baseDestinationId : (baseDestinations()[0]?.id || "other-external"),
      allowedProfiles: allowedProfiles.length ? allowedProfiles : ["partner-safe"],
      allowedFields,
      allowedCustomSections: customSectionsForFields(allowedFields),
      status: source.status === "Inactive" ? "Inactive" : "Active",
      reviewDate: String(source.reviewDate || ""),
      verificationNote: String(source.verificationNote || "").trim(),
      createdAt: source.createdAt || new Date().toISOString(),
      updatedAt: source.updatedAt || new Date().toISOString()
    };
  }

  function validatePolicy(policy, options = {}) {
    const errors = [];
    if (!policy.label) errors.push("Enter a policy label.");
    if (!policy.recipientName) errors.push("Enter a named recipient or accountable contact.");
    if (!policy.allowedProfiles.length) errors.push("Select at least one allowed redaction profile.");
    if (!policy.allowedFields.includes("core")) errors.push("Core meeting information must remain in the allow-list.");
    if (policy.allowedFields.includes("discussion-notes") && policy.verificationNote.length < 12) {
      errors.push("Add a meaningful verification note before allowing discussion notes.");
    }
    if (options.requireActive && policy.status !== "Active") errors.push("This recipient policy is inactive.");
    if (options.requireCurrent && isReviewExpired(policy)) errors.push("This recipient policy is past its review date. Update and review the policy before use.");
    return { valid: errors.length === 0, errors };
  }

  function readPolicies() {
    return readJson(storageKey, []).map(normalizePolicy);
  }

  function writePolicies(policies) {
    const maximum = Number(policyConfig.maximumPolicies || 200);
    const normalized = policies.map(normalizePolicy).slice(-maximum);
    global.localStorage.setItem(storageKey, JSON.stringify(normalized));
    syncDynamicDestinations();
    renderPolicies();
    return normalized;
  }

  function readAudit() {
    return readJson(auditKey, []);
  }

  function appendAudit(action, policy, detail = {}) {
    const events = readAudit();
    events.push({
      id: `recipient-policy-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      at: new Date().toISOString(),
      policyId: policy?.id || "",
      policyLabel: policy?.label || "",
      recipientName: policy?.recipientName || "",
      organization: policy?.organization || "",
      ...clone(detail)
    });
    global.localStorage.setItem(auditKey, JSON.stringify(events.slice(-2000)));
  }

  function savePolicy() {
    try {
      const currentId = readValue("recipientPolicyIdV14");
      const existing = currentId ? readPolicies().find((item) => item.id === currentId) : null;
      const policy = normalizePolicy({
        ...existing,
        id: currentId || undefined,
        label: readValue("recipientPolicyLabelV14"),
        recipientName: readValue("recipientNameV14"),
        organization: readValue("recipientOrganizationV14"),
        contactReference: readValue("recipientContactReferenceV14"),
        baseDestinationId: readValue("recipientBaseDestinationV14"),
        allowedProfiles: checkedValues("[data-recipient-profile]", "recipientProfile"),
        allowedFields: checkedValues("[data-recipient-field]", "recipientField"),
        status: readValue("recipientPolicyStatusFieldV14") || "Active",
        reviewDate: readValue("recipientReviewDateV14"),
        verificationNote: readValue("recipientVerificationNoteV14"),
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      const validation = validatePolicy(policy);
      if (!validation.valid) throw new Error(validation.errors.join(" "));

      const policies = readPolicies();
      const index = policies.findIndex((item) => item.id === policy.id);
      if (index >= 0) policies[index] = policy;
      else policies.push(policy);
      writePolicies(policies);
      selectedPolicyId = policy.id;
      appendAudit(index >= 0 ? "policy-updated" : "policy-created", policy, {
        allowedProfiles: policy.allowedProfiles,
        allowedFields: policy.allowedFields,
        reviewDate: policy.reviewDate
      });
      renderPolicies();
      setPolicyStatus(`Saved recipient policy “${policy.label}”. Apply it to the external export before requesting approval.`, "ready");
      return policy;
    } catch (error) {
      return handleError(error);
    }
  }

  function editSelectedPolicy() {
    const policy = selectedPolicy();
    if (!policy) return handleError(new Error("Select a recipient policy to edit."));
    setValue("recipientPolicyIdV14", policy.id);
    setValue("recipientPolicyLabelV14", policy.label);
    setValue("recipientNameV14", policy.recipientName);
    setValue("recipientOrganizationV14", policy.organization);
    setValue("recipientContactReferenceV14", policy.contactReference);
    setValue("recipientBaseDestinationV14", policy.baseDestinationId);
    setValue("recipientReviewDateV14", policy.reviewDate);
    setValue("recipientPolicyStatusFieldV14", policy.status);
    setValue("recipientVerificationNoteV14", policy.verificationNote);
    document.querySelectorAll("[data-recipient-profile]").forEach((input) => {
      input.checked = policy.allowedProfiles.includes(input.dataset.recipientProfile);
    });
    document.querySelectorAll("[data-recipient-field]").forEach((input) => {
      input.checked = policy.allowedFields.includes(input.dataset.recipientField);
    });
    document.querySelector(".recipient-policy-editor-v14")?.setAttribute("open", "");
    document.getElementById("recipientPolicyLabelV14")?.focus();
    setPolicyStatus(`Editing “${policy.label}”.`, "ready");
    return policy;
  }

  function resetPolicyForm() {
    [
      "recipientPolicyIdV14",
      "recipientPolicyLabelV14",
      "recipientNameV14",
      "recipientOrganizationV14",
      "recipientContactReferenceV14",
      "recipientReviewDateV14",
      "recipientVerificationNoteV14"
    ].forEach((id) => setValue(id, ""));
    setValue("recipientBaseDestinationV14", baseDestinations()[0]?.id || "other-external");
    setValue("recipientPolicyStatusFieldV14", "Active");
    document.querySelectorAll("[data-recipient-profile]").forEach((input) => {
      input.checked = input.dataset.recipientProfile === "partner-safe" || input.dataset.recipientProfile === "custom";
    });
    document.querySelectorAll("[data-recipient-field]").forEach((input) => {
      input.checked = input.disabled || ["organizations", "agenda", "decisions", "tasks", "summary"].includes(input.dataset.recipientField);
    });
    setPolicyStatus("New recipient policy form ready.", "ready");
  }

  function toggleSelectedPolicy() {
    const policy = selectedPolicy();
    if (!policy) return handleError(new Error("Select a recipient policy first."));
    policy.status = policy.status === "Active" ? "Inactive" : "Active";
    policy.updatedAt = new Date().toISOString();
    writePolicies(readPolicies().map((item) => item.id === policy.id ? policy : item));
    appendAudit(policy.status === "Active" ? "policy-activated" : "policy-deactivated", policy);
    setPolicyStatus(`${policy.label} is now ${policy.status.toLowerCase()}.`, policy.status === "Active" ? "ready" : "warning");
    return policy;
  }

  function selectedPolicy() {
    const id = selectedPolicyId || readValue("recipientPolicySelectV14");
    return readPolicies().find((item) => item.id === id) || null;
  }

  function dynamicDestinationId(policyOrId) {
    const id = typeof policyOrId === "string" ? policyOrId : policyOrId?.id;
    return id ? `${prefix}${id}` : "";
  }

  function policyFromDestination(destinationId = readValue("externalDestinationV12")) {
    if (!String(destinationId).startsWith(prefix)) return null;
    return readPolicies().find((item) => dynamicDestinationId(item) === destinationId) || null;
  }

  function syncDynamicDestinations() {
    const approvalConfig = config.externalExportApproval || (config.externalExportApproval = {});
    const destinations = Array.isArray(approvalConfig.destinations) ? approvalConfig.destinations : [];
    const base = destinations.filter((item) => !String(item?.id || "").startsWith(prefix));
    const dynamic = readPolicies()
      .filter((policy) => policy.status === "Active")
      .map((policy) => ({
        id: dynamicDestinationId(policy),
        label: `${policy.label} • ${policy.organization || policy.recipientName}`,
        allowedProfiles: [...policy.allowedProfiles],
        allowedCustomSections: [...policy.allowedCustomSections],
        note: `Named recipient: ${policy.recipientName}. Maximum fields: ${policy.allowedFields.join(", ")}. Review date: ${policy.reviewDate || "not set"}.`
      }));
    destinations.splice(0, destinations.length, ...base, ...dynamic);
    approvalConfig.destinations = destinations;
    refreshDestinationSelect();
  }

  function refreshDestinationSelect() {
    const select = document.getElementById("externalDestinationV12");
    if (!select) return;
    const current = select.value;
    const destinations = config.externalExportApproval?.destinations || [];
    select.innerHTML = destinations.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.label)}</option>`).join("");
    select.value = destinations.some((item) => item.id === current) ? current : (destinations[0]?.id || "");
  }

  function applySelectedPolicyToExport() {
    try {
      const policy = selectedPolicy();
      if (!policy) throw new Error("Select a recipient policy first.");
      assertPolicyUsable(policy);
      syncDynamicDestinations();
      const destination = document.getElementById("externalDestinationV12");
      if (!destination) throw new Error("External export approval controls are unavailable.");
      destination.value = dynamicDestinationId(policy);
      destination.dispatchEvent(new Event("change", { bubbles: true }));

      const profile = document.getElementById("externalProfileV11");
      if (profile && !policy.allowedProfiles.includes(profile.value)) {
        profile.value = policy.allowedProfiles[0];
        profile.dispatchEvent(new Event("change", { bubbles: true }));
      }
      applyCustomSectionControls(policy);
      selectedPolicyId = policy.id;
      renderPolicies();
      appendAudit("policy-applied-to-export", policy, { destinationPolicyId: dynamicDestinationId(policy) });
      setPolicyStatus(`Applied “${policy.label}” to the export. Approval fingerprints will now be bound to destination ${dynamicDestinationId(policy)}.`, "ready");
      document.getElementById("externalExportPanelV11")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
      return policy;
    } catch (error) {
      return handleError(error);
    }
  }

  function applyCustomSectionControls(policy) {
    const allowed = new Set(policy.allowedCustomSections);
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
      if (input && input.checked && !allowed.has(section)) input.checked = false;
    });
  }

  function assertPolicyUsable(policy, profileId = readValue("externalProfileV11")) {
    const validation = validatePolicy(policy, { requireActive: true, requireCurrent: true });
    if (!validation.valid) throw new Error(validation.errors.join(" "));
    if (profileId && !policy.allowedProfiles.includes(profileId)) {
      throw new Error(`${policy.label} does not allow the ${profileId} redaction profile.`);
    }
    return true;
  }

  function patchExternalPreview() {
    if (global.__methodzV14PreviewPatched || typeof global.previewExternalExportV11 !== "function") return;
    const original = global.previewExternalExportV11;
    global.previewExternalExportV11 = async function previewExternalExportRecipientPolicyV14(...args) {
      const destinationId = readValue("externalDestinationV12");
      const policy = policyFromDestination(destinationId);
      if (String(destinationId).startsWith(prefix) && !policy) {
        return handleError(new Error("The selected recipient policy no longer exists. Choose another destination policy."));
      }
      if (policy) {
        try {
          assertPolicyUsable(policy, readValue("externalProfileV11") || "partner-safe");
        } catch (error) {
          return handleError(error);
        }
      }

      const payload = await original.apply(this, args);
      if (!payload || !policy) return payload;
      applyPolicyToPayload(payload, policy);
      const unsigned = clone(payload);
      delete unsigned.integrity;
      payload.integrity = await global.MethodzRedactionV11.computeIntegrity(unsigned);
      renderRecipientPreview(payload, policy);
      return payload;
    };
    global.__methodzV14PreviewPatched = true;
  }

  function applyPolicyToPayload(payload, policyInput) {
    const policy = normalizePolicy(policyInput);
    const record = payload?.record && typeof payload.record === "object" ? payload.record : {};
    const allowedTopLevel = new Set(["externalCopy"]);
    fieldCatalog().forEach((field) => {
      if (policy.allowedFields.includes(field.id)) {
        (field.topLevelFields || []).forEach((name) => allowedTopLevel.add(name));
      }
    });

    const removed = new Set(Array.isArray(payload?.manifest?.removedPaths) ? payload.manifest.removedPaths : []);
    Object.keys(record).forEach((name) => {
      if (!allowedTopLevel.has(name)) {
        delete record[name];
        removed.add(name);
      }
    });

    record.externalCopy = {
      ...(record.externalCopy || {}),
      recipientPolicyId: policy.id,
      recipientPolicyLabel: policy.label,
      recipientName: policy.recipientName,
      recipientOrganization: policy.organization,
      policyAppliedAt: new Date().toISOString()
    };
    payload.manifest = payload.manifest || {};
    payload.manifest.removedPaths = Array.from(removed).sort();
    payload.manifest.recipientPolicy = policySnapshot(policy);
    payload.manifest.warnings = Array.from(new Set([
      ...(payload.manifest.warnings || []),
      "Recipient field allow-list enforced after profile redaction. The policy cannot restore fields removed by the redaction profile."
    ]));
    return payload;
  }

  function renderRecipientPreview(payload, policy) {
    const body = document.getElementById("externalExportPreviewBodyV11");
    if (body) body.textContent = JSON.stringify(payload, null, 2);
    const status = document.getElementById("externalExportStatusV11");
    if (status) {
      status.textContent = `Recipient policy “${policy.label}” enforced for ${policy.recipientName}. ${payload.manifest?.removedPaths?.length || 0} field path(s) removed. Integrity: ${payload.integrity?.algorithm || "unknown"}.`;
      status.dataset.state = "ready";
    }
  }

  function patchApprovalRequest() {
    if (global.__methodzV14ApprovalRequestPatched || typeof global.requestExternalApprovalV12 !== "function") return;
    const original = global.requestExternalApprovalV12;
    global.requestExternalApprovalV12 = async function requestExternalApprovalRecipientPolicyV14(...args) {
      const destinationId = readValue("externalDestinationV12");
      const policy = policyFromDestination(destinationId);
      if (String(destinationId).startsWith(prefix)) {
        try {
          if (!policy) throw new Error("The selected recipient policy is unavailable.");
          assertPolicyUsable(policy, readValue("externalProfileV11") || "partner-safe");
        } catch (error) {
          return handleError(error);
        }
      }

      const request = await original.apply(this, args);
      if (!request || !policy) return request;
      const approvals = readJson(approvalKey, []);
      const index = approvals.findIndex((item) => item.id === request.id);
      const augmented = {
        ...(index >= 0 ? approvals[index] : request),
        recipientPolicyId: policy.id,
        recipientPolicySnapshot: policySnapshot(policy)
      };
      if (index >= 0) approvals[index] = augmented;
      else approvals.push(augmented);
      global.localStorage.setItem(approvalKey, JSON.stringify(approvals));
      appendAudit("approval-request-bound", policy, {
        approvalId: request.id,
        destinationPolicyId: destinationId,
        contentFingerprint: request.contentFingerprint?.digest || ""
      });
      setPolicyStatus(`Approval ${request.id} is bound to recipient policy “${policy.label}”.`, "ready");
      return augmented;
    };
    global.__methodzV14ApprovalRequestPatched = true;
  }

  function patchMeetingCollection() {
    if (global.__methodzV14CollectionPatched || typeof global.collectMeetingData !== "function") return;
    const original = global.collectMeetingData;
    global.collectMeetingData = function collectMeetingDataRecipientPolicyV14(...args) {
      const record = original.apply(this, args);
      const selected = policyFromDestination(readValue("externalDestinationV12")) || selectedPolicy();
      const previous = record.externalRecipientControl || {};
      return {
        ...record,
        externalRecipientControl: {
          policyRequired: previous.policyRequired === true || Boolean(selected),
          defaultRecipientPolicyId: selected?.id || previous.defaultRecipientPolicyId || "",
          lastRecipientPolicyId: previous.lastRecipientPolicyId || "",
          lastRecipientPolicyLabel: previous.lastRecipientPolicyLabel || "",
          lastRecipientPolicyAppliedAt: previous.lastRecipientPolicyAppliedAt || ""
        }
      };
    };
    global.__methodzV14CollectionPatched = true;
  }

  function bindDestinationChanges() {
    document.getElementById("externalDestinationV12")?.addEventListener("change", () => {
      const policy = policyFromDestination();
      if (policy) {
        selectedPolicyId = policy.id;
        const select = document.getElementById("recipientPolicySelectV14");
        if (select) select.value = policy.id;
      }
      updatePolicyStatus();
    });
  }

  function renderPolicies() {
    const policies = readPolicies().sort((left, right) => left.label.localeCompare(right.label));
    const select = document.getElementById("recipientPolicySelectV14");
    if (select) {
      const current = selectedPolicyId || select.value;
      select.innerHTML = policies.length
        ? policies.map((policy) => `<option value="${escapeHtml(policy.id)}">${escapeHtml(policy.status)} • ${escapeHtml(policy.label)} • ${escapeHtml(policy.recipientName)}</option>`).join("")
        : '<option value="">No saved recipient policies</option>';
      if (policies.some((item) => item.id === current)) select.value = current;
      selectedPolicyId = select.value || "";
    }

    const list = document.getElementById("recipientPolicyListV14");
    if (!list) return;
    if (!policies.length) {
      list.innerHTML = '<p class="helper-text">No recipient-specific policies yet. Create one before using a named recipient destination.</p>';
      updatePolicyStatus();
      return;
    }

    list.innerHTML = policies.map((policy) => {
      const expired = isReviewExpired(policy);
      const selected = policy.id === selectedPolicyId ? " selected-recipient-policy-v14" : "";
      return `<article class="recipient-policy-card-v14${selected}" data-status="${escapeHtml(policy.status.toLowerCase())}">
        <div class="recipient-policy-card-heading-v14">
          <strong>${escapeHtml(policy.label)}</strong>
          <span>${escapeHtml(policy.status)}${expired ? " • Review overdue" : ""}</span>
        </div>
        <p>${escapeHtml(policy.recipientName)}${policy.organization ? ` • ${escapeHtml(policy.organization)}` : ""}</p>
        <dl>
          <dt>Profiles</dt><dd>${escapeHtml(policy.allowedProfiles.join(", "))}</dd>
          <dt>Allowed fields</dt><dd>${escapeHtml(policy.allowedFields.join(", "))}</dd>
          <dt>Review date</dt><dd>${escapeHtml(policy.reviewDate || "Not set")}</dd>
          <dt>Destination ID</dt><dd><code>${escapeHtml(dynamicDestinationId(policy))}</code></dd>
        </dl>
        <button type="button" data-policy-id="${escapeHtml(policy.id)}">Select</button>
      </article>`;
    }).join("");

    list.querySelectorAll("button[data-policy-id]").forEach((button) => {
      button.addEventListener("click", () => {
        selectedPolicyId = button.dataset.policyId || "";
        if (select) select.value = selectedPolicyId;
        renderPolicies();
        updatePolicyStatus();
      });
    });
    updatePolicyStatus();
  }

  function updatePolicyStatus() {
    const policy = policyFromDestination() || selectedPolicy();
    if (!policy) {
      setPolicyStatus("No recipient-specific policy selected. Generic destination policies remain available.", "");
      return;
    }
    const expired = isReviewExpired(policy);
    setPolicyStatus(
      `${policy.label} • ${policy.recipientName} • ${policy.status}${expired ? " • Review overdue" : ""} • ${policy.allowedFields.length} allowed field group(s).`,
      policy.status !== "Active" || expired ? "warning" : "ready"
    );
  }

  function exportPolicies() {
    const packageValue = {
      packageType: "methodz-recipient-export-policies",
      packageVersion: 1,
      schemaVersion: "1.4.0",
      exportedAt: new Date().toISOString(),
      policies: readPolicies()
    };
    downloadJson(packageValue, `methodz-recipient-policies-${today()}.json`);
  }

  function importPolicies(event) {
    const input = event?.target;
    const file = input?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const incoming = Array.isArray(parsed) ? parsed : parsed.policies;
        if (!Array.isArray(incoming)) throw new Error("The selected file does not contain a recipient policy array.");
        const current = readPolicies();
        const merged = new Map(current.map((item) => [item.id, item]));
        incoming.map(normalizePolicy).forEach((policy) => {
          const validation = validatePolicy(policy);
          if (!validation.valid) throw new Error(`Policy “${policy.label || policy.id}” is invalid: ${validation.errors.join(" ")}`);
          const local = merged.get(policy.id);
          if (!local || Date.parse(policy.updatedAt || 0) >= Date.parse(local.updatedAt || 0)) merged.set(policy.id, policy);
        });
        const result = writePolicies(Array.from(merged.values()));
        appendAudit("policy-package-imported", null, { importedCount: incoming.length, resultingCount: result.length });
        setPolicyStatus(`Imported ${incoming.length} recipient policy record(s).`, "ready");
      } catch (error) {
        handleError(error);
      } finally {
        if (input) input.value = "";
      }
    };
    reader.readAsText(file);
  }

  function exportAudit() {
    downloadJson({
      packageType: "methodz-recipient-policy-audit",
      packageVersion: 1,
      exportedAt: new Date().toISOString(),
      events: readAudit()
    }, `methodz-recipient-policy-audit-${today()}.json`);
  }

  function policySnapshot(policy) {
    return {
      id: policy.id,
      label: policy.label,
      recipientName: policy.recipientName,
      organization: policy.organization,
      baseDestinationId: policy.baseDestinationId,
      allowedProfiles: [...policy.allowedProfiles],
      allowedFields: [...policy.allowedFields],
      allowedCustomSections: [...policy.allowedCustomSections],
      status: policy.status,
      reviewDate: policy.reviewDate,
      policyUpdatedAt: policy.updatedAt,
      notice: "Browser-local recipient policy snapshot. This metadata does not authenticate the recipient or prove delivery."
    };
  }

  function customSectionsForFields(fieldIds) {
    const allowed = new Set(fieldIds);
    return fieldCatalog()
      .filter((field) => allowed.has(field.id) && field.customSection)
      .map((field) => field.customSection);
  }

  function checkedValues(selector, datasetKey) {
    return Array.from(document.querySelectorAll(selector))
      .filter((input) => input.checked)
      .map((input) => input.dataset[datasetKey])
      .filter(Boolean);
  }

  function isReviewExpired(policy) {
    if (!policy?.reviewDate) return false;
    const endOfDay = Date.parse(`${policy.reviewDate}T23:59:59.999`);
    return Number.isFinite(endOfDay) && endOfDay < Date.now();
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

  function downloadJson(value, filename) {
    if (typeof global.downloadBlob === "function") {
      global.downloadBlob(JSON.stringify(value, null, 2), filename, "application/json");
      return;
    }
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function setPolicyStatus(message, state) {
    const element = document.getElementById("recipientPolicyStatusV14");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state || "";
  }

  function handleError(error) {
    const message = error?.message || String(error);
    setPolicyStatus(message, "error");
    alert(message);
    return null;
  }

  function readValue(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value == null ? "" : String(value);
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

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function prefersReducedMotion() {
    return global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches || false;
  }

  global.saveRecipientPolicyV14 = savePolicy;
  global.editRecipientPolicyV14 = editSelectedPolicy;
  global.resetRecipientPolicyFormV14 = resetPolicyForm;
  global.toggleRecipientPolicyV14 = toggleSelectedPolicy;
  global.applyRecipientPolicyToExportV14 = applySelectedPolicyToExport;
  global.exportRecipientPoliciesV14 = exportPolicies;
  global.importRecipientPoliciesV14 = importPolicies;
  global.exportRecipientPolicyAuditV14 = exportAudit;
  global.MethodzRecipientPolicyV14 = {
    version: "1.4.0",
    readPolicies,
    writePolicies,
    normalizePolicy,
    validatePolicy,
    dynamicDestinationId,
    policyFromDestination,
    applyPolicyToPayload,
    policySnapshot,
    syncDynamicDestinations,
    isReviewExpired
  };
})(window);
