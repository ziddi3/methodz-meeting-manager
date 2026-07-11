/*
  Methodz Meeting Manager data adapter contract.
  The default adapter uses localStorage, while the public interface remains replaceable
  by future Firebase, Supabase, CRM, Drive, or Methodz API providers.
*/
(function initializeMethodzDataAdapter(global) {
  "use strict";

  const CONTRACT_VERSION = "0.8.0";
  const DEFAULT_RECORDS_KEY = "methodzMeetingRecords";
  const REQUIRED_METHODS = [
    "listRecords",
    "getRecord",
    "replaceRecords",
    "upsertRecord",
    "deleteRecord",
    "healthCheck"
  ];
  const OPTIONAL_METHODS = ["createExportEnvelope"];

  function readConfig() {
    return global.METHODZ_MEETING_CONFIG || {};
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validateAdapter(adapter) {
    const missing = [];
    if (!adapter || typeof adapter !== "object") {
      return { ok: false, missing: ["adapter object"], adapterId: null };
    }
    if (!adapter.id) missing.push("id");
    REQUIRED_METHODS.forEach((method) => {
      if (typeof adapter[method] !== "function") missing.push(`${method}()`);
    });
    return { ok: missing.length === 0, missing, adapterId: adapter.id || null };
  }

  class LocalStorageMeetingAdapter {
    constructor(options = {}) {
      this.id = options.id || "local-storage";
      this.label = options.label || "Browser Local Storage";
      this.recordsKey = options.recordsKey || DEFAULT_RECORDS_KEY;
      this.contractVersion = CONTRACT_VERSION;
      this.capabilities = {
        synchronous: true,
        offline: true,
        exportEnvelope: true,
        transactions: false,
        remoteSync: false
      };
    }

    listRecords() {
      try {
        const parsed = JSON.parse(global.localStorage.getItem(this.recordsKey)) || [];
        return Array.isArray(parsed) ? parsed : [];
      } catch (error) {
        console.error("Unable to read meeting records through the local adapter", error);
        return [];
      }
    }

    getRecord(recordId) {
      return this.listRecords().find((record) => record.id === recordId) || null;
    }

    replaceRecords(records) {
      if (!Array.isArray(records)) throw new TypeError("replaceRecords expects an array.");
      global.localStorage.setItem(this.recordsKey, JSON.stringify(records));
      return records.length;
    }

    upsertRecord(record) {
      if (!record || typeof record !== "object" || !record.id) {
        throw new TypeError("upsertRecord expects a record with an id.");
      }
      const records = this.listRecords();
      const index = records.findIndex((item) => item.id === record.id);
      if (index >= 0) records[index] = { ...records[index], ...clone(record) };
      else records.push(clone(record));
      this.replaceRecords(records);
      return clone(record);
    }

    deleteRecord(recordId) {
      const records = this.listRecords();
      const next = records.filter((record) => record.id !== recordId);
      this.replaceRecords(next);
      return next.length !== records.length;
    }

    createExportEnvelope(extra = {}) {
      const config = readConfig();
      return {
        exportedAt: new Date().toISOString(),
        adapterId: this.id,
        adapterVersion: CONTRACT_VERSION,
        schemaVersion: config.schemaVersion || CONTRACT_VERSION,
        appName: config.brand?.appName || "Methodz Meeting Manager",
        records: this.listRecords(),
        ...clone(extra)
      };
    }

    healthCheck() {
      try {
        const probeKey = `${this.recordsKey}:adapter-probe`;
        global.localStorage.setItem(probeKey, "ok");
        global.localStorage.removeItem(probeKey);
        return {
          ok: true,
          adapterId: this.id,
          label: this.label,
          contractVersion: CONTRACT_VERSION,
          records: this.listRecords().length,
          storage: "localStorage",
          capabilities: clone(this.capabilities)
        };
      } catch (error) {
        return {
          ok: false,
          adapterId: this.id,
          label: this.label,
          contractVersion: CONTRACT_VERSION,
          records: 0,
          storage: "localStorage",
          error: error.message
        };
      }
    }
  }

  const adapters = new Map();
  let activeAdapterId = "local-storage";

  function registerAdapter(adapter) {
    const validation = validateAdapter(adapter);
    if (!validation.ok) {
      throw new TypeError(`Adapter "${adapter?.id || "unknown"}" is missing: ${validation.missing.join(", ")}.`);
    }
    adapters.set(adapter.id, adapter);
    return adapter;
  }

  function getActiveAdapter() {
    const adapter = adapters.get(activeAdapterId);
    if (!adapter) throw new Error(`Meeting data adapter "${activeAdapterId}" is not registered.`);
    return adapter;
  }

  const config = readConfig();
  registerAdapter(new LocalStorageMeetingAdapter({
    recordsKey: config.storageKeys?.records || DEFAULT_RECORDS_KEY
  }));

  global.MethodzMeetingData = {
    version: CONTRACT_VERSION,
    requiredMethods: [...REQUIRED_METHODS],
    optionalMethods: [...OPTIONAL_METHODS],
    LocalStorageMeetingAdapter,
    validateAdapter,
    registerAdapter,
    useAdapter(adapterId) {
      if (!adapters.has(adapterId)) throw new Error(`Unknown meeting data adapter "${adapterId}".`);
      activeAdapterId = adapterId;
      return this.getAdapterInfo();
    },
    getAdapter() {
      return getActiveAdapter();
    },
    getAdapterInfo() {
      const adapter = getActiveAdapter();
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
      return getActiveAdapter().listRecords();
    },
    getRecord(recordId) {
      return getActiveAdapter().getRecord(recordId);
    },
    replaceRecords(records) {
      return getActiveAdapter().replaceRecords(records);
    },
    upsertRecord(record) {
      return getActiveAdapter().upsertRecord(record);
    },
    deleteRecord(recordId) {
      return getActiveAdapter().deleteRecord(recordId);
    },
    createExportEnvelope(extra = {}) {
      const adapter = getActiveAdapter();
      if (typeof adapter.createExportEnvelope === "function") return adapter.createExportEnvelope(extra);
      return {
        exportedAt: new Date().toISOString(),
        adapterId: adapter.id,
        adapterVersion: CONTRACT_VERSION,
        schemaVersion: readConfig().schemaVersion || CONTRACT_VERSION,
        records: adapter.listRecords(),
        ...clone(extra)
      };
    },
    healthCheck() {
      return getActiveAdapter().healthCheck();
    }
  };
})(window);
