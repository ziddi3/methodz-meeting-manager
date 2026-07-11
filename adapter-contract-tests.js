/* Methodz Meeting Manager v0.8 adapter contract test harness. */
(function initializeAdapterTests(global) {
  "use strict";

  const REQUIRED_METHODS = [
    "listRecords",
    "getRecord",
    "replaceRecords",
    "upsertRecord",
    "deleteRecord",
    "healthCheck"
  ];

  let lastReport = null;

  global.addEventListener("DOMContentLoaded", initializeV08AdapterTests);

  function initializeV08AdapterTests() {
    installAdapterTestPanelV08();
  }

  function installAdapterTestPanelV08() {
    const adapterPanel = document.getElementById("dataAdapterPanelV07");
    if (!adapterPanel || document.getElementById("adapterTestPanelV08")) return;

    const panel = document.createElement("section");
    panel.id = "adapterTestPanelV08";
    panel.className = "card v08-card adapter-tests-v08";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Adapter Contract Tests</h2>
          <p class="helper-text">Runs isolated tests against a temporary local-storage adapter. Active meeting records are not modified.</p>
        </div>
        <div class="adapter-badge" id="adapterTestBadgeV08">Not run</div>
      </div>
      <div class="button-row">
        <button type="button" onclick="runAdapterContractTestsV08()">Run Contract Tests</button>
        <button type="button" id="downloadAdapterReportButtonV08" onclick="downloadAdapterTestReportV08()" disabled>Download Test Report</button>
      </div>
      <div id="adapterTestResultsV08" aria-live="polite"></div>
    `;

    adapterPanel.insertAdjacentElement("afterend", panel);
  }

  function runAdapterContractTestsV08() {
    const startedAt = new Date().toISOString();
    const results = [];
    const manager = global.MethodzMeetingData;

    testV08(results, "Manager is available", () => Boolean(manager));
    testV08(results, "Active adapter exposes required contract methods", () => {
      const adapter = manager?.getAdapter?.();
      return REQUIRED_METHODS.every((method) => typeof adapter?.[method] === "function");
    });

    const TempAdapter = manager?.LocalStorageMeetingAdapter;
    const tempKey = `methodzAdapterContractTest:${Date.now()}:${Math.random().toString(16).slice(2)}`;
    let adapter = null;

    testV08(results, "LocalStorageMeetingAdapter constructor is available", () => typeof TempAdapter === "function");

    try {
      if (typeof TempAdapter === "function") {
        adapter = new TempAdapter({ id: "contract-test", label: "Contract Test Adapter", recordsKey: tempKey });

        testV08(results, "New adapter starts with an empty record list", () => {
          return Array.isArray(adapter.listRecords()) && adapter.listRecords().length === 0;
        });

        const first = { id: "test-record-1", title: "Contract Test", tasks: [] };
        testV08(results, "upsertRecord creates a record", () => {
          adapter.upsertRecord(first);
          return adapter.listRecords().length === 1;
        });

        testV08(results, "getRecord returns the requested record", () => adapter.getRecord(first.id)?.title === first.title);

        testV08(results, "upsertRecord updates an existing record", () => {
          adapter.upsertRecord({ ...first, title: "Updated Contract Test" });
          return adapter.listRecords().length === 1 && adapter.getRecord(first.id)?.title === "Updated Contract Test";
        });

        testV08(results, "replaceRecords replaces the entire collection", () => {
          adapter.replaceRecords([
            { id: "test-record-2", title: "Second" },
            { id: "test-record-3", title: "Third" }
          ]);
          return adapter.listRecords().length === 2 && adapter.getRecord("test-record-1") === null;
        });

        testV08(results, "deleteRecord removes only the requested record", () => {
          const removed = adapter.deleteRecord("test-record-2");
          return removed === true && adapter.listRecords().length === 1 && adapter.getRecord("test-record-3")?.title === "Third";
        });

        testV08(results, "createExportEnvelope returns records and adapter metadata", () => {
          const envelope = adapter.createExportEnvelope?.({ testMode: true });
          return envelope?.adapterId === "contract-test" && envelope?.testMode === true && envelope?.records?.length === 1;
        });

        testV08(results, "healthCheck completes successfully", () => adapter.healthCheck()?.ok === true);
      }
    } finally {
      global.localStorage.removeItem(tempKey);
      global.localStorage.removeItem(`${tempKey}:adapter-probe`);
    }

    const passed = results.filter((result) => result.passed).length;
    lastReport = {
      reportType: "methodz-adapter-contract-tests",
      contractVersion: manager?.version || "unknown",
      startedAt,
      completedAt: new Date().toISOString(),
      passed,
      failed: results.length - passed,
      total: results.length,
      activeAdapter: manager?.getAdapterInfo?.() || null,
      results
    };

    renderAdapterTestResultsV08(lastReport);
    return lastReport;
  }

  function testV08(results, name, test) {
    try {
      const passed = test() === true;
      results.push({ name, passed, detail: passed ? "Passed" : "Returned false" });
    } catch (error) {
      results.push({ name, passed: false, detail: error.message || String(error) });
    }
  }

  function renderAdapterTestResultsV08(report) {
    const body = document.getElementById("adapterTestResultsV08");
    const badge = document.getElementById("adapterTestBadgeV08");
    const downloadButton = document.getElementById("downloadAdapterReportButtonV08");
    if (!body || !badge) return;

    const ok = report.failed === 0;
    badge.textContent = ok ? `${report.passed}/${report.total} passed` : `${report.failed} failed`;
    badge.className = `adapter-badge ${ok ? "is-ready" : "has-error"}`;
    if (downloadButton) downloadButton.disabled = false;

    body.innerHTML = `
      <ol class="adapter-test-list-v08">
        ${report.results.map((result) => `
          <li class="${result.passed ? "test-pass-v08" : "test-fail-v08"}">
            <strong>${result.passed ? "PASS" : "FAIL"}</strong>
            <span>${escapeV08(result.name)}</span>
            ${result.passed ? "" : `<small>${escapeV08(result.detail)}</small>`}
          </li>
        `).join("")}
      </ol>
      <p class="helper-text">Temporary storage key removed after test completion. Active records were not changed.</p>
    `;

    announceV08(ok ? "All adapter contract tests passed." : `${report.failed} adapter contract tests failed.`);
  }

  function downloadAdapterTestReportV08() {
    if (!lastReport || typeof global.downloadBlob !== "function") return;
    global.downloadBlob(
      JSON.stringify(lastReport, null, 2),
      `methodz-adapter-contract-tests-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json"
    );
  }

  function escapeV08(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function announceV08(message) {
    if (typeof global.announceMethodzStatus === "function") global.announceMethodzStatus(message);
  }

  global.runAdapterContractTestsV08 = runAdapterContractTestsV08;
  global.downloadAdapterTestReportV08 = downloadAdapterTestReportV08;
})(window);
