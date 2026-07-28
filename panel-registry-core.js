/* Methodz Meeting Manager v1.6.10 portable application-shell panel registry. */
(function exposeMethodzPanelRegistry(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzPanelRegistryV1610 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createPanelRegistryCore() {
  "use strict";

  const VERSION = "1.0.0";
  const DEFAULT_GROUPS = Object.freeze([
    "shell", "capture", "records", "archive", "governance", "recovery",
    "provider", "synchronization", "transfer", "acceptance", "diagnostics"
  ]);
  const DEFAULT_VISIBILITY = Object.freeze(["visible", "collapsed", "hidden"]);
  const DEFAULT_PRINT = Object.freeze(["include", "exclude", "summary"]);
  const registry = new Map();
  const registrationErrors = [];
  let lastDiagnostics = null;

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function text(value) {
    return String(value ?? "").trim();
  }

  function integerOrNull(value) {
    if (value === null || value === undefined || value === "") return null;
    const numeric = Number(value);
    return Number.isInteger(numeric) && numeric >= 0 ? numeric : null;
  }

  function normalize(definition) {
    const input = definition && typeof definition === "object" ? definition : {};
    return {
      id: text(input.id),
      label: text(input.label),
      group: text(input.group),
      selector: text(input.selector),
      insertionAnchor: text(input.insertionAnchor),
      meetingDayPriority: integerOrNull(input.meetingDayPriority),
      meetingDayLabel: text(input.meetingDayLabel || input.label),
      defaultVisibility: text(input.defaultVisibility || "visible"),
      printBehavior: text(input.printBehavior || "include"),
      required: input.required === true,
      compatibilityHeading: text(input.compatibilityHeading),
      order: Number.isFinite(Number(input.order)) ? Number(input.order) : registry.size * 10
    };
  }

  function validateDefinition(definition, options = {}) {
    const groups = new Set(options.validGroups || DEFAULT_GROUPS);
    const visibility = new Set(options.validVisibility || DEFAULT_VISIBILITY);
    const print = new Set(options.validPrintBehavior || DEFAULT_PRINT);
    const errors = [];
    if (!definition.id || !/^[a-z0-9][a-z0-9-]*$/.test(definition.id)) errors.push("Panel ID must be a non-empty lowercase slug.");
    if (!definition.label) errors.push("Panel label is required.");
    if (!groups.has(definition.group)) errors.push(`Invalid panel group: ${definition.group || "(missing)"}.`);
    if (!definition.selector) errors.push("A stable selector is required.");
    if (!definition.insertionAnchor) errors.push("An insertion anchor is required.");
    if (!visibility.has(definition.defaultVisibility)) errors.push(`Invalid default visibility: ${definition.defaultVisibility}.`);
    if (!print.has(definition.printBehavior)) errors.push(`Invalid print behavior: ${definition.printBehavior}.`);
    return errors;
  }

  function register(definition, options = {}) {
    const normalized = normalize(definition);
    const errors = validateDefinition(normalized, options);
    if (registry.has(normalized.id)) errors.push(`Duplicate panel ID: ${normalized.id}.`);
    if (errors.length) {
      registrationErrors.push({ panelId: normalized.id || null, errors });
      return { ok: false, panel: clone(normalized), errors: [...errors] };
    }
    registry.set(normalized.id, Object.freeze(normalized));
    return { ok: true, panel: clone(normalized), errors: [] };
  }

  function registerMany(definitions, options = {}) {
    return (Array.isArray(definitions) ? definitions : []).map((definition) => register(definition, options));
  }

  function list() {
    return [...registry.values()].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id)).map(clone);
  }

  function get(panelId) {
    const panel = registry.get(String(panelId || ""));
    return panel ? clone(panel) : null;
  }

  function resolve(panelOrId, documentRef) {
    const panel = typeof panelOrId === "string" ? registry.get(panelOrId) : panelOrId;
    if (!panel || !documentRef?.querySelector) return null;
    try { return documentRef.querySelector(panel.selector); } catch (error) { return null; }
  }

  function compareDomOrder(left, right) {
    if (!left || !right || left === right || typeof left.compareDocumentPosition !== "function") return 0;
    const position = left.compareDocumentPosition(right);
    const following = typeof Node !== "undefined" ? Node.DOCUMENT_POSITION_FOLLOWING : 4;
    const preceding = typeof Node !== "undefined" ? Node.DOCUMENT_POSITION_PRECEDING : 2;
    if (position & following) return -1;
    if (position & preceding) return 1;
    return 0;
  }

  function validateDocument(documentRef, options = {}) {
    const startedAt = Number(options.startedAtMs) || 0;
    const requiredCapture = new Set(options.requiredCapturePanelIds || []);
    const errors = registrationErrors.flatMap((entry) => entry.errors.map((message) => ({ code: "REGISTRATION_ERROR", panelId: entry.panelId, message })));
    const warnings = [];
    const resolved = [];
    const missing = [];

    list().forEach((panel) => {
      let anchor = null;
      try { anchor = documentRef?.querySelector?.(panel.insertionAnchor) || null; } catch (error) { anchor = null; }
      if (!anchor) errors.push({ code: "MISSING_ANCHOR", panelId: panel.id, message: `Insertion anchor is unavailable for ${panel.label}.` });
      const element = resolve(panel, documentRef);
      if (!element) {
        missing.push(panel.id);
        const issue = { code: "MISSING_PANEL", panelId: panel.id, message: `${panel.label} is not present in the current shell.` };
        if (panel.required) errors.push(issue);
        else warnings.push(issue);
        return;
      }
      resolved.push({ panel, element });
    });

    requiredCapture.forEach((panelId) => {
      const panel = registry.get(panelId);
      if (!panel || panel.group !== "capture") {
        errors.push({ code: "CAPTURE_REGISTRATION_OMITTED", panelId, message: `Required capture panel registration is missing: ${panelId}.` });
      }
    });

    const orderedWorkflowPanels = resolved.filter((item) => item.panel.meetingDayPriority !== null);
    const expected = [...orderedWorkflowPanels]
      .sort((a, b) => a.panel.meetingDayPriority - b.panel.meetingDayPriority || a.panel.order - b.panel.order)
      .map((item) => item.panel.id);
    const actual = [...orderedWorkflowPanels]
      .sort((a, b) => compareDomOrder(a.element, b.element))
      .map((item) => item.panel.id);
    const orderMatches = expected.length === actual.length && expected.every((id, index) => actual[index] === id);
    if (!orderMatches) {
      errors.push({
        code: "PANEL_ORDER_MISMATCH",
        panelId: null,
        message: "Registered Meeting-Day panel priority differs from the current document order. Panel collapsing is blocked until the shell order is repaired."
      });
    }

    const scriptEntries = typeof performance !== "undefined" && typeof performance.getEntriesByType === "function"
      ? performance.getEntriesByType("resource").filter((entry) => entry.initiatorType === "script")
      : [];
    const scriptLoadDurationMs = scriptEntries.reduce((total, entry) => total + Math.max(0, Number(entry.duration) || 0), 0);
    const finishedAt = typeof performance !== "undefined" && typeof performance.now === "function" ? performance.now() : startedAt;
    lastDiagnostics = {
      reportType: "methodz-panel-registry-diagnostics",
      reportVersion: VERSION,
      generatedAt: new Date().toISOString(),
      valid: errors.length === 0,
      counts: {
        registered: registry.size,
        resolved: resolved.length,
        missing: missing.length,
        errors: errors.length,
        warnings: warnings.length,
        capturePanels: list().filter((panel) => panel.group === "capture").length,
        meetingDayPanels: list().filter((panel) => panel.meetingDayPriority !== null).length,
        scriptsMeasured: scriptEntries.length
      },
      timing: {
        registrationDurationMs: Math.max(0, finishedAt - startedAt),
        aggregateScriptLoadDurationMs: scriptLoadDurationMs
      },
      order: {
        matches: orderMatches,
        expected,
        actual
      },
      missingPanelIds: [...missing],
      errors,
      warnings,
      boundaries: {
        containsMeetingContent: false,
        containsRecordIds: false,
        containsAttendeeNames: false,
        containsSignatures: false,
        containsCredentials: false,
        containsPrivateKeyMaterial: false,
        containsStorageValues: false
      }
    };
    return clone(lastDiagnostics);
  }

  function bindDocument(documentRef) {
    list().forEach((panel) => {
      const element = resolve(panel, documentRef);
      if (!element) return;
      element.dataset.methodzPanelId = panel.id;
      element.dataset.methodzPanelGroup = panel.group;
      element.dataset.methodzPanelVisibility = panel.defaultVisibility;
      element.dataset.methodzPanelPrint = panel.printBehavior;
      if (panel.meetingDayPriority !== null) {
        element.dataset.methodzMeetingDayPriority = String(panel.meetingDayPriority);
        element.dataset.methodzMeetingDayLabel = panel.meetingDayLabel;
      }
    });
  }

  function getMeetingDayPanels(documentRef) {
    return list()
      .filter((panel) => panel.meetingDayPriority !== null)
      .sort((a, b) => a.meetingDayPriority - b.meetingDayPriority || a.order - b.order)
      .map((panel) => ({ ...panel, element: resolve(panel, documentRef) }))
      .filter((item) => item.element);
  }

  function diagnostics() {
    return lastDiagnostics ? clone(lastDiagnostics) : null;
  }

  function resetForTests() {
    registry.clear();
    registrationErrors.splice(0, registrationErrors.length);
    lastDiagnostics = null;
  }

  return Object.freeze({
    version: VERSION,
    register,
    registerMany,
    list,
    get,
    resolve,
    bindDocument,
    validateDocument,
    getMeetingDayPanels,
    diagnostics,
    resetForTests
  });
});
