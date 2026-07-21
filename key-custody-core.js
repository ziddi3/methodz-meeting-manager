/* Methodz Meeting Manager v1.6.2 portable public-key custody manifest core. */
(function initializeMethodzKeyCustodyCore(global) {
  "use strict";

  const PACKAGE_TYPE = "methodz-public-key-custody-manifest";
  const PROTOCOL_VERSION = "1.0.0";
  const EVENT_TYPES = new Set(["rotation", "revocation", "lost-key-response", "recovery-rehearsal"]);
  const EVENT_STATUSES = new Set(["Planned", "Completed", "Cancelled"]);
  const PRIVATE_CONTAINER_KEYS = new Set(["privatekey", "privatekeyjwk", "privatejwk", "secretkey"]);

  function containsPrivateKeyMaterial(value, seen = new WeakSet()) {
    if (!value || typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);
    if (!Array.isArray(value) && value.kty === "EC" && typeof value.d === "string" && value.d) return true;
    return Object.entries(value).some(([key, child]) => {
      if (PRIVATE_CONTAINER_KEYS.has(String(key).toLowerCase()) && child != null) return true;
      return containsPrivateKeyMaterial(child, seen);
    });
  }

  function normalizeChecklist(value = {}) {
    return {
      privateBackupSeparated: Boolean(value.privateBackupSeparated),
      fingerprintConfirmed: Boolean(value.fingerprintConfirmed),
      registryStatusReviewed: Boolean(value.registryStatusReviewed),
      recoveryEvidenceCaptured: Boolean(value.recoveryEvidenceCaptured)
    };
  }

  function normalizeEvent(value = {}) {
    const eventType = String(value.eventType || "").trim();
    const status = String(value.status || "Planned").trim();
    if (!EVENT_TYPES.has(eventType)) throw new Error(`Unsupported custody event type: ${eventType || "missing"}.`);
    if (!EVENT_STATUSES.has(status)) throw new Error(`Unsupported custody event status: ${status || "missing"}.`);
    return {
      id: String(value.id || `custody-${Date.now()}-${Math.random().toString(16).slice(2)}`),
      eventType,
      status,
      fromKeyId: String(value.fromKeyId || "").trim(),
      toKeyId: String(value.toKeyId || "").trim(),
      effectiveAt: String(value.effectiveAt || "").trim(),
      operatorLabel: String(value.operatorLabel || "").trim(),
      witnessLabel: String(value.witnessLabel || "").trim(),
      reason: String(value.reason || "").trim(),
      createdAt: String(value.createdAt || new Date().toISOString()),
      checklist: normalizeChecklist(value.checklist)
    };
  }

  function validateEventReferences(event, knownKeyIds) {
    const errors = [];
    if (!event.fromKeyId) errors.push(`${event.id}: source key is required.`);
    if (event.fromKeyId && !knownKeyIds.has(event.fromKeyId)) errors.push(`${event.id}: source key is not present in the manifest.`);
    if (event.eventType === "rotation") {
      if (!event.toKeyId) errors.push(`${event.id}: replacement key is required for rotation.`);
      if (event.toKeyId === event.fromKeyId) errors.push(`${event.id}: replacement key must differ from the source key.`);
      if (event.toKeyId && !knownKeyIds.has(event.toKeyId)) errors.push(`${event.id}: replacement key is not present in the manifest.`);
    }
    if (!event.operatorLabel) errors.push(`${event.id}: operator label is required.`);
    if (!event.reason) errors.push(`${event.id}: reason or evidence note is required.`);
    if (event.status === "Completed" && !event.witnessLabel) errors.push(`${event.id}: completed events require a witness label.`);
    if (!event.effectiveAt || Number.isNaN(new Date(event.effectiveAt).getTime())) errors.push(`${event.id}: effective date is missing or invalid.`);
    if (event.status === "Completed" && Object.values(event.checklist).some((item) => !item)) errors.push(`${event.id}: completed events require every custody checklist control.`);
    return errors;
  }

  async function sanitizeKey(entry, cryptoCore) {
    if (!cryptoCore) throw new Error("The Methodz cryptographic package core is required.");
    if (containsPrivateKeyMaterial(entry)) throw new Error(`Private key material is prohibited in custody key entries${entry?.id ? ` (${entry.id})` : ""}.`);
    const publicKeyJwk = cryptoCore.normalizePublicJwk(entry?.publicKeyJwk);
    const derivedId = await cryptoCore.deriveKeyId(publicKeyJwk);
    if (entry?.id && entry.id !== derivedId) throw new Error(`Public key ID mismatch for ${entry.id}.`);
    return {
      id: derivedId,
      keyLabel: String(entry?.keyLabel || "Methodz verification key").trim(),
      signerLabel: String(entry?.signerLabel || "").trim(),
      status: entry?.status === "Revoked" ? "Revoked" : "Active",
      publicKeyJwk,
      source: String(entry?.source || "").trim(),
      createdAt: String(entry?.createdAt || "").trim(),
      updatedAt: String(entry?.updatedAt || "").trim(),
      revokedAt: String(entry?.revokedAt || "").trim()
    };
  }

  async function buildManifest(input = {}, cryptoCore) {
    const keys = [];
    for (const entry of Array.isArray(input.keys) ? input.keys : []) keys.push(await sanitizeKey(entry, cryptoCore));
    const knownKeyIds = new Set(keys.map((entry) => entry.id));
    const events = (Array.isArray(input.events) ? input.events : []).map(normalizeEvent);
    const errors = events.flatMap((event) => validateEventReferences(event, knownKeyIds));
    if (errors.length) throw new Error(errors.join(" "));
    const manifest = {
      packageType: PACKAGE_TYPE,
      packageVersion: 1,
      protocolVersion: PROTOCOL_VERSION,
      generatedAt: String(input.generatedAt || new Date().toISOString()),
      generatedBy: String(input.generatedBy || "").trim(),
      privateKeysIncluded: false,
      keys: keys.sort((left, right) => left.id.localeCompare(right.id)),
      events: events.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
      notice: "Public verification keys and browser-local custody metadata only. No private signing material is included. Confirm key fingerprints through an independent trusted channel."
    };
    if (containsPrivateKeyMaterial(manifest)) throw new Error("Private key material was detected in the custody manifest.");
    return manifest;
  }

  async function validateManifest(value, cryptoCore) {
    const errors = [];
    if (!value || typeof value !== "object" || Array.isArray(value)) errors.push("The custody manifest must be a JSON object.");
    if (value?.packageType !== PACKAGE_TYPE) errors.push("Unsupported custody-manifest package type.");
    if (value?.packageVersion !== 1) errors.push("Unsupported custody-manifest package version.");
    if (value?.protocolVersion !== PROTOCOL_VERSION) errors.push("Unsupported custody protocol version.");
    if (value?.privateKeysIncluded !== false) errors.push("The manifest must explicitly declare that private keys are excluded.");
    if (containsPrivateKeyMaterial(value)) errors.push("Private key material is prohibited in custody manifests.");
    const keys = [];
    for (const entry of Array.isArray(value?.keys) ? value.keys : []) {
      try {
        keys.push(await sanitizeKey(entry, cryptoCore));
      } catch (error) {
        errors.push(error?.message || String(error));
      }
    }
    if (!Array.isArray(value?.keys)) errors.push("The custody manifest keys collection is missing.");
    const knownKeyIds = new Set(keys.map((entry) => entry.id));
    for (const raw of Array.isArray(value?.events) ? value.events : []) {
      try {
        errors.push(...validateEventReferences(normalizeEvent(raw), knownKeyIds));
      } catch (error) {
        errors.push(error?.message || String(error));
      }
    }
    if (!Array.isArray(value?.events)) errors.push("The custody manifest events collection is missing.");
    return {
      valid: errors.length === 0,
      errors: [...new Set(errors)],
      keyCount: keys.length,
      eventCount: Array.isArray(value?.events) ? value.events.length : 0,
      privateMaterialPresent: containsPrivateKeyMaterial(value),
      checkedAt: new Date().toISOString()
    };
  }

  global.MethodzKeyCustodyCoreV162 = {
    version: "1.6.2",
    protocolVersion: PROTOCOL_VERSION,
    packageType: PACKAGE_TYPE,
    eventTypes: [...EVENT_TYPES],
    eventStatuses: [...EVENT_STATUSES],
    containsPrivateKeyMaterial,
    normalizeEvent,
    buildManifest,
    validateManifest
  };
})(typeof window !== "undefined" ? window : globalThis);
