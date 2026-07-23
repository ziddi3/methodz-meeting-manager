/* Methodz Meeting Manager v1.6.4 hosted-provider pilot configuration. */
(function extendMethodzConfigurationV164(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.4";
  config.hostedProviderPilot = {
    version: "1.0.0",
    enabledInApplication: false,
    environment: "ci-only",
    transport: "serialized-http-style-simulator",
    productionEndpointConfigured: false,
    productionCredentialsAllowed: false,
    defaultProviderUnchanged: true
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
