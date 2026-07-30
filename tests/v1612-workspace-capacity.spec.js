const { test, expect } = require("@playwright/test");

const url = "http://127.0.0.1:4173/meeting.html";

test("capacity check is explicit, aggregate, and read only", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => {
    localStorage.setItem("methodzMeetingRecords", JSON.stringify([{ id: "secret-record-id", title: "Secret meeting title", tasks: [] }]));
    localStorage.setItem("methodzSyncQueueV165", JSON.stringify([{ payload: "secret queue payload" }]));
  });
  await page.reload();

  const panel = page.locator("#workspaceCapacityPanelV1612");
  await expect(panel).toBeVisible();
  await expect(page.locator("#workspaceCapacityStatusV1612")).toContainText("No capacity");

  const before = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)])));
  await page.locator("#runWorkspaceCapacityV1612").click();
  await expect(page.locator("#workspaceCapacityStatusV1612")).toContainText("Capacity check complete");
  const after = await page.evaluate(() => Object.fromEntries(Object.keys(localStorage).sort().map((key) => [key, localStorage.getItem(key)])));
  expect(after).toEqual(before);

  const panelText = await panel.textContent();
  expect(panelText).not.toContain("secret-record-id");
  expect(panelText).not.toContain("Secret meeting title");
  expect(panelText).not.toContain("secret queue payload");
  expect(panelText).not.toContain("methodzMeetingRecords");
});

test("capacity check reads only the configured entry limit", async ({ page }) => {
  await page.goto(url);
  const result = await page.evaluate(async () => {
    localStorage.clear();
    [
      ["capacity-test-a", "one"],
      ["capacity-test-b", "two"],
      ["capacity-test-c", "three"],
      ["capacity-test-d", "four"]
    ].forEach(([key, value]) => localStorage.setItem(key, value));
    window.METHODZ_MEETING_CONFIG.workspaceCapacity.maximumStorageEntries = 2;

    const originalDescriptor = Object.getOwnPropertyDescriptor(Storage.prototype, "getItem");
    let valueReads = 0;
    Object.defineProperty(Storage.prototype, "getItem", {
      ...originalDescriptor,
      value(key) {
        valueReads += 1;
        return originalDescriptor.value.call(this, key);
      }
    });
    try {
      const report = await window.runWorkspaceCapacityCheckV1612();
      return { report, valueReads };
    } finally {
      Object.defineProperty(Storage.prototype, "getItem", originalDescriptor);
    }
  });

  expect(result.valueReads).toBe(2);
  expect(result.report.availability.localStorage).toBe("available");
  expect(result.report.counts).toEqual({
    scannedEntries: 2,
    totalEntries: 4,
    truncated: true
  });
  await expect(page.locator("#workspaceCapacityStatusV1612")).toContainText("2 browser-local entries");
});

test("archived meeting records are not classified as active records", async ({ page }) => {
  await page.goto(url);
  const report = await page.evaluate(async () => {
    localStorage.clear();
    localStorage.setItem("methodzArchivedMeetingRecords", JSON.stringify([{ id: "archive-only" }]));
    return window.runWorkspaceCapacityCheckV1612();
  });

  expect(report.categories.map((category) => category.id)).toEqual(["archive"]);
  expect(report.categories.some((category) => category.id === "active-records")).toBe(false);
  await expect(page.locator("#workspaceCapacityCategoriesV1612")).toContainText("Archive Vault");
  await expect(page.locator("#workspaceCapacityCategoriesV1612")).not.toContainText("Active meeting records");
});

test("localStorage read failures render an unavailable report", async ({ page }) => {
  await page.goto(url);
  const failureMessage = "deterministic localStorage read failure";
  const report = await page.evaluate(async (message) => {
    localStorage.clear();
    localStorage.setItem("methodzMeetingRecords", "unreadable");
    const originalDescriptor = Object.getOwnPropertyDescriptor(Storage.prototype, "getItem");
    Object.defineProperty(Storage.prototype, "getItem", {
      ...originalDescriptor,
      value() {
        throw new Error(message);
      }
    });
    try {
      return await window.runWorkspaceCapacityCheckV1612();
    } finally {
      Object.defineProperty(Storage.prototype, "getItem", originalDescriptor);
    }
  }, failureMessage);

  expect(report.status).toBe("unavailable");
  expect(report.availability.localStorage).toBe("unavailable");
  expect(report.availability.errorCode).toBe("local-storage-read-failed");
  expect(report.counts.totalEntries).toBeNull();
  expect(report.counts.scannedEntries).toBeNull();
  expect(report.counts.truncated).toBeNull();
  expect(JSON.stringify(report)).not.toContain(failureMessage);
  await expect(page.locator("#workspaceCapacityStatusV1612")).toContainText(/unavailable/i);
  await expect(page.locator("#workspaceCapacityStatusV1612")).not.toContainText("0 browser-local");
  await expect(page.locator("#workspaceCapacityMetricsV1612")).toContainText(/unavailable/i);
  await expect(page.locator("#workspaceCapacityPanelV1612")).not.toContainText(failureMessage);
});

test("bounded synthetic rehearsal never persists synthetic records", async ({ page }) => {
  await page.goto(url);
  await page.evaluate(() => localStorage.clear());
  await page.locator("#workspaceSyntheticRecordsV1612").fill("25");
  await page.locator("#workspaceSyntheticTasksV1612").fill("4");
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => localStorage.getItem("methodzMeetingDraft"))).toBeNull();
  const before = await page.evaluate(() => Object.keys(localStorage).sort());
  await page.locator("#runWorkspacePerformanceV1612").click();
  await expect(page.locator("#workspaceCapacityStatusV1612")).toContainText("100 tasks");
  await expect(page.locator("#workspaceCapacityStatusV1612")).toContainText("No synthetic record was stored");
  const state = await page.evaluate(() => ({ keys: Object.keys(localStorage).sort(), values: Object.values(localStorage).join("\n") }));
  expect(state.keys).toEqual(before);
  expect(state.values).not.toContain("synthetic-record-");
});

test("capacity workspace fits a narrow phone viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto(url);
  await page.locator("#workspaceCapacityPanelV1612").scrollIntoViewIfNeeded();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(overflow).toBe(false);
  for (const button of await page.locator("#workspaceCapacityPanelV1612 button").all()) {
    const box = await button.boundingBox();
    expect(box?.height || 0).toBeGreaterThanOrEqual(40);
  }
});
