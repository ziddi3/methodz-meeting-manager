/* Methodz Meeting Manager v1.6.3 hosted-provider conformance configuration. */
(function extendMethodzConfigurationV163(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.3";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    providerIdempotency: "methodzProviderIdempotency"
  };
  config.hostedProviderContract = {
    version: "1.0.0",
    defaultProvider: "local-storage-hosted-provider",
    attachmentMode: "references-only",
    binaryAttachments: false,
    conflictStrategy: "expected-conflict-token",
    idempotencyKeyMaximumLength: 200,
    privateKeyMaterialAllowed: false
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
