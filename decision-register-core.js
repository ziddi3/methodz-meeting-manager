/* Methodz Meeting Manager portable, read-only Decision Register core. */
(function exposeMethodzDecisionRegisterCore(root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzDecisionRegisterCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzDecisionRegisterCore() {
  "use strict";

  const VERSION = "1.0.0";
  const KNOWN_LANES = Object.freeze({
    approved: "approved",
    proposed: "proposed",
    deferred: "deferred",
    reversed: "reversed"
  });
  const LANE_ORDER = Object.freeze({
    "needs-review": 0,
    proposed: 1,
    deferred: 2,
    approved: 3,
    reversed: 4,
    other: 5
  });
  const TEXT_LIMITS = Object.freeze({
    meetingNumber: 80,
    meetingTitle: 240,
    decision: 1000,
    approvedBy: 240,
    notes: 1000,
    status: 80
  });

  const text = (value) => String(value ?? "").trim();

  function boundedInteger(value, fallback, minimum, maximum) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    return Math.min(maximum, Math.max(minimum, Math.trunc(numeric)));
  }

  function boundedText(value, maximum) {
    const normalized = text(value);
    return {
      value: normalized.slice(0, maximum),
      truncated: normalized.length > maximum
    };
  }

  function dateOnly(value) {
    const raw = text(value);
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const milliseconds = Date.UTC(year, month - 1, day);
    const parsed = new Date(milliseconds);
    if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
    return Object.freeze({ raw, milliseconds });
  }

  function meaningfulDecision(value) {
    if (!value || typeof value !== "object") return false;
    return [value.decision, value.approvedBy, value.date, value.status, value.notes].some((item) => text(item));
  }

  function normalizeStatus(value) {
    const label = boundedText(value, TEXT_LIMITS.status);
    const normalized = label.value.toLowerCase();
    return {
      label: label.value,
      normalized,
      truncated: label.truncated,
      knownLane: KNOWN_LANES[normalized] || ""
    };
  }

  function classifyDecision(value) {
    const status = normalizeStatus(value?.status);
    const issues = [];
    const rawDate = text(value?.date);
    const parsedDate = dateOnly(rawDate);

    if (!text(value?.decision)) issues.push("missing-decision");
    if (!text(value?.approvedBy)) issues.push("missing-approved-by");
    if (!rawDate) issues.push("missing-date");
    else if (!parsedDate) issues.push("invalid-date");
    if (!status.label) issues.push("missing-status");
    else if (!status.knownLane) issues.push("unsupported-status");

    return Object.freeze({
      lane: issues.length ? "needs-review" : status.knownLane,
      issues: Object.freeze(issues),
      status,
      parsedDate
    });
  }

  function sourceIdentity(record) {
    const number = boundedText(record?.meetingNumber, TEXT_LIMITS.meetingNumber);
    const title = boundedText(record?.title || "Untitled Meeting", TEXT_LIMITS.meetingTitle);
    return {
      recordId: text(record?.id).slice(0, 256),
      meetingNumber: number.value,
      meetingTitle: title.value || "Untitled Meeting",
      meetingDate: dateOnly(record?.date)?.raw || text(record?.date).slice(0, 40),
      meetingStatus: text(record?.status).slice(0, 80),
      identityTruncated: number.truncated || title.truncated
    };
  }

  function normalizeEntry(record, decision, decisionIndex) {
    const identity = sourceIdentity(record);
    const decisionText = boundedText(decision?.decision, TEXT_LIMITS.decision);
    const approvedBy = boundedText(decision?.approvedBy, TEXT_LIMITS.approvedBy);
    const notes = boundedText(decision?.notes, TEXT_LIMITS.notes);
    const classification = classifyDecision(decision);
    const truncatedFields = [];
    if (identity.identityTruncated) truncatedFields.push("source-identity");
    if (decisionText.truncated) truncatedFields.push("decision");
    if (approvedBy.truncated) truncatedFields.push("approved-by");
    if (notes.truncated) truncatedFields.push("notes");
    if (classification.status.truncated) truncatedFields.push("status");

    return {
      ...identity,
      decisionIndex,
      decision: decisionText.value,
      approvedBy: approvedBy.value,
      decisionDate: classification.parsedDate?.raw || text(decision?.date).slice(0, 40),
      status: classification.status.label,
      lane: classification.lane,
      issues: [...classification.issues],
      notes: notes.value,
      truncatedFields,
      sourceHasFreeFormDecisionNotes: Boolean(text(record?.decisions))
    };
  }

  function compareEntries(left, right) {
    const laneDifference = (LANE_ORDER[left.lane] ?? 99) - (LANE_ORDER[right.lane] ?? 99);
    if (laneDifference) return laneDifference;
    const leftDate = dateOnly(left.decisionDate)?.milliseconds ?? dateOnly(left.meetingDate)?.milliseconds ?? Number.MIN_SAFE_INTEGER;
    const rightDate = dateOnly(right.decisionDate)?.milliseconds ?? dateOnly(right.meetingDate)?.milliseconds ?? Number.MIN_SAFE_INTEGER;
    if (leftDate !== rightDate) return rightDate - leftDate;
    return left.meetingTitle.localeCompare(right.meetingTitle)
      || left.meetingNumber.localeCompare(right.meetingNumber)
      || left.decisionIndex - right.decisionIndex;
  }

  function buildDecisionRegister(records, options = {}) {
    const source = Array.isArray(records) ? records : [];
    const maximumRecords = boundedInteger(options.maximumRecords, 500, 1, 5000);
    const maximumDecisionsPerRecord = boundedInteger(options.maximumDecisionsPerRecord, 100, 1, 1000);
    const maximumEntries = boundedInteger(options.maximumEntries, 500, 1, 5000);
    const maximumUnstructuredRecords = boundedInteger(options.maximumUnstructuredRecords, 100, 1, 1000);
    const candidates = [];
    const unstructured = [];
    const recordsOverDecisionLimit = [];
    const selectedRecords = source.slice(0, maximumRecords);

    selectedRecords.forEach((record) => {
      if (!record || typeof record !== "object") return;
      const decisions = Array.isArray(record.decisionsList) ? record.decisionsList.filter(meaningfulDecision) : [];
      if (decisions.length > maximumDecisionsPerRecord) {
        recordsOverDecisionLimit.push({
          ...sourceIdentity(record),
          totalStructuredDecisions: decisions.length,
          maximumDecisionsPerRecord
        });
      }
      decisions.slice(0, maximumDecisionsPerRecord).forEach((decision, decisionIndex) => {
        candidates.push(normalizeEntry(record, decision, decisionIndex));
      });

      if (!decisions.length && text(record.decisions)) {
        unstructured.push({
          ...sourceIdentity(record),
          lane: "unstructured",
          reason: "free-form-only"
        });
      }
    });

    candidates.sort(compareEntries);
    unstructured.sort((left, right) => {
      const leftDate = dateOnly(left.meetingDate)?.milliseconds ?? Number.MIN_SAFE_INTEGER;
      const rightDate = dateOnly(right.meetingDate)?.milliseconds ?? Number.MIN_SAFE_INTEGER;
      if (leftDate !== rightDate) return rightDate - leftDate;
      return left.meetingTitle.localeCompare(right.meetingTitle) || left.meetingNumber.localeCompare(right.meetingNumber);
    });

    const countLane = (lane) => candidates.filter((entry) => entry.lane === lane).length;
    const issueCount = (issue) => candidates.filter((entry) => entry.issues.includes(issue)).length;
    const selectedEntries = candidates.slice(0, maximumEntries);
    const selectedUnstructured = unstructured.slice(0, maximumUnstructuredRecords);

    return {
      reportType: "methodz-decision-register",
      reportVersion: VERSION,
      generatedAt: new Date().toISOString(),
      counts: {
        savedRecords: source.length,
        processedRecords: selectedRecords.length,
        structuredDecisions: candidates.length,
        needsReview: countLane("needs-review"),
        proposed: countLane("proposed"),
        deferred: countLane("deferred"),
        approved: countLane("approved"),
        reversed: countLane("reversed"),
        other: countLane("other"),
        freeFormOnlyRecords: unstructured.length,
        missingDecision: issueCount("missing-decision"),
        missingApprovedBy: issueCount("missing-approved-by"),
        missingDate: issueCount("missing-date"),
        invalidDate: issueCount("invalid-date"),
        missingStatus: issueCount("missing-status"),
        unsupportedStatus: issueCount("unsupported-status")
      },
      limits: {
        maximumRecords,
        maximumDecisionsPerRecord,
        maximumEntries,
        maximumUnstructuredRecords
      },
      truncation: {
        records: source.length > maximumRecords,
        entries: candidates.length > maximumEntries,
        unstructured: unstructured.length > maximumUnstructuredRecords,
        recordsOverDecisionLimit: recordsOverDecisionLimit.length > 0,
        omittedRecords: Math.max(0, source.length - maximumRecords),
        omittedEntries: Math.max(0, candidates.length - maximumEntries),
        omittedUnstructuredRecords: Math.max(0, unstructured.length - maximumUnstructuredRecords)
      },
      recordsOverDecisionLimit,
      entries: selectedEntries,
      unstructured: selectedUnstructured
    };
  }

  return Object.freeze({
    version: VERSION,
    dateOnly,
    meaningfulDecision,
    classifyDecision,
    buildDecisionRegister
  });
});
