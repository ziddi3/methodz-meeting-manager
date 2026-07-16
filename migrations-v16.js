/* Methodz Meeting Manager v1.6 optional cryptographic package metadata migration. */
(function registerMethodzV16Migration(global) {
  "use strict";

  const migrations = global.MethodzMigrations;
  if (!migrations || global.__methodzV16MigrationRegistered) return;

  const objectValue = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

  function migrate(record, context) {
    const source = objectValue(record);
    const control = objectValue(source.externalSignatureControl);
    return {
      ...source,
      schemaVersion: "1.6.0",
      externalSignatureControl: {
        optional: control.optional !== false,
        lastSignedPackageAt: String(control.lastSignedPackageAt || ""),
        lastSigningKeyId: String(control.lastSigningKeyId || ""),
        lastSignatureAlgorithm: String(control.lastSignatureAlgorithm || ""),
        lastVerificationAt: String(control.lastVerificationAt || "")
      },
      schemaAudit: {
        ...objectValue(source.schemaAudit),
        schemaVersion: "1.6.0",
        migratedAt: source.schemaAudit?.migratedAt || context.migratedAt
      },
      releaseMetadata: {
        ...objectValue(source.releaseMetadata),
        release: "1.6.0",
        cryptographicSigningAt: source.releaseMetadata?.cryptographicSigningAt || context.migratedAt
      }
    };
  }

  migrations.registerMigration("1.6.0", "Add optional cryptographic package metadata", migrate);

  const originalValidate = migrations.validateRecord.bind(migrations);
  migrations.validateRecord = function validateRecordV16(record) {
    const result = originalValidate(record);
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    const control = record?.externalSignatureControl;

    if (!control || typeof control !== "object" || Array.isArray(control)) {
      errors.push("externalSignatureControl must be an object.");
    } else {
      ["lastSignedPackageAt", "lastSigningKeyId", "lastSignatureAlgorithm", "lastVerificationAt"].forEach((field) => {
        if (control[field] != null && typeof control[field] !== "string") {
          errors.push(`externalSignatureControl.${field} must be a string.`);
        }
      });
      if (control.lastSignedPackageAt && !control.lastSigningKeyId) {
        warnings.push("Signed-package metadata is missing a signing key identifier.");
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  global.__methodzV16MigrationRegistered = true;
})(window);
