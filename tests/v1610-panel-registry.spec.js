const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

test.describe("v1.6.10 panel registry and field shell", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/meeting.html`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("registers the current shell and drives Meeting-Day navigation without heading matching", async ({ page }) => {
    const snapshot = await page.evaluate(() => ({
      diagnostics: window.MethodzPanelRegistryV1610.diagnostics(),
      panels: window.MethodzPanelRegistryV1610.list(),
      sources: [...document.querySelectorAll("[data-methodz-meeting-day-priority]")].map((element) => element.dataset.methodzPanelId)
    }));
    expect(snapshot.diagnostics.valid).toBe(true);
    expect(snapshot.diagnostics.counts.capturePanels).toBe(9);
    expect(snapshot.panels.find((panel) => panel.id === "meeting-information")?.selector).toBe("#meetingInformationPanelV1610");
    expect(snapshot.sources).toContain("meeting-information");

    await page.evaluate(() => {
      document.querySelector("#meetingInformationPanelV1610 > h2").textContent = "Renamed for localization";
      document.querySelector("#discussionNotesPanelV1610 > h2").textContent = "Field Notes";
      window.refreshPanelRegistryV1610();
    });
    await page.getByRole("button", { name: "Enter Meeting-Day Mode" }).click();
    await expect(page.locator("body")).toHaveClass(/methodz-meeting-day-mode-v169/);
    await page.locator('[data-meeting-day-target-v169="meetingInformationPanelV1610"]').click();
    await expect(page.locator("#meetingTitle")).toBeFocused();
  });

  test("fails visibly when a required capture panel disappears and never hides controls", async ({ page }) => {
    await page.evaluate(() => {
      document.getElementById("agendaChecklistPanelV1610").remove();
      window.refreshPanelRegistryV1610();
    });
    await expect(page.locator("body")).toHaveClass(/methodz-panel-registry-invalid-v1610/);
    await expect(page.locator("#panelRegistryDiagnosticsV1610")).toBeVisible();
    await expect(page.locator("#panelRegistryStatusV1610")).toContainText("blocking registry error");

    await page.getByRole("button", { name: "Enter Meeting-Day Mode" }).click();
    await expect(page.locator("#savedRecordsPanelV1610")).toBeVisible();
    await expect(page.locator("#recordGovernancePanelV10")).toBeVisible();
    await expect(page.locator("#meetingDayStatusV169")).toContainText("no supporting panel will be collapsed");
  });

  test("exports aggregate diagnostics only and avoids narrow-phone overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const report = await page.evaluate(() => {
      window.refreshPanelRegistryV1610();
      return window.MethodzPanelRegistryV1610.diagnostics();
    });
    const serialized = JSON.stringify(report);
    expect(report.valid).toBe(true);
    expect(report.boundaries.containsMeetingContent).toBe(false);
    expect(report.boundaries.containsRecordIds).toBe(false);
    expect(serialized).not.toContain("meetingTitle");
    expect(serialized).not.toContain("attendee");
    const viewport = await page.evaluate(() => ({
      width: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });

  test("preserves existing archive, recovery, sync, transfer, and acceptance panels", async ({ page }) => {
    for (const selector of [
      "#archiveVaultV08",
      "#workspaceRecoveryPanelV16",
      "#syncRehearsalPanelV165",
      "#deviceReadinessV167",
      "#crossDeviceTransferPanelV168",
      "#transferAcceptancePanelV169"
    ]) {
      await expect(page.locator(selector)).toHaveCount(1);
    }
    const groups = await page.evaluate(() => Object.fromEntries([
      "archiveVaultV08",
      "workspaceRecoveryPanelV16",
      "syncRehearsalPanelV165",
      "deviceReadinessV167",
      "crossDeviceTransferPanelV168",
      "transferAcceptancePanelV169"
    ].map((id) => [id, document.getElementById(id)?.dataset.methodzPanelGroup || null])));
    expect(groups.archiveVaultV08).toBe("archive");
    expect(groups.workspaceRecoveryPanelV16).toBe("recovery");
    expect(groups.syncRehearsalPanelV165).toBe("synchronization");
    expect(groups.deviceReadinessV167).toBe("diagnostics");
    expect(groups.crossDeviceTransferPanelV168).toBe("transfer");
    expect(groups.transferAcceptancePanelV169).toBe("acceptance");
  });
});
