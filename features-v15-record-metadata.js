/* Methodz Meeting Manager v1.5 record-level package-signature metadata. */
(function initializeMethodzSignatureRecordMetadataV15(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", patchMeetingCollection);

  function patchMeetingCollection() {
    if (global.__methodzV15CollectionPatched || typeof global.collectMeetingData !== "function") return;
    const original = global.collectMeetingData;

    global.collectMeetingData = function collectMeetingDataSignatureMetadataV15(...args) {
      const record = original.apply(this, args);
      const editingId = String(document.getElementById("editingRecordId")?.value || "");
      const existing = editingId && typeof global.getRecords === "function"
        ? global.getRecords().find((item) => item?.id === editingId)
        : null;
      const previous = existing?.externalSignatureControl || record.externalSignatureControl || {};

      return {
        ...record,
        externalSignatureControl: {
          optional: previous.optional !== false,
          lastSignedPackageAt: previous.lastSignedPackageAt || "",
          lastSigningKeyId: previous.lastSigningKeyId || "",
          lastSignatureAlgorithm: previous.lastSignatureAlgorithm || "",
          lastVerificationAt: previous.lastVerificationAt || ""
        }
      };
    };

    global.__methodzV15CollectionPatched = true;
  }

  global.MethodzSignatureRecordMetadataV15 = {
    version: "1.5.0",
    patchMeetingCollection
  };
})(window);
