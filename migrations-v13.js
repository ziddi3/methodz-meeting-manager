/* Methodz Meeting Manager v1.3 record-lifecycle schema migration. */
(function registerMethodzV13Migration(global) {
  "use strict";

  const migrations = global.MethodzMigrations;
  if (!migrations || global.__methodzV13MigrationRegistered) return;
  const ensureObject = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};

  function normalizeDispositionControl(record, context) {
    const source = ensureObject(record);
    const control = ensureObject(source.dispositionControl);
    return {
      ...source,
      dispositionControl: {
        approvalRequired: control.approvalRequired !== false,
        lastRequestId: control.lastRequestId || "",
        lastApprovedAt: control.lastApprovedAt || "",
        lastDispositionAt: control.lastDispositionAt || "",
        preservationEventHead: control.preservationEventHead || ""
      },
      schemaAudit: {
        ...ensureObject(source.schemaAudit),
        schemaVersion: "1.3.0",
        migratedAt: source.schemaAudit?.migratedAt || context.migratedAt
      },
      releaseMetadata: {
        ...ensureObject(source.releaseMetadata),
        release: "1.3.0",
        lifecycleGovernanceAt: source.releaseMetadata?.lifecycleGovernanceAt || context.migratedAt
      }
    };
  }

  migrations.registerMigration("1.3.0", "Add record lifecycle approval and preservation event metadata", normalizeDispositionControl);

  const originalValidateRecord = migrations.validateRecord.bind(migrations);
  migrations.validateRecord = function validateRecordV13(record) {
    const result = originalValidateRecord(record);
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    const control = record?.dispositionControl;
    if (!control || typeof control !== "object" || Array.isArray(control)) {
      errors.push("dispositionControl must be an object.");
    } else if (control.approvalRequired !== true) {
      warnings.push("Record lifecycle approval is disabled for this record.");
    }
    return { valid: errors.length === 0, errors, warnings };
  };

  global.__methodzV13MigrationRegistered = true;
})(window);
