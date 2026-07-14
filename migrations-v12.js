/* Methodz Meeting Manager v1.2 external-release approval schema migration. */
(function registerMethodzV12Migration(global) {
  "use strict";

  const migrations = global.MethodzMigrations;
  if (!migrations || global.__methodzV12MigrationRegistered) return;

  const ensureObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

  function normalizeExternalReleaseControl(record, context) {
    const source = ensureObject(record);
    const control = ensureObject(source.externalReleaseControl);

    return {
      ...source,
      externalReleaseControl: {
        approvalRequired: control.approvalRequired !== false,
        defaultDestinationPolicyId: control.defaultDestinationPolicyId || "other-external",
        lastApprovalId: control.lastApprovalId || "",
        lastApprovedAt: control.lastApprovedAt || "",
        lastExportAt: control.lastExportAt || ""
      },
      schemaAudit: {
        ...ensureObject(source.schemaAudit),
        schemaVersion: "1.2.0",
        migratedAt: source.schemaAudit?.migratedAt || context.migratedAt
      },
      releaseMetadata: {
        ...ensureObject(source.releaseMetadata),
        release: "1.2.0",
        hardenedAt: source.releaseMetadata?.hardenedAt || context.migratedAt
      }
    };
  }

  migrations.registerMigration(
    "1.2.0",
    "Add external-release approval control metadata",
    normalizeExternalReleaseControl
  );

  const originalValidateRecord = migrations.validateRecord.bind(migrations);
  migrations.validateRecord = function validateRecordV12(record) {
    const result = originalValidateRecord(record);
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    const control = record?.externalReleaseControl;

    if (!control || typeof control !== "object" || Array.isArray(control)) {
      errors.push("externalReleaseControl must be an object.");
    } else {
      if (control.approvalRequired !== true) {
        warnings.push("External export approval is not required for this record.");
      }
      if (!control.defaultDestinationPolicyId) {
        warnings.push("Default external destination policy is missing.");
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  global.__methodzV12MigrationRegistered = true;
})(window);
