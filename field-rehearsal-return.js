/* Methodz Meeting Manager Field Rehearsal return-to-coverage presentation. */
(function initializeMethodzFieldRehearsalReturn(global) {
  "use strict";

  const core = global.MethodzFieldRehearsalReturnCore;
  if (!core) return;

  const byId = (id) => document.getElementById(id);
  const shortSha = (value) => String(value || "").slice(0, 12);
  let currentReturnTarget = null;

  function clearRecognizedFragment() {
    try {
      global.history?.replaceState(null, "", `${global.location.pathname || ""}${global.location.search || ""}`);
    } catch (_error) {
      // A blocked history replacement does not make the handoff authoritative.
    }
  }

  function setRehearsalReturnStatus(message, isError = false) {
    const status = byId("rehearsalReturnStatus");
    if (!status) return;
    status.textContent = message;
    status.dataset.state = isError ? "error" : "ready";
  }

  function resetRehearsalReturn() {
    currentReturnTarget = null;
    const button = byId("returnToCoverage");
    if (button) button.disabled = true;
    setRehearsalReturnStatus("Download a metadata-only evidence report before returning to the Coverage Matrix.");
  }

  function acceptDownloadedEvidence(event) {
    const evidence = event?.detail?.evidence || null;
    const launch = event?.detail?.launch || null;
    const result = core.buildFromEvidence(evidence, launch);
    if (!result.ok || !result.returnTarget) {
      currentReturnTarget = null;
      const button = byId("returnToCoverage");
      if (button) button.disabled = true;
      setRehearsalReturnStatus(`Downloaded evidence cannot be returned through the exact-commit handoff (${result.errors.slice(0, 6).join(", ")}). Keep the downloaded report and correct the rehearsal metadata before using the return action.`, true);
      return;
    }

    currentReturnTarget = result.returnTarget;
    const button = byId("returnToCoverage");
    if (button) button.disabled = false;
    setRehearsalReturnStatus(`Downloaded ${currentReturnTarget.rowLabel} evidence is ready to return as context for commit ${shortSha(currentReturnTarget.commitSha)}. The report file itself will not be transferred.`);
  }

  function openCoverage() {
    if (!currentReturnTarget) return;
    const fragment = core.encodeFragment(currentReturnTarget);
    if (!fragment) {
      resetRehearsalReturn();
      setRehearsalReturnStatus("Return metadata could not be encoded. Keep the downloaded report and open the Coverage Matrix manually.", true);
      return;
    }
    global.location.href = `evidence.html${fragment}`;
  }

  function showCoverageReturn(message, isError = false) {
    const card = byId("evidenceReturnCard");
    const status = byId("evidenceReturnStatus");
    if (card) card.hidden = false;
    if (status) {
      status.textContent = message;
      status.dataset.state = isError ? "error" : "ready";
    }
  }

  function consumeCoverageReturn() {
    if (!byId("evidenceReturnCard")) return;
    const parsed = core.parseFragment(global.location?.hash || "");
    if (!parsed.recognized) return;
    clearRecognizedFragment();
    if (!parsed.ok || !parsed.returnTarget) {
      showCoverageReturn(`Recognized Field Rehearsal return handoff rejected (${parsed.errors.slice(0, 6).join(", ")}). Select the downloaded report manually below.`, true);
      return;
    }

    currentReturnTarget = parsed.returnTarget;
    if (byId("returnCoverageRow")) byId("returnCoverageRow").textContent = currentReturnTarget.rowLabel;
    if (byId("returnCoverageCommit")) byId("returnCoverageCommit").textContent = currentReturnTarget.commitSha;
    if (byId("returnCoverageReadiness")) byId("returnCoverageReadiness").textContent = currentReturnTarget.readiness;
    showCoverageReturn(`${currentReturnTarget.rowLabel} rehearsal context returned for commit ${shortSha(currentReturnTarget.commitSha)}. Select the downloaded JSON report below and choose Load Selected Evidence. No report bytes crossed this handoff.`);
  }

  function initialize() {
    const returnButton = byId("returnToCoverage");
    if (returnButton) {
      resetRehearsalReturn();
      returnButton.addEventListener("click", openCoverage);
      global.addEventListener("methodz:field-rehearsal-downloaded", acceptDownloadedEvidence);
    }
    consumeCoverageReturn();
  }

  global.MethodzFieldRehearsalReturnV1626 = Object.freeze({
    getCurrentReturnTarget: () => currentReturnTarget,
    consumeCoverageReturn
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})(window);
