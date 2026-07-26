/* Methodz Meeting Manager v1.6.8 cross-device transfer rehearsal configuration. */
(function extendMethodzConfigurationV168(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.8";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    crossDeviceTransferState: "methodzCrossDeviceTransferStateV168",
    crossDeviceTransferReports: "methodzCrossDeviceTransferReportsV168"
  };
  config.crossDeviceTransfer = {
    version: "1.0.0",
    enabled: true,
    maximumReports: 50,
    approvalPhrase: "TRANSFER",
    workspaceChecksumRequired: true,
    queueChecksumRequired: true,
    operatorEvidenceChecksumRequired: true,
    destinationReadinessRequired: true,
    recoveryDrillRequired: true,
    explicitImportApprovalRequired: true,
    automaticImport: false,
    automaticSynchronization: false,
    productionEndpointConfigured: false,
    productionCredentialsAllowed: false,
    privateKeyMaterialAllowed: false,
    serviceWorkerTransferProcessing: false,
    defaultProviderUnchanged: true
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
