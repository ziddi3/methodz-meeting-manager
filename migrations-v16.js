/* Methodz Meeting Manager v1.6 optional package-signature metadata migration. */
(function registerMethodzV16Migration(global) {
  "use strict";

  const migrations = global.MethodzMigrations;
  if (!migrations || global.__methodzV16MigrationRegistered) return;

  const ensureObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

  function normalizeSignatureControl(record, context) {
    const source = ensureObject(record);
    const control = ensureObject(source.externalSignatureControl);
    return {
      ...source,
      externalSignatureControl: {
        optional: control.optional !== false,
        lastSignedPackageAt: control.lastSignedPackageAt || "",
        lastSigningKeyId: control.lastSigningKeyId || "",
        lastSignatureAlgorithm: control.lastSignatureAlgorithm || "",
        lastVerificationAt: control.lastVerificationAt || ""
      },
      schemaAudit: {
        ...ensureObject(source.schemaAudit),
        schemaVersion: "1.6.0",
        migratedAt: source.schemaAudit?.migratedAt || context.migratedAt
      },
      releaseMetadata: {
        ...ensureObject(source.releaseMetadata),
        release: "1.6.0",
        cryptographicSigningAt: source.releaseMetadata?.cryptographicSigningAt || context.migratedAt
      }
    };
  }

  migrations.registerMigration(
    "1.6.0",
    "Add optional public-key package-signature metadata",
    normalizeSignatureControl
  );

  const originalValidateRecord = migrations.validateRecord.bind(migrations);
  migrations.validateRecord = function validateRecordV16(record) {
    const result = originalValidateRecord(record);
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    const control = record?.externalSignatureControl;

    if (!control || typeof control !== "object" || Array.isArray(control)) {
      errors.push("externalSignatureControl must be an object.");
    } else {
      [
        "lastSignedPackageAt",
        "lastSigningKeyId",
        "lastSignatureAlgorithm",
        "lastVerificationAt"
      ].forEach((field) => {
        if (control[field] != null && typeof control[field] !== "string") {
          errors.push(`externalSignatureControl.${field} must be a string.`);
        }
      });
      if (control.lastSignedPackageAt && !control.lastSigningKeyId) {
        warnings.push("A signed-package timestamp exists without a signing key identifier.");
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  global.__methodzV16MigrationRegistered = true;
})(window);
