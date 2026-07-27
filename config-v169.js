/* Methodz Meeting Manager v1.6.9 transfer acceptance and meeting-day configuration. */
(function extendMethodzConfigurationV169(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.9";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    transferAcceptanceState: "methodzTransferAcceptanceStateV169",
    transferAcceptanceReports: "methodzTransferAcceptanceReportsV169",
    transferRollbackReports: "methodzTransferRollbackReportsV169",
    preRollbackBackup: "methodzPreRollbackBackupV169",
    meetingDayPreferences: "methodzMeetingDayPreferencesV169",
    workspaceDiagnosticsReports: "methodzWorkspaceDiagnosticsReportsV169"
  };
  config.transferAcceptance = {
    version: "1.0.0",
    enabled: true,
    maximumReports: 50,
    maximumRollbackReports: 25,
    acceptancePhrase: "ACCEPT",
    rollbackPhrase: "ROLLBACK",
    requireTransferImportReport: true,
    requirePreImportRecoveryPackage: true,
    automaticAcceptance: false,
    automaticRollback: false,
    metadataOnlyReports: true
  };
  config.meetingDay = {
    enabled: true,
    restoreLastSection: true,
    supportingPanelsCollapsedByDefault: true,
    coreSectionNames: [
      "Meeting Information",
      "Organizations / Representatives Present",
      "Attendance Sign-On",
      "Agenda Checklist",
      "Discussion Notes",
      "Decisions Made",
      "Follow-Up Tasks",
      "Meeting Summary",
      "End of Meeting"
    ]
  };
  config.workspaceDiagnostics = {
    enabled: true,
    maximumReports: 25,
    warningBytes: 8 * 1024 * 1024,
    criticalBytes: 12 * 1024 * 1024,
    quotaWarningRatio: 0.8,
    maximumEntryCount: 500,
    metadataOnlyReports: true
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
