/* Methodz Meeting Manager v1.2 approval-governance schema migration. */
(function registerMethodzV12Migration(global) {
  "use strict";

  const migrations = global.MethodzMigrations;
  if (!migrations || global.__methodzV12MigrationRegistered) return;

  const ensureObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

  function normalizeApprovals(record, context) {
    const source = ensureObject(record);
    const approval = ensureObject(source.approvalMetadata);

    return {
      ...source,
      approvalMetadata: {
        exportApprovalRequired: approval.exportApprovalRequired !== false,
        dispositionApprovalRequired: approval.dispositionApprovalRequired !== false,
        lastApprovedExportId: approval.lastApprovedExportId || "",
        lastApprovedExportAt: approval.lastApprovedExportAt || "",
        lastDispositionApprovalId: approval.lastDispositionApprovalId || "",
        lastDispositionApprovedAt: approval.lastDispositionApprovedAt || "",
        updatedAt: approval.updatedAt || context.migratedAt
      },
      schemaAudit: {
        ...ensureObject(source.schemaAudit),
        schemaVersion: "1.2.0",
        migratedAt: source.schemaAudit?.migratedAt || context.migratedAt
      },
      releaseMetadata: {
        ...ensureObject(source.releaseMetadata),
        release: "1.2.0",
        approvalGovernanceAt: source.releaseMetadata?.approvalGovernanceAt || context.migratedAt
      }
    };
  }

  migrations.registerMigration(
    "1.2.0",
    "Add external-export approval and disposition-approval metadata",
    normalizeApprovals
  );

  const originalValidateRecord = migrations.validateRecord.bind(migrations);
  migrations.validateRecord = function validateRecordV12(record) {
    const result = originalValidateRecord(record);
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    const approval = record?.approvalMetadata;

    if (!approval || typeof approval !== "object" || Array.isArray(approval)) {
      errors.push("approvalMetadata must be an object.");
    } else {
      if (approval.exportApprovalRequired !== true) warnings.push("External export approval is disabled for this record.");
      if (approval.dispositionApprovalRequired !== true) warnings.push("Disposition approval is disabled for this record.");
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  global.__methodzV12MigrationRegistered = true;
})(window);
