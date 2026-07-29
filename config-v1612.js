/* Methodz Meeting Manager v1.6.12 workspace capacity and performance rehearsal configuration. */
(function extendMethodzConfigurationV1612(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.12";
  config.workspaceCapacity = {
    version: "1.0.0",
    enabled: true,
    maximumStorageEntries: 5000,
    softBudgetBytes: 4194304,
    warningPercent: 70,
    criticalPercent: 90,
    defaultSyntheticRecords: 1000,
    defaultSyntheticTasksPerRecord: 4,
    maximumSyntheticRecords: 5000,
    maximumSyntheticTasksPerRecord: 20,
    performanceTargetMs: 750,
    metadataOnlyExports: true,
    automaticCleanup: false,
    automaticExecution: false,
    recordMutation: false,
    productionEndpointConfigured: false
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
