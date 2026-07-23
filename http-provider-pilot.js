/* Methodz Meeting Manager v1.6.4 disposable HTTP-style hosted-provider pilot. */
(function initializeMethodzHttpProviderPilot(root, factory) {
  const contract = root?.MethodzHostedProviderContract || (typeof require === "function" ? require("./provider-contract.js") : null);
  const adapters = root?.MethodzHostedProviderAdapters || (typeof require === "function" ? require("./hosted-provider-adapters.js") : null);
  const api = factory(contract, adapters);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzHttpProviderPilot = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createHttpProviderPilot(Contract, Adapters) {
  "use strict";

  if (!Contract || !Adapters) throw new Error("Methodz provider contract and adapters are required.");

  const { ProviderError, errorCodes: Codes } = Contract;
  const OPERATIONS = new Set([
    "listRecords",
    "getRecord",
    "upsertRecord",
    "archiveRecord",
    "restoreRecord",
    "deleteRecord",
    "exportWorkspace",
    "healthCheck"
  ]);
  const REDACTED_DIAGNOSTIC_KEYS = /(authorization|bearer|credential|password|secret|private|jwk|api.?key|access.?token|refresh.?token|conflict.?token|signature|payload|content|notes|summary|title|record)/i;
  const EMPTY_STATE = () => ({ activeRecords: [], archivedRecords: [], revisions: {}, idempotency: {} });

  const clone = (value) => Contract.clone(value);
  const roundTrip = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, Math.max(0, Number(milliseconds) || 0)));

  function assertTenantId(value) {
    if (typeof value !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,99}$/.test(value)) {
      throw new ProviderError("The pilot transport requires a tenant id containing 1 to 100 safe characters.", {
        code: Codes.INVALID_ARGUMENT,
        retryable: false,
        operation: "transport"
      });
    }
    return value;
  }

  function sanitizeDiagnosticValue(value, key = "") {
    if (REDACTED_DIAGNOSTIC_KEYS.test(key)) return "[redacted]";
    if (Array.isArray(value)) return value.map((item) => sanitizeDiagnosticValue(item));
    if (!value || typeof value !== "object") {
      if (typeof value === "string" && value.length > 240) return `${value.slice(0, 237)}...`;
      return value;
    }
    return Object.fromEntries(Object.entries(value).map(([nestedKey, nestedValue]) => [
      nestedKey,
      sanitizeDiagnosticValue(nestedValue, nestedKey)
    ]));
  }

  function safeTenantReference(tenantId) {
    return `tenant:${Contract.fnv1a32(String(tenantId))}`;
  }

  function serializeError(error, fallback = {}) {
    const source = error instanceof ProviderError ? error : new ProviderError(error?.message || "Provider request failed.", {
      code: Codes.PROVIDER_FAILURE,
      retryable: false,
      operation: fallback.operation || null,
      providerId: fallback.providerId || null
    });
    return {
      name: "ProviderError",
      message: String(source.message || "Provider request failed."),
      code: source.code || Codes.PROVIDER_FAILURE,
      retryable: Boolean(source.retryable),
      operation: source.operation || fallback.operation || null,
      providerId: source.providerId || fallback.providerId || null,
      details: sanitizeDiagnosticValue(source.details || null)
    };
  }

  function deserializeError(serialized, fallback = {}) {
    return new ProviderError(serialized?.message || "Provider request failed.", {
      code: serialized?.code || Codes.PROVIDER_FAILURE,
      retryable: Boolean(serialized?.retryable),
      operation: serialized?.operation || fallback.operation || null,
      providerId: serialized?.providerId || fallback.providerId || null,
      details: sanitizeDiagnosticValue(serialized?.details || null)
    });
  }

  class HttpProviderSimulator {
    constructor(options = {}) {
      this.id = options.id || "methodz-http-provider-simulator";
      this.contractVersion = Contract.version;
      this.providers = new Map();
      this.tenantSeeds = new Map();
      this.faults = new Map();
      this.diagnostics = [];
      this.maximumDiagnostics = Number.isFinite(options.maximumDiagnostics) && options.maximumDiagnostics > 0
        ? Math.floor(options.maximumDiagnostics)
        : 250;
      this.providerFactory = options.providerFactory || ((providerOptions) => new Adapters.InMemoryHostedProvider(providerOptions));
      if (options.tenantId) this.tenantSeeds.set(assertTenantId(options.tenantId), clone(options.initialState || EMPTY_STATE()));
    }

    seedTenant(tenantId, initialState = EMPTY_STATE()) {
      const normalized = assertTenantId(tenantId);
      if (this.providers.has(normalized)) throw new ProviderError("A started tenant cannot be reseeded.", {
        code: Codes.CONFLICT,
        retryable: false,
        operation: "seedTenant",
        providerId: this.id
      });
      this.tenantSeeds.set(normalized, Contract.assertProviderState(initialState, {
        operation: "seedTenant",
        providerId: this.id
      }));
    }

    providerFor(tenantId) {
      const normalized = assertTenantId(tenantId);
      if (!this.providers.has(normalized)) {
        const seed = this.tenantSeeds.get(normalized) || EMPTY_STATE();
        this.providers.set(normalized, this.providerFactory({
          id: `${this.id}:${safeTenantReference(normalized)}`,
          label: "Disposable HTTP Pilot Tenant",
          initialState: clone(seed)
        }));
      }
      return this.providers.get(normalized);
    }

    queueFault(operation, fault = {}) {
      if (!OPERATIONS.has(operation)) throw new ProviderError(`Unknown pilot operation: ${operation}`, {
        code: Codes.INVALID_ARGUMENT,
        retryable: false,
        operation: "queueFault",
        providerId: this.id
      });
      const queue = this.faults.get(operation) || [];
      queue.push({ phase: "before", kind: "unavailable", ...clone(fault) });
      this.faults.set(operation, queue);
    }

    nextFault(operation) {
      const queue = this.faults.get(operation);
      if (!queue?.length) return null;
      const fault = queue.shift();
      if (!queue.length) this.faults.delete(operation);
      return fault;
    }

    async applyFault(fault, operation) {
      if (!fault) return;
      if (fault.delayMs) await sleep(fault.delayMs);
      if (fault.kind === "delay") return;
      if (fault.kind === "providerError") {
        if (fault.error instanceof ProviderError) throw fault.error;
        throw deserializeError(fault.error, { operation, providerId: this.id });
      }
      if (fault.kind === "rateLimit") {
        throw new ProviderError("The disposable provider is rate limited.", {
          code: Codes.RATE_LIMITED,
          retryable: true,
          operation,
          providerId: this.id,
          details: { retryAfterMs: Number(fault.retryAfterMs) || 1 }
        });
      }
      if (fault.kind === "partialSuccess") {
        throw new ProviderError("The provider committed the operation but the response was interrupted.", {
          code: Codes.PARTIAL_FAILURE,
          retryable: true,
          operation,
          providerId: this.id,
          details: { completed: 1, failed: 0, responseLost: true }
        });
      }
      throw new ProviderError("The disposable provider is temporarily unavailable.", {
        code: Codes.UNAVAILABLE,
        retryable: true,
        operation,
        providerId: this.id,
        details: { responseLost: fault.kind === "dropResponse" }
      });
    }

    async dispatch(provider, operation, body) {
      switch (operation) {
        case "listRecords": return provider.listRecords(body.options || {});
        case "getRecord": return provider.getRecord(body.recordId, body.options || {});
        case "upsertRecord": return provider.upsertRecord(body.record, body.options || {});
        case "archiveRecord": return provider.archiveRecord(body.recordId, body.options || {});
        case "restoreRecord": return provider.restoreRecord(body.recordId, body.options || {});
        case "deleteRecord": return provider.deleteRecord(body.recordId, body.options || {});
        case "exportWorkspace": return provider.exportWorkspace(body.options || {});
        case "healthCheck": return provider.healthCheck();
        default:
          throw new ProviderError(`Unsupported pilot operation: ${operation}`, {
            code: Codes.INVALID_ARGUMENT,
            retryable: false,
            operation,
            providerId: this.id
          });
      }
    }

    appendDiagnostic(entry) {
      this.diagnostics.push(sanitizeDiagnosticValue(entry));
      if (this.diagnostics.length > this.maximumDiagnostics) {
        this.diagnostics.splice(0, this.diagnostics.length - this.maximumDiagnostics);
      }
    }

    getDiagnostics() {
      return clone(this.diagnostics);
    }

    clearDiagnostics() {
      this.diagnostics.length = 0;
    }

    async handle(rawRequest) {
      const startedAt = Date.now();
      let operation = "transport";
      let tenantId = "invalid";
      let requestId = null;
      let status = "error";
      let errorCode = null;
      try {
        const request = roundTrip(rawRequest);
        operation = request?.operation;
        tenantId = assertTenantId(request?.tenantId);
        requestId = typeof request?.requestId === "string" ? request.requestId : null;
        if (!requestId || !OPERATIONS.has(operation)) {
          throw new ProviderError("Malformed pilot transport request.", {
            code: Codes.INVALID_ARGUMENT,
            retryable: false,
            operation,
            providerId: this.id
          });
        }

        const fault = this.nextFault(operation);
        if (fault?.phase !== "after") await this.applyFault(fault, operation);
        const provider = this.providerFor(tenantId);
        const result = await this.dispatch(provider, operation, request.body || {});
        if (fault?.phase === "after") await this.applyFault(fault, operation);
        status = "ok";
        return roundTrip({ ok: true, requestId, result });
      } catch (error) {
        const serialized = serializeError(error, { operation, providerId: this.id });
        errorCode = serialized.code;
        return roundTrip({ ok: false, requestId, error: serialized });
      } finally {
        this.appendDiagnostic({
          requestId,
          operation,
          tenant: safeTenantReference(tenantId),
          status,
          errorCode,
          durationMs: Math.max(0, Date.now() - startedAt),
          recordedAt: new Date().toISOString()
        });
      }
    }
  }

  class HttpHostedProviderClient {
    constructor(options = {}) {
      if (!options.simulator || typeof options.simulator.handle !== "function") {
        throw new ProviderError("HttpHostedProviderClient requires a simulator transport.", {
          code: Codes.INVALID_ARGUMENT,
          retryable: false,
          operation: "initializeClient"
        });
      }
      this.simulator = options.simulator;
      this.tenantId = assertTenantId(options.tenantId || "default");
      this.id = options.id || `http-pilot-client:${safeTenantReference(this.tenantId)}`;
      this.label = options.label || "Disposable HTTP-style Hosted Provider Client";
      this.contractVersion = Contract.version;
      this.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? Math.floor(options.timeoutMs) : 500;
      this.maxRetries = Number.isFinite(options.maxRetries) && options.maxRetries >= 0 ? Math.floor(options.maxRetries) : 2;
      this.retryDelay = typeof options.retryDelay === "function" ? options.retryDelay : async (milliseconds) => sleep(Math.min(50, milliseconds));
      this.requestCounter = 0;
      this.capabilities = {
        asynchronous: true,
        offline: false,
        hostedReady: true,
        idempotency: true,
        conflictTokens: true,
        archiveVault: true,
        revisions: true,
        attachmentReferences: true,
        binaryAttachments: false,
        exportEnvelope: true,
        serializedTransport: true,
        providerType: "http-pilot"
      };
    }

    queueFault(operation, fault) {
      this.simulator.queueFault(operation, fault);
    }

    queueFailure(operation, error) {
      this.queueFault(operation, { kind: "providerError", phase: "before", error });
    }

    nextRequestId(operation) {
      this.requestCounter += 1;
      return `pilot:${Contract.fnv1a32(`${this.id}:${operation}:${this.requestCounter}`)}`;
    }

    async requestOnce(operation, body, attempt) {
      const requestId = this.nextRequestId(operation);
      const request = roundTrip({
        protocol: "methodz-provider-pilot/1.0",
        requestId,
        tenantId: this.tenantId,
        operation,
        attempt,
        body: roundTrip(body || {})
      });
      const timeoutError = new ProviderError(`Pilot request timed out after ${this.timeoutMs} ms.`, {
        code: Codes.UNAVAILABLE,
        retryable: true,
        operation,
        providerId: this.id,
        details: { reason: "timeout", timeoutMs: this.timeoutMs }
      });
      let timer;
      try {
        const response = await Promise.race([
          this.simulator.handle(request),
          new Promise((resolve, reject) => {
            timer = setTimeout(() => reject(timeoutError), this.timeoutMs);
          })
        ]);
        if (!response?.ok) throw deserializeError(response?.error, { operation, providerId: this.id });
        return roundTrip(response.result);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    async request(operation, body = {}) {
      let attempt = 0;
      while (true) {
        try {
          return await this.requestOnce(operation, body, attempt);
        } catch (error) {
          const normalized = error instanceof ProviderError ? error : deserializeError(serializeError(error), {
            operation,
            providerId: this.id
          });
          if (!normalized.retryable || attempt >= this.maxRetries) throw normalized;
          attempt += 1;
          const retryAfterMs = Number(normalized.details?.retryAfterMs) || Math.min(50, 2 ** attempt);
          await this.retryDelay(retryAfterMs, { attempt, operation, error: normalized });
        }
      }
    }

    listRecords(options = {}) { return this.request("listRecords", { options }); }
    getRecord(recordId, options = {}) { return this.request("getRecord", { recordId, options }); }
    upsertRecord(record, options = {}) { return this.request("upsertRecord", { record, options }); }
    archiveRecord(recordId, options = {}) { return this.request("archiveRecord", { recordId, options }); }
    restoreRecord(recordId, options = {}) { return this.request("restoreRecord", { recordId, options }); }
    deleteRecord(recordId, options = {}) { return this.request("deleteRecord", { recordId, options }); }
    exportWorkspace(options = {}) { return this.request("exportWorkspace", { options }); }

    async healthCheck() {
      const health = await this.request("healthCheck");
      return {
        ...health,
        providerId: this.id,
        label: this.label,
        providerType: this.capabilities.providerType,
        contractVersion: this.contractVersion,
        transportProviderId: health?.providerId || null,
        capabilities: clone(this.capabilities)
      };
    }
  }

  function createPilotProvider(options = {}) {
    const tenantId = options.tenantId || `pilot-${options.suffix || "main"}`;
    const simulator = options.simulator || new HttpProviderSimulator({
      id: options.simulatorId || `http-provider-simulator-${options.suffix || "main"}`,
      tenantId,
      initialState: options.initialState || EMPTY_STATE()
    });
    if (options.simulator && options.initialState) simulator.seedTenant(tenantId, options.initialState);
    const client = new HttpHostedProviderClient({
      simulator,
      tenantId,
      id: options.id || `http-provider-client-${options.suffix || "main"}`,
      timeoutMs: options.timeoutMs,
      maxRetries: options.maxRetries,
      retryDelay: options.retryDelay
    });
    client.pilotSimulator = simulator;
    return client;
  }

  return Object.freeze({
    version: "1.0.0",
    HttpProviderSimulator,
    HttpHostedProviderClient,
    createPilotProvider,
    sanitizeDiagnosticValue,
    serializeError,
    deserializeError
  });
});
