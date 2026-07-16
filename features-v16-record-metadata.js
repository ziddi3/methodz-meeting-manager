/* Methodz Meeting Manager v1.6 record-level package-signature metadata. */
(function initializeMethodzSignatureRecordMetadataV16(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", patchMeetingCollection);

  function patchMeetingCollection() {
    if (global.__methodzV16CollectionPatched || typeof global.collectMeetingData !== "function") return;
    const original = global.collectMeetingData;

    global.collectMeetingData = function collectMeetingDataSignatureMetadataV16(...args) {
      const record = original.apply(this, args);
      const editingId = String(document.getElementById("editingRecordId")?.value || "");
      const existing = editingId && typeof global.getRecords === "function"
        ? global.getRecords().find((item) => item?.id === editingId)
        : null;
      const previous = existing?.externalSignatureControl || record.externalSignatureControl || {};

      const finalRecord = {
        ...record,
        externalSignatureControl: {
          optional: previous.optional !== false,
          lastSignedPackageAt: previous.lastSignedPackageAt || "",
          lastSigningKeyId: previous.lastSigningKeyId || "",
          lastSignatureAlgorithm: previous.lastSignatureAlgorithm || "",
          lastVerificationAt: previous.lastVerificationAt || ""
        }
      };

      const finalAudit = global.MethodzReleaseV10?.validateRecord?.(finalRecord);
      if (finalAudit) {
        finalRecord.schemaAudit = finalAudit;
        finalRecord.releaseMetadata = {
          ...(finalRecord.releaseMetadata || {}),
          release: "1.6.0",
          appShellVersion: global.METHODZ_MEETING_CONFIG?.appShellVersion || "1.6.0",
          auditedAt: finalAudit.checkedAt || new Date().toISOString()
        };
      }

      return finalRecord;
    };

    global.__methodzV16CollectionPatched = true;
  }

  global.MethodzSignatureRecordMetadataV16 = {
    version: "1.6.0",
    patchMeetingCollection
  };
})(window);
