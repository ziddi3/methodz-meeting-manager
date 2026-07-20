/* Methodz Meeting Manager v1.6.2 hosted-provider conformance contract. */
(function initializeMethodzHostedProviderContractV162(global) {
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
  const OPTIONAL_METHODS = [
    "createExportEnvelope",
    "listArchivedRecords",
    "upsertArchivedRecord",
    "appendAuditEvent",
    "appendReleaseReceipt",
    "appendRecoveryEvidence",
    "listPublicKeys",
    "upsertPublicKey",
    "revokePublicKey"
  ];
  const REQUIRED_CAPABILITIES = {
    asynchronous: true,
    remoteSync: true,
    authentication: true,
    serverEnforcedPermissions: true,
    conflictTokens: true,
    durableAudit: true,
    appendOnlyReceipts: true,
    retentionEnforcement: true,
    preservationEnforcement: true,
    exportApprovalEnforcement: true,
    publicKeyAdministration: true,
    durableRecoveryEvidence: true
  };
  const SECURITY_NOTICE = "Passing this structural conformance check does not prove provider security, legal compliance, availability, identity assurance, authorization correctness, or operational readiness.";

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));

  function descriptorFromAdapter(adapter) {
    if (!adapter || typeof adapter !== "object") return null;
    return {
      id: String(adapter.id || "").trim(),
      label: String(adapter.label || adapter.id || "").trim(),
      contractVersion: String(adapter.contractVersion || "").trim(),
      methods: [...new Set([...REQUIRED_METHODS, ...OPTIONAL_METHODS].filter((name) => typeof adapter[name] === "function"))],
      capabilities: clone(adapter.capabilities || {})
    };
  }

  function validateDescriptor(input) {
    const descriptor = input && typeof input === "object" && !Array.isArray(input) ? clone(input) : {};
    const methods = new Set(Array.isArray(descriptor.methods) ? descriptor.methods.map(String) : []);
    const capabilities = descriptor.capabilities && typeof descriptor.capabilities === "object" ? descriptor.capabilities : {};
    const errors = [];
    const warnings = [];

    if (!String(descriptor.id || "").trim()) errors.push("Provider descriptor is missing an ID.");
    if (!String(descriptor.label || "").trim()) warnings.push("Provider descriptor has no human-readable label.");
    REQUIRED_METHODS.filter((method) => !methods.has(method)).forEach((method) => errors.push(`Missing required provider method: ${method}().`));
    Object.entries(REQUIRED_CAPABILITIES).forEach(([name, expected]) => {
      if (capabilities[name] !== expected) errors.push(`Capability ${name} must be ${expected}.`);
    });
    OPTIONAL_METHODS.filter((method) => !methods.has(method)).forEach((method) => warnings.push(`Recommended provider method is absent: ${method}().`));

    return {
      ok: errors.length === 0,
      contractVersion: CONTRACT_VERSION,
      providerId: String(descriptor.id || ""),
      errors,
      warnings,
      checkedAt: new Date().toISOString(),
      notice: SECURITY_NOTICE
    };
  }

  function createContractPackage() {
    return {
      packageType: "methodz-hosted-provider-conformance-contract",
      packageVersion: 1,
      contractVersion: CONTRACT_VERSION,
      requiredMethods: [...REQUIRED_METHODS],
      optionalMethods: [...OPTIONAL_METHODS],
      requiredCapabilities: clone(REQUIRED_CAPABILITIES),
      invariants: [
        "A provider must never receive or persist private signing JWK material.",
        "Authentication and authorization must be enforced by the hosted provider, not only by browser UI state.",
        "Retention, preservation holds, external-release approval, and disposition approval must be enforced before mutation.",
        "Release receipts, audit events, recovery evidence, and key revocation records must be durable and append-only or equivalently tamper-evident.",
        "Concurrent writes must use conflict tokens, versions, transactions, or an equivalent lost-update control.",
        "Data export and deletion must remain explicit, reviewable operations.",
        "Provider failures must not silently discard browser-local records or queued work.",
        "Every remote mutation must return an authoritative timestamp and durable record version."
      ],
      minimumTestScenarios: [
        "unauthenticated access rejected",
        "cross-organization access rejected",
        "stale conflict token rejected",
        "preservation-held deletion rejected",
        "unapproved external release rejected",
        "private JWK payload rejected",
        "append-only event mutation rejected",
        "network retry is idempotent",
        "export and restore preserve supported record fields",
        "provider outage leaves local workflow recoverable"
      ],
      notice: SECURITY_NOTICE
    };
  }

  function inspectAdapter(adapter) {
    const descriptor = descriptorFromAdapter(adapter);
    if (!descriptor) {
      return {
        ok: false,
        contractVersion: CONTRACT_VERSION,
        providerId: "",
        errors: ["Provider adapter object is unavailable."],
        warnings: [],
        checkedAt: new Date().toISOString(),
        notice: SECURITY_NOTICE
      };
    }
    return { descriptor, ...validateDescriptor(descriptor) };
  }

  global.MethodzHostedProviderContractV162 = {
    version: "1.6.2",
    contractVersion: CONTRACT_VERSION,
    requiredMethods: [...REQUIRED_METHODS],
    optionalMethods: [...OPTIONAL_METHODS],
    requiredCapabilities: clone(REQUIRED_CAPABILITIES),
    securityNotice: SECURITY_NOTICE,
    descriptorFromAdapter,
    validateDescriptor,
    createContractPackage,
    inspectAdapter
  };
})(typeof window !== "undefined" ? window : globalThis);
