/*
  Methodz Meeting Manager data adapter contract.
  The default adapter uses localStorage, but the public interface is intentionally
  shaped so a Firebase, Supabase, CRM, Drive, or Methodz API adapter can replace it.
*/
(function initializeMethodzDataAdapter(global) {
  "use strict";

  const DEFAULT_RECORDS_KEY = "methodzMeetingRecords";

  function readConfig() {
    return global.METHODZ_MEETING_CONFIG || {};
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  class LocalStorageMeetingAdapter {
    constructor(options = {}) {
      this.id = options.id || "local-storage";
      this.label = options.label || "Browser Local Storage";
      this.recordsKey = options.recordsKey || DEFAULT_RECORDS_KEY;
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
      if (!Array.isArray(records)) {
        throw new TypeError("replaceRecords expects an array.");
      }
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
        adapterVersion: "0.7.0",
        schemaVersion: config.schemaVersion || "0.7.0",
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
          records: this.listRecords().length,
          storage: "localStorage"
        };
      } catch (error) {
        return {
          ok: false,
          adapterId: this.id,
          label: this.label,
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
    if (!adapter || typeof adapter !== "object" || !adapter.id) {
      throw new TypeError("An adapter must provide an id.");
    }
    ["listRecords", "getRecord", "replaceRecords", "upsertRecord", "deleteRecord", "healthCheck"]
      .forEach((method) => {
        if (typeof adapter[method] !== "function") {
          throw new TypeError(`Adapter "${adapter.id}" is missing ${method}().`);
        }
      });
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
    version: "0.7.0",
    LocalStorageMeetingAdapter,
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
      return { id: adapter.id, label: adapter.label || adapter.id };
    },
    listAdapters() {
      return Array.from(adapters.values()).map((adapter) => ({
        id: adapter.id,
        label: adapter.label || adapter.id
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
      if (typeof adapter.createExportEnvelope === "function") {
        return adapter.createExportEnvelope(extra);
      }
      return {
        exportedAt: new Date().toISOString(),
        adapterId: adapter.id,
        schemaVersion: readConfig().schemaVersion || "0.7.0",
        records: adapter.listRecords(),
        ...clone(extra)
      };
    },
    healthCheck() {
      return getActiveAdapter().healthCheck();
    }
  };
})(window);
