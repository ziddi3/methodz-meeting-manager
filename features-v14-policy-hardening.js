/* Methodz Meeting Manager v1.4 recipient-policy fingerprint and release-metadata hardening. */
(function hardenMethodzRecipientPolicyV14(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const recordsKey = config.storageKeys?.records || "methodzMeetingRecords";
  const archiveKey = config.storageKeys?.archivedRecords || "methodzArchivedMeetingRecords";
  const auditKey = config.storageKeys?.recipientPolicyAudit || "methodzRecipientPolicyAudit";

  global.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    patchPolicyApplication();
    patchPreviewStability();
    patchApprovedDownload();
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

  function patchApprovedDownload() {
    if (global.__methodzV14ApprovedDownloadPatched || typeof global.downloadApprovedExternalV12 !== "function") return;
    const original = global.downloadApprovedExternalV12;
    global.downloadApprovedExternalV12 = async function downloadApprovedExternalRecipientPolicyV14(...args) {
      const packageValue = await original.apply(this, args);
      const policy = packageValue?.manifest?.recipientPolicy;
      const approvalId = packageValue?.approval?.approvalId || "";
      if (!packageValue || !policy || !approvalId) return packageValue;

      const approval = global.MethodzExportApprovalV12?.readApprovals?.().find((item) => item.id === approvalId);
      const sourceId = approval?.sourceReference?.id || "";
      const releasedAt = packageValue.exportedAt || new Date().toISOString();
      if (sourceId) updateSourceRecord(sourceId, policy, releasedAt);
      appendReleaseAudit(policy, approval, packageValue, releasedAt);
      return packageValue;
    };
    global.__methodzV14ApprovedDownloadPatched = true;
  }

  function updateSourceRecord(sourceId, policy, releasedAt) {
    const updateRecord = (record) => {
      if (!record || record.id !== sourceId) return record;
      return {
        ...record,
        externalRecipientControl: {
          ...(record.externalRecipientControl || {}),
          policyRequired: true,
          defaultRecipientPolicyId: policy.id,
          lastRecipientPolicyId: policy.id,
          lastRecipientPolicyLabel: policy.label,
          lastRecipientPolicyAppliedAt: releasedAt
        }
      };
    };

    const active = readJson(recordsKey, []);
    let activeChanged = false;
    const updatedActive = active.map((record) => {
      if (record?.id !== sourceId) return record;
      activeChanged = true;
      return updateRecord(record);
    });
    if (activeChanged) {
      global.localStorage.setItem(recordsKey, JSON.stringify(updatedActive));
      if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
      return;
    }

    const archived = readJson(archiveKey, []);
    let archiveChanged = false;
    const updatedArchive = archived.map((entry) => {
      if (entry?.record?.id !== sourceId) return entry;
      archiveChanged = true;
      return { ...entry, record: updateRecord(entry.record) };
    });
    if (archiveChanged) global.localStorage.setItem(archiveKey, JSON.stringify(updatedArchive));
  }

  function appendReleaseAudit(policy, approval, packageValue, releasedAt) {
    const events = readJson(auditKey, []);
    events.push({
      id: `recipient-policy-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action: "approved-copy-downloaded",
      at: releasedAt,
      policyId: policy.id || "",
      policyLabel: policy.label || "",
      recipientName: policy.recipientName || "",
      organization: policy.organization || "",
      approvalId: approval?.id || "",
      destinationPolicyId: approval?.destinationPolicyId || "",
      sourceRecordId: approval?.sourceReference?.id || "",
      packageIntegrity: clone(packageValue.integrity || {})
    });
    global.localStorage.setItem(auditKey, JSON.stringify(events.slice(-2000)));
  }

  function readJson(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) ?? fallback);
    } catch (error) {
      console.warn(`Unable to read ${key}`, error);
      return fallback;
    }
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }
})(window);
