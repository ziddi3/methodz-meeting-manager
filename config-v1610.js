/* Methodz Meeting Manager v1.6.10 panel registry and field-rehearsal configuration. */
(function extendMethodzConfigurationV1610(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.10";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    panelRegistryDiagnostics: "methodzPanelRegistryDiagnosticsV1610",
    fieldRehearsalEvidence: "methodzFieldRehearsalEvidenceV1610"
  };
  config.panelRegistry = {
    version: "1.0.0",
    enabled: true,
    failVisible: true,
    maximumDiagnosticsReports: 25,
    requiredCapturePanelIds: [
      "meeting-information",
      "organizations-present",
      "attendance-sign-on",
      "agenda-checklist",
      "discussion-notes",
      "decisions-made",
      "follow-up-tasks",
      "meeting-summary",
      "end-of-meeting"
    ],
    validGroups: [
      "shell",
      "capture",
      "records",
      "archive",
      "governance",
      "recovery",
      "provider",
      "synchronization",
      "transfer",
      "acceptance",
      "diagnostics"
    ],
    validVisibility: ["visible", "collapsed", "hidden"],
    validPrintBehavior: ["include", "exclude", "summary"]
  };
  config.fieldRehearsal = {
    version: "1.0.0",
    enabled: true,
    maximumEvidenceReports: 25,
    platforms: ["Android", "iOS", "Tablet", "Desktop"],
    evidenceIsMetadataOnly: true,
    automaticExecution: false,
    productionEndpointConfigured: false,
    productionCredentialsAllowed: false
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
