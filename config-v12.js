/* Methodz Meeting Manager v1.2 configuration extension. */
(function extendMethodzConfigurationV12(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};

  config.schemaVersion = "1.2.0";
  config.appShellVersion = "1.2.0";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    externalExportApprovals: "methodzExternalExportApprovals",
    externalExportApprovalLog: "methodzExternalExportApprovalLog"
  };

  config.externalExportApproval = {
    required: true,
    defaultExpiryDays: 30,
    statuses: ["Pending", "Approved", "Rejected", "Revoked"],
    destinations: [
      {
        id: "canadian-soft-water",
        label: "Canadian Soft Water Corporation",
        allowedProfiles: ["partner-safe", "custom"],
        allowedCustomSections: ["attendees", "agenda", "decisions", "tasks", "attachments", "retention"],
        note: "Internal partner workflow. Discussion notes remain excluded from custom copies unless this policy is deliberately changed."
      },
      {
        id: "method-hvac",
        label: "Method HVAC Inc.",
        allowedProfiles: ["partner-safe", "custom"],
        allowedCustomSections: ["attendees", "agenda", "decisions", "tasks", "attachments", "retention"],
        note: "Internal partner workflow. Discussion notes remain excluded from custom copies unless this policy is deliberately changed."
      },
      {
        id: "public",
        label: "Public / Website",
        allowedProfiles: ["public-summary"],
        allowedCustomSections: [],
        note: "Public release is restricted to the Public Summary profile."
      },
      {
        id: "other-external",
        label: "Other External Recipient",
        allowedProfiles: ["partner-safe", "public-summary"],
        allowedCustomSections: [],
        note: "Use a named approval request and manually verify the intended recipient before release."
      }
    ]
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
