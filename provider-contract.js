/* Methodz Meeting Manager v1.6.3 portable hosted-provider contract core. */
(function initializeMethodzProviderContract(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzHostedProviderContract = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createProviderContract() {
  "use strict";

  const VERSION = "1.0.0";
  const PACKAGE_TYPE = "methodz-hosted-provider-export";
  const REQUIRED_METHODS = [
    "listRecords",
    "getRecord",
    "upsertRecord",
    "archiveRecord",
    "restoreRecord",
    "deleteRecord",
    "exportWorkspace",
    "healthCheck"
  ];

  const ERROR_CODES = Object.freeze({
    INVALID_ARGUMENT: "INVALID_ARGUMENT",
    NOT_FOUND: "NOT_FOUND",
    CONFLICT: "CONFLICT",
    IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
    PARTIAL_FAILURE: "PARTIAL_FAILURE",
    UNAVAILABLE: "UNAVAILABLE",
    RATE_LIMITED: "RATE_LIMITED",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    INTEGRITY_REJECTED: "INTEGRITY_REJECTED",
    PRIVATE_KEY_REJECTED: "PRIVATE_KEY_REJECTED",
    PROVIDER_FAILURE: "PROVIDER_FAILURE"
  });

  const RETRYABLE_CODES = new Set([
    ERROR_CODES.PARTIAL_FAILURE,
    ERROR_CODES.UNAVAILABLE,
    ERROR_CODES.RATE_LIMITED
  ]);

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

  function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (!isObject(value)) return value;
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = canonicalize(value[key]);
      return result;
    }, {});
  }

  const canonicalStringify = (value) => JSON.stringify(canonicalize(value));

  function fnv1a32(input) {
    let hash = 0x811c9dc5;
    for (const character of String(input)) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, "0");
  }

  function findPrivateKeyMaterial(value, path = "$") {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const found = findPrivateKeyMaterial(value[index], `${path}[${index}]`);
        if (found) return found;
      }
      return null;
    }
    if (!isObject(value)) return null;

    if (typeof value.d === "string" && (value.kty || value.crv || value.x || value.y)) {
      return { path: `${path}.d`, reason: "private JWK parameter" };
    }

    for (const [key, nested] of Object.entries(value)) {
      if (["privatekey", "private_key", "privatejwk", "private_jwk"].includes(key.toLowerCase())) {
        return { path: `${path}.${key}`, reason: "private-key field" };
      }
      const found = findPrivateKeyMaterial(nested, `${path}.${key}`);
      if (found) return found;
    }
    return null;
  }

  class ProviderError extends Error {
    constructor(message, options = {}) {
      super(message);
      this.name = "ProviderError";
      this.code = options.code || ERROR_CODES.PROVIDER_FAILURE;
      this.retryable = options.retryable ?? RETRYABLE_CODES.has(this.code);
      this.operation = options.operation || null;
      this.providerId = options.providerId || null;
      this.details = clone(options.details || null);
    }

    toJSON() {
      return {
        name: this.name,
        message: this.message,
        code: this.code,
        retryable: this.retryable,
        operation: this.operation,
        providerId: this.providerId,
        details: clone(this.details)
      };
    }
  }

  function validateProvider(provider) {
    const missing = [];
    if (!provider || typeof provider !== "object") {
      return { ok: false, providerId: null, contractVersion: null, missing: ["provider object"] };
    }
    if (!provider.id || typeof provider.id !== "string") missing.push("id");
    REQUIRED_METHODS.forEach((method) => {
      if (typeof provider[method] !== "function") missing.push(`${method}()`);
    });
    return {
      ok: missing.length === 0,
      providerId: provider.id || null,
      contractVersion: provider.contractVersion || null,
      missing
    };
  }

  function assertRecord(record, operation = "upsertRecord") {
    if (!isObject(record) || typeof record.id !== "string" || !record.id) {
      throw new ProviderError(`${operation} requires a record with a non-empty string id.`, {
        code: ERROR_CODES.INVALID_ARGUMENT,
        retryable: false,
        operation
      });
    }
    return clone(record);
  }

  function normalizeIdempotencyKey(value) {
    if (value == null || value === "") return null;
    if (typeof value !== "string" || value.length > 200) {
      throw new ProviderError("Idempotency keys must contain 1 to 200 characters.", {
        code: ERROR_CODES.INVALID_ARGUMENT,
        retryable: false
      });
    }
    return value;
  }

  function withoutConflictToken(record) {
    const copy = clone(record);
    if (isObject(copy?.providerMetadata)) delete copy.providerMetadata.conflictToken;
    return copy;
  }

  function createConflictToken(record, version = Number(record?.providerMetadata?.version || 0)) {
    return `mhp:${version}:${fnv1a32(canonicalStringify(withoutConflictToken(record)))}`;
  }

  function decorateRecord(record, version) {
    const decorated = clone(record);
    decorated.providerMetadata = {
      ...(isObject(decorated.providerMetadata) ? decorated.providerMetadata : {}),
      contractVersion: VERSION,
      version
    };
    decorated.providerMetadata.conflictToken = createConflictToken(decorated, version);
    return decorated;
  }

  function createExportEnvelope(input) {
    const content = {
      packageType: PACKAGE_TYPE,
      packageVersion: "1.0.0",
      providerContractVersion: VERSION,
      providerId: input.providerId,
      exportedAt: input.exportedAt || new Date().toISOString(),
      activeRecords: clone(input.activeRecords || []),
      archivedRecords: clone(input.archivedRecords || []),
      revisions: clone(input.revisions || {}),
      metadata: clone(input.metadata || {})
    };

    const privateMaterial = findPrivateKeyMaterial(content);
    if (privateMaterial) {
      throw new ProviderError(`Provider export rejected ${privateMaterial.reason} at ${privateMaterial.path}.`, {
        code: ERROR_CODES.PRIVATE_KEY_REJECTED,
        retryable: false,
        operation: "exportWorkspace",
        providerId: input.providerId,
        details: privateMaterial
      });
    }

    return {
      ...content,
      integrity: {
        algorithm: "fnv1a32-canonical-json",
        value: fnv1a32(canonicalStringify(content))
      }
    };
  }

  function verifyExportEnvelope(envelope) {
    if (!isObject(envelope) || envelope.packageType !== PACKAGE_TYPE) {
      return { ok: false, reason: "Unsupported hosted-provider export package." };
    }
    const privateMaterial = findPrivateKeyMaterial(envelope);
    if (privateMaterial) return { ok: false, reason: `Private key material detected at ${privateMaterial.path}.` };
    const expected = envelope.integrity?.value;
    if (typeof expected !== "string" || !expected) return { ok: false, reason: "Integrity value is missing." };
    const content = clone(envelope);
    delete content.integrity;
    const actual = fnv1a32(canonicalStringify(content));
    return {
      ok: actual === expected,
      expected,
      actual,
      algorithm: envelope.integrity?.algorithm || null
    };
  }

  return Object.freeze({
    version: VERSION,
    exportPackageType: PACKAGE_TYPE,
    requiredMethods: [...REQUIRED_METHODS],
    errorCodes: ERROR_CODES,
    ProviderError,
    clone,
    isObject,
    canonicalize,
    canonicalStringify,
    fnv1a32,
    findPrivateKeyMaterial,
    validateProvider,
    assertRecord,
    normalizeIdempotencyKey,
    createConflictToken,
    decorateRecord,
    createExportEnvelope,
    verifyExportEnvelope
  });
});
