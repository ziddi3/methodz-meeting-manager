const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

async function reset(page) {
  await page.goto(`${BASE_URL}/meeting.html`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
}

async function seedPlanningRecords(page) {
  await page.evaluate(() => {
    const dateAt = (offset) => {
      const now = new Date();
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset));
      return date.toISOString().slice(0, 10);
    };
    localStorage.setItem(window.METHODZ_MEETING_CONFIG.storageKeys.records, JSON.stringify([{
      id: "planning-meeting-1",
      schemaVersion: "1.6.0",
      meetingNumber: "PLN-001",
      title: "Disposable Planning Review",
      status: "In Progress",
      date: dateAt(0),
      organizations: ["Method HVAC Inc."],
      attendees: [{ name: "Disposable Attendee", organizationRole: "Test", attendanceType: "Remote", signature: "" }],
      agenda: [{ group: "General", item: "Planning", completed: true }],
      notes: "Disposable notes excluded from planning output",
      decisions: "Disposable decision excluded from planning output",
      tasks: [
        { task: "Overdue planning item", assignedTo: "Tester", priority: "High", due: "2000-01-01", status: "Pending" },
        { task: "Due today planning item", assignedTo: "Tester", priority: "Normal", due: dateAt(0), status: "In Progress" },
        { task: "Near planning item", assignedTo: "Planner", priority: "Normal", due: dateAt(3), status: "Pending" },
        { task: "Needs scheduling item", assignedTo: "", priority: "High", due: "", status: "Pending" },
        { task: "Later planning item", assignedTo: "Planner", priority: "Low", due: "2099-01-01", status: "Pending" },
        { task: "Completed planning item", assignedTo: "Tester", priority: "High", due: "2000-01-02", status: "Completed" }
      ],
      summary: "Disposable summary",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      savedAt: new Date().toISOString()
    }]));
  });
  await page.reload();
}

test.describe("read-only Follow-Up Planning Brief", () => {
  test.beforeEach(async ({ page }) => reset(page));

  test("loads the portable planning layer without changing shell or schema versions", async ({ page }) => {
    await expect(page.locator("#followUpPlanningV1613")).toBeVisible();
    const snapshot = await page.evaluate(() => ({
      appShellVersion: window.METHODZ_MEETING_CONFIG.appShellVersion,
      schemaVersion: window.METHODZ_MEETING_CONFIG.schemaVersion,
      planningVersion: window.MethodzFollowUpPlanningCoreV1613.version,
      planningConfig: window.METHODZ_MEETING_CONFIG.followUpPlanning
    }));
    expect(snapshot.appShellVersion).toBe("1.6.12");
    expect(snapshot.schemaVersion).toBe("1.6.0");
    expect(snapshot.planningVersion).toBe("1.0.0");
    expect(snapshot.planningConfig.automaticRecordMutation).toBe(false);
    expect(snapshot.planningConfig.automaticAssignment).toBe(false);
    expect(snapshot.planningConfig.automaticReminderDelivery).toBe(false);
    expect(snapshot.planningConfig.automaticSynchronization).toBe(false);
  });

  test("groups incomplete work, preserves records, and opens a source meeting only after an explicit action", async ({ page }) => {
    await seedPlanningRecords(page);

    await expect(page.locator("#followUpPlanningV1613")).toBeVisible();
    await expect(page.locator('[data-planning-lane-v1613="overdue"]')).toContainText("Overdue planning item");
    await expect(page.locator('[data-planning-lane-v1613="today"]')).toContainText("Due today planning item");
    await expect(page.locator('[data-planning-lane-v1613="within-window"]')).toContainText("Near planning item");
    await expect(page.locator('[data-planning-lane-v1613="needs-scheduling"]')).toContainText("Needs scheduling item");
    await expect(page.locator('[data-planning-lane-v1613="later"]')).toContainText("Later planning item");
    await expect(page.locator("#followUpPlanningLanesV1613")).not.toContainText("Completed planning item");
    await expect(page.locator("#followUpPlanningAssigneesV1613")).toContainText("Unassigned");

    const before = await page.evaluate(() => ({
      records: localStorage.getItem(window.METHODZ_MEETING_CONFIG.storageKeys.records),
      draft: localStorage.getItem(window.METHODZ_MEETING_CONFIG.storageKeys.draft),
      brief: window.getFollowUpPlanningBriefV1613()
    }));
    expect(before.brief.counts.actionable).toBe(5);
    expect(before.brief.counts.overdue).toBe(1);
    expect(before.brief.counts.dueToday).toBe(1);
    expect(before.brief.counts.withinWindow).toBe(1);
    expect(before.brief.counts.needsScheduling).toBe(1);
    expect(before.brief.counts.later).toBe(1);
    expect(before.brief.boundaries.containsSignatures).toBe(false);
    expect(before.brief.boundaries.containsNotesOrDecisions).toBe(false);

    await page.locator("#refreshFollowUpPlanningV1613").click();
    await page.locator("#followUpPlanningHorizonV1613").selectOption("14");
    const after = await page.evaluate(() => ({
      records: localStorage.getItem(window.METHODZ_MEETING_CONFIG.storageKeys.records),
      draft: localStorage.getItem(window.METHODZ_MEETING_CONFIG.storageKeys.draft),
      horizon: window.getFollowUpPlanningBriefV1613().horizonDays
    }));
    expect(after.records).toBe(before.records);
    expect(after.draft).toBe(before.draft);
    expect(after.horizon).toBe(14);

    await page.reload();
    await expect(page.locator("#followUpPlanningHorizonV1613")).toHaveValue("14");

    await page.locator(".follow-up-planning-item-v1613")
      .filter({ hasText: "Overdue planning item" })
      .getByRole("button", { name: "Open Meeting" })
      .click();
    await expect(page.locator("#editingRecordId")).toHaveValue("planning-meeting-1");
    await expect(page.locator(".task-name").first()).toHaveValue("Overdue planning item");
    await expect(page.locator("#followUpTasksPanelV1610")).toBeInViewport();
  });

  test("downloads the visible planning brief only after an explicit operator action", async ({ page }) => {
    await seedPlanningRecords(page);
    const downloadPromise = page.waitForEvent("download");
    await page.locator("#downloadFollowUpPlanningV1613").click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^methodz-follow-up-planning-\d{4}-\d{2}-\d{2}-7d\.csv$/);
  });

  test("keeps planning lanes and controls within a phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await seedPlanningRecords(page);
    const viewport = await page.evaluate(() => ({ width: window.innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
    await expect(page.locator("#followUpPlanningV1613")).toBeVisible();
    await expect(page.locator("#refreshFollowUpPlanningV1613")).toHaveCSS("min-height", "44px");
    await expect(page.locator("#downloadFollowUpPlanningV1613")).toHaveCSS("min-height", "44px");
  });
});
