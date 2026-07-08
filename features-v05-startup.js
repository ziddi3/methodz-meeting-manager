/* Methodz Meeting Manager v0.5 startup helpers. */

window.addEventListener("DOMContentLoaded", initializeV05Startup);

function initializeV05Startup() {
  patchImportedRecordNormalizationV05();

  window.setTimeout(() => {
    restoreAttachmentDraftV05();
    if (typeof window.refreshSignatureSummaryV05 === "function") window.refreshSignatureSummaryV05();
    if (typeof window.refreshAttachmentDashboardV05 === "function") window.refreshAttachmentDashboardV05();
  }, 0);
}

function restoreAttachmentDraftV05() {
  const list = document.getElementById("attachmentReferenceList");
  if (!list || list.querySelector(".attachment-reference-item")) return;

  try {
    const key = window.METHODZ_MEETING_CONFIG?.storageKeys?.draft || "methodzMeetingDraft";
    const draft = JSON.parse(localStorage.getItem(key));
    if (!draft?.attachments?.length) return;

    if (typeof window.renderAttachmentReferencesV05 === "function") {
      window.renderAttachmentReferencesV05(draft.attachments);
    }
  } catch (error) {
    console.error("Unable to restore v0.5 attachment draft data", error);
  }
}

function patchImportedRecordNormalizationV05() {
  if (window.__methodzV05ImportNormalizationPatched) return;

  const originalNormalizeImportedRecord = window.normalizeImportedRecord;

  window.normalizeImportedRecord = function normalizeImportedRecordV05(record) {
    const normalized = typeof originalNormalizeImportedRecord === "function"
      ? originalNormalizeImportedRecord(record)
      : fallbackNormalizeImportedRecordV05(record);

    const attachments = Array.isArray(record.attachments) ? record.attachments : [];
    const attendees = Array.isArray(normalized.attendees) ? normalized.attendees : [];

    return {
      ...normalized,
      schemaVersion: record.schemaVersion || window.METHODZ_MEETING_CONFIG?.schemaVersion || "0.5.0",
      attachments,
      attachmentSummary: record.attachmentSummary || summarizeImportedAttachmentsV05(attachments),
      signatureAudit: record.signatureAudit || buildImportedSignatureAuditV05(attendees),
      directorySnapshot: Array.isArray(record.directorySnapshot) ? record.directorySnapshot : []
    };
  };

  window.__methodzV05ImportNormalizationPatched = true;
}

function fallbackNormalizeImportedRecordV05(record) {
  const now = new Date().toISOString();
  return {
    id: record.id || `meeting-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    schemaVersion: record.schemaVersion || window.METHODZ_MEETING_CONFIG?.schemaVersion || "0.5.0",
    meetingNumber: record.meetingNumber || "IMP",
    title: record.title || "Imported Meeting",
    status: record.status || "Archived",
    date: record.date || "",
    location: record.location || "",
    facilitator: record.facilitator || "",
    organizations: Array.isArray(record.organizations) ? record.organizations : [],
    attendees: Array.isArray(record.attendees) ? record.attendees : [],
    agenda: Array.isArray(record.agenda) ? record.agenda : [],
    notes: record.notes || "",
    decisions: record.decisions || "",
    decisionsList: Array.isArray(record.decisionsList) ? record.decisionsList : [],
    tasks: Array.isArray(record.tasks) ? record.tasks : [],
    summary: record.summary || "",
    validation: Array.isArray(record.validation) ? record.validation : [],
    createdAt: record.createdAt || now,
    updatedAt: record.updatedAt || now,
    savedAt: record.savedAt || now
  };
}

function summarizeImportedAttachmentsV05(attachments) {
  const byType = {};
  (attachments || []).forEach((attachment) => {
    const type = attachment.type || "Other";
    byType[type] = (byType[type] || 0) + 1;
  });
  return { total: (attachments || []).length, byType };
}

function buildImportedSignatureAuditV05(attendees) {
  if (typeof window.buildSignatureAuditV05 === "function") return window.buildSignatureAuditV05(attendees);

  const list = attendees || [];
  const named = list.filter((person) => person.name).length;
  const signed = list.filter((person) => person.signature).length;
  const unsignedNamed = list.filter((person) => person.name && !person.signature).length;

  return {
    totalAttendees: list.length,
    namedAttendees: named,
    signedAttendees: signed,
    unsignedNamedAttendees: unsignedNamed,
    completed: unsignedNamed === 0 && signed > 0,
    generatedAt: new Date().toISOString()
  };
}
