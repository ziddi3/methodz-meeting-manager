/* Methodz Meeting Manager v1.1 retention and redaction schema migration. */
(function registerMethodzV11Migration(global) {
  "use strict";

  const migrations = global.MethodzMigrations;
  if (!migrations || global.__methodzV11MigrationRegistered) return;

  const ensureArray = (value) => (Array.isArray(value) ? value : []);
  const ensureObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

  function normalizeRetention(record, context) {
    const source = ensureObject(record);
    const retention = ensureObject(source.retentionMetadata);
    const hold = ensureObject(retention.legalHold);
    const history = ensureArray(retention.holdHistory);

    return {
      ...source,
      retentionMetadata: {
        policyId: retention.policyId || "business-review-7y",
        reviewDate: retention.reviewDate || "",
        lifecycleStatus: retention.lifecycleStatus || "Active",
        note: retention.note || "",
        legalHold: {
          active: Boolean(hold.active),
          reason: hold.reason || "",
          placedBy: hold.placedBy || "",
          placedAt: hold.placedAt || "",
          releasedBy: hold.releasedBy || "",
          releasedAt: hold.releasedAt || "",
          releaseNote: hold.releaseNote || ""
        },
        holdHistory: history,
        updatedAt: retention.updatedAt || context.migratedAt
      },
      redactionMetadata: {
        ...ensureObject(source.redactionMetadata),
        sourceSchemaVersion: source.redactionMetadata?.sourceSchemaVersion || source.schemaVersion || "1.0.0",
        lastExternalExportAt: source.redactionMetadata?.lastExternalExportAt || "",
        lastExternalProfile: source.redactionMetadata?.lastExternalProfile || ""
      },
      schemaAudit: {
        ...ensureObject(source.schemaAudit),
        schemaVersion: "1.1.0",
        migratedAt: source.schemaAudit?.migratedAt || context.migratedAt
      },
      releaseMetadata: {
        ...ensureObject(source.releaseMetadata),
        release: "1.1.0",
        hardenedAt: source.releaseMetadata?.hardenedAt || context.migratedAt
      }
    };
  }

  migrations.registerMigration(
    "1.1.0",
    "Add retention, legal-hold, and partner-safe export metadata",
    normalizeRetention
  );

  const originalValidateRecord = migrations.validateRecord.bind(migrations);
  migrations.validateRecord = function validateRecordV11(record) {
    const result = originalValidateRecord(record);
    const errors = [...result.errors];
    const warnings = [...result.warnings];
    const retention = record?.retentionMetadata;

    if (!retention || typeof retention !== "object" || Array.isArray(retention)) {
      errors.push("retentionMetadata must be an object.");
    } else {
      if (!retention.policyId) warnings.push("Retention policy is missing.");
      if (retention.policyId !== "permanent" && !retention.reviewDate) {
        warnings.push("Retention review date is missing.");
      }
      if (retention.legalHold?.active && !retention.legalHold.reason) {
        errors.push("An active legal hold requires a reason.");
      }
      if (retention.legalHold?.active && !retention.legalHold.placedBy) {
        warnings.push("An active legal hold does not identify who placed it.");
      }
    }

    if (record?.redactionMetadata && (typeof record.redactionMetadata !== "object" || Array.isArray(record.redactionMetadata))) {
      errors.push("redactionMetadata must be an object when present.");
    }

    return { valid: errors.length === 0, errors, warnings };
  };

  global.__methodzV11MigrationRegistered = true;
})(window);
