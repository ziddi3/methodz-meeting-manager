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

const core = globalThis.MethodzCryptoPackageV16;
assert.equal(core.version, "1.6.0");
assert.equal(core.isSupported(), true);

const pair = await core.generateKeyPair();
const privateJwk = await core.exportPrivateJwk(pair.privateKey);
const publicJwk = await core.exportPublicJwk(pair.publicKey);
const unsigned = {
  packageType: "methodz-record-export",
  packageVersion: 1,
  manifest: {
    sourceReference: {
      id: "node-v16-test",
      meetingNumber: "016",
      title: "Node cryptographic self-test"
    }
  },
  record: {
    id: "node-v16-test",
    title: "Node cryptographic self-test",
    summary: "Controlled package content"
  }
};

const signed = await core.signPackage(unsigned, privateJwk, {
  publicKeyJwk: publicJwk,
  signerLabel: "Automated Test",
  keyLabel: "Ephemeral CI key",
  signedAt: "2026-07-17T00:00:00.000Z"
});
const verified = await core.verifyPackage(signed);
assert.equal(verified.valid, true);
assert.equal(verified.signatureValid, true);
assert.equal(verified.digestMatches, true);
assert.equal(verified.keyIdMatches, true);
assert.equal(core.containsPrivateKeyMaterial(signed), false);
assert.equal(Object.hasOwn(signed.signatureEnvelope.publicKeyJwk, "d"), false);

const tampered = structuredClone(signed);
tampered.record.summary = "Tampered package content";
const rejected = await core.verifyPackage(tampered);
assert.equal(rejected.valid, false);
assert.equal(rejected.digestMatches, false);

const alteredMetadata = structuredClone(signed);
alteredMetadata.signatureEnvelope.signerLabel = "Different signer label";
const metadataRejected = await core.verifyPackage(alteredMetadata);
assert.equal(metadataRejected.valid, false);
assert.equal(metadataRejected.signatureValid, false);

console.log("Methodz v1.6 cryptographic package self-test passed.");
