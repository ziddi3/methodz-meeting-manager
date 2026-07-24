/* Methodz Meeting Manager v1.6.5 offline synchronization rehearsal configuration. */
(function extendMethodzConfigurationV165(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.5";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    syncRehearsalQueue: "methodzSyncRehearsalQueueV165",
    syncRehearsalState: "methodzSyncRehearsalStateV165",
    syncRehearsalReports: "methodzSyncRehearsalReportsV165"
  };
  config.syncRehearsal = {
    version: "1.0.0",
    enabled: true,
    provider: "disposable-http-pilot",
    defaultTenantId: "methodz-rehearsal",
    maximumQueueEntries: 250,
    maximumReports: 100,
    automaticBackgroundSync: false,
    productionEndpointConfigured: false,
    productionCredentialsAllowed: false,
    defaultProviderUnchanged: true,
    explicitUserActionRequired: true
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
