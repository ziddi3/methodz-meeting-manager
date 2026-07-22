/* Methodz Meeting Manager v1.6.3 hosted-provider reference adapters. */
(function initializeMethodzHostedAdapters(root, factory) {
  const contract = root?.MethodzHostedProviderContract || (typeof require === "function" ? require("./provider-contract.js") : null);
  const api = factory(contract);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzHostedProviderAdapters = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createHostedAdapters(Contract) {
  "use strict";

  if (!Contract) throw new Error("MethodzHostedProviderContract must load before hosted-provider-adapters.js.");
  const { ProviderError, errorCodes: Codes } = Contract;
  const emptyState = () => ({ activeRecords: [], archivedRecords: [], revisions: {}, idempotency: {} });

  function assertRecordId(recordId, operation, providerId) {
    if (typeof recordId !== "string" || !recordId) {
      throw new ProviderError(`${operation} requires a non-empty record id.`, {
        code: Codes.INVALID_ARGUMENT,
        retryable: false,
        operation,
        providerId
      });
    }
    return recordId;
  }

  class InMemoryHostedProvider {
    constructor(options = {}) {
      this.id = options.id || "in-memory-hosted-provider";
      this.label = options.label || "Disposable In-Memory Hosted Provider";
      this.contractVersion = Contract.version;
      this.state = Contract.assertProviderState(options.initialState || emptyState(), {
        operation: "initializeProvider",
        providerId: this.id
      });
      this.failures = new Map();
      this.capabilities = {
        asynchronous: true,
        offline: true,
        hostedReady: true,
        idempotency: true,
        conflictTokens: true,
        archiveVault: true,
        revisions: true,
        attachmentReferences: true,
        binaryAttachments: false,
        exportEnvelope: true,
        providerType: "in-memory"
      };
    }

    queueFailure(operation, error) {
      const queue = this.failures.get(operation) || [];
      queue.push(error);
      this.failures.set(operation, queue);
    }

    maybeFail(operation) {
      const queue = this.failures.get(operation);
      if (!queue?.length) return;
      const error = queue.shift();
      if (!queue.length) this.failures.delete(operation);
      if (error instanceof Error) throw error;
      throw new ProviderError(String(error), { operation, providerId: this.id });
    }

    async readState() {
      return Contract.assertProviderState(this.state, {
        operation: "readState",
        providerId: this.id
      });
    }

    async writeState(state) {
      this.state = Contract.assertProviderState(state, {
        operation: "writeState",
        providerId: this.id
      });
    }

    async transact(operation, callback) {
      this.maybeFail(operation);
      const state = await this.readState();
      const result = await callback(state);
      if (!result || typeof result !== "object" || !Object.hasOwn(result, "value")) {
        throw new ProviderError(`Provider transaction ${operation} returned an invalid result.`, {
          code: Codes.PROVIDER_FAILURE,
          retryable: false,
          operation,
          providerId: this.id
        });
      }
      if (result.write !== false) await this.writeState(state);
      return Contract.clone(result.value);
    }

    async listRecords(options = {}) {
      return this.transact("listRecords", async (state) => ({
        write: false,
        value: options.includeArchived ? [...state.activeRecords, ...state.archivedRecords] : state.activeRecords
      }));
    }

    async getRecord(recordId, options = {}) {
      assertRecordId(recordId, "getRecord", this.id);
      return this.transact("getRecord", async (state) => {
        const active = state.activeRecords.find((record) => record.id === recordId);
        const archived = options.includeArchived === false ? null : state.archivedRecords.find((record) => record.id === recordId);
        return {
          write: false,
          value: active || archived ? {
            record: active || archived,
            archived: Boolean(!active && archived),
            revisions: Contract.clone(state.revisions[recordId] || [])
          } : null
        };
      });
    }

    async upsertRecord(record, options = {}) {
      const input = Contract.assertRecord(record, "upsertRecord", this.id);
      const idempotencyKey = Contract.normalizeIdempotencyKey(options.idempotencyKey);
      return this.transact("upsertRecord", async (state) => {
        const requestHash = Contract.fnv1a32(Contract.canonicalStringify({
          input,
          expectedConflictToken: options.expectedConflictToken || null
        }));

        if (idempotencyKey && state.idempotency[idempotencyKey]) {
          const existing = state.idempotency[idempotencyKey];
          if (existing.requestHash !== requestHash) {
            throw new ProviderError("The idempotency key was reused with different input.", {
              code: Codes.IDEMPOTENCY_CONFLICT,
              retryable: false,
              operation: "upsertRecord",
              providerId: this.id,
              details: { idempotencyKey }
            });
          }
          return { write: false, value: { ...existing.response, idempotentReplay: true } };
        }

        if (state.archivedRecords.some((item) => item.id === input.id)) {
          throw new ProviderError("An archived record must be restored before it can be updated.", {
            code: Codes.CONFLICT,
            retryable: false,
            operation: "upsertRecord",
            providerId: this.id,
            details: { recordId: input.id, archived: true }
          });
        }

        const index = state.activeRecords.findIndex((item) => item.id === input.id);
        const previous = index >= 0 ? state.activeRecords[index] : null;
        const currentToken = previous?.providerMetadata?.conflictToken || null;
        if (previous && options.expectedConflictToken !== currentToken) {
          throw new ProviderError("The record changed after it was read.", {
            code: Codes.CONFLICT,
            retryable: false,
            operation: "upsertRecord",
            providerId: this.id,
            details: { recordId: input.id, currentConflictToken: currentToken }
          });
        }

        const version = previous ? Number(previous.providerMetadata?.version || 1) + 1 : 1;
        if (previous) state.revisions[input.id] = [...(state.revisions[input.id] || []), Contract.clone(previous)];
        const stored = Contract.decorateRecord({ ...(previous || {}), ...input }, version);
        if (index >= 0) state.activeRecords[index] = stored;
        else state.activeRecords.push(stored);

        const response = {
          record: stored,
          created: !previous,
          idempotentReplay: false,
          conflictToken: stored.providerMetadata.conflictToken,
          providerVersion: version
        };
        if (idempotencyKey) state.idempotency[idempotencyKey] = { requestHash, response: Contract.clone(response) };
        return { value: response };
      });
    }

    async archiveRecord(recordId, options = {}) {
      assertRecordId(recordId, "archiveRecord", this.id);
      return this.transact("archiveRecord", async (state) => {
        const index = state.activeRecords.findIndex((item) => item.id === recordId);
        if (index < 0) {
          throw new ProviderError("Active record not found.", {
            code: Codes.NOT_FOUND,
            retryable: false,
            operation: "archiveRecord",
            providerId: this.id,
            details: { recordId }
          });
        }
        if (state.archivedRecords.some((item) => item.id === recordId)) {
          throw new ProviderError("An archived copy with this record id already exists.", {
            code: Codes.INTEGRITY_REJECTED,
            retryable: false,
            operation: "archiveRecord",
            providerId: this.id,
            details: { recordId }
          });
        }
        const record = state.activeRecords[index];
        const currentToken = record.providerMetadata?.conflictToken || null;
        if (options.expectedConflictToken && options.expectedConflictToken !== currentToken) {
          throw new ProviderError("The record changed before it could be archived.", {
            code: Codes.CONFLICT,
            retryable: false,
            operation: "archiveRecord",
            providerId: this.id,
            details: { recordId, currentConflictToken: currentToken }
          });
        }
        state.activeRecords.splice(index, 1);
        const archived = Contract.clone(record);
        archived.providerMetadata = { ...(archived.providerMetadata || {}), archivedAt: new Date().toISOString() };
        state.archivedRecords.push(archived);
        return { value: { record: archived, archived: true } };
      });
    }

    async restoreRecord(recordId) {
      assertRecordId(recordId, "restoreRecord", this.id);
      return this.transact("restoreRecord", async (state) => {
        if (state.activeRecords.some((item) => item.id === recordId)) {
          throw new ProviderError("An active record with this id already exists.", {
            code: Codes.CONFLICT,
            retryable: false,
            operation: "restoreRecord",
            providerId: this.id
          });
        }
        const index = state.archivedRecords.findIndex((item) => item.id === recordId);
        if (index < 0) {
          throw new ProviderError("Archived record not found.", {
            code: Codes.NOT_FOUND,
            retryable: false,
            operation: "restoreRecord",
            providerId: this.id,
            details: { recordId }
          });
        }
        const record = Contract.clone(state.archivedRecords[index]);
        record.providerMetadata = { ...(record.providerMetadata || {}) };
        delete record.providerMetadata.archivedAt;
        record.providerMetadata.restoredAt = new Date().toISOString();
        const version = Number(record.providerMetadata.version || 1);
        record.providerMetadata.conflictToken = Contract.createConflictToken(record, version);
        state.archivedRecords.splice(index, 1);
        state.activeRecords.push(record);
        return { value: { record, restored: true, conflictToken: record.providerMetadata.conflictToken } };
      });
    }

    async deleteRecord(recordId, options = {}) {
      assertRecordId(recordId, "deleteRecord", this.id);
      if (options.permanent !== true) {
        throw new ProviderError("Permanent deletion requires { permanent: true }.", {
          code: Codes.INVALID_ARGUMENT,
          retryable: false,
          operation: "deleteRecord",
          providerId: this.id
        });
      }
      return this.transact("deleteRecord", async (state) => {
        const before = state.activeRecords.length + state.archivedRecords.length;
        state.activeRecords = state.activeRecords.filter((item) => item.id !== recordId);
        state.archivedRecords = state.archivedRecords.filter((item) => item.id !== recordId);
        delete state.revisions[recordId];
        return {
          value: {
            deleted: before !== state.activeRecords.length + state.archivedRecords.length,
            recordId
          }
        };
      });
    }

    async exportWorkspace(options = {}) {
      return this.transact("exportWorkspace", async (state) => ({
        write: false,
        value: Contract.createExportEnvelope({
          providerId: this.id,
          activeRecords: state.activeRecords,
          archivedRecords: state.archivedRecords,
          revisions: state.revisions,
          metadata: options.metadata || {}
        })
      }));
    }

    async healthCheck() {
      this.maybeFail("healthCheck");
      const state = await this.readState();
      return {
        ok: true,
        providerId: this.id,
        label: this.label,
        providerType: this.capabilities.providerType,
        contractVersion: Contract.version,
        records: state.activeRecords.length,
        archivedRecords: state.archivedRecords.length,
        revisionSets: Object.keys(state.revisions).length,
        capabilities: Contract.clone(this.capabilities),
        checkedAt: new Date().toISOString()
      };
    }
  }

  class LocalStorageHostedProvider extends InMemoryHostedProvider {
    constructor(options = {}) {
      super({
        id: options.id || "local-storage-hosted-provider",
        label: options.label || "Browser Local Storage (Hosted Contract)"
      });
      this.storage = options.storage || (typeof localStorage !== "undefined" ? localStorage : null);
      this.keys = {
        activeRecords: options.keys?.activeRecords || "methodzMeetingRecords",
        archivedRecords: options.keys?.archivedRecords || "methodzArchivedMeetingRecords",
        revisions: options.keys?.revisions || "methodzMeetingRevisions",
        idempotency: options.keys?.idempotency || "methodzProviderIdempotency"
      };
      this.capabilities.providerType = "local-storage";
      if (!this.storage) {
        throw new ProviderError("LocalStorageHostedProvider requires a Storage-compatible object.", {
          code: Codes.INVALID_ARGUMENT,
          retryable: false,
          providerId: this.id
        });
      }
    }

    readJson(key, fallback) {
      const raw = this.storage.getItem(key);
      if (!raw) return Contract.clone(fallback);
      try {
        return JSON.parse(raw);
      } catch (error) {
        throw new ProviderError(`Unable to parse provider storage key ${key}.`, {
          code: Codes.INTEGRITY_REJECTED,
          retryable: false,
          operation: "readState",
          providerId: this.id,
          details: { key, error: error.message }
        });
      }
    }

    async readState() {
      return Contract.assertProviderState({
        activeRecords: this.readJson(this.keys.activeRecords, []),
        archivedRecords: this.readJson(this.keys.archivedRecords, []),
        revisions: this.readJson(this.keys.revisions, {}),
        idempotency: this.readJson(this.keys.idempotency, {})
      }, {
        operation: "readState",
        providerId: this.id
      });
    }

    async writeState(state) {
      const validated = Contract.assertProviderState(state, {
        operation: "writeState",
        providerId: this.id
      });
      const writes = [
        [this.keys.activeRecords, validated.activeRecords],
        [this.keys.archivedRecords, validated.archivedRecords],
        [this.keys.revisions, validated.revisions],
        [this.keys.idempotency, validated.idempotency]
      ];
      let completed = 0;
      try {
        for (const [key, value] of writes) {
          this.storage.setItem(key, JSON.stringify(value));
          completed += 1;
        }
      } catch (error) {
        throw new ProviderError("Local provider state write was only partially completed.", {
          code: Codes.PARTIAL_FAILURE,
          retryable: true,
          operation: "writeState",
          providerId: this.id,
          details: { completed, failed: writes.length - completed, error: error.message }
        });
      }
    }

    async healthCheck() {
      this.maybeFail("healthCheck");
      const probeKey = `${this.keys.idempotency}:probe`;
      try {
        this.storage.setItem(probeKey, "ok");
        this.storage.removeItem(probeKey);
        const state = await this.readState();
        return {
          ok: true,
          providerId: this.id,
          label: this.label,
          providerType: "local-storage",
          contractVersion: Contract.version,
          records: state.activeRecords.length,
          archivedRecords: state.archivedRecords.length,
          revisionSets: Object.keys(state.revisions).length,
          capabilities: Contract.clone(this.capabilities),
          checkedAt: new Date().toISOString()
        };
      } catch (error) {
        return {
          ok: false,
          providerId: this.id,
          providerType: "local-storage",
          contractVersion: Contract.version,
          error: error instanceof ProviderError ? error.toJSON() : String(error),
          checkedAt: new Date().toISOString()
        };
      }
    }
  }

  function createDefaultLocalProvider(globalObject = typeof window !== "undefined" ? window : null) {
    const config = globalObject?.METHODZ_MEETING_CONFIG || {};
    const keys = config.storageKeys || {};
    return new LocalStorageHostedProvider({
      storage: globalObject?.localStorage,
      keys: {
        activeRecords: keys.records,
        archivedRecords: keys.archivedRecords,
        revisions: keys.revisions,
        idempotency: keys.providerIdempotency
      }
    });
  }

  return Object.freeze({
    InMemoryHostedProvider,
    LocalStorageHostedProvider,
    createDefaultLocalProvider
  });
});