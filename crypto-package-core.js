/* Methodz Meeting Manager v1.6 portable ECDSA package signing and verification core. */
(function initializeMethodzCryptoPackageCore(global) {
  "use strict";

  const SIGNATURE_TYPE = "methodz-ecdsa-p256-sha256";
  const CANONICALIZATION = "methodz-canonical-json-v1";
  const KEY_ALGORITHM = { name: "ECDSA", namedCurve: "P-256" };
  const SIGN_ALGORITHM = { name: "ECDSA", hash: "SHA-256" };
  const TRUST_NOTICE = "This signature proves possession of the matching private key at signing time. It does not independently prove the human identity or authority behind the key.";
  const PRIVATE_CONTAINER_KEYS = new Set(["privatekey", "privatekeyjwk", "privatejwk"]);
  const encoder = new TextEncoder();

  function subtle() {
    if (!global.crypto?.subtle) {
      throw new Error("Web Crypto is unavailable. Use HTTPS or localhost in a current browser for signing and verification.");
    }
    return global.crypto.subtle;
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function unsignedPackage(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("A signed package must be a JSON object.");
    }
    const copy = clone(value);
    delete copy.signatureEnvelope;
    return copy;
  }

  function canonicalize(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
    if (typeof value === "object") {
      const entries = Object.keys(value)
        .filter((key) => value[key] !== undefined)
        .sort()
        .map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
      return `{${entries.join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function containsPrivateKeyMaterial(value, seen = new WeakSet()) {
    if (!value || typeof value !== "object") return false;
    if (seen.has(value)) return false;
    seen.add(value);

    if (!Array.isArray(value) && value.kty === "EC" && value.crv === "P-256" && typeof value.d === "string" && value.d) {
      return true;
    }

    return Object.entries(value).some(([key, child]) => {
      if (PRIVATE_CONTAINER_KEYS.has(String(key).toLowerCase()) && child && typeof child === "object") return true;
      return containsPrivateKeyMaterial(child, seen);
    });
  }

  function bytesToHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function bytesToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return global.btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = global.atob(String(value || ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function sha256Text(text) {
    return bytesToHex(await subtle().digest("SHA-256", encoder.encode(String(text))));
  }

  function normalizePublicJwk(jwk) {
    if (!jwk || jwk.kty !== "EC" || jwk.crv !== "P-256" || !jwk.x || !jwk.y) {
      throw new Error("The key is not a valid P-256 public JWK.");
    }
    return {
      kty: "EC",
      crv: "P-256",
      x: jwk.x,
      y: jwk.y,
      ext: true,
      key_ops: ["verify"]
    };
  }

  function publicJwkFromPrivate(jwk) {
    if (!jwk?.d) throw new Error("The selected JWK does not contain private key material.");
    return normalizePublicJwk(jwk);
  }

  async function deriveKeyId(publicJwk) {
    const normalized = normalizePublicJwk(publicJwk);
    const digest = await sha256Text(canonicalize({
      kty: normalized.kty,
      crv: normalized.crv,
      x: normalized.x,
      y: normalized.y
    }));
    return `p256:${digest.slice(0, 32)}`;
  }

  async function generateKeyPair() {
    return subtle().generateKey(KEY_ALGORITHM, true, ["sign", "verify"]);
  }

  async function exportPrivateJwk(privateKey) {
    return subtle().exportKey("jwk", privateKey);
  }

  async function exportPublicJwk(publicKey) {
    return normalizePublicJwk(await subtle().exportKey("jwk", publicKey));
  }

  async function importPrivateJwk(jwk) {
    if (!jwk?.d) throw new Error("The selected JWK does not contain private key material.");
    return subtle().importKey("jwk", jwk, KEY_ALGORITHM, true, ["sign"]);
  }

  async function importPublicJwk(jwk) {
    return subtle().importKey("jwk", normalizePublicJwk(jwk), KEY_ALGORITHM, true, ["verify"]);
  }

  function createMetadata(envelope) {
    return {
      version: Number(envelope.version),
      type: String(envelope.type || ""),
      signedAt: String(envelope.signedAt || ""),
      signerLabel: String(envelope.signerLabel || ""),
      keyLabel: String(envelope.keyLabel || ""),
      keyId: String(envelope.keyId || ""),
      algorithm: clone(envelope.algorithm || {}),
      payloadDigest: clone(envelope.payloadDigest || {}),
      publicKeyJwk: normalizePublicJwk(envelope.publicKeyJwk),
      notice: String(envelope.notice || "")
    };
  }

  function canonicalSigningPayload(packageValue, metadata) {
    return canonicalize({ package: packageValue, signatureMetadata: metadata });
  }

  function validateEnvelope(envelope) {
    const errors = [];
    if (envelope?.version !== 1) errors.push("Unsupported signature-envelope version.");
    if (envelope?.type !== SIGNATURE_TYPE) errors.push("Unsupported signature-envelope type.");
    if (envelope?.algorithm?.name !== "ECDSA") errors.push("Signature algorithm must be ECDSA.");
    if (envelope?.algorithm?.namedCurve !== "P-256") errors.push("Signature curve must be P-256.");
    if (envelope?.algorithm?.hash !== "SHA-256") errors.push("Signature hash must be SHA-256.");
    if (envelope?.algorithm?.signatureEncoding !== "raw-base64") errors.push("Signature byte encoding must be raw-base64.");
    if (envelope?.payloadDigest?.algorithm !== "SHA-256") errors.push("Payload digest must use SHA-256.");
    if (envelope?.payloadDigest?.canonicalization !== CANONICALIZATION) errors.push("Unsupported canonicalization declaration.");
    if (envelope?.signature?.encoding !== "base64") errors.push("Signature transport encoding must be base64.");
    if (!envelope?.signature?.value) errors.push("Signature value is missing.");
    if (!envelope?.keyId) errors.push("Signature key ID is missing.");
    if (!envelope?.signedAt || Number.isNaN(new Date(envelope.signedAt).getTime())) errors.push("Signature timestamp is missing or invalid.");
    if (envelope?.notice !== TRUST_NOTICE) errors.push("Signature trust notice is missing or altered.");
    return errors;
  }

  async function signPackage(packageValue, privateKeyOrJwk, options = {}) {
    if (containsPrivateKeyMaterial(packageValue)) {
      throw new Error("The package contains private key material and cannot be signed.");
    }
    if (options.signedAt && Number.isNaN(new Date(options.signedAt).getTime())) {
      throw new Error("The requested signature timestamp is invalid.");
    }

    const unsigned = unsignedPackage(packageValue);
    const isCryptoKey = typeof global.CryptoKey !== "undefined" && privateKeyOrJwk instanceof global.CryptoKey;
    const privateJwk = isCryptoKey ? await exportPrivateJwk(privateKeyOrJwk) : clone(privateKeyOrJwk);
    const privateKey = isCryptoKey ? privateKeyOrJwk : await importPrivateJwk(privateJwk);
    const publicKeyJwk = normalizePublicJwk(options.publicKeyJwk || publicJwkFromPrivate(privateJwk));
    const keyId = await deriveKeyId(publicKeyJwk);
    const payloadDigest = await sha256Text(canonicalize(unsigned));
    const metadata = {
      version: 1,
      type: SIGNATURE_TYPE,
      signedAt: options.signedAt || new Date().toISOString(),
      signerLabel: String(options.signerLabel || "").trim(),
      keyLabel: String(options.keyLabel || "").trim(),
      keyId,
      algorithm: {
        name: "ECDSA",
        namedCurve: "P-256",
        hash: "SHA-256",
        signatureEncoding: "raw-base64"
      },
      payloadDigest: {
        algorithm: "SHA-256",
        canonicalization: CANONICALIZATION,
        digest: payloadDigest
      },
      publicKeyJwk,
      notice: TRUST_NOTICE
    };
    const signature = await subtle().sign(
      SIGN_ALGORITHM,
      privateKey,
      encoder.encode(canonicalSigningPayload(unsigned, metadata))
    );

    return {
      ...unsigned,
      signatureEnvelope: {
        ...metadata,
        signature: { encoding: "base64", value: bytesToBase64(signature) }
      }
    };
  }

  async function verifyPackage(packageValue, options = {}) {
    const envelope = packageValue?.signatureEnvelope;
    if (!envelope || envelope.type !== SIGNATURE_TYPE) {
      return invalidResult(["The package does not contain a supported Methodz signature envelope."]);
    }

    const errors = validateEnvelope(envelope);
    let signatureValid = false;
    let digestMatches = false;
    let keyIdMatches = false;
    let derivedKeyId = "";
    let payloadDigest = "";

    try {
      const publicKeyJwk = normalizePublicJwk(options.publicKeyJwk || envelope.publicKeyJwk);
      derivedKeyId = await deriveKeyId(publicKeyJwk);
      keyIdMatches = derivedKeyId === envelope.keyId;
      if (!keyIdMatches) errors.push("The public key does not match the recorded key ID.");

      const unsigned = unsignedPackage(packageValue);
      if (containsPrivateKeyMaterial(unsigned)) errors.push("The signed package contains prohibited private key material.");
      payloadDigest = await sha256Text(canonicalize(unsigned));
      digestMatches = payloadDigest === envelope.payloadDigest?.digest;
      if (!digestMatches) errors.push("The package payload digest does not match the signed digest.");

      const metadata = createMetadata({ ...envelope, publicKeyJwk });
      const publicKey = await importPublicJwk(publicKeyJwk);
      signatureValid = await subtle().verify(
        SIGN_ALGORITHM,
        publicKey,
        base64ToBytes(envelope.signature?.value),
        encoder.encode(canonicalSigningPayload(unsigned, metadata))
      );
      if (!signatureValid) errors.push("The ECDSA signature is invalid for the package or signature metadata.");
    } catch (error) {
      errors.push(error?.message || String(error));
    }

    return {
      valid: errors.length === 0 && signatureValid && digestMatches && keyIdMatches,
      signatureValid,
      digestMatches,
      keyIdMatches,
      keyId: envelope.keyId || "",
      derivedKeyId,
      signerLabel: envelope.signerLabel || "",
      keyLabel: envelope.keyLabel || "",
      signedAt: envelope.signedAt || "",
      packageType: packageValue?.packageType || "",
      payloadDigest,
      expectedPayloadDigest: envelope.payloadDigest?.digest || "",
      errors: [...new Set(errors)],
      notice: "Verification confirms package and signature-metadata integrity relative to the included key. It does not independently authenticate the human signer, authority, recipient, approval, or delivery."
    };
  }

  function invalidResult(errors) {
    return {
      valid: false,
      signatureValid: false,
      digestMatches: false,
      keyIdMatches: false,
      keyId: "",
      derivedKeyId: "",
      signerLabel: "",
      keyLabel: "",
      signedAt: "",
      packageType: "",
      payloadDigest: "",
      expectedPayloadDigest: "",
      errors,
      notice: "Verification could not be completed."
    };
  }

  global.MethodzCryptoPackageV16 = {
    version: "1.6.0",
    protocolVersion: "1.0.0",
    signatureType: SIGNATURE_TYPE,
    isSupported: () => Boolean(global.crypto?.subtle),
    canonicalize,
    unsignedPackage,
    containsPrivateKeyMaterial,
    normalizePublicJwk,
    publicJwkFromPrivate,
    deriveKeyId,
    generateKeyPair,
    exportPrivateJwk,
    exportPublicJwk,
    importPrivateJwk,
    importPublicJwk,
    signPackage,
    verifyPackage
  };
})(window);
