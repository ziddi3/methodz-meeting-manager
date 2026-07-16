/* Methodz Meeting Manager v1.5 policy operations and release receipt migration. */
(function registerMethodzV15Migration(global) {
  "use strict";

  const migrations = global.MethodzMigrations;
  if (!migrations || global.__methodzV15MigrationRegistered) return;

  const ensureObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

  function normalizeReleaseReceiptMetadata(record, context) {
    const source = ensureObject(record);
    const control = ensureObject(source.externalRecipientControl);
    return {
      ...source,
      externalRecipientControl: {
        ...control,
        policyRequired: control.policyRequired === true,
        defaultRecipientPolicyId: control.defaultRecipientPolicyId || "",
        lastRecipientPolicyId: control.lastRecipientPolicyId || "",
        lastRecipientPolicyLabel: control.lastRecipientPolicyLabel || "",
        lastRecipientPolicyAppliedAt: control.lastRecipientPolicyAppliedAt || "",
        lastReleaseReceiptId: control.lastReleaseReceiptId || "",
        lastReleaseReceiptAt: control.lastReleaseReceiptAt || "",
        lastReleaseIntegrityAlgorithm: control.lastReleaseIntegrityAlgorithm || "",
        lastReleaseIntegrityDigest: control.lastReleaseIntegrityDigest || ""
      },
      schemaAudit: {
        ...ensureObject(source.schemaAudit),
        schemaVersion: "1.5.0",
        migratedAt: source.schemaAudit?.migratedAt || context.migratedAt
      },
      releaseMetadata: {
        ...ensureObject(source.releaseMetadata),
        release: "1.5.0",
        policyOperationsAt: source.releaseMetadata?.policyOperationsAt || context.migratedAt
      }
    };
  }

  migrations.registerMigration(
    "1.5.0",
    "Add policy operations and external release receipt metadata",
    normalizeReleaseReceiptMetadata
  );

  const originalValidateRecord = migrations.validateRecord.bind(migrations);
  migrations.validateRecord = function validateRecordV15(record) {
    const result = originalValidateRecord(record);
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    const control = record?.externalRecipientControl;

    if (!control || typeof control !== "object" || Array.isArray(control)) {
      errors.push("externalRecipientControl must be an object.");
    } else {
      [
        "lastReleaseReceiptId",
        "lastReleaseReceiptAt",
        "lastReleaseIntegrityAlgorithm",
        "lastReleaseIntegrityDigest"
      ].forEach((field) => {
        if (control[field] != null && typeof control[field] !== "string") {
          errors.push(`externalRecipientControl.${field} must be a string.`);
        }
      });
      if (control.lastReleaseReceiptId && !control.lastReleaseReceiptAt) {
        warnings.push("A release receipt ID exists without a release receipt timestamp.");
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  global.__methodzV15MigrationRegistered = true;
})(window);
