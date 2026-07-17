/* Methodz Meeting Manager v1.6 optional public-key package signing configuration. */
(function extendMethodzConfigurationV16(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};

  config.schemaVersion = "1.6.0";
  config.appShellVersion = "1.6.0";
  config.storageKeys = {
    ...(config.storageKeys || {}),
    signingPublicKeys: "methodzSigningPublicKeys",
    signingAudit: "methodzSigningAudit"
  };

  config.cryptographicSigning = {
    packageSignatureType: "methodz-ecdsa-p256-sha256",
    protocolVersion: "1.0.0",
    algorithm: "ECDSA",
    namedCurve: "P-256",
    hash: "SHA-256",
    privateKeyStorage: "memory-only",
    maximumPublicKeys: 200,
    maximumAuditEvents: 2000,
    supportedPackageTypes: [
      "methodz-approved-external-meeting-copy",
      "methodz-redacted-meeting-copy",
      "methodz-workspace-backup",
      "methodz-record-export",
      "methodz-recipient-export-policies"
    ]
  };

  global.METHODZ_MEETING_CONFIG = config;
})(window);
