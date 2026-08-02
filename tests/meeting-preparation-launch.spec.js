const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

const seedRecord = {
  id: "preparation-launch-meeting",
  schemaVersion: "1.6.0",
  meetingNumber: "PREP-001",
  title: "Preparation Launch Rehearsal",
  status: "Scheduled",
  date: "2099-08-05",
  location: "",
  facilitator: "Morgan",
  organizations: ["Method HVAC Inc."],
  attendees: [{ name: "Morgan", organizationRole: "Facilitator", attendanceType: "Remote", signature: "" }],
  agenda: [{ group: "Operations", item: "Review readiness", completed: false }],
  notes: "Protected note remains in the source record",
  decisions: "Protected decision remains in the source record",
  tasks: [{ task: "Prepare evidence", assignedTo: "Morgan", priority: "High", due: "2099-08-04", status: "Pending" }],
  summary: "Protected summary remains in the source record",
  createdAt: "2026-08-02T00:00:00.000Z",
  updatedAt: "2026-08-02T00:00:00.000Z",
  savedAt: "2026-08-02T00:00:00.000Z"
};

async function seed(page) {
  await page.addInitScript((record) => {
    localStorage.clear();
    localStorage.setItem("methodzMeetingRecords", JSON.stringify([record]));
  }, seedRecord);
}

test.describe("Meeting Preparation launch bridge", () => {
  test("opens the selected saved meeting, removes the fragment, focuses the first missing setup field, and preserves storage", async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE_URL}/preparation.html`);

    const recordsBefore = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
    const draftBefore = await page.evaluate(() => localStorage.getItem("methodzMeetingDraft"));
    const openLink = page.getByRole("link", { name: /Open .* to prepare/ });
    await expect(openLink).toHaveAttribute("href", /meeting\.html#prepare-record=preparation-launch-meeting&focus=location$/);
    await openLink.click();

    await expect(page).toHaveURL(`${BASE_URL}/meeting.html`);
    await expect(page.locator("#editingRecordId")).toHaveValue("preparation-launch-meeting");
    await expect(page.locator("#meetingTitle")).toHaveValue("Preparation Launch Rehearsal");
    await expect(page.locator("#meetingLocation")).toBeFocused();
    await expect(page.locator("#meetingInformationPanelV1610")).toHaveClass(/methodz-preparation-target-v1614/);
    await expect(page.locator("#preparationLaunchStatusV1614")).toContainText("Location or video link");
    await expect(page.getByRole("link", { name: "Back to Preparation Brief" })).toHaveAttribute("href", "preparation.html");

    const storageAfter = await page.evaluate(() => ({
      records: localStorage.getItem("methodzMeetingRecords"),
      draft: localStorage.getItem("methodzMeetingDraft")
    }));
    expect(storageAfter.records).toBe(recordsBefore);
    expect(storageAfter.draft).toBe(draftBefore);
  });

  test("fails visibly for a missing record without changing storage", async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE_URL}/meeting.html#prepare-record=missing-record&focus=agenda`);
    await expect(page).toHaveURL(`${BASE_URL}/meeting.html`);
    await expect(page.locator("#preparationLaunchStatusV1614")).toContainText("Saved meeting was not found");
    await expect(page.locator("#editingRecordId")).toHaveValue("");
    const records = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
    expect(records).toBe(JSON.stringify([seedRecord]));
  });

  test("ignores unrelated fragments and keeps the bridge mobile-safe", async ({ page }) => {
    await seed(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/meeting.html#unrelated-section`);
    await expect(page).toHaveURL(`${BASE_URL}/meeting.html#unrelated-section`);
    await expect(page.locator("#preparationLaunchStatusV1614")).toHaveCount(0);

    await page.goto(`${BASE_URL}/preparation.html`);
    await expect(page.getByRole("link", { name: /Open .* to prepare/ })).toHaveCSS("min-height", "44px");
    const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
});
