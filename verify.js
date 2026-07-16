/* Methodz Meeting Manager v1.5 standalone signed-package verifier. */
(function initializeMethodzStandaloneVerifierV15(global) {
  "use strict";

  let loadedPackage = null;
  let verification = null;

  function core() {
    if (!global.MethodzCryptoPackageV15) throw new Error("The Methodz cryptographic verification core is unavailable.");
    return global.MethodzCryptoPackageV15;
  }

  async function loadPackage(event) {
    try {
      const input = event?.target;
      const file = input?.files?.[0];
      if (!file) return;
      loadedPackage = JSON.parse(await file.text());
      verification = null;
      renderSummary();
      renderResult();
    } catch (error) {
      handleError(error);
    }
  }

  async function verifySelected() {
    try {
      if (!loadedPackage) throw new Error("Choose a signed JSON package first.");
      verification = await core().verifyPackage(loadedPackage);
      verification.verifiedAt = new Date().toISOString();
      renderResult();
      return verification;
    } catch (error) {
      return handleError(error);
    }
  }

  function downloadReport() {
    try {
      if (!verification) throw new Error("Run verification before downloading a report.");
      const report = {
        packageType: "methodz-signature-verification-report",
        packageVersion: 1,
        generatedAt: new Date().toISOString(),
        sourcePackage: {
          packageType: loadedPackage?.packageType || "",
          sourceReference: clone(loadedPackage?.manifest?.sourceReference || {}),
          approvalId: loadedPackage?.approval?.approvalId || ""
        },
        verification
      };
      const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `methodz-signature-verification-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      handleError(error);
    }
  }

  function renderSummary() {
    const element = document.getElementById("verifyPackageSummaryV15");
    if (!element) return;
    if (!loadedPackage) {
      element.textContent = "No package loaded.";
      return;
    }
    const signature = loadedPackage.signatureEnvelope;
    const source = loadedPackage.manifest?.sourceReference || {};
    element.innerHTML = `<strong>${escapeHtml(loadedPackage.packageType || "JSON package")}</strong>
      <span>${escapeHtml(source.title || loadedPackage.record?.title || "Untitled package")}</span>
      <span>${signature ? `Signature key: ${escapeHtml(signature.keyId || "Unknown")}` : "No supported signature envelope detected"}</span>`;
  }

  function renderResult() {
    const element = document.getElementById("verifyResultV15");
    if (!element) return;
    if (!verification) {
      element.textContent = "No verification has been run.";
      element.dataset.state = "";
      return;
    }
    element.dataset.state = verification.valid ? "valid" : "invalid";
    element.innerHTML = `<h2>${verification.valid ? "Valid Signature" : "Invalid Signature"}</h2>
      <dl>
        <dt>Key ID</dt><dd><code>${escapeHtml(verification.keyId || "Unavailable")}</code></dd>
        <dt>Signer label</dt><dd>${escapeHtml(verification.signerLabel || "Not recorded")}</dd>
        <dt>Key label</dt><dd>${escapeHtml(verification.keyLabel || "Not recorded")}</dd>
        <dt>Signed at</dt><dd>${escapeHtml(formatDateTime(verification.signedAt) || "Not recorded")}</dd>
        <dt>Signature</dt><dd>${verification.signatureValid ? "Valid" : "Invalid"}</dd>
        <dt>Payload digest</dt><dd>${verification.digestMatches ? "Matches" : "Mismatch"}</dd>
        <dt>Public key ID</dt><dd>${verification.keyIdMatches ? "Matches" : "Mismatch"}</dd>
      </dl>
      ${verification.errors?.length ? `<ul>${verification.errors.map((error) => `<li>${escapeHtml(error)}</li>`).join("")}</ul>` : ""}
      <p>${escapeHtml(verification.notice || "")}</p>`;
  }

  function handleError(error) {
    verification = {
      valid: false,
      signatureValid: false,
      digestMatches: false,
      keyIdMatches: false,
      keyId: "",
      signerLabel: "",
      keyLabel: "",
      signedAt: "",
      errors: [error?.message || String(error)],
      notice: "Verification could not be completed."
    };
    renderResult();
    return null;
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

  function formatDateTime(value) {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  global.loadStandalonePackageV15 = loadPackage;
  global.verifySelectedPackageV15 = verifySelected;
  global.downloadStandaloneVerificationV15 = downloadReport;
})(window);
