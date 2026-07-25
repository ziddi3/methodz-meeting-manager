/* Methodz Meeting Manager v1.6.6 mobile and cross-device readiness configuration. */
(function extendMethodzConfigurationV166(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.6";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    deviceReadinessState: "methodzDeviceReadinessStateV166"
  };
  config.deviceReadiness = {
    version: "1.0.0",
    enabled: true,
    maximumStoredReports: 1,
    storageWarningPercent: 80,
    minimumTouchTargetPixels: 44,
    reportIncludesMeetingContent: false,
    reportIncludesRecordIds: false,
    reportIncludesCredentials: false,
    reportIncludesKeyMaterial: false,
    persistentStorageRequiresUserAction: true,
    transferRequiresExplicitBackup: true,
    defaultProviderUnchanged: true
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
