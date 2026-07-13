/* Methodz Meeting Manager v1.0 asynchronous meeting-data provider contract. */
(function initializeMethodzAsyncData(global) {
  "use strict";

  const CONTRACT_VERSION = "1.0.0";
  const REQUIRED_METHODS = [
    "listRecords",
    "getRecord",
    "replaceRecords",
    "upsertRecord",
    "deleteRecord",
    "healthCheck"
  ];

  const adapters = new Map();
  let activeAdapterId = "local-storage-async";
  let lastOperation = null;

  const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));

  function validateAdapter(adapter) {
    const missing = [];
    if (!adapter || typeof adapter !== "object") return { ok: false, missing: ["adapter object"], adapterId: null };
    if (!adapter.id) missing.push("id");
    REQUIRED_METHODS.forEach((method) => {
      if (typeof adapter[method] !== "function") missing.push(`${method}()`);
    });
    return { ok: missing.length === 0, missing, adapterId: adapter.id || null };
  }

  async function runOperation(operation, callback) {
    const startedAt = new Date().toISOString();
    global.dispatchEvent(new CustomEvent("methodz:async-adapter-operation", {
      detail: { operation, status: "started", startedAt, adapterId: activeAdapterId }
    }));

    try {
      const value = await callback();
      lastOperation = { operation, status: "completed", startedAt, completedAt: new Date().toISOString(), adapterId: activeAdapterId };
      global.dispatchEvent(new CustomEvent("methodz:async-adapter-operation", { detail: clone(lastOperation) }));
      return clone(value);
    } catch (error) {
      lastOperation = {
        operation,
        status: "failed",
        startedAt,
        completedAt: new Date().toISOString(),
        adapterId: activeAdapterId,
        error: error.message || String(error)
      };
      global.dispatchEvent(new CustomEvent("methodz:async-adapter-operation", { detail: clone(lastOperation) }));
      throw error;
    }
  }

  class LocalAsyncMeetingAdapter {
    constructor(options = {}) {
      this.id = options.id || "local-storage-async";
      this.label = options.label || "Browser Local Storage (Async Contract)";
      this.contractVersion = CONTRACT_VERSION;
      this.syncAdapterResolver = options.syncAdapterResolver || (() => global.MethodzMeetingData?.getAdapter());
      this.capabilities = {
        asynchronous: true,
        offline: true,
        remoteSync: false,
        transactions: false,
        conflictTokens: false,
        exportEnvelope: true
      };
    }

    getSyncAdapter() {
      const adapter = this.syncAdapterResolver();
      if (!adapter) throw new Error("The synchronous meeting adapter is unavailable.");
      return adapter;
    }

    async listRecords() {
      return clone(this.getSyncAdapter().listRecords());
    }

    async getRecord(recordId) {
      return clone(this.getSyncAdapter().getRecord(recordId));
    }

    async replaceRecords(records) {
      return this.getSyncAdapter().replaceRecords(clone(records));
    }

    async upsertRecord(record) {
      return clone(this.getSyncAdapter().upsertRecord(clone(record)));
    }

    async deleteRecord(recordId) {
      return this.getSyncAdapter().deleteRecord(recordId);
    }

    async createExportEnvelope(extra = {}) {
      const adapter = this.getSyncAdapter();
      if (typeof adapter.createExportEnvelope === "function") {
        return clone(adapter.createExportEnvelope({ asyncContractVersion: CONTRACT_VERSION, ...extra }));
      }
      return {
        exportedAt: new Date().toISOString(),
        adapterId: this.id,
        asyncContractVersion: CONTRACT_VERSION,
        records: await this.listRecords(),
        ...clone(extra)
      };
    }

    async healthCheck() {
      const syncHealth = await Promise.resolve(this.getSyncAdapter().healthCheck());
      return {
        ok: Boolean(syncHealth?.ok),
        adapterId: this.id,
        label: this.label,
        contractVersion: CONTRACT_VERSION,
        providerType: "local-wrapper",
        syncAdapterId: syncHealth?.adapterId || "unknown",
        records: Number(syncHealth?.records || 0),
        capabilities: clone(this.capabilities),
        checkedAt: new Date().toISOString()
      };
    }
  }

  function registerAdapter(adapter) {
    const validation = validateAdapter(adapter);
    if (!validation.ok) throw new TypeError(`Async adapter "${adapter?.id || "unknown"}" is missing: ${validation.missing.join(", ")}.`);
    adapters.set(adapter.id, adapter);
    return adapter;
  }

  function getAdapter() {
    const adapter = adapters.get(activeAdapterId);
    if (!adapter) throw new Error(`Async meeting adapter "${activeAdapterId}" is not registered.`);
    return adapter;
  }

  registerAdapter(new LocalAsyncMeetingAdapter());

  global.MethodzMeetingAsyncData = {
    version: CONTRACT_VERSION,
    requiredMethods: [...REQUIRED_METHODS],
    LocalAsyncMeetingAdapter,
    validateAdapter,
    registerAdapter,
    useAdapter(adapterId) {
      if (!adapters.has(adapterId)) throw new Error(`Unknown async meeting adapter "${adapterId}".`);
      activeAdapterId = adapterId;
      return this.getAdapterInfo();
    },
    getAdapter,
    getAdapterInfo() {
      const adapter = getAdapter();
      return {
        id: adapter.id,
        label: adapter.label || adapter.id,
        contractVersion: adapter.contractVersion || CONTRACT_VERSION,
        capabilities: clone(adapter.capabilities || {})
      };
    },
    listAdapters() {
      return Array.from(adapters.values()).map((adapter) => ({
        id: adapter.id,
        label: adapter.label || adapter.id,
        contractVersion: adapter.contractVersion || CONTRACT_VERSION,
        capabilities: clone(adapter.capabilities || {})
      }));
    },
    listRecords() {
      return runOperation("listRecords", () => getAdapter().listRecords());
    },
    getRecord(recordId) {
      return runOperation("getRecord", () => getAdapter().getRecord(recordId));
    },
    replaceRecords(records) {
      return runOperation("replaceRecords", () => getAdapter().replaceRecords(records));
    },
    upsertRecord(record) {
      return runOperation("upsertRecord", () => getAdapter().upsertRecord(record));
    },
    deleteRecord(recordId) {
      return runOperation("deleteRecord", () => getAdapter().deleteRecord(recordId));
    },
    createExportEnvelope(extra = {}) {
      const adapter = getAdapter();
      return runOperation("createExportEnvelope", async () => {
        if (typeof adapter.createExportEnvelope === "function") return adapter.createExportEnvelope(extra);
        return {
          exportedAt: new Date().toISOString(),
          adapterId: adapter.id,
          asyncContractVersion: CONTRACT_VERSION,
          records: await adapter.listRecords(),
          ...clone(extra)
        };
      });
    },
    healthCheck() {
      return runOperation("healthCheck", () => getAdapter().healthCheck());
    },
    getLastOperation() {
      return clone(lastOperation);
    }
  };
})(window);
