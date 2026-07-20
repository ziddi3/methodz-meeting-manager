/* Methodz Meeting Manager v1.6.2 key custody, rotation, and provider-readiness workspace. */
(function initializeMethodzKeyCustodyWorkspaceV162(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const registryKey = config.storageKeys?.signingPublicKeys || "methodzSigningPublicKeys";
  const signingAuditKey = config.storageKeys?.signingAudit || "methodzSigningAudit";
  const custodyEventsKey = config.storageKeys?.keyCustodyEvents || "methodzKeyCustodyEvents";
  const maximumEvents = Number(config.keyCustody?.maximumEvents || 500);
  const core = global.MethodzKeyCustodyCoreV162;
  const providerContract = global.MethodzHostedProviderContractV162;

  if (!core) throw new Error("The v1.6.2 key custody core is unavailable.");
  if (!providerContract) throw new Error("The v1.6.2 hosted-provider contract is unavailable.");

  let lastReadinessReport = null;
  let lastProviderReport = null;
  const originalToggleKeyStatus = global.togglePublicKeyStatusV16;

  protectGovernedRevocations();
  global.addEventListener("DOMContentLoaded", initialize);
  global.addEventListener("storage", (event) => {
    if ([registryKey, custodyEventsKey].includes(event.key)) render();
  });

  function initialize() {
    installPanel();
    sanitizeStoredData();
    render();
  }

  function installPanel() {
    if (document.getElementById("keyCustodyPanelV162")) return;
    const anchor = document.getElementById("cryptoSigningPanelV16")
      || document.getElementById("policyOperationsPanelV15")
      || document.getElementById("savedRecords")?.closest(".card");
    if (!anchor) return;

    const panel = document.createElement("section");
    panel.id = "keyCustodyPanelV162";
    panel.className = "card key-custody-v162";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <p class="eyebrow">Operational Key Safety</p>
          <h2>Key Custody, Rotation & Recovery</h2>
          <p class="helper-text">Record public-key custody decisions without storing private keys. Rotation and lost-key events remain browser-local workflow evidence until a hosted provider exists.</p>
        </div>
        <span class="release-badge-v16">v1.6.2</span>
      </div>

      <div id="keyCustodyStatusV162" class="custody-status-v162" aria-live="polite"></div>
      <div id="keyCustodySummaryV162" class="custody-summary-v162"></div>

      <details open>
        <summary>Signing-Key Rotation Ceremony</summary>
        <p class="helper-text">Generate or import the successor public key in the v1.6 panel first. Confirm its fingerprint through a channel separate from the package transfer channel.</p>
        <div class="form-grid">
          <div>
            <label for="custodyPredecessorV162">Predecessor Key</label>
            <select id="custodyPredecessorV162"></select>
          </div>
          <div>
            <label for="custodySuccessorV162">Successor Key</label>
            <select id="custodySuccessorV162"></select>
          </div>
          <div>
            <label for="custodyOperatorV162">Operator / Accountable Role</label>
            <input id="custodyOperatorV162" type="text" placeholder="Person or controlled role label" />
          </div>
          <div>
            <label for="custodyChannelV162">Independent Confirmation Channel</label>
            <input id="custodyChannelV162" type="text" placeholder="In person, trusted phone call, separate directory..." />
          </div>
          <div>
            <label for="custodyEvidenceV162">Evidence Reference</label>
            <input id="custodyEvidenceV162" type="text" placeholder="Checklist ID, vault receipt, ticket, dated note..." />
          </div>
        </div>
        <label for="custodyReasonV162">Rotation Reason</label>
        <textarea id="custodyReasonV162" rows="3" placeholder="Scheduled rotation, suspected exposure, operator transition, device replacement..."></textarea>
        <label class="custody-confirmation-v162"><input id="custodyConfirmRotationV162" type="checkbox" /> I independently confirmed the successor key ID and understand that the predecessor will be marked revoked.</label>
        <div class="button-row">
          <button type="button" onclick="completeKeyRotationV162()">Complete Rotation Ceremony</button>
        </div>
      </details>

      <details>
        <summary>Lost or Unavailable Private-Key Response</summary>
        <p class="helper-text">Use this when the private key is lost, unavailable, copied to an untrusted location, or cannot be confidently controlled. Governed lost-key revocations cannot be casually restored from the older toggle control.</p>
        <div class="form-grid">
          <div>
            <label for="custodyLostKeyV162">Affected Public Key</label>
            <select id="custodyLostKeyV162"></select>
          </div>
          <div>
            <label for="custodyLostOperatorV162">Operator / Accountable Role</label>
            <input id="custodyLostOperatorV162" type="text" placeholder="Person or controlled role label" />
          </div>
          <div>
            <label for="custodyLostChannelV162">Notification / Confirmation Channel</label>
            <input id="custodyLostChannelV162" type="text" placeholder="Trusted phone tree, in-person notice, separate system..." />
          </div>
          <div>
            <label for="custodyIncidentV162">Incident / Evidence Reference</label>
            <input id="custodyIncidentV162" type="text" placeholder="Incident number, dated note, custody record..." />
          </div>
        </div>
        <label for="custodyLostReasonV162">Response Reason</label>
        <textarea id="custodyLostReasonV162" rows="3" placeholder="What happened, when it was detected, and why signing must stop..."></textarea>
        <label class="custody-confirmation-v162"><input id="custodyConfirmLostV162" type="checkbox" /> I confirm that signing with this key must stop immediately and a new key must be independently verified.</label>
        <div class="button-row">
          <button type="button" onclick="recordLostKeyResponseV162()">Record Lost-Key Response</button>
        </div>
      </details>

      <details open>
        <summary>Public Custody Manifest & Evidence</summary>
        <div class="form-grid">
          <div>
            <label for="custodyManifestByV162">Manifest Prepared By</label>
            <input id="custodyManifestByV162" type="text" placeholder="Person or accountable role label" />
          </div>
          <div>
            <label for="custodyManifestChannelV162">Fingerprint Confirmation Channel</label>
            <input id="custodyManifestChannelV162" type="text" placeholder="Independent trusted channel" />
          </div>
        </div>
        <label for="custodyManifestNotesV162">Manifest Notes</label>
        <textarea id="custodyManifestNotesV162" rows="3" placeholder="Custody location references, review boundaries, next rotation date..."></textarea>
        <div class="button-row">
          <button type="button" onclick="runKeyCustodyReviewV162()">Run Custody Review</button>
          <button type="button" onclick="exportKeyCustodyManifestV162()">Export Public Custody Manifest</button>
          <button type="button" onclick="exportKeyCustodyEventsV162()">Export Custody Events</button>
          <button type="button" onclick="downloadKeyCustodyReviewV162()">Download Review Report</button>
        </div>
        <div id="keyCustodyFindingsV162" class="custody-findings-v162"></div>
      </details>

      <details>
        <summary>Hosted Provider Conformance Contract</summary>
        <p class="helper-text">This defines the future hosted-provider boundary without enabling cloud synchronization or transmitting records.</p>
        <div class="button-row">
          <button type="button" onclick="inspectCurrentProviderV162()">Inspect Current Adapter</button>
          <button type="button" onclick="exportHostedProviderContractV162()">Export Provider Contract</button>
          <button type="button" onclick="downloadProviderInspectionV162()">Download Inspection</button>
        </div>
        <div id="hostedProviderReportV162" class="custody-findings-v162"></div>
      </details>
    `;
    anchor.insertAdjacentElement("afterend", panel);
  }

  function protectGovernedRevocations() {
    if (typeof originalToggleKeyStatus !== "function") return;
    global.togglePublicKeyStatusV16 = function protectedTogglePublicKeyStatusV16(...args) {
      const selectedId = document.getElementById("cryptoPublicKeySelectV16")?.value || "";
      const entry = readRegistry().find((item) => item.id === selectedId);
      const governed = entry?.status === "Revoked" && (entry.rotationCeremonyId || String(entry.revocationReason || "").startsWith("Lost or unavailable private key:"));
      if (governed) {
        setStatus("This key was revoked through a governed rotation or lost-key response. Create a documented replacement ceremony instead of restoring it casually.", "warning");
        return null;
      }
      return originalToggleKeyStatus.apply(this, args);
    };
  }

  function sanitizeStoredData() {
    try {
      const registry = readJson(registryKey, []);
      const sanitizedRegistry = Array.isArray(registry)
        ? registry.filter((entry) => {
            try {
              core.sanitizeEntry(entry);
              return true;
            } catch (error) {
              console.warn("Removed unsafe or invalid public-key entry.", error);
              return false;
            }
          }).map((entry) => core.sanitizeEntry(entry))
        : [];
      writeJson(registryKey, sanitizedRegistry);

      const events = readJson(custodyEventsKey, []);
      const sanitizedEvents = Array.isArray(events)
        ? events.filter((event) => {
            try {
              core.sanitizeEvent(event);
              return true;
            } catch (error) {
              console.warn("Removed unsafe or invalid custody event.", error);
              return false;
            }
          }).map((event) => core.sanitizeEvent(event)).slice(-maximumEvents)
        : [];
      writeJson(custodyEventsKey, sanitizedEvents);
    } catch (error) {
      setStatus(error.message || String(error), "warning");
    }
  }

  function readJson(key, fallback) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "null");
      return parsed == null ? fallback : parsed;
    } catch (error) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    if (core.containsPrivateKeyMaterial(value)) throw new Error(`Refused to write private key material to ${key}.`);
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readRegistry() {
    const entries = readJson(registryKey, []);
    return Array.isArray(entries) ? entries : [];
  }

  function readEvents() {
    const events = readJson(custodyEventsKey, []);
    return Array.isArray(events) ? events : [];
  }

  function writeRegistry(entries) {
    const sanitized = entries.map((entry) => core.sanitizeEntry(entry));
    writeJson(registryKey, sanitized);
  }

  function appendCustodyEvent(event) {
    const sanitized = core.sanitizeEvent(event);
    writeJson(custodyEventsKey, [...readEvents(), sanitized].slice(-maximumEvents));
    appendSigningAudit(sanitized);
  }

  function appendSigningAudit(event) {
    const existing = readJson(signingAuditKey, []);
    const audit = Array.isArray(existing) ? existing : [];
    const entry = {
      id: event.id,
      type: event.type,
      occurredAt: event.occurredAt,
      keyId: event.affectedKeyId || event.predecessorKeyId || "",
      successorKeyId: event.successorKeyId || "",
      operatorLabel: event.operatorLabel,
      reason: event.reason,
      evidenceReference: event.evidenceReference,
      source: "key-custody-v1.6.2",
      notice: core.trustNotice
    };
    writeJson(signingAuditKey, [...audit, entry].slice(-Number(config.cryptographicSigning?.maximumAuditEvents || 2000)));
  }

  function render() {
    if (!document.getElementById("keyCustodyPanelV162")) return;
    const entries = readRegistry().map((entry) => core.sanitizeEntry(entry));
    const events = readEvents().map((event) => core.sanitizeEvent(event));
    const active = entries.filter((entry) => entry.status !== "Revoked");
    const revoked = entries.filter((entry) => entry.status === "Revoked");

    populateSelect("custodyPredecessorV162", entries, "Select predecessor key");
    populateSelect("custodySuccessorV162", active, "Select active successor key");
    populateSelect("custodyLostKeyV162", active, "Select affected active key");

    const summary = document.getElementById("keyCustodySummaryV162");
    if (summary) {
      summary.innerHTML = `
        <article><strong>${entries.length}</strong><span>Public keys</span></article>
        <article><strong>${active.length}</strong><span>Active</span></article>
        <article><strong>${revoked.length}</strong><span>Revoked</span></article>
        <article><strong>${events.length}</strong><span>Custody events</span></article>
      `;
    }

    if (!lastReadinessReport) lastReadinessReport = core.createReadinessReport(entries, events);
    renderReadiness(lastReadinessReport);
  }

  function populateSelect(id, entries, placeholder) {
    const select = document.getElementById(id);
    if (!select) return;
    const previous = select.value;
    select.innerHTML = `<option value="">${escapeHtml(placeholder)}</option>` + entries.map((entry) => {
      const label = `${entry.keyLabel || "Unlabeled key"} · ${entry.id} · ${entry.status}`;
      return `<option value="${escapeHtml(entry.id)}">${escapeHtml(label)}</option>`;
    }).join("");
    if (entries.some((entry) => entry.id === previous)) select.value = previous;
  }

  function completeRotation() {
    return safely(() => {
      const result = core.applyRotation(readRegistry(), {
        predecessorKeyId: value("custodyPredecessorV162"),
        successorKeyId: value("custodySuccessorV162"),
        operatorLabel: value("custodyOperatorV162"),
        reason: value("custodyReasonV162"),
        independentConfirmationChannel: value("custodyChannelV162"),
        evidenceReference: value("custodyEvidenceV162"),
        confirmed: checked("custodyConfirmRotationV162")
      });
      writeRegistry(result.entries);
      appendCustodyEvent(result.event);
      resetCeremonyFields("rotation");
      lastReadinessReport = core.createReadinessReport(result.entries, readEvents());
      render();
      global.dispatchEvent(new CustomEvent("methodz:key-custody-event", { detail: core.clone(result.event) }));
      setStatus(`Rotation completed. ${result.event.predecessorKeyId} is revoked and ${result.event.successorKeyId} is the recorded successor.`, "ready");
      return result;
    });
  }

  function recordLostKey() {
    return safely(() => {
      const result = core.applyLostKeyResponse(readRegistry(), {
        affectedKeyId: value("custodyLostKeyV162"),
        operatorLabel: value("custodyLostOperatorV162"),
        reason: value("custodyLostReasonV162"),
        independentConfirmationChannel: value("custodyLostChannelV162"),
        incidentReference: value("custodyIncidentV162"),
        confirmed: checked("custodyConfirmLostV162")
      });
      writeRegistry(result.entries);
      appendCustodyEvent(result.event);
      resetCeremonyFields("lost");
      lastReadinessReport = core.createReadinessReport(result.entries, readEvents());
      render();
      global.dispatchEvent(new CustomEvent("methodz:key-custody-event", { detail: core.clone(result.event) }));
      setStatus(`Lost-key response recorded. ${result.event.affectedKeyId} is revoked.`, "warning");
      return result;
    });
  }

  function runReview() {
    return safely(() => {
      lastReadinessReport = core.createReadinessReport(readRegistry(), readEvents());
      renderReadiness(lastReadinessReport);
      setStatus(lastReadinessReport.ready ? "Custody review completed." : "Custody review found blocking inconsistencies.", lastReadinessReport.ready ? "ready" : "warning");
      return lastReadinessReport;
    });
  }

  function renderReadiness(report) {
    const container = document.getElementById("keyCustodyFindingsV162");
    if (!container || !report) return;
    container.innerHTML = `
      <p><strong>${report.ready ? "Review ready" : "Review needs attention"}</strong> · ${report.summary.errors} errors · ${report.summary.warnings} warnings</p>
      <ul>${report.findings.map((finding) => `<li class="custody-${escapeHtml(finding.level)}">${escapeHtml(finding.message)}</li>`).join("")}</ul>
      <p class="helper-text">${escapeHtml(report.notice)}</p>
    `;
  }

  function exportManifest() {
    return safely(() => {
      const manifest = core.buildManifest(readRegistry(), readEvents(), {
        generatedBy: value("custodyManifestByV162"),
        independentConfirmationChannel: value("custodyManifestChannelV162"),
        notes: value("custodyManifestNotesV162")
      });
      downloadJson(manifest, `methodz-public-key-custody-${today()}.json`);
      setStatus("Public custody manifest downloaded. It contains no private JWK material.", "ready");
      return manifest;
    });
  }

  function exportEvents() {
    return safely(() => {
      const payload = {
        packageType: "methodz-key-custody-event-export",
        packageVersion: 1,
        protocolVersion: core.protocolVersion,
        exportedAt: new Date().toISOString(),
        events: readEvents().map((event) => core.sanitizeEvent(event)),
        notice: core.trustNotice
      };
      downloadJson(payload, `methodz-key-custody-events-${today()}.json`);
      return payload;
    });
  }

  function downloadReview() {
    return safely(() => {
      const report = lastReadinessReport || core.createReadinessReport(readRegistry(), readEvents());
      downloadJson({ packageType: "methodz-key-custody-readiness-report", packageVersion: 1, ...report }, `methodz-key-custody-review-${today()}.json`);
      return report;
    });
  }

  async function inspectCurrentProvider() {
    return safely(async () => {
      const asyncData = global.MethodzMeetingAsyncData;
      const adapter = asyncData?.getAdapter?.();
      lastProviderReport = providerContract.inspectAdapter(adapter);
      const container = document.getElementById("hostedProviderReportV162");
      if (container) {
        container.innerHTML = `
          <p><strong>${lastProviderReport.ok ? "Hosted contract satisfied" : "Current adapter remains local-only"}</strong></p>
          <p>${escapeHtml(lastProviderReport.providerId || lastProviderReport.descriptor?.id || "No provider")}</p>
          <ul>
            ${lastProviderReport.errors.map((message) => `<li class="custody-warning">${escapeHtml(message)}</li>`).join("")}
            ${lastProviderReport.warnings.map((message) => `<li>${escapeHtml(message)}</li>`).join("")}
          </ul>
          <p class="helper-text">${escapeHtml(lastProviderReport.notice)}</p>
        `;
      }
      setStatus(lastProviderReport.ok ? "Provider descriptor satisfies the structural hosted contract." : "The current local adapter correctly does not claim hosted-provider conformance.", lastProviderReport.ok ? "ready" : "warning");
      return lastProviderReport;
    });
  }

  function exportProviderContract() {
    return safely(() => {
      const payload = providerContract.createContractPackage();
      downloadJson(payload, `methodz-hosted-provider-contract-v${providerContract.contractVersion}.json`);
      return payload;
    });
  }

  function downloadProviderInspection() {
    return safely(() => {
      if (!lastProviderReport) throw new Error("Inspect the current adapter first.");
      downloadJson({ packageType: "methodz-hosted-provider-conformance-report", packageVersion: 1, ...lastProviderReport }, `methodz-provider-inspection-${today()}.json`);
      return lastProviderReport;
    });
  }

  function resetCeremonyFields(kind) {
    const ids = kind === "rotation"
      ? ["custodyPredecessorV162", "custodySuccessorV162", "custodyReasonV162", "custodyEvidenceV162", "custodyConfirmRotationV162"]
      : ["custodyLostKeyV162", "custodyLostReasonV162", "custodyIncidentV162", "custodyConfirmLostV162"];
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (!element) return;
      if (element.type === "checkbox") element.checked = false;
      else element.value = "";
    });
  }

  function value(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function checked(id) {
    return Boolean(document.getElementById(id)?.checked);
  }

  function setStatus(message, state = "ready") {
    const element = document.getElementById("keyCustodyStatusV162");
    if (element) {
      element.className = `custody-status-v162 ${state}`;
      element.textContent = message;
    }
    if (typeof global.announceStatusV08 === "function") global.announceStatusV08(message);
  }

  function safely(callback) {
    try {
      const result = callback();
      if (result && typeof result.then === "function") {
        return result.catch((error) => {
          setStatus(error.message || String(error), "warning");
          console.error(error);
          return null;
        });
      }
      return result;
    } catch (error) {
      setStatus(error.message || String(error), "warning");
      console.error(error);
      return null;
    }
  }

  function downloadJson(payload, filename) {
    if (core.containsPrivateKeyMaterial(payload)) throw new Error("Refused to download a custody file containing private key material.");
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  global.completeKeyRotationV162 = completeRotation;
  global.recordLostKeyResponseV162 = recordLostKey;
  global.runKeyCustodyReviewV162 = runReview;
  global.exportKeyCustodyManifestV162 = exportManifest;
  global.exportKeyCustodyEventsV162 = exportEvents;
  global.downloadKeyCustodyReviewV162 = downloadReview;
  global.inspectCurrentProviderV162 = inspectCurrentProvider;
  global.exportHostedProviderContractV162 = exportProviderContract;
  global.downloadProviderInspectionV162 = downloadProviderInspection;
  global.MethodzKeyCustodyWorkspaceV162 = {
    version: "1.6.2",
    render,
    readRegistry: () => core.clone(readRegistry()),
    readEvents: () => core.clone(readEvents()),
    runReview,
    completeRotation,
    recordLostKey,
    inspectCurrentProvider
  };
})(window);
