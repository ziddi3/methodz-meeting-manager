/* Methodz Meeting Manager v1.1 archive retention details. */
(function enhanceArchiveV11(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};

  global.addEventListener("DOMContentLoaded", initializeArchiveV11);

  function initializeArchiveV11() {
    const record = typeof activeArchiveRecordV07 !== "undefined" ? activeArchiveRecordV07 : null;
    if (!record || !document.getElementById("archiveRecord") || document.getElementById("archiveRetentionV11")) return;
    renderRetention(record);
  }

  function renderRetention(record) {
    const auditCard = document.querySelector(".archive-record-audit");
    if (!auditCard) return;
    const retention = record.retentionMetadata || {};
    const hold = retention.legalHold || {};
    const policy = (config.retentionPolicies || []).find((item) => item.id === retention.policyId);
    const section = document.createElement("section");
    section.id = "archiveRetentionV11";
    section.className = `card archive-retention-detail-v11 ${hold.active ? "archive-hold-active-v11" : ""}`;
    section.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Retention & Preservation Status</h2>
          <p class="helper-text">Record lifecycle metadata captured with the controlled source record.</p>
        </div>
        <span class="${hold.active ? "hold-badge-v11" : "retention-badge-v11"}">${hold.active ? "Legal Hold" : "Retention Tracked"}</span>
      </div>
      <dl class="archive-definition-grid">
        ${definition("Policy", policy?.label || retention.policyId || "Not assigned")}
        ${definition("Review Date", retention.reviewDate || "Not scheduled")}
        ${definition("Lifecycle Status", retention.lifecycleStatus || "Active")}
        ${definition("Retention Note", retention.note || "None")}
        ${definition("Legal Hold", hold.active ? "Active" : "Not active")}
        ${definition("Hold Reason", hold.active ? hold.reason || "Not listed" : "Not applicable")}
        ${definition("Placed By", hold.active ? hold.placedBy || "Not listed" : "Not applicable")}
        ${definition("Placed At", hold.active ? formatDate(hold.placedAt) : "Not applicable")}
        ${definition("Released By", hold.releasedBy || "Not recorded")}
        ${definition("Released At", hold.releasedAt ? formatDate(hold.releasedAt) : "Not recorded")}
      </dl>
      ${hold.active ? '<p class="archive-hold-warning-v11">Permanent deletion must remain blocked until an authorized release is recorded.</p>' : ""}
    `;
    auditCard.insertAdjacentElement("beforebegin", section);
  }

  function definition(term, value) {
    return `<div><dt>${escapeHtml(term)}</dt><dd>${escapeHtml(value)}</dd></div>`;
  }

  function formatDate(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})(window);
