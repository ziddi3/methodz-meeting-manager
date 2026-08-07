/* Methodz Meeting Manager Performance Evidence Compare browser layer. */
(function initializePerformanceEvidenceWorkspace() {
  "use strict";

  const core = window.MethodzPerformanceEvidenceCore;
  if (!core) return;

  const MAX_FILE_BYTES = 512 * 1024;
  const loadedRuns = [];
  let rejectedFiles = 0;
  let lastComparison = null;

  const byId = (id) => document.getElementById(id);
  const fileInput = byId("performanceEvidenceFiles");
  const loadButton = byId("loadPerformanceEvidence");
  const clearButton = byId("clearPerformanceEvidence");
  const compareButton = byId("comparePerformanceEvidence");
  const downloadButton = byId("downloadPerformanceEvidence");
  const importStatus = byId("performanceImportStatus");
  const comparisonStatus = byId("performanceComparisonStatus");
  const runRows = byId("performanceRunRows");

  function formatNumber(value) {
    return Number.isFinite(value) ? new Intl.NumberFormat("en-CA", { maximumFractionDigits: 2 }).format(value) : "—";
  }

  function resetMetrics() {
    byId("acceptedRunCount").textContent = String(loadedRuns.length);
    byId("rejectedRunCount").textContent = String(rejectedFiles);
    byId("performanceTrend").textContent = "—";
    byId("baselineDuration").textContent = "—";
    byId("latestDuration").textContent = "—";
    byId("medianDuration").textContent = "—";
    byId("regressionPercent").textContent = "—";
    byId("targetPassCount").textContent = "—";
  }

  function renderRuns(runs) {
    runRows.textContent = "";
    if (!runs.length) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.textContent = "No accepted evidence loaded.";
      row.appendChild(cell);
      runRows.appendChild(row);
      return;
    }

    runs.forEach((run, index) => {
      const row = document.createElement("tr");
      const values = [
        String(index + 1),
        new Date(run.generatedAt).toLocaleString(),
        `${formatNumber(run.durationMs)} ms`,
        `${formatNumber(run.targetDurationMs)} ms ${run.targetMet ? "✓" : "review"}`,
        run.throughputTasksPerSecond == null ? "—" : `${formatNumber(run.throughputTasksPerSecond)} tasks/s`,
        formatNumber(run.counts.syntheticTasks),
        run.capacity.utilizationPercent == null
          ? run.capacity.status
          : `${run.capacity.status} · ${formatNumber(run.capacity.utilizationPercent)}%`
      ];
      values.forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      runRows.appendChild(row);
    });
  }

  function invalidateComparison(message) {
    lastComparison = null;
    downloadButton.disabled = true;
    comparisonStatus.textContent = message || "Comparison not run.";
    resetMetrics();
    renderRuns(loadedRuns);
  }

  async function readSelectedFiles() {
    const files = Array.from(fileInput.files || []).slice(0, core.maxRuns);
    if (!files.length) {
      importStatus.textContent = "Select one or more Workspace Capacity rehearsal JSON files first.";
      return;
    }

    loadedRuns.length = 0;
    rejectedFiles = 0;
    const rejectionCodes = new Set();

    for (const file of files) {
      if (file.size > MAX_FILE_BYTES) {
        rejectedFiles += 1;
        rejectionCodes.add("file-too-large");
        continue;
      }
      try {
        const parsed = JSON.parse(await file.text());
        const result = core.validateAndNormalizeReport(parsed);
        if (!result.ok) {
          rejectedFiles += 1;
          result.errors.slice(0, 6).forEach((error) => rejectionCodes.add(error));
          continue;
        }
        loadedRuns.push(result.run);
      } catch (error) {
        rejectedFiles += 1;
        rejectionCodes.add("file-invalid-json");
      }
    }

    byId("acceptedRunCount").textContent = String(loadedRuns.length);
    byId("rejectedRunCount").textContent = String(rejectedFiles);
    compareButton.disabled = loadedRuns.length === 0;
    invalidateComparison("Evidence changed. Run comparison to refresh metrics.");
    importStatus.textContent = loadedRuns.length
      ? `${loadedRuns.length} run${loadedRuns.length === 1 ? "" : "s"} accepted in memory.${rejectedFiles ? ` ${rejectedFiles} rejected (${Array.from(rejectionCodes).slice(0, 6).join(", ")}).` : ""}`
      : `No reports accepted.${rejectedFiles ? ` Rejected ${rejectedFiles} (${Array.from(rejectionCodes).slice(0, 6).join(", ")}).` : ""}`;
  }

  function compareLoadedRuns() {
    if (!loadedRuns.length) return;
    lastComparison = core.compareRuns(loadedRuns);
    const metrics = lastComparison.metrics;
    byId("performanceTrend").textContent = lastComparison.trend;
    byId("baselineDuration").textContent = formatNumber(lastComparison.baseline?.durationMs);
    byId("latestDuration").textContent = formatNumber(lastComparison.latest?.durationMs);
    byId("medianDuration").textContent = formatNumber(metrics?.medianDurationMs);
    byId("regressionPercent").textContent = metrics?.baselineToLatestPercent == null
      ? "—"
      : `${metrics.baselineToLatestPercent > 0 ? "+" : ""}${formatNumber(metrics.baselineToLatestPercent)}%`;
    byId("targetPassCount").textContent = metrics ? `${metrics.targetPasses}/${lastComparison.runCount}` : "—";
    renderRuns(lastComparison.runs);
    downloadButton.disabled = false;
    comparisonStatus.textContent = lastComparison.runCount === 1
      ? "Baseline captured. Import at least one later run to calculate a trend."
      : `Comparison complete: ${lastComparison.trend}. Earliest accepted evidence is the baseline.`;
  }

  function clearEvidence() {
    loadedRuns.length = 0;
    rejectedFiles = 0;
    lastComparison = null;
    fileInput.value = "";
    compareButton.disabled = true;
    downloadButton.disabled = true;
    importStatus.textContent = "No evidence loaded.";
    comparisonStatus.textContent = "Comparison not run.";
    resetMetrics();
    renderRuns([]);
  }

  function downloadSummary() {
    if (!lastComparison) return;
    const report = core.buildComparisonReport(lastComparison);
    const blob = new Blob([`${JSON.stringify(report, null, 2)}\n`], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `methodz-performance-evidence-summary-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  loadButton.addEventListener("click", readSelectedFiles);
  clearButton.addEventListener("click", clearEvidence);
  compareButton.addEventListener("click", compareLoadedRuns);
  downloadButton.addEventListener("click", downloadSummary);

  resetMetrics();
  renderRuns([]);
})();
