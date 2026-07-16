/* Methodz Meeting Manager v1.5 portable ECDSA P-256 package signing and verification core. */
(function initializeMethodzCryptoPackageCoreV15(global) {
  "use strict";

  const TYPE = "methodz-ecdsa-p256-sha256";
  const ALGORITHM = { name: "ECDSA", namedCurve: "P-256" };
  const SIGN_ALGORITHM = { name: "ECDSA", hash: "SHA-256" };
  const CANONICALIZATION = "methodz-canonical-json-v1";
  const NOTICE = "This signature proves possession of the matching private key at signing time. It does not prove the human identity behind the key unless that key is independently verified.";
  const encoder = new TextEncoder();

  function assertCrypto() {
    if (!global.crypto?.subtle) {
      throw new Error("Web Crypto is unavailable. Use HTTPS or localhost in a current browser to sign or verify packages.");
    }
    return global.crypto.subtle;
  }

  function cloneJson(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function unsignedPackage(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("A package must be a JSON object.");
    }
    const copy = cloneJson(value);
    delete copy.signatureEnvelope;
    return copy;
  }

  function canonicalize(value) {
    if (value === null) return "null";
    if (Array.isArray(value)) return `[${value.map((item) => canonicalize(item)).join(",")}]`;
    if (typeof value === "object") {
      return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined).map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function toHex(buffer) {
    return Array.from(new Uint8Array(buffer)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }

  function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    }
    return global.btoa(binary);
  }

  function fromBase64(value) {
    const binary = global.atob(String(value || ""));
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function sha256Text(text) {
    const digest = await assertCrypto().digest("SHA-256", encoder.encode(String(text)));
    return toHex(digest);
  }

  function publicJwkFromPrivate(privateJwk) {
    if (!privateJwk || privateJwk.kty !== "EC" || privateJwk.crv !== "P-256" || !privateJwk.x || !privateJwk.y) {
      throw new Error("The private key is not a valid P-256 JWK.");
    }
    return {
      kty: "EC",
      crv: "P-256",
      x: privateJwk.x,
      y: privateJwk.y,
      ext: true,
      key_ops: ["verify"]
    };
  }

  function normalizedPublicJwk(publicJwk) {
    if (!publicJwk || publicJwk.kty !== "EC" || publicJwk.crv !== "P-256" || !publicJwk.x || !publicJwk.y) {
      throw new Error("The public key is not a valid P-256 JWK.");
    }
    return {
      kty: "EC",
      crv: "P-256",
      x: publicJwk.x,
      y: publicJwk.y,
      ext: true,
      key_ops: ["verify"]
    };
  }

  async function deriveKeyId(publicJwk) {
    const normalized = normalizedPublicJwk(publicJwk);
    const digest = await sha256Text(canonicalize({ kty: normalized.kty, crv: normalized.crv, x: normalized.x, y: normalized.y }));
    return `p256:${digest.slice(0, 32)}`;
  }

  async function generateKeyPair() {
    return assertCrypto().generateKey(ALGORITHM, true, ["sign", "verify"]);
  }

  async function exportPrivateJwk(privateKey) {
    return assertCrypto().exportKey("jwk", privateKey);
  }

  async function exportPublicJwk(publicKey) {
    return normalizedPublicJwk(await assertCrypto().exportKey("jwk", publicKey));
  }

  async function importPrivateJwk(privateJwk) {
    if (!privateJwk?.d) throw new Error("The selected JWK does not contain private key material.");
    return assertCrypto().importKey("jwk", privateJwk, ALGORITHM, true, ["sign"]);
  }

  async function importPublicJwk(publicJwk) {
    return assertCrypto().importKey("jwk", normalizedPublicJwk(publicJwk), ALGORITHM, true, ["verify"]);
  }

  function metadataFromEnvelope(envelope) {
    return {
      version: Number(envelope?.version || 1),
      type: String(envelope?.type || TYPE),
      signedAt: String(envelope?.signedAt || ""),
      signerLabel: String(envelope?.signerLabel || ""),
      keyLabel: String(envelope?.keyLabel || ""),
      keyId: String(envelope?.keyId || ""),
      algorithm: cloneJson(envelope?.algorithm || {}),
      payloadDigest: cloneJson(envelope?.payloadDigest || {}),
      publicKeyJwk: normalizedPublicJwk(envelope?.publicKeyJwk),
      notice: String(envelope?.notice || NOTICE)
    };
  }

  function canonicalSigningPayload(unsigned, metadata) {
    return canonicalize({
      package: unsigned,
      signatureMetadata: metadata
    });
  }

  async function signPackage(packageValue, privateKeyOrJwk, metadata = {}) {
    const unsigned = unsignedPackage(packageValue);
    const isCryptoKey = Boolean(global.CryptoKey && privateKeyOrJwk instanceof global.CryptoKey);
    const privateJwk = isCryptoKey ? await exportPrivateJwk(privateKeyOrJwk) : cloneJson(privateKeyOrJwk);
    const privateKey = isCryptoKey ? privateKeyOrJwk : await importPrivateJwk(privateJwk);
    const publicKeyJwk = normalizedPublicJwk(metadata.publicKeyJwk || publicJwkFromPrivate(privateJwk));
    const keyId = await deriveKeyId(publicKeyJwk);
    const canonicalPackage = canonicalize(unsigned);
    const payloadDigest = await sha256Text(canonicalPackage);
    const signedMetadata = {
      version: 1,
      type: TYPE,
      signedAt: metadata.signedAt || new Date().toISOString(),
      signerLabel: String(metadata.signerLabel || "").trim(),
      keyLabel: String(metadata.keyLabel || "").trim(),
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
      notice: NOTICE
    };
    const signatureBytes = await assertCrypto().sign(
      SIGN_ALGORITHM,
      privateKey,
      encoder.encode(canonicalSigningPayload(unsigned, signedMetadata))
    );

    return {
      ...unsigned,
      signatureEnvelope: {
        ...signedMetadata,
        signature: {
          encoding: "base64",
          value: toBase64(signatureBytes)
        }
      }
    };
  }

  async function verifyPackage(packageValue, options = {}) {
    const envelope = packageValue?.signatureEnvelope;
    if (!envelope || envelope.type !== TYPE) {
      return verificationResult(false, ["The package does not contain a supported Methodz signature envelope."]);
    }

    const errors = [];
    const publicKeyJwk = options.publicKeyJwk || envelope.publicKeyJwk;
    let derivedKeyId = "";
    let digest = "";
    let signatureValid = false;
    let digestMatches = false;
    let keyIdMatches = false;

    try {
      const normalizedPublic = normalizedPublicJwk(publicKeyJwk);
      derivedKeyId = await deriveKeyId(normalizedPublic);
      keyIdMatches = derivedKeyId === envelope.keyId;
      if (!keyIdMatches) errors.push("The embedded public key does not match the signature key ID.");

      const unsigned = unsignedPackage(packageValue);
      const canonicalPackage = canonicalize(unsigned);
      digest = await sha256Text(canonicalPackage);
      digestMatches = digest === envelope.payloadDigest?.digest;
      if (!digestMatches) errors.push("The package payload digest does not match the signed digest.");

      const signedMetadata = metadataFromEnvelope({ ...envelope, publicKeyJwk: normalizedPublic });
      const publicKey = await importPublicJwk(normalizedPublic);
      signatureValid = await assertCrypto().verify(
        SIGN_ALGORITHM,
        publicKey,
        fromBase64(envelope.signature?.value),
        encoder.encode(canonicalSigningPayload(unsigned, signedMetadata))
      );
      if (!signatureValid) errors.push("The ECDSA signature is invalid for the current package content or signature metadata.");
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
      payloadDigest: digest,
      expectedPayloadDigest: envelope.payloadDigest?.digest || "",
      packageType: packageValue?.packageType || "",
      errors,
      notice: "Verification confirms package and signature-metadata integrity against the included public key. It does not independently authenticate the signer identity, recipient, approval, or delivery."
    };
  }

  function verificationResult(valid, errors) {
    return {
      valid,
      signatureValid: false,
      digestMatches: false,
      keyIdMatches: false,
      keyId: "",
      derivedKeyId: "",
      signerLabel: "",
      keyLabel: "",
      signedAt: "",
      payloadDigest: "",
      expectedPayloadDigest: "",
      packageType: "",
      errors,
      notice: "Verification could not be completed."
    };
  }

  global.MethodzCryptoPackageV15 = {
    version: "1.5.0",
    signatureType: TYPE,
    isSupported: () => Boolean(global.crypto?.subtle),
    canonicalize,
    unsignedPackage,
    metadataFromEnvelope,
    canonicalSigningPayload,
    sha256Text,
    deriveKeyId,
    generateKeyPair,
    exportPrivateJwk,
    exportPublicJwk,
    importPrivateJwk,
    importPublicJwk,
    publicJwkFromPrivate,
    signPackage,
    verifyPackage
  };
})(window);
