const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

function dateOffset(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function seedRecords() {
  return [
    {
      id: "workspace-sensitive-record-id",
      title: "Workspace Sensitive Meeting Title",
      status: "Scheduled",
      date: dateOffset(1),
      attendees: [{ name: "Workspace Sensitive Attendee" }],
      notes: "Workspace Sensitive Note",
      decisions: "Workspace Sensitive Decision",
      summary: "Workspace Sensitive Summary",
      signature: "Workspace Sensitive Signature",
      privateKey: "Workspace Sensitive Private Key",
      providerSecret: "Workspace Sensitive Provider Secret",
      queuePayload: "Workspace Sensitive Queue Payload",
      tasks: [
        { task: "Workspace Sensitive Task", assignedTo: "", due: dateOffset(-1), status: "Pending" },
        { task: "Workspace Sensitive Unscheduled Task", assignedTo: "Workspace Sensitive Assignee", due: "invalid-date", status: "In Progress" },
        { task: "Workspace Sensitive Finished Task", assignedTo: "Someone", due: dateOffset(-2), status: "Completed" }
      ]
    },
    {
      id: "workspace-unscheduled",
      title: "Workspace Unscheduled Meeting",
      status: "Draft",
      date: "",
      tasks: []
    },
    {
      id: "workspace-completed",
      title: "Workspace Completed Meeting",
      status: "Completed",
      date: dateOffset(-2),
      tasks: []
    },
    {
      id: "workspace-archived",
      title: "Workspace Archived Meeting",
      status: "Archived",
      date: dateOffset(-5),
      tasks: []
    }
  ];
}

async function installRecordReadCounter(page) {
  await page.addInitScript(() => {
    const original = Storage.prototype.getItem;
    Object.defineProperty(window, "__methodzRecordReadCount", { value: 0, writable: true, configurable: true });
    Storage.prototype.getItem = function patchedGetItem(key) {
      if (String(key) === "methodzMeetingRecords") window.__methodzRecordReadCount += 1;
      return original.call(this, key);
    };
  });
}

test.describe("Workspace Home", () => {
  test("waits for explicit refresh, returns counts only, and preserves records", async ({ page }) => {
    await installRecordReadCounter(page);
    await page.goto(`${BASE_URL}/index.html`);
    const records = seedRecords();
    await page.evaluate((source) => localStorage.setItem("methodzMeetingRecords", JSON.stringify(source)), records);
    const recordsBefore = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
    await page.reload();

    expect(await page.evaluate(() => window.__methodzRecordReadCount)).toBe(0);
    await expect(page.locator("#snapshotActive")).toHaveText("—");
    await expect(page.locator("#workspaceSnapshotStatus")).toContainText("Snapshot not loaded");

    await page.getByRole("button", { name: "Refresh Workspace Snapshot" }).click();

    expect(await page.evaluate(() => window.__methodzRecordReadCount)).toBe(1);
    await expect(page.locator("#snapshotActive")).toHaveText("2");
    await expect(page.locator("#snapshotCompleted")).toHaveText("1");
    await expect(page.locator("#snapshotArchived")).toHaveText("1");
    await expect(page.locator("#snapshotUpcoming")).toHaveText("1");
    await expect(page.locator("#snapshotUnscheduled")).toHaveText("1");
    await expect(page.locator("#snapshotOverdue")).toHaveText("1");
    await expect(page.locator("#snapshotUnassigned")).toHaveText("1");
    await expect(page.locator("#snapshotNeedsScheduling")).toHaveText("1");

    const bodyText = await page.locator("body").innerText();
    for (const forbidden of [
      "Workspace Sensitive Meeting Title",
      "Workspace Sensitive Attendee",
      "Workspace Sensitive Note",
      "Workspace Sensitive Decision",
      "Workspace Sensitive Summary",
      "Workspace Sensitive Task",
      "Workspace Sensitive Unscheduled Task",
      "Workspace Sensitive Assignee",
      "workspace-sensitive-record-id",
      "Workspace Sensitive Signature",
      "Workspace Sensitive Private Key",
      "Workspace Sensitive Provider Secret",
      "Workspace Sensitive Queue Payload"
    ]) {
      expect(bodyText).not.toContain(forbidden);
    }

    const serializedSnapshot = await page.evaluate(() => JSON.stringify(window.MethodzWorkspaceHomeV1619.getCurrentSnapshot()));
    expect(serializedSnapshot).not.toContain("Workspace Sensitive");
    expect(serializedSnapshot).not.toContain("workspace-sensitive-record-id");
    expect(await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"))).toBe(recordsBefore);
  });

  test("links the established lifecycle and preserves PWA identity", async ({ page }) => {
    await page.goto(`${BASE_URL}/index.html`);

    await expect(page.getByRole("link", { name: "Open Preparation Brief" })).toHaveAttribute("href", "preparation.html");
    await expect(page.getByRole("link", { name: "Open Meeting Manager" })).toHaveAttribute("href", "meeting.html");
    await expect(page.getByRole("link", { name: "Open Decision Register" })).toHaveAttribute("href", "decisions.html");
    await expect(page.getByRole("link", { name: "Open Meeting Outcomes" })).toHaveAttribute("href", "outcomes.html");
    await expect(page.getByRole("link", { name: "Open Archive Vault" })).toHaveAttribute("href", "meeting.html#archiveVaultV08");
    await expect(page.getByRole("link", { name: "Open Package Verifier" })).toHaveAttribute("href", "verify.html");

    const manifest = await page.evaluate(async () => fetch("manifest.webmanifest").then((response) => response.json()));
    expect(manifest.id).toBe("./meeting.html");
    expect(manifest.start_url).toBe("./index.html");
  });

  test("fails closed on malformed storage and remains mobile-safe", async ({ page }) => {
    await installRecordReadCounter(page);
    await page.goto(`${BASE_URL}/index.html`);
    await page.evaluate(() => localStorage.setItem("methodzMeetingRecords", "{malformed"));
    await page.reload();

    expect(await page.evaluate(() => window.__methodzRecordReadCount)).toBe(0);
    await expect(page.locator("#workspaceSnapshotStatus")).toContainText("Snapshot not loaded");
    await page.getByRole("button", { name: "Refresh Workspace Snapshot" }).click();
    await expect(page.locator("#workspaceSnapshotStatus")).toContainText("could not be read");
    await expect(page.locator("#snapshotActive")).toHaveText("—");
    expect(await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"))).toBe("{malformed");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole("button", { name: "Refresh Workspace Snapshot" })).toHaveCSS("min-height", "44px");
    await expect(page.getByRole("link", { name: "Open Preparation Brief" })).toHaveCSS("min-height", "44px");
    const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
});
