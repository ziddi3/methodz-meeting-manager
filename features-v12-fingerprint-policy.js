/* Methodz Meeting Manager v1.2 approval fingerprint hardening. */
(function hardenMethodzApprovalFingerprintV12(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    if (global.__methodzV12FingerprintPolicyPatched || typeof global.previewExternalExportV11 !== "function") return;

    const originalPreview = global.previewExternalExportV11;
    global.previewExternalExportV11 = async function previewExternalExportFingerprintPolicyV12(...args) {
      const payload = await originalPreview.apply(this, args);
      if (!payload?.record) return payload;

      payload.record.externalCopy = {
        ...(payload.record.externalCopy || {}),
        sourceReference: clone(payload.manifest?.sourceReference || {})
      };
      delete payload.record.externalCopy.generatedAt;

      const { integrity: _discardedIntegrity, ...unsigned } = payload;
      if (global.MethodzRedactionV11?.computeIntegrity) {
        payload.integrity = await global.MethodzRedactionV11.computeIntegrity(unsigned);
      }

      const previewBody = document.getElementById("externalExportPreviewBodyV11");
      if (previewBody) previewBody.textContent = JSON.stringify(payload, null, 2);
      return payload;
    };

    global.__methodzV12FingerprintPolicyPatched = true;
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }
})(window);
