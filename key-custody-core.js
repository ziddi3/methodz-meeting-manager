/* Methodz Meeting Manager v1.6.2 portable public-key custody core. */
(function initializeMethodzKeyCustodyCore(global) {
  "use strict";

  const VERSION = "1.6.2";
  const PROTOCOL_VERSION = "1.0.0";
  const PACKAGE_TYPE = "methodz-public-key-custody-manifest";
  const CANONICALIZATION = "methodz-canonical-json-v1";
  const PRIVATE_CONTAINER_KEYS = new Set(["privatekey", "privatekeyjwk", "privatejwk"]);
  const encoder = new TextEncoder();

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function isPlainObject(value) {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  function stringValue(value) {
    return String(value == null ? "" : value).trim();
  }

  function canonicalize(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
    if (typeof value === "object") {
      return `{${Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
        .join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function containsPrivateKeyMaterial(value, seen = new WeakSet()) {
    if (!value || typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);

    if (!Array.isArray(value)
      && value.kty === "EC"
      && value.crv === "P-256"
      && typeof value.d === "string"
      && value.d) {
      return true;
    }

    return Object.entries(value).some(([key, child]) => {
      if (PRIVATE_CONTAINER_KEYS.has(String(key).toLowerCase()) && child && typeof child === "object") return true;
      return containsPrivateKeyMaterial(child, seen);
    });
  }

  function subtle() {
    if (!global.crypto?.subtle) throw new Error("Web Crypto is unavailable for custody-manifest verification.");
    return global.crypto.subtle;
  }

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  async function sha256Text(text) {
    return bytesToHex(await subtle().digest("SHA-256", encoder.encode(String(text))));
  }

  function normalizePublicJwk(jwk) {
    if (!isPlainObject(jwk)
      || jwk.kty !== "EC"
      || jwk.crv !== "P-256"
      || !stringValue(jwk.x)
      || !stringValue(jwk.y)) {
      throw new Error("The custody entry does not contain a valid P-256 public JWK.");
    }
    if (containsPrivateKeyMaterial(jwk)) throw new Error("Private key material is prohibited in custody records.");
    return {
      kty: "EC",
      crv: "P-256",
      x: stringValue(jwk.x),
      y: stringValue(jwk.y),
      ext: true,
      key_ops: ["verify"]
    };
  }

  async function deriveKeyId(publicJwk) {
    const normalized = normalizePublicJwk(publicJwk);
    const digest = await sha256Text(canonicalize({
      kty: normalized.kty,
      crv: normalized.crv,
      x: normalized.x,
      y: normalized.y
    }));
    return `p256:${digest.slice(0, 32)}`;
  }

  function normalizeIsoDate(value, field, required = false) {
    const text = stringValue(value);
    if (!text) {
      if (required) throw new Error(`${field} is required.`);
      return "";
    }
    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) throw new Error(`${field} is invalid.`);
    return parsed.toISOString();
  }

  function normalizeDateOnly(value, field) {
    const text = stringValue(value);
    if (!text) return "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text) || Number.isNaN(new Date(`${text}T00:00:00.000Z`).getTime())) {
      throw new Error(`${field} must use YYYY-MM-DD.`);
    }
    return text;
  }

  function normalizeStatus(value) {
    const status = stringValue(value) || "Active";
    if (!["Active", "Revoked"].includes(status)) throw new Error(`Unsupported key status: ${status}`);
    return status;
  }

  async function normalizeRegistryEntry(entry) {
    if (!isPlainObject(entry)) throw new Error("A public-key registry entry must be an object.");
    if (containsPrivateKeyMaterial(entry)) throw new Error("Private key material is prohibited in the public-key registry.");

    const publicKeyJwk = normalizePublicJwk(entry.publicKeyJwk);
    const derivedId = await deriveKeyId(publicKeyJwk);
    const suppliedId = stringValue(entry.id || entry.keyId);
    if (suppliedId && suppliedId !== derivedId) {
      throw new Error(`Public key ID mismatch for ${suppliedId}.`);
    }

    const status = normalizeStatus(entry.status);
    const revokedAt = normalizeIsoDate(entry.revokedAt, "Revocation timestamp");
    if (status === "Revoked" && !revokedAt) {
      throw new Error(`Revoked key ${derivedId} is missing a revocation timestamp.`);
    }

    return {
      id: derivedId,
      keyLabel: stringValue(entry.keyLabel) || "Methodz verification key",
      signerLabel: stringValue(entry.signerLabel),
      status,
      publicKeyJwk,
      source: stringValue(entry.source),
      createdAt: normalizeIsoDate(entry.createdAt, "Creation timestamp"),
      updatedAt: normalizeIsoDate(entry.updatedAt, "Update timestamp"),
      revokedAt,
      revocationReason: stringValue(entry.revocationReason),
      replacedByKeyId: stringValue(entry.replacedByKeyId),
      replacesKeyId: stringValue(entry.replacesKeyId),
      activatedAt: normalizeIsoDate(entry.activatedAt, "Activation timestamp")
    };
  }

  async function sanitizeRegistry(entries, maximumEntries = 200) {
    if (!Array.isArray(entries)) throw new Error("The public-key registry must be an array.");
    const maximum = Number(maximumEntries);
    if (!Number.isFinite(maximum) || maximum <= 0) throw new Error("The custody-entry limit is invalid.");
    if (entries.length > maximum) throw new Error(`The public-key registry exceeds the ${maximum}-entry custody limit.`);

    const normalized = [];
    const seen = new Set();
    for (const entry of entries) {
      const safe = await normalizeRegistryEntry(entry);
      if (seen.has(safe.id)) throw new Error(`Duplicate public key ID: ${safe.id}`);
      seen.add(safe.id);
      normalized.push(safe);
    }
    return normalized.sort((left, right) => left.id.localeCompare(right.id));
  }

  function normalizeCustodyRecord(value, keyId) {
    const record = isPlainObject(value) ? value : {};
    return {
      keyId,
      custodian: stringValue(record.custodian),
      custodyLocationReference: stringValue(record.custodyLocationReference),
      fingerprintVerifiedAt: normalizeIsoDate(record.fingerprintVerifiedAt, "Fingerprint verification timestamp"),
      fingerprintVerifiedBy: stringValue(record.fingerprintVerifiedBy),
      fingerprintVerificationChannel: stringValue(record.fingerprintVerificationChannel),
      nextReviewDate: normalizeDateOnly(record.nextReviewDate, "Next review date"),
      notes: stringValue(record.notes),
      updatedAt: normalizeIsoDate(record.updatedAt, "Custody metadata update timestamp")
    };
  }

  function metadataMap(records) {
    if (Array.isArray(records)) {
      return Object.fromEntries(records
        .filter((entry) => isPlainObject(entry) && stringValue(entry.keyId))
        .map((entry) => [stringValue(entry.keyId), entry]));
    }
    return isPlainObject(records) ? records : {};
  }

  async function createManifest(registry, custodyRecords = {}, options = {}) {
    const safeRegistry = await sanitizeRegistry(registry, options.maximumEntries || 200);
    const custodyById = metadataMap(custodyRecords);
    const generatedAt = normalizeIsoDate(options.generatedAt || new Date().toISOString(), "Manifest generation timestamp", true);
    const keys = safeRegistry.map((entry) => ({
      ...entry,
      custody: normalizeCustodyRecord(custodyById[entry.id], entry.id)
    }));

    const manifest = {
      packageType: PACKAGE_TYPE,
      packageVersion: 1,
      protocolVersion: PROTOCOL_VERSION,
      generatedAt,
      generatedBy: stringValue(options.generatedBy),
      organization: stringValue(options.organization),
      manifestPurpose: stringValue(options.manifestPurpose) || "Public verification-key custody and lifecycle reference",
      privateKeysIncluded: false,
      keys,
      notice: "Public keys and browser-local custody workflow metadata only. Confirm key fingerprints through an independent trusted channel."
    };
    const digest = await sha256Text(canonicalize(manifest));
    return {
      ...manifest,
      integrity: {
        algorithm: "SHA-256",
        canonicalization: CANONICALIZATION,
        digest
      }
    };
  }

  async function verifyManifest(value, options = {}) {
    const errors = [];
    const warnings = [];
    let normalizedKeys = [];
    let expectedDigest = "";
    let actualDigest = "";

    if (!isPlainObject(value)) {
      return invalidVerification(["The custody manifest must be a JSON object."]);
    }
    if (containsPrivateKeyMaterial(value)) errors.push("The custody manifest contains prohibited private key material.");
    if (value.packageType !== PACKAGE_TYPE) errors.push("Unsupported custody-manifest package type.");
    if (value.packageVersion !== 1) errors.push("Unsupported custody-manifest package version.");
    if (value.protocolVersion !== PROTOCOL_VERSION) errors.push("Unsupported custody protocol version.");
    if (value.privateKeysIncluded !== false) errors.push("The custody manifest must explicitly state that private keys are excluded.");
    if (!Array.isArray(value.keys)) errors.push("The custody manifest keys field must be an array.");

    try {
      normalizedKeys = await sanitizeRegistry(
        Array.isArray(value.keys) ? value.keys.map((entry) => ({ ...entry, ...(entry.custody ? {} : {}) })) : [],
        options.maximumEntries || 200
      );
    } catch (error) {
      errors.push(error?.message || String(error));
    }

    if (Array.isArray(value.keys)) {
      for (const entry of value.keys) {
        try {
          const keyId = stringValue(entry?.id || entry?.keyId);
          normalizeCustodyRecord(entry?.custody, keyId);
        } catch (error) {
          errors.push(error?.message || String(error));
        }
      }
    }

    expectedDigest = stringValue(value.integrity?.digest);
    if (value.integrity?.algorithm !== "SHA-256") errors.push("Custody-manifest integrity must use SHA-256.");
    if (value.integrity?.canonicalization !== CANONICALIZATION) errors.push("Unsupported custody-manifest canonicalization.");
    if (!expectedDigest || !/^[a-f0-9]{64}$/.test(expectedDigest)) errors.push("Custody-manifest integrity digest is missing or malformed.");

    try {
      const unsigned = clone(value);
      delete unsigned.integrity;
      actualDigest = await sha256Text(canonicalize(unsigned));
      if (expectedDigest && actualDigest !== expectedDigest) errors.push("The custody-manifest integrity digest does not match its contents.");
    } catch (error) {
      errors.push(error?.message || String(error));
    }

    const knownIds = new Set(normalizedKeys.map((entry) => entry.id));
    normalizedKeys.forEach((entry) => {
      if (entry.replacedByKeyId && !knownIds.has(entry.replacedByKeyId)) warnings.push(`${entry.id} references a successor not included in this manifest.`);
      if (entry.replacesKeyId && !knownIds.has(entry.replacesKeyId)) warnings.push(`${entry.id} references a predecessor not included in this manifest.`);
      if (entry.status === "Revoked" && !entry.revocationReason) warnings.push(`${entry.id} is revoked without a recorded reason.`);
    });

    return {
      valid: errors.length === 0,
      packageType: stringValue(value.packageType),
      keyCount: normalizedKeys.length,
      activeKeyCount: normalizedKeys.filter((entry) => entry.status === "Active").length,
      revokedKeyCount: normalizedKeys.filter((entry) => entry.status === "Revoked").length,
      digestMatches: Boolean(expectedDigest && actualDigest && expectedDigest === actualDigest),
      expectedDigest,
      actualDigest,
      errors: [...new Set(errors)],
      warnings: [...new Set(warnings)],
      notice: "Manifest verification confirms public-key structure and package integrity only. It does not authenticate custodians, operators, witnesses, authority, or delivery."
    };
  }

  function invalidVerification(errors) {
    return {
      valid: false,
      packageType: "",
      keyCount: 0,
      activeKeyCount: 0,
      revokedKeyCount: 0,
      digestMatches: false,
      expectedDigest: "",
      actualDigest: "",
      errors,
      warnings: [],
      notice: "Custody-manifest verification could not be completed."
    };
  }

  function ceremonyFields(options, action) {
    const operator = stringValue(options.operator);
    const reason = stringValue(options.reason);
    if (!operator) throw new Error(`${action} requires an operator name or controlled role.`);
    if (!reason) throw new Error(`${action} requires a documented reason.`);
    return {
      operator,
      witness: stringValue(options.witness),
      reason,
      occurredAt: normalizeIsoDate(options.occurredAt || new Date().toISOString(), `${action} timestamp`, true),
      evidenceReference: stringValue(options.evidenceReference)
    };
  }

  async function buildRotationPlan(registry, options = {}) {
    const safe = await sanitizeRegistry(registry, options.maximumEntries || 200);
    const predecessorKeyId = stringValue(options.predecessorKeyId);
    const successorKeyId = stringValue(options.successorKeyId);
    if (!predecessorKeyId || !successorKeyId) throw new Error("Select both predecessor and successor public keys.");
    if (predecessorKeyId === successorKeyId) throw new Error("The predecessor and successor keys must be different.");

    const predecessor = safe.find((entry) => entry.id === predecessorKeyId);
    const successor = safe.find((entry) => entry.id === successorKeyId);
    if (!predecessor) throw new Error("The predecessor public key is not registered.");
    if (!successor) throw new Error("The successor public key is not registered.");
    if (predecessor.status !== "Active") throw new Error("Only an active predecessor key can be rotated.");
    if (successor.status !== "Active") throw new Error("The successor key must be active before rotation.");

    const ceremony = ceremonyFields(options, "Key rotation");
    const entries = safe.map((entry) => {
      if (entry.id === predecessorKeyId) {
        return {
          ...entry,
          status: "Revoked",
          revokedAt: ceremony.occurredAt,
          revocationReason: ceremony.reason,
          replacedByKeyId: successorKeyId,
          updatedAt: ceremony.occurredAt
        };
      }
      if (entry.id === successorKeyId) {
        return {
          ...entry,
          status: "Active",
          replacesKeyId: predecessorKeyId,
          activatedAt: entry.activatedAt || ceremony.occurredAt,
          updatedAt: ceremony.occurredAt
        };
      }
      return entry;
    });

    return {
      entries,
      event: {
        action: "public-key-rotation-completed",
        predecessorKeyId,
        successorKeyId,
        ...ceremony
      }
    };
  }

  async function buildRevocationPlan(registry, options = {}) {
    const safe = await sanitizeRegistry(registry, options.maximumEntries || 200);
    const keyId = stringValue(options.keyId);
    if (!keyId) throw new Error("Select a public key to revoke.");
    const selected = safe.find((entry) => entry.id === keyId);
    if (!selected) throw new Error("The selected public key is not registered.");
    if (selected.status === "Revoked") throw new Error("The selected public key is already revoked.");

    const ceremony = ceremonyFields(options, "Key revocation");
    return {
      entries: safe.map((entry) => entry.id === keyId ? {
        ...entry,
        status: "Revoked",
        revokedAt: ceremony.occurredAt,
        revocationReason: ceremony.reason,
        updatedAt: ceremony.occurredAt
      } : entry),
      event: {
        action: "public-key-revoked-with-custody-record",
        keyId,
        ...ceremony
      }
    };
  }

  global.MethodzKeyCustodyCoreV162 = {
    version: VERSION,
    protocolVersion: PROTOCOL_VERSION,
    packageType: PACKAGE_TYPE,
    canonicalization: CANONICALIZATION,
    canonicalize,
    containsPrivateKeyMaterial,
    normalizePublicJwk,
    deriveKeyId,
    sanitizeRegistry,
    createManifest,
    verifyManifest,
    buildRotationPlan,
    buildRevocationPlan
  };
})(globalThis);
