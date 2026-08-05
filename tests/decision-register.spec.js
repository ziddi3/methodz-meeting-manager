const { test, expect } = require("@playwright/test");

const BASE_URL = process.env.METHODZ_BASE_URL || "http://127.0.0.1:4173";

const seedRecord = {
  id: "decision-register-meeting",
  schemaVersion: "1.6.0",
  meetingNumber: "DEC-001",
  title: "Decision Register Rehearsal",
  status: "Completed",
  date: "2026-08-04",
  location: "Protected location",
  facilitator: "Protected facilitator",
  organizations: ["Method HVAC Inc."],
  attendees: [{ name: "Private Attendee", organizationRole: "Operations", signature: "Private Signature" }],
  agenda: [{ group: "Operations", item: "Protected agenda", completed: true }],
  notes: "Private discussion notes",
  decisions: "Private free-form decision prose",
  decisionsList: [
    {
      decision: "Approve the field rehearsal",
      approvedBy: "Operations Group",
      date: "2026-08-04",
      status: "Approved",
      notes: "Use the documented checklist"
    },
    {
      decision: "Review the provider evidence",
      approvedBy: "",
      date: "not-a-date",
      status: "Proposed",
      notes: "=WEBSERVICE(\"https://example.invalid\")"
    }
  ],
  tasks: [{ task: "Private task", assignedTo: "Private Assignee", priority: "High", due: "2026-08-10", status: "Pending" }],
  summary: "Private summary",
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
  savedAt: "2026-08-04T00:00:00.000Z"
};

const freeFormOnlyRecord = {
  id: "decision-register-free-form",
  schemaVersion: "1.6.0",
  meetingNumber: "DEC-002",
  title: "Free-form Decision Source",
  status: "Completed",
  date: "2026-08-03",
  decisions: "Free-form prose must remain only in the source record.",
  decisionsList: [],
  attendees: [],
  agenda: [],
  tasks: []
};

async function seed(page) {
  await page.goto(`${BASE_URL}/meeting.html`);
  await page.evaluate(({ record, freeForm }) => {
    localStorage.clear();
    localStorage.setItem("methodzMeetingRecords", JSON.stringify([record, freeForm]));
  }, { record: seedRecord, freeForm: freeFormOnlyRecord });
  await page.reload();
  await page.goto(`${BASE_URL}/decisions.html`);
}

test.describe("Decision Register", () => {
  test("renders bounded structured decisions and free-form source reviews without changing records", async ({ page }) => {
    await seed(page);
    const recordsBefore = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));

    await expect(page.getByRole("heading", { name: "Decision Register" })).toBeVisible();
    await expect(page.getByText("Approve the field rehearsal")).toBeVisible();
    await expect(page.getByText("Review the provider evidence")).toBeVisible();
    await expect(page.getByText("Free-form Decision Source")).toBeVisible();
    await expect(page.getByText("Decision date invalid")).toBeVisible();
    await expect(page.getByText("Approved / Confirmed By missing")).toBeVisible();
    await expect(page.locator("#decisionRegisterMetrics")).toContainText("2");

    const recordsAfter = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
    expect(recordsAfter).toBe(recordsBefore);
  });

  test("filters deterministically and builds a protected CSV without raw identifiers or unrelated meeting data", async ({ page }) => {
    await seed(page);
    await page.locator("#decisionStatusFilter").selectOption("needs-review");
    await expect(page.getByText("Review the provider evidence")).toBeVisible();
    await expect(page.getByText("Approve the field rehearsal")).toHaveCount(0);

    const csv = await page.evaluate(() => window.MethodzDecisionRegisterV1617.buildCsv());
    expect(csv).toContain("Review the provider evidence");
    expect(csv).toContain("Decision date invalid");
    expect(csv).toContain("'=WEBSERVICE(");
    expect(csv).not.toContain('"=WEBSERVICE(');
    expect(csv).not.toContain("Approve the field rehearsal");
    expect(csv).not.toContain("decision-register-meeting");
    expect(csv).not.toContain("Private Attendee");
    expect(csv).not.toContain("Private Signature");
    expect(csv).not.toContain("Private discussion notes");
    expect(csv).not.toContain("Private task");
    expect(csv).not.toContain("Private Assignee");
    expect(csv).not.toContain("Private free-form decision prose");
    expect(csv).not.toContain("Free-form prose must remain only in the source record.");
  });

  test("opens the source meeting, removes the fragment, focuses Decisions, and preserves storage", async ({ page }) => {
    await seed(page);
    const recordsBefore = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
    const approvedCard = page.locator(".decision-register-card.lane-approved");
    const openLink = approvedCard.getByRole("link", { name: /Open .* decisions/ });
    await expect(openLink).toHaveAttribute("href", /meeting\.html#prepare-record=decision-register-meeting&focus=decisions&from=decision-register$/);
    await openLink.click();

    await expect(page).toHaveURL(`${BASE_URL}/meeting.html`);
    await expect(page.locator("#editingRecordId")).toHaveValue("decision-register-meeting");
    await expect(page.locator("#meetingTitle")).toHaveValue("Decision Register Rehearsal");
    await expect(page.locator("#decisions")).toBeFocused();
    await expect(page.locator("#decisionsMadePanelV1610")).toHaveClass(/methodz-preparation-target-v1614/);
    await expect(page.locator("#preparationLaunchStatusV1614")).toContainText("Decisions Made");
    await expect(page.getByRole("link", { name: "Back to Decision Register" })).toHaveAttribute("href", "decisions.html");

    const recordsAfter = await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"));
    expect(recordsAfter).toBe(recordsBefore);
  });

  test("fails visibly for malformed storage and a missing source record", async ({ page }) => {
    await page.goto(`${BASE_URL}/decisions.html`);
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("methodzMeetingRecords", "{broken");
    });
    await page.reload();
    await expect(page.locator("#decisionRegisterStatus")).toContainText("could not be read");
    expect(await page.evaluate(() => localStorage.getItem("methodzMeetingRecords"))).toBe("{broken");

    await page.evaluate((record) => localStorage.setItem("methodzMeetingRecords", JSON.stringify([record])), seedRecord);
    await page.goto(`${BASE_URL}/meeting.html#prepare-record=missing-record&focus=decisions&from=decision-register`);
    await expect(page).toHaveURL(`${BASE_URL}/meeting.html`);
    await expect(page.locator("#preparationLaunchStatusV1614")).toContainText("Saved meeting was not found");
    await expect(page.getByRole("link", { name: "Back to Decision Register" })).toHaveAttribute("href", "decisions.html");
  });

  test("keeps register controls touch-safe and contained on a narrow phone", async ({ page }) => {
    await seed(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await expect(page.getByRole("button", { name: "Refresh Register" })).toHaveCSS("min-height", "44px");
    await expect(page.locator(".decision-register-card").first()).toBeVisible();
    const viewport = await page.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
});
