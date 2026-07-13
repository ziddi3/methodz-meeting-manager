/* Methodz Meeting Manager v1.1 configuration extension. */
(function extendMethodzConfigurationV11(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};

  config.schemaVersion = "1.1.0";
  config.appShellVersion = "1.1.0";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    redactionLog: "methodzRedactionExportLog"
  };

  config.retentionPolicies = [
    {
      id: "operational-review-2y",
      label: "Operational Review - 2 Years",
      years: 2,
      note: "Review after two years. This is an internal workflow preset, not legal advice."
    },
    {
      id: "business-review-7y",
      label: "Business Record Review - 7 Years",
      years: 7,
      note: "Review after seven years. Confirm applicable legal and contractual requirements before disposition."
    },
    {
      id: "permanent",
      label: "Permanent / Do Not Dispose",
      years: null,
      note: "Retain indefinitely unless an authorized policy change is recorded."
    },
    {
      id: "custom",
      label: "Custom Review Date",
      years: null,
      note: "Choose a review date based on the applicable business, legal, insurance, or contractual requirement."
    }
  ];

  config.retentionLifecycleStatuses = [
    "Active",
    "Review Due",
    "Retained After Review",
    "Disposition Approved"
  ];

  config.redactionProfiles = [
    {
      id: "partner-safe",
      label: "Partner Safe",
      description: "Keeps operational decisions, tasks, agenda, and summary while removing signatures, internal notes, contact details, protected governance notes, and file locations."
    },
    {
      id: "public-summary",
      label: "Public Summary",
      description: "Exports only high-level meeting metadata, organizations, completed agenda items, approved decisions, and the meeting summary."
    },
    {
      id: "custom",
      label: "Custom External Copy",
      description: "Uses the section controls below. Typed signatures and verification details are always removed."
    }
  ];

  global.METHODZ_MEETING_CONFIG = config;
})(window);
