/* Methodz Meeting Manager v1.3 disposition and preservation-audit configuration. */
(function extendMethodzConfigurationV13(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.3.0";
  config.appShellVersion = "1.3.0";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    dispositionApprovals: "methodzDispositionApprovals",
    dispositionAuditLog: "methodzDispositionAuditLog",
    preservationEventChain: "methodzPreservationEventChain"
  };
  config.dispositionApproval = {
    required: true,
    statuses: ["Pending", "Approved", "Rejected", "Revoked", "Consumed"],
    approvalRoles: ["Administrator", "Auditor"],
    requireSeparateReviewer: true,
    eventLimit: 2000,
    approvalLimit: 500
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
