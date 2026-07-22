import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Contract = require("../provider-contract.js");
const Adapters = require("../hosted-provider-adapters.js");
const Conformance = require("../provider-conformance.js");

class MemoryStorage {
  constructor(initial = {}) {
    this.values = new Map(Object.entries(initial).map(([key, value]) => [key, String(value)]));
  }

  get length() {
    return this.values.size;
  }

  key(index) {
    return Array.from(this.values.keys())[index] ?? null;
  }

  getItem(key) {
    return this.values.has(String(key)) ? this.values.get(String(key)) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(String(key));
  }

  clear() {
    this.values.clear();
  }
}

class FailingStorage extends MemoryStorage {
  constructor(failAfterWrites) {
    super();
    this.failAfterWrites = failAfterWrites;
    this.writeCount = 0;
  }

  setItem(key, value) {
    if (this.writeCount >= this.failAfterWrites) throw new Error("Synthetic storage write failure");
    this.writeCount += 1;
    super.setItem(key, value);
  }
}

function providerKeys(suffix) {
  return {
    activeRecords: `test:${suffix}:active`,
    archivedRecords: `test:${suffix}:archived`,
    revisions: `test:${suffix}:revisions`,
    idempotency: `test:${suffix}:idempotency`
  };
}

function seedStorage(storage, keys, state) {
  const safeState = state || { activeRecords: [], archivedRecords: [], revisions: {}, idempotency: {} };
  storage.setItem(keys.activeRecords, JSON.stringify(safeState.activeRecords || []));
  storage.setItem(keys.archivedRecords, JSON.stringify(safeState.archivedRecords || []));
  storage.setItem(keys.revisions, JSON.stringify(safeState.revisions || {}));
  storage.setItem(keys.idempotency, JSON.stringify(safeState.idempotency || {}));
}

const memoryFactory = async (options = {}) => new Adapters.InMemoryHostedProvider({
  id: `memory-conformance-${options.suffix || "primary"}`,
  initialState: options.initialState
});

const localFactory = async (options = {}) => {
  const suffix = `${options.suffix || "primary"}-${Math.random().toString(16).slice(2)}`;
  const keys = providerKeys(suffix);
  const storage = new MemoryStorage();
  seedStorage(storage, keys, options.initialState);
  return new Adapters.LocalStorageHostedProvider({
    id: `local-conformance-${suffix}`,
    storage,
    keys
  });
};

assert.equal(Contract.version, "1.0.0");
assert.equal(Contract.errorCodes.PRIVATE_KEY_REJECTED, "PRIVATE_KEY_REJECTED");
assert.equal(Contract.errorCodes.BINARY_PAYLOAD_REJECTED, "BINARY_PAYLOAD_REJECTED");
assert.equal(Contract.errorCodes.CREDENTIAL_REJECTED, "CREDENTIAL_REJECTED");

const memoryReport = await Conformance.runProviderConformance(memoryFactory, {
  recordPrefix: "v163-memory"
});
const localReport = await Conformance.runProviderConformance(localFactory, {
  recordPrefix: "v163-local"
});

assert.equal(memoryReport.ok, true);
assert.equal(localReport.ok, true);
assert.equal(memoryReport.contractVersion, Contract.version);
assert.equal(localReport.contractVersion, Contract.version);
assert.ok(memoryReport.checks.length >= 15, "Memory provider conformance coverage is unexpectedly small.");
assert.equal(localReport.checks.length, memoryReport.checks.length, "Reference providers did not run the same conformance suite.");

const duplicateState = {
  activeRecords: [{ id: "duplicate-record" }],
  archivedRecords: [{ id: "duplicate-record" }],
  revisions: {},
  idempotency: {}
};
assert.throws(
  () => Contract.assertProviderState(duplicateState, { providerId: "direct-state-test" }),
  (error) => error instanceof Contract.ProviderError
    && error.code === Contract.errorCodes.INTEGRITY_REJECTED
    && error.retryable === false
);

const badShapeStorage = new MemoryStorage({
  "bad:active": JSON.stringify({ not: "an array" }),
  "bad:archived": "[]",
  "bad:revisions": "{}",
  "bad:idempotency": "{}"
});
const badShapeProvider = new Adapters.LocalStorageHostedProvider({
  id: "bad-shape-provider",
  storage: badShapeStorage,
  keys: {
    activeRecords: "bad:active",
    archivedRecords: "bad:archived",
    revisions: "bad:revisions",
    idempotency: "bad:idempotency"
  }
});
await assert.rejects(
  () => badShapeProvider.listRecords(),
  (error) => error instanceof Contract.ProviderError
    && error.code === Contract.errorCodes.INTEGRITY_REJECTED
    && error.retryable === false
);

const failingStorage = new FailingStorage(1);
const failingProvider = new Adapters.LocalStorageHostedProvider({
  id: "partial-write-provider",
  storage: failingStorage,
  keys: providerKeys("partial-write")
});
await assert.rejects(
  () => failingProvider.upsertRecord({ id: "partial-write-record", title: "Synthetic partial write" }),
  (error) => error instanceof Contract.ProviderError
    && error.code === Contract.errorCodes.PARTIAL_FAILURE
    && error.retryable === true
    && error.details.completed === 1
    && error.details.failed === 3
);

const safeReference = {
  id: "attachment-reference",
  attachments: [{ id: "att-1", name: "Reference", location: "https://example.invalid/document.pdf" }]
};
assert.deepEqual(Contract.assertRecord(safeReference), safeReference);
assert.throws(
  () => Contract.assertRecord({ id: "embedded-binary", attachment: { location: "data:text/plain;base64,SGVsbG8=" } }),
  (error) => error.code === Contract.errorCodes.BINARY_PAYLOAD_REJECTED
);
assert.throws(
  () => Contract.assertRecord({ id: "credential", provider: { refreshToken: "synthetic" } }),
  (error) => error.code === Contract.errorCodes.CREDENTIAL_REJECTED
);

console.log(`Hosted-provider conformance passed: ${memoryReport.providerId} (${memoryReport.checks.length} checks)`);
console.log(`Hosted-provider conformance passed: ${localReport.providerId} (${localReport.checks.length} checks)`);
console.log("Provider state, payload, partial-failure, archive, revision, conflict, idempotency, and export boundaries passed.");
