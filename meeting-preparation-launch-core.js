/* Portable source-aware launch contract for Methodz Meeting Manager read-only workspaces. */
(function exposeMethodzMeetingPreparationLaunchCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzMeetingPreparationLaunchCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzMeetingPreparationLaunchCore() {
  "use strict";

  const VERSION = "1.1.0";
  const MAX_RECORD_ID_LENGTH = 256;
  const LAUNCH_KEY = "prepare-record";
  const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/;
  const TARGETS = Object.freeze({
    title: Object.freeze({ panelId: "meetingInformationPanelV1610", selector: "#meetingTitle", label: "Meeting title" }),
    date: Object.freeze({ panelId: "meetingInformationPanelV1610", selector: "#meetingDate", label: "Meeting date" }),
    location: Object.freeze({ panelId: "meetingInformationPanelV1610", selector: "#meetingLocation", label: "Location or video link" }),
    facilitator: Object.freeze({ panelId: "meetingInformationPanelV1610", selector: "#meetingChair", label: "Meeting facilitator" }),
    organizations: Object.freeze({ panelId: "organizationsPresentPanelV1610", selector: ".company-present", label: "Organizations present" }),
    attendees: Object.freeze({ panelId: "attendanceSignOnPanelV1610", selector: ".attendee-name", label: "Attendee setup" }),
    agenda: Object.freeze({ panelId: "agendaChecklistPanelV1610", selector: "#agendaList input[type='checkbox']", label: "Agenda setup" }),
    decisions: Object.freeze({ panelId: "decisionsMadePanelV1610", selector: "#decisions", label: "Decisions Made" })
  });
  const SOURCES = Object.freeze({
    preparation: Object.freeze({
      key: "preparation",
      label: "Preparation",
      returnHref: "preparation.html",
      returnLabel: "Back to Preparation Brief"
    }),
    "decision-register": Object.freeze({
      key: "decision-register",
      label: "Decision Register",
      returnHref: "decisions.html",
      returnLabel: "Back to Decision Register"
    })
  });

  const text = (value) => String(value ?? "").trim();
  const owns = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

  function validateRecordId(value) {
    const recordId = String(value ?? "");
    if (!recordId.trim()) return { valid: false, reason: "missing-record-id", recordId: "" };
    if (recordId.length > MAX_RECORD_ID_LENGTH) return { valid: false, reason: "record-id-too-long", recordId: "" };
    if (CONTROL_CHARACTERS.test(recordId)) return { valid: false, reason: "invalid-record-id", recordId: "" };
    return { valid: true, reason: "", recordId };
  }

  function normalizeFocus(value) {
    const focus = text(value || "title").toLowerCase();
    return owns(TARGETS, focus) ? focus : "";
  }

  function normalizeSource(value) {
    const source = text(value || "preparation").toLowerCase();
    return owns(SOURCES, source) ? source : "";
  }

  function createPreparationLaunchHash(recordIdValue, focusValue = "title", sourceValue = "preparation") {
    const record = validateRecordId(recordIdValue);
    const focus = normalizeFocus(focusValue);
    const source = normalizeSource(sourceValue);
    if (!record.valid) throw new TypeError(`Invalid preparation record reference: ${record.reason}`);
    if (!focus) throw new TypeError("Unsupported preparation focus target.");
    if (!source) throw new TypeError("Unsupported launch source.");
    const sourceParameter = source === "preparation" ? "" : `&from=${encodeURIComponent(source)}`;
    return `#${LAUNCH_KEY}=${encodeURIComponent(record.recordId)}&focus=${encodeURIComponent(focus)}${sourceParameter}`;
  }

  function parsePreparationLaunchHash(hashValue) {
    const raw = text(hashValue).replace(/^#/, "");
    const isPreparationLaunch = raw === LAUNCH_KEY || raw.startsWith(`${LAUNCH_KEY}=`) || raw.includes(`&${LAUNCH_KEY}=`);
    if (!isPreparationLaunch) {
      return Object.freeze({ valid: false, isPreparationLaunch: false, reason: "not-preparation-launch", recordId: "", focus: "", target: null, sourceKey: "", source: null });
    }

    let parameters;
    try {
      parameters = new URLSearchParams(raw);
    } catch (_error) {
      return Object.freeze({ valid: false, isPreparationLaunch: true, reason: "malformed-fragment", recordId: "", focus: "", target: null, sourceKey: "", source: null });
    }

    const record = validateRecordId(parameters.get(LAUNCH_KEY));
    const focus = normalizeFocus(parameters.get("focus") || "title");
    const sourceKey = normalizeSource(parameters.get("from") || "preparation");
    if (!record.valid) {
      return Object.freeze({ valid: false, isPreparationLaunch: true, reason: record.reason, recordId: "", focus: "", target: null, sourceKey, source: SOURCES[sourceKey] || null });
    }
    if (!focus) {
      return Object.freeze({ valid: false, isPreparationLaunch: true, reason: "unsupported-focus", recordId: record.recordId, focus: "", target: null, sourceKey, source: SOURCES[sourceKey] || null });
    }
    if (!sourceKey) {
      return Object.freeze({ valid: false, isPreparationLaunch: true, reason: "unsupported-source", recordId: record.recordId, focus, target: TARGETS[focus], sourceKey: "", source: null });
    }

    return Object.freeze({
      valid: true,
      isPreparationLaunch: true,
      reason: "",
      recordId: record.recordId,
      focus,
      target: TARGETS[focus],
      sourceKey,
      source: SOURCES[sourceKey]
    });
  }

  return Object.freeze({
    version: VERSION,
    launchKey: LAUNCH_KEY,
    focusTargets: TARGETS,
    sources: SOURCES,
    createPreparationLaunchHash,
    parsePreparationLaunchHash
  });
});
