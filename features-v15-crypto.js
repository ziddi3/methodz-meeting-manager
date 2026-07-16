/* Methodz Meeting Manager v1.5 explicit key management, package signing, and verification workspace. */
(function initializeMethodzCryptographicSigningV15(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const cryptoConfig = config.cryptographicSigning || {};
  const publicKeysKey = config.storageKeys?.signingPublicKeys || "methodzSigningPublicKeys";
  const auditKey = config.storageKeys?.signingAudit || "methodzSigningAudit";
  const recordsKey = config.storageKeys?.records || "methodzMeetingRecords";
  const archiveKey = config.storageKeys?.archivedRecords || "methodzArchivedMeetingRecords";
  let activePrivateJwk = null;
  let activePublicJwk = null;
  let loadedPackage = null;
  let lastVerification = null;

  global.addEventListener("DOMContentLoaded", initialize);

  function initialize() {
    installPanel();
    renderKeyRegistry();
    updateRuntimeStatus();
  }

  function core() {
    if (!global.MethodzCryptoPackageV15) throw new Error("The v1.5 cryptographic package core is unavailable.");
    return global.MethodzCryptoPackageV15;
  }

  function installPanel() {
    const anchor = document.getElementById("recipientPolicyPanelV14")
      || document.getElementById("externalApprovalPanelV12")
      || document.getElementById("savedRecords")?.closest(".card");
    if (!anchor || document.getElementById("cryptoSigningPanelV15")) return;

    const panel = document.createElement("section");
    panel.id = "cryptoSigningPanelV15";
    panel.className = "card v15-card crypto-signing-v15";
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Cryptographic Package Signing & Verification</h2>
          <p class="helper-text">Optionally sign exported JSON packages with ECDSA P-256. Private keys remain memory-only and are never written to browser storage by this app.</p>
        </div>
        <span class="release-badge-v15">v1.5</span>
      </div>

      <div id="cryptoRuntimeStatusV15" class="crypto-status-v15" aria-live="polite">Checking Web Crypto support...</div>

      <details open>
        <summary>1. Explicit Key Management</summary>
        <div class="form-grid">
          <div>
            <label for="cryptoSignerLabelV15">Signer Label</label>
            <input id="cryptoSignerLabelV15" type="text" placeholder="Person or controlled signing role" autocomplete="name" />
          </div>
          <div>
            <label for="cryptoKeyLabelV15">Key Label</label>
            <input id="cryptoKeyLabelV15" type="text" placeholder="Methodz export signing key" />
          </div>
          <div>
            <label for="cryptoPublicKeySelectV15">Public Key Registry</label>
            <select id="cryptoPublicKeySelectV15"><option value="">No public keys registered</option></select>
          </div>
        </div>
        <div class="button-row">
          <button type="button" onclick="generateSigningKeyV15()">Generate Key Pair in Memory</button>
          <button type="button" onclick="downloadPrivateSigningKeyV15()">Download Private Key Backup</button>
          <button type="button" onclick="downloadPublicSigningKeyV15()">Download Public Key</button>
          <button type="button" onclick="clearPrivateSigningKeyV15()">Clear Private Key from Memory</button>
          <button type="button" onclick="togglePublicSigningKeyV15()">Revoke / Restore Public Key</button>
          <button type="button" onclick="exportSigningKeyRegistryV15()">Export Public Key Registry</button>
          <button type="button" onclick="exportSigningAuditV15()">Export Signing Audit</button>
        </div>
        <div class="button-row">
          <label class="button-like" for="cryptoPrivateKeyFileV15">Import Private JWK</label>
          <label class="button-like" for="cryptoPublicKeyFileV15">Import Public JWK</label>
        </div>
        <input id="cryptoPrivateKeyFileV15" class="import-control" type="file" accept="application/json,.json" onchange="importPrivateSigningKeyV15(event)" />
        <input id="cryptoPublicKeyFileV15" class="import-control" type="file" accept="application/json,.json" onchange="importPublicSigningKeyV15(event)" />
        <p class="crypto-private-warning-v15"><strong>Private-key rule:</strong> keep the downloaded private JWK in a protected location. Anyone who obtains it can create signatures under that key ID. The browser registry stores public keys only.</p>
        <div id="cryptoKeyRegistryV15" class="crypto-key-registry-v15"></div>
      </details>

      <details open>
        <summary>2. Sign or Verify a JSON Package</summary>
        <div class="button-row">
          <label class="button-like" for="cryptoPackageFileV15">Choose JSON Package</label>
          <button type="button" onclick="signLoadedPackageV15()">Sign & Download JSON</button>
          <button type="button" onclick="verifyLoadedPackageV15()">Verify Loaded Package</button>
          <button type="button" onclick="downloadVerificationReportV15()">Download Verification Report</button>
          <button type="button" onclick="clearLoadedCryptoPackageV15()">Clear Loaded Package</button>
          <a class="button-like" href="verify.html" target="_blank" rel="noopener">Open Standalone Verifier</a>
        </div>
        <input id="cryptoPackageFileV15" class="import-control" type="file" accept="application/json,.json" onchange="loadCryptoPackageV15(event)" />
        <div id="cryptoPackageSummaryV15" class="crypto-package-summary-v15">No JSON package loaded.</div>
        <div id="cryptoVerificationResultV15" class="crypto-verification-v15" aria-live="polite">No verification has been run.</div>
      </details>
    `;

    anchor.insertAdjacentElement("afterend", panel);
    document.getElementById("cryptoPublicKeySelectV15")?.addEventListener("change", renderKeyRegistry);
  }

  async function generateSigningKey() {
    return run(async () => {
      assertSupported();
      const keyPair = await core().generateKeyPair();
      activePrivateJwk = await core().exportPrivateJwk(keyPair.privateKey);
      activePublicJwk = await core().exportPublicJwk(keyPair.publicKey);
      const entry = await registerPublicKey(activePublicJwk, {
        signerLabel: readValue("cryptoSignerLabelV15"),
        keyLabel: readValue("cryptoKeyLabelV15") || "Generated Methodz signing key",
        source: "generated"
      });
      appendAudit("key-pair-generated", { keyId: entry.id, keyLabel: entry.keyLabel, signerLabel: entry.signerLabel });
      setStatus(`Generated ${entry.id}. The private key exists only in memory until you download its backup.`, "ready");
      return entry;
    });
  }

  async function importPrivateSigningKey(event) {
    return run(async () => {
      const input = event?.target;
      const parsed = await readJsonFile(input?.files?.[0]);
      const jwk = parsed.privateKeyJwk || parsed.privateJwk || parsed.key || parsed;
      await core().importPrivateJwk(jwk);
      activePrivateJwk = jwk;
      activePublicJwk = parsed.publicKeyJwk || core().publicJwkFromPrivate(jwk);
      const entry = await registerPublicKey(activePublicJwk, {
        signerLabel: readValue("cryptoSignerLabelV15"),
        keyLabel: readValue("cryptoKeyLabelV15") || "Imported Methodz signing key",
        source: "private-jwk-import"
      });
      appendAudit("private-key-imported-to-memory", { keyId: entry.id, keyLabel: entry.keyLabel });
      setStatus(`Imported private key ${entry.id} into memory only.`, "ready");
      if (input) input.value = "";
      return entry;
    }, event?.target);
  }

  async function importPublicSigningKey(event) {
    return run(async () => {
      const input = event?.target;
      const parsed = await readJsonFile(input?.files?.[0]);
      const jwk = parsed.publicKeyJwk || parsed.publicJwk || parsed.key || parsed;
      await core().importPublicJwk(jwk);
      const entry = await registerPublicKey(jwk, {
        signerLabel: parsed.signerLabel || readValue("cryptoSignerLabelV15"),
        keyLabel: parsed.keyLabel || readValue("cryptoKeyLabelV15") || "Imported public verification key",
        source: "public-jwk-import"
      });
      appendAudit("public-key-imported", { keyId: entry.id, keyLabel: entry.keyLabel });
      setStatus(`Registered public key ${entry.id}.`, "ready");
      if (input) input.value = "";
      return entry;
    }, event?.target);
  }

  async function registerPublicKey(publicKeyJwk, metadata = {}) {
    const keyId = await core().deriveKeyId(publicKeyJwk);
    const entries = readPublicKeys();
    const existing = entries.find((item) => item.id === keyId);
    const now = new Date().toISOString();
    const entry = {
      id: keyId,
      keyLabel: String(metadata.keyLabel || existing?.keyLabel || "Methodz verification key").trim(),
      signerLabel: String(metadata.signerLabel || existing?.signerLabel || "").trim(),
      status: existing?.status || "Active",
      publicKeyJwk: clone(publicKeyJwk),
      source: metadata.source || existing?.source || "imported",
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      revokedAt: existing?.revokedAt || ""
    };
    const merged = entries.filter((item) => item.id !== keyId);
    merged.push(entry);
    writePublicKeys(merged);
    const select = document.getElementById("cryptoPublicKeySelectV15");
    if (select) select.value = keyId;
    renderKeyRegistry();
    return entry;
  }

  function downloadPrivateSigningKey() {
    return run(async () => {
      if (!activePrivateJwk) throw new Error("Generate or import a private key first.");
      const publicJwk = activePublicJwk || core().publicJwkFromPrivate(activePrivateJwk);
      const keyId = await core().deriveKeyId(publicJwk);
      downloadJson({
        packageType: "methodz-private-signing-key-backup",
        packageVersion: 1,
        keyId,
        keyLabel: readValue("cryptoKeyLabelV15"),
        signerLabel: readValue("cryptoSignerLabelV15"),
        privateKeyJwk: activePrivateJwk,
        publicKeyJwk: publicJwk,
        exportedAt: new Date().toISOString(),
        warning: "Sensitive private key material. Protect this file and do not send it with signed packages."
      }, `methodz-${safeName(keyId)}-PRIVATE-${today()}.json`);
      appendAudit("private-key-backup-downloaded", { keyId });
      setStatus(`Downloaded private-key backup for ${keyId}. Store it securely.`, "warning");
    });
  }

  function downloadPublicSigningKey() {
    return run(async () => {
      const entry = selectedPublicKey() || (activePublicJwk ? await registerPublicKey(activePublicJwk, {}) : null);
      if (!entry) throw new Error("Generate, import, or select a public key first.");
      downloadJson({
        packageType: "methodz-public-verification-key",
        packageVersion: 1,
        keyId: entry.id,
        keyLabel: entry.keyLabel,
        signerLabel: entry.signerLabel,
        status: entry.status,
        publicKeyJwk: entry.publicKeyJwk,
        exportedAt: new Date().toISOString(),
        notice: "Verify this public key identifier through an independent trusted channel before relying on signer identity."
      }, `methodz-${safeName(entry.id)}-PUBLIC-${today()}.json`);
      appendAudit("public-key-downloaded", { keyId: entry.id });
      setStatus(`Downloaded public verification key ${entry.id}.`, "ready");
    });
  }

  function clearPrivateSigningKey() {
    const keyIdPromise = activePublicJwk ? core().deriveKeyId(activePublicJwk) : Promise.resolve("");
    activePrivateJwk = null;
    activePublicJwk = null;
    keyIdPromise.then((keyId) => appendAudit("private-key-cleared-from-memory", { keyId })).catch(() => {});
    setStatus("Private key cleared from memory. Public registry entries were retained.", "ready");
  }

  function togglePublicSigningKey() {
    return run(async () => {
      const selected = selectedPublicKey();
      if (!selected) throw new Error("Select a public key first.");
      selected.status = selected.status === "Revoked" ? "Active" : "Revoked";
      selected.revokedAt = selected.status === "Revoked" ? new Date().toISOString() : "";
      selected.updatedAt = new Date().toISOString();
      const entries = readPublicKeys().map((entry) => entry.id === selected.id ? selected : entry);
      writePublicKeys(entries);
      appendAudit(selected.status === "Revoked" ? "public-key-revoked" : "public-key-restored", { keyId: selected.id });
      renderKeyRegistry();
      setStatus(`${selected.id} is now ${selected.status}. Revocation is browser-local workflow metadata.`, selected.status === "Revoked" ? "warning" : "ready");
    });
  }

  async function loadCryptoPackage(event) {
    return run(async () => {
      const input = event?.target;
      loadedPackage = await readJsonFile(input?.files?.[0]);
      lastVerification = null;
      renderPackageSummary();
      renderVerification();
      setStatus(`Loaded ${loadedPackage.packageType || "JSON package"}.`, "ready");
      return loadedPackage;
    }, event?.target);
  }

  function clearLoadedPackage() {
    loadedPackage = null;
    lastVerification = null;
    const input = document.getElementById("cryptoPackageFileV15");
    if (input) input.value = "";
    renderPackageSummary();
    renderVerification();
    setStatus("Loaded package cleared.", "ready");
  }

  function signLoadedPackage() {
    return run(async () => {
      assertSupported();
      if (!loadedPackage) throw new Error("Choose a JSON package to sign.");
      if (!activePrivateJwk) throw new Error("Generate or import a private key before signing.");
      const signerLabel = readValue("cryptoSignerLabelV15");
      const keyLabel = readValue("cryptoKeyLabelV15");
      if (!signerLabel) throw new Error("Enter a signer label before signing.");
      if (!keyLabel) throw new Error("Enter a key label before signing.");

      const signed = await core().signPackage(loadedPackage, activePrivateJwk, {
        publicKeyJwk: activePublicJwk,
        signerLabel,
        keyLabel
      });
      loadedPackage = signed;
      lastVerification = await core().verifyPackage(signed);
      const keyEntry = readPublicKeys().find((entry) => entry.id === signed.signatureEnvelope.keyId);
      if (keyEntry?.status === "Revoked") throw new Error("The matching public key is marked revoked. Restore or replace the key before signing.");

      downloadJson(signed, signedFilename(signed));
      updateSourceSignatureMetadata(signed);
      appendAudit("package-signed", {
        keyId: signed.signatureEnvelope.keyId,
        packageType: signed.packageType || "",
        sourceReference: clone(signed.manifest?.sourceReference || {}),
        payloadDigest: signed.signatureEnvelope.payloadDigest?.digest || ""
      });
      renderPackageSummary();
      renderVerification();
      setStatus(`Signed and downloaded package with ${signed.signatureEnvelope.keyId}.`, "ready");
      return signed;
    });
  }

  function verifyLoadedPackage() {
    return run(async () => {
      assertSupported();
      if (!loadedPackage) throw new Error("Choose a signed JSON package to verify.");
      lastVerification = await core().verifyPackage(loadedPackage);
      const registryEntry = readPublicKeys().find((entry) => entry.id === lastVerification.keyId);
      lastVerification.registryStatus = registryEntry?.status || "Not registered";
      lastVerification.registryKeyLabel = registryEntry?.keyLabel || "";
      lastVerification.verifiedAt = new Date().toISOString();
      if (registryEntry?.status === "Revoked") {
        lastVerification.valid = false;
        lastVerification.errors.push("The matching public key is marked revoked in this browser registry.");
      }
      appendAudit("package-verified", {
        keyId: lastVerification.keyId,
        valid: lastVerification.valid,
        packageType: lastVerification.packageType,
        errors: lastVerification.errors
      });
      renderVerification();
      setStatus(lastVerification.valid ? "Signature verified successfully." : "Signature verification failed.", lastVerification.valid ? "ready" : "error");
      return lastVerification;
    });
  }

  function downloadVerificationReport() {
    if (!lastVerification) return handleError(new Error("Run verification before downloading a report."));
    downloadJson({
      packageType: "methodz-signature-verification-report",
      packageVersion: 1,
      generatedAt: new Date().toISOString(),
      sourcePackage: {
        packageType: loadedPackage?.packageType || "",
        sourceReference: clone(loadedPackage?.manifest?.sourceReference || {}),
        approvalId: loadedPackage?.approval?.approvalId || ""
      },
      verification: lastVerification
    }, `methodz-signature-verification-${today()}.json`);
    setStatus("Verification report downloaded.", "ready");
  }

  function exportSigningKeyRegistry() {
    downloadJson({
      packageType: "methodz-public-key-registry",
      packageVersion: 1,
      exportedAt: new Date().toISOString(),
      privateKeysIncluded: false,
      keys: readPublicKeys(),
      notice: "Public keys and browser-local lifecycle metadata only. No private key material is included."
    }, `methodz-public-key-registry-${today()}.json`);
  }

  function exportSigningAudit() {
    downloadJson({
      packageType: "methodz-signing-audit",
      packageVersion: 1,
      exportedAt: new Date().toISOString(),
      events: readAudit(),
      notice: "Browser-local audit history. This is not an immutable or authenticated audit ledger."
    }, `methodz-signing-audit-${today()}.json`);
  }

  function updateSourceSignatureMetadata(signedPackage) {
    const sourceId = signedPackage?.manifest?.sourceReference?.id || "";
    if (!sourceId) return;
    const signedAt = signedPackage.signatureEnvelope?.signedAt || new Date().toISOString();
    const keyId = signedPackage.signatureEnvelope?.keyId || "";
    const update = (record) => record?.id !== sourceId ? record : {
      ...record,
      externalSignatureControl: {
        ...(record.externalSignatureControl || {}),
        optional: true,
        lastSignedPackageAt: signedAt,
        lastSigningKeyId: keyId,
        lastSignatureAlgorithm: signedPackage.signatureEnvelope?.type || "",
        lastVerificationAt: lastVerification?.valid ? lastVerification.verifiedAt || new Date().toISOString() : ""
      }
    };

    const active = readJson(recordsKey, []);
    if (active.some((record) => record?.id === sourceId)) {
      global.localStorage.setItem(recordsKey, JSON.stringify(active.map(update)));
      if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
      return;
    }
    const archived = readJson(archiveKey, []);
    if (archived.some((entry) => entry?.record?.id === sourceId)) {
      global.localStorage.setItem(archiveKey, JSON.stringify(archived.map((entry) => entry?.record?.id === sourceId ? { ...entry, record: update(entry.record) } : entry)));
    }
  }

  function readPublicKeys() {
    return readJson(publicKeysKey, []).filter((entry) => entry?.id && entry?.publicKeyJwk);
  }

  function writePublicKeys(entries) {
    const maximum = Number(cryptoConfig.maximumPublicKeys || 200);
    global.localStorage.setItem(publicKeysKey, JSON.stringify(entries.slice(-maximum)));
    renderKeyRegistry();
  }

  function selectedPublicKey() {
    const id = readValue("cryptoPublicKeySelectV15");
    return readPublicKeys().find((entry) => entry.id === id) || null;
  }

  function renderKeyRegistry() {
    const entries = readPublicKeys().sort((left, right) => String(left.keyLabel).localeCompare(String(right.keyLabel)));
    const select = document.getElementById("cryptoPublicKeySelectV15");
    if (select) {
      const current = select.value;
      select.innerHTML = entries.length
        ? entries.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.status)} • ${escapeHtml(entry.keyLabel)} • ${escapeHtml(entry.id)}</option>`).join("")
        : '<option value="">No public keys registered</option>';
      if (entries.some((entry) => entry.id === current)) select.value = current;
    }

    const list = document.getElementById("cryptoKeyRegistryV15");
    if (!list) return;
    if (!entries.length) {
      list.innerHTML = '<p class="helper-text">No public verification keys are registered in this browser.</p>';
      return;
    }
    const selected = selectedPublicKey() || entries[0];
    if (select && !select.value) select.value = selected.id;
    list.innerHTML = `<article class="crypto-key-card-v15" data-status="${escapeHtml(selected.status.toLowerCase())}">
      <div><strong>${escapeHtml(selected.keyLabel)}</strong><span>${escapeHtml(selected.status)}</span></div>
      <dl>
        <dt>Key ID</dt><dd><code>${escapeHtml(selected.id)}</code></dd>
        <dt>Signer label</dt><dd>${escapeHtml(selected.signerLabel || "Not recorded")}</dd>
        <dt>Source</dt><dd>${escapeHtml(selected.source || "")}</dd>
        <dt>Created</dt><dd>${escapeHtml(formatDateTime(selected.createdAt))}</dd>
        <dt>Revoked</dt><dd>${escapeHtml(selected.revokedAt ? formatDateTime(selected.revokedAt) : "No")}</dd>
      </dl>
    </article>`;
  }

  function renderPackageSummary() {
    const element = document.getElementById("cryptoPackageSummaryV15");
    if (!element) return;
    if (!loadedPackage) {
      element.textContent = "No JSON package loaded.";
      return;
    }
    const source = loadedPackage.manifest?.sourceReference || {};
    const signature = loadedPackage.signatureEnvelope;
    element.innerHTML = `<strong>${escapeHtml(loadedPackage.packageType || "JSON package")}</strong>
      <span>${escapeHtml(source.title || loadedPackage.record?.title || "Untitled package")}</span>
      <span>${signature ? `Signed by ${escapeHtml(signature.signerLabel || "unlabeled signer")} with ${escapeHtml(signature.keyId || "unknown key")}` : "Unsigned"}</span>`;
  }

  function renderVerification() {
    const element = document.getElementById("cryptoVerificationResultV15");
    if (!element) return;
    if (!lastVerification) {
      element.textContent = "No verification has been run.";
      element.dataset.state = "";
      return;
    }
    element.dataset.state = lastVerification.valid ? "valid" : "invalid";
    element.innerHTML = `<h3>${lastVerification.valid ? "Valid Signature" : "Invalid Signature"}</h3>
      <dl>
        <dt>Key ID</dt><dd><code>${escapeHtml(lastVerification.keyId || "Unavailable")}</code></dd>
        <dt>Signer label</dt><dd>${escapeHtml(lastVerification.signerLabel || "Not recorded")}</dd>
        <dt>Signed at</dt><dd>${escapeHtml(formatDateTime(lastVerification.signedAt) || "Not recorded")}</dd>
        <dt>Signature</dt><dd>${lastVerification.signatureValid ? "Valid" : "Invalid"}</dd>
        <dt>Payload digest</dt><dd>${lastVerification.digestMatches ? "Matches" : "Mismatch"}</dd>
        <dt>Public key ID</dt><dd>${lastVerification.keyIdMatches ? "Matches" : "Mismatch"}</dd>
        <dt>Registry status</dt><dd>${escapeHtml(lastVerification.registryStatus || "Not checked")}</dd>
      </dl>
      ${lastVerification.errors?.length ? `<ul>${lastVerification.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>` : ""}
      <p>${escapeHtml(lastVerification.notice || "")}</p>`;
  }

  function updateRuntimeStatus() {
    const supported = Boolean(global.MethodzCryptoPackageV15?.isSupported());
    setStatus(
      supported
        ? "Web Crypto is available. Signing keys use ECDSA P-256 with SHA-256. Private keys remain memory-only."
        : "Web Crypto is unavailable. Core meeting workflows remain available, but package signing and verification are disabled.",
      supported ? "ready" : "warning"
    );
  }

  function assertSupported() {
    if (!core().isSupported()) throw new Error("Web Crypto is unavailable in this browser context. Use HTTPS or localhost for cryptographic operations.");
  }

  function appendAudit(action, details = {}) {
    const events = readAudit();
    events.push({
      id: `signing-audit-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      occurredAt: new Date().toISOString(),
      ...clone(details)
    });
    const maximum = Number(cryptoConfig.maximumAuditEvents || 2000);
    global.localStorage.setItem(auditKey, JSON.stringify(events.slice(-maximum)));
  }

  function readAudit() {
    return readJson(auditKey, []);
  }

  async function readJsonFile(file) {
    if (!file) throw new Error("Choose a JSON file first.");
    return JSON.parse(await file.text());
  }

  function readJson(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) ?? fallback);
    } catch (error) {
      console.warn(`Unable to read ${key}`, error);
      return fallback;
    }
  }

  function downloadJson(value, filename) {
    if (typeof global.downloadBlob === "function") {
      global.downloadBlob(JSON.stringify(value, null, 2), filename, "application/json");
      return;
    }
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function signedFilename(packageValue) {
    const source = packageValue.manifest?.sourceReference || {};
    const base = source.meetingNumber || source.title || packageValue.packageType || "package";
    return `methodz-${safeName(base)}-signed-${today()}.json`;
  }

  async function run(operation, input) {
    try {
      return await operation();
    } catch (error) {
      return handleError(error);
    } finally {
      if (input) input.value = "";
    }
  }

  function handleError(error) {
    const message = error?.message || String(error);
    setStatus(message, "error");
    alert(message);
    return null;
  }

  function setStatus(message, state) {
    const element = document.getElementById("cryptoRuntimeStatusV15");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state || "";
  }

  function readValue(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function safeName(value) {
    return String(value || "package").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "package";
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  global.generateSigningKeyV15 = generateSigningKey;
  global.importPrivateSigningKeyV15 = importPrivateSigningKey;
  global.importPublicSigningKeyV15 = importPublicSigningKey;
  global.downloadPrivateSigningKeyV15 = downloadPrivateSigningKey;
  global.downloadPublicSigningKeyV15 = downloadPublicSigningKey;
  global.clearPrivateSigningKeyV15 = clearPrivateSigningKey;
  global.togglePublicSigningKeyV15 = togglePublicSigningKey;
  global.loadCryptoPackageV15 = loadCryptoPackage;
  global.clearLoadedCryptoPackageV15 = clearLoadedPackage;
  global.signLoadedPackageV15 = signLoadedPackage;
  global.verifyLoadedPackageV15 = verifyLoadedPackage;
  global.downloadVerificationReportV15 = downloadVerificationReport;
  global.exportSigningKeyRegistryV15 = exportSigningKeyRegistry;
  global.exportSigningAuditV15 = exportSigningAudit;
  global.MethodzCryptographicSigningV15 = {
    version: "1.5.0",
    readPublicKeys,
    readAudit,
    registerPublicKey,
    signPackage: (...args) => core().signPackage(...args),
    verifyPackage: (...args) => core().verifyPackage(...args)
  };
})(window);
