/* Methodz Meeting Manager v1.6.2 public-key custody and recovery ceremony workspace. */
(function initializeMethodzKeyCustodyWorkspaceV162(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const eventsKey = config.storageKeys?.signingCustodyEvents || "methodzSigningCustodyEvents";
  const maximumEvents = positiveInteger(config.keyCustody?.maximumEvents, 500);

  global.addEventListener("DOMContentLoaded", initialize);

  function cryptoCore() {
    if (!global.MethodzCryptoPackageV16) throw new Error("The v1.6 cryptographic package core is unavailable.");
    return global.MethodzCryptoPackageV16;
  }

  function custodyCore() {
    if (!global.MethodzKeyCustodyCoreV162) throw new Error("The v1.6.2 key custody core is unavailable.");
    return global.MethodzKeyCustodyCoreV162;
  }

  function signingWorkspace() {
    if (!global.MethodzCryptographicSigningV16) throw new Error("The v1.6 signing workspace is unavailable.");
    return global.MethodzCryptographicSigningV16;
  }

  function initialize() {
    installPanel();
    refreshKeyOptions();
    renderEvents();
    setStatus("Ready to record public-key custody evidence. Private keys are never accepted by this workspace.", "ready");
  }

  function installPanel() {
    if (document.getElementById("keyCustodyPanelV162")) return;
    const anchor = document.getElementById("cryptoSigningPanelV16")
      || document.getElementById("savedRecords")?.closest(".card");
    if (!anchor) return;

    const panel = document.createElement("section");
    panel.id = "keyCustodyPanelV162";
    panel.className = "card key-custody-v162";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <p class="eyebrow">Operational Integrity</p>
          <h2>Public-Key Custody & Rotation</h2>
          <p class="helper-text">Record rotation, revocation, lost-key response, and recovery-rehearsal evidence. This workspace stores only public verification keys and browser-local process metadata.</p>
        </div>
        <span class="release-badge-v162">v1.6.2</span>
      </div>
      <div id="keyCustodyStatusV162" class="key-custody-status-v162" aria-live="polite"></div>

      <details open>
        <summary>Record a custody ceremony</summary>
        <div class="form-grid">
          <div>
            <label for="custodyEventTypeV162">Event Type</label>
            <select id="custodyEventTypeV162">
              <option value="rotation">Key rotation</option>
              <option value="revocation">Key revocation</option>
              <option value="lost-key-response">Lost-key response</option>
              <option value="recovery-rehearsal">Recovery rehearsal</option>
            </select>
          </div>
          <div>
            <label for="custodyEventStatusV162">Event Status</label>
            <select id="custodyEventStatusV162">
              <option>Planned</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div>
            <label for="custodyFromKeyV162">Source / Retiring Key</label>
            <select id="custodyFromKeyV162"><option value="">No public keys registered</option></select>
          </div>
          <div>
            <label for="custodyToKeyV162">Replacement Key</label>
            <select id="custodyToKeyV162"><option value="">Not applicable</option></select>
          </div>
          <div>
            <label for="custodyEffectiveAtV162">Effective Date</label>
            <input id="custodyEffectiveAtV162" type="datetime-local" />
          </div>
          <div>
            <label for="custodyOperatorV162">Operator Label</label>
            <input id="custodyOperatorV162" type="text" placeholder="Person or controlled role" />
          </div>
          <div>
            <label for="custodyWitnessV162">Witness Label</label>
            <input id="custodyWitnessV162" type="text" placeholder="Independent witness or reviewer" />
          </div>
        </div>
        <label for="custodyReasonV162">Reason / Evidence Note</label>
        <textarea id="custodyReasonV162" placeholder="Why the event occurred, where offline evidence is stored, and what was confirmed."></textarea>

        <fieldset class="custody-checklist-v162">
          <legend>Operator Checklist</legend>
          <label><input id="custodyBackupSeparatedV162" type="checkbox" /> Private-key backup is stored separately from packages and public manifests.</label>
          <label><input id="custodyFingerprintConfirmedV162" type="checkbox" /> Public-key fingerprint was confirmed through an independent trusted channel.</label>
          <label><input id="custodyRegistryReviewedV162" type="checkbox" /> Browser registry status and effective date were reviewed.</label>
          <label><input id="custodyRecoveryEvidenceV162" type="checkbox" /> Recovery or continuity evidence location was recorded outside this browser.</label>
        </fieldset>

        <div class="button-row">
          <button type="button" onclick="recordKeyCustodyEventV162()">Record Event</button>
          <button type="button" onclick="refreshKeyCustodyWorkspaceV162()">Refresh Public Keys</button>
          <button type="button" onclick="exportKeyCustodyManifestV162()">Export Public Custody Manifest</button>
          <button type="button" onclick="exportKeyCustodyAuditV162()">Export Custody Audit</button>
        </div>
        <p class="crypto-warning-v16"><strong>Boundary:</strong> recording an event does not revoke a key automatically. Use the v1.6 public-key registry control to change browser-local key status, then record the completed ceremony here.</p>
      </details>

      <details open>
        <summary>Custody Event History</summary>
        <div id="keyCustodyHistoryV162" class="key-custody-history-v162"></div>
      </details>
    `;
    anchor.insertAdjacentElement("afterend", panel);

    const effective = document.getElementById("custodyEffectiveAtV162");
    if (effective && !effective.value) effective.value = localDateTimeValue(new Date());
    document.getElementById("custodyEventTypeV162")?.addEventListener("change", updateReplacementRequirement);
    updateReplacementRequirement();
  }

  function refreshKeyOptions() {
    const keys = readKeys();
    const from = document.getElementById("custodyFromKeyV162");
    const to = document.getElementById("custodyToKeyV162");
    if (!from || !to) return;
    const currentFrom = from.value;
    const currentTo = to.value;
    const options = keys.map((entry) => `<option value="${escapeHtml(entry.id)}">${escapeHtml(entry.status || "Active")} • ${escapeHtml(entry.keyLabel || "Verification key")} • ${escapeHtml(entry.id)}</option>`).join("");
    from.innerHTML = keys.length ? options : '<option value="">No public keys registered</option>';
    to.innerHTML = `<option value="">Not applicable</option>${options}`;
    if (keys.some((entry) => entry.id === currentFrom)) from.value = currentFrom;
    if (keys.some((entry) => entry.id === currentTo)) to.value = currentTo;
    updateReplacementRequirement();
  }

  function updateReplacementRequirement() {
    const rotation = value("custodyEventTypeV162") === "rotation";
    const select = document.getElementById("custodyToKeyV162");
    if (!select) return;
    select.required = rotation;
    select.closest("div")?.classList.toggle("custody-required-v162", rotation);
  }

  async function recordEvent() {
    return safely(async () => {
      const event = custodyCore().normalizeEvent({
        eventType: value("custodyEventTypeV162"),
        status: value("custodyEventStatusV162"),
        fromKeyId: value("custodyFromKeyV162"),
        toKeyId: value("custodyToKeyV162"),
        effectiveAt: isoFromLocal(value("custodyEffectiveAtV162")),
        operatorLabel: value("custodyOperatorV162"),
        witnessLabel: value("custodyWitnessV162"),
        reason: value("custodyReasonV162"),
        checklist: {
          privateBackupSeparated: checked("custodyBackupSeparatedV162"),
          fingerprintConfirmed: checked("custodyFingerprintConfirmedV162"),
          registryStatusReviewed: checked("custodyRegistryReviewedV162"),
          recoveryEvidenceCaptured: checked("custodyRecoveryEvidenceV162")
        }
      });

      const manifest = await custodyCore().buildManifest({ keys: readKeys(), events: [...readEvents(), event], generatedBy: event.operatorLabel }, cryptoCore());
      const verification = await custodyCore().validateManifest(manifest, cryptoCore());
      if (!verification.valid) throw new Error(verification.errors.join(" "));

      writeEvents([...readEvents(), event]);
      renderEvents();
      setStatus(`Recorded ${event.eventType} event ${event.id}.`, event.status === "Completed" ? "ready" : "warning");
      return event;
    });
  }

  async function buildCurrentManifest() {
    const generatedBy = value("custodyOperatorV162");
    return custodyCore().buildManifest({ keys: readKeys(), events: readEvents(), generatedBy }, cryptoCore());
  }

  async function exportManifest() {
    return safely(async () => {
      const manifest = await buildCurrentManifest();
      const result = await custodyCore().validateManifest(manifest, cryptoCore());
      if (!result.valid) throw new Error(result.errors.join(" "));
      downloadJson(manifest, `methodz-public-key-custody-manifest-${today()}.json`);
      setStatus(`Exported ${result.keyCount} public keys and ${result.eventCount} custody events.`, "ready");
      return manifest;
    });
  }

  function exportAudit() {
    const events = readEvents();
    downloadJson({
      packageType: "methodz-key-custody-audit",
      packageVersion: 1,
      generatedAt: new Date().toISOString(),
      privateKeysIncluded: false,
      events,
      notice: "Browser-local operational evidence only. This is not an immutable ledger, identity proof, or substitute for offline custody records."
    }, `methodz-key-custody-audit-${today()}.json`);
  }

  function readKeys() {
    try {
      return signingWorkspace().readPublicKeys().filter((entry) => entry?.id && entry?.publicKeyJwk);
    } catch (error) {
      console.warn("Unable to read public-key registry.", error);
      return [];
    }
  }

  function readEvents() {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(eventsKey) || "[]");
      return (Array.isArray(parsed) ? parsed : []).map((entry) => {
        try { return custodyCore().normalizeEvent(entry); } catch (error) { return null; }
      }).filter(Boolean);
    } catch (error) {
      console.warn("Unable to read key custody events.", error);
      return [];
    }
  }

  function writeEvents(events) {
    const safe = (Array.isArray(events) ? events : []).slice(-maximumEvents).map((entry) => custodyCore().normalizeEvent(entry));
    if (custodyCore().containsPrivateKeyMaterial(safe)) throw new Error("Private key material cannot be written to custody storage.");
    global.localStorage.setItem(eventsKey, JSON.stringify(safe));
  }

  function renderEvents() {
    const container = document.getElementById("keyCustodyHistoryV162");
    if (!container) return;
    const events = readEvents().slice().reverse();
    if (!events.length) {
      container.innerHTML = '<p class="helper-text">No custody events have been recorded in this browser.</p>';
      return;
    }
    container.innerHTML = events.map((event) => `
      <article class="custody-event-v162">
        <div class="item-header">
          <strong>${escapeHtml(event.eventType)} • ${escapeHtml(event.status)}</strong>
          <time datetime="${escapeHtml(event.effectiveAt)}">${escapeHtml(formatDate(event.effectiveAt))}</time>
        </div>
        <p><code>${escapeHtml(event.fromKeyId)}</code>${event.toKeyId ? ` → <code>${escapeHtml(event.toKeyId)}</code>` : ""}</p>
        <p>${escapeHtml(event.reason)}</p>
        <small>Operator: ${escapeHtml(event.operatorLabel || "Not recorded")} • Witness: ${escapeHtml(event.witnessLabel || "Not recorded")}</small>
      </article>
    `).join("");
  }

  function downloadJson(data, filename) {
    if (custodyCore().containsPrivateKeyMaterial(data)) throw new Error("Private key material cannot be exported by the custody workspace.");
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

  async function safely(operation) {
    try {
      return await operation();
    } catch (error) {
      const message = error?.message || String(error);
      setStatus(message, "error");
      alert(message);
      return null;
    }
  }

  function setStatus(message, state) {
    const element = document.getElementById("keyCustodyStatusV162");
    if (!element) return;
    element.textContent = message;
    element.dataset.state = state || "";
  }

  function value(id) { return String(document.getElementById(id)?.value || "").trim(); }
  function checked(id) { return Boolean(document.getElementById(id)?.checked); }
  function positiveInteger(value, fallback) { const number = Number(value); return Number.isFinite(number) && number > 0 ? Math.floor(number) : fallback; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function localDateTimeValue(date) { const offset = date.getTimezoneOffset() * 60000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
  function isoFromLocal(valueToParse) { const date = new Date(valueToParse); return Number.isNaN(date.getTime()) ? "" : date.toISOString(); }
  function formatDate(valueToFormat) { const date = new Date(valueToFormat); return Number.isNaN(date.getTime()) ? String(valueToFormat || "Not recorded") : date.toLocaleString(); }
  function escapeHtml(valueToEscape) {
    return String(valueToEscape == null ? "" : valueToEscape)
      .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  }

  global.recordKeyCustodyEventV162 = recordEvent;
  global.refreshKeyCustodyWorkspaceV162 = () => { refreshKeyOptions(); renderEvents(); };
  global.exportKeyCustodyManifestV162 = exportManifest;
  global.exportKeyCustodyAuditV162 = exportAudit;
  global.MethodzKeyCustodyV162 = {
    version: "1.6.2",
    readEvents,
    readPublicKeys: readKeys,
    recordEvent,
    buildCurrentManifest,
    validateManifest: (manifest) => custodyCore().validateManifest(manifest, cryptoCore())
  };
})(window);
