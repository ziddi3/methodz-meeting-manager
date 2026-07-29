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

test("bounded synthetic rehearsal never persists synthetic records", async ({ page }) => {
  await page.goto(url);
  await page.locator("#workspaceSyntheticRecordsV1612").fill("25");
  await page.locator("#workspaceSyntheticTasksV1612").fill("4");
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
