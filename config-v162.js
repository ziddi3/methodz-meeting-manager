/* Methodz Meeting Manager v1.6.2 public-key custody and rotation configuration. */
(function extendMethodzConfigurationV162(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};

  // This release changes the application shell only. Meeting records remain schema 1.6.0.
  config.appShellVersion = "1.6.2";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    keyCustodyMetadata: "methodzKeyCustodyMetadata",
    keyCustodyAudit: "methodzKeyCustodyAudit"
  };

  config.keyCustody = {
    protocolVersion: "1.0.0",
    manifestPackageType: "methodz-public-key-custody-manifest",
    maximumAuditEvents: 1000,
    maximumCustodyEntries: 200,
    reviewIntervalDays: 180,
    allowedStatuses: ["Active", "Revoked"],
    verificationChannels: [
      "In-person comparison",
      "Voice call comparison",
      "Trusted internal directory",
      "Signed administrative record",
      "Other independently verified channel"
    ]
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
