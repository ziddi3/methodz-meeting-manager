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
    transferRollbackRecovery: "methodzTransferRollbackRecoveryV169",
    meetingDayPreferences: "methodzMeetingDayPreferencesV169",
    workspaceDiagnosticsReports: "methodzWorkspaceDiagnosticsReportsV169"
  };
  config.transferAcceptance = {
    version: "1.0.0",
    enabled: true,
    maximumReports: 50,
    maximumDiagnosticsReports: 25,
    rollbackApprovalPhrase: "ROLLBACK",
    softStorageByteLimit: 4 * 1024 * 1024,
    storageWarningRatio: 0.75,
    verifiedTransferRequired: true,
    explicitAcceptanceRequired: true,
    explicitRollbackRequired: true,
    automaticAcceptance: false,
    automaticRollback: false,
    automaticSynchronization: false,
    productionEndpointConfigured: false,
    productionCredentialsAllowed: false,
    privateKeyMaterialAllowed: false,
    serviceWorkerWorkspaceAccess: false,
    recordSchemaChange: false
  };
  config.meetingDay = {
    version: "1.0.0",
    enabled: true,
    defaultEnabled: false,
    restorePreferences: true,
    collapseSecondaryTools: true,
    automaticSave: false,
    automaticNavigation: false
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
