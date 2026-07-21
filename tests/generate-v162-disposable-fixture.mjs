import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { webcrypto } from "node:crypto";

/*
 * Generates a synthetic signed package for verification tests.
 *
 * The P-256 private key exists only in this short-lived Node process. It is
 * never written to disk, printed, returned, or committed. The output contains
 * only synthetic meeting data, the public verification key, and the signature.
 */

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
const outputPath = path.resolve(
  process.argv[2] || "test-results/fixtures/methodz-v162-disposable-signed-package.json"
);

const keyPair = await core.generateKeyPair();
const privateJwk = await core.exportPrivateJwk(keyPair.privateKey);
const publicJwk = await core.exportPublicJwk(keyPair.publicKey);

const unsignedPackage = {
  packageType: "methodz-disposable-verification-fixture",
  packageVersion: 1,
  fixtureNotice: "Synthetic public test data. The disposable private key was not retained.",
  manifest: {
    sourceReference: {
      id: "fixture-v162-disposable",
      meetingNumber: "FIX-001",
      title: "Disposable signed verification fixture"
    },
    generatedFor: "Methodz Meeting Manager v1.6.2 verification conformance",
    sensitivity: "Public synthetic test data only"
  },
  record: {
    id: "fixture-v162-disposable",
    meetingNumber: "FIX-001",
    title: "Disposable signed verification fixture",
    date: "2026-07-21",
    status: "Completed",
    organizations: ["Methodz test fixture"],
    attendees: [],
    agenda: [],
    notes: "",
    decisions: [],
    tasks: [],
    attachments: [],
    summary: "Synthetic package used to prove portable signature verification across supported browsers."
  }
};

const signedPackage = await core.signPackage(unsignedPackage, privateJwk, {
  publicKeyJwk: publicJwk,
  signerLabel: "Disposable CI Fixture",
  keyLabel: "Non-production ephemeral P-256 key",
  signedAt: "2026-07-21T23:45:00.000Z"
});

assert.equal(core.containsPrivateKeyMaterial(signedPackage), false);
assert.equal(Object.hasOwn(signedPackage.signatureEnvelope.publicKeyJwk, "d"), false);

const verification = await core.verifyPackage(signedPackage);
assert.equal(verification.valid, true);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(signedPackage, null, 2)}\n`, "utf8");

console.log(`Generated disposable signed fixture: ${outputPath}`);
console.log(`Fixture key ID: ${signedPackage.signatureEnvelope.keyId}`);
