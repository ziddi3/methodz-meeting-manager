/* Methodz Meeting Manager v1.6.11 live meeting pulse and follow-up review configuration. */
(function extendMethodzConfigurationV1611(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.11";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    followUpReviewPreferences: "methodzFollowUpReviewPreferencesV1611"
  };
  config.followUpReview = {
    version: "1.0.0",
    enabled: true,
    dueSoonDays: 7,
    maximumItems: 500,
    defaultFilter: "attention",
    livePulseEnabled: true,
    exportsRequireExplicitAction: true,
    automaticRecordMutation: false,
    productionEndpointConfigured: false
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
