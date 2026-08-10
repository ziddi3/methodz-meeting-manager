/* Methodz Meeting Manager portable, metadata-only Field Rehearsal launch contract. */
(function exposeMethodzFieldRehearsalLaunchCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzFieldRehearsalLaunchCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzFieldRehearsalLaunchCore() {
  "use strict";

  const VERSION = "1.0.0";
  const PREFIX = "#methodz-rehearsal=";
  const POLICIES = Object.freeze([
    "new-commit-required",
    "same-commit-required",
    "same-commit-if-no-code-change"
  ]);
  const ROWS = Object.freeze([
    Object.freeze({ key: "desktopChromium", label: "Desktop Chromium", platformFamily: "desktop", browserFamily: "chrome", viewportClass: "desktop", browserRequirement: "Chromium-family browser" }),
    Object.freeze({ key: "desktopNonChromium", label: "Desktop non-Chromium", platformFamily: "desktop", browserFamily: "", viewportClass: "desktop", browserRequirement: "Non-Chromium browser" }),
    Object.freeze({ key: "androidChrome", label: "Android Chrome", platformFamily: "android", browserFamily: "chrome", viewportClass: "phone", browserRequirement: "Chrome" }),
    Object.freeze({ key: "iosSafari", label: "iOS Safari", platformFamily: "ios", browserFamily: "safari", viewportClass: "phone", browserRequirement: "Safari" }),
    Object.freeze({ key: "tablet", label: "Tablet", platformFamily: "tablet", browserFamily: "", viewportClass: "tablet", browserRequirement: "Operator-selected browser" }),
    Object.freeze({ key: "twoDevice", label: "Two-device", platformFamily: "two-device", browserFamily: "", viewportClass: "", browserRequirement: "Operator-selected browsers on both devices" })
  ]);

  const text = (value, maximum = 96) => String(value ?? "").trim().slice(0, maximum);

  function commitSha(value) {
    const normalized = text(value, 40).toLowerCase();
    return /^[0-9a-f]{7,40}$/.test(normalized) ? normalized : "";
  }

  function rowDefinition(value) {
    const key = text(value, 40);
    return ROWS.find((row) => row.key === key) || null;
  }

  function policy(value) {
    const normalized = text(value, 64);
    return POLICIES.includes(normalized) ? normalized : "";
  }

  function normalizeLaunch(input = {}) {
    const errors = [];
    const row = rowDefinition(input.rowKey);
    const sourceCommitSha = commitSha(input.sourceCommitSha);
    const targetCommitSha = commitSha(input.targetCommitSha);
    const commitPolicy = policy(input.commitPolicy);

    if (!row) errors.push("launch:row");
    if (!sourceCommitSha) errors.push("launch:source-commit");
    if (!targetCommitSha) errors.push("launch:target-commit");
    if (!commitPolicy) errors.push("launch:commit-policy");

    if (sourceCommitSha && targetCommitSha && commitPolicy) {
      if (commitPolicy === "new-commit-required" && sourceCommitSha === targetCommitSha) errors.push("launch:new-commit-must-differ");
      if (commitPolicy !== "new-commit-required" && sourceCommitSha !== targetCommitSha) errors.push("launch:same-commit-must-match");
    }

    if (errors.length) return Object.freeze({ ok: false, errors: Object.freeze(errors), launch: null });

    return Object.freeze({
      ok: true,
      errors: Object.freeze([]),
      launch: Object.freeze({
        reportType: "methodz-field-rehearsal-launch",
        reportVersion: VERSION,
        rowKey: row.key,
        rowLabel: row.label,
        sourceCommitSha,
        targetCommitSha,
        commitPolicy,
        expectedEnvironment: Object.freeze({
          platformFamily: row.platformFamily,
          browserFamily: row.browserFamily,
          viewportClass: row.viewportClass,
          browserRequirement: row.browserRequirement
        }),
        boundaries: Object.freeze({
          metadataOnly: true,
          meetingRecordsRead: false,
          meetingRecordsWritten: false,
          browserStorageRead: false,
          browserStorageWritten: false,
          providerCalls: false,
          githubApiCalls: false,
          synchronization: false,
          transferMutation: false,
          backgroundAutomation: false
        })
      })
    });
  }

  function buildFromPlan(plan, rowKey, targetCommitSha) {
    const errors = [];
    if (!plan || plan.reportType !== "methodz-field-evidence-rerun-plan") {
      return Object.freeze({ ok: false, errors: Object.freeze(["plan:type"]), launch: null });
    }
    if (text(plan.reportVersion, 32) !== "1.0.0") errors.push("plan:version");
    const sourceCommitSha = commitSha(plan.sourceCommitSha);
    if (!sourceCommitSha) errors.push("plan:source-commit");
    const rows = Array.isArray(plan.rows) ? plan.rows : [];
    const selected = rows.find((row) => row?.rowKey === rowKey);
    if (!selected) errors.push("plan:row-not-present");
    const commitPolicy = policy(selected?.commitPolicy);
    if (!commitPolicy) errors.push("plan:commit-policy");
    if (errors.length) return Object.freeze({ ok: false, errors: Object.freeze(errors), launch: null });

    const target = commitPolicy === "new-commit-required" ? targetCommitSha : sourceCommitSha;
    return normalizeLaunch({ rowKey, sourceCommitSha, targetCommitSha: target, commitPolicy });
  }

  function encodeFragment(launch) {
    const normalized = normalizeLaunch(launch);
    if (!normalized.ok) return "";
    const payload = normalized.launch;
    const params = [
      ["v", VERSION],
      ["row", payload.rowKey],
      ["source", payload.sourceCommitSha],
      ["target", payload.targetCommitSha],
      ["policy", payload.commitPolicy]
    ];
    return `${PREFIX}${params.map(([key, value]) => `${key}:${encodeURIComponent(value)}`).join(";")}`;
  }

  function parseFragment(fragment) {
    const source = String(fragment || "");
    if (!source.startsWith(PREFIX)) return Object.freeze({ recognized: false, ok: false, errors: Object.freeze([]), launch: null });
    const raw = source.slice(PREFIX.length);
    if (!raw || raw.length > 512) return Object.freeze({ recognized: true, ok: false, errors: Object.freeze(["fragment:length"]), launch: null });

    const values = {};
    const errors = [];
    raw.split(";").forEach((part) => {
      const separator = part.indexOf(":");
      if (separator <= 0) {
        errors.push("fragment:pair");
        return;
      }
      const key = part.slice(0, separator);
      if (!["v", "row", "source", "target", "policy"].includes(key) || Object.prototype.hasOwnProperty.call(values, key)) {
        errors.push("fragment:key");
        return;
      }
      try {
        values[key] = decodeURIComponent(part.slice(separator + 1));
      } catch (_error) {
        errors.push("fragment:encoding");
      }
    });
    if (values.v !== VERSION) errors.push("fragment:version");
    if (Object.keys(values).length !== 5) errors.push("fragment:fields");
    if (errors.length) return Object.freeze({ recognized: true, ok: false, errors: Object.freeze(errors.slice(0, 16)), launch: null });

    const normalized = normalizeLaunch({
      rowKey: values.row,
      sourceCommitSha: values.source,
      targetCommitSha: values.target,
      commitPolicy: values.policy
    });
    return Object.freeze({ recognized: true, ok: normalized.ok, errors: normalized.errors, launch: normalized.launch });
  }

  return Object.freeze({
    version: VERSION,
    prefix: PREFIX,
    policies: POLICIES,
    rows: ROWS,
    normalizeLaunch,
    buildFromPlan,
    encodeFragment,
    parseFragment
  });
});
