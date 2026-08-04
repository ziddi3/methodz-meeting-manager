const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

async function prepareMeeting(page) {
  await page.goto(`${BASE_URL}/meeting.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.locator("#meetingTitle").fill("Closeout rehearsal");
  await page.locator("#meetingStatus").selectOption("In Progress");
  await page.locator(".attendee-name").first().fill("Morgan");
  const agendaBoxes = page.locator("#agendaList input[type='checkbox']");
  if (await agendaBoxes.count()) await agendaBoxes.first().check();
  await page.locator("#notes").fill("Captured notes");
  await page.locator("#decisions").fill("No final decision");
  await page.locator(".task-name").first().fill("Confirm delivery");
  await page.locator(".task-assigned").first().fill("Morgan");
  await page.locator(".task-due").first().fill("2026-08-10");
  await page.locator("#summary").fill("");
  await page.waitForTimeout(800);
}

test.describe("Meeting closeout review", () => {
  test("reviews the current form without saving or changing status", async ({ page }) => {
    await prepareMeeting(page);
    const recordsBefore = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
    const draftBefore = await page.evaluate(() => localStorage.getItem("methodzMeetingDraft"));

    await page.getByRole("button", { name: "Review Meeting Closeout" }).click();
    await expect(page.locator("#meetingCloseoutResultsV1616")).toContainText("Review still required");
    await expect(page.locator("#meetingCloseoutResultsV1616")).toContainText("Meeting status");
    await expect(page.locator("#meetingCloseoutResultsV1616")).toContainText("Meeting summary captured");
    await expect(page.locator("#meetingCloseoutStatusV1616")).toContainText("Nothing was saved automatically");
    await expect(page.locator("#meetingStatus")).toHaveValue("In Progress");

    const storageAfter = await page.evaluate(() => ({
      records: localStorage.getItem("methodzMeetingRecords"),
      draft: localStorage.getItem("methodzMeetingDraft")
    }));
    expect(storageAfter.records).toBe(recordsBefore);
    expect(storageAfter.draft).toBe(draftBefore);
  });

  test("focuses the first incomplete checkpoint through explicit operator action", async ({ page }) => {
    await prepareMeeting(page);
    await page.getByRole("button", { name: "Review Meeting Closeout" }).click();
    await page.getByRole("button", { name: "Focus Next Review Item" }).click();
    await expect(page.locator("#meetingStatus")).toBeFocused();
    await expect(page.locator("#meetingInformationPanelV1610")).toHaveClass(/methodz-closeout-target-v1616/);
  });

  test("invalidates a stale review after the meeting form changes", async ({ page }) => {
    await prepareMeeting(page);
    await page.getByRole("button", { name: "Review Meeting Closeout" }).click();
    await expect(page.getByRole("button", { name: "Download Metadata Report" })).toBeEnabled();
    await page.locator("#summary").fill("Updated after review");
    await expect(page.getByRole("button", { name: "Download Metadata Report" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Focus Next Review Item" })).toBeDisabled();
    await expect(page.locator("#meetingCloseoutStatusV1616")).toContainText("form changed");
  });

  test("downloads metadata without meeting content or identifiers", async ({ page }) => {
    await prepareMeeting(page);
    await page.getByRole("button", { name: "Review Meeting Closeout" }).click();
    const content = await page.evaluate(async () => {
      const originalCreateObjectURL = URL.createObjectURL;
      const originalClick = HTMLAnchorElement.prototype.click;
      URL.createObjectURL = (blob) => {
        window.__methodzCloseoutBlob = blob;
        return "blob:methodz-closeout-test";
      };
      HTMLAnchorElement.prototype.click = function click() {};
      window.MethodzMeetingCloseoutV1616.downloadMetadataReport();
      URL.createObjectURL = originalCreateObjectURL;
      HTMLAnchorElement.prototype.click = originalClick;
      return window.__methodzCloseoutBlob.text();
    });
    expect(content).toContain("methodz-meeting-closeout-review");
    expect(content).not.toContain("Closeout rehearsal");
    expect(content).not.toContain("Morgan");
    expect(content).not.toContain("Confirm delivery");
  });

  test("registers Closeout in Meeting-Day navigation and avoids phone overflow", async ({ page }) => {
    await prepareMeeting(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.locator('[data-meeting-day-target-v169="meetingCloseoutPanelV1616"]')).toHaveText("Closeout");
    await expect(page.getByRole("button", { name: "Review Meeting Closeout" })).toHaveCSS("min-height", "44px");
    const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
});
