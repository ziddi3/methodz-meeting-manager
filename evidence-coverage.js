/* Methodz Meeting Manager Field Evidence Coverage browser layer. */
(function initializeEvidenceCoverageWorkspace() {
  "use strict";

  const core = window.MethodzEvidenceCoverageCore;
  const integrityCore = window.MethodzFieldEvidenceIntegrityCore;
  const returnCore = window.MethodzFieldRehearsalReturnCore;
  if (!core) return;

  const MAX_FILE_BYTES = 512 * 1024;
  const loadedReports = [];
  let rejectedFiles = 0;
  let lastCoverage = null;

  const byId = (id) => document.getElementById(id);
  const fileInput = byId("evidenceCoverageFiles");
  const loadButton = byId("loadEvidenceCoverage");
  const clearButton = byId("clearEvidenceCoverage");
  const commitSelect = byId("evidenceCoverageCommit");
  const evaluateButton = byId("evaluateEvidenceCoverage");
  const downloadButton = byId("downloadEvidenceCoverage");
  const importStatus = byId("evidenceCoverageImportStatus");
  const evaluationStatus = byId("evidenceCoverageStatus");
  const rowsBody = byId("evidenceCoverageRows");

  function broadcastCoverage(coverage) {
    window.dispatchEvent(new CustomEvent("methodz:evidence-coverage", {
      detail: { coverage: coverage || null }
    }));
  }

  function broadcastReceiptVerification(ok, errors = []) {
    window.dispatchEvent(new CustomEvent("methodz:evidence-receipt-verification", {
      detail: { ok: Boolean(ok), errors: Array.isArray(errors) ? errors.slice(0, 12) : [] }
    }));
  }

  function currentReturnTarget() {
    return window.MethodzFieldRehearsalReturnV1627?.getCurrentReturnTarget?.() || null;
  }

  function shortSha(value) {
    return String(value || "").slice(0, 12);
  }

  function resetSummaryMetrics() {
    byId("coverageOverall").textContent = "—";
    byId("coverageReady").textContent = "—";
    byId("coverageMissing").textContent = "—";
    byId("coverageNeedsReview").textContent = "—";
  }

  function renderEmptyRows() {
    rowsBody.textContent = "";
    core.coverageRows.forEach((definition) => {
      const row = document.createElement("tr");
      const values = [definition.label, "Not evaluated", "0", "—", "—", "—"];
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      rowsBody.appendChild(row);
    });
  }

  function renderCoverage(coverage) {
    rowsBody.textContent = "";
    coverage.rows.forEach((item) => {
      const row = document.createElement("tr");
      row.dataset.coverageState = item.state;
      const issueText = item.blockingIssues.length ? item.blockingIssues.map((number) => `#${number}`).join(", ") : "—";
      const values = [
        item.label,
        item.state,
        String(item.evidenceCount),
        item.latestGeneratedAt ? new Date(item.latestGeneratedAt).toLocaleString() : "—",
        item.browserFamily || "—",
        issueText
      ];
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      rowsBody.appendChild(row);
    });

    const reviewCount = coverage.counts.fail + coverage.counts.blocked + coverage.counts.incomplete;
    byId("coverageOverall").textContent = coverage.status;
    byId("coverageReady").textContent = `${coverage.counts.ready}/${coverage.rowCount}`;
    byId("coverageMissing").textContent = String(coverage.counts.missing);
    byId("coverageNeedsReview").textContent = String(reviewCount);
  }

  function invalidateCoverage(message) {
    lastCoverage = null;
    downloadButton.disabled = true;
    resetSummaryMetrics();
    renderEmptyRows();
    evaluationStatus.textContent = message || "Coverage not evaluated.";
    broadcastCoverage(null);
  }

  function renderCommitOptions() {
    const commits = core.listCommits(loadedReports);
    commitSelect.textContent = "";

    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = commits.length > 1 ? "Select a commit…" : commits.length === 1 ? "Select commit" : "No commits loaded";
    commitSelect.appendChild(placeholder);

    commits.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.commitSha;
      option.textContent = `${shortSha(entry.commitSha)} · ${entry.reportCount} report${entry.reportCount === 1 ? "" : "s"}`;
      commitSelect.appendChild(option);
    });

    if (commits.length === 1) commitSelect.value = commits[0].commitSha;
    evaluateButton.disabled = !commitSelect.value;
    byId("evidenceCommitCount").textContent = String(commits.length);
  }

  async function loadSelectedEvidence() {
    const files = Array.from(fileInput.files || []).slice(0, core.maxReports);
    if (!files.length) {
      importStatus.textContent = "Select one or more Field Rehearsal evidence JSON files first.";
      return;
    }

    loadedReports.length = 0;
    rejectedFiles = 0;
    const rejectionCodes = new Set();
    const stagedReports = [];
    const returnTarget = currentReturnTarget();
    let receiptMatched = !returnTarget;
    let receiptMetadataMatched = !returnTarget;
    const receiptErrors = new Set();

    if (returnTarget && (!integrityCore || !returnCore)) {
      receiptErrors.add("receipt:integrity-core-unavailable");
    }

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        rejectedFiles += 1;
        rejectionCodes.add("file-too-large");
        continue;
      }
      try {
        const sourceText = await file.text();
        let digest = "";
        if (returnTarget && integrityCore) {
          try {
            digest = await integrityCore.sha256Text(sourceText);
          } catch (error) {
            receiptErrors.add(String(error?.message || "receipt:digest-failed").slice(0, 96));
          }
        }

        const parsed = JSON.parse(sourceText);
        const result = core.validateAndNormalizeReport(parsed);
        if (!result.ok) {
          rejectedFiles += 1;
          result.errors.slice(0, 6).forEach((error) => rejectionCodes.add(error));
          if (returnTarget && integrityCore?.receiptMatches(returnTarget.evidenceSha256, digest)) {
            receiptMatched = true;
            result.errors.slice(0, 6).forEach((error) => receiptErrors.add(`receipt:${error}`));
          }
          continue;
        }

        stagedReports.push(result.report);
        if (returnTarget && integrityCore?.receiptMatches(returnTarget.evidenceSha256, digest)) {
          receiptMatched = true;
          const metadata = returnCore?.matchesReportMetadata(returnTarget, result.report);
          if (metadata?.ok) receiptMetadataMatched = true;
          else (metadata?.errors || ["receipt:metadata-check-failed"]).slice(0, 6).forEach((error) => receiptErrors.add(error));
        }
      } catch (_error) {
        rejectedFiles += 1;
        rejectionCodes.add("file-invalid-json");
      }
    }

    if (returnTarget && (!receiptMatched || !receiptMetadataMatched)) {
      loadedReports.length = 0;
      if (!receiptMatched) receiptErrors.add("receipt:file-mismatch");
      if (receiptMatched && !receiptMetadataMatched) receiptErrors.add("receipt:metadata-drift");
      byId("evidenceAcceptedCount").textContent = "0";
      byId("evidenceRejectedCount").textContent = String(Math.max(rejectedFiles, files.length));
      renderCommitOptions();
      invalidateCoverage("Returned evidence was not verified. No return-driven evidence was accepted.");
      const codes = Array.from(receiptErrors).slice(0, 6);
      importStatus.textContent = `No reports accepted through the returned receipt (${codes.join(", ") || "receipt-verification-failed"}). Select the exact JSON downloaded from Field Rehearsal, or reopen this workspace without return context for ordinary manual import.`;
      broadcastReceiptVerification(false, codes);
      return;
    }

    loadedReports.push(...stagedReports);
    byId("evidenceAcceptedCount").textContent = String(loadedReports.length);
    byId("evidenceRejectedCount").textContent = String(rejectedFiles);
    renderCommitOptions();
    invalidateCoverage("Evidence changed. Select a commit and evaluate coverage.");

    const commits = core.listCommits(loadedReports);
    const mixedCommitNotice = commits.length > 1 ? " Multiple commits detected; they will not be combined." : "";
    const receiptNotice = returnTarget ? ` Returned SHA-256 receipt verified for ${returnTarget.rowLabel} on commit ${shortSha(returnTarget.commitSha)}.` : "";
    importStatus.textContent = loadedReports.length
      ? `${loadedReports.length} report${loadedReports.length === 1 ? "" : "s"} accepted in memory.${rejectedFiles ? ` ${rejectedFiles} rejected (${Array.from(rejectionCodes).slice(0, 6).join(", ")}).` : ""}${mixedCommitNotice}${receiptNotice}`
      : `No reports accepted.${rejectedFiles ? ` Rejected ${rejectedFiles} (${Array.from(rejectionCodes).slice(0, 6).join(", ")}).` : ""}`;
    if (returnTarget) broadcastReceiptVerification(true, []);
  }

  function evaluateCoverage() {
    const selectedCommit = commitSelect.value;
    if (!selectedCommit) {
      evaluationStatus.textContent = "Select a commit before evaluating coverage.";
      return;
    }
    lastCoverage = core.buildCoverage(loadedReports, selectedCommit);
    renderCoverage(lastCoverage);
    downloadButton.disabled = false;
    const issueText = lastCoverage.referencedIssues.length
      ? ` Referenced blocking issues: ${lastCoverage.referencedIssues.map((number) => `#${number}`).join(", ")}.`
      : "";
    evaluationStatus.textContent = lastCoverage.status === "coverage-complete"
      ? `All ${lastCoverage.rowCount} documented rows have latest ready evidence for commit ${shortSha(selectedCommit)}. This is coverage completeness only, not production readiness.${issueText}`
      : `Coverage for commit ${shortSha(selectedCommit)} is incomplete: ${lastCoverage.counts.ready}/${lastCoverage.rowCount} rows ready.${issueText}`;
    broadcastCoverage(lastCoverage);
  }

  function clearEvidence() {
    loadedReports.length = 0;
    rejectedFiles = 0;
    lastCoverage = null;
    fileInput.value = "";
    byId("evidenceAcceptedCount").textContent = "0";
    byId("evidenceRejectedCount").textContent = "0";
    byId("evidenceCommitCount").textContent = "0";
    renderCommitOptions();
    evaluateButton.disabled = true;
    downloadButton.disabled = true;
    importStatus.textContent = "No evidence loaded.";
    evaluationStatus.textContent = "Coverage not evaluated.";
    resetSummaryMetrics();
    renderEmptyRows();
    broadcastCoverage(null);
  }

  function downloadSummary() {
    if (!lastCoverage) return;
    const report = core.buildCoverageSummary(lastCoverage);
    const blob = new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `methodz-field-evidence-coverage-${shortSha(lastCoverage.commitSha)}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  loadButton.addEventListener("click", loadSelectedEvidence);
  clearButton.addEventListener("click", clearEvidence);
  commitSelect.addEventListener("change", () => {
    evaluateButton.disabled = !commitSelect.value;
    invalidateCoverage("Commit selection changed. Evaluate coverage to refresh the matrix.");
  });
  evaluateButton.addEventListener("click", evaluateCoverage);
  downloadButton.addEventListener("click", downloadSummary);

  renderCommitOptions();
  resetSummaryMetrics();
  renderEmptyRows();
})();
