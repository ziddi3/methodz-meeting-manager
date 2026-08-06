const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

test("Workspace Home is a static lifecycle launchpad and does not read records before explicit refresh", async ({ page }) => {
  await page.addInitScript(() => {
    window.__methodzStorageReads = 0;
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function patchedGetItem(key) {
      if (key === "methodzMeetingRecords") window.__methodzStorageReads += 1;
      return originalGetItem.call(this, key);
    };
  });

  await page.goto(`${BASE_URL}/index.html`);
  await expect(page.getByRole("heading", { name: "Meeting Manager" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Prepare" })).toHaveAttribute("href", "preparation.html");
  await expect(page.getByRole("link", { name: "Capture" })).toHaveAttribute("href", "meeting.html");
  await expect(page.getByRole("link", { name: "Decisions" })).toHaveAttribute("href", "decisions.html");
  await expect(page.getByRole("link", { name: "Outcomes" })).toHaveAttribute("href", "outcomes.html");
  expect(await page.evaluate(() => window.__methodzStorageReads)).toBe(0);
  await expect(page.locator("#workspaceSnapshotMetrics")).toBeEmpty();
});

test("explicit refresh renders aggregate counts without protected meeting content", async ({ page }) => {
  await page.goto(`${BASE_URL}/index.html`);
  await page.evaluate(() => {
    localStorage.setItem("methodzMeetingRecords", JSON.stringify([
      {
        id: "secret-record-id",
        title: "Confidential Merger Meeting",
        status: "Planned",
        date: "2099-01-01",
        attendees: [{ name: "Protected Person" }],
        notes: "Protected notes",
        decisions: "Protected decision",
        summary: "Protected summary",
        tasks: [{ task: "Protected task text", assignedTo: "Protected Assignee", due: "", status: "Open" }]
      },
      {
        status: "Completed",
        date: "2026-08-01",
        tasks: [{ task: "Another protected task", assignedTo: "", due: "2020-01-01", status: "Open" }]
      },
      { status: "Archived", date: "2026-07-01" }
    ]));
  });

  await page.getByRole("button", { name: "Refresh Workspace Snapshot" }).click();
  await expect(page.locator("#workspaceSnapshotStatus")).toContainText("3 saved records detected");
  await expect(page.locator("#workspaceSnapshotMetrics")).toContainText("Active meetings");
  await expect(page.locator("#workspaceSnapshotMetrics")).toContainText("Completed meetings");
  await expect(page.locator("#workspaceSnapshotMetrics")).toContainText("Archived meetings");
  await expect(page.locator("#workspaceSnapshotMetrics")).toContainText("Open follow-up");

  const bodyText = await page.locator("body").innerText();
  for (const prohibited of [
    "Confidential Merger Meeting",
    "Protected Person",
    "Protected notes",
    "Protected decision",
    "Protected summary",
    "Protected task text",
    "Protected Assignee",
    "secret-record-id"
  ]) expect(bodyText).not.toContain(prohibited);
});

test("malformed saved storage fails visibly without writing replacement data", async ({ page }) => {
  await page.goto(`${BASE_URL}/index.html`);
  await page.evaluate(() => localStorage.setItem("methodzMeetingRecords", "{not-json"));
  const before = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
  await page.getByRole("button", { name: "Refresh Workspace Snapshot" }).click();
  await expect(page.locator("#workspaceSnapshotStatus")).toContainText("could not be read");
  const after = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
  expect(after).toBe(before);
});

test("phone viewport keeps launch controls usable and contained", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE_URL}/index.html`);
  const button = page.getByRole("button", { name: "Refresh Workspace Snapshot" });
  await expect(button).toBeVisible();
  const box = await button.boundingBox();
  expect(box.height).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
