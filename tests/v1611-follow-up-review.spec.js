const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${BASE_URL}/meeting.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

test.describe("v1.6.11 live meeting pulse and follow-up review", () => {
  test.beforeEach(async ({ page }) => reset(page));

  test("registers both review panels without changing the record schema", async ({ page }) => {
    const snapshot = await page.evaluate(() => ({
      appShellVersion: window.METHODZ_MEETING_CONFIG.appShellVersion,
      schemaVersion: window.METHODZ_MEETING_CONFIG.schemaVersion,
      reviewVersion: window.MethodzMeetingReviewCoreV1611.version,
      diagnostics: window.MethodzPanelRegistryV1610.diagnostics(),
      panels: window.MethodzPanelRegistryV1610.list().map((panel) => panel.id)
    }));
    expect(snapshot.appShellVersion).toBe("1.6.12");
    expect(snapshot.schemaVersion).toBe("1.6.0");
    expect(snapshot.reviewVersion).toBe("1.1.0");
    expect(snapshot.diagnostics.valid).toBe(true);
    expect(snapshot.panels).toContain("meeting-pulse");
    expect(snapshot.panels).toContain("follow-up-review");
    expect(snapshot.panels).toContain("workspace-capacity");
    await expect(page.locator('[data-meeting-day-target-v169="meetingPulsePanelV1611"]')).toHaveText("Pulse");
  });

  test("reviews and prioritizes saved follow-up work before opening the source meeting explicitly", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(window.METHODZ_MEETING_CONFIG.storageKeys.records, JSON.stringify([{
        id: "meeting-1", schemaVersion: "1.6.0", meetingNumber: "001",
        title: "Disposable Operations Review", status: "In Progress", date: "2026-07-28",
        organizations: ["Method HVAC Inc."],
        attendees: [{ name: "Disposable Attendee", organizationRole: "Test", attendanceType: "Remote", signature: "" }],
        agenda: [{ group: "General", item: "Opening", completed: true }],
        notes: "Disposable notes", decisions: "Disposable decision",
        tasks: [
          { task: "Repair overdue item", assignedTo: "Tester", priority: "High", due: "2000-01-01", status: "Pending" },
          { task: "Assign future item", assignedTo: "", priority: "Normal", due: "2099-01-02", status: "Pending" },
          { task: "Completed item", assignedTo: "Tester", priority: "Low", due: "2000-01-02", status: "Completed" }
        ],
        summary: "Disposable summary", createdAt: "2026-07-28T12:00:00.000Z",
        updatedAt: "2026-07-28T12:00:00.000Z", savedAt: "2026-07-28T12:00:00.000Z"
      }]));
    });
    await page.reload();

    await expect(page.locator("#followUpReviewPanelV1611")).toBeVisible();
    await expect(page.locator("#followUpFocusV1613")).toBeVisible();
    await expect(page.locator("#followUpFocusListV1613")).toContainText("Repair overdue item");
    await expect(page.locator("#followUpFocusListV1613")).toContainText("Assign future item");
    await expect(page.locator("#followUpFocusListV1613")).not.toContainText("Completed item");
    await expect(page.locator("#followUpAssigneeLoadV1613")).toContainText("Unassigned");
    await expect(page.locator("#followUpListV1611")).toContainText("Repair overdue item");
    await expect(page.locator("#followUpListV1611")).not.toContainText("Completed item");

    const before = await page.evaluate(() => ({
      records: localStorage.getItem(window.METHODZ_MEETING_CONFIG.storageKeys.records),
      draft: localStorage.getItem(window.METHODZ_MEETING_CONFIG.storageKeys.draft),
      focus: window.getFollowUpFocusReportV1613()
    }));
    expect(before.focus.counts.actionable).toBe(2);
    expect(before.focus.nextAction.task).toBe("Repair overdue item");
    await page.locator("#refreshFollowUpFocusV1613").click();
    const after = await page.evaluate(() => ({
      records: localStorage.getItem(window.METHODZ_MEETING_CONFIG.storageKeys.records),
      draft: localStorage.getItem(window.METHODZ_MEETING_CONFIG.storageKeys.draft)
    }));
    expect(after.records).toBe(before.records);
    expect(after.draft).toBe(before.draft);

    await page.locator('#followUpFocusListV1613 [data-follow-up-record-id-v1611="meeting-1"]').click();
    await expect(page.locator("#editingRecordId")).toHaveValue("meeting-1");
    await expect(page.locator(".task-name").first()).toHaveValue("Repair overdue item");
    await expect(page.locator("#followUpTasksPanelV1610")).toBeInViewport();
  });

  test("live pulse stays read-only and navigates to the next incomplete section", async ({ page }) => {
    const before = await page.evaluate(() => localStorage.getItem(window.METHODZ_MEETING_CONFIG.storageKeys.records));
    await page.locator("#meetingTitle").fill("Disposable Live Meeting");
    await page.locator("#meetingDate").fill("2026-07-28");
    await expect(page.locator("#meetingPulseStatusV1611")).toContainText("Organizations");
    await page.locator("#meetingPulseNextV1611").click();
    await expect(page.locator("#organizationList input").first()).toBeFocused();
    const after = await page.evaluate(() => localStorage.getItem(window.METHODZ_MEETING_CONFIG.storageKeys.records));
    expect(after).toBe(before);
  });

  test("keeps the review and focus workspace within a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    const viewport = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
    await expect(page.locator("#followUpReviewPanelV1611")).toBeVisible();
    await expect(page.locator("#refreshFollowUpFocusV1613")).toHaveCSS("min-height", "44px");
  });
});
