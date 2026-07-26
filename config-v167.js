/* Methodz Meeting Manager v1.6.7 mobile and cross-device readiness configuration. */
(function extendMethodzConfigurationV167(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.7";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    deviceReadinessState: "methodzDeviceReadinessStateV167"
  };
  config.deviceReadiness = {
    version: "1.0.0",
    enabled: true,
    storageWarningPercent: 80,
    minimumTouchTargetPixels: 44,
    persistentStorageRequiresUserAction: true,
    transferRequiresExplicitBackup: true,
    reportIncludesMeetingContent: false,
    reportIncludesRecordIds: false,
    reportIncludesCredentials: false,
    reportIncludesKeyMaterial: false,
    productionEndpointConfigured: false,
    defaultProviderUnchanged: true
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
