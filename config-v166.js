/* Methodz Meeting Manager v1.6.6 synchronization portability configuration. */
(function extendMethodzConfigurationV166(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.6";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    syncRehearsalOperatorEvents: "methodzSyncRehearsalOperatorEventsV166"
  };
  config.syncRehearsal = {
    ...(config.syncRehearsal || {}),
    queuePackageVersion: "1.0.0",
    maximumImportedQueueEntries: 250,
    maximumOperatorEvents: 300,
    staleReviewDays: 30,
    automaticBackgroundSync: false,
    serviceWorkerQueueProcessing: false,
    importApprovalRequired: true,
    productionEndpointConfigured: false,
    productionCredentialsAllowed: false,
    explicitUserActionRequired: true
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
