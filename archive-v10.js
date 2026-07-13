/* Methodz Meeting Manager v1.0 archive governance and consent details. */
(function enhanceArchiveV10(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const roleContextKey = config.storageKeys?.roleContext || "methodzMeetingRoleContext";

  global.addEventListener("DOMContentLoaded", initializeArchiveV10);

  function initializeArchiveV10() {
    const record = typeof activeArchiveRecordV07 !== "undefined" ? activeArchiveRecordV07 : null;
    if (!record || !document.getElementById("archiveRecord") || document.getElementById("archiveGovernanceV10")) return;
    renderArchiveGovernanceV10(record);
    renderArchiveConsentV10(record);
    applyArchiveRolePolicyV10(record);
  }

  function renderArchiveGovernanceV10(record) {
    const auditCard = document.querySelector(".archive-record-audit");
    if (!auditCard) return;
    const access = record.accessControl || {};
    const section = document.createElement("section");
    section.id = "archiveGovernanceV10";
    section.className = "card archive-governance-v10";
    section.innerHTML = `
      <h2>Record Governance</h2>
      <dl class="archive-definition-grid">
        ${definitionV10("Classification", access.classification || "Internal")}
        ${definitionV10("Policy", access.policyId || "standard")}
        ${definitionV10("Allowed Roles", (access.allowedRoles || []).join(", ") || "Not specified")}
        ${definitionV10("Prepared By", access.preparedBy || "Not listed")}
        ${definitionV10("Reviewed By", access.reviewedBy || "Not listed")}
        ${definitionV10("Review Status", access.reviewStatus || "Not Reviewed")}
        ${definitionV10("Protected Areas", (access.protectedFields || []).join(", ") || "None selected")}
        ${definitionV10("Policy Note", access.policyNote || "None")}
      </dl>
      <p class="helper-text">These are record workflow controls. A hosted provider must enforce authenticated permissions independently.</p>
    `;
    auditCard.insertAdjacentElement("beforebegin", section);
  }

  function renderArchiveConsentV10(record) {
    const attendanceSection = document.getElementById("archiveAttendance")?.closest(".card");
    if (!attendanceSection) return;
    const attendees = Array.isArray(record.attendees) ? record.attendees : [];
    const section = document.createElement("div");
    section.id = "archiveConsentV10";
    section.className = "archive-consent-v10";
    section.innerHTML = `
      <h3>Consent and Verification Detail</h3>
      ${attendees.length ? `
        <div class="archive-table-wrap">
          <table class="compact-table archive-table">
            <thead><tr><th>Attendee</th><th>Consent</th><th>Consent Version</th><th>Verification</th><th>Verified By</th><th>Verification Note</th></tr></thead>
            <tbody>
              ${attendees.map((person) => `
                <tr>
                  <td>${escapeArchiveV10(person.name || "Unnamed")}</td>
                  <td>${person.signatureConsent?.accepted ? "Recorded" : "Not recorded"}</td>
                  <td>${escapeArchiveV10(person.signatureConsent?.statementVersion || "Not listed")}</td>
                  <td>${escapeArchiveV10(person.signatureVerification?.status || "Unverified")}</td>
                  <td>${escapeArchiveV10(person.signatureVerification?.verifiedBy || "Not listed")}</td>
                  <td>${escapeArchiveV10(person.signatureVerification?.note || "None")}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      ` : "<p>No attendees were listed.</p>"}
    `;
    attendanceSection.appendChild(section);
  }

  function applyArchiveRolePolicyV10(record) {
    const role = global.localStorage.getItem(roleContextKey) || "Administrator";
    const policyId = record.accessControl?.policyId || "standard";
    const policy = (config.recordPolicies || []).find((item) => item.id === policyId);
    const recordRoles = Array.isArray(record.accessControl?.allowedRoles) ? record.accessControl.allowedRoles : [];
    const recordAllows = !recordRoles.length || recordRoles.includes(role);
    const canEdit = recordAllows && Array.isArray(policy?.actions?.edit) && policy.actions.edit.includes(role);
    const canExport = recordAllows && Array.isArray(policy?.actions?.export) && policy.actions.export.includes(role);

    const editButton = document.getElementById("archiveEditButton");
    if (editButton && !record.archivePreview) {
      editButton.disabled = !canEdit;
      if (!canEdit) editButton.title = `${role} is not allowed to edit this record.`;
    }

    const downloadButton = Array.from(document.querySelectorAll(".archive-toolbar button"))
      .find((button) => button.getAttribute("onclick")?.includes("downloadArchiveRecordV07"));
    if (downloadButton) {
      downloadButton.disabled = !canExport;
      if (!canExport) downloadButton.title = `${role} is not allowed to export this record.`;
    }
  }

  function definitionV10(term, value) {
    return `<div><dt>${escapeArchiveV10(term)}</dt><dd>${escapeArchiveV10(value)}</dd></div>`;
  }

  function escapeArchiveV10(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})(window);
