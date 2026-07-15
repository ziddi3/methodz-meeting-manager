/* Methodz Meeting Manager v1.3 archive disposition and preservation audit view. */
(function initializeArchiveDispositionV13(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", () => global.setTimeout(render, 0));

  function render() {
    const article = document.getElementById("archiveRecord");
    const record = typeof activeArchiveRecordV07 !== "undefined" ? activeArchiveRecordV07 : null;
    if (!article || article.hidden || !record || document.getElementById("archiveDispositionAuditV13")) return;
    const config = global.METHODZ_MEETING_CONFIG || {};
    const approvals = readJson(config.storageKeys?.dispositionApprovals || "methodzDispositionApprovals", []).filter((item) => item.sourceRecordId === record.id);
    const events = readJson(config.storageKeys?.preservationEventChain || "methodzPreservationEventChain", []).filter((item) => item.sourceRecordId === record.id);
    const verification = verifyChain(readJson(config.storageKeys?.preservationEventChain || "methodzPreservationEventChain", []));

    const section = document.createElement("section");
    section.id = "archiveDispositionAuditV13";
    section.className = "card archive-record-audit";
    section.innerHTML = `
      <h2>Disposition & Preservation Audit</h2>
      <p><strong>Local Chain Status:</strong> ${escapeHtml(verification.valid ? `Verified (${verification.count} events)` : `Verification failed: ${verification.errors.join(" ")}`)}</p>
      <h3>Disposition Approvals</h3>
      ${renderApprovals(approvals)}
      <h3>Record Events</h3>
      ${renderEvents(events)}
      <p class="helper-text">This browser-local chain is tamper-evident only within the local workflow. It is not immutable, authenticated, or a replacement for a server audit ledger.</p>`;
    article.appendChild(section);
  }

  function renderApprovals(items) {
    if (!items.length) return "<p>No disposition approvals are recorded for this meeting.</p>";
    return `<div class="archive-table-wrap"><table class="compact-table archive-table"><thead><tr><th>Status</th><th>Requested By</th><th>Reviewed By</th><th>Decision</th><th>Fingerprint</th></tr></thead><tbody>${items.slice().sort(newest).map((item) => `<tr><td>${escapeHtml(item.status)}</td><td>${escapeHtml(item.requestedBy || "Not listed")}</td><td>${escapeHtml(item.reviewedBy || "Not listed")}</td><td>${escapeHtml(formatDateTime(item.reviewedAt || item.requestedAt))}</td><td><code>${escapeHtml(shortDigest(item.recordFingerprint))}</code></td></tr>`).join("")}</tbody></table></div>`;
  }

  function renderEvents(items) {
    if (!items.length) return "<p>No preservation or disposition events are recorded for this meeting.</p>";
    return `<ol>${items.slice().sort((a, b) => Number(a.sequence || 0) - Number(b.sequence || 0)).map((item) => `<li><strong>${escapeHtml(item.action)}</strong> • ${escapeHtml(formatDateTime(item.occurredAt))} • ${escapeHtml(item.actor || "Unknown")}<br><code>${escapeHtml(shortDigest(item.digest))}</code>${item.note ? ` • ${escapeHtml(item.note)}` : ""}</li>`).join("")}</ol>`;
  }

  function verifyChain(chain) {
    const errors = [];
    chain.forEach((event, index) => {
      const previous = index ? chain[index - 1].digest : "GENESIS";
      if (event.previousDigest !== previous) errors.push(`Event ${index + 1} previous digest mismatch.`);
      const core = clone(event);
      delete core.digest;
      if (event.digest !== fnv1a(stableStringify(core))) errors.push(`Event ${index + 1} content digest mismatch.`);
    });
    return { valid: errors.length === 0, count: chain.length, errors };
  }

  function readJson(key, fallback) { try { return JSON.parse(global.localStorage.getItem(key)) ?? fallback; } catch (error) { return fallback; } }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function newest(a, b) { return String(b.reviewedAt || b.requestedAt || "").localeCompare(String(a.reviewedAt || a.requestedAt || "")); }
  function stableStringify(value) { if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`; return JSON.stringify(value); }
  function fnv1a(text) { let hash = 2166136261; for (let i = 0; i < text.length; i += 1) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); } return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`; }
  function formatDateTime(value) { if (!value) return "Not recorded"; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString(); }
  function shortDigest(value) { const text = String(value || ""); return text.length > 20 ? `${text.slice(0, 12)}…${text.slice(-6)}` : text || "none"; }
  function escapeHtml(value) { return String(value == null ? "" : value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
})(window);
