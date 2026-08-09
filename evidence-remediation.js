/* Methodz Meeting Manager Field Evidence Remediation browser layer. */
(function initializeEvidenceRemediationWorkspace() {
  "use strict";

  const core = window.MethodzEvidenceRemediationCore;
  if (!core) return;

  let currentCoverage = null;
  let currentWorklist = null;

  const byId = (id) => document.getElementById(id);
  const buildButton = byId("buildEvidenceRemediation");
  const downloadSummaryButton = byId("downloadEvidenceRemediation");
  const downloadDraftsButton = byId("downloadEvidenceIssueDrafts");
  const status = byId("evidenceRemediationStatus");
  const rowsBody = byId("evidenceRemediationRows");

  function shortSha(value) {
    return String(value || "").slice(0, 12);
  }

  function resetMetrics() {
    byId("remediationOverall").textContent = "—";
    byId("remediationCode").textContent = "—";
    byId("remediationEnvironment").textContent = "—";
    byId("remediationEvidence").textContent = "—";
  }

  function renderEmptyRows(message = "Build the worklist after evaluating one commit.") {
    rowsBody.textContent = "";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = message;
    row.appendChild(cell);
    rowsBody.appendChild(row);
  }

  function invalidate(message) {
    currentWorklist = null;
    downloadSummaryButton.disabled = true;
    downloadDraftsButton.disabled = true;
    resetMetrics();
    renderEmptyRows();
    status.textContent = message || "Remediation worklist not built.";
  }

  function renderWorklist(worklist) {
    rowsBody.textContent = "";
    if (!worklist.items.length) {
      renderEmptyRows("No remediation rows are required by the evaluated coverage matrix.");
    } else {
      worklist.items.forEach((item) => {
        const row = document.createElement("tr");
        row.dataset.remediationState = item.state;
        const issueText = item.blockingIssues.length ? item.blockingIssues.map((number) => `#${number}`).join(", ") : "—";
        const values = [
          item.rowLabel,
          item.state,
          item.actionType,
          String(item.priority),
          issueText,
          item.nextAction
        ];
        values.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        });
        rowsBody.appendChild(row);
      });
    }

    byId("remediationOverall").textContent = worklist.status;
    byId("remediationCode").textContent = String(worklist.counts.codeRemediation);
    byId("remediationEnvironment").textContent = String(worklist.counts.environmentRemediation);
    byId("remediationEvidence").textContent = String(worklist.counts.evidenceCompletion + worklist.counts.evidenceCollection);
  }

  function buildWorklist() {
    if (!currentCoverage) {
      status.textContent = "Evaluate a commit in the Field Evidence Matrix first.";
      return;
    }
    const result = core.buildWorklist(currentCoverage);
    if (!result.ok || !result.worklist) {
      currentWorklist = null;
      downloadSummaryButton.disabled = true;
      downloadDraftsButton.disabled = true;
      status.textContent = `Coverage could not be converted into a remediation worklist (${result.errors.slice(0, 6).join(", ")}).`;
      return;
    }

    currentWorklist = result.worklist;
    renderWorklist(currentWorklist);
    downloadSummaryButton.disabled = false;
    downloadDraftsButton.disabled = currentWorklist.items.length === 0;
    status.textContent = currentWorklist.items.length
      ? `${currentWorklist.itemCount} remediation row${currentWorklist.itemCount === 1 ? "" : "s"} derived for commit ${shortSha(currentWorklist.commitSha)}. Drafts are operator aids only; no GitHub issue was created.`
      : `Commit ${shortSha(currentWorklist.commitSha)} has no fail, blocked, incomplete, or missing coverage rows. No remediation draft is required.`;
  }

  function downloadText(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function downloadSummary() {
    if (!currentWorklist) return;
    const report = core.buildWorklistSummary(currentWorklist);
    if (!report) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadText(
      `methodz-field-remediation-${shortSha(currentWorklist.commitSha)}-${stamp}.json`,
      `${JSON.stringify(report, null, 2)}\n`,
      "application/json"
    );
  }

  function downloadDrafts() {
    if (!currentWorklist || currentWorklist.items.length === 0) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadText(
      `methodz-field-remediation-issue-drafts-${shortSha(currentWorklist.commitSha)}-${stamp}.md`,
      core.buildIssueDraftBundle(currentWorklist),
      "text/markdown"
    );
  }

  window.addEventListener("methodz:evidence-coverage", (event) => {
    currentCoverage = event?.detail?.coverage || null;
    buildButton.disabled = !currentCoverage;
    invalidate(currentCoverage
      ? "Coverage is available. Select Build Remediation Worklist to derive operator-controlled next actions."
      : "Evaluate one exact commit above before building a remediation worklist.");
  });

  buildButton.addEventListener("click", buildWorklist);
  downloadSummaryButton.addEventListener("click", downloadSummary);
  downloadDraftsButton.addEventListener("click", downloadDrafts);

  buildButton.disabled = true;
  downloadSummaryButton.disabled = true;
  downloadDraftsButton.disabled = true;
  resetMetrics();
  renderEmptyRows();
})();
