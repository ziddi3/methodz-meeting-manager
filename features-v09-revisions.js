/* Methodz Meeting Manager v0.9 revision comparison view. */
(function initializeV09RevisionComparison(global) {
  "use strict";

  let activeRecordId = "";
  let activeComparison = null;

  global.addEventListener("DOMContentLoaded", initializeRevisionComparisonV09);

  function initializeRevisionComparisonV09() {
    patchRevisionOpenV09();
    installRevisionComparisonV09();
  }

  function patchRevisionOpenV09() {
    if (global.__methodzV09RevisionOpenPatched || typeof global.openRevisionHistoryV08 !== "function") return;
    const original = global.openRevisionHistoryV08;
    global.openRevisionHistoryV08 = function openRevisionHistoryV09(recordId, ...args) {
      activeRecordId = recordId;
      const result = original.call(this, recordId, ...args);
      installRevisionComparisonV09();
      populateRevisionSelectorsV09(recordId);
      return result;
    };
    global.__methodzV09RevisionOpenPatched = true;
  }

  function installRevisionComparisonV09() {
    const panel = document.getElementById("revisionHistoryPanelV08");
    const list = document.getElementById("revisionHistoryListV08");
    if (!panel || !list || document.getElementById("revisionComparisonV09")) return;

    const comparison = document.createElement("div");
    comparison.id = "revisionComparisonV09";
    comparison.className = "revision-comparison-v09";
    comparison.innerHTML = `
      <div class="section-subheader">
        <div>
          <h3>Compare Revisions</h3>
          <p class="helper-text">Compare two saved snapshots or a snapshot against the current active record. Array entries are compared by position.</p>
        </div>
      </div>
      <div class="revision-compare-controls-v09">
        <div>
          <label for="revisionLeftV09">Earlier / Left Version</label>
          <select id="revisionLeftV09"></select>
        </div>
        <div>
          <label for="revisionRightV09">Later / Right Version</label>
          <select id="revisionRightV09"></select>
        </div>
      </div>
      <div class="button-row">
        <button type="button" onclick="compareSelectedRevisionsV09()">Compare Versions</button>
        <button type="button" onclick="exportRevisionComparisonV09()">Export Comparison JSON</button>
        <button type="button" onclick="clearRevisionComparisonV09()">Clear Comparison</button>
      </div>
      <div id="revisionComparisonResultV09" class="revision-comparison-result-v09" aria-live="polite"></div>
    `;

    panel.insertBefore(comparison, list);
  }

  function populateRevisionSelectorsV09(recordId) {
    activeRecordId = recordId || activeRecordId;
    const left = document.getElementById("revisionLeftV09");
    const right = document.getElementById("revisionRightV09");
    if (!left || !right || !activeRecordId) return;

    const revisions = getRevisionsV09(activeRecordId);
    const options = revisions.map((revision) => {
      const label = `Revision ${revision.revisionNumber} • ${formatV09(revision.capturedAt)} • ${revision.reason || "Saved record"}`;
      return `<option value="${escapeV09(revision.id)}">${escapeV09(label)}</option>`;
    });
    const currentOption = '<option value="__current__">Current active record</option>';
    left.innerHTML = options.join("") + currentOption;
    right.innerHTML = options.join("") + currentOption;

    if (revisions.length > 1) left.value = revisions[revisions.length - 2].id;
    else if (revisions.length === 1) left.value = revisions[0].id;
    else left.value = "__current__";
    right.value = "__current__";
    clearRevisionComparisonV09();
  }

  function getRevisionsV09(recordId) {
    return typeof global.getRecordRevisionsV08 === "function"
      ? global.getRecordRevisionsV08(recordId)
      : [];
  }

  function getCurrentRecordV09(recordId) {
    const records = typeof global.getRecords === "function" ? global.getRecords() : [];
    return records.find((record) => record.id === recordId) || null;
  }

  function resolveVersionV09(recordId, selection) {
    if (selection === "__current__") {
      const current = getCurrentRecordV09(recordId);
      return current ? { id: "__current__", label: "Current active record", snapshot: current } : null;
    }
    const revision = getRevisionsV09(recordId).find((item) => item.id === selection);
    return revision ? {
      id: revision.id,
      label: `Revision ${revision.revisionNumber}`,
      revisionNumber: revision.revisionNumber,
      capturedAt: revision.capturedAt,
      reason: revision.reason,
      snapshot: revision.snapshot
    } : null;
  }

  function flattenV09(value, path = "$", output = {}) {
    if (Array.isArray(value)) {
      if (!value.length) output[path] = [];
      value.forEach((item, index) => flattenV09(item, `${path}[${index}]`, output));
      return output;
    }
    if (value && typeof value === "object") {
      const keys = Object.keys(value).sort();
      if (!keys.length) output[path] = {};
      keys.forEach((key) => flattenV09(value[key], `${path}.${key}`, output));
      return output;
    }
    output[path] = value;
    return output;
  }

  function valueIdentityV09(value) {
    return JSON.stringify(value);
  }

  function buildComparisonV09(leftVersion, rightVersion) {
    const leftFlat = flattenV09(leftVersion.snapshot);
    const rightFlat = flattenV09(rightVersion.snapshot);
    const paths = Array.from(new Set([...Object.keys(leftFlat), ...Object.keys(rightFlat)])).sort();
    const changes = [];

    paths.forEach((path) => {
      const hasLeft = Object.prototype.hasOwnProperty.call(leftFlat, path);
      const hasRight = Object.prototype.hasOwnProperty.call(rightFlat, path);
      const leftValue = leftFlat[path];
      const rightValue = rightFlat[path];
      if (hasLeft && hasRight && valueIdentityV09(leftValue) === valueIdentityV09(rightValue)) return;
      changes.push({
        path,
        type: !hasLeft ? "added" : !hasRight ? "removed" : "changed",
        left: hasLeft ? leftValue : undefined,
        right: hasRight ? rightValue : undefined
      });
    });

    return {
      packageType: "methodz-meeting-revision-comparison",
      packageVersion: 1,
      comparedAt: new Date().toISOString(),
      recordId: activeRecordId,
      left: {
        id: leftVersion.id,
        label: leftVersion.label,
        revisionNumber: leftVersion.revisionNumber || null,
        capturedAt: leftVersion.capturedAt || null,
        reason: leftVersion.reason || null
      },
      right: {
        id: rightVersion.id,
        label: rightVersion.label,
        revisionNumber: rightVersion.revisionNumber || null,
        capturedAt: rightVersion.capturedAt || null,
        reason: rightVersion.reason || null
      },
      summary: {
        totalChanges: changes.length,
        added: changes.filter((change) => change.type === "added").length,
        removed: changes.filter((change) => change.type === "removed").length,
        changed: changes.filter((change) => change.type === "changed").length
      },
      changes
    };
  }

  function compareSelectedRevisionsV09() {
    const result = document.getElementById("revisionComparisonResultV09");
    const leftSelection = document.getElementById("revisionLeftV09")?.value;
    const rightSelection = document.getElementById("revisionRightV09")?.value;
    if (!result || !activeRecordId) return;

    const left = resolveVersionV09(activeRecordId, leftSelection);
    const right = resolveVersionV09(activeRecordId, rightSelection);
    if (!left || !right) {
      result.innerHTML = '<p class="comparison-error-v09">Both comparison versions must be available.</p>';
      return;
    }

    activeComparison = buildComparisonV09(left, right);
    renderComparisonV09(activeComparison);
    announceV09(`${activeComparison.summary.totalChanges} revision difference${activeComparison.summary.totalChanges === 1 ? "" : "s"} found.`);
  }

  function renderComparisonV09(comparison) {
    const result = document.getElementById("revisionComparisonResultV09");
    if (!result) return;
    const summary = comparison.summary;
    if (!comparison.changes.length) {
      result.innerHTML = `<p class="comparison-empty-v09"><strong>No differences found.</strong> ${escapeV09(comparison.left.label)} and ${escapeV09(comparison.right.label)} have matching content.</p>`;
      return;
    }

    const rows = comparison.changes.slice(0, 500).map((change) => `
      <tr>
        <td><code>${escapeV09(change.path)}</code></td>
        <td><span class="change-type-v09 change-${escapeV09(change.type)}">${escapeV09(change.type)}</span></td>
        <td><pre>${escapeV09(formatValueV09(change.left))}</pre></td>
        <td><pre>${escapeV09(formatValueV09(change.right))}</pre></td>
      </tr>
    `).join("");

    result.innerHTML = `
      <div class="metric-grid revision-metrics-v09">
        <div><strong>${summary.totalChanges}</strong><span>total differences</span></div>
        <div><strong>${summary.added}</strong><span>added paths</span></div>
        <div><strong>${summary.removed}</strong><span>removed paths</span></div>
        <div><strong>${summary.changed}</strong><span>changed paths</span></div>
      </div>
      ${comparison.changes.length > 500 ? '<p class="helper-text">Showing the first 500 differences. Export JSON for the complete comparison.</p>' : ""}
      <div class="revision-table-wrap-v09">
        <table class="revision-diff-table-v09">
          <thead><tr><th>Field Path</th><th>Change</th><th>${escapeV09(comparison.left.label)}</th><th>${escapeV09(comparison.right.label)}</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
  }

  function formatValueV09(value) {
    if (typeof value === "undefined") return "Not present";
    if (typeof value === "string") return value || '""';
    return JSON.stringify(value, null, 2);
  }

  function exportRevisionComparisonV09() {
    if (!activeComparison) return alert("Run a revision comparison first.");
    if (typeof global.downloadBlob !== "function") return alert("Download support is unavailable.");
    const record = getCurrentRecordV09(activeRecordId);
    global.downloadBlob(
      JSON.stringify(activeComparison, null, 2),
      `methodz-revision-comparison-${record?.meetingNumber || activeRecordId}-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json"
    );
  }

  function clearRevisionComparisonV09() {
    activeComparison = null;
    const result = document.getElementById("revisionComparisonResultV09");
    if (result) result.innerHTML = '<p class="helper-text">Choose two versions and run the comparison.</p>';
  }

  function formatV09(value) {
    if (!value) return "unknown time";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  function escapeV09(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function announceV09(message) {
    if (typeof global.announceMethodzStatus === "function") global.announceMethodzStatus(message);
  }

  global.populateRevisionSelectorsV09 = populateRevisionSelectorsV09;
  global.compareSelectedRevisionsV09 = compareSelectedRevisionsV09;
  global.exportRevisionComparisonV09 = exportRevisionComparisonV09;
  global.clearRevisionComparisonV09 = clearRevisionComparisonV09;
})(window);
