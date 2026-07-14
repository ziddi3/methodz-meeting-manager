const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("v1.2 approval panels, migration, and API load", async ({ page }) => {
  await expect(page.locator("#externalApprovalPanelV12")).toBeVisible();
  await expect(page.locator("#dispositionApprovalPanelV12")).toBeVisible();

  const state = await page.evaluate(() => ({
    schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
    approvalsVersion: window.MethodzApprovalsV12.version,
    migrationRegistered: window.MethodzMigrations.registry.some((entry) => entry.version === "1.2.0")
  }));

  expect(state).toEqual({
    schema: "1.2.0",
    approvalsVersion: "1.2.0",
    migrationRegistered: true
  });
});

test("approved external export is fingerprint-bound and embedded in the package", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Approved Partner Export Test");
  await page.locator("#exportApprovalRequestedByV12").fill("Meeting Recorder");
  await page.locator("#exportApprovalNoteV12").fill("Approved operational copy for Method HVAC review.");
  await page.getByRole("button", { name: "Request Review" }).first().click();
  await expect(page.locator("#externalApprovalStatusV12")).toContainText("Review Requested");

  await page.locator("#exportApprovalReviewedByV12").fill("Records Auditor");
  await page.getByRole("button", { name: "Approve", exact: true }).first().click();
  await expect(page.locator("#externalApprovalStatusV12")).toContainText("Approved by Records Auditor");

  const result = await page.evaluate(async () => {
    const payload = await window.previewExternalExportV11();
    const context = window.MethodzApprovalsV12.currentExportContext();
    return {
      approval: payload.approval,
      manifest: payload.manifest,
      valid: Boolean(window.MethodzApprovalsV12.findValidExportApproval(context)),
      integrity: payload.integrity
    };
  });

  expect(result.valid).toBe(true);
  expect(result.approval.status).toBe("Approved");
  expect(result.approval.validForCurrentSource).toBe(true);
  expect(result.manifest.approvalRequired).toBe(true);
  expect(result.manifest.approvalId).toBeTruthy();
  expect(result.integrity.digest.length).toBeGreaterThan(8);
});

test("changing source content invalidates an approved external export", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Fingerprint Before Change");
  await page.locator("#exportApprovalRequestedByV12").fill("Meeting Recorder");
  await page.locator("#exportApprovalNoteV12").fill("Partner review copy.");
  await page.getByRole("button", { name: "Request Review" }).first().click();
  await page.locator("#exportApprovalReviewedByV12").fill("Records Auditor");
  await page.getByRole("button", { name: "Approve", exact: true }).first().click();

  await page.locator("#meetingTitle").fill("Fingerprint After Change");
  await expect(page.locator("#externalApprovalStatusV12")).toContainText("source record changed");

  const valid = await page.evaluate(() => {
    const context = window.MethodzApprovalsV12.currentExportContext();
    return Boolean(window.MethodzApprovalsV12.findValidExportApproval(context));
  });
  expect(valid).toBe(false);
});

test("disposition approval is fingerprint-bound", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Disposition Approval Test");
  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save Record" }).first().click();

  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Archive meeting/i }).click();
  await expect(page.locator("#dispositionArchiveSourceV12")).not.toHaveValue("");

  await page.locator("#dispositionRequestedByV12").fill("Records Coordinator");
  await page.locator("#dispositionBasisV12").fill("Retention review completed and disposition authorized under policy.");
  await page.getByRole("button", { name: "Request Review" }).nth(1).click();
  await page.locator("#dispositionReviewedByV12").fill("Records Auditor");
  await page.getByRole("button", { name: "Approve Disposition" }).click();

  const valid = await page.evaluate(() => {
    const archiveId = document.getElementById("dispositionArchiveSourceV12").value;
    const entry = JSON.parse(localStorage.getItem("methodzArchivedMeetingRecords"))[0];
    return archiveId === entry.archiveId && Boolean(window.MethodzApprovalsV12.findValidDispositionApproval(entry));
  });
  expect(valid).toBe(true);
  await expect(page.locator("#dispositionStatusV12")).toContainText("Disposition approved");
});
