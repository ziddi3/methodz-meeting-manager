/* Methodz Meeting Manager v1.6.9 rollback-preview stability hardening. */
(function hardenTransferRollbackPreviewV169(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const core = global.MethodzTransferAcceptanceCoreV169;
  const originalPrepare = global.prepareTransferRollbackV169;
  const originalApply = global.applyTransferRollbackV169;
  if (!core || typeof originalPrepare !== "function" || typeof originalApply !== "function") return;

  const storageKeys = config.storageKeys || {};
  const volatileKeys = new Set([
    storageKeys.draft,
    storageKeys.transferAcceptanceState,
    storageKeys.transferAcceptanceReports,
    storageKeys.workspaceDiagnosticsReports,
    storageKeys.transferRollbackRecovery,
    storageKeys.crossDeviceTransferState,
    storageKeys.meetingDayPreferences
  ].filter(Boolean));
  let reviewedWorkspaceFingerprint = "";

  function isWorkspaceKey(key) {
    return typeof key === "string" && (key.startsWith("methodz") || key === "meetingRecords");
  }

  function collectStableEntries() {
    const entries = {};
    for (let index = 0; index < global.localStorage.length; index += 1) {
      const key = global.localStorage.key(index);
      if (!isWorkspaceKey(key) || volatileKeys.has(key)) continue;
      const value = global.localStorage.getItem(key);
      if (value !== null) entries[key] = value;
    }
    return entries;
  }

  function stableFingerprint() {
    return core.hashText(core.stableStringify(collectStableEntries()));
  }

  function rollbackPreviewVerified() {
    const preview = document.getElementById("transferRollbackPreviewV169");
    return Boolean(preview && !preview.classList.contains("has-error") && preview.textContent.includes("Verified Rollback Preview"));
  }

  global.prepareTransferRollbackV169 = function prepareStableTransferRollbackV169() {
    const result = originalPrepare.apply(this, arguments);
    reviewedWorkspaceFingerprint = rollbackPreviewVerified() ? stableFingerprint() : "";
    return result;
  };

  global.applyTransferRollbackV169 = function applyStableTransferRollbackV169() {
    const reviewed = document.getElementById("transferRollbackReviewedV169")?.checked === true;
    const phraseElement = document.getElementById("transferRollbackPhraseV169");
    const phrase = phraseElement?.value || "";
    const requiredPhrase = config.transferAcceptance?.rollbackApprovalPhrase || "ROLLBACK";

    if (
      reviewedWorkspaceFingerprint
      && reviewed
      && phrase.trim() === requiredPhrase
      && stableFingerprint() === reviewedWorkspaceFingerprint
    ) {
      // The meeting draft may legitimately update when the operator checks the review box
      // or types the approval phrase. Refresh the internal full snapshot immediately before
      // apply, but only when every non-volatile workspace entry still matches the reviewed
      // preview. Any substantive workspace change continues through the original fail-closed
      // invalidation path.
      originalPrepare.call(this);
      const refreshedReview = document.getElementById("transferRollbackReviewedV169");
      const refreshedPhrase = document.getElementById("transferRollbackPhraseV169");
      if (refreshedReview) refreshedReview.checked = true;
      if (refreshedPhrase) refreshedPhrase.value = phrase;
    }

    return originalApply.apply(this, arguments);
  };
})(window);
