const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});

test("creates and saves a schema 0.9 meeting record", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/meeting.html");

  await expect(page.getByRole("heading", { name: "Methodz Meeting Manager" })).toBeVisible();
  await page.locator("#meetingTitle").fill("Automated Browser Smoke Meeting");
  await page.locator("#meetingDate").fill("2026-07-12");
  await page.getByRole("button", { name: "Save Record" }).first().click();

  await expect(page.locator("#savedRecords")).toContainText("Automated Browser Smoke Meeting");
  const records = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]"));
  expect(records).toHaveLength(1);
  expect(records[0].schemaVersion).toBe("0.9.0");
  expect(records[0].title).toBe("Automated Browser Smoke Meeting");
});

test("migrates an older record before the workspace initializes", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("methodzMeetingRecords", JSON.stringify([
      {
        id: "legacy-browser-test",
        schemaVersion: "0.2.0",
        meetingNumber: "009",
        title: "Legacy Browser Test",
        date: "2026-06-01",
        status: "Completed",
        organizations: ["Canadian Soft Water Corporation"],
        attendees: [],
        agenda: [],
        tasks: []
      }
    ]));
  });

  await page.goto("/meeting.html");
  const result = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]");
    const state = JSON.parse(localStorage.getItem("methodzMigrationState") || "null");
    return { record: records[0], state };
  });

  expect(result.record.schemaVersion).toBe("0.9.0");
  expect(result.record.decisionsList).toEqual([]);
  expect(result.record.attachments).toEqual([]);
  expect(result.record.organizationDetails).toEqual([]);
  expect(result.state.currentVersion).toBe("0.9.0");
});

test("archives a record non-destructively and exposes archive filters", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/meeting.html");
  await page.locator("#meetingTitle").fill("Archive Smoke Meeting");
  await page.locator("#meetingDate").fill("2026-07-12");
  await page.getByRole("button", { name: "Save Record" }).first().click();

  const card = page.locator(".saved-record").filter({ hasText: "Archive Smoke Meeting" });
  await card.getByRole("button", { name: /^Archive$/ }).click();

  await expect(page.locator("#archiveVaultListV08")).toContainText("Archive Smoke Meeting");
  await expect(page.locator("#archiveSearchV09")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export Filtered JSON" })).toBeVisible();

  const counts = await page.evaluate(() => ({
    active: JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]").length,
    archived: JSON.parse(localStorage.getItem("methodzArchivedMeetingRecords") || "[]").length
  }));
  expect(counts.active).toBe(0);
  expect(counts.archived).toBe(1);
});

test("exposes deterministic workspace merge helpers", async ({ page }) => {
  await page.goto("/meeting.html");
  const merged = await page.evaluate(() => {
    const local = [{ id: "same", title: "Local", updatedAt: "2026-01-01T00:00:00.000Z" }];
    const incoming = [{ id: "same", title: "Incoming", updatedAt: "2026-02-01T00:00:00.000Z" }];
    return window.MethodzWorkspaceMergeV09.mergeRecords(local, incoming, "prefer-newest");
  });
  expect(merged).toHaveLength(1);
  expect(merged[0].title).toBe("Incoming");
});

test("publishes a valid app manifest and service worker entry point", async ({ request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBeTruthy();
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("Methodz Meeting Manager");
  expect(manifest.start_url).toBe("./meeting.html");

  const workerResponse = await request.get("/service-worker.js");
  expect(workerResponse.ok()).toBeTruthy();
  expect(await workerResponse.text()).toContain("methodz-meeting-manager-v0.9.0");
});
