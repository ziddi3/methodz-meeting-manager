/* Methodz Meeting Manager v1.0 attachment-reference adapter boundary. */
(function initializeMethodzAttachmentData(global) {
  "use strict";

  const CONTRACT_VERSION = "1.0.0";
  const REQUIRED_METHODS = ["listReferences", "getReference", "upsertReference", "deleteReference", "validateReference", "healthCheck"];
  const adapters = new Map();
  let activeAdapterId = "record-reference";

  const clone = (value) => (value == null ? value : JSON.parse(JSON.stringify(value)));
  const text = (value) => String(value == null ? "" : value).trim();

  function validateAdapter(adapter) {
    const missing = [];
    if (!adapter || typeof adapter !== "object") return { ok: false, missing: ["adapter object"], adapterId: null };
    if (!adapter.id) missing.push("id");
    REQUIRED_METHODS.forEach((method) => {
      if (typeof adapter[method] !== "function") missing.push(`${method}()`);
    });
    return { ok: missing.length === 0, missing, adapterId: adapter.id || null };
  }

  class RecordReferenceAttachmentAdapter {
    constructor() {
      this.id = "record-reference";
      this.label = "Record-Embedded Attachment References";
      this.contractVersion = CONTRACT_VERSION;
      this.capabilities = {
        offline: true,
        binaryStorage: false,
        metadataOnly: true,
        externalLocations: true,
        remoteUpload: false
      };
    }

    normalizeReference(reference = {}) {
      return {
        ...clone(reference),
        id: text(reference.id) || `attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        label: text(reference.label || reference.name),
        type: text(reference.type) || "Other",
        location: text(reference.location),
        date: text(reference.date),
        addedBy: text(reference.addedBy),
        notes: text(reference.notes)
      };
    }

    listReferences(record) {
      return Array.isArray(record?.attachments) ? clone(record.attachments) : [];
    }

    getReference(record, referenceId) {
      return this.listReferences(record).find((item) => item.id === referenceId) || null;
    }

    upsertReference(record, reference) {
      if (!record || typeof record !== "object") throw new TypeError("A meeting record is required.");
      const normalized = this.normalizeReference(reference);
      const validation = this.validateReference(normalized);
      if (!validation.valid) throw new TypeError(validation.errors.join(" "));
      const attachments = this.listReferences(record);
      const index = attachments.findIndex((item) => item.id === normalized.id);
      if (index >= 0) attachments[index] = normalized;
      else attachments.push(normalized);
      return { ...clone(record), attachments };
    }

    deleteReference(record, referenceId) {
      if (!record || typeof record !== "object") throw new TypeError("A meeting record is required.");
      return {
        ...clone(record),
        attachments: this.listReferences(record).filter((item) => item.id !== referenceId)
      };
    }

    validateReference(reference) {
      const errors = [];
      const warnings = [];
      if (!reference || typeof reference !== "object" || Array.isArray(reference)) errors.push("Attachment reference must be an object.");
      if (!text(reference?.label)) warnings.push("Reference name is missing.");
      if (!text(reference?.location)) warnings.push("File or evidence location is missing.");
      const location = text(reference?.location).toLowerCase();
      if (location.startsWith("data:") || location.includes(";base64,")) {
        errors.push("Binary or base64 data cannot be stored as an attachment reference.");
      }
      return { valid: errors.length === 0, errors, warnings };
    }

    normalizeRecord(record) {
      const attachments = this.listReferences(record).map((item) => this.normalizeReference(item));
      return {
        ...clone(record),
        attachments,
        attachmentAdapterMetadata: {
          adapterId: this.id,
          contractVersion: CONTRACT_VERSION,
          mode: "reference-only",
          itemCount: attachments.length,
          normalizedAt: new Date().toISOString()
        }
      };
    }

    healthCheck() {
      return {
        ok: true,
        adapterId: this.id,
        label: this.label,
        contractVersion: CONTRACT_VERSION,
        capabilities: clone(this.capabilities),
        checkedAt: new Date().toISOString()
      };
    }
  }

  function registerAdapter(adapter) {
    const validation = validateAdapter(adapter);
    if (!validation.ok) throw new TypeError(`Attachment adapter "${adapter?.id || "unknown"}" is missing: ${validation.missing.join(", ")}.`);
    adapters.set(adapter.id, adapter);
    return adapter;
  }

  function getAdapter() {
    const adapter = adapters.get(activeAdapterId);
    if (!adapter) throw new Error(`Attachment adapter "${activeAdapterId}" is not registered.`);
    return adapter;
  }

  registerAdapter(new RecordReferenceAttachmentAdapter());

  global.MethodzAttachmentData = {
    version: CONTRACT_VERSION,
    requiredMethods: [...REQUIRED_METHODS],
    RecordReferenceAttachmentAdapter,
    validateAdapter,
    registerAdapter,
    useAdapter(adapterId) {
      if (!adapters.has(adapterId)) throw new Error(`Unknown attachment adapter "${adapterId}".`);
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
    listReferences(record) {
      return getAdapter().listReferences(record);
    },
    getReference(record, referenceId) {
      return getAdapter().getReference(record, referenceId);
    },
    upsertReference(record, reference) {
      return getAdapter().upsertReference(record, reference);
    },
    deleteReference(record, referenceId) {
      return getAdapter().deleteReference(record, referenceId);
    },
    validateReference(reference) {
      return getAdapter().validateReference(reference);
    },
    normalizeRecord(record) {
      const adapter = getAdapter();
      return typeof adapter.normalizeRecord === "function" ? adapter.normalizeRecord(record) : clone(record);
    },
    healthCheck() {
      return getAdapter().healthCheck();
    }
  };
})(window);
