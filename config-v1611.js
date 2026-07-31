/* Methodz Meeting Manager v1.6.11 live meeting pulse, follow-up review, and planning configuration. */
(function extendMethodzConfigurationV1611(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.11";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    followUpReviewPreferences: "methodzFollowUpReviewPreferencesV1611",
    followUpPlanningPreferences: "methodzFollowUpPlanningPreferencesV1613"
  };
  config.followUpReview = {
    version: "1.1.0",
    enabled: true,
    dueSoonDays: 7,
    maximumItems: 500,
    defaultFilter: "attention",
    livePulseEnabled: true,
    focusEnabled: true,
    focusMaximumItems: 7,
    focusMaximumAssignees: 8,
    exportsRequireExplicitAction: true,
    automaticRecordMutation: false,
    automaticReminderDelivery: false,
    productionEndpointConfigured: false
  };
  config.followUpPlanning = {
    version: "1.0.0",
    enabled: true,
    defaultHorizonDays: 7,
    horizonOptions: [7, 14, 30],
    maximumItems: 40,
    maximumAssignees: 12,
    exportsRequireExplicitAction: true,
    automaticRecordMutation: false,
    automaticAssignment: false,
    automaticReminderDelivery: false,
    automaticSynchronization: false,
    productionEndpointConfigured: false
  };

  global.METHODZ_MEETING_CONFIG = config;

  function ensureStylesheet(href, id) {
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src, id) {
    if (document.getElementById(id)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.id = id;
      script.src = src;
      script.async = false;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error(`Unable to load ${src}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  if (typeof document !== "undefined" && document.head) {
    ensureStylesheet("features-v1613.css", "methodzFollowUpPlanningStylesV1613");
    global.METHODZ_FOLLOW_UP_PLANNING_ASSETS_READY = loadScript("follow-up-planning-core.js", "methodzFollowUpPlanningCoreV1613")
      .then(() => loadScript("features-v1613-follow-up-planning.js", "methodzFollowUpPlanningFeaturesV1613"))
      .catch((error) => {
        console.error("Follow-Up Planning Brief assets could not be loaded", error);
        return false;
      });
  }
})(window);
