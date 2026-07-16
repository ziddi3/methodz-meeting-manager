/* Methodz Meeting Manager v1.5 optional package-signature metadata migration. */
(function registerMethodzV15Migration(global) {
  "use strict";

  const migrations = global.MethodzMigrations;
  if (!migrations || global.__methodzV15MigrationRegistered) return;

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
        schemaVersion: "1.5.0",
        migratedAt: source.schemaAudit?.migratedAt || context.migratedAt
      },
      releaseMetadata: {
        ...ensureObject(source.releaseMetadata),
        release: "1.5.0",
        cryptographicSigningAt: source.releaseMetadata?.cryptographicSigningAt || context.migratedAt
      }
    };
  }

  migrations.registerMigration(
    "1.5.0",
    "Add optional public-key package-signature metadata",
    normalizeSignatureControl
  );

  const originalValidateRecord = migrations.validateRecord.bind(migrations);
  migrations.validateRecord = function validateRecordV15(record) {
    const result = originalValidateRecord(record);
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    const control = record?.externalSignatureControl;

    if (!control || typeof control !== "object" || Array.isArray(control)) {
      errors.push("externalSignatureControl must be an object.");
    } else if (control.lastSignedPackageAt && !control.lastSigningKeyId) {
      warnings.push("A signed-package timestamp exists without a signing key identifier.");
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  global.__methodzV15MigrationRegistered = true;
})(window);
