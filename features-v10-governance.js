/* Methodz Meeting Manager v1.0 role-aware record governance. */
(function initializeMethodzGovernanceV10(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const roleContextKey = config.storageKeys?.roleContext || "methodzMeetingRoleContext";

  global.addEventListener("DOMContentLoaded", initializeGovernanceV10);

  function initializeGovernanceV10() {
    installGovernancePanelV10();
    patchGovernanceDataFlowV10();
    restoreGovernanceDraftV10();
    refreshGovernanceEvaluationV10();
  }

  function getRolesV10() {
    return Array.isArray(config.roles) && config.roles.length
      ? config.roles
      : ["Administrator", "Facilitator", "Recorder", "Participant", "Auditor", "Guest"];
  }

  function getPoliciesV10() {
    return Array.isArray(config.recordPolicies) && config.recordPolicies.length
      ? config.recordPolicies
      : [
        {
          id: "standard",
          label: "Standard Internal Record",
          actions: {
            view: ["Administrator", "Facilitator", "Recorder", "Participant", "Auditor"],
            edit: ["Administrator", "Facilitator", "Recorder"],
            export: ["Administrator", "Facilitator", "Recorder", "Auditor"],
            verifySignatures: ["Administrator", "Facilitator", "Auditor"]
          }
        },
        {
          id: "restricted",
          label: "Restricted Record",
          actions: {
            view: ["Administrator", "Facilitator", "Auditor"],
            edit: ["Administrator", "Facilitator"],
            export: ["Administrator", "Auditor"],
            verifySignatures: ["Administrator", "Facilitator", "Auditor"]
          }
        },
        {
          id: "read-only-archive",
          label: "Read-Only Archive",
          actions: {
            view: ["Administrator", "Facilitator", "Recorder", "Auditor"],
            edit: [],
            export: ["Administrator", "Auditor"],
            verifySignatures: []
          }
        }
      ];
  }

  function getClassificationsV10() {
    return Array.isArray(config.recordClassifications) && config.recordClassifications.length
      ? config.recordClassifications
      : ["Internal", "Confidential", "Partner Shared", "Public Summary"];
  }

  function getCurrentRoleV10() {
    return global.localStorage.getItem(roleContextKey) || "Administrator";
  }

  function setCurrentRoleV10(role) {
    const safeRole = getRolesV10().includes(role) ? role : "Administrator";
    global.localStorage.setItem(roleContextKey, safeRole);
    refreshGovernanceEvaluationV10();
    if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
    global.dispatchEvent(new CustomEvent("methodz:role-context-changed", { detail: { role: safeRole } }));
  }

  function installGovernancePanelV10() {
    const meetingInfoCard = document.getElementById("meetingTitle")?.closest(".card");
    if (!meetingInfoCard || document.getElementById("recordGovernancePanelV10")) return;

    const panel = document.createElement("section");
    panel.id = "recordGovernancePanelV10";
    panel.className = "card v10-card governance-panel-v10";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Record Roles & Policy</h2>
          <p class="helper-text">Apply workflow-level access rules to this record. These controls guide the local interface but are not a substitute for authenticated server permissions.</p>
        </div>
        <span class="release-badge-v10">v1.0</span>
      </div>

      <div class="form-grid governance-context-grid-v10">
        <div>
          <label for="workspaceRoleV10">Current Workspace Role</label>
          <select id="workspaceRoleV10">
            ${getRolesV10().map((role) => `<option value="${escapeGovernanceV10(role)}">${escapeGovernanceV10(role)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label for="recordClassificationV10">Record Classification</label>
          <select id="recordClassificationV10">
            ${getClassificationsV10().map((item) => `<option value="${escapeGovernanceV10(item)}">${escapeGovernanceV10(item)}</option>`).join("")}
          </select>
        </div>
      </div>

      <div class="form-grid">
        <div>
          <label for="recordPolicyV10">Record Policy</label>
          <select id="recordPolicyV10">
            ${getPoliciesV10().map((policy) => `<option value="${escapeGovernanceV10(policy.id)}">${escapeGovernanceV10(policy.label)}</option>`).join("")}
          </select>
        </div>
        <div>
          <label for="recordReviewStatusV10">Review Status</label>
          <select id="recordReviewStatusV10">
            <option>Not Reviewed</option>
            <option>Review Requested</option>
            <option>Reviewed</option>
            <option>Approved</option>
          </select>
        </div>
      </div>

      <div class="form-grid">
        <div>
          <label for="recordPreparedByV10">Prepared By</label>
          <input id="recordPreparedByV10" type="text" placeholder="Person preparing the record" />
        </div>
        <div>
          <label for="recordReviewedByV10">Reviewed By</label>
          <input id="recordReviewedByV10" type="text" placeholder="Person reviewing the record" />
        </div>
      </div>

      <fieldset class="governance-fieldset-v10">
        <legend>Roles Allowed to View This Record</legend>
        <div id="allowedRolesV10" class="checkbox-grid governance-role-grid-v10">
          ${getRolesV10().map((role) => `
            <label><input type="checkbox" class="allowed-role-v10" value="${escapeGovernanceV10(role)}" /> ${escapeGovernanceV10(role)}</label>
          `).join("")}
        </div>
      </fieldset>

      <fieldset class="governance-fieldset-v10">
        <legend>Protected Record Areas</legend>
        <div class="checkbox-grid">
          ${["Attendance Signatures", "Discussion Notes", "Decisions", "Follow-Up Tasks", "Attachment References"].map((field) => `
            <label><input type="checkbox" class="protected-field-v10" value="${escapeGovernanceV10(field)}" /> ${escapeGovernanceV10(field)}</label>
          `).join("")}
        </div>
      </fieldset>

      <label for="recordPolicyNoteV10">Policy Note</label>
      <textarea id="recordPolicyNoteV10" placeholder="Reason for restrictions, sharing limits, approval conditions, or retention notes..."></textarea>

      <div class="button-row">
        <button type="button" onclick="refreshGovernanceEvaluationV10()">Evaluate Current Access</button>
      </div>
      <div id="governanceEvaluationV10" class="governance-evaluation-v10" aria-live="polite"></div>
    `;

    meetingInfoCard.insertAdjacentElement("afterend", panel);

    const workspaceRole = document.getElementById("workspaceRoleV10");
    workspaceRole.value = getCurrentRoleV10();
    workspaceRole.addEventListener("change", (event) => setCurrentRoleV10(event.target.value));
    document.getElementById("recordPolicyV10")?.addEventListener("change", refreshGovernanceEvaluationV10);
    document.getElementById("recordClassificationV10")?.addEventListener("change", refreshGovernanceEvaluationV10);
    panel.addEventListener("input", scheduleGovernanceDraftV10);
    panel.addEventListener("change", scheduleGovernanceDraftV10);
  }

  function restoreGovernanceDraftV10() {
    try {
      const draftKey = config.storageKeys?.draft || "methodzMeetingDraft";
      const draft = JSON.parse(global.localStorage.getItem(draftKey));
      if (draft?.accessControl) populateGovernanceV10(draft.accessControl);
      else populateGovernanceDefaultsV10();
    } catch (error) {
      console.warn("Unable to restore v1.0 governance draft data", error);
      populateGovernanceDefaultsV10();
    }
  }

  function populateGovernanceDefaultsV10() {
    document.getElementById("workspaceRoleV10").value = getCurrentRoleV10();
    document.getElementById("recordClassificationV10").value = "Internal";
    document.getElementById("recordPolicyV10").value = "standard";
    document.getElementById("recordReviewStatusV10").value = "Not Reviewed";
    setCheckedValuesV10(".allowed-role-v10", ["Administrator", "Facilitator", "Recorder", "Auditor"]);
    setCheckedValuesV10(".protected-field-v10", ["Attendance Signatures"]);
  }

  function collectGovernanceV10() {
    const reviewStatus = readGovernanceValueV10("recordReviewStatusV10") || "Not Reviewed";
    return {
      classification: readGovernanceValueV10("recordClassificationV10") || "Internal",
      policyId: readGovernanceValueV10("recordPolicyV10") || "standard",
      allowedRoles: checkedValuesV10(".allowed-role-v10"),
      preparedBy: readGovernanceValueV10("recordPreparedByV10") || readGovernanceValueV10("meetingChair"),
      reviewedBy: readGovernanceValueV10("recordReviewedByV10"),
      reviewStatus,
      protectedFields: checkedValuesV10(".protected-field-v10"),
      policyNote: readGovernanceValueV10("recordPolicyNoteV10"),
      lastReviewedAt: ["Reviewed", "Approved"].includes(reviewStatus) ? new Date().toISOString() : ""
    };
  }

  function populateGovernanceV10(access = {}) {
    document.getElementById("recordClassificationV10").value = access.classification || "Internal";
    document.getElementById("recordPolicyV10").value = access.policyId || "standard";
    document.getElementById("recordPreparedByV10").value = access.preparedBy || "";
    document.getElementById("recordReviewedByV10").value = access.reviewedBy || "";
    document.getElementById("recordReviewStatusV10").value = access.reviewStatus || "Not Reviewed";
    document.getElementById("recordPolicyNoteV10").value = access.policyNote || "";
    setCheckedValuesV10(".allowed-role-v10", Array.isArray(access.allowedRoles) && access.allowedRoles.length
      ? access.allowedRoles
      : ["Administrator", "Facilitator", "Recorder", "Auditor"]);
    setCheckedValuesV10(".protected-field-v10", Array.isArray(access.protectedFields) ? access.protectedFields : ["Attendance Signatures"]);
    refreshGovernanceEvaluationV10();
  }

  function getPolicyV10(policyId) {
    return getPoliciesV10().find((policy) => policy.id === policyId) || getPoliciesV10()[0];
  }

  function canRolePerformV10(record, action, role = getCurrentRoleV10()) {
    const access = record?.accessControl || collectGovernanceV10();
    const policy = getPolicyV10(access.policyId || "standard");
    const allowedByPolicy = Array.isArray(policy?.actions?.[action]) && policy.actions[action].includes(role);
    const allowedByRecord = !Array.isArray(access.allowedRoles) || !access.allowedRoles.length || access.allowedRoles.includes(role);
    return Boolean(allowedByPolicy && allowedByRecord);
  }

  function refreshGovernanceEvaluationV10() {
    const body = document.getElementById("governanceEvaluationV10");
    if (!body) return;
    const role = getCurrentRoleV10();
    const draftRecord = { accessControl: collectGovernanceV10() };
    const actions = [
      ["view", "View"],
      ["edit", "Edit"],
      ["export", "Export"],
      ["verifySignatures", "Verify signatures"]
    ];
    body.innerHTML = `
      <strong>${escapeGovernanceV10(role)}</strong>
      <span>${actions.map(([action, label]) => `${escapeGovernanceV10(label)}: ${canRolePerformV10(draftRecord, action, role) ? "Allowed" : "Blocked"}`).join(" • ")}</span>
    `;
  }

  function patchGovernanceDataFlowV10() {
    if (!global.__methodzV10GovernanceCollectPatched && typeof global.collectMeetingData === "function") {
      const original = global.collectMeetingData;
      global.collectMeetingData = function collectMeetingDataGovernanceV10(options = {}) {
        const meeting = original(options);
        meeting.accessControl = collectGovernanceV10();
        meeting.releaseMetadata = {
          ...(meeting.releaseMetadata || {}),
          release: "1.0.0",
          roleContextAtSave: getCurrentRoleV10()
        };
        return meeting;
      };
      global.__methodzV10GovernanceCollectPatched = true;
    }

    if (!global.__methodzV10GovernancePopulatePatched && typeof global.populateForm === "function") {
      const original = global.populateForm;
      global.populateForm = function populateFormGovernanceV10(record, options = {}) {
        original(record, options);
        populateGovernanceV10(record.accessControl || {});
      };
      global.__methodzV10GovernancePopulatePatched = true;
    }

    if (!global.__methodzV10GovernanceResetPatched && typeof global.resetForm === "function") {
      const original = global.resetForm;
      global.resetForm = function resetFormGovernanceV10() {
        original();
        populateGovernanceDefaultsV10();
        refreshGovernanceEvaluationV10();
      };
      global.__methodzV10GovernanceResetPatched = true;
    }

    if (!global.__methodzV10GovernanceSavePatched && typeof global.saveMeeting === "function") {
      const original = global.saveMeeting;
      global.saveMeeting = function saveMeetingGovernanceV10(...args) {
        const editingId = document.getElementById("editingRecordId")?.value || "";
        const record = editingId && typeof global.getRecords === "function"
          ? global.getRecords().find((item) => item.id === editingId)
          : null;
        if (record && !canRolePerformV10(record, "edit")) {
          alert(`The ${getCurrentRoleV10()} role is not allowed to save changes to this record.`);
          return;
        }
        return original.apply(this, args);
      };
      global.__methodzV10GovernanceSavePatched = true;
    }

    if (!global.__methodzV10GovernanceTextPatched && typeof global.createPlainTextMeeting === "function") {
      const original = global.createPlainTextMeeting;
      global.createPlainTextMeeting = function createPlainTextMeetingGovernanceV10(meeting) {
        const access = meeting.accessControl || {};
        return `${original(meeting)}\nRECORD GOVERNANCE\nClassification: ${access.classification || "Internal"}\nPolicy: ${access.policyId || "standard"}\nAllowed Roles: ${(access.allowedRoles || []).join(", ") || "Not specified"}\nPrepared By: ${access.preparedBy || "Not listed"}\nReviewed By: ${access.reviewedBy || "Not listed"}\nReview Status: ${access.reviewStatus || "Not Reviewed"}\nPolicy Note: ${access.policyNote || "None"}\n`;
      };
      global.__methodzV10GovernanceTextPatched = true;
    }

    if (!global.__methodzV10GovernanceCardsPatched && typeof global.createRecordCard === "function") {
      const original = global.createRecordCard;
      global.createRecordCard = function createRecordCardGovernanceV10(record) {
        const card = original(record);
        const header = card.querySelector(".saved-record-header");
        if (header && !header.querySelector(".governance-badge-v10")) {
          const badge = document.createElement("span");
          badge.className = "governance-badge-v10";
          badge.textContent = record.accessControl?.classification || "Internal";
          header.appendChild(badge);
        }
        return card;
      };
      global.__methodzV10GovernanceCardsPatched = true;
    }

    if (!global.__methodzV10GovernanceEditPatched && typeof global.loadRecordForEditing === "function") {
      const original = global.loadRecordForEditing;
      global.loadRecordForEditing = function loadRecordForEditingGovernanceV10(recordId) {
        const record = typeof global.getRecords === "function" ? global.getRecords().find((item) => item.id === recordId) : null;
        if (record && !canRolePerformV10(record, "edit")) {
          alert(`The ${getCurrentRoleV10()} role is not allowed to edit this record under its current policy.`);
          return;
        }
        return original(recordId);
      };
      global.__methodzV10GovernanceEditPatched = true;
    }

    if (!global.__methodzV10GovernanceExportPatched && typeof global.downloadSavedRecord === "function") {
      const original = global.downloadSavedRecord;
      global.downloadSavedRecord = function downloadSavedRecordGovernanceV10(recordId) {
        const record = typeof global.getRecords === "function" ? global.getRecords().find((item) => item.id === recordId) : null;
        if (record && !canRolePerformV10(record, "export")) {
          alert(`The ${getCurrentRoleV10()} role is not allowed to export this record under its current policy.`);
          return;
        }
        return original(recordId);
      };
      global.__methodzV10GovernanceExportPatched = true;
    }
  }

  function setCheckedValuesV10(selector, values) {
    const selected = new Set(values || []);
    document.querySelectorAll(selector).forEach((input) => {
      input.checked = selected.has(input.value);
    });
  }

  function checkedValuesV10(selector) {
    return Array.from(document.querySelectorAll(selector)).filter((input) => input.checked).map((input) => input.value);
  }

  function readGovernanceValueV10(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function scheduleGovernanceDraftV10() {
    if (typeof global.scheduleDraftSave === "function") global.scheduleDraftSave();
  }

  function escapeGovernanceV10(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  global.refreshGovernanceEvaluationV10 = refreshGovernanceEvaluationV10;
  global.MethodzGovernanceV10 = {
    version: "1.0.0",
    getCurrentRole: getCurrentRoleV10,
    setCurrentRole: setCurrentRoleV10,
    getPolicies: () => JSON.parse(JSON.stringify(getPoliciesV10())),
    collectAccessControl: collectGovernanceV10,
    canRolePerform: canRolePerformV10
  };
})(window);
