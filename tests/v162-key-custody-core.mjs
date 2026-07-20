import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";

globalThis.window = globalThis;
if (!globalThis.crypto?.subtle) {
  Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true
  });
}
globalThis.btoa ||= (value) => Buffer.from(value, "binary").toString("base64");
globalThis.atob ||= (value) => Buffer.from(value, "base64").toString("binary");

await import("../crypto-package-core.js");
await import("../key-custody-core.js");

const cryptoCore = globalThis.MethodzCryptoPackageV16;
const custodyCore = globalThis.MethodzKeyCustodyCoreV162;
assert.equal(custodyCore.version, "1.6.2");
assert.equal(custodyCore.protocolVersion, "1.0.0");

async function createRegistryEntry(label, timestamp) {
  const pair = await cryptoCore.generateKeyPair();
  const publicKeyJwk = await cryptoCore.exportPublicJwk(pair.publicKey);
  const id = await cryptoCore.deriveKeyId(publicKeyJwk);
  return {
    id,
    keyLabel: label,
    signerLabel: "Automated custody test",
    status: "Active",
    publicKeyJwk,
    source: "ephemeral-node-test",
    createdAt: timestamp,
    updatedAt: timestamp,
    revokedAt: ""
  };
}

const first = await createRegistryEntry("Predecessor", "2026-07-20T00:00:00.000Z");
const second = await createRegistryEntry("Successor", "2026-07-20T00:01:00.000Z");

const manifest = await custodyCore.createManifest([first, second], {
  [first.id]: {
    keyId: first.id,
    custodian: "Records administrator",
    custodyLocationReference: "vault-register-001",
    fingerprintVerifiedAt: "2026-07-20T01:00:00.000Z",
    fingerprintVerifiedBy: "Independent reviewer",
    fingerprintVerificationChannel: "In-person comparison",
    nextReviewDate: "2027-01-16",
    notes: "Public metadata only",
    updatedAt: "2026-07-20T01:00:00.000Z"
  }
}, {
  generatedAt: "2026-07-20T02:00:00.000Z",
  generatedBy: "CI records role",
  organization: "Methodz test context",
  maximumEntries: 10
});

assert.equal(manifest.packageType, "methodz-public-key-custody-manifest");
assert.equal(manifest.privateKeysIncluded, false);
assert.equal(manifest.keys.length, 2);
assert.equal(custodyCore.containsPrivateKeyMaterial(manifest), false);
assert.match(manifest.integrity.digest, /^[a-f0-9]{64}$/);

const verification = await custodyCore.verifyManifest(manifest, { maximumEntries: 10 });
assert.equal(verification.valid, true);
assert.equal(verification.digestMatches, true);
assert.equal(verification.keyCount, 2);
assert.equal(verification.activeKeyCount, 2);

const tampered = structuredClone(manifest);
tampered.keys[0].keyLabel = "Altered after export";
const tamperedVerification = await custodyCore.verifyManifest(tampered, { maximumEntries: 10 });
assert.equal(tamperedVerification.valid, false);
assert.equal(tamperedVerification.digestMatches, false);

const privateLeak = structuredClone(manifest);
privateLeak.keys[0].publicKeyJwk.d = "prohibited-private-coordinate";
const privateVerification = await custodyCore.verifyManifest(privateLeak, { maximumEntries: 10 });
assert.equal(privateVerification.valid, false);
assert.ok(privateVerification.errors.some((error) => error.includes("private key material")));

const rotation = await custodyCore.buildRotationPlan([first, second], {
  predecessorKeyId: first.id,
  successorKeyId: second.id,
  operator: "CI rotation operator",
  witness: "CI reviewer",
  reason: "Scheduled automated rotation test",
  evidenceReference: "test-case-v162",
  occurredAt: "2026-07-20T03:00:00.000Z",
  maximumEntries: 10
});

const rotatedPredecessor = rotation.entries.find((entry) => entry.id === first.id);
const rotatedSuccessor = rotation.entries.find((entry) => entry.id === second.id);
assert.equal(rotatedPredecessor.status, "Revoked");
assert.equal(rotatedPredecessor.replacedByKeyId, second.id);
assert.equal(rotatedPredecessor.revocationReason, "Scheduled automated rotation test");
assert.equal(rotatedSuccessor.status, "Active");
assert.equal(rotatedSuccessor.replacesKeyId, first.id);
assert.equal(rotation.event.action, "public-key-rotation-completed");

await assert.rejects(
  () => custodyCore.buildRotationPlan([first, second], {
    predecessorKeyId: first.id,
    successorKeyId: first.id,
    operator: "CI operator",
    reason: "Invalid same-key rotation",
    occurredAt: "2026-07-20T03:00:00.000Z"
  }),
  /must be different/
);

const revocation = await custodyCore.buildRevocationPlan([first, second], {
  keyId: first.id,
  operator: "CI emergency operator",
  reason: "Simulated device loss",
  occurredAt: "2026-07-20T04:00:00.000Z",
  maximumEntries: 10
});
assert.equal(revocation.entries.find((entry) => entry.id === first.id).status, "Revoked");
assert.equal(revocation.event.action, "public-key-revoked-with-custody-record");

console.log("Methodz v1.6.2 public-key custody core self-test passed.");
