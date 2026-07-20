/* Methodz Meeting Manager v1.6.2 public-key custody and rotation workspace. */
(function initializeMethodzKeyCustodyV162(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const registryKey = config.storageKeys?.signingPublicKeys || "methodzSigningPublicKeys";
  const custodyKey = config.storageKeys?.keyCustodyMetadata || "methodzKeyCustodyMetadata";
  const auditKey = config.storageKeys?.keyCustodyAudit || "methodzKeyCustodyAudit";
  const maximumEntries = positiveNumber(config.keyCustody?.maximumCustodyEntries, 200);
  const maximumAudit = positiveNumber(config.keyCustody?.maximumAuditEvents, 1000);
  const reviewIntervalDays = positiveNumber(config.keyCustody?.reviewIntervalDays, 180);

  let loadedManifest = null;
  let manifestVerification = null;

  global.addEventListener("DOMContentLoaded", initialize);

  function core() {
    if (!global.MethodzKeyCustodyCoreV162) throw new Error("The v1.6.2 key-custody core is unavailable.");
    return global.MethodzKeyCustodyCoreV162;
  }

  function cryptoCore() {
    if (!global.MethodzCryptoPackageV16) throw new Error("The v1.6 cryptographic package core is unavailable.");
    return global.MethodzCryptoPackageV16;
  }

  function initialize() {
    installPanel();
    disableLegacyLifecycleToggle();
    sanitizeStoredCustody();
    renderKeySelectors();
    renderSelectedCustody();
    renderManifestVerification();
    setStatus("Key custody metadata is browser-local. Public-key fingerprints still require independent verification.", "ready");
  }

  function installPanel() {
    if (document.getElementById("keyCustodyPanelV162")) return;
    const anchor = document.getElementById("cryptoSigningPanelV16")
      || document.getElementById("recoveryReadinessPanelV16")
      || document.getElementById("savedRecords")?.closest(".card");
    if (!anchor) return;

    const channels = Array.isArray(config.keyCustody?.verificationChannels)
      ? config.keyCustody.verificationChannels
      : ["Other independently verified channel"];

    const panel = document.createElement("section");
    panel.id = "keyCustodyPanelV162";
    panel.className = "card key-custody-v162";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <p class="eyebrow">Signing Operations</p>
          <h2>Public-Key Custody & Rotation</h2>
          <p class="helper-text">Maintain public-key custody references, record fingerprint checks, complete documented rotations, and export independently verifiable public manifests. Private keys are never stored here.</p>
        </div>
        <span class="release-badge-v162">v1.6.2</span>
      </div>
      <div id="keyCustodyStatusV162" class="key-custody-status-v162" aria-live="polite"></div>

      <details open>
        <summary>Selected Public Key Custody</summary>
        <div class="form-grid">
          <div>
            <label for="custodyKeySelectV162">Public Verification Key</label>
            <select id="custodyKeySelectV162"><option value="">No public keys registered</option></select>
          </div>
          <div>
            <label for="custodyCustodianV162">Custodian / Controlled Role</label>
            <input id="custodyCustodianV162" type="text" placeholder="Records administrator or controlled role" />
          </div>
          <div>
            <label for="custodyLocationV162">Public-Key Custody Reference</label>
            <input id="custodyLocationV162" type="text" placeholder="Vault register, policy page, or protected directory reference" />
          </div>
          <div>
            <label for="custodyVerifiedByV162">Fingerprint Verified By</label>
            <input id="custodyVerifiedByV162" type="text" placeholder="Person or controlled verification role" />
          </div>
          <div>
            <label for="custodyChannelV162">Independent Verification Channel</label>
            <select id="custodyChannelV162">
              <option value="">Not yet verified</option>
              ${channels.map((channel) => `<option value="${escapeHtml(channel)}">${escapeHtml(channel)}</option>`).join("")}
            </select>
          </div>
          <div>
            <label for="custodyVerifiedAtV162">Fingerprint Verified At</label>
            <input id="custodyVerifiedAtV162" type="datetime-local" />
          </div>
          <div>
            <label for="custodyNextReviewV162">Next Custody Review</label>
            <input id="custodyNextReviewV162" type="date" />
          </div>
          <div class="wide-field">
            <label for="custodyNotesV162">Custody Notes</label>
            <textarea id="custodyNotesV162" placeholder="Do not place secrets, private keys, passwords, or recovery phrases here."></textarea>
          </div>
        </div>
        <div class="button-row">
          <button type="button" onclick="saveKeyCustodyV162()">Save Custody Metadata</button>
          <button type="button" onclick="markFingerprintVerifiedV162()">Mark Fingerprint Verified Now</button>
          <button type="button" onclick="clearFingerprintVerificationV162()">Clear Verification Claim</button>
        </div>
        <div id="custodySelectedSummaryV162" class="custody-selected-summary-v162"></div>
      </details>

      <details open>
        <summary>Rotation or Emergency Revocation Ceremony</summary>
        <p class="helper-text">Generate or import the successor public key in the signing panel first. Completing a rotation revokes the predecessor and links both public records. Revoked keys cannot be silently reactivated through this panel.</p>
        <div class="form-grid">
          <div>
            <label for="rotationPredecessorV162">Predecessor Key</label>
            <select id="rotationPredecessorV162"><option value="">Select active predecessor</option></select>
          </div>
          <div>
            <label for="rotationSuccessorV162">Successor Key</label>
            <select id="rotationSuccessorV162"><option value="">Select active successor</option></select>
          </div>
          <div>
            <label for="rotationOperatorV162">Operator / Controlled Role</label>
            <input id="rotationOperatorV162" type="text" placeholder="Required" />
          </div>
          <div>
            <label for="rotationWitnessV162">Witness / Reviewer</label>
            <input id="rotationWitnessV162" type="text" placeholder="Recommended" />
          </div>
          <div class="wide-field">
            <label for="rotationReasonV162">Reason</label>
            <textarea id="rotationReasonV162" placeholder="Required: scheduled rotation, suspected exposure, role transition, device loss..."></textarea>
          </div>
          <div class="wide-field">
            <label for="rotationEvidenceV162">Evidence / Ceremony Reference</label>
            <input id="rotationEvidenceV162" type="text" placeholder="Ticket, minutes, custody log, or protected evidence reference" />
          </div>
        </div>
        <div class="button-row">
          <button type="button" onclick="completeKeyRotationV162()">Complete Key Rotation</button>
          <button type="button" class="danger-button-v162" onclick="revokeSelectedKeyV162()">Emergency Revoke Predecessor</button>
        </div>
      </details>

      <details open>
        <summary>Public Custody Manifest</summary>
        <div class="form-grid">
          <div>
            <label for="custodyManifestGeneratedByV162">Manifest Prepared By</label>
            <input id="custodyManifestGeneratedByV162" type="text" placeholder="Person or controlled role" />
          </div>
          <div>
            <label for="custodyManifestOrganizationV162">Organization / Operating Context</label>
            <input id="custodyManifestOrganizationV162" type="text" placeholder="Method HVAC Inc., CSW, or Methodz operating context" />
          </div>
        </div>
        <div class="button-row">
          <button type="button" onclick="exportCustodyManifestV162()">Export Public Custody Manifest</button>
          <label class="button-like" for="custodyManifestFileV162">Choose Custody Manifest</label>
          <button type="button" onclick="verifyCustodyManifestV162()">Verify Manifest</button>
          <button type="button" onclick="mergeVerifiedCustodyManifestV162()">Merge Verified Public Keys</button>
          <button type="button" onclick="exportKeyCustodyAuditV162()">Export Custody Audit</button>
        </div>
        <input id="custodyManifestFileV162" class="import-control" type="file" accept="application/json,.json" onchange="loadCustodyManifestV162(event)" />
        <div id="custodyManifestResultV162" class="custody-manifest-result-v162" aria-live="polite"></div>
      </details>
    `;
    anchor.insertAdjacentElement("afterend", panel);

    document.getElementById("custodyKeySelectV162")?.addEventListener("change", renderSelectedCustody);
    document.getElementById("rotationPredecessorV162")?.addEventListener("change", syncCustodySelectionFromRotation);
  }

  function disableLegacyLifecycleToggle() {
    const button = document.querySelector('#cryptoSigningPanelV16 button[onclick="togglePublicKeyStatusV16()"]');
    if (!button) return;
    button.disabled = true;
    button.textContent = "Use Custody Rotation / Revocation";
    button.title = "Lifecycle status changes require the documented v1.6.2 custody workflow.";
  }

  function positiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback;
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

  function readRegistry() {
    const entries = readJson(registryKey, []);
    return Array.isArray(entries) ? entries : [];
  }

  async function writeRegistry(entries, auditEvent) {
    const safe = await core().sanitizeRegistry(entries, maximumEntries);
    global.localStorage.setItem(registryKey, JSON.stringify(safe));
    if (auditEvent) appendAudit(auditEvent.action, auditEvent);
    refreshLegacyCryptoPanel(safe);
    renderKeySelectors();
    renderSelectedCustody();
    return safe;
  }

  function readCustody() {
    const value = readJson(custodyKey, {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function writeCustody(value) {
    const entries = Object.entries(value || {}).slice(-maximumEntries);
    global.localStorage.setItem(custodyKey, JSON.stringify(Object.fromEntries(entries)));
  }

  function readAudit() {
    const value = readJson(auditKey, []);
    return Array.isArray(value) ? value : [];
  }

  function appendAudit(action, details = {}) {
    const events = readAudit();
    events.push({
      id: `custody-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      occurredAt: new Date().toISOString(),
      ...clone(details)
    });
    global.localStorage.setItem(auditKey, JSON.stringify(events.slice(-maximumAudit)));
  }

  function sanitizeStoredCustody() {
    const registryIds = new Set(readRegistry().map((entry) => entry?.id).filter(Boolean));
    const current = readCustody();
    const safe = {};
    Object.entries(current).forEach(([keyId, entry]) => {
      if (!registryIds.has(keyId) || !entry || typeof entry !== "object" || Array.isArray(entry)) return;
      if (cryptoCore().containsPrivateKeyMaterial(entry)) return;
      safe[keyId] = {
        keyId,
        custodian: text(entry.custodian),
        custodyLocationReference: text(entry.custodyLocationReference),
        fingerprintVerifiedAt: safeIso(entry.fingerprintVerifiedAt),
        fingerprintVerifiedBy: text(entry.fingerprintVerifiedBy),
        fingerprintVerificationChannel: text(entry.fingerprintVerificationChannel),
        nextReviewDate: safeDate(entry.nextReviewDate),
        notes: text(entry.notes),
        updatedAt: safeIso(entry.updatedAt)
      };
    });
    if (JSON.stringify(current) !== JSON.stringify(safe)) {
      writeCustody(safe);
      appendAudit("custody-metadata-sanitized", {
        previousCount: Object.keys(current).length,
        retainedCount: Object.keys(safe).length
      });
    }
  }

  function renderKeySelectors() {
    const entries = readRegistry();
    const active = entries.filter((entry) => entry.status !== "Revoked");
    populateSelect("custodyKeySelectV162", entries, "No public keys registered");
    populateSelect("rotationPredecessorV162", active, "Select active predecessor");
    populateSelect("rotationSuccessorV162", active, "Select active successor");
  }

  function populateSelect(id, entries, emptyLabel) {
    const select = document.getElementById(id);
    if (!select) return;
    const previous = select.value;
    select.innerHTML = `<option value="">${escapeHtml(emptyLabel)}</option>${entries.map((entry) => (
      `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.status || "Active")} • ${escapeHtml(entry.keyLabel || "Verification key")} • ${escapeHtml(entry.id)}</option>`
    )).join("")}`;
    if (entries.some((entry) => entry.id === previous)) select.value = previous;
  }

  function selectedKeyId() {
    return text(document.getElementById("custodyKeySelectV162")?.value);
  }

  function renderSelectedCustody() {
    const keyId = selectedKeyId();
    const entry = readRegistry().find((item) => item.id === keyId);
    const metadata = readCustody()[keyId] || {};

    setValue("custodyCustodianV162", metadata.custodian || "");
    setValue("custodyLocationV162", metadata.custodyLocationReference || "");
    setValue("custodyVerifiedByV162", metadata.fingerprintVerifiedBy || "");
    setValue("custodyChannelV162", metadata.fingerprintVerificationChannel || "");
    setValue("custodyVerifiedAtV162", isoToLocalInput(metadata.fingerprintVerifiedAt));
    setValue("custodyNextReviewV162", metadata.nextReviewDate || defaultReviewDate());
    setValue("custodyNotesV162", metadata.notes || "");

    const summary = document.getElementById("custodySelectedSummaryV162");
    if (!summary) return;
    if (!entry) {
      summary.innerHTML = '<p class="helper-text">Select a registered public key to manage custody metadata.</p>';
      return;
    }
    summary.innerHTML = `<dl>
      <dt>Key ID</dt><dd><code>${escapeHtml(entry.id)}</code></dd>
      <dt>Status</dt><dd>${escapeHtml(entry.status || "Active")}</dd>
      <dt>Custodian</dt><dd>${escapeHtml(metadata.custodian || "Not recorded")}</dd>
      <dt>Fingerprint check</dt><dd>${metadata.fingerprintVerifiedAt ? `${escapeHtml(formatDate(metadata.fingerprintVerifiedAt))} by ${escapeHtml(metadata.fingerprintVerifiedBy || "unrecorded verifier")}` : "Not recorded"}</dd>
      <dt>Next review</dt><dd>${escapeHtml(metadata.nextReviewDate || "Not scheduled")}</dd>
      <dt>Successor</dt><dd>${escapeHtml(entry.replacedByKeyId || "None recorded")}</dd>
      <dt>Predecessor</dt><dd>${escapeHtml(entry.replacesKeyId || "None recorded")}</dd>
    </dl>`;
  }

  async function saveCustody() {
    return safely(async () => {
      const keyId = selectedKeyId();
      if (!keyId || !readRegistry().some((entry) => entry.id === keyId)) throw new Error("Select a registered public key first.");
      const verifiedAt = localInputToIso(value("custodyVerifiedAtV162"));
      const verifiedBy = value("custodyVerifiedByV162");
      const channel = value("custodyChannelV162");
      if (verifiedAt && (!verifiedBy || !channel)) throw new Error("A fingerprint verification timestamp requires both verifier and independent channel.");
      if ((verifiedBy || channel) && !verifiedAt) throw new Error("Set the fingerprint verification timestamp or clear the verification claim.");

      const custody = readCustody();
      custody[keyId] = {
        keyId,
        custodian: value("custodyCustodianV162"),
        custodyLocationReference: value("custodyLocationV162"),
        fingerprintVerifiedAt: verifiedAt,
        fingerprintVerifiedBy: verifiedBy,
        fingerprintVerificationChannel: channel,
        nextReviewDate: value("custodyNextReviewV162"),
        notes: value("custodyNotesV162"),
        updatedAt: new Date().toISOString()
      };
      if (cryptoCore().containsPrivateKeyMaterial(custody[keyId])) throw new Error("Custody metadata cannot contain private key material.");
      writeCustody(custody);
      appendAudit("public-key-custody-updated", {
        keyId,
        fingerprintVerified: Boolean(verifiedAt),
        nextReviewDate: custody[keyId].nextReviewDate
      });
      renderSelectedCustody();
      setStatus(`Saved public-key custody metadata for ${keyId}.`, "ready");
      return custody[keyId];
    });
  }

  function markFingerprintVerified() {
    return safely(async () => {
      const keyId = selectedKeyId();
      if (!keyId) throw new Error("Select a registered public key first.");
      const verifier = value("custodyVerifiedByV162") || value("rotationOperatorV162");
      const channel = value("custodyChannelV162");
      if (!verifier) throw new Error("Enter the person or controlled role that independently verified the fingerprint.");
      if (!channel) throw new Error("Select the independent verification channel.");
      setValue("custodyVerifiedByV162", verifier);
      setValue("custodyVerifiedAtV162", isoToLocalInput(new Date().toISOString()));
      await saveCustody();
      appendAudit("public-key-fingerprint-verified", { keyId, verifiedBy: verifier, channel });
      setStatus(`Recorded an independent fingerprint check for ${keyId}.`, "ready");
    });
  }

  function clearFingerprintVerification() {
    setValue("custodyVerifiedByV162", "");
    setValue("custodyChannelV162", "");
    setValue("custodyVerifiedAtV162", "");
    return saveCustody();
  }

  function syncCustodySelectionFromRotation() {
    const predecessor = value("rotationPredecessorV162");
    const select = document.getElementById("custodyKeySelectV162");
    if (select && predecessor && [...select.options].some((option) => option.value === predecessor)) {
      select.value = predecessor;
      renderSelectedCustody();
    }
  }

  async function completeRotation() {
    return safely(async () => {
      const options = ceremonyOptions();
      options.predecessorKeyId = value("rotationPredecessorV162");
      options.successorKeyId = value("rotationSuccessorV162");
      const plan = await core().buildRotationPlan(readRegistry(), { ...options, maximumEntries });
      if (!global.confirm(`Complete rotation from ${options.predecessorKeyId} to ${options.successorKeyId}? The predecessor will be marked revoked.`)) return null;
      await writeRegistry(plan.entries, plan.event);
      appendSigningAudit(plan.event.action, plan.event);
      setStatus(`Rotation completed. ${options.predecessorKeyId} is revoked and linked to ${options.successorKeyId}.`, "warning");
      return plan;
    });
  }

  async function revokeSelected() {
    return safely(async () => {
      const options = ceremonyOptions();
      options.keyId = value("rotationPredecessorV162") || selectedKeyId();
      const plan = await core().buildRevocationPlan(readRegistry(), { ...options, maximumEntries });
      if (!global.confirm(`Emergency revoke ${options.keyId}? Signing with this key will be blocked by the local registry.`)) return null;
      await writeRegistry(plan.entries, plan.event);
      appendSigningAudit(plan.event.action, plan.event);
      setStatus(`${options.keyId} was revoked with a documented custody event.`, "warning");
      return plan;
    });
  }

  function ceremonyOptions() {
    return {
      operator: value("rotationOperatorV162"),
      witness: value("rotationWitnessV162"),
      reason: value("rotationReasonV162"),
      evidenceReference: value("rotationEvidenceV162"),
      occurredAt: new Date().toISOString()
    };
  }

  async function exportManifest() {
    return safely(async () => {
      const registry = readRegistry();
      if (!registry.length) throw new Error("Register at least one public key before exporting a custody manifest.");
      const manifest = await core().createManifest(registry, readCustody(), {
        maximumEntries,
        generatedBy: value("custodyManifestGeneratedByV162"),
        organization: value("custodyManifestOrganizationV162")
      });
      if (cryptoCore().containsPrivateKeyMaterial(manifest)) throw new Error("The generated manifest unexpectedly contains private material and was blocked.");
      downloadJson(manifest, `methodz-public-key-custody-manifest-${today()}.json`);
      appendAudit("public-key-custody-manifest-exported", {
        keyCount: manifest.keys.length,
        digest: manifest.integrity.digest
      });
      setStatus(`Exported a public custody manifest containing ${manifest.keys.length} key(s).`, "ready");
      return manifest;
    });
  }

  async function loadManifest(event) {
    const input = event?.target;
    return safely(async () => {
      const file = input?.files?.[0];
      if (!file) throw new Error("Choose a custody manifest first.");
      loadedManifest = JSON.parse(await file.text());
      manifestVerification = null;
      renderManifestVerification();
      setStatus(`Loaded ${loadedManifest.packageType || "JSON package"}. Run verification before merging.`, "ready");
      return loadedManifest;
    }, input);
  }

  async function verifyManifest() {
    return safely(async () => {
      if (!loadedManifest) throw new Error("Choose a custody manifest first.");
      manifestVerification = await core().verifyManifest(loadedManifest, { maximumEntries });
      appendAudit("public-key-custody-manifest-verified", {
        valid: manifestVerification.valid,
        keyCount: manifestVerification.keyCount,
        digest: manifestVerification.actualDigest,
        errors: manifestVerification.errors
      });
      renderManifestVerification();
      setStatus(manifestVerification.valid ? "Custody manifest verified." : "Custody manifest verification failed.", manifestVerification.valid ? "ready" : "error");
      return manifestVerification;
    });
  }

  async function mergeVerifiedManifest() {
    return safely(async () => {
      if (!loadedManifest || !manifestVerification?.valid) throw new Error("Load and successfully verify a custody manifest before merging public keys.");
      const local = await core().sanitizeRegistry(readRegistry(), maximumEntries);
      const incoming = await core().sanitizeRegistry(loadedManifest.keys, maximumEntries);
      const byId = new Map(local.map((entry) => [entry.id, entry]));

      incoming.forEach((entry) => {
        const existing = byId.get(entry.id);
        if (!existing) {
          byId.set(entry.id, { ...entry, source: "custody-manifest-import" });
          return;
        }
        const revoked = existing.status === "Revoked" || entry.status === "Revoked";
        byId.set(entry.id, {
          ...entry,
          ...existing,
          status: revoked ? "Revoked" : "Active",
          revokedAt: revoked ? (existing.revokedAt || entry.revokedAt || new Date().toISOString()) : "",
          revocationReason: revoked ? (existing.revocationReason || entry.revocationReason || "Imported revocation state") : "",
          publicKeyJwk: cryptoCore().normalizePublicJwk(existing.publicKeyJwk),
          source: existing.source || "custody-manifest-import",
          updatedAt: new Date().toISOString()
        });
      });

      const merged = [...byId.values()];
      if (merged.length > maximumEntries) throw new Error(`The merged registry exceeds the ${maximumEntries}-entry limit.`);
      if (!global.confirm(`Merge ${incoming.length} verified public key(s) into this browser registry? Existing revoked status will never be downgraded.`)) return null;
      await writeRegistry(merged, {
        action: "verified-custody-manifest-merged",
        incomingKeyCount: incoming.length,
        manifestDigest: manifestVerification.actualDigest
      });

      const custody = readCustody();
      loadedManifest.keys.forEach((entry) => {
        if (!entry?.id || !entry.custody || cryptoCore().containsPrivateKeyMaterial(entry.custody)) return;
        custody[entry.id] = {
          ...entry.custody,
          keyId: entry.id,
          updatedAt: new Date().toISOString()
        };
      });
      writeCustody(custody);
      sanitizeStoredCustody();
      renderSelectedCustody();
      setStatus(`Merged ${incoming.length} verified public key(s). Local revocations were preserved.`, "ready");
      return merged;
    });
  }

  function renderManifestVerification() {
    const element = document.getElementById("custodyManifestResultV162");
    if (!element) return;
    if (!loadedManifest) {
      element.textContent = "No custody manifest loaded.";
      element.dataset.state = "";
      return;
    }
    if (!manifestVerification) {
      element.textContent = `${loadedManifest.packageType || "JSON package"} loaded. Verification has not been run.`;
      element.dataset.state = "";
      return;
    }
    element.dataset.state = manifestVerification.valid ? "valid" : "invalid";
    element.innerHTML = `<h3>${manifestVerification.valid ? "Valid Public Custody Manifest" : "Invalid Public Custody Manifest"}</h3>
      <dl>
        <dt>Keys</dt><dd>${manifestVerification.keyCount}</dd>
        <dt>Active</dt><dd>${manifestVerification.activeKeyCount}</dd>
        <dt>Revoked</dt><dd>${manifestVerification.revokedKeyCount}</dd>
        <dt>Integrity</dt><dd>${manifestVerification.digestMatches ? "Matches" : "Mismatch"}</dd>
      </dl>
      ${manifestVerification.errors.length ? `<h4>Errors</h4><ul>${manifestVerification.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>` : ""}
      ${manifestVerification.warnings.length ? `<h4>Warnings</h4><ul>${manifestVerification.warnings.map((warning) => `<li>${escapeHtml(warning)}</li>`).join("")}</ul>` : ""}
      <p>${escapeHtml(manifestVerification.notice)}</p>`;
  }

  function exportAudit() {
    downloadJson({
      packageType: "methodz-key-custody-audit",
      packageVersion: 1,
      exportedAt: new Date().toISOString(),
      privateKeysIncluded: false,
      events: readAudit(),
      notice: "Browser-local workflow history. It is not an authenticated identity, immutable ledger, or proof of ceremony attendance."
    }, `methodz-key-custody-audit-${today()}.json`);
  }

  function appendSigningAudit(action, details) {
    const key = config.storageKeys?.signingAudit || "methodzSigningAudit";
    const events = readJson(key, []);
    const safeEvents = Array.isArray(events) ? events : [];
    safeEvents.push({
      id: `crypto-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      action,
      occurredAt: new Date().toISOString(),
      ...clone(details)
    });
    const maximum = positiveNumber(config.cryptographicSigning?.maximumAuditEvents, 2000);
    global.localStorage.setItem(key, JSON.stringify(safeEvents.slice(-maximum)));
  }

  function refreshLegacyCryptoPanel(entries) {
    const select = document.getElementById("cryptoPublicKeySelectV16");
    const summary = document.getElementById("cryptoKeySummaryV16");
    if (!select || !summary) return;
    const previous = select.value;
    select.innerHTML = entries.length
      ? entries.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.status)} • ${escapeHtml(entry.keyLabel)} • ${escapeHtml(entry.id)}</option>`).join("")
      : '<option value="">No public keys registered</option>';
    select.value = entries.some((entry) => entry.id === previous) ? previous : (entries[0]?.id || "");
    const selected = entries.find((entry) => entry.id === select.value);
    summary.innerHTML = selected ? `<dl>
      <dt>Key ID</dt><dd><code>${escapeHtml(selected.id)}</code></dd>
      <dt>Key label</dt><dd>${escapeHtml(selected.keyLabel || "")}</dd>
      <dt>Signer label</dt><dd>${escapeHtml(selected.signerLabel || "Not recorded")}</dd>
      <dt>Status</dt><dd>${escapeHtml(selected.status || "Active")}</dd>
      <dt>Created</dt><dd>${escapeHtml(formatDate(selected.createdAt))}</dd>
    </dl>` : '<p class="helper-text">No public verification keys are registered in this browser.</p>';
  }

  function setStatus(message, state) {
    const element = document.getElementById("keyCustodyStatusV162");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state || "";
  }

  async function safely(operation, input) {
    try {
      return await operation();
    } catch (error) {
      const message = error?.message || String(error);
      setStatus(message, "error");
      global.alert(message);
      return null;
    } finally {
      if (input) input.value = "";
    }
  }

  function value(id) {
    return text(document.getElementById(id)?.value);
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value == null ? "" : String(value);
  }

  function text(value) {
    return String(value == null ? "" : value).trim();
  }

  function safeIso(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toISOString();
  }

  function safeDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(text(value)) ? text(value) : "";
  }

  function isoToLocalInput(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  }

  function localInputToIso(value) {
    const textValue = text(value);
    if (!textValue) return "";
    const date = new Date(textValue);
    if (Number.isNaN(date.getTime())) throw new Error("The fingerprint verification timestamp is invalid.");
    return date.toISOString();
  }

  function defaultReviewDate() {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() + reviewIntervalDays);
    return date.toISOString().slice(0, 10);
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

  function today() {
    return new Date().toISOString().slice(0, 10);
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

  global.saveKeyCustodyV162 = saveCustody;
  global.markFingerprintVerifiedV162 = markFingerprintVerified;
  global.clearFingerprintVerificationV162 = clearFingerprintVerification;
  global.completeKeyRotationV162 = completeRotation;
  global.revokeSelectedKeyV162 = revokeSelected;
  global.exportCustodyManifestV162 = exportManifest;
  global.loadCustodyManifestV162 = loadManifest;
  global.verifyCustodyManifestV162 = verifyManifest;
  global.mergeVerifiedCustodyManifestV162 = mergeVerifiedManifest;
  global.exportKeyCustodyAuditV162 = exportAudit;

  global.MethodzKeyCustodyV162 = {
    version: "1.6.2",
    readCustody,
    readAudit,
    readRegistry,
    saveCustody,
    completeRotation,
    revokeSelected,
    createManifest: (...args) => core().createManifest(...args),
    verifyManifest: (...args) => core().verifyManifest(...args)
  };
})(window);
