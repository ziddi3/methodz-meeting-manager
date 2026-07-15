/* Methodz Meeting Manager v1.4 recipient-specific export policy configuration. */
(function extendMethodzConfigurationV14(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};

  config.schemaVersion = "1.4.0";
  config.appShellVersion = "1.4.0";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    recipientPolicies: "methodzRecipientExportPolicies",
    recipientPolicyAudit: "methodzRecipientPolicyAudit"
  };

  config.recipientPolicy = {
    maximumPolicies: 200,
    statuses: ["Active", "Inactive"],
    destinationPrefix: "recipient:",
    fieldCatalog: [
      {
        id: "core",
        label: "Core meeting information",
        description: "Meeting number, title, status, date, location, facilitator, schema marker, and external-copy notice.",
        required: true,
        topLevelFields: ["schemaVersion", "meetingNumber", "title", "status", "date", "location", "facilitator", "externalCopy"]
      },
      {
        id: "organizations",
        label: "Organizations / representatives",
        description: "Selected organizations and already-redacted organization snapshots.",
        topLevelFields: ["organizations", "organizationDetails"]
      },
      {
        id: "attendance",
        label: "Attendee names and roles",
        description: "Redacted attendee names, roles, and attendance type. Typed signatures remain excluded.",
        topLevelFields: ["attendees"],
        customSection: "attendees"
      },
      {
        id: "agenda",
        label: "Agenda",
        description: "Agenda groups, items, and completion state.",
        topLevelFields: ["agenda"],
        customSection: "agenda"
      },
      {
        id: "discussion-notes",
        label: "Discussion notes (sensitive)",
        description: "Free-form discussion notes. Requires a documented verification note before this field can be enabled.",
        topLevelFields: ["notes"],
        customSection: "notes",
        sensitive: true
      },
      {
        id: "decisions",
        label: "Decisions",
        description: "Decision text and structured decision entries.",
        topLevelFields: ["decisions", "decisionsList"],
        customSection: "decisions"
      },
      {
        id: "tasks",
        label: "Follow-Up Tasks",
        description: "Task text, Assigned To, priority, due date, and status after redaction.",
        topLevelFields: ["tasks"],
        customSection: "tasks"
      },
      {
        id: "attachments",
        label: "Attachment metadata",
        description: "Redacted attachment-reference metadata. File locations and binary files remain excluded.",
        topLevelFields: ["attachments", "attachmentSummary"],
        customSection: "attachments"
      },
      {
        id: "summary",
        label: "Meeting summary",
        description: "The reviewed meeting summary.",
        topLevelFields: ["summary"]
      },
      {
        id: "retention",
        label: "Retention summary",
        description: "Redacted retention and preservation summary.",
        topLevelFields: ["retentionMetadata"],
        customSection: "retention"
      }
    ]
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
