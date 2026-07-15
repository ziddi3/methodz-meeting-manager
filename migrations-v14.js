/* Methodz Meeting Manager v1.4 recipient-specific export policy migration. */
(function registerMethodzV14Migration(global) {
  "use strict";

  const migrations = global.MethodzMigrations;
  if (!migrations || global.__methodzV14MigrationRegistered) return;

  const ensureObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

  function normalizeRecipientControl(record, context) {
    const source = ensureObject(record);
    const control = ensureObject(source.externalRecipientControl);
    return {
      ...source,
      externalRecipientControl: {
        policyRequired: control.policyRequired === true,
        defaultRecipientPolicyId: control.defaultRecipientPolicyId || "",
        lastRecipientPolicyId: control.lastRecipientPolicyId || "",
        lastRecipientPolicyLabel: control.lastRecipientPolicyLabel || "",
        lastRecipientPolicyAppliedAt: control.lastRecipientPolicyAppliedAt || ""
      },
      schemaAudit: {
        ...ensureObject(source.schemaAudit),
        schemaVersion: "1.4.0",
        migratedAt: source.schemaAudit?.migratedAt || context.migratedAt
      },
      releaseMetadata: {
        ...ensureObject(source.releaseMetadata),
        release: "1.4.0",
        recipientPolicyGovernanceAt: source.releaseMetadata?.recipientPolicyGovernanceAt || context.migratedAt
      }
    };
  }

  migrations.registerMigration(
    "1.4.0",
    "Add recipient-specific external export policy metadata",
    normalizeRecipientControl
  );

  const originalValidateRecord = migrations.validateRecord.bind(migrations);
  migrations.validateRecord = function validateRecordV14(record) {
    const result = originalValidateRecord(record);
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    const control = record?.externalRecipientControl;

    if (!control || typeof control !== "object" || Array.isArray(control)) {
      errors.push("externalRecipientControl must be an object.");
    } else if (control.policyRequired && !control.defaultRecipientPolicyId) {
      warnings.push("Recipient policy is required but no default recipient policy is assigned.");
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  global.__methodzV14MigrationRegistered = true;
})(window);
