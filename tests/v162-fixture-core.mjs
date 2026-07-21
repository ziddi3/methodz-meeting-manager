import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
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
const fixturePath = path.resolve(
  process.argv[2] || ".methodz-ci/fixtures/methodz-v162-disposable-signed-package.json"
);
const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));

assert.equal(fixture.packageType, "methodz-disposable-verification-fixture");
assert.equal(core.containsPrivateKeyMaterial(fixture), false);
assert.equal(Object.hasOwn(fixture.signatureEnvelope.publicKeyJwk, "d"), false);

const verification = await core.verifyPackage(fixture);
assert.equal(verification.valid, true);
assert.equal(verification.signatureValid, true);
assert.equal(verification.digestMatches, true);
assert.equal(verification.keyIdMatches, true);
assert.equal(verification.keyId, fixture.signatureEnvelope.keyId);

const tamperedPayload = structuredClone(fixture);
tamperedPayload.record.summary = "Tampered fixture content";
const payloadRejection = await core.verifyPackage(tamperedPayload);
assert.equal(payloadRejection.valid, false);
assert.equal(payloadRejection.digestMatches, false);

const tamperedMetadata = structuredClone(fixture);
tamperedMetadata.signatureEnvelope.keyLabel = "Altered key label";
const metadataRejection = await core.verifyPackage(tamperedMetadata);
assert.equal(metadataRejection.valid, false);
assert.equal(metadataRejection.signatureValid, false);

const injectedPrivateMaterial = structuredClone(fixture);
injectedPrivateMaterial.signatureEnvelope.publicKeyJwk.d = "prohibited-private-coordinate";
assert.equal(core.containsPrivateKeyMaterial(injectedPrivateMaterial), true);

console.log("Methodz v1.6.2 disposable fixture verification self-test passed.");
