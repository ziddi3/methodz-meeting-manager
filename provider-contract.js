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
    BINARY_PAYLOAD_REJECTED: "BINARY_PAYLOAD_REJECTED",
    CREDENTIAL_REJECTED: "CREDENTIAL_REJECTED",
    PROVIDER_FAILURE: "PROVIDER_FAILURE"
  });

  const RETRYABLE_CODES = new Set([
    ERROR_CODES.PARTIAL_FAILURE,
    ERROR_CODES.UNAVAILABLE,
    ERROR_CODES.RATE_LIMITED
  ]);

  const BINARY_FIELD_NAMES = new Set([
    "base64",
    "contentbase64",
    "binary",
    "binarydata",
    "blobdata",
    "bytes",
    "filebytes",
    "rawbytes"
  ]);

  const CREDENTIAL_FIELD_NAMES = new Set([
    "accesstoken",
    "refreshtoken",
    "authorization",
    "apikey",
    "apisecret",
    "clientsecret",
    "password",
    "bearertoken"
  ]);

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const isObject = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
  const normalizedKey = (key) => String(key).toLowerCase().replace(/[^a-z0-9]/g, "");

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
      return { path: `${path}.d`, reason: "private JWK parameter", code: ERROR_CODES.PRIVATE_KEY_REJECTED };
    }

    for (const [key, nested] of Object.entries(value)) {
      if (["privatekey", "privatejwk"].includes(normalizedKey(key))) {
        return { path: `${path}.${key}`, reason: "private-key field", code: ERROR_CODES.PRIVATE_KEY_REJECTED };
      }
      const found = findPrivateKeyMaterial(nested, `${path}.${key}`);
      if (found) return found;
    }
    return null;
  }

  function findEmbeddedBinaryMaterial(value, path = "$") {
    if (typeof value === "string") {
      if (/^data:[^,]+,/i.test(value.trim())) {
        return { path, reason: "embedded data URL", code: ERROR_CODES.BINARY_PAYLOAD_REJECTED };
      }
      return null;
    }

    const objectTag = Object.prototype.toString.call(value);
    if (["[object ArrayBuffer]", "[object Blob]", "[object Uint8Array]", "[object Uint16Array]", "[object Uint32Array]"].includes(objectTag)) {
      return { path, reason: objectTag.slice(8, -1), code: ERROR_CODES.BINARY_PAYLOAD_REJECTED };
    }

    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const found = findEmbeddedBinaryMaterial(value[index], `${path}[${index}]`);
        if (found) return found;
      }
      return null;
    }
    if (!isObject(value)) return null;

    for (const [key, nested] of Object.entries(value)) {
      if (BINARY_FIELD_NAMES.has(normalizedKey(key)) && nested != null && nested !== "") {
        return { path: `${path}.${key}`, reason: "embedded binary field", code: ERROR_CODES.BINARY_PAYLOAD_REJECTED };
      }
      const found = findEmbeddedBinaryMaterial(nested, `${path}.${key}`);
      if (found) return found;
    }
    return null;
  }

  function findCredentialMaterial(value, path = "$") {
    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index += 1) {
        const found = findCredentialMaterial(value[index], `${path}[${index}]`);
        if (found) return found;
      }
      return null;
    }
    if (!isObject(value)) return null;

    for (const [key, nested] of Object.entries(value)) {
      if (CREDENTIAL_FIELD_NAMES.has(normalizedKey(key)) && nested != null && nested !== "") {
        return { path: `${path}.${key}`, reason: "credential field", code: ERROR_CODES.CREDENTIAL_REJECTED };
      }
      const found = findCredentialMaterial(nested, `${path}.${key}`);
      if (found) return found;
    }
    return null;
  }

  function findDisallowedProviderMaterial(value, path = "$") {
    return findPrivateKeyMaterial(value, path)
      || findEmbeddedBinaryMaterial(value, path)
      || findCredentialMaterial(value, path);
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

  function rejectDisallowedMaterial(value, options = {}) {
    const found = findDisallowedProviderMaterial(value);
    if (!found) return value;
    throw new ProviderError(`${options.operation || "Provider operation"} rejected ${found.reason} at ${found.path}.`, {
      code: found.code,
      retryable: false,
      operation: options.operation || null,
      providerId: options.providerId || null,
      details: found
    });
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

  function assertRecord(record, operation = "upsertRecord", providerId = null) {
    if (!isObject(record) || typeof record.id !== "string" || !record.id) {
      throw new ProviderError(`${operation} requires a record with a non-empty string id.`, {
        code: ERROR_CODES.INVALID_ARGUMENT,
        retryable: false,
        operation,
        providerId
      });
    }
    rejectDisallowedMaterial(record, { operation, providerId });
    return clone(record);
  }

  function assertProviderState(state, options = {}) {
    const providerId = options.providerId || null;
    const operation = options.operation || "readState";
    if (!isObject(state)) {
      throw new ProviderError("Provider state must be an object.", {
        code: ERROR_CODES.INTEGRITY_REJECTED,
        retryable: false,
        operation,
        providerId
      });
    }

    const activeRecords = state.activeRecords;
    const archivedRecords = state.archivedRecords;
    const revisions = state.revisions;
    const idempotency = state.idempotency;
    if (!Array.isArray(activeRecords) || !Array.isArray(archivedRecords) || !isObject(revisions) || !isObject(idempotency)) {
      throw new ProviderError("Provider state collections have invalid shapes.", {
        code: ERROR_CODES.INTEGRITY_REJECTED,
        retryable: false,
        operation,
        providerId
      });
    }

    const seenIds = new Map();
    for (const [collectionName, records] of [["activeRecords", activeRecords], ["archivedRecords", archivedRecords]]) {
      records.forEach((record, index) => {
        if (!isObject(record) || typeof record.id !== "string" || !record.id) {
          throw new ProviderError(`Provider state contains an invalid record at ${collectionName}[${index}].`, {
            code: ERROR_CODES.INTEGRITY_REJECTED,
            retryable: false,
            operation,
            providerId,
            details: { collectionName, index }
          });
        }
        if (seenIds.has(record.id)) {
          throw new ProviderError(`Provider state contains duplicate record id "${record.id}".`, {
            code: ERROR_CODES.INTEGRITY_REJECTED,
            retryable: false,
            operation,
            providerId,
            details: { recordId: record.id, firstCollection: seenIds.get(record.id), duplicateCollection: collectionName }
          });
        }
        seenIds.set(record.id, collectionName);
      });
    }

    for (const [recordId, snapshots] of Object.entries(revisions)) {
      if (!Array.isArray(snapshots)) {
        throw new ProviderError(`Revision history for "${recordId}" must be an array.`, {
          code: ERROR_CODES.INTEGRITY_REJECTED,
          retryable: false,
          operation,
          providerId,
          details: { recordId }
        });
      }
    }

    return clone({ activeRecords, archivedRecords, revisions, idempotency });
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

    rejectDisallowedMaterial(content, {
      operation: "exportWorkspace",
      providerId: input.providerId
    });

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
    const disallowed = findDisallowedProviderMaterial(envelope);
    if (disallowed) return { ok: false, reason: `${disallowed.reason} detected at ${disallowed.path}.`, code: disallowed.code };
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
    findEmbeddedBinaryMaterial,
    findCredentialMaterial,
    findDisallowedProviderMaterial,
    rejectDisallowedMaterial,
    validateProvider,
    assertRecord,
    assertProviderState,
    normalizeIdempotencyKey,
    createConflictToken,
    decorateRecord,
    createExportEnvelope,
    verifyExportEnvelope
  });
});