const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

async function openMeeting(page) {
  await page.goto(`${BASE_URL}/meeting.html`);
  await page.waitForFunction(() => window.MethodzMeetingApp?.getState);
}

test("creates and saves a schema 1.6 meeting record", async ({ page }) => {
  await openMeeting(page);
  await page.locator("#meetingTitle").fill("Browser smoke meeting");
  await page.locator("#meetingDate").fill("2026-01-15");
  await page.locator("#meetingLocation").fill("Browser test room");
  await page.locator("#meetingFacilitator").fill("Test facilitator");
  await page.getByRole("button", { name: "Save Meeting" }).click();

  const records = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]"));
  expect(records).toHaveLength(1);
  expect(records[0].title).toBe("Browser smoke meeting");
  expect(records[0].schemaVersion).toBe("1.6.0");
});

test("imports and migrates the original legacy storage key before workspace initialization", async ({ page }) => {
  await page.goto(`${BASE_URL}/meeting.html`);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem("methodzMeetingRecordsV01", JSON.stringify([
      {
        id: "legacy-browser-record",
        title: "Legacy browser record",
        date: "2026-01-01",
        status: "Scheduled",
        organizations: [],
        attendees: [],
        agenda: [],
        notes: "",
        decisions: "",
        tasks: [],
        summary: ""
      }
    ]));
  });
  await page.reload();
  await page.waitForFunction(() => window.MethodzMeetingApp?.getState);

  const state = await page.evaluate(() => window.MethodzMeetingApp.getState());
  expect(state.records.some((record) => record.id === "legacy-browser-record")).toBe(true);
  const migrated = state.records.find((record) => record.id === "legacy-browser-record");
  expect(migrated.schemaVersion).toBe("1.6.0");
});

test("archives a record non-destructively and exposes archive filters", async ({ page }) => {
  await openMeeting(page);
  await page.locator("#meetingTitle").fill("Archive smoke meeting");
  await page.locator("#meetingDate").fill("2026-01-15");
  await page.getByRole("button", { name: "Save Meeting" }).click();

  const recordId = await page.evaluate(() => window.MethodzMeetingApp.getState().records[0].id);
  await page.evaluate((id) => window.MethodzArchiveV09.archiveRecord(id), recordId);
  const state = await page.evaluate(() => window.MethodzMeetingApp.getState());
  expect(state.records).toHaveLength(0);
  expect(state.archivedRecords).toHaveLength(1);
  expect(state.archivedRecords[0].id).toBe(recordId);

  await page.locator("#archiveSearchV08").fill("Archive smoke");
  await page.locator("#archiveStatusV08").selectOption("Archived");
  await expect(page.locator("#archiveVaultV08")).toContainText("Archive smoke meeting");
});

test("compares a saved revision with the current record", async ({ page }) => {
  await openMeeting(page);
  await page.locator("#meetingTitle").fill("Revision smoke meeting");
  await page.locator("#meetingDate").fill("2026-01-15");
  await page.getByRole("button", { name: "Save Meeting" }).click();

  await page.locator("#meetingLocation").fill("Updated room");
  await page.getByRole("button", { name: "Save Meeting" }).click();

  const revisions = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzMeetingRevisions") || "[]"));
  expect(revisions.length).toBeGreaterThan(0);

  const record = await page.evaluate(() => window.MethodzMeetingApp.getState().records[0]);
  const comparison = await page.evaluate((source) => window.MethodzRevisionHistoryV09.compareRevision(source.id, 0), record);
  expect(comparison).toBeTruthy();
});

test("exposes deterministic workspace merge helpers", async ({ page }) => {
  await openMeeting(page);
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
  expect(manifest.id).toBe("./meeting.html");
  expect(manifest.start_url).toBe("./index.html");
  expect(manifest.shortcuts.some((shortcut) => shortcut.url === "./verify.html")).toBe(true);

  const workerResponse = await request.get("/service-worker.js");
  expect(workerResponse.ok()).toBeTruthy();
  expect(await workerResponse.text()).toContain('const CACHE_NAME = "methodz-meeting-manager-v1.6.12"');
});
