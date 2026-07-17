/* Methodz Meeting Manager v1.6 cryptographic package workspace. */
(function initializeMethodzCryptographicWorkspaceV16(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const publicKeysKey = config.storageKeys?.signingPublicKeys || "methodzSigningPublicKeys";
  const auditKey = config.storageKeys?.signingAudit || "methodzSigningAudit";
  const recordsKey = config.storageKeys?.records || "methodzMeetingRecords";
  const archiveKey = config.storageKeys?.archivedRecords || "methodzArchivedMeetingRecords";
  const maximumKeys = Number(config.cryptographicSigning?.maximumPublicKeys || 200);
  const maximumAudit = Number(config.cryptographicSigning?.maximumAuditEvents || 2000);

  let privateJwk = null;
  let publicJwk = null;
  let loadedPackage = null;
  let verification = null;

  global.addEventListener("DOMContentLoaded", initialize);

  function core() {
    if (!global.MethodzCryptoPackageV16) throw new Error("The v1.6 cryptographic package core is unavailable.");
    return global.MethodzCryptoPackageV16;
  }

  function initialize() {
    installPanel();
    sanitizeRegistry();
    renderRegistry();
    renderPackage();
    renderVerification();
    setStatus(
      core().isSupported()
        ? "Web Crypto is available. Private signing keys remain in this page memory only."
        : "Web Crypto is unavailable. Meeting workflows remain usable, but package signing and verification are disabled.",
      core().isSupported() ? "ready" : "warning"
    );
  }

  function installPanel() {
    if (document.getElementById("cryptoSigningPanelV16")) return;
    const anchor = document.getElementById("policyOperationsPanelV15")
      || document.getElementById("recipientPolicyPanelV14")
      || document.getElementById("savedRecords")?.closest(".card");
    if (!anchor) return;

    const panel = document.createElement("section");
    panel.id = "cryptoSigningPanelV16";
    panel.className = "card crypto-signing-v16";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <p class="eyebrow">Package Integrity</p>
          <h2>Cryptographic Signing & Verification</h2>
          <p class="helper-text">Optionally sign approved JSON packages with ECDSA P-256. This does not replace recipient policy, redaction, approval, release receipts, retention, or legal holds.</p>
        </div>
        <span class="release-badge-v16">v1.6</span>
      </div>
      <div id="cryptoStatusV16" class="crypto-status-v16" aria-live="polite"></div>

      <details open>
        <summary>Signing Key Management</summary>
        <div class="form-grid">
          <div>
            <label for="cryptoSignerLabelV16">Signer Label</label>
            <input id="cryptoSignerLabelV16" type="text" placeholder="Person or controlled signing role" />
          </div>
          <div>
            <label for="cryptoKeyLabelV16">Key Label</label>
            <input id="cryptoKeyLabelV16" type="text" placeholder="Methodz package signing key" />
          </div>
          <div>
            <label for="cryptoPublicKeySelectV16">Public Verification Key</label>
            <select id="cryptoPublicKeySelectV16"><option value="">No public keys registered</option></select>
          </div>
        </div>
        <div class="button-row">
          <button type="button" onclick="generateCryptoKeyV16()">Generate Key Pair</button>
          <label class="button-like" for="cryptoPrivateKeyFileV16">Import Private JWK</label>
          <label class="button-like" for="cryptoPublicKeyFileV16">Import Public JWK</label>
          <button type="button" onclick="downloadPrivateKeyV16()">Download Private Backup</button>
          <button type="button" onclick="downloadPublicKeyV16()">Download Public Key</button>
          <button type="button" onclick="clearPrivateKeyV16()">Clear Private Key</button>
          <button type="button" onclick="togglePublicKeyStatusV16()">Revoke / Restore Key</button>
          <button type="button" onclick="exportPublicKeyRegistryV16()">Export Public Registry</button>
          <button type="button" onclick="exportSigningAuditV16()">Export Signing Audit</button>
        </div>
        <input id="cryptoPrivateKeyFileV16" class="import-control" type="file" accept="application/json,.json" onchange="importPrivateKeyV16(event)" />
        <input id="cryptoPublicKeyFileV16" class="import-control" type="file" accept="application/json,.json" onchange="importPublicKeyV16(event)" />
        <p class="crypto-warning-v16"><strong>Sensitive key rule:</strong> anyone with the private-key backup can create signatures under that key ID. Store it separately from signed packages. The app never saves private JWK material to browser storage.</p>
        <div id="cryptoKeySummaryV16" class="crypto-key-summary-v16"></div>
      </details>

      <details open>
        <summary>Sign or Verify a JSON Package</summary>
        <div class="button-row">
          <label class="button-like" for="cryptoPackageFileV16">Choose JSON Package</label>
          <button type="button" onclick="signPackageV16()">Sign & Download</button>
          <button type="button" onclick="verifyPackageV16()">Verify Package</button>
          <button type="button" onclick="downloadVerificationReportV16()">Download Verification Report</button>
          <button type="button" onclick="clearCryptoPackageV16()">Clear Package</button>
          <a class="button-like" href="verify.html" target="_blank" rel="noopener">Open Standalone Verifier</a>
        </div>
        <input id="cryptoPackageFileV16" class="import-control" type="file" accept="application/json,.json" onchange="loadCryptoPackageV16(event)" />
        <div id="cryptoPackageSummaryV16" class="crypto-package-summary-v16"></div>
        <div id="cryptoVerificationV16" class="crypto-verification-v16" aria-live="polite"></div>
      </details>
    `;
    anchor.insertAdjacentElement("afterend", panel);
    document.getElementById("cryptoPublicKeySelectV16")?.addEventListener("change", renderRegistry);
  }

  async function generateKey() {
    return safely(async () => {
      const pair = await core().generateKeyPair();
      privateJwk = await core().exportPrivateJwk(pair.privateKey);
      publicJwk = await core().exportPublicJwk(pair.publicKey);
      const entry = await registerPublicKey(publicJwk, "generated");
      appendAudit("key-pair-generated", { keyId: entry.id });
      setStatus(`Generated ${entry.id}. Download the private backup before leaving this page.`, "warning");
      return entry;
    });
  }

  async function importPrivate(event) {
    const input = event?.target;
    return safely(async () => {
      const parsed = await readFile(input?.files?.[0]);
      const candidate = parsed.privateKeyJwk || parsed.privateJwk || parsed.key || parsed;
      await core().importPrivateJwk(candidate);
      privateJwk = candidate;
      publicJwk = core().normalizePublicJwk(parsed.publicKeyJwk || parsed.publicJwk || candidate);
      const entry = await registerPublicKey(publicJwk, "private-jwk-import", parsed);
      appendAudit("private-key-imported-to-memory", { keyId: entry.id });
      setStatus(`Imported ${entry.id} into page memory only.`, "ready");
      return entry;
    }, input);
  }

  async function importPublic(event) {
    const input = event?.target;
    return safely(async () => {
      const parsed = await readFile(input?.files?.[0]);
      const candidate = parsed.publicKeyJwk || parsed.publicJwk || parsed.key || parsed;
      const normalized = core().normalizePublicJwk(candidate);
      await core().importPublicJwk(normalized);
      const entry = await registerPublicKey(normalized, "public-jwk-import", parsed);
      appendAudit("public-key-imported", { keyId: entry.id });
      setStatus(`Registered public key ${entry.id}.`, "ready");
      return entry;
    }, input);
  }

  async function registerPublicKey(jwk, source, metadata = {}) {
    const normalized = core().normalizePublicJwk(jwk);
    const id = await core().deriveKeyId(normalized);
    const entries = readRegistry();
    const existing = entries.find((entry) => entry.id === id);
    const now = new Date().toISOString();
    const entry = {
      id,
      keyLabel: String(metadata.keyLabel || value("cryptoKeyLabelV16") || existing?.keyLabel || "Methodz verification key").trim(),
      signerLabel: String(metadata.signerLabel || value("cryptoSignerLabelV16") || existing?.signerLabel || "").trim(),
      status: existing?.status || "Active",
      publicKeyJwk: normalized,
      source,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      revokedAt: existing?.revokedAt || ""
    };
    writeRegistry([...entries.filter((item) => item.id !== id), entry]);
    const select = document.getElementById("cryptoPublicKeySelectV16");
    if (select) select.value = id;
    renderRegistry();
    return entry;
  }

  function clearPrivate() {
    privateJwk = null;
    publicJwk = null;
    appendAudit("private-key-cleared-from-memory", {});
    setStatus("Private key cleared from page memory. Public registry entries remain available for verification.", "ready");
  }

  async function downloadPrivate() {
    return safely(async () => {
      if (!privateJwk) throw new Error("Generate or import a private key first.");
      const publicKey = publicJwk || core().publicJwkFromPrivate(privateJwk);
      const keyId = await core().deriveKeyId(publicKey);
      downloadJson({
        packageType: "methodz-private-signing-key-backup",
        packageVersion: 1,
        keyId,
        signerLabel: value("cryptoSignerLabelV16"),
        keyLabel: value("cryptoKeyLabelV16"),
        privateKeyJwk: privateJwk,
        publicKeyJwk: core().normalizePublicJwk(publicKey),
        exportedAt: new Date().toISOString(),
        warning: "Sensitive private key material. Protect this file and never distribute it with signed packages."
      }, `methodz-${safeName(keyId)}-PRIVATE-${today()}.json`);
      appendAudit("private-key-backup-downloaded", { keyId });
      setStatus(`Private backup downloaded for ${keyId}. Protect it carefully.`, "warning");
    });
  }

  function selectedKey() {
    const id = value("cryptoPublicKeySelectV16");
    return readRegistry().find((entry) => entry.id === id) || null;
  }

  async function downloadPublic() {
    return safely(async () => {
      const entry = selectedKey();
      if (!entry) throw new Error("Select a public key first.");
      downloadJson({
        packageType: "methodz-public-verification-key",
        packageVersion: 1,
        keyId: entry.id,
        signerLabel: entry.signerLabel,
        keyLabel: entry.keyLabel,
        status: entry.status,
        publicKeyJwk: core().normalizePublicJwk(entry.publicKeyJwk),
        exportedAt: new Date().toISOString(),
        notice: "Confirm this key ID through an independent trusted channel before relying on signer identity."
      }, `methodz-${safeName(entry.id)}-PUBLIC-${today()}.json`);
      appendAudit("public-key-downloaded", { keyId: entry.id });
    });
  }

  function toggleKeyStatus() {
    return safely(async () => {
      const selected = selectedKey();
      if (!selected) throw new Error("Select a public key first.");
      const status = selected.status === "Revoked" ? "Active" : "Revoked";
      writeRegistry(readRegistry().map((entry) => entry.id === selected.id ? {
        ...entry,
        status,
        revokedAt: status === "Revoked" ? new Date().toISOString() : "",
        updatedAt: new Date().toISOString()
      } : entry));
      appendAudit(status === "Revoked" ? "public-key-revoked" : "public-key-restored", { keyId: selected.id });
      renderRegistry();
      setStatus(`${selected.id} is now ${status}. This status is browser-local workflow metadata.`, status === "Revoked" ? "warning" : "ready");
    });
  }

  async function loadPackage(event) {
    const input = event?.target;
    return safely(async () => {
      loadedPackage = await readFile(input?.files?.[0]);
      verification = null;
      renderPackage();
      renderVerification();
      setStatus(`Loaded ${loadedPackage.packageType || "JSON package"}.`, "ready");
      return loadedPackage;
    }, input);
  }

  function clearPackage() {
    loadedPackage = null;
    verification = null;
    const input = document.getElementById("cryptoPackageFileV16");
    if (input) input.value = "";
    renderPackage();
    renderVerification();
  }

  async function signLoadedPackage() {
    return safely(async () => {
      if (!loadedPackage) throw new Error("Choose a JSON package to sign.");
      if (!privateJwk) throw new Error("Generate or import a private key before signing.");
      const signerLabel = value("cryptoSignerLabelV16");
      const keyLabel = value("cryptoKeyLabelV16");
      if (!signerLabel || !keyLabel) throw new Error("Enter both signer and key labels before signing.");

      const signed = await core().signPackage(loadedPackage, privateJwk, { publicKeyJwk: publicJwk, signerLabel, keyLabel });
      const registryEntry = readRegistry().find((entry) => entry.id === signed.signatureEnvelope.keyId);
      if (registryEntry?.status === "Revoked") throw new Error("The matching public key is marked revoked in this browser registry.");

      verification = await core().verifyPackage(signed);
      verification.verifiedAt = new Date().toISOString();
      loadedPackage = signed;
      downloadJson(signed, signedFilename(signed));
      updateSourceMetadata(signed, verification);
      appendAudit("package-signed", {
        keyId: signed.signatureEnvelope.keyId,
        packageType: signed.packageType || "",
        payloadDigest: signed.signatureEnvelope.payloadDigest.digest,
        sourceReference: clone(signed.manifest?.sourceReference || {})
      });
      renderPackage();
      renderVerification();
      setStatus(`Signed and downloaded with ${signed.signatureEnvelope.keyId}.`, "ready");
      return signed;
    });
  }

  async function verifyLoadedPackage() {
    return safely(async () => {
      if (!loadedPackage) throw new Error("Choose a signed JSON package to verify.");
      verification = await core().verifyPackage(loadedPackage);
      verification.verifiedAt = new Date().toISOString();
      const registryEntry = readRegistry().find((entry) => entry.id === verification.keyId);
      verification.registryStatus = registryEntry?.status || "Not registered";
      if (registryEntry?.status === "Revoked") {
        verification.valid = false;
        verification.errors.push("The matching public key is marked revoked in this browser registry.");
      }
      appendAudit("package-verified", { keyId: verification.keyId, valid: verification.valid, errors: verification.errors });
      renderVerification();
      setStatus(verification.valid ? "Signature verified successfully." : "Signature verification failed.", verification.valid ? "ready" : "error");
      return verification;
    });
  }

  function downloadVerificationReport() {
    return safely(async () => {
      if (!verification) throw new Error("Run verification before downloading a report.");
      downloadJson({
        packageType: "methodz-signature-verification-report",
        packageVersion: 1,
        generatedAt: new Date().toISOString(),
        sourcePackage: {
          packageType: loadedPackage?.packageType || "",
          sourceReference: clone(loadedPackage?.manifest?.sourceReference || {}),
          approvalId: loadedPackage?.approval?.approvalId || ""
        },
        verification
      }, `methodz-signature-verification-${today()}.json`);
    });
  }

  function updateSourceMetadata(packageValue, result) {
    const sourceId = packageValue?.manifest?.sourceReference?.id || "";
    if (!sourceId) return;
    const apply = (record) => record?.id !== sourceId ? record : {
      ...record,
      externalSignatureControl: {
        ...(record.externalSignatureControl || {}),
        optional: true,
        lastSignedPackageAt: packageValue.signatureEnvelope.signedAt,
        lastSigningKeyId: packageValue.signatureEnvelope.keyId,
        lastSignatureAlgorithm: packageValue.signatureEnvelope.type,
        lastVerificationAt: result?.valid ? result.verifiedAt || new Date().toISOString() : ""
      }
    };

    const active = readJson(recordsKey, []);
    if (active.some((record) => record?.id === sourceId)) {
      global.localStorage.setItem(recordsKey, JSON.stringify(active.map(apply)));
      if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
      return;
    }
    const archived = readJson(archiveKey, []);
    if (archived.some((entry) => entry?.record?.id === sourceId)) {
      global.localStorage.setItem(archiveKey, JSON.stringify(archived.map((entry) => entry?.record?.id === sourceId ? { ...entry, record: apply(entry.record) } : entry)));
    }
  }

  function readRegistry() {
    const raw = readJson(publicKeysKey, []);
    const seen = new Set();
    return (Array.isArray(raw) ? raw : []).map((entry) => {
      try {
        if (!entry?.id || !entry.publicKeyJwk) return null;
        return { ...entry, publicKeyJwk: core().normalizePublicJwk(entry.publicKeyJwk) };
      } catch (error) {
        return null;
      }
    }).filter((entry) => {
      if (!entry || seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    });
  }

  function writeRegistry(entries) {
    const safeEntries = entries.slice(-maximumKeys).map((entry) => ({
      ...entry,
      publicKeyJwk: core().normalizePublicJwk(entry.publicKeyJwk)
    }));
    global.localStorage.setItem(publicKeysKey, JSON.stringify(safeEntries));
    renderRegistry();
  }

  function sanitizeRegistry() {
    const original = readJson(publicKeysKey, []);
    const safe = readRegistry();
    if (JSON.stringify(original) !== JSON.stringify(safe)) {
      global.localStorage.setItem(publicKeysKey, JSON.stringify(safe));
      appendAudit("public-key-registry-sanitized", { previousCount: Array.isArray(original) ? original.length : 0, retainedCount: safe.length });
    }
  }

  function renderRegistry() {
    const entries = readRegistry();
    const select = document.getElementById("cryptoPublicKeySelectV16");
    const summary = document.getElementById("cryptoKeySummaryV16");
    if (!select || !summary) return;
    const current = select.value;
    select.innerHTML = entries.length
      ? entries.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.status)} • ${escapeHtml(entry.keyLabel)} • ${escapeHtml(entry.id)}</option>`).join("")
      : '<option value="">No public keys registered</option>';
    if (entries.some((entry) => entry.id === current)) select.value = current;
    const selected = entries.find((entry) => entry.id === select.value) || entries[0];
    if (!selected) {
      summary.innerHTML = '<p class="helper-text">No public verification keys are registered in this browser.</p>';
      return;
    }
    select.value = selected.id;
    summary.innerHTML = `<dl>
      <dt>Key ID</dt><dd><code>${escapeHtml(selected.id)}</code></dd>
      <dt>Key label</dt><dd>${escapeHtml(selected.keyLabel || "")}</dd>
      <dt>Signer label</dt><dd>${escapeHtml(selected.signerLabel || "Not recorded")}</dd>
      <dt>Status</dt><dd>${escapeHtml(selected.status || "Active")}</dd>
      <dt>Created</dt><dd>${escapeHtml(formatDate(selected.createdAt))}</dd>
    </dl>`;
  }

  function renderPackage() {
    const element = document.getElementById("cryptoPackageSummaryV16");
    if (!element) return;
    if (!loadedPackage) {
      element.textContent = "No JSON package loaded.";
      return;
    }
    const source = loadedPackage.manifest?.sourceReference || {};
    const signature = loadedPackage.signatureEnvelope;
    element.innerHTML = `<strong>${escapeHtml(loadedPackage.packageType || "JSON package")}</strong>
      <span>${escapeHtml(source.title || loadedPackage.record?.title || "Untitled package")}</span>
      <span>${signature ? `Signed with ${escapeHtml(signature.keyId || "unknown key")}` : "Unsigned"}</span>`;
  }

  function renderVerification() {
    const element = document.getElementById("cryptoVerificationV16");
    if (!element) return;
    if (!verification) {
      element.textContent = "No verification has been run.";
      element.dataset.state = "";
      return;
    }
    element.dataset.state = verification.valid ? "valid" : "invalid";
    element.innerHTML = `<h3>${verification.valid ? "Valid Signature" : "Invalid Signature"}</h3>
      <dl>
        <dt>Key ID</dt><dd><code>${escapeHtml(verification.keyId || "Unavailable")}</code></dd>
        <dt>Signer label</dt><dd>${escapeHtml(verification.signerLabel || "Not recorded")}</dd>
        <dt>Signed at</dt><dd>${escapeHtml(formatDate(verification.signedAt))}</dd>
        <dt>Signature</dt><dd>${verification.signatureValid ? "Valid" : "Invalid"}</dd>
        <dt>Payload digest</dt><dd>${verification.digestMatches ? "Matches" : "Mismatch"}</dd>
        <dt>Public key ID</dt><dd>${verification.keyIdMatches ? "Matches" : "Mismatch"}</dd>
        <dt>Registry status</dt><dd>${escapeHtml(verification.registryStatus || "Not checked")}</dd>
      </dl>
      ${verification.errors?.length ? `<ul>${verification.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>` : ""}
      <p>${escapeHtml(verification.notice || "")}</p>`;
  }

  function exportRegistry() {
    downloadJson({
      packageType: "methodz-public-key-registry",
      packageVersion: 1,
      exportedAt: new Date().toISOString(),
      privateKeysIncluded: false,
      keys: readRegistry(),
      notice: "Public keys and browser-local lifecycle metadata only."
    }, `methodz-public-key-registry-${today()}.json`);
  }

  function exportAudit() {
    downloadJson({
      packageType: "methodz-signing-audit",
      packageVersion: 1,
      exportedAt: new Date().toISOString(),
      events: readAudit(),
      notice: "Browser-local workflow history, not an immutable authenticated ledger."
    }, `methodz-signing-audit-${today()}.json`);
  }

  function readAudit() {
    const value = readJson(auditKey, []);
    return Array.isArray(value) ? value : [];
  }

  function appendAudit(action, details) {
    const events = readAudit();
    events.push({ id: `crypto-${Date.now()}-${Math.random().toString(16).slice(2)}`, action, occurredAt: new Date().toISOString(), ...clone(details || {}) });
    global.localStorage.setItem(auditKey, JSON.stringify(events.slice(-maximumAudit)));
  }

  async function readFile(file) {
    if (!file) throw new Error("Choose a JSON file first.");
    return JSON.parse(await file.text());
  }

  function readJson(key, fallback) {
    try {
      const raw = global.localStorage.getItem(key);
      return raw == null ? fallback : (JSON.parse(raw) ?? fallback);
    } catch (error) {
      console.warn(`Unable to read ${key}.`, error);
      return fallback;
    }
  }

  function downloadJson(data, filename) {
    const content = JSON.stringify(data, null, 2);
    if (typeof global.downloadBlob === "function") {
      global.downloadBlob(content, filename, "application/json");
      return;
    }
    const blob = new Blob([content], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function safely(operation, input) {
    try {
      return await operation();
    } catch (error) {
      const message = error?.message || String(error);
      setStatus(message, "error");
      alert(message);
      return null;
    } finally {
      if (input) input.value = "";
    }
  }

  function setStatus(message, state) {
    const element = document.getElementById("cryptoStatusV16");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state || "";
  }

  function value(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function signedFilename(packageValue) {
    const source = packageValue.manifest?.sourceReference || {};
    return `methodz-${safeName(source.meetingNumber || source.title || packageValue.packageType || "package")}-signed-${today()}.json`;
  }

  function safeName(value) {
    return String(value || "package").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "package";
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function formatDate(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  global.generateCryptoKeyV16 = generateKey;
  global.importPrivateKeyV16 = importPrivate;
  global.importPublicKeyV16 = importPublic;
  global.downloadPrivateKeyV16 = downloadPrivate;
  global.downloadPublicKeyV16 = downloadPublic;
  global.clearPrivateKeyV16 = clearPrivate;
  global.togglePublicKeyStatusV16 = toggleKeyStatus;
  global.loadCryptoPackageV16 = loadPackage;
  global.clearCryptoPackageV16 = clearPackage;
  global.signPackageV16 = signLoadedPackage;
  global.verifyPackageV16 = verifyLoadedPackage;
  global.downloadVerificationReportV16 = downloadVerificationReport;
  global.exportPublicKeyRegistryV16 = exportRegistry;
  global.exportSigningAuditV16 = exportAudit;

  global.MethodzCryptographicSigningV16 = {
    version: "1.6.0",
    readPublicKeys: readRegistry,
    readAudit,
    registerPublicKey,
    sanitizeRegistry,
    signPackage: (...args) => core().signPackage(...args),
    verifyPackage: (...args) => core().verifyPackage(...args)
  };
})(window);
