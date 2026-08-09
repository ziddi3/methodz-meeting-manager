/* Methodz Meeting Manager Field Evidence Rerun Plan browser layer. */
(function initializeEvidenceRerunWorkspace() {
  "use strict";

  const core = window.MethodzEvidenceRerunCore;
  if (!core) return;

  let currentCoverage = null;
  let currentWorklist = null;
  let currentPlan = null;

  const byId = (id) => document.getElementById(id);
  const buildButton = byId("buildEvidenceRerunPlan");
  const downloadSummaryButton = byId("downloadEvidenceRerunPlan");
  const downloadChecklistButton = byId("downloadEvidenceRerunChecklist");
  const status = byId("evidenceRerunStatus");
  const rowsBody = byId("evidenceRerunRows");

  function shortSha(value) {
    return String(value || "").slice(0, 12);
  }

  function resetMetrics() {
    byId("rerunOverall").textContent = "—";
    byId("rerunRows").textContent = "—";
    byId("rerunNewCommit").textContent = "—";
    byId("rerunSameCommit").textContent = "—";
  }

  function renderEmptyRows(message = "Build a rerun plan after the remediation worklist is current.") {
    rowsBody.textContent = "";
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 6;
    cell.textContent = message;
    row.appendChild(cell);
    rowsBody.appendChild(row);
  }

  function invalidate(message) {
    currentPlan = null;
    downloadSummaryButton.disabled = true;
    downloadChecklistButton.disabled = true;
    resetMetrics();
    renderEmptyRows();
    status.textContent = message || "Rerun plan not built.";
  }

  function renderPlan(plan) {
    rowsBody.textContent = "";
    if (!plan.rows.length) {
      renderEmptyRows("No rerun rows are required by the current exact-commit coverage.");
    } else {
      plan.rows.forEach((item) => {
        const row = document.createElement("tr");
        row.dataset.rerunPolicy = item.commitPolicy;
        const issues = item.blockingIssues.length ? item.blockingIssues.map((number) => `#${number}`).join(", ") : "—";
        const values = [item.rowLabel, item.sourceState, item.action, item.commitPolicy, issues, item.reason];
        values.forEach((value) => {
          const cell = document.createElement("td");
          cell.textContent = value;
          row.appendChild(cell);
        });
        rowsBody.appendChild(row);
      });
    }

    byId("rerunOverall").textContent = plan.status;
    byId("rerunRows").textContent = String(plan.rowCount);
    byId("rerunNewCommit").textContent = String(plan.counts.newCommitRequired);
    byId("rerunSameCommit").textContent = String(plan.counts.sameCommitRequired + plan.counts.sameCommitConditional);
  }

  function buildPlan() {
    if (!currentCoverage || !currentWorklist) {
      status.textContent = "Build the current remediation worklist first.";
      return;
    }
    const result = core.buildPlan(currentCoverage, currentWorklist);
    if (!result.ok || !result.plan) {
      currentPlan = null;
      downloadSummaryButton.disabled = true;
      downloadChecklistButton.disabled = true;
      status.textContent = `Coverage and remediation could not be converted into a rerun plan (${result.errors.slice(0, 6).join(", ")}).`;
      return;
    }

    currentPlan = result.plan;
    renderPlan(currentPlan);
    downloadSummaryButton.disabled = false;
    downloadChecklistButton.disabled = false;
    if (currentPlan.mode === "new-commit-cycle") {
      status.textContent = `Code remediation exists on ${shortSha(currentPlan.sourceCommitSha)}. The plan requires a new commit, then replacement evidence for all six coverage rows.`;
    } else if (currentPlan.mode === "same-commit-cycle") {
      status.textContent = `${currentPlan.rowCount} unresolved row${currentPlan.rowCount === 1 ? "" : "s"} can be rehearsed against ${shortSha(currentPlan.sourceCommitSha)} while code remains unchanged.`;
    } else {
      status.textContent = `Commit ${shortSha(currentPlan.sourceCommitSha)} has no rerun work in the current remediation worklist.`;
    }
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
    if (!currentPlan) return;
    const report = core.buildPlanSummary(currentPlan);
    if (!report) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadText(
      `methodz-field-rerun-${shortSha(currentPlan.sourceCommitSha)}-${stamp}.json`,
      `${JSON.stringify(report, null, 2)}\n`,
      "application/json"
    );
  }

  function downloadChecklist() {
    if (!currentPlan) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadText(
      `methodz-field-rerun-checklist-${shortSha(currentPlan.sourceCommitSha)}-${stamp}.md`,
      core.buildChecklist(currentPlan),
      "text/markdown"
    );
  }

  window.addEventListener("methodz:evidence-remediation", (event) => {
    currentCoverage = event?.detail?.coverage || null;
    currentWorklist = event?.detail?.worklist || null;
    buildButton.disabled = !(currentCoverage && currentWorklist);
    invalidate(currentWorklist
      ? "Remediation is current. Select Build Rerun Plan to establish the exact commit policy for the next physical-device rehearsals."
      : "Build the current remediation worklist above before deriving a rerun plan.");
  });

  buildButton.addEventListener("click", buildPlan);
  downloadSummaryButton.addEventListener("click", downloadSummary);
  downloadChecklistButton.addEventListener("click", downloadChecklist);

  buildButton.disabled = true;
  downloadSummaryButton.disabled = true;
  downloadChecklistButton.disabled = true;
  resetMetrics();
  renderEmptyRows();
})();
