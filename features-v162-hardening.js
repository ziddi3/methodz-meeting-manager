/* Methodz Meeting Manager v1.6.2 final key-custody lifecycle guards. */
(function initializeMethodzKeyCustodyHardeningV162(global) {
  "use strict";

  let pendingManifest = null;

  global.addEventListener("DOMContentLoaded", () => {
    blockLegacyLifecycleMutation();
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

  function positiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
  }

  global.MethodzKeyCustodyHardeningV162 = {
    version: "1.6.2",
    isLegacyLifecycleBlocked: () => Boolean(global.togglePublicKeyStatusV16?.__methodzCustodyBlocked),
    hasPendingManifest: () => Boolean(pendingManifest)
  };
})(window);
