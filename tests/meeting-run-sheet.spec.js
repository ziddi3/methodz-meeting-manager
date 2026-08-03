const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

async function seed(page) {
  await page.goto(`${BASE_URL}/meeting.html`);
  await page.evaluate(() => {
    const meetingDate = new Date();
    meetingDate.setUTCDate(meetingDate.getUTCDate() + 4);
    const earlierDate = new Date(meetingDate);
    earlierDate.setUTCDate(earlierDate.getUTCDate() - 5);
    const dueDate = new Date(meetingDate);
    dueDate.setUTCDate(dueDate.getUTCDate() - 1);
    localStorage.clear();
    localStorage.setItem("methodzMeetingRecords", JSON.stringify([
      {
        id: "earlier-run-sheet-source",
        meetingNumber: "RUN-000",
        title: "Earlier Installation Review",
        status: "Completed",
        date: earlierDate.toISOString().slice(0, 10),
        tasks: [{ task: "Confirm supplier response", assignedTo: "Alex", due: dueDate.toISOString().slice(0, 10), status: "Pending", priority: "High" }],
        notes: "SECRET-EARLIER-NOTE"
      },
      {
        id: "run-sheet-meeting",
        schemaVersion: "1.6.0",
        meetingNumber: "RUN-001",
        title: "Installation Run Sheet Rehearsal",
        status: "Scheduled",
        date: meetingDate.toISOString().slice(0, 10),
        location: "Shop boardroom",
        facilitator: "Morgan",
        organizations: ["Canadian Soft Water Corporation"],
        attendees: [{ name: "Morgan", organizationRole: "Facilitator", consent: true, signature: "SECRET-SIGNATURE" }],
        agenda: [{ group: "Installations", item: "Confirm equipment and route", completed: false, notes: "SECRET-AGENDA-NOTE" }],
        notes: "SECRET-MEETING-NOTE",
        decisions: "SECRET-DECISION",
        summary: "SECRET-SUMMARY",
        credentials: { token: "SECRET-TOKEN" }
      }
    ]));
  });
}

test.describe("Meeting run sheet", () => {
  test("previews and prints a protected single-meeting sheet without changing storage", async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE_URL}/preparation.html`);
    const recordsBefore = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
    const draftBefore = await page.evaluate(() => localStorage.getItem("methodzMeetingDraft"));

    const preview = page.getByRole("button", { name: "Preview run sheet for Installation Run Sheet Rehearsal" });
    await expect(preview).toBeVisible();
    await preview.click();

    const dialog = page.locator("#meetingRunSheetDialogV1615");
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText("Installation Run Sheet Rehearsal");
    await expect(dialog).toContainText("Confirm equipment and route");
    await expect(dialog).toContainText("Confirm supplier response");
    await expect(dialog).not.toContainText("SECRET-MEETING-NOTE");
    await expect(dialog).not.toContainText("SECRET-SIGNATURE");
    await expect(dialog).not.toContainText("SECRET-TOKEN");

    await page.evaluate(() => { window.print = () => { window.__methodzPrintCalled = true; }; });
    await page.getByRole("button", { name: "Print Run Sheet" }).click();
    expect(await page.evaluate(() => window.__methodzPrintCalled)).toBe(true);
    await page.getByRole("button", { name: "Close Run Sheet" }).click();
    await expect(dialog).not.toBeVisible();

    const storageAfter = await page.evaluate(() => ({
      records: localStorage.getItem("methodzMeetingRecords"),
      draft: localStorage.getItem("methodzMeetingDraft")
    }));
    expect(storageAfter.records).toBe(recordsBefore);
    expect(storageAfter.draft).toBe(draftBefore);
  });

  test("fails visibly when the source record disappears", async ({ page }) => {
    await seed(page);
    await page.goto(`${BASE_URL}/preparation.html`);
    const preview = page.getByRole("button", { name: "Preview run sheet for Installation Run Sheet Rehearsal" });
    await page.evaluate(() => localStorage.setItem("methodzMeetingRecords", "[]"));
    await preview.click();
    await expect(page.locator("#meetingRunSheetStatusV1615")).toContainText("no longer present");
    await expect(page.locator("#meetingRunSheetDialogV1615")).not.toBeVisible();
  });

  test("keeps controls and the preview contained at phone width", async ({ page }) => {
    await seed(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/preparation.html`);
    const preview = page.getByRole("button", { name: "Preview run sheet for Installation Run Sheet Rehearsal" });
    await expect(preview).toHaveCSS("min-height", "44px");
    await preview.click();
    await expect(page.getByRole("button", { name: "Close Run Sheet" })).toHaveCSS("min-height", "44px");
    const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
});
