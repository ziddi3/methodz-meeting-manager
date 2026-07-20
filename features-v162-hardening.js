/* Methodz Meeting Manager v1.6.2 final key-custody lifecycle guards. */
(function initializeMethodzKeyCustodyHardeningV162(global) {
  "use strict";

  let pendingManifest = null;

  global.addEventListener("DOMContentLoaded", () => {
    blockLegacyLifecycleMutation();
    wrapCustodyMetadataMutations();
    wrapManifestLoader();
    wrapManifestMerge();
  });

  function blockLegacyLifecycleMutation() {
    const blocked = function blockedLegacyLifecycleMutation() {
      const message = "Public-key lifecycle changes require the documented v1.6.2 rotation or emergency-revocation workflow.";
      const status = document.getElementById("keyCustodyStatusV162");
      if (status) {
        status.textContent = message;
        status.dataset.state = "warning";
      }
      global.alert(message);
      return null;
    };
    blocked.__methodzCustodyBlocked = true;
    global.togglePublicKeyStatusV16 = blocked;
  }

  function wrapCustodyMetadataMutations() {
    [
      "saveKeyCustodyV162",
      "markFingerprintVerifiedV162",
      "clearFingerprintVerificationV162"
    ].forEach((name) => {
      const original = global[name];
      if (typeof original !== "function" || original.__methodzCustodyRetentionHardened) return;

      const wrapped = async function custodyRetentionAwareMutation() {
        const result = await original.apply(this, arguments);
        const status = document.getElementById("keyCustodyStatusV162");
        if (status?.dataset.state !== "error") preserveSelectedCustodyMetadata();
        return result;
      };
      wrapped.__methodzCustodyRetentionHardened = true;
      global[name] = wrapped;
    });
  }

  function preserveSelectedCustodyMetadata() {
    const config = global.METHODZ_MEETING_CONFIG || {};
    const custodyKey = config.storageKeys?.keyCustodyMetadata || "methodzKeyCustodyMetadata";
    const registryKey = config.storageKeys?.signingPublicKeys || "methodzSigningPublicKeys";
    const maximumEntries = positiveNumber(config.keyCustody?.maximumCustodyEntries, 200);
    const keyId = String(document.getElementById("custodyKeySelectV162")?.value || "").trim();
    if (!keyId) return;

    const registry = readJson(registryKey, []);
    if (!Array.isArray(registry) || !registry.some((entry) => entry?.id === keyId)) return;

    const current = readJson(custodyKey, {});
    const map = current && typeof current === "object" && !Array.isArray(current) ? current : {};
    const stored = map[keyId] && typeof map[keyId] === "object" ? map[keyId] : {};
    const selected = {
      keyId,
      custodian: fieldValue("custodyCustodianV162") || String(stored.custodian || ""),
      custodyLocationReference: fieldValue("custodyLocationV162") || String(stored.custodyLocationReference || ""),
      fingerprintVerifiedAt: localInputToIso(fieldValue("custodyVerifiedAtV162")) || String(stored.fingerprintVerifiedAt || ""),
      fingerprintVerifiedBy: fieldValue("custodyVerifiedByV162"),
      fingerprintVerificationChannel: fieldValue("custodyChannelV162"),
      nextReviewDate: fieldValue("custodyNextReviewV162"),
      notes: fieldValue("custodyNotesV162"),
      updatedAt: new Date().toISOString()
    };

    if (global.MethodzCryptoPackageV16?.containsPrivateKeyMaterial(selected)) return;

    const entries = Object.entries(map)
      .filter(([entryKey]) => entryKey !== keyId)
      .concat([[keyId, selected]])
      .sort((left, right) => timestamp(right[1]?.updatedAt) - timestamp(left[1]?.updatedAt))
      .slice(0, maximumEntries);

    global.localStorage.setItem(custodyKey, JSON.stringify(Object.fromEntries(entries)));
  }

  function wrapManifestLoader() {
    const original = global.loadCustodyManifestV162;
    if (typeof original !== "function" || original.__methodzCustodyHardened) return;

    const wrapped = async function hardenedCustodyManifestLoader(event) {
      const file = event?.target?.files?.[0];
      pendingManifest = null;
      if (file) {
        try {
          pendingManifest = JSON.parse(await file.text());
        } catch (error) {
          // The original loader owns user-facing parse errors and input cleanup.
          pendingManifest = null;
        }
      }
      return original.apply(this, arguments);
    };
    wrapped.__methodzCustodyHardened = true;
    global.loadCustodyManifestV162 = wrapped;
  }

  function wrapManifestMerge() {
    const original = global.mergeVerifiedCustodyManifestV162;
    if (typeof original !== "function" || original.__methodzCustodyHardened) return;

    const wrapped = async function hardenedCustodyManifestMerge() {
      if (!pendingManifest) {
        global.alert("Choose and verify a public custody manifest before merging.");
        return null;
      }

      const core = global.MethodzKeyCustodyCoreV162;
      const cryptoCore = global.MethodzCryptoPackageV16;
      const config = global.METHODZ_MEETING_CONFIG || {};
      const maximumEntries = positiveNumber(config.keyCustody?.maximumCustodyEntries, 200);
      const registryKey = config.storageKeys?.signingPublicKeys || "methodzSigningPublicKeys";

      const pendingVerification = await core.verifyManifest(pendingManifest, { maximumEntries });
      if (!pendingVerification.valid) {
        global.alert(`The custody manifest changed or failed verification and cannot be merged.\n\n${pendingVerification.errors.join("\n")}`);
        return null;
      }

      // Re-run the original verifier immediately before its mutation path so the
      // closure-owned manifest and the independently captured file are both current.
      const currentVerification = await global.verifyCustodyManifestV162();
      if (!currentVerification?.valid) return null;

      const result = await original.apply(this, arguments);
      if (!Array.isArray(result)) return result;

      // Preserve lifecycle links supplied by a verified manifest when the original
      // merge already had a local entry whose normalized empty values would otherwise
      // mask incoming predecessor/successor metadata.
      const incoming = await core.sanitizeRegistry(pendingManifest.keys || [], maximumEntries);
      const byId = new Map(result.map((entry) => [entry.id, entry]));
      incoming.forEach((entry) => {
        const current = byId.get(entry.id);
        if (!current) return;
        byId.set(entry.id, {
          ...current,
          status: current.status === "Revoked" || entry.status === "Revoked" ? "Revoked" : "Active",
          revokedAt: current.revokedAt || entry.revokedAt || "",
          revocationReason: current.revocationReason || entry.revocationReason || "",
          replacedByKeyId: current.replacedByKeyId || entry.replacedByKeyId || "",
          replacesKeyId: current.replacesKeyId || entry.replacesKeyId || "",
          activatedAt: current.activatedAt || entry.activatedAt || "",
          updatedAt: new Date().toISOString(),
          publicKeyJwk: cryptoCore.normalizePublicJwk(current.publicKeyJwk)
        });
      });

      const hardened = await core.sanitizeRegistry([...byId.values()], maximumEntries);
      global.localStorage.setItem(registryKey, JSON.stringify(hardened));
      document.getElementById("custodyKeySelectV162")?.dispatchEvent(new Event("change"));
      return hardened;
    };
    wrapped.__methodzCustodyHardened = true;
    global.mergeVerifiedCustodyManifestV162 = wrapped;
  }

  function readJson(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) ?? fallback);
    } catch (error) {
      return fallback;
    }
  }

  function fieldValue(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function localInputToIso(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function timestamp(value) {
    const time = new Date(value || 0).getTime();
    return Number.isFinite(time) ? time : 0;
  }

  function positiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
  }

  global.MethodzKeyCustodyHardeningV162 = {
    version: "1.6.2",
    isLegacyLifecycleBlocked: () => Boolean(global.togglePublicKeyStatusV16?.__methodzCustodyBlocked),
    hasPendingManifest: () => Boolean(pendingManifest),
    preserveSelectedCustodyMetadata
  };
})(window);
