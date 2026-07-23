import { createRequire } from "node:module";
import assert from "node:assert/strict";

const require = createRequire(import.meta.url);
const Contract = require("../provider-contract.js");
const Conformance = require("../provider-conformance.js");
const Pilot = require("../http-provider-pilot.js");

const emptyState = () => ({ activeRecords: [], archivedRecords: [], revisions: {}, idempotency: {} });
const noWait = async () => {};

function conformanceFactory(options = {}) {
  return Pilot.createPilotProvider({
    suffix: options.suffix || "conformance",
    tenantId: `conformance-${options.suffix || "main"}`,
    initialState: options.initialState || emptyState(),
    maxRetries: 0,
    timeoutMs: 250,
    retryDelay: noWait
  });
}

const conformance = await Conformance.runProviderConformance(conformanceFactory, {
  recordPrefix: "http-pilot"
});
assert.equal(conformance.ok, true);

{
  const provider = Pilot.createPilotProvider({ suffix: "rate-limit", maxRetries: 2, retryDelay: noWait });
  provider.queueFault("healthCheck", { kind: "rateLimit", retryAfterMs: 1 });
  const health = await provider.healthCheck();
  assert.equal(health.ok, true);
}

{
  const provider = Pilot.createPilotProvider({ suffix: "dropped-response", maxRetries: 2, retryDelay: noWait });
  provider.queueFault("upsertRecord", { kind: "dropResponse", phase: "after" });
  const result = await provider.upsertRecord(
    { id: "drop-response-record", title: "Committed once" },
    { idempotencyKey: "drop-response-create" }
  );
  assert.equal(result.idempotentReplay, true);
  assert.equal((await provider.listRecords()).length, 1);
}

{
  const provider = Pilot.createPilotProvider({ suffix: "partial-success", maxRetries: 2, retryDelay: noWait });
  provider.queueFault("upsertRecord", { kind: "partialSuccess", phase: "after" });
  const result = await provider.upsertRecord(
    { id: "partial-success-record", title: "Committed before interruption" },
    { idempotencyKey: "partial-success-create" }
  );
  assert.equal(result.idempotentReplay, true);
  assert.equal(result.providerVersion, 1);
}

{
  const provider = Pilot.createPilotProvider({
    suffix: "timeout",
    maxRetries: 1,
    timeoutMs: 5,
    retryDelay: noWait
  });
  provider.queueFault("listRecords", { kind: "delay", delayMs: 25 });
  const records = await provider.listRecords();
  assert.deepEqual(records, []);
}

{
  const simulator = new Pilot.HttpProviderSimulator({ id: "tenant-isolation-simulator" });
  const tenantA = new Pilot.HttpHostedProviderClient({ simulator, tenantId: "tenant-a", maxRetries: 0 });
  const tenantB = new Pilot.HttpHostedProviderClient({ simulator, tenantId: "tenant-b", maxRetries: 0 });
  const sharedKey = "same-idempotency-key";

  const writeA = await tenantA.upsertRecord(
    { id: "shared-record-id", title: "Tenant A" },
    { idempotencyKey: sharedKey }
  );
  const writeB = await tenantB.upsertRecord(
    { id: "shared-record-id", title: "Tenant B" },
    { idempotencyKey: sharedKey }
  );

  assert.equal(writeA.record.title, "Tenant A");
  assert.equal(writeB.record.title, "Tenant B");
  assert.equal((await tenantA.getRecord("shared-record-id")).record.title, "Tenant A");
  assert.equal((await tenantB.getRecord("shared-record-id")).record.title, "Tenant B");
}

{
  const provider = Pilot.createPilotProvider({ suffix: "metadata", maxRetries: 0 });
  const metadata = {
    retention: { category: "business-record", reviewDate: "2028-01-01" },
    preservationHold: { active: true, reason: "Synthetic conformance hold" },
    disposition: { status: "blocked-by-hold" },
    redaction: { profile: "Partner Safe" },
    externalReleaseControl: { approvalStatus: "approved" },
    releaseReceipts: [{ id: "receipt-1", integrity: { value: "public-checksum" } }],
    signatureMetadata: { algorithm: "ECDSA-P256-SHA256", keyId: "public-key-id" },
    custodyMetadata: { status: "active", publicKeyOnly: true },
    recoveryMetadata: { packageChecksum: "recovery-checksum" },
    extensionData: { unknownFutureField: { preserve: true } },
    attachments: [{ id: "ref-1", name: "Reference", location: "https://example.invalid/reference" }]
  };
  const write = await provider.upsertRecord(
    { id: "metadata-record", title: "Serialized metadata", ...metadata },
    { idempotencyKey: "metadata-create" }
  );
  const update = await provider.upsertRecord(
    { id: "metadata-record", summary: "Updated through serialized transport" },
    { expectedConflictToken: write.conflictToken, idempotencyKey: "metadata-update" }
  );
  assert.equal(update.record.preservationHold.active, true);
  assert.equal(update.record.extensionData.unknownFutureField.preserve, true);
  assert.equal(update.record.attachments[0].location, "https://example.invalid/reference");
  const loaded = await provider.getRecord("metadata-record");
  assert.equal(loaded.revisions.length, 1);
  assert.equal(loaded.revisions[0].releaseReceipts[0].id, "receipt-1");
  const exported = await provider.exportWorkspace({
    metadata: { recoveryPackage: { checksum: "transport-boundary-checksum" } }
  });
  assert.equal(exported.metadata.recoveryPackage.checksum, "transport-boundary-checksum");
  assert.equal(Contract.verifyExportEnvelope(exported).ok, true);
}

{
  const marker = "SENSITIVE-MEETING-CONTENT-MUST-NOT-ENTER-DIAGNOSTICS";
  const privateMarker = "SYNTHETIC-PRIVATE-VALUE-MUST-NOT-ENTER-DIAGNOSTICS";
  const provider = Pilot.createPilotProvider({ suffix: "diagnostics", maxRetries: 0 });
  await provider.upsertRecord(
    { id: "diagnostic-record", title: marker, notes: marker },
    { idempotencyKey: "diagnostic-create" }
  );
  await assert.rejects(
    provider.upsertRecord({
      id: "private-diagnostic-record",
      signingKey: { kty: "EC", crv: "P-256", x: "public-x", y: "public-y", d: privateMarker }
    }),
    (error) => error.code === Contract.errorCodes.PRIVATE_KEY_REJECTED
  );
  const diagnosticsText = JSON.stringify(provider.pilotSimulator.getDiagnostics());
  assert.equal(diagnosticsText.includes(marker), false);
  assert.equal(diagnosticsText.includes(privateMarker), false);
  assert.equal(diagnosticsText.includes("diagnostic-record"), false);
  assert.match(diagnosticsText, /upsertRecord/);
}

console.log(JSON.stringify({
  ok: true,
  pilotVersion: Pilot.version,
  contractVersion: Contract.version,
  conformanceChecks: conformance.checks.length,
  scenarios: [
    "rate-limit retry",
    "dropped-response idempotent replay",
    "partial-success replay",
    "timeout retry",
    "tenant isolation",
    "serialized metadata preservation",
    "diagnostic redaction"
  ]
}, null, 2));
