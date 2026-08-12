import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../field-evidence-integrity-core.js");

assert.equal(core.version, "1.0.0");
assert.equal(core.algorithm, "SHA-256");

{
  const digest = await core.sha256Text("abc");
  assert.equal(digest, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(core.normalizeSha256(digest.toUpperCase()), digest);
  assert.equal(core.receiptMatches(digest, digest.toUpperCase()), true);
}

{
  const first = await core.sha256Text("{\"a\":1}\n");
  const second = await core.sha256Text("{\"a\":1}");
  assert.notEqual(first, second, "receipt must bind exact bytes including the generated trailing newline");
  assert.equal(core.receiptMatches(first, second), false);
}

{
  assert.equal(core.normalizeSha256("not-a-digest"), "");
  await assert.rejects(() => core.sha256Text("abc", {}), /integrity:crypto-unavailable/);
}

console.log("Field Evidence integrity core: all assertions passed.");
