/* Methodz Meeting Manager v1.2 archive approval audit extension. */
(function initializeArchiveApprovalsV12(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", () => global.setTimeout(renderApprovalAudit, 0));

  function renderApprovalAudit() {
    const article = document.getElementById("archiveRecord");
    if (!article || article.hidden || document.getElementById("archiveApprovalAuditV12")) return;
    const record = typeof activeArchiveRecordV07 !== "undefined" ? activeArchiveRecordV07 : null;
    if (!record) return;

    const config = global.METHODZ_MEETING_CONFIG || {};
    const exportKey = config.storageKeys?.exportApprovals || "methodzExternalExportApprovals";
    const dispositionKey = config.storageKeys?.dispositionApprovals || "methodzDispositionApprovals";
    const exports = readJson(exportKey, []).filter((item) => item.sourceRecordId === record.id);
    const dispositions = readJson(dispositionKey, []).filter((item) => item.sourceRecordId === record.id);

    const section = document.createElement("section");
    section.id = "archiveApprovalAuditV12";
    section.className = "card archive-record-audit";
    section.innerHTML = `
      <h2>Approval Governance</h2>
      <h3>External Export Approvals</h3>
      ${renderEntries(exports, "No external-export approvals are recorded for this record.")}
      <h3>Disposition Approvals</h3>
      ${renderEntries(dispositions, "No disposition approvals are recorded for this record.")}
      <p class="helper-text">Approval entries are browser-local workflow metadata. Hosted deployments must enforce authorization and audit durability on the server.</p>
    `;
    article.appendChild(section);
  }

  function renderEntries(items, emptyText) {
    if (!items.length) return `<p>${escapeHtml(emptyText)}</p>`;
    return `<div class="archive-table-wrap"><table class="compact-table archive-table"><thead><tr><th>Status</th><th>Scope</th><th>Requested By</th><th>Reviewed By</th><th>Reviewed</th></tr></thead><tbody>${items
      .slice()
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))
      .map((item) => `<tr><td>${escapeHtml(item.status || "Unknown")}</td><td>${escapeHtml(item.profile || item.recipientPolicyId || item.archiveId || "Record")}</td><td>${escapeHtml(item.requestedBy || "Not listed")}</td><td>${escapeHtml(item.reviewedBy || "Not listed")}</td><td>${escapeHtml(formatDateTime(item.reviewedAt || item.updatedAt))}</td></tr>`)
      .join("")}</tbody></table></div>`;
  }

  function readJson(key, fallback) {
    try {
      return JSON.parse(global.localStorage.getItem(key)) || fallback;
    } catch (error) {
      return fallback;
    }
  }

  function formatDateTime(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
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
