/* Methodz Meeting Manager v1.4 recipient-policy fingerprint and profile-selection hardening. */
(function hardenMethodzRecipientPolicyV14(global) {
  "use strict";

  global.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    patchPolicyApplication();
    patchPreviewStability();
  }

  function patchPolicyApplication() {
    if (global.__methodzV14PolicyApplicationHardened || typeof global.applyRecipientPolicyToExportV14 !== "function") return;
    const original = global.applyRecipientPolicyToExportV14;
    global.applyRecipientPolicyToExportV14 = function applyRecipientPolicyToExportHardenedV14(...args) {
      const policyId = String(document.getElementById("recipientPolicySelectV14")?.value || "");
      const policy = global.MethodzRecipientPolicyV14?.readPolicies?.().find((item) => item.id === policyId);
      const profile = document.getElementById("externalProfileV11");
      if (policy && profile && !policy.allowedProfiles.includes(profile.value)) {
        profile.value = policy.allowedProfiles[0] || "partner-safe";
        profile.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return original.apply(this, args);
    };
    global.__methodzV14PolicyApplicationHardened = true;
  }

  function patchPreviewStability() {
    if (global.__methodzV14PreviewStabilityHardened || typeof global.previewExternalExportV11 !== "function") return;
    const original = global.previewExternalExportV11;
    global.previewExternalExportV11 = async function previewExternalExportStableRecipientPolicyV14(...args) {
      const payload = await original.apply(this, args);
      const externalCopy = payload?.record?.externalCopy;
      const policy = payload?.manifest?.recipientPolicy;
      if (!externalCopy || !policy) return payload;

      delete externalCopy.policyAppliedAt;
      externalCopy.recipientPolicyVersion = policy.policyUpdatedAt || "";

      if (global.MethodzRedactionV11?.computeIntegrity) {
        const unsigned = clone(payload);
        delete unsigned.integrity;
        payload.integrity = await global.MethodzRedactionV11.computeIntegrity(unsigned);
      }

      const preview = document.getElementById("externalExportPreviewBodyV11");
      if (preview) preview.textContent = JSON.stringify(payload, null, 2);
      return payload;
    };
    global.__methodzV14PreviewStabilityHardened = true;
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }
})(window);
