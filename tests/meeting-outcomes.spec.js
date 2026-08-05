const { test, expect } = require("@playwright/test");
const fs = require("node:fs/promises");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

const seedRecords = [
  {
    id: "outcome-ready",
    schemaVersion: "1.6.0",
    meetingNumber: "OUT-001",
    title: "Ready Outcome Meeting",
    status: "Completed",
    date: "2026-08-05",
    location: "Operations room",
    facilitator: "Morgan",
    organizations: ["Method HVAC Inc."],
    attendees: [{ name: "Protected Attendee", signature: "Protected Signature" }],
    agenda: [{ group: "Operations", item: "Review outcome", completed: true }],
    notes: "Protected discussion note",
    decisions: "Protected free-form decision context",
    decisionsList: [{ decision: "Protected structured decision", approvedBy: "Operations group", date: "2026-08-05", status: "Approved", notes: "Protected condition" }],
    tasks: [{ task: "Protected task", assignedTo: "Protected person", due: "2026-08-05", status: "Completed" }],
    summary: "Protected summary",
    createdAt: "2026-08-05T00:00:00.000Z",
    updatedAt: "2026-08-05T00:00:00.000Z",
    savedAt: "2026-08-05T00:00:00.000Z"
  },
  {
    id: "outcome-summary-gap",
    schemaVersion: "1.6.0",
    meetingNumber: "OUT-002",
    title: "Summary Gap Meeting",
    status: "Archived",
    date: "2026-08-04",
    decisionsList: [{ decision: "Recorded", approvedBy: "Group", date: "2026-08-04", status: "Approved" }],
    tasks: [{ task: "Done", assignedTo: "Group", due: "2026-08-04", status: "Completed" }],
    summary: ""
  },
  {
    id: "outcome-multiple-gap",
    schemaVersion: "1.6.0",
    meetingNumber: "OUT-003",
    title: "Multiple Gap Meeting",
    status: "Completed",
    date: "2026-08-03",
    decisions: "Free-form only must not be copied",
    decisionsList: [],
    tasks: [{ task: "Open secret task", assignedTo: "", due: "bad-date", status: "Pending" }],
    summary: ""
  },
  {
    id: "outcome-scheduled",
    schemaVersion: "1.6.0",
    meetingNumber: "OUT-004",
    title: "Scheduled Meeting",
    status: "Scheduled",
    date: "2026-08-06",
    summary: "Not in review"
  }
];

async function seed(page) {
  await page.goto(`${BASE_URL}/meeting.html`);
  await page.evaluate((records) => {
    localStorage.clear();
    localStorage.setItem("methodzMeetingRecords", JSON.stringify(records));
  }, seedRecords);
  await page.reload();
  await page.waitForTimeout(800);
  return page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
}

test.describe("Meeting Outcomes Review", () => {
  test("builds only after explicit refresh, filters locally, exports aggregate CSV, and preserves records", async ({ page }) => {
    const recordsBefore = await seed(page);
    await page.goto(`${BASE_URL}/outcomes.html`);

    await expect(page.locator("#outcomesStateFilter")).toBeDisabled();
    await expect(page.locator(".outcomes-card")).toHaveCount(0);
    await page.getByRole("button", { name: "Refresh Outcomes" }).click();

    await expect(page.locator(".outcomes-card")).toHaveCount(3);
    await expect(page.locator("#meetingOutcomesStatus")).toContainText("3 completed or archived meeting(s)");
    await expect(page.getByText("Ready", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Needs Summary", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Needs Multiple Reviews", { exact: true }).first()).toBeVisible();

    await page.locator("#outcomesStateFilter").selectOption("needs-summary");
    await expect(page.locator(".outcomes-card")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /Summary Gap Meeting/ })).toBeVisible();

    await page.locator("#outcomesStateFilter").selectOption("all");
    await page.locator("#outcomesSearchFilter").fill("multiple gap");
    await expect(page.locator(".outcomes-card")).toHaveCount(1);
    await expect(page.getByRole("heading", { name: /Multiple Gap Meeting/ })).toBeVisible();

    await page.locator("#outcomesSearchFilter").fill("");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download Visible CSV" }).click();
    const download = await downloadPromise;
    const csv = await fs.readFile(await download.path(), "utf8");
    expect(csv).toContain("Ready Outcome Meeting");
    expect(csv).toContain("Needs Multiple Reviews");
    for (const forbidden of [
      "outcome-ready",
      "Protected Attendee",
      "Protected Signature",
      "Protected discussion note",
      "Protected structured decision",
      "Protected condition",
      "Protected task",
      "Protected person",
      "Protected summary",
      "Free-form only must not be copied",
      "Open secret task"
    ]) {
      expect(csv).not.toContain(forbidden);
    }

    expect(await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"))).toBe(recordsBefore);
  });

  test("opens the exact source meeting, removes the fragment, and focuses the first outcome gap without mutation", async ({ page }) => {
    const recordsBefore = await seed(page);
    await page.goto(`${BASE_URL}/outcomes.html`);
    await page.getByRole("button", { name: "Refresh Outcomes" }).click();

    const card = page.locator(".outcomes-card").filter({ hasText: "Multiple Gap Meeting" });
    const link = card.getByRole("link", { name: /Review outcomes/ });
    await expect(link).toHaveAttribute("href", "meeting.html#prepare-record=outcome-multiple-gap&focus=summary&from=outcomes");
    await link.click();

    await expect(page).toHaveURL(`${BASE_URL}/meeting.html`);
    await expect(page.locator("#editingRecordId")).toHaveValue("outcome-multiple-gap");
    await expect(page.locator("#meetingSummaryPanelV1610")).toHaveClass(/methodz-preparation-target-v1614/);
    await expect(page.locator("#summary")).toBeFocused();
    await expect(page.locator("#preparationLaunchStatusV1614")).toContainText("Meeting Outcomes handoff");
    await expect(page.getByRole("link", { name: "Back to Meeting Outcomes" })).toHaveAttribute("href", "outcomes.html");
    expect(await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"))).toBe(recordsBefore);
  });

  test("fails closed on malformed storage and remains mobile-safe", async ({ page }) => {
    await page.goto(`${BASE_URL}/outcomes.html`);
    await page.evaluate(() => localStorage.setItem("methodzMeetingRecords", "{malformed"));
    await page.reload();
    await page.getByRole("button", { name: "Refresh Outcomes" }).click();
    await expect(page.locator("#meetingOutcomesStatus")).toContainText("could not be read");
    await expect(page.locator("#downloadMeetingOutcomesCsv")).toBeDisabled();
    expect(await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"))).toBe("{malformed");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate((records) => localStorage.setItem("methodzMeetingRecords", JSON.stringify(records)), seedRecords);
    await page.reload();
    await expect(page.getByRole("button", { name: "Refresh Outcomes" })).toHaveCSS("min-height", "44px");
    await page.getByRole("button", { name: "Refresh Outcomes" }).click();
    await expect(page.getByRole("link", { name: /Review outcomes/ }).first()).toHaveCSS("min-height", "44px");
    const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
});
