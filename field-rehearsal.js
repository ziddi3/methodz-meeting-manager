/* Methodz Meeting Manager Field Rehearsal Evidence browser presentation. */
(function initializeMethodzFieldRehearsal(global) {
  "use strict";

  const core = global.MethodzFieldRehearsalCore;
  if (!core) return;

  let inspectedEnvironment = null;
  let currentEvidence = null;

  const byId = (id) => document.getElementById(id);
  const value = (id) => byId(id)?.value ?? "";
  const numberValue = (id) => Number(value(id) || 0);

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
    setTimeout(() => URL.revokeObjectURL(url), 0);
    const status = byId("evidenceStatus");
    if (status) status.textContent = `Metadata-only evidence downloaded. Readiness: ${evidence.summary.readiness}. Protect external screenshots, traces, PDFs, and transfer packages separately.`;
  }

  function initialize() {
    byId("inspectEnvironment")?.addEventListener("click", inspectEnvironment);
    byId("reviewEvidence")?.addEventListener("click", reviewEvidence);
    byId("downloadEvidence")?.addEventListener("click", downloadEvidence);
  }

  global.MethodzFieldRehearsalV1620 = Object.freeze({
    getCurrentEvidence: () => currentEvidence,
    inspectEnvironment,
    reviewEvidence
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})(window);
