import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { webcrypto } from "node:crypto";

const context = {
  console,
  crypto: webcrypto,
  TextEncoder,
  TextDecoder,
  btoa: (value) => Buffer.from(value, "binary").toString("base64"),
  atob: (value) => Buffer.from(value, "base64").toString("binary"),
  setTimeout,
  clearTimeout
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync("crypto-package-core.js", "utf8"), context, { filename: "crypto-package-core.js" });
vm.runInContext(fs.readFileSync("key-custody-core.js", "utf8"), context, { filename: "key-custody-core.js" });

const cryptoCore = context.MethodzCryptoPackageV16;
const custodyCore = context.MethodzKeyCustodyCoreV162;
assert.equal(custodyCore.version, "1.6.2");

async function createPublicEntry(label) {
  const pair = await cryptoCore.generateKeyPair();
  const publicKeyJwk = await cryptoCore.exportPublicJwk(pair.publicKey);
  return {
    id: await cryptoCore.deriveKeyId(publicKeyJwk),
    keyLabel: label,
    signerLabel: "Disposable CI Operator",
    status: "Active",
    publicKeyJwk,
    source: "node-self-test",
    createdAt: "2026-07-21T23:00:00.000Z",
    updatedAt: "2026-07-21T23:00:00.000Z",
    revokedAt: ""
  };
}

const first = await createPublicEntry("Disposable retiring key");
const second = await createPublicEntry("Disposable replacement key");
const manifest = await custodyCore.buildManifest({
  keys: [first, second],
  generatedAt: "2026-07-21T23:00:00.000Z",
  generatedBy: "Automated test",
  events: [{
    id: "custody-test-rotation",
    eventType: "rotation",
    status: "Completed",
    fromKeyId: first.id,
    toKeyId: second.id,
    effectiveAt: "2026-07-21T23:00:00.000Z",
    operatorLabel: "Disposable CI Operator",
    witnessLabel: "Disposable CI Witness",
    reason: "Automated rotation-conformance fixture.",
    createdAt: "2026-07-21T23:00:00.000Z",
    checklist: {
      privateBackupSeparated: true,
      fingerprintConfirmed: true,
      registryStatusReviewed: true,
      recoveryEvidenceCaptured: true
    }
  }]
}, cryptoCore);

const verification = await custodyCore.validateManifest(manifest, cryptoCore);
assert.equal(verification.valid, true, verification.errors.join("\n"));
assert.equal(verification.keyCount, 2);
assert.equal(verification.eventCount, 1);
assert.equal(verification.privateMaterialPresent, false);
assert.equal(custodyCore.containsPrivateKeyMaterial(manifest), false);
assert.equal(JSON.stringify(manifest).includes('"d"'), false);

const tampered = structuredClone(manifest);
tampered.keys[0].id = "p256:tampered";
const rejected = await custodyCore.validateManifest(tampered, cryptoCore);
assert.equal(rejected.valid, false);
assert.match(rejected.errors.join(" "), /ID mismatch/i);

const prohibited = structuredClone(manifest);
prohibited.keys[0].publicKeyJwk.d = "private-material-must-never-appear";
const privateRejected = await custodyCore.validateManifest(prohibited, cryptoCore);
assert.equal(privateRejected.valid, false);
assert.equal(privateRejected.privateMaterialPresent, true);

await assert.rejects(
  custodyCore.buildManifest({ keys: [first], events: [{
    eventType: "rotation",
    status: "Completed",
    fromKeyId: first.id,
    toKeyId: first.id,
    effectiveAt: "2026-07-21T23:00:00.000Z",
    operatorLabel: "Operator",
    witnessLabel: "Witness",
    reason: "Invalid same-key rotation",
    checklist: {
      privateBackupSeparated: true,
      fingerprintConfirmed: true,
      registryStatusReviewed: true,
      recoveryEvidenceCaptured: true
    }
  }] }, cryptoCore),
  /must differ/i
);

console.log("v1.6.2 key custody core self-test passed");
