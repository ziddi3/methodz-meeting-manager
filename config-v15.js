/* Methodz Meeting Manager v1.5 policy operations and release receipt configuration. */
(function extendMethodzConfigurationV15(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};

  config.schemaVersion = "1.5.0";
  config.appShellVersion = "1.5.0";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    recipientPolicyGovernance: "methodzRecipientPolicyGovernance",
    externalReleaseReceipts: "methodzExternalReleaseReceipts"
  };

  config.policyOperations = {
    reviewWindowDays: 30,
    defaultCadenceDays: 180,
    maximumGovernanceEntries: 500,
    maximumReleaseReceipts: 5000,
    stewardRoles: [
      "Administrator",
      "Records Coordinator",
      "Privacy / Compliance Lead",
      "Business Partner",
      "Auditor"
    ],
    riskTiers: ["Standard", "Elevated", "Restricted"]
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
