/* Methodz Meeting Manager v1.2 approval and disposition configuration. */
(function extendMethodzConfigurationV12(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};

  config.schemaVersion = "1.2.0";
  config.appShellVersion = "1.2.0";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    exportApprovals: "methodzExternalExportApprovals",
    exportApprovalLog: "methodzExternalExportApprovalLog",
    dispositionApprovals: "methodzDispositionApprovals",
    dispositionLog: "methodzDispositionLog"
  };

  config.exportApprovalRoles = ["Administrator", "Auditor"];
  config.dispositionApprovalRoles = ["Administrator", "Auditor"];

  config.exportRecipientPolicies = [
    {
      id: "approved-partner",
      label: "Approved Partner Organization",
      description: "Operational sharing with an approved partner using the Partner Safe profile.",
      allowedProfiles: ["partner-safe"]
    },
    {
      id: "public-communications",
      label: "Public Communications",
      description: "High-level publication using the Public Summary profile only.",
      allowedProfiles: ["public-summary"]
    },
    {
      id: "contractual-custom",
      label: "Contractual / Custom Recipient",
      description: "A documented recipient whose agreement permits Partner Safe or reviewed custom sections.",
      allowedProfiles: ["partner-safe", "custom"],
      requiresNoteForCustom: true
    }
  ];

  config.approvalStatuses = [
    "Not Requested",
    "Review Requested",
    "Approved",
    "Rejected",
    "Revoked",
    "Consumed"
  ];

  global.METHODZ_MEETING_CONFIG = config;
})(window);
