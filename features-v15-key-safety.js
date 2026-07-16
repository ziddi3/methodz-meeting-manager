/* Methodz Meeting Manager v1.5 public-key registry and export hardening. */
(function initializeMethodzKeySafetyV15(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const publicKeysKey = config.storageKeys?.signingPublicKeys || "methodzSigningPublicKeys";
  const auditKey = config.storageKeys?.signingAudit || "methodzSigningAudit";
  const maximumKeys = Number(config.cryptographicSigning?.maximumPublicKeys || 200);
  const maximumAuditEvents = Number(config.cryptographicSigning?.maximumAuditEvents || 2000);

  global.addEventListener("DOMContentLoaded", installSafetyLayer);

  function core() {
    if (!global.MethodzCryptoPackageV15) {
      throw new Error("The v1.5 cryptographic package core is unavailable.");
    }
    return global.MethodzCryptoPackageV15;
  }

  function installSafetyLayer() {
    sanitizeStoredRegistry();
    patchPublicApi();
    refreshRegistryView();
  }

  function sanitizeEntry(entry) {
    if (!entry || typeof entry !== "object" || !entry.id || !entry.publicKeyJwk) return null;
    try {
      const publicKeyJwk = core().normalizePublicJwk(entry.publicKeyJwk);
      return {
        ...clone(entry),
        publicKeyJwk
      };
    } catch (error) {
      console.warn("Discarding an invalid public-key registry entry.", error);
      return null;
    }
  }

  function sanitizeEntries(entries) {
    const seen = new Set();
    return (Array.isArray(entries) ? entries : [])
      .map(sanitizeEntry)
      .filter((entry) => {
        if (!entry || seen.has(entry.id)) return false;
        seen.add(entry.id);
        return true;
      })
      .slice(-maximumKeys);
  }

  function readSafeRegistry() {
    return sanitizeEntries(readJson(publicKeysKey, []));
  }

  function writeSafeRegistry(entries) {
    const safeEntries = sanitizeEntries(entries);
    global.localStorage.setItem(publicKeysKey, JSON.stringify(safeEntries));
    return safeEntries;
  }

  function sanitizeStoredRegistry() {
    const existing = readJson(publicKeysKey, []);
    const safe = sanitizeEntries(existing);
    if (JSON.stringify(existing) !== JSON.stringify(safe)) {
      global.localStorage.setItem(publicKeysKey, JSON.stringify(safe));
      appendAudit("public-key-registry-sanitized", {
        previousCount: Array.isArray(existing) ? existing.length : 0,
        retainedCount: safe.length,
        privateMaterialRemoved: true
      });
    }
    return safe;
  }

  function patchPublicApi() {
    const api = global.MethodzCryptographicSigningV15;
    if (!api || global.__methodzV15KeySafetyPatched) return;

    const originalRegister = api.registerPublicKey;
    const originalImportPrivate = global.importPrivateSigningKeyV15;

    if (typeof originalRegister === "function") {
      api.registerPublicKey = async function registerSafePublicKey(publicKeyJwk, metadata = {}) {
        const safePublicKeyJwk = core().normalizePublicJwk(publicKeyJwk);
        const entry = await originalRegister(safePublicKeyJwk, metadata);
        sanitizeStoredRegistry();
        refreshRegistryView(entry?.id || "");
        return sanitizeEntry(entry);
      };
    }

    api.readPublicKeys = readSafeRegistry;
    api.sanitizePublicKeyRegistry = sanitizeStoredRegistry;

    if (typeof originalImportPrivate === "function") {
      global.importPrivateSigningKeyV15 = (event) => importPrivateKeySafely(event, originalImportPrivate);
    }
    global.importPublicSigningKeyV15 = importPublicKeySafely;
    global.downloadPublicSigningKeyV15 = downloadPublicKeySafely;
    global.exportSigningKeyRegistryV15 = exportSafeRegistry;

    global.__methodzV15KeySafetyPatched = true;
  }

  async function importPrivateKeySafely(event, originalImportPrivate) {
    const input = event?.target;
    try {
      const file = input?.files?.[0];
      if (!file) throw new Error("Choose a private JWK JSON file first.");
      const parsed = JSON.parse(await file.text());
      const privateKeyJwk = parsed.privateKeyJwk || parsed.privateJwk || parsed.key || parsed;
      await core().importPrivateJwk(privateKeyJwk);
      const publicKeyJwk = core().normalizePublicJwk(
        parsed.publicKeyJwk || parsed.publicJwk || core().publicJwkFromPrivate(privateKeyJwk)
      );

      const sanitizedPayload = {
        packageType: parsed.packageType || "methodz-private-signing-key-backup",
        packageVersion: Number(parsed.packageVersion || 1),
        keyId: parsed.keyId || await core().deriveKeyId(publicKeyJwk),
        keyLabel: String(parsed.keyLabel || "").trim(),
        signerLabel: String(parsed.signerLabel || "").trim(),
        privateKeyJwk,
        publicKeyJwk,
        exportedAt: parsed.exportedAt || "",
        warning: parsed.warning || "Sensitive private key material. Protect this file and do not send it with signed packages."
      };
      const syntheticInput = {
        files: [{ text: async () => JSON.stringify(sanitizedPayload) }],
        value: ""
      };
      const result = await originalImportPrivate({ target: syntheticInput });
      sanitizeStoredRegistry();
      refreshRegistryView(result?.id || sanitizedPayload.keyId);
      return result;
    } catch (error) {
      handleError(error);
      return null;
    } finally {
      if (input) input.value = "";
    }
  }

  async function importPublicKeySafely(event) {
    const input = event?.target;
    try {
      const file = input?.files?.[0];
      if (!file) throw new Error("Choose a public JWK JSON file first.");
      const parsed = JSON.parse(await file.text());
      const candidate = parsed.publicKeyJwk || parsed.publicJwk || parsed.key || parsed;
      const safePublicKeyJwk = core().normalizePublicJwk(candidate);
      await core().importPublicJwk(safePublicKeyJwk);

      const metadata = {
        signerLabel: String(parsed.signerLabel || document.getElementById("cryptoSignerLabelV15")?.value || "").trim(),
        keyLabel: String(parsed.keyLabel || document.getElementById("cryptoKeyLabelV15")?.value || "Imported public verification key").trim(),
        source: "public-jwk-import"
      };
      const entry = await global.MethodzCryptographicSigningV15.registerPublicKey(safePublicKeyJwk, metadata);
      appendAudit("public-key-imported", { keyId: entry?.id || "", keyLabel: entry?.keyLabel || metadata.keyLabel });
      setStatus(`Registered public key ${entry?.id || ""} without private key material.`, "ready");
      return entry;
    } catch (error) {
      handleError(error);
      return null;
    } finally {
      if (input) input.value = "";
    }
  }

  async function downloadPublicKeySafely() {
    try {
      const entries = readSafeRegistry();
      const selectedId = String(document.getElementById("cryptoPublicKeySelectV15")?.value || "");
      const entry = entries.find((item) => item.id === selectedId) || entries[0];
      if (!entry) throw new Error("Generate, import, or select a public key first.");

      const payload = {
        packageType: "methodz-public-verification-key",
        packageVersion: 1,
        keyId: entry.id,
        keyLabel: entry.keyLabel || "",
        signerLabel: entry.signerLabel || "",
        status: entry.status || "Active",
        publicKeyJwk: core().normalizePublicJwk(entry.publicKeyJwk),
        exportedAt: new Date().toISOString(),
        notice: "Verify this public key identifier through an independent trusted channel before relying on signer identity."
      };
      downloadJson(payload, `methodz-${safeName(entry.id)}-PUBLIC-${today()}.json`);
      appendAudit("public-key-downloaded", { keyId: entry.id });
      setStatus(`Downloaded public verification key ${entry.id}.`, "ready");
      return payload;
    } catch (error) {
      handleError(error);
      return null;
    }
  }

  function exportSafeRegistry() {
    try {
      const payload = {
        packageType: "methodz-public-key-registry",
        packageVersion: 1,
        exportedAt: new Date().toISOString(),
        privateKeysIncluded: false,
        keys: readSafeRegistry(),
        notice: "Public keys and browser-local lifecycle metadata only. No private key material is included."
      };
      downloadJson(payload, `methodz-public-key-registry-${today()}.json`);
      setStatus("Public-key registry exported without private key material.", "ready");
      return payload;
    } catch (error) {
      handleError(error);
      return null;
    }
  }

  function refreshRegistryView(preferredId = "") {
    const select = document.getElementById("cryptoPublicKeySelectV15");
    if (!select) return;
    if (preferredId) select.value = preferredId;
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function appendAudit(action, details = {}) {
    const events = readJson(auditKey, []);
    const safeEvents = Array.isArray(events) ? events : [];
    safeEvents.push({
      id: `signing-audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      occurredAt: new Date().toISOString(),
      ...clone(details)
    });
    global.localStorage.setItem(auditKey, JSON.stringify(safeEvents.slice(-maximumAuditEvents)));
  }

  function readJson(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) ?? fallback);
    } catch (error) {
      console.warn(`Unable to read ${key}.`, error);
      return fallback;
    }
  }

  function downloadJson(value, filename) {
    const content = JSON.stringify(value, null, 2);
    if (typeof global.downloadBlob === "function") {
      global.downloadBlob(content, filename, "application/json");
      return;
    }
    const blob = new Blob([content], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function handleError(error) {
    const message = error?.message || String(error);
    setStatus(message, "error");
    alert(message);
  }

  function setStatus(message, state) {
    const element = document.getElementById("cryptoRuntimeStatusV15");
    if (element) {
      element.textContent = message;
      element.dataset.state = state || "";
    }
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function safeName(value) {
    return String(value || "key").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "key";
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  global.MethodzKeySafetyV15 = {
    version: "1.5.0",
    sanitizeEntry,
    readSafeRegistry,
    writeSafeRegistry,
    sanitizeStoredRegistry
  };
})(window);
