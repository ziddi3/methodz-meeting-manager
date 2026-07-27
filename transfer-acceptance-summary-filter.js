/* Methodz Meeting Manager v1.6.9 acceptance-summary evidence filter. */
(function installTransferAcceptanceSummaryFilterV169(global) {
  "use strict";

  const base = global.MethodzTransferAcceptanceCoreV169;
  if (!base || typeof base.buildComponentSummary !== "function") return;

  const config = global.METHODZ_MEETING_CONFIG || {};
  const storageKeys = config.storageKeys || {};
  const excludedKeys = new Set([
    storageKeys.draft,
    storageKeys.preRestoreBackup,
    storageKeys.accessibilityPreferences,
    storageKeys.crossDeviceTransferState,
    storageKeys.crossDeviceTransferReports,
    storageKeys.deviceReadinessReports,
    storageKeys.transferAcceptanceState,
    storageKeys.transferAcceptanceReports,
    storageKeys.transferRollbackRecovery,
    storageKeys.meetingDayPreferences,
    storageKeys.workspaceDiagnosticsReports
  ].filter(Boolean));

  function isOperationalEvidenceKey(key) {
    if (excludedKeys.has(key)) return true;
    const normalized = String(key || "").toLowerCase();
    return [
      "methodzmeetingdraft",
      "methodzprerestorebackup",
      "methodzaccessibilitypreferences",
      "methodzcrossdevicetransferstate",
      "methodzcrossdevicetransferreports",
      "methodzdevicereadinessreports",
      "methodztransferacceptancestate",
      "methodztransferacceptancereports",
      "methodztransferrollbackrecovery",
      "methodzmeetingdaypreferences",
      "methodzworkspacediagnosticsreports"
    ].some((prefix) => normalized.startsWith(prefix));
  }

  function filterEntries(entries) {
    return Object.fromEntries(
      Object.entries(entries && typeof entries === "object" ? entries : {})
        .filter(([key, value]) => typeof value === "string" && !isOperationalEvidenceKey(key))
    );
  }

  const filteredCore = Object.freeze({
    ...base,
    buildComponentSummary(options = {}) {
      return base.buildComponentSummary({
        ...options,
        entries: filterEntries(options.entries)
      });
    },
    filterWorkspaceEntriesV169: filterEntries,
    isOperationalEvidenceKeyV169: isOperationalEvidenceKey
  });

  global.MethodzTransferAcceptanceCoreV169 = filteredCore;
})(window);
