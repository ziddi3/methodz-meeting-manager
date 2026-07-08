/* Methodz Meeting Manager v0.5 startup helpers. */

window.addEventListener("DOMContentLoaded", initializeV05Startup);

function initializeV05Startup() {
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
