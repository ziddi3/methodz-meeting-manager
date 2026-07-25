/* Methodz Meeting Manager v1.6.6 synchronization queue portability and operator evidence core. */
(function exposeMethodzSyncQueuePortability(root, factory) {
  const contract = root?.MethodzHostedProviderContract || (typeof require === "function" ? require("./provider-contract.js") : null);
  const api = factory(contract);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzSyncQueuePortabilityV166 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createSyncQueuePortability(Contract) {
  "use strict";

  if (!Contract) throw new Error("MethodzHostedProviderContract must load before sync-queue-portability.js.");

  const VERSION = "1.0.0";
  const QUEUE_PACKAGE_TYPE = "methodz-sync-rehearsal-queue";
  const EVIDENCE_PACKAGE_TYPE = "methodz-sync-rehearsal-operator-evidence";
  const INTEGRITY_ALGORITHM = "fnv1a32-canonical-json";
  const OPERATIONS = new Set(["push", "pull"]);
  const QUEUE_STATES = new Set(["offline", "pending", "retryable-error", "blocked-conflict", "completed"]);
  const PROTECTED_STATES = new Set(["offline", "pending", "retryable-error", "blocked-conflict"]);
  const MERGE_STRATEGIES = new Set(["keep-local", "prefer-newest-metadata", "retain-both"]);
  const EVENT_TYPES = new Set([
    "enqueue",
    "process",
    "retry",
    "discard",
    "reconnect",
    "pull-preview",
    "conflict-decision",
    "queue-import",
    "queue-export",
    "compaction-review",
    "compaction-apply"
  ]);
  const EVIDENCE_EVENT_KEYS = new Set([
    "id",
    "eventType",
    "tenantReference",
    "entryReference",
    "operation",
    "state",
    "result",
    "errorCode",
    "strategy",
    "counts",
    "occurredAt"
  ]);
  const FORBIDDEN_EVIDENCE_KEYS = new Set([
    "title",
    "notes",
    "summary",
    "decisions",
    "attendees",
    "agenda",
    "tasks",
    "attachments",
    "signature",
    "signatures",
    "sourcesnapshot",
    "localsnapshot",
    "remotesnapshot",
    "recordid",
    "tenantid",
    "idempotencykey",
    "conflicttoken",
    "credential",
    "credentials",
    "password",
    "secret",
    "token",
    "privatekey",
    "privatejwk"
  ]);

  const clone = Contract.clone;

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function positiveInteger(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : fallback;
  }

  function nowIso(clock) {
    return new Date(typeof clock === "function" ? clock() : Date.now()).toISOString();
  }

  function assertTenantId(value) {
    if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(value)) {
      throw new Error("A synchronization rehearsal tenant ID with 1 to 100 safe characters is required.");
    }
    return value;
  }

  function validIso(value) {
    return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
  }

  function timestampValue(entry) {
    return new Date(entry.completedAt || entry.updatedAt || entry.createdAt).getTime();
  }

  function integrityFor(body) {
    return Contract.fnv1a32(Contract.canonicalStringify(body));
  }

  function tenantReference(tenantId) {
    return `tenant:${Contract.fnv1a32(assertTenantId(tenantId))}`;
  }

  function opaqueReference(prefix, value) {
    return value ? `${prefix}:${Contract.fnv1a32(String(value))}` : null;
  }

  function regeneratedQueueId(tenantId, originalId, index) {
    return `syncq-import:${Contract.fnv1a32(`${tenantId}:${originalId}:${index}`)}`;
  }

  function assertSafeMaterial(value, operation) {
    Contract.rejectDisallowedMaterial(value, {
      operation: operation || "syncQueuePortability",
      providerId: "methodz-sync-queue-portability"
    });
  }

  function normalizeQueueEntry(value, tenantId) {
    if (!isPlainObject(value)) throw new Error("Every queue entry must be an object.");
    assertSafeMaterial(value, "normalizeSyncQueueEntry");
    const entry = clone(value);
    if (typeof entry.id !== "string" || !entry.id || entry.id.length > 240) throw new Error("Every queue entry requires a bounded string ID.");
    if (entry.version !== VERSION) throw new Error(`Unsupported queue entry version: ${String(entry.version ?? "missing")}.`);
    if (entry.tenantId !== tenantId) throw new Error("Queue entry tenant isolation validation failed.");
    if (!OPERATIONS.has(entry.operation)) throw new Error(`Unsupported queue operation: ${String(entry.operation)}.`);
    if (!QUEUE_STATES.has(entry.state)) throw new Error(`Unsupported queue state: ${String(entry.state)}.`);
    if (typeof entry.recordId !== "string" || !entry.recordId) throw new Error("Queue entries require a record ID.");
    if (typeof entry.idempotencyKey !== "string" || !entry.idempotencyKey) throw new Error("Queue entries require an idempotency key.");
    if (!validIso(entry.createdAt) || !validIso(entry.updatedAt)) throw new Error("Queue entries require valid createdAt and updatedAt timestamps.");
    if (entry.completedAt != null && !validIso(entry.completedAt)) throw new Error("Queue entry completedAt must be a valid timestamp when present.");
    entry.attempts = Math.max(0, Number.isFinite(Number(entry.attempts)) ? Math.floor(Number(entry.attempts)) : 0);
    return entry;
  }

  function normalizeQueue(entries, tenantId, maximumEntries = 250) {
    const tenant = assertTenantId(tenantId);
    if (!Array.isArray(entries)) throw new Error("The synchronization queue must be an array.");
    const maximum = positiveInteger(maximumEntries, 250);
    if (entries.length > maximum) throw new Error(`The queue contains ${entries.length} entries; the limit is ${maximum}.`);
    const normalized = entries.map((entry) => normalizeQueueEntry(entry, tenant));
    const identifiers = new Set();
    normalized.forEach((entry) => {
      if (identifiers.has(entry.id)) throw new Error(`Duplicate queue entry ID detected: ${entry.id}.`);
      identifiers.add(entry.id);
    });
    return normalized;
  }

  function summarizeQueue(entries) {
    const states = {};
    const operations = {};
    let earliestAt = null;
    let latestAt = null;
    entries.forEach((entry) => {
      states[entry.state] = (states[entry.state] || 0) + 1;
      operations[entry.operation] = (operations[entry.operation] || 0) + 1;
      const createdAt = entry.createdAt || entry.updatedAt;
      const updatedAt = entry.updatedAt || entry.createdAt;
      if (!earliestAt || String(createdAt) < earliestAt) earliestAt = String(createdAt);
      if (!latestAt || String(updatedAt) > latestAt) latestAt = String(updatedAt);
    });
    return {
      entryCount: entries.length,
      states,
      operations,
      conflictCount: Number(states["blocked-conflict"] || 0),
      protectedCount: entries.filter((entry) => PROTECTED_STATES.has(entry.state)).length,
      earliestAt,
      latestAt
    };
  }

  function buildQueuePackage(options = {}) {
    const tenantId = assertTenantId(options.tenantId);
    const entries = normalizeQueue(options.entries || [], tenantId, options.maximumEntries);
    const body = {
      packageType: QUEUE_PACKAGE_TYPE,
      packageVersion: VERSION,
      appShellVersion: "1.6.6",
      generatedAt: options.generatedAt || nowIso(options.clock),
      tenantId,
      tenantReference: tenantReference(tenantId),
      providerId: String(options.providerId || "disposable-http-pilot"),
      summary: summarizeQueue(entries),
      entries
    };
    assertSafeMaterial(body, "buildSyncQueuePackage");
    return {
      ...body,
      integrity: {
        algorithm: INTEGRITY_ALGORITHM,
        value: integrityFor(body)
      }
    };
  }

  function inspectQueuePackage(payload, options = {}) {
    const errors = [];
    const warnings = [];
    let entries = [];
    let checksumVerified = false;
    let tenantId = "";

    if (!isPlainObject(payload)) {
      errors.push("The selected queue package is not a JSON object.");
      return finalize();
    }
    if (payload.packageType !== QUEUE_PACKAGE_TYPE) errors.push("This is not a Methodz synchronization rehearsal queue package.");
    if (payload.packageVersion !== VERSION) errors.push(`Unsupported queue package version: ${String(payload.packageVersion ?? "missing")}.`);
    if (!validIso(payload.generatedAt)) errors.push("The queue package requires a valid generatedAt timestamp.");

    try {
      tenantId = assertTenantId(payload.tenantId);
      if (options.expectedTenantId && tenantId !== options.expectedTenantId) errors.push("The queue package belongs to a different rehearsal tenant.");
      if (payload.tenantReference !== tenantReference(tenantId)) errors.push("The queue package tenant reference is inconsistent.");
    } catch (error) {
      errors.push(error.message);
    }

    try {
      assertSafeMaterial(payload, "inspectSyncQueuePackage");
    } catch (error) {
      errors.push(error.message);
    }

    if (!isPlainObject(payload.integrity)) {
      errors.push("The queue package is missing integrity metadata.");
    } else if (payload.integrity.algorithm !== INTEGRITY_ALGORITHM || typeof payload.integrity.value !== "string") {
      errors.push("The queue package integrity metadata is unsupported or malformed.");
    } else {
      const body = { ...payload };
      delete body.integrity;
      const actual = integrityFor(body);
      if (actual !== payload.integrity.value) errors.push("Queue package integrity validation failed. The file may be incomplete or modified.");
      else checksumVerified = true;
    }

    if (!Array.isArray(payload.entries)) {
      errors.push("The queue package does not contain an entries array.");
    } else if (tenantId) {
      try {
        entries = normalizeQueue(payload.entries, tenantId, options.maximumEntries);
      } catch (error) {
        errors.push(error.message);
      }
    }

    const summary = summarizeQueue(entries);
    if (isPlainObject(payload.summary)) {
      const declared = Contract.canonicalStringify(payload.summary);
      const actual = Contract.canonicalStringify(summary);
      if (declared !== actual) warnings.push("The declared queue summary does not match the verified entries.");
    } else {
      warnings.push("The queue package does not include a summary.");
    }

    return finalize(summary);

    function finalize(summary = summarizeQueue(entries)) {
      return {
        valid: errors.length === 0 && checksumVerified,
        checksumVerified,
        errors,
        warnings,
        tenantId,
        tenantReference: tenantId ? tenantReference(tenantId) : "",
        providerId: typeof payload?.providerId === "string" ? payload.providerId : "",
        generatedAt: typeof payload?.generatedAt === "string" ? payload.generatedAt : "",
        entries: clone(entries),
        summary
      };
    }
  }

  function assertQueuePackage(payload, options = {}) {
    const report = inspectQueuePackage(payload, options);
    if (report.valid) return report;
    const error = new Error(report.errors[0] || "Queue package validation failed.");
    error.name = "SyncQueuePackageValidationError";
    error.report = report;
    throw error;
  }

  function mergeQueues(localEntries, importedEntries, options = {}) {
    const tenantId = assertTenantId(options.tenantId);
    const strategy = String(options.strategy || "keep-local");
    if (!MERGE_STRATEGIES.has(strategy)) throw new Error(`Unsupported queue merge strategy: ${strategy}.`);
    const maximumEntries = positiveInteger(options.maximumEntries, 250);
    const local = normalizeQueue(localEntries || [], tenantId, maximumEntries);
    const imported = normalizeQueue(importedEntries || [], tenantId, maximumEntries);
    const output = local.map(clone);
    const positions = new Map(output.map((entry, index) => [entry.id, index]));
    const summary = { strategy, added: 0, retainedLocal: 0, replacedByNewer: 0, duplicated: 0 };

    imported.forEach((entry, importedIndex) => {
      const position = positions.get(entry.id);
      if (position == null) {
        positions.set(entry.id, output.length);
        output.push(clone(entry));
        summary.added += 1;
        return;
      }
      if (strategy === "keep-local") {
        summary.retainedLocal += 1;
        return;
      }
      if (strategy === "prefer-newest-metadata") {
        const localEntry = output[position];
        const importedNewer = new Date(entry.updatedAt).getTime() > new Date(localEntry.updatedAt).getTime();
        if (importedNewer) {
          output[position] = clone(entry);
          summary.replacedByNewer += 1;
        } else {
          summary.retainedLocal += 1;
        }
        return;
      }
      const duplicate = clone(entry);
      let attempt = importedIndex + 1;
      let candidate = regeneratedQueueId(tenantId, entry.id, attempt);
      while (positions.has(candidate)) {
        attempt += 1;
        candidate = regeneratedQueueId(tenantId, entry.id, attempt);
      }
      duplicate.importedFromId = entry.id;
      duplicate.id = candidate;
      duplicate.updatedAt = nowIso(options.clock);
      positions.set(candidate, output.length);
      output.push(duplicate);
      summary.duplicated += 1;
    });

    if (output.length > maximumEntries) {
      throw new Error(`The merged queue would contain ${output.length} entries; the limit is ${maximumEntries}. Compact completed work first or choose another strategy.`);
    }
    return { entries: output, summary: { ...summary, total: output.length } };
  }

  function planQueueCompaction(entries, options = {}) {
    const tenantId = assertTenantId(options.tenantId);
    const normalized = normalizeQueue(entries || [], tenantId, options.maximumEntries || 100000);
    const staleDays = positiveInteger(options.staleDays, 30);
    const staleBefore = options.staleBefore || new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString();
    const staleBeforeMs = new Date(staleBefore).getTime();
    if (!Number.isFinite(staleBeforeMs)) throw new Error("Queue compaction requires a valid stale-before timestamp.");
    const completed = normalized.filter((entry) => entry.state === "completed");
    const protectedEntries = normalized.filter((entry) => PROTECTED_STATES.has(entry.state));
    const staleCandidates = completed
      .filter((entry) => timestampValue(entry) < staleBeforeMs)
      .sort((a, b) => timestampValue(a) - timestampValue(b));
    const maximumRetained = positiveInteger(options.maximumRetained, normalized.length || 1);
    const overflow = Math.max(0, normalized.length - maximumRetained);
    const orderedCompleted = [...completed].sort((a, b) => timestampValue(a) - timestampValue(b));
    const candidateIds = [];
    [...staleCandidates, ...orderedCompleted.slice(0, overflow)].forEach((entry) => {
      if (!candidateIds.includes(entry.id)) candidateIds.push(entry.id);
    });
    return {
      generatedAt: nowIso(options.clock),
      staleBefore: new Date(staleBeforeMs).toISOString(),
      totalEntries: normalized.length,
      protectedEntries: protectedEntries.length,
      completedEntries: completed.length,
      candidateIds,
      candidates: candidateIds.map((id) => {
        const entry = normalized.find((item) => item.id === id);
        return {
          id,
          entryReference: opaqueReference("queue", id),
          operation: entry.operation,
          state: entry.state,
          completedAt: entry.completedAt || null,
          updatedAt: entry.updatedAt
        };
      })
    };
  }

  function applyQueueCompaction(entries, approvedIds, options = {}) {
    const tenantId = assertTenantId(options.tenantId);
    const normalized = normalizeQueue(entries || [], tenantId, options.maximumEntries || 100000);
    const approved = new Set(Array.isArray(approvedIds) ? approvedIds : []);
    normalized.forEach((entry) => {
      if (approved.has(entry.id) && PROTECTED_STATES.has(entry.state)) {
        throw new Error(`Protected queue work cannot be compacted: ${entry.id}.`);
      }
      if (approved.has(entry.id) && entry.state !== "completed") {
        throw new Error(`Only completed queue entries can be compacted: ${entry.id}.`);
      }
    });
    const remaining = normalized.filter((entry) => !approved.has(entry.id));
    return { entries: remaining, removed: normalized.length - remaining.length };
  }

  function createOperatorEvent(options = {}) {
    const eventType = String(options.eventType || "");
    if (!EVENT_TYPES.has(eventType)) throw new Error(`Unsupported operator event type: ${eventType}.`);
    const tenantId = assertTenantId(options.tenantId);
    const occurredAt = options.occurredAt || nowIso(options.clock);
    if (!validIso(occurredAt)) throw new Error("Operator events require a valid timestamp.");
    const event = {
      id: options.id || `syncevt:${Contract.fnv1a32(`${tenantId}:${eventType}:${occurredAt}:${Math.random()}`)}`,
      eventType,
      tenantReference: tenantReference(tenantId),
      entryReference: opaqueReference("queue", options.entryId),
      operation: OPERATIONS.has(options.operation) ? options.operation : null,
      state: QUEUE_STATES.has(options.state) ? options.state : null,
      result: typeof options.result === "string" ? options.result.slice(0, 80) : null,
      errorCode: typeof options.errorCode === "string" ? options.errorCode.slice(0, 80) : null,
      strategy: typeof options.strategy === "string" ? options.strategy.slice(0, 80) : null,
      counts: sanitizeCounts(options.counts),
      occurredAt
    };
    assertEvidenceEvent(event);
    return event;
  }

  function sanitizeCounts(value) {
    if (!isPlainObject(value)) return {};
    const output = {};
    Object.entries(value).forEach(([key, count]) => {
      if (!/^[a-zA-Z][a-zA-Z0-9_-]{0,39}$/.test(key)) return;
      const numeric = Number(count);
      if (Number.isFinite(numeric) && numeric >= 0) output[key] = Math.floor(numeric);
    });
    return output;
  }

  function assertEvidenceEvent(event) {
    if (!isPlainObject(event)) throw new Error("Operator evidence events must be objects.");
    Object.keys(event).forEach((key) => {
      if (!EVIDENCE_EVENT_KEYS.has(key)) throw new Error(`Operator evidence contains an unsupported field: ${key}.`);
      if (FORBIDDEN_EVIDENCE_KEYS.has(key.toLowerCase())) throw new Error(`Operator evidence contains a forbidden field: ${key}.`);
    });
    if (!EVENT_TYPES.has(event.eventType)) throw new Error("Operator evidence contains an unsupported event type.");
    if (typeof event.tenantReference !== "string" || !event.tenantReference.startsWith("tenant:")) throw new Error("Operator evidence requires an opaque tenant reference.");
    if (!validIso(event.occurredAt)) throw new Error("Operator evidence requires a valid timestamp.");
    scanEvidenceForForbiddenKeys(event);
    assertSafeMaterial(event, "assertSyncOperatorEvidence");
    return event;
  }

  function scanEvidenceForForbiddenKeys(value, path = "event") {
    if (Array.isArray(value)) {
      value.forEach((item, index) => scanEvidenceForForbiddenKeys(item, `${path}[${index}]`));
      return;
    }
    if (!isPlainObject(value)) return;
    Object.entries(value).forEach(([key, child]) => {
      if (FORBIDDEN_EVIDENCE_KEYS.has(key.toLowerCase())) throw new Error(`Metadata-only operator evidence rejected meeting or secret material at ${path}.${key}.`);
      scanEvidenceForForbiddenKeys(child, `${path}.${key}`);
    });
  }

  function appendOperatorEvent(events, event, options = {}) {
    const normalized = Array.isArray(events) ? events.map((item) => clone(assertEvidenceEvent(item))) : [];
    normalized.push(clone(assertEvidenceEvent(event)));
    return normalized.slice(-positiveInteger(options.maximumEvents, 300));
  }

  function buildOperatorEvidencePackage(options = {}) {
    const tenantId = assertTenantId(options.tenantId);
    const events = (Array.isArray(options.events) ? options.events : []).map((event) => clone(assertEvidenceEvent(event)));
    events.forEach((event) => {
      if (event.tenantReference !== tenantReference(tenantId)) throw new Error("Operator evidence tenant isolation validation failed.");
    });
    const body = {
      packageType: EVIDENCE_PACKAGE_TYPE,
      packageVersion: VERSION,
      appShellVersion: "1.6.6",
      generatedAt: options.generatedAt || nowIso(options.clock),
      tenantReference: tenantReference(tenantId),
      eventCount: events.length,
      events
    };
    scanEvidenceForForbiddenKeys(body);
    assertSafeMaterial(body, "buildSyncOperatorEvidencePackage");
    return {
      ...body,
      integrity: { algorithm: INTEGRITY_ALGORITHM, value: integrityFor(body) }
    };
  }

  function inspectOperatorEvidencePackage(payload) {
    const errors = [];
    let checksumVerified = false;
    let events = [];
    if (!isPlainObject(payload)) return { valid: false, checksumVerified, errors: ["The evidence package is not a JSON object."], events };
    if (payload.packageType !== EVIDENCE_PACKAGE_TYPE) errors.push("This is not a Methodz synchronization operator evidence package.");
    if (payload.packageVersion !== VERSION) errors.push(`Unsupported operator evidence package version: ${String(payload.packageVersion ?? "missing")}.`);
    if (!validIso(payload.generatedAt)) errors.push("The operator evidence package requires a valid generatedAt timestamp.");
    try {
      scanEvidenceForForbiddenKeys(payload);
      assertSafeMaterial(payload, "inspectSyncOperatorEvidencePackage");
      if (!Array.isArray(payload.events)) throw new Error("The operator evidence package does not contain an events array.");
      events = payload.events.map((event) => clone(assertEvidenceEvent(event)));
      events.forEach((event) => {
        if (event.tenantReference !== payload.tenantReference) throw new Error("Operator evidence tenant isolation validation failed.");
      });
      if (Number(payload.eventCount) !== events.length) errors.push("The operator evidence event count is inconsistent.");
    } catch (error) {
      errors.push(error.message);
    }
    if (!isPlainObject(payload.integrity) || payload.integrity.algorithm !== INTEGRITY_ALGORITHM || typeof payload.integrity.value !== "string") {
      errors.push("The operator evidence package integrity metadata is missing or malformed.");
    } else {
      const body = { ...payload };
      delete body.integrity;
      if (integrityFor(body) !== payload.integrity.value) errors.push("Operator evidence integrity validation failed.");
      else checksumVerified = true;
    }
    return { valid: errors.length === 0 && checksumVerified, checksumVerified, errors, events };
  }

  return Object.freeze({
    version: VERSION,
    queuePackageType: QUEUE_PACKAGE_TYPE,
    evidencePackageType: EVIDENCE_PACKAGE_TYPE,
    mergeStrategies: Object.freeze([...MERGE_STRATEGIES]),
    protectedStates: Object.freeze([...PROTECTED_STATES]),
    tenantReference,
    summarizeQueue,
    buildQueuePackage,
    inspectQueuePackage,
    assertQueuePackage,
    mergeQueues,
    planQueueCompaction,
    applyQueueCompaction,
    createOperatorEvent,
    appendOperatorEvent,
    buildOperatorEvidencePackage,
    inspectOperatorEvidencePackage
  });
});
