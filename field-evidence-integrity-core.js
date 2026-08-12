/* Methodz Meeting Manager portable SHA-256 helper for metadata-only Field Evidence receipts. */
(function exposeMethodzFieldEvidenceIntegrityCore(root, factory) {
  "use strict";
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzFieldEvidenceIntegrityCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMethodzFieldEvidenceIntegrityCore(root) {
  "use strict";

  const VERSION = "1.0.0";
  const ALGORITHM = "SHA-256";
  const HEX_PATTERN = /^[0-9a-f]{64}$/;

  function normalizeSha256(value) {
    const normalized = String(value ?? "").trim().toLowerCase();
    return HEX_PATTERN.test(normalized) ? normalized : "";
  }

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  async function sha256Text(value, cryptoLike = root?.crypto) {
    const subtle = cryptoLike?.subtle;
    if (!subtle || typeof subtle.digest !== "function") throw new Error("integrity:crypto-unavailable");
    if (typeof TextEncoder !== "function") throw new Error("integrity:text-encoder-unavailable");
    const bytes = new TextEncoder().encode(String(value ?? ""));
    const digest = await subtle.digest(ALGORITHM, bytes);
    const hex = bytesToHex(digest);
    if (!normalizeSha256(hex)) throw new Error("integrity:digest-invalid");
    return hex;
  }

  function receiptMatches(expected, actual) {
    const left = normalizeSha256(expected);
    const right = normalizeSha256(actual);
    return Boolean(left && right && left === right);
  }

  return Object.freeze({
    version: VERSION,
    algorithm: ALGORITHM,
    normalizeSha256,
    sha256Text,
    receiptMatches
  });
});
