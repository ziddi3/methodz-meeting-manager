/* Methodz Meeting Manager v1.6.2 portable public-key custody core. */
(function initializeMethodzKeyCustodyCoreV162(global) {
  "use strict";

  const PROTOCOL_VERSION = "1.0.0";
  const MANIFEST_TYPE = "methodz-public-key-custody-manifest";
  const TRUST_NOTICE = "This manifest records browser-local public-key custody workflow metadata. It does not authenticate a person, role, organization, authority, approval, delivery, or legal status.";
  const PRIVATE_CONTAINER_KEYS = new Set(["privatekey", "privatekeyjwk", "privatejwk", "secretkey", "secretjwk"]);

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const text = (value) => String(value == null ? "" : value).trim();

  function containsPrivateKeyMaterial(value, seen = new WeakSet()) {
    if (!value || typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);

    if (!Array.isArray(value) && value.kty === "EC" && value.crv === "P-256" && text(value.d)) {
      return true;
    }

    return Object.entries(value).some(([key, child]) => {
      if (PRIVATE_CONTAINER_KEYS.has(String(key).toLowerCase()) && child && typeof child === "object") return true;
      return containsPrivateKeyMaterial(child, seen);
    });
  }

  function normalizePublicJwk(jwk) {
    if (!jwk || jwk.kty !== "EC" || jwk.crv !== "P-256" || !text(jwk.x) || !text(jwk.y)) {
      throw new Error("A custody entry must contain a valid P-256 public JWK.");
    }
    if (text(jwk.d)) throw new Error("Private JWK material is prohibited in custody metadata.");
    return {
      kty: "EC",
      crv: "P-256",
      x: text(jwk.x),
      y: text(jwk.y),
      ext: true,
      key_ops: ["verify"]
    };
  }

  function sanitizeEntry(entry) {
    if (!entry || typeof entry !== "object") throw new Error("Public-key registry entry is invalid.");
    const publicKeyJwk = normalizePublicJwk(entry.publicKeyJwk || entry.publicJwk || entry.key);
    const id = text(entry.id || entry.keyId);
    if (!id) throw new Error("Public-key registry entry is missing its key ID.");

    const sanitized = {
      id,
      keyLabel: text(entry.keyLabel),
      signerLabel: text(entry.signerLabel),
      status: text(entry.status) || "Active",
      publicKeyJwk,
      source: text(entry.source),
      createdAt: text(entry.createdAt),
      updatedAt: text(entry.updatedAt),
      activatedAt: text(entry.activatedAt),
      revokedAt: text(entry.revokedAt),
      revocationReason: text(entry.revocationReason),
      replaces: text(entry.replaces),
      replacedBy: text(entry.replacedBy),
      rotationCeremonyId: text(entry.rotationCeremonyId),
      custodyEvidenceReference: text(entry.custodyEvidenceReference)
    };

    if (containsPrivateKeyMaterial(sanitized)) throw new Error("Sanitized custody entry still contains private material.");
    return sanitized;
  }

  function sanitizeEvent(event) {
    if (!event || typeof event !== "object") throw new Error("Custody event is invalid.");
    const sanitized = {
      id: text(event.id),
      type: text(event.type),
      protocolVersion: text(event.protocolVersion) || PROTOCOL_VERSION,
      occurredAt: text(event.occurredAt),
      operatorLabel: text(event.operatorLabel),
      predecessorKeyId: text(event.predecessorKeyId),
      successorKeyId: text(event.successorKeyId),
      affectedKeyId: text(event.affectedKeyId),
      reason: text(event.reason),
      independentConfirmationChannel: text(event.independentConfirmationChannel),
      evidenceReference: text(event.evidenceReference),
      incidentReference: text(event.incidentReference),
      notice: text(event.notice) || TRUST_NOTICE
    };
    if (containsPrivateKeyMaterial(sanitized)) throw new Error("Custody event contains private material.");
    return sanitized;
  }

  function ceremonyId(prefix, occurredAt, keyId) {
    const compactTime = text(occurredAt).replace(/[^0-9]/g, "").slice(0, 17) || String(Date.now());
    const compactKey = text(keyId).replace(/[^a-z0-9]/gi, "").slice(-12) || "unknown";
    return `${prefix}-${compactTime}-${compactKey}`;
  }

  function validateRotation(entries, request) {
    const errors = [];
    const registry = Array.isArray(entries) ? entries.map(sanitizeEntry) : [];
    const predecessorKeyId = text(request?.predecessorKeyId);
    const successorKeyId = text(request?.successorKeyId);
    const predecessor = registry.find((entry) => entry.id === predecessorKeyId);
    const successor = registry.find((entry) => entry.id === successorKeyId);

    if (!predecessorKeyId) errors.push("Select the predecessor key.");
    if (!successorKeyId) errors.push("Select the successor key.");
    if (predecessorKeyId && successorKeyId && predecessorKeyId === successorKeyId) errors.push("Predecessor and successor keys must be different.");
    if (predecessorKeyId && !predecessor) errors.push("The predecessor key is not in the public registry.");
    if (successorKeyId && !successor) errors.push("The successor key is not in the public registry.");
    if (predecessor && predecessor.status === "Revoked") errors.push("The predecessor key is already revoked.");
    if (successor && successor.status === "Revoked") errors.push("A revoked key cannot become the successor.");
    if (!text(request?.operatorLabel)) errors.push("Enter the operator or accountable role label.");
    if (!text(request?.reason)) errors.push("Enter the rotation reason.");
    if (!text(request?.independentConfirmationChannel)) errors.push("Record the independent fingerprint-confirmation channel.");
    if (!text(request?.evidenceReference)) errors.push("Record a custody evidence reference.");
    if (request?.confirmed !== true) errors.push("Confirm that the successor fingerprint was checked independently.");

    return { ok: errors.length === 0, errors, registry, predecessor, successor };
  }

  function applyRotation(entries, request, occurredAt = new Date().toISOString()) {
    const validation = validateRotation(entries, request);
    if (!validation.ok) throw new Error(validation.errors.join(" "));

    const eventId = ceremonyId("rotation", occurredAt, request.predecessorKeyId);
    const event = sanitizeEvent({
      id: eventId,
      type: "key-rotation-completed",
      protocolVersion: PROTOCOL_VERSION,
      occurredAt,
      operatorLabel: request.operatorLabel,
      predecessorKeyId: request.predecessorKeyId,
      successorKeyId: request.successorKeyId,
      reason: request.reason,
      independentConfirmationChannel: request.independentConfirmationChannel,
      evidenceReference: request.evidenceReference,
      notice: TRUST_NOTICE
    });

    const updated = validation.registry.map((entry) => {
      if (entry.id === request.predecessorKeyId) {
        return sanitizeEntry({
          ...entry,
          status: "Revoked",
          revokedAt: occurredAt,
          revocationReason: `Rotated: ${text(request.reason)}`,
          replacedBy: request.successorKeyId,
          rotationCeremonyId: eventId,
          custodyEvidenceReference: request.evidenceReference,
          updatedAt: occurredAt
        });
      }
      if (entry.id === request.successorKeyId) {
        return sanitizeEntry({
          ...entry,
          status: "Active",
          activatedAt: entry.activatedAt || occurredAt,
          replaces: request.predecessorKeyId,
          rotationCeremonyId: eventId,
          custodyEvidenceReference: request.evidenceReference,
          updatedAt: occurredAt
        });
      }
      return entry;
    });

    return { entries: updated, event };
  }

  function validateLostKeyResponse(entries, request) {
    const errors = [];
    const registry = Array.isArray(entries) ? entries.map(sanitizeEntry) : [];
    const affectedKeyId = text(request?.affectedKeyId);
    const affected = registry.find((entry) => entry.id === affectedKeyId);

    if (!affectedKeyId) errors.push("Select the lost or unavailable key.");
    if (affectedKeyId && !affected) errors.push("The affected key is not in the public registry.");
    if (!text(request?.operatorLabel)) errors.push("Enter the operator or accountable role label.");
    if (!text(request?.reason)) errors.push("Describe the lost-key response reason.");
    if (!text(request?.independentConfirmationChannel)) errors.push("Record the independent notification or confirmation channel.");
    if (!text(request?.incidentReference)) errors.push("Record an incident or evidence reference.");
    if (request?.confirmed !== true) errors.push("Confirm that signing with the affected key must stop immediately.");

    return { ok: errors.length === 0, errors, registry, affected };
  }

  function applyLostKeyResponse(entries, request, occurredAt = new Date().toISOString()) {
    const validation = validateLostKeyResponse(entries, request);
    if (!validation.ok) throw new Error(validation.errors.join(" "));

    const eventId = ceremonyId("lost-key", occurredAt, request.affectedKeyId);
    const event = sanitizeEvent({
      id: eventId,
      type: "lost-key-response-recorded",
      protocolVersion: PROTOCOL_VERSION,
      occurredAt,
      operatorLabel: request.operatorLabel,
      affectedKeyId: request.affectedKeyId,
      reason: request.reason,
      independentConfirmationChannel: request.independentConfirmationChannel,
      incidentReference: request.incidentReference,
      evidenceReference: request.incidentReference,
      notice: TRUST_NOTICE
    });

    const updated = validation.registry.map((entry) => entry.id === request.affectedKeyId
      ? sanitizeEntry({
          ...entry,
          status: "Revoked",
          revokedAt: occurredAt,
          revocationReason: `Lost or unavailable private key: ${text(request.reason)}`,
          custodyEvidenceReference: request.incidentReference,
          updatedAt: occurredAt
        })
      : entry);

    return { entries: updated, event };
  }

  function createReadinessReport(entries, events) {
    const registry = Array.isArray(entries) ? entries.map(sanitizeEntry) : [];
    const custodyEvents = Array.isArray(events) ? events.map(sanitizeEvent) : [];
    const findings = [];
    const active = registry.filter((entry) => entry.status !== "Revoked");
    const revoked = registry.filter((entry) => entry.status === "Revoked");

    if (!registry.length) findings.push({ level: "warning", message: "No public verification keys are registered." });
    if (!active.length && registry.length) findings.push({ level: "warning", message: "No active public verification key is available." });
    registry.filter((entry) => !entry.keyLabel).forEach((entry) => findings.push({ level: "warning", message: `${entry.id} has no key label.` }));
    registry.filter((entry) => !entry.signerLabel).forEach((entry) => findings.push({ level: "warning", message: `${entry.id} has no signer or accountable-role label.` }));
    revoked.filter((entry) => !entry.revocationReason).forEach((entry) => findings.push({ level: "warning", message: `${entry.id} is revoked without a recorded reason.` }));
    revoked.filter((entry) => entry.replacedBy && !registry.some((candidate) => candidate.id === entry.replacedBy)).forEach((entry) => findings.push({ level: "error", message: `${entry.id} references a successor that is not in the registry.` }));
    custodyEvents.filter((event) => !event.independentConfirmationChannel).forEach((event) => findings.push({ level: "warning", message: `${event.id || event.type} has no independent confirmation channel.` }));

    if (!findings.length) findings.push({ level: "ready", message: "Public-key custody metadata is internally consistent." });

    return {
      protocolVersion: PROTOCOL_VERSION,
      checkedAt: new Date().toISOString(),
      summary: {
        totalKeys: registry.length,
        activeKeys: active.length,
        revokedKeys: revoked.length,
        custodyEvents: custodyEvents.length,
        errors: findings.filter((item) => item.level === "error").length,
        warnings: findings.filter((item) => item.level === "warning").length
      },
      ready: findings.every((item) => item.level !== "error"),
      findings,
      notice: TRUST_NOTICE
    };
  }

  function buildManifest(entries, events, options = {}) {
    const publicKeys = (Array.isArray(entries) ? entries : []).map(sanitizeEntry).sort((left, right) => left.id.localeCompare(right.id));
    const custodyEvents = (Array.isArray(events) ? events : []).map(sanitizeEvent).sort((left, right) => left.occurredAt.localeCompare(right.occurredAt));
    const manifest = {
      packageType: MANIFEST_TYPE,
      packageVersion: 1,
      protocolVersion: PROTOCOL_VERSION,
      generatedAt: text(options.generatedAt) || new Date().toISOString(),
      generatedBy: text(options.generatedBy),
      independentConfirmationChannel: text(options.independentConfirmationChannel),
      notes: text(options.notes),
      publicKeys,
      eventSummary: {
        total: custodyEvents.length,
        rotations: custodyEvents.filter((event) => event.type === "key-rotation-completed").length,
        lostKeyResponses: custodyEvents.filter((event) => event.type === "lost-key-response-recorded").length
      },
      custodyEvents,
      notice: TRUST_NOTICE
    };
    if (containsPrivateKeyMaterial(manifest)) throw new Error("The public-key custody manifest contains prohibited private material.");
    return manifest;
  }

  global.MethodzKeyCustodyCoreV162 = {
    version: "1.6.2",
    protocolVersion: PROTOCOL_VERSION,
    manifestType: MANIFEST_TYPE,
    trustNotice: TRUST_NOTICE,
    containsPrivateKeyMaterial,
    normalizePublicJwk,
    sanitizeEntry,
    sanitizeEvent,
    validateRotation,
    applyRotation,
    validateLostKeyResponse,
    applyLostKeyResponse,
    createReadinessReport,
    buildManifest,
    clone
  };
})(typeof window !== "undefined" ? window : globalThis);
