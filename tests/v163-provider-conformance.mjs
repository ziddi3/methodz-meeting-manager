import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Contract = require("../provider-contract.js");
const Adapters = require("../hosted-provider-adapters.js");
const Conformance = require("../provider-conformance.js");

class DisposableStorage {
  constructor(seed = {}) {
    this.values = new Map(Object.entries(seed));
  }

  getItem(key) {
    return this.values.has(key) ? this.values.get(key) : null;
  }

  setItem(key, value) {
    this.values.set(String(key), String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

function memoryFactory(options = {}) {
  return new Adapters.InMemoryHostedProvider({
    id: `conformance-memory${options.suffix ? `-${options.suffix}` : ""}`,
    initialState: options.initialState
  });
}

function localFactory(options = {}) {
  const suffix = options.suffix || "main";
  const keys = {
    activeRecords: `test:${suffix}:active`,
    archivedRecords: `test:${suffix}:archived`,
    revisions: `test:${suffix}:revisions`,
    idempotency: `test:${suffix}:idempotency`
  };
  const initial = options.initialState || {
    activeRecords: [],
    archivedRecords: [],
    revisions: {},
    idempotency: {}
  };
  const storage = new DisposableStorage({
    [keys.activeRecords]: JSON.stringify(initial.activeRecords || []),
    [keys.archivedRecords]: JSON.stringify(initial.archivedRecords || []),
    [keys.revisions]: JSON.stringify(initial.revisions || {}),
    [keys.idempotency]: JSON.stringify(initial.idempotency || {})
  });
  return new Adapters.LocalStorageHostedProvider({
    id: `conformance-local${options.suffix ? `-${options.suffix}` : ""}`,
    storage,
    keys
  });
}

const results = [];
results.push(await Conformance.runProviderConformance(memoryFactory, { recordPrefix: "memory" }));
results.push(await Conformance.runProviderConformance(localFactory, { recordPrefix: "local" }));

if (!results.every((result) => result.ok)) process.exitCode = 1;
console.log(JSON.stringify({
  ok: results.every((result) => result.ok),
  contractVersion: Contract.version,
  providers: results.map((result) => ({
    providerId: result.providerId,
    checks: result.checks.length
  }))
}, null, 2));
