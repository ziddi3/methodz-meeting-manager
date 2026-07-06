/* Startup helpers for the v0.3 enhancement layer. */

window.addEventListener("DOMContentLoaded", applyV03StartupHelpers);

function applyV03StartupHelpers() {
  restoreV03DecisionDraft();
  refreshSavedRecordCardsForV03();
}

function restoreV03DecisionDraft() {
  const config = window.METHODZ_MEETING_CONFIG;
  const draftKey = config?.storageKeys?.draft;
  const decisionContainer = document.getElementById("structuredDecisionList");

  if (!draftKey || !decisionContainer || decisionContainer.children.length) return;

  try {
    const draft = JSON.parse(localStorage.getItem(draftKey));
    if (!draft?.decisionsList?.length || typeof window.addStructuredDecision !== "function") return;

    draft.decisionsList.forEach((decision) => window.addStructuredDecision(decision));

    if (typeof window.setDraftStatus === "function") {
      window.setDraftStatus("Draft restored with structured decisions");
    }
  } catch (error) {
    console.error("Unable to restore v0.3 structured decision draft", error);
  }
}

function refreshSavedRecordCardsForV03() {
  if (typeof window.loadSavedRecords === "function") {
    window.loadSavedRecords();
  }
}
