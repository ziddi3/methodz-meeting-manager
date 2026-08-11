/* Methodz Meeting Manager Field Rehearsal Evidence browser presentation. */
(function initializeMethodzFieldRehearsal(global) {
  "use strict";

  const core = global.MethodzFieldRehearsalCore;
  const launchCore = global.MethodzFieldRehearsalLaunchCore;
  if (!core) return;

  let inspectedEnvironment = null;
  let currentEvidence = null;
  let currentLaunch = null;

  const byId = (id) => document.getElementById(id);
  const value = (id) => byId(id)?.value ?? "";
  const numberValue = (id) => Number(value(id) || 0);
  const shortSha = (input) => String(input || "").slice(0, 12);

  function clearRecognizedFragment() {
    try {
      global.history?.replaceState(null, "", `${global.location.pathname || ""}${global.location.search || ""}`);
    } catch (_error) {
      // The handoff remains non-authoritative if a host blocks history replacement.
    }
  }

  function showLaunchStatus(message, isError = false) {
    const card = byId("rehearsalLaunchCard");
    const status = byId("rehearsalLaunchStatus");
    if (card) card.hidden = false;
    if (status) {
      status.textContent = message;
      status.dataset.state = isError ? "error" : "ready";
    }
  }

  function applyLaunchHandoff() {
    if (!launchCore) return;
    const parsed = launchCore.parseFragment(global.location?.hash || "");
    if (!parsed.recognized) return;
    clearRecognizedFragment();
    if (!parsed.ok || !parsed.launch) {
      showLaunchStatus(`Recognized Field Rehearsal handoff rejected (${parsed.errors.slice(0, 5).join(", ")}). Enter the rehearsal metadata manually.`, true);
      return;
    }

    currentLaunch = parsed.launch;
    const expected = currentLaunch.expectedEnvironment;
    if (byId("commitSha")) byId("commitSha").value = currentLaunch.targetCommitSha;
    if (expected.platformFamily && byId("platformFamily")) byId("platformFamily").value = expected.platformFamily;
    if (expected.browserFamily && byId("browserFamily")) byId("browserFamily").value = expected.browserFamily;
    if (expected.viewportClass && byId("viewportClass")) byId("viewportClass").value = expected.viewportClass;

    if (byId("launchTargetRow")) byId("launchTargetRow").textContent = currentLaunch.rowLabel;
    if (byId("launchTargetCommit")) byId("launchTargetCommit").textContent = currentLaunch.targetCommitSha;
    if (byId("launchSourceCommit")) byId("launchSourceCommit").textContent = currentLaunch.sourceCommitSha;
    if (byId("launchCommitPolicy")) byId("launchCommitPolicy").textContent = currentLaunch.commitPolicy;
    if (byId("launchBrowserRequirement")) byId("launchBrowserRequirement").textContent = expected.browserRequirement;

    const commitMessage = currentLaunch.commitPolicy === "new-commit-required"
      ? `New evidence boundary ${shortSha(currentLaunch.targetCommitSha)} selected; source evidence remains attached to ${shortSha(currentLaunch.sourceCommitSha)}.`
      : `Same-commit evidence boundary ${shortSha(currentLaunch.targetCommitSha)} selected.`;
    showLaunchStatus(`${currentLaunch.rowLabel} loaded from the rerun plan. ${commitMessage} Inspect the actual device environment before recording results.`);
  }

  function inspectEnvironment() {
    const protocol = global.location?.protocol || "";
    const host = global.location?.hostname || "";
    let serviceWorkerMode = "direct-file";
    if (protocol === "https:") serviceWorkerMode = "https";
    else if (protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(host)) serviceWorkerMode = "localhost";

    inspectedEnvironment = {
      viewportWidth: global.innerWidth || 0,
      viewportHeight: global.innerHeight || 0,
      viewportClass: core.classifyViewport(global.innerWidth || 0),
      serviceWorkerMode,
      serviceWorkerControlled: Boolean(global.navigator?.serviceWorker?.controller),
      online: global.navigator?.onLine !== false
    };

    if (byId("viewportClass")) byId("viewportClass").value = inspectedEnvironment.viewportClass || "desktop";
    if (byId("serviceWorkerMode")) byId("serviceWorkerMode").value = serviceWorkerMode;

    const status = byId("environmentStatus");
    if (status) {
      status.textContent = `Inspected ${inspectedEnvironment.viewportWidth}×${inspectedEnvironment.viewportHeight} viewport · ${serviceWorkerMode} · ${inspectedEnvironment.serviceWorkerControlled ? "service worker controlling page" : "no controlling service worker"} · ${inspectedEnvironment.online ? "online" : "offline"}.`;
    }
  }

  function collectResults() {
    const results = {};
    core.resultKeys.forEach((key) => {
      results[key] = value(`result-${key}`);
    });
    return results;
  }

  function collectInput() {
    return {
      commitSha: value("commitSha"),
      environment: {
        ...(inspectedEnvironment || {}),
        platformFamily: value("platformFamily"),
        operatingSystemVersion: value("operatingSystemVersion"),
        browserFamily: value("browserFamily"),
        browserVersion: value("browserVersion"),
        viewportClass: value("viewportClass"),
        serviceWorkerMode: value("serviceWorkerMode")
      },
      results: collectResults(),
      aggregates: {
        registeredPanels: numberValue("registeredPanels"),
        resolvedPanels: numberValue("resolvedPanels"),
        registryErrors: numberValue("registryErrors"),
        registryWarnings: numberValue("registryWarnings"),
        coreWorkflowDurationMs: numberValue("coreWorkflowDurationMs"),
        transferDurationMs: numberValue("transferDurationMs"),
        rollbackDurationMs: numberValue("rollbackDurationMs")
      },
      blockingIssues: value("blockingIssues")
    };
  }

  function renderEvidence(evidence) {
    const readiness = byId("readinessValue");
    if (readiness) readiness.textContent = evidence.summary.readiness;
    const pass = byId("passValue");
    if (pass) pass.textContent = String(evidence.summary.pass);
    const fail = byId("failValue");
    if (fail) fail.textContent = String(evidence.summary.fail);
    const blocked = byId("blockedValue");
    if (blocked) blocked.textContent = String(evidence.summary.blocked);
    const pending = byId("pendingValue");
    if (pending) pending.textContent = String(evidence.summary.notRun + evidence.summary.notApplicable);

    const status = byId("evidenceStatus");
    if (status) {
      const suffix = evidence.summary.readiness === "ready"
        ? "All required checks are recorded as pass."
        : "Field readiness is not established until every required check is recorded as pass.";
      status.textContent = `Evidence reviewed. Readiness: ${evidence.summary.readiness}. ${suffix}`;
    }
  }

  function reviewEvidence() {
    currentEvidence = core.buildEvidence(collectInput());
    renderEvidence(currentEvidence);
    return currentEvidence;
  }

  function downloadEvidence() {
    const evidence = reviewEvidence();
    const payload = `${JSON.stringify(evidence, null, 2)}\n`;
    const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = evidence.generatedAt.slice(0, 10);
    anchor.href = url;
    anchor.download = `methodz-field-rehearsal-${stamp}.json`;
    anchor.click();
    global.dispatchEvent(new CustomEvent("methodz:field-rehearsal-downloaded", {
      detail: { evidence, launch: currentLaunch }
    }));
    setTimeout(() => URL.revokeObjectURL(url), 0);
    const status = byId("evidenceStatus");
    if (status) status.textContent = `Metadata-only evidence downloaded. Readiness: ${evidence.summary.readiness}. Protect external screenshots, traces, PDFs, and transfer packages separately.`;
  }

  function initialize() {
    applyLaunchHandoff();
    byId("inspectEnvironment")?.addEventListener("click", inspectEnvironment);
    byId("reviewEvidence")?.addEventListener("click", reviewEvidence);
    byId("downloadEvidence")?.addEventListener("click", downloadEvidence);
  }

  global.MethodzFieldRehearsalV1620 = Object.freeze({
    getCurrentEvidence: () => currentEvidence,
    getCurrentLaunch: () => currentLaunch,
    inspectEnvironment,
    reviewEvidence
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})(window);
