const { test, expect } = require("@playwright/test");

test.describe("Mobile and cross-device readiness v1.6.7", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/meeting.html");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(page.locator("#deviceReadinessV167")).toBeVisible();
  });

  test("phone viewport has no page-level horizontal overflow and exposes touch actions", async ({ page }) => {
    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 2);

    const dock = page.locator("#mobileActionDockV167");
    await expect(dock).toBeVisible();
    await expect(dock.locator("button")).toHaveCount(4);

    const buttonHeights = await dock.locator("button").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height));
    for (const height of buttonHeights) expect(height).toBeGreaterThanOrEqual(44);

    const titleFontSize = await page.locator("#meetingTitle").evaluate((input) => Number.parseFloat(getComputedStyle(input).fontSize));
    expect(titleFontSize).toBeGreaterThanOrEqual(16);
  });

  test("readiness report contains capability metadata and active queue count but excludes meeting content", async ({ page }) => {
    const sensitiveMarker = "PRIVATE-MEETING-CONTENT-V167";
    await page.fill("#meetingTitle", sensitiveMarker);
    await page.fill("#notes", `${sensitiveMarker}-NOTES`);
    await page.evaluate(() => {
      const coordinator = window.MethodzSyncRehearsalWorkspaceV165.getCoordinator();
      coordinator.queueStore.write([{
        id: "readiness-queue-entry",
        createdAt: "2026-07-26T00:00:00.000Z",
        state: "pending"
      }]);
    });

    const report = await page.evaluate(() => window.collectDeviceReadinessV167());
    const serialized = JSON.stringify(report);

    expect(report.type).toBe("methodz-device-readiness-report");
    expect(report.appShellVersion).toBe("1.6.8");
    expect(report.recordSchemaVersion).toBe("1.6.0");
    expect(report.workspaceCounts.queuedSyncRehearsals).toBe(1);
    expect(report.boundaries.containsMeetingContent).toBe(false);
    expect(report.boundaries.containsRecordIds).toBe(false);
    expect(report.boundaries.containsCredentials).toBe(false);
    expect(report.boundaries.containsKeyMaterial).toBe(false);
    expect(serialized).not.toContain(sensitiveMarker);
    expect(serialized).not.toContain(`${sensitiveMarker}-NOTES`);
    expect(serialized).not.toContain("readiness-queue-entry");
  });

  test("readiness actions remain explicit and mobile navigation reaches records", async ({ page }) => {
    await page.locator("#mobileActionDockV167 button[data-action='records']").click();
    await expect(page.locator("#savedRecordsSectionV167")).toBeInViewport();

    await page.locator("#mobileActionDockV167 button[data-action='device']").click();
    await expect(page.locator("#deviceReadinessV167")).toBeInViewport();

    await page.getByRole("button", { name: "Refresh Check" }).click();
    await expect(page.locator("#deviceReadinessMessageV167")).not.toHaveText("Checking this device...");
    await expect(page.locator("#deviceReadinessGridV167 .device-check-v167")).toHaveCount(7);
  });
});
