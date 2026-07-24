/* Methodz Meeting Manager v1.6.5 portable offline synchronization rehearsal coordinator. */
(function initializeMethodzSyncRehearsal(root, factory) {
  const contract = root?.MethodzHostedProviderContract || (typeof require === "function" ? require("./provider-contract.js") : null);
  const api = factory(contract);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzSyncRehearsalV165 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSyncRehearsal(Contract) {
  "use strict";

  if (!Contract) throw new Error("MethodzHostedProviderContract must load before sync-rehearsal-core.js.");

  const VERSION = "1.0.0";
  const PACKAGE_TYPE = "methodz-sync-rehearsal-report";
  const QUEUE_STATES = Object.freeze({
    OFFLINE: "offline",
    PENDING: "pending",
    RETRYABLE_ERROR: "retryable-error",
    BLOCKED_CONFLICT: "blocked-conflict",
    COMPLETED: "completed"
  });
  const OPERATIONS = new Set(["push", "pull"]);
  const clone = Contract.clone;

  function positiveInteger(value, fallback) {
    return Number.isFinite(Number(value)) && Number(value) > 0 ? Math.floor(Number(value)) : fallback;
  }

  function nowIso(clock) {
    return new Date(typeof clock === "function" ? clock() : Date.now()).toISOString();
  }

  function assertTenantId(value) {
    if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(value)) {
      throw new Contract.ProviderError("Synchronization rehearsal tenant IDs must contain 1 to 100 safe characters.", {
        code: Contract.errorCodes.INVALID_ARGUMENT,
        retryable: false,
        operation: "syncRehearsal"
      });
    }
    return value;
  }

  function assertLocalRepository(repository) {
    const methods = ["getRecord", "upsertRecord"];
    if (!repository || methods.some((method) => typeof repository[method] !== "function")) {
      throw new Contract.ProviderError("A local rehearsal repository with getRecord() and upsertRecord() is required.", {
        code: Contract.errorCodes.INVALID_ARGUMENT,
        retryable: false,
        operation: "initializeSyncRehearsal"
      });
    }
    return repository;
  }

  function assertRemoteProvider(provider) {
    const validation = Contract.validateProvider(provider);
    if (!validation.ok) {
      throw new Contract.ProviderError(`The rehearsal provider is missing: ${validation.missing.join(", ")}.`, {
        code: Contract.errorCodes.INVALID_ARGUMENT,
        retryable: false,
        operation: "initializeSyncRehearsal",
        providerId: validation.providerId
      });
    }
    return provider;
  }

  function fingerprint(value) {
    return `sync:${Contract.fnv1a32(Contract.canonicalStringify(value))}`;
  }

  function safeRecordReference(recordId) {
    return `record:${Contract.fnv1a32(String(recordId || "unknown"))}`;
  }

  function makeIdentifier(prefix, seed) {
    return `${prefix}:${Contract.fnv1a32(`${seed}:${Date.now()}:${Math.random()}`)}`;
  }

  function normalizeError(error, operation, providerId) {
    const source = error instanceof Contract.ProviderError
      ? error
      : new Contract.ProviderError(error?.message || "Synchronization rehearsal failed.", {
        code: Contract.errorCodes.PROVIDER_FAILURE,
        retryable: false,
        operation,
        providerId
      });
    return {
      code: source.code || Contract.errorCodes.PROVIDER_FAILURE,
      message: String(source.message || "Synchronization rehearsal failed.").slice(0, 400),
      retryable: Boolean(source.retryable),
      operation: source.operation || operation,
      recordedAt: new Date().toISOString()
    };
  }

  function collectChangedPaths(base, candidate, path = "$", output = []) {
    if (Contract.canonicalStringify(base) === Contract.canonicalStringify(candidate)) return output;
    const baseObject = base && typeof base === "object";
    const candidateObject = candidate && typeof candidate === "object";
    if (!baseObject || !candidateObject || Array.isArray(base) !== Array.isArray(candidate)) {
      output.push(path);
      return output;
    }
    if (Array.isArray(base) && Array.isArray(candidate)) {
      const length = Math.max(base.length, candidate.length);
      for (let index = 0; index < length; index += 1) collectChangedPaths(base[index], candidate[index], `${path}[${index}]`, output);
      return output;
    }
    const keys = new Set([...Object.keys(base || {}), ...Object.keys(candidate || {})]);
    [...keys].sort().forEach((key) => collectChangedPaths(base?.[key], candidate?.[key], `${path}.${key}`, output));
    return output;
  }

  class StorageQueueStore {
    constructor(options = {}) {
      if (!options.storage || typeof options.storage.getItem !== "function" || typeof options.storage.setItem !== "function") {
        throw new Error("StorageQueueStore requires a Storage-compatible object.");
      }
      this.storage = options.storage;
      this.key = options.key || "methodzSyncRehearsalQueueV165";
      this.maximumEntries = positiveInteger(options.maximumEntries, 250);
    }

    read() {
      try {
        const parsed = JSON.parse(this.storage.getItem(this.key) || "[]");
        return Array.isArray(parsed) ? clone(parsed) : [];
      } catch (error) {
        return [];
      }
    }

    write(entries) {
      const bounded = clone(Array.isArray(entries) ? entries.slice(-this.maximumEntries) : []);
      this.storage.setItem(this.key, JSON.stringify(bounded));
      return clone(bounded);
    }

    clear() {
      this.storage.removeItem?.(this.key);
    }
  }

  class MemoryQueueStore {
    constructor(options = {}) {
      this.entries = clone(options.entries || []);
      this.maximumEntries = positiveInteger(options.maximumEntries, 250);
    }
    read() { return clone(this.entries); }
    write(entries) {
      this.entries = clone(Array.isArray(entries) ? entries.slice(-this.maximumEntries) : []);
      return this.read();
    }
    clear() { this.entries = []; }
  }

  class SyncRehearsalCoordinator {
    constructor(options = {}) {
      this.remoteProvider = assertRemoteProvider(options.remoteProvider);
      this.localRepository = assertLocalRepository(options.localRepository);
      this.queueStore = options.queueStore || new MemoryQueueStore();
      this.tenantId = assertTenantId(options.tenantId || "methodz-rehearsal");
      this.clock = options.clock;
      this.online = options.online !== false;
      this.listeners = new Set();
    }

    subscribe(listener) {
      if (typeof listener !== "function") return () => {};
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    emit() {
      const snapshot = this.listQueue();
      this.listeners.forEach((listener) => listener(snapshot));
    }

    listQueue() {
      return this.queueStore.read().sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    }

    getEntry(entryId) {
      return this.listQueue().find((entry) => entry.id === entryId) || null;
    }

    replaceEntry(entry) {
      const entries = this.listQueue();
      const index = entries.findIndex((candidate) => candidate.id === entry.id);
      if (index >= 0) entries[index] = clone(entry);
      else entries.push(clone(entry));
      this.queueStore.write(entries);
      this.emit();
      return clone(entry);
    }

    setOnline(online) {
      this.online = Boolean(online);
      const entries = this.listQueue().map((entry) => {
        if (!this.online && entry.state === QUEUE_STATES.PENDING) return { ...entry, state: QUEUE_STATES.OFFLINE, updatedAt: nowIso(this.clock) };
        if (this.online && entry.state === QUEUE_STATES.OFFLINE) return { ...entry, state: QUEUE_STATES.PENDING, updatedAt: nowIso(this.clock) };
        return entry;
      });
      this.queueStore.write(entries);
      this.emit();
      return this.online;
    }

    enqueuePush(record, options = {}) {
      const validated = Contract.assertRecord(record, "enqueuePush", this.remoteProvider.id);
      const createdAt = nowIso(this.clock);
      const entry = {
        id: options.entryId || makeIdentifier("syncq", `${this.tenantId}:push:${validated.id}`),
        version: VERSION,
        tenantId: this.tenantId,
        operation: "push",
        recordId: validated.id,
        recordRef: safeRecordReference(validated.id),
        sourceConflictToken: options.sourceConflictToken ?? validated.providerMetadata?.conflictToken ?? null,
        idempotencyKey: options.idempotencyKey || makeIdentifier("idem", `${this.tenantId}:${validated.id}`),
        contentFingerprint: fingerprint(validated),
        baseFingerprint: options.baseRecord ? fingerprint(options.baseRecord) : null,
        sourceSnapshot: clone(validated),
        baseSnapshot: clone(options.baseRecord || null),
        remoteSnapshot: null,
        state: this.online ? QUEUE_STATES.PENDING : QUEUE_STATES.OFFLINE,
        attempts: 0,
        createdAt,
        updatedAt: createdAt,
        lastError: null,
        resolution: null
      };
      return this.replaceEntry(entry);
    }

    async enqueuePull(recordId, options = {}) {
      if (typeof recordId !== "string" || !recordId) throw new Error("enqueuePull requires a record id.");
      if (!this.online) throw new Contract.ProviderError("The rehearsal is offline.", {
        code: Contract.errorCodes.UNAVAILABLE,
        retryable: true,
        operation: "enqueuePull",
        providerId: this.remoteProvider.id
      });
      const remoteResult = await this.remoteProvider.getRecord(recordId, { includeArchived: true });
      if (!remoteResult?.record) throw new Contract.ProviderError("Remote record not found.", {
        code: Contract.errorCodes.NOT_FOUND,
        retryable: false,
        operation: "enqueuePull",
        providerId: this.remoteProvider.id
      });
      const localRecord = await this.localRepository.getRecord(recordId);
      const createdAt = nowIso(this.clock);
      const entry = {
        id: options.entryId || makeIdentifier("syncq", `${this.tenantId}:pull:${recordId}`),
        version: VERSION,
        tenantId: this.tenantId,
        operation: "pull",
        recordId,
        recordRef: safeRecordReference(recordId),
        sourceConflictToken: remoteResult.record.providerMetadata?.conflictToken || null,
        idempotencyKey: options.idempotencyKey || makeIdentifier("idem", `${this.tenantId}:pull:${recordId}`),
        contentFingerprint: fingerprint(remoteResult.record),
        baseFingerprint: localRecord ? fingerprint(localRecord) : null,
        sourceSnapshot: clone(remoteResult.record),
        baseSnapshot: clone(localRecord || null),
        remoteSnapshot: clone(remoteResult.record),
        remoteArchived: Boolean(remoteResult.archived),
        state: QUEUE_STATES.PENDING,
        attempts: 0,
        createdAt,
        updatedAt: createdAt,
        lastError: null,
        resolution: null
      };
      return this.replaceEntry(entry);
    }

    async previewPull() {
      if (!this.online) return { online: false, candidates: [], active: 0, archived: 0 };
      const remoteRecords = await this.remoteProvider.listRecords({ includeArchived: true });
      const candidates = [];
      for (const remote of remoteRecords) {
        const local = await this.localRepository.getRecord(remote.id);
        const localFingerprint = local ? fingerprint(local) : null;
        const remoteFingerprint = fingerprint(remote);
        if (localFingerprint !== remoteFingerprint) {
          candidates.push({
            recordId: remote.id,
            recordRef: safeRecordReference(remote.id),
            remoteFingerprint,
            localFingerprint,
            localExists: Boolean(local),
            remoteArchived: Boolean(remote.providerMetadata?.archivedAt)
          });
        }
      }
      return {
        online: true,
        candidates,
        active: remoteRecords.filter((record) => !record.providerMetadata?.archivedAt).length,
        archived: remoteRecords.filter((record) => record.providerMetadata?.archivedAt).length
      };
    }

    previewEntry(entryId) {
      const entry = this.getEntry(entryId);
      if (!entry) return null;
      return {
        id: entry.id,
        operation: entry.operation,
        state: entry.state,
        tenantId: entry.tenantId,
        recordRef: entry.recordRef,
        sourceConflictTokenPresent: Boolean(entry.sourceConflictToken),
        idempotencyKey: entry.idempotencyKey,
        contentFingerprint: entry.contentFingerprint,
        attempts: entry.attempts,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        lastError: clone(entry.lastError),
        resolution: clone(entry.resolution)
      };
    }

    conflictPreview(entryId) {
      const entry = this.getEntry(entryId);
      if (!entry) return null;
      const base = entry.baseSnapshot;
      const local = entry.localSnapshot || entry.sourceSnapshot;
      const remote = entry.remoteSnapshot;
      return {
        recordRef: entry.recordRef,
        localChangedPaths: collectChangedPaths(base, local),
        remoteChangedPaths: collectChangedPaths(base, remote),
        overlappingPaths: collectChangedPaths(base, local).filter((path) => new Set(collectChangedPaths(base, remote)).has(path)),
        valuesIncluded: false
      };
    }

    async process(entryId) {
      const entry = this.getEntry(entryId);
      if (!entry) throw new Error("Queue entry not found.");
      if (!this.online) {
        return this.replaceEntry({ ...entry, state: QUEUE_STATES.OFFLINE, updatedAt: nowIso(this.clock) });
      }
      if (![QUEUE_STATES.PENDING, QUEUE_STATES.RETRYABLE_ERROR, QUEUE_STATES.OFFLINE].includes(entry.state)) return clone(entry);

      const working = { ...entry, attempts: Number(entry.attempts || 0) + 1, state: QUEUE_STATES.PENDING, updatedAt: nowIso(this.clock), lastError: null };
      this.replaceEntry(working);
      try {
        if (working.operation === "push") return await this.processPush(working);
        if (working.operation === "pull") return await this.processPull(working);
        throw new Error(`Unsupported synchronization operation: ${working.operation}`);
      } catch (error) {
        const normalized = normalizeError(error, working.operation, this.remoteProvider.id);
        const blocked = normalized.code === Contract.errorCodes.CONFLICT || normalized.code === Contract.errorCodes.IDEMPOTENCY_CONFLICT;
        return this.replaceEntry({
          ...working,
          state: blocked ? QUEUE_STATES.BLOCKED_CONFLICT : (normalized.retryable ? QUEUE_STATES.RETRYABLE_ERROR : QUEUE_STATES.BLOCKED_CONFLICT),
          lastError: normalized,
          updatedAt: nowIso(this.clock)
        });
      }
    }

    async processPush(entry) {
      const local = await this.localRepository.getRecord(entry.recordId);
      if (!local) throw new Contract.ProviderError("The local source record no longer exists.", {
        code: Contract.errorCodes.CONFLICT,
        retryable: false,
        operation: "push",
        providerId: this.remoteProvider.id
      });
      const localFingerprint = fingerprint(local);
      if (localFingerprint !== entry.contentFingerprint) {
        const remote = await this.remoteProvider.getRecord(entry.recordId, { includeArchived: true });
        return this.replaceEntry({
          ...entry,
          state: QUEUE_STATES.BLOCKED_CONFLICT,
          localSnapshot: clone(local),
          remoteSnapshot: clone(remote?.record || null),
          lastError: { code: "LOCAL_CHANGED_AFTER_ENQUEUE", message: "The local record changed after it was queued.", retryable: false, operation: "push", recordedAt: nowIso(this.clock) },
          updatedAt: nowIso(this.clock)
        });
      }
      const result = await this.remoteProvider.upsertRecord(local, {
        idempotencyKey: entry.idempotencyKey,
        expectedConflictToken: entry.sourceConflictToken
      });
      return this.replaceEntry({
        ...entry,
        state: QUEUE_STATES.COMPLETED,
        remoteSnapshot: clone(result.record),
        remoteConflictToken: result.conflictToken || result.record?.providerMetadata?.conflictToken || null,
        idempotentReplay: Boolean(result.idempotentReplay),
        completedAt: nowIso(this.clock),
        updatedAt: nowIso(this.clock),
        lastError: null
      });
    }

    async processPull(entry) {
      const remoteResult = await this.remoteProvider.getRecord(entry.recordId, { includeArchived: true });
      if (!remoteResult?.record) throw new Contract.ProviderError("The remote record is unavailable.", {
        code: Contract.errorCodes.NOT_FOUND,
        retryable: false,
        operation: "pull",
        providerId: this.remoteProvider.id
      });
      const local = await this.localRepository.getRecord(entry.recordId);
      const localFingerprint = local ? fingerprint(local) : null;
      if (entry.baseFingerprint !== localFingerprint) {
        return this.replaceEntry({
          ...entry,
          state: QUEUE_STATES.BLOCKED_CONFLICT,
          localSnapshot: clone(local || null),
          remoteSnapshot: clone(remoteResult.record),
          lastError: { code: "LOCAL_CHANGED_AFTER_ENQUEUE", message: "The local record changed after the pull was queued.", retryable: false, operation: "pull", recordedAt: nowIso(this.clock) },
          updatedAt: nowIso(this.clock)
        });
      }
      await this.localRepository.upsertRecord(clone(remoteResult.record), { source: "sync-rehearsal", archived: Boolean(remoteResult.archived) });
      return this.replaceEntry({
        ...entry,
        state: QUEUE_STATES.COMPLETED,
        remoteSnapshot: clone(remoteResult.record),
        completedAt: nowIso(this.clock),
        updatedAt: nowIso(this.clock),
        lastError: null
      });
    }

    retry(entryId) {
      const entry = this.getEntry(entryId);
      if (!entry || ![QUEUE_STATES.RETRYABLE_ERROR, QUEUE_STATES.OFFLINE].includes(entry.state)) return entry;
      return this.replaceEntry({ ...entry, state: this.online ? QUEUE_STATES.PENDING : QUEUE_STATES.OFFLINE, lastError: null, updatedAt: nowIso(this.clock) });
    }

    discard(entryId) {
      const entries = this.listQueue().filter((entry) => entry.id !== entryId);
      this.queueStore.write(entries);
      this.emit();
      return entries;
    }

    async resolveConflict(entryId, strategy) {
      const entry = this.getEntry(entryId);
      if (!entry || entry.state !== QUEUE_STATES.BLOCKED_CONFLICT) throw new Error("A blocked conflict entry is required.");
      if (strategy === "keep-local") {
        return this.replaceEntry({ ...entry, state: QUEUE_STATES.COMPLETED, resolution: { strategy, appliedAt: nowIso(this.clock), remoteWritePerformed: false }, completedAt: nowIso(this.clock), updatedAt: nowIso(this.clock) });
      }
      if (strategy === "accept-remote") {
        const remoteResult = await this.remoteProvider.getRecord(entry.recordId, { includeArchived: true });
        if (!remoteResult?.record) throw new Error("Remote record not found.");
        await this.localRepository.upsertRecord(clone(remoteResult.record), { source: "sync-rehearsal-conflict", archived: Boolean(remoteResult.archived) });
        return this.replaceEntry({ ...entry, state: QUEUE_STATES.COMPLETED, remoteSnapshot: clone(remoteResult.record), resolution: { strategy, appliedAt: nowIso(this.clock), localWritePerformed: true }, completedAt: nowIso(this.clock), updatedAt: nowIso(this.clock), lastError: null });
      }
      if (strategy === "rebase-and-push") {
        const local = await this.localRepository.getRecord(entry.recordId);
        const remoteResult = await this.remoteProvider.getRecord(entry.recordId, { includeArchived: true });
        if (!local) throw new Error("Local record not found.");
        return this.replaceEntry({
          ...entry,
          state: QUEUE_STATES.PENDING,
          sourceSnapshot: clone(local),
          localSnapshot: clone(local),
          remoteSnapshot: clone(remoteResult?.record || null),
          contentFingerprint: fingerprint(local),
          sourceConflictToken: remoteResult?.record?.providerMetadata?.conflictToken || null,
          idempotencyKey: makeIdentifier("idem", `${this.tenantId}:rebase:${entry.recordId}`),
          resolution: { strategy, preparedAt: nowIso(this.clock), explicitRemoteOverwritePending: true },
          lastError: null,
          updatedAt: nowIso(this.clock)
        });
      }
      throw new Error(`Unsupported conflict strategy: ${strategy}`);
    }

    createReport() {
      const generatedAt = nowIso(this.clock);
      const entries = this.listQueue().map((entry) => ({
        id: entry.id,
        tenantReference: `tenant:${Contract.fnv1a32(entry.tenantId)}`,
        operation: entry.operation,
        recordRef: entry.recordRef,
        state: entry.state,
        attempts: entry.attempts,
        contentFingerprint: entry.contentFingerprint,
        idempotencyReference: `idempotency:${Contract.fnv1a32(entry.idempotencyKey)}`,
        conflictTokenPresent: Boolean(entry.sourceConflictToken),
        errorCode: entry.lastError?.code || null,
        resolutionStrategy: entry.resolution?.strategy || null,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        completedAt: entry.completedAt || null
      }));
      const content = {
        packageType: PACKAGE_TYPE,
        packageVersion: VERSION,
        generatedAt,
        online: this.online,
        providerId: this.remoteProvider.id,
        entries
      };
      Contract.rejectDisallowedMaterial(content, { operation: "createSyncRehearsalReport", providerId: this.remoteProvider.id });
      return {
        ...content,
        integrity: {
          algorithm: "fnv1a32-canonical-json",
          value: Contract.fnv1a32(Contract.canonicalStringify(content))
        }
      };
    }
  }

  return Object.freeze({
    version: VERSION,
    packageType: PACKAGE_TYPE,
    queueStates: QUEUE_STATES,
    fingerprint,
    safeRecordReference,
    collectChangedPaths,
    StorageQueueStore,
    MemoryQueueStore,
    SyncRehearsalCoordinator
  });
});
