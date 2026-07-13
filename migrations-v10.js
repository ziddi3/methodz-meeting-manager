/* Methodz Meeting Manager v1.0 schema extension and release validation. */
(function registerMethodzV10Migration(global) {
  "use strict";

  const migrations = global.MethodzMigrations;
  if (!migrations || global.__methodzV10MigrationRegistered) return;

  const ensureArray = (value) => (Array.isArray(value) ? value : []);
  const ensureObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});
  const config = global.METHODZ_MEETING_CONFIG || {};
  const consentVersion = config.signatureConsent?.version || "1.0";

  function normalizeConsent(person) {
    const consent = ensureObject(person.signatureConsent);
    const verification = ensureObject(person.signatureVerification);
    return {
      ...person,
      signatureConsent: {
        accepted: Boolean(consent.accepted),
        statementVersion: consent.statementVersion || consentVersion,
        method: consent.method || "typed-name",
        acceptedAt: consent.acceptedAt || ""
      },
      signatureVerification: {
        status: verification.status || "Unverified",
        verifiedBy: verification.verifiedBy || "",
        verifiedAt: verification.verifiedAt || "",
        note: verification.note || ""
      }
    };
  }

  migrations.registerMigration("1.0.0", "Add release governance, signature consent, attachment adapter, and schema-audit fields", (record, context) => {
    const source = ensureObject(record);
    const attendees = ensureArray(source.attendees).map((person) => normalizeConsent(ensureObject(person)));
    const access = ensureObject(source.accessControl);
    const attachments = ensureArray(source.attachments);

    return {
      ...source,
      attendees,
      accessControl: {
        classification: access.classification || "Internal",
        policyId: access.policyId || "standard",
        allowedRoles: ensureArray(access.allowedRoles).length
          ? ensureArray(access.allowedRoles)
          : ["Administrator", "Facilitator", "Recorder", "Auditor"],
        preparedBy: access.preparedBy || source.facilitator || "",
        reviewedBy: access.reviewedBy || "",
        reviewStatus: access.reviewStatus || "Not Reviewed",
        protectedFields: ensureArray(access.protectedFields),
        policyNote: access.policyNote || "",
        lastReviewedAt: access.lastReviewedAt || ""
      },
      attachmentAdapterMetadata: {
        adapterId: source.attachmentAdapterMetadata?.adapterId || "record-reference",
        contractVersion: source.attachmentAdapterMetadata?.contractVersion || "1.0.0",
        mode: source.attachmentAdapterMetadata?.mode || "reference-only",
        itemCount: Number.isFinite(source.attachmentAdapterMetadata?.itemCount)
          ? source.attachmentAdapterMetadata.itemCount
          : attachments.length
      },
      schemaAudit: {
        ...ensureObject(source.schemaAudit),
        schemaVersion: "1.0.0",
        migratedAt: source.schemaAudit?.migratedAt || context.migratedAt
      },
      releaseMetadata: {
        ...ensureObject(source.releaseMetadata),
        release: "1.0.0",
        hardenedAt: source.releaseMetadata?.hardenedAt || context.migratedAt
      }
    };
  });

  const originalValidateRecord = migrations.validateRecord.bind(migrations);
  migrations.validateRecord = function validateRecordV10(record) {
    const result = originalValidateRecord(record);
    const errors = [...result.errors];
    const warnings = [...result.warnings];

    if (!record?.accessControl || typeof record.accessControl !== "object" || Array.isArray(record.accessControl)) {
      errors.push("accessControl must be an object.");
    }
    if (!record?.attachmentAdapterMetadata || typeof record.attachmentAdapterMetadata !== "object" || Array.isArray(record.attachmentAdapterMetadata)) {
      warnings.push("Attachment adapter metadata is missing.");
    }

    ensureArray(record?.attendees).forEach((person, index) => {
      if (person?.signature && !person?.signatureConsent?.accepted) {
        warnings.push(`Attendee ${index + 1} has a typed signature without recorded consent.`);
      }
      if (person?.signatureVerification && typeof person.signatureVerification !== "object") {
        errors.push(`Attendee ${index + 1} signatureVerification must be an object.`);
      }
    });

    return { valid: errors.length === 0, errors, warnings };
  };

  global.__methodzV10MigrationRegistered = true;
})(window);
