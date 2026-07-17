/* Methodz Meeting Manager v1.6 saved-record signature metadata. */
(function initializeMethodzSignatureRecordMetadataV16(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", patchCollection);

  function patchCollection() {
    if (global.__methodzV16CollectionPatched || typeof global.collectMeetingData !== "function") return;
    const original = global.collectMeetingData;

    global.collectMeetingData = function collectMeetingDataV16(...args) {
      const record = original.apply(this, args);
      const editingId = String(document.getElementById("editingRecordId")?.value || "");
      const existing = editingId && typeof global.getRecords === "function"
        ? global.getRecords().find((item) => item?.id === editingId)
        : null;
      const previous = existing?.externalSignatureControl || record.externalSignatureControl || {};
      const finalRecord = {
        ...record,
        schemaVersion: "1.6.0",
        externalSignatureControl: {
          optional: previous.optional !== false,
          lastSignedPackageAt: String(previous.lastSignedPackageAt || ""),
          lastSigningKeyId: String(previous.lastSigningKeyId || ""),
          lastSignatureAlgorithm: String(previous.lastSignatureAlgorithm || ""),
          lastVerificationAt: String(previous.lastVerificationAt || "")
        }
      };

      const audit = global.MethodzReleaseV10?.validateRecord?.(finalRecord);
      if (audit) {
        finalRecord.schemaAudit = audit;
        finalRecord.releaseMetadata = {
          ...(finalRecord.releaseMetadata || {}),
          release: "1.6.0",
          appShellVersion: global.METHODZ_MEETING_CONFIG?.appShellVersion || "1.6.0",
          auditedAt: audit.checkedAt || new Date().toISOString()
        };
      }
      return finalRecord;
    };

    global.__methodzV16CollectionPatched = true;
  }

  global.MethodzSignatureRecordMetadataV16 = { version: "1.6.0", patchCollection };
})(window);
