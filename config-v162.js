/* Methodz Meeting Manager v1.6.2 public-key custody and operational hardening configuration. */
(function extendMethodzConfigurationV162(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.appShellVersion = "1.6.2";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    signingCustodyEvents: "methodzSigningCustodyEvents"
  };
  config.keyCustody = {
    protocolVersion: "1.0.0",
    maximumEvents: 500,
    supportedEventTypes: ["rotation", "revocation", "lost-key-response", "recovery-rehearsal"],
    completedEventChecklistRequired: true,
    privateKeyPersistence: "prohibited"
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
