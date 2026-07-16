const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("v1.3 disposition panels and migration load inside v1.6", async ({ page }) => {
  await expect(page.locator("#dispositionPanelV13")).toBeVisible();
  await expect(page.locator("#preservationAuditPanelV13")).toBeVisible();
  const state = await page.evaluate(() => ({
    schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
    version: window.MethodzDispositionV13.version,
    migration: window.MethodzMigrations.registry.some((entry) => entry.version === "1.3.0"),
    gate: window.__methodzV13ArchiveGatePatched
  }));
  expect(state).toEqual({ schema: "1.6.0", version: "1.3.0", migration: true, gate: true });
});

test("a separate authorized reviewer can approve fingerprint-bound disposition", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Disposition Approval Test");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save Record" }).first().click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Archive meeting/i }).click();

  const panel = page.locator("#dispositionPanelV13");
  await panel.locator("#dispositionRequestedByV13").fill("Records Coordinator");
  await panel.locator("#dispositionBasisV13").fill("Retention review completed and removal authorized under the internal policy.");
  await panel.getByRole("button", { name: "Request Disposition Review" }).click();
  await panel.locator("#dispositionReviewedByV13").fill("Records Auditor");
  await panel.getByRole("button", { name: "Approve Selected", exact: true }).click();

  const result = await page.evaluate(() => {
    const entry = JSON.parse(localStorage.getItem("methodzArchivedMeetingRecords"))[0];
    const approval = JSON.parse(localStorage.getItem("methodzDispositionApprovals"))[0];
    return {
      approval,
      valid: Boolean(window.MethodzDispositionV13.findValidDispositionApproval(entry)),
      chain: window.MethodzDispositionV13.verifyChain()
    };
  });
  expect(result.approval.status).toBe("Approved");
  expect(result.approval.requestedBy).toBe("Records Coordinator");
  expect(result.approval.reviewedBy).toBe("Records Auditor");
  expect(result.valid).toBe(true);
  expect(result.chain.valid).toBe(true);
});

test("requester cannot approve their own disposition request", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Separation of Duties Test");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save Record" }).first().click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Archive meeting/i }).click();
  await page.locator("#dispositionRequestedByV13").fill("Same Person");
  await page.locator("#dispositionBasisV13").fill("Policy review complete.");
  await page.locator("#dispositionPanelV13").getByRole("button", { name: "Request Disposition Review" }).click();
  await page.locator("#dispositionReviewedByV13").fill("Same Person");

  const result = await page.evaluate(() => {
    let message = "";
    const original = window.alert;
    window.alert = (value) => { message = String(value || ""); };
    const approval = window.approveDispositionV13();
    window.alert = original;
    return { message, approval, stored: JSON.parse(localStorage.getItem("methodzDispositionApprovals"))[0] };
  });
  expect(result.approval).toBeNull();
  expect(result.message).toContain("different from the requester");
  expect(result.stored.status).toBe("Pending");
});

test("active preservation hold blocks disposition approval", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Held Disposition Test");
  await page.locator("#legalHoldActiveV11").check();
  await page.locator("#legalHoldActorV11").fill("Records Administrator");
  await page.locator("#legalHoldReasonV11").fill("Pending dispute review");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save Record" }).first().click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Archive meeting/i }).click();

  await expect(page.locator("#dispositionStatusV13")).toContainText("Preservation hold active");
  await page.locator("#dispositionRequestedByV13").fill("Records Coordinator");
  await page.locator("#dispositionBasisV13").fill("Attempted review.");
  const result = await page.evaluate(() => {
    let message = "";
    const original = window.alert;
    window.alert = (value) => { message = String(value || ""); };
    const request = window.requestDispositionApprovalV13();
    window.alert = original;
    return { message, request };
  });
  expect(result.request).toBeNull();
  expect(result.message).toContain("preservation hold");
});

test("approved archive removal consumes approval and preserves a verified audit event", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Consumed Disposition Test");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save Record" }).first().click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Archive meeting/i }).click();
  const panel = page.locator("#dispositionPanelV13");
  await panel.locator("#dispositionRequestedByV13").fill("Records Coordinator");
  await panel.locator("#dispositionBasisV13").fill("Approved retention outcome.");
  await panel.getByRole("button", { name: "Request Disposition Review" }).click();
  await panel.locator("#dispositionReviewedByV13").fill("Records Auditor");
  await panel.getByRole("button", { name: "Approve Selected", exact: true }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.locator("#archiveVaultListV08 button[data-action='delete']").click();
  await page.waitForTimeout(50);

  const result = await page.evaluate(() => ({
    archived: JSON.parse(localStorage.getItem("methodzArchivedMeetingRecords") || "[]"),
    approval: JSON.parse(localStorage.getItem("methodzDispositionApprovals"))[0],
    actions: JSON.parse(localStorage.getItem("methodzPreservationEventChain")).map((event) => event.action),
    verification: window.MethodzDispositionV13.verifyChain()
  }));
  expect(result.archived).toHaveLength(0);
  expect(result.approval.status).toBe("Consumed");
  expect(result.actions).toContain("permanent-delete-completed");
  expect(result.verification.valid).toBe(true);
});
