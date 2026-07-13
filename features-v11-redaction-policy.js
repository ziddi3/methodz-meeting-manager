/* Methodz Meeting Manager v1.1 external-copy policy hardening. */
(function hardenMethodzExternalCopyPolicyV11(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    const api = global.MethodzRedactionV11;
    if (!api || global.__methodzV11RedactionPolicyPatched) return;

    const originalRedactRecord = api.redactRecord.bind(api);
    api.redactRecord = function redactRecordPolicyV11(record, profileId, sections) {
      return hardenResult(originalRedactRecord(record, profileId, sections), profileId);
    };

    const originalPreview = global.previewExternalExportV11;
    const originalDownloadJson = global.downloadExternalJsonV11;
    const originalDownloadHtml = global.downloadExternalHtmlV11;

    if (typeof originalPreview === "function") {
      global.previewExternalExportV11 = async function previewExternalExportPolicyV11(...args) {
        const payload = await originalPreview.apply(this, args);
        if (!payload) return payload;
        await hardenPackage(payload);
        renderHardenedPreview(payload);
        return payload;
      };
    }

    if (typeof originalDownloadJson === "function") {
      global.downloadExternalJsonV11 = async function downloadExternalJsonPolicyV11(...args) {
        const payload = await global.previewExternalExportV11();
        if (!payload) return;
        return originalDownloadJson.apply(this, args);
      };
    }

    if (typeof originalDownloadHtml === "function") {
      global.downloadExternalHtmlV11 = async function downloadExternalHtmlPolicyV11(...args) {
        const payload = await global.previewExternalExportV11();
        if (!payload) return;
        return originalDownloadHtml.apply(this, args);
      };
    }

    global.__methodzV11RedactionPolicyPatched = true;
  }

  function hardenResult(result, profileId) {
    if (!result || profileId !== "public-summary") return result;
    const record = result.record || {};
    delete record.decisions;
    result.manifest = result.manifest || {};
    const removed = Array.isArray(result.manifest.removedPaths) ? result.manifest.removedPaths : [];
    if (!removed.includes("decisions")) removed.push("decisions");
    result.manifest.removedPaths = removed.sort();
    const warnings = Array.isArray(result.manifest.warnings) ? result.manifest.warnings : [];
    if (!record.decisionsList?.length && !warnings.includes("No approved structured decisions were available for the public summary.")) {
      warnings.push("No approved structured decisions were available for the public summary.");
    }
    result.manifest.warnings = warnings;
    return result;
  }

  async function hardenPackage(payload) {
    if (payload?.manifest?.profile !== "public-summary") return payload;
    hardenResult({ record: payload.record, manifest: payload.manifest }, "public-summary");
    const { integrity: _discardedIntegrity, ...unsigned } = payload;
    payload.integrity = await global.MethodzRedactionV11.computeIntegrity(unsigned);
    return payload;
  }

  function renderHardenedPreview(payload) {
    const body = document.getElementById("externalExportPreviewBodyV11");
    if (body) body.textContent = JSON.stringify(payload, null, 2);
    const status = document.getElementById("externalExportStatusV11");
    if (status && payload?.manifest?.profile === "public-summary") {
      status.textContent = `Public Summary preview ready. ${payload.manifest.removedPaths?.length || 0} sensitive field path(s) removed. Only approved structured decisions are included. Integrity: ${payload.integrity?.algorithm || "unknown"}.`;
      status.dataset.state = "ready";
    }
  }
})(window);
