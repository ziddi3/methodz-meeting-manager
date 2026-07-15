const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("v1.x panels and provider contracts load", async ({ page }) => {
  await expect(page.locator("#recordGovernancePanelV10")).toBeVisible();
  await expect(page.locator("#signatureReviewV10")).toBeVisible();
  await expect(page.locator("#recordsWorkspaceV10")).toBeVisible();
  await expect(page.locator("#providerReadinessV10")).toBeVisible();
  await expect(page.locator("#releaseGateV10")).toBeVisible();

  const contracts = await page.evaluate(async () => ({
    schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
    asyncHealth: await window.MethodzMeetingAsyncData.healthCheck(),
    attachmentHealth: window.MethodzAttachmentData.healthCheck()
  }));

  expect(contracts.schema).toBe("1.3.0");
  expect(contracts.asyncHealth.ok).toBe(true);
  expect(contracts.attachmentHealth.ok).toBe(true);
});

test("typed signatures require consent and save release audit fields", async ({ page }) => {
  await page.locator("#meetingTitle").fill("v1.3 Consent Smoke Test");
  await page.locator(".attendee-name").first().fill("Charles Stenerson");
  await page.locator(".attendee-signature").first().fill("Charles Stenerson");

  let blockedMessage = "";
  page.once("dialog", async (dialog) => {
    blockedMessage = dialog.message();
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Save Record" }).first().click();
  expect(blockedMessage).toContain("Signature consent is required");

  await page.locator(".signature-consent-accepted-v10").first().check();

  let savedMessage = "";
  page.once("dialog", async (dialog) => {
    savedMessage = dialog.message();
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Save Record" }).first().click();
  expect(savedMessage).toContain("Meeting record saved");

  const record = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzMeetingRecords"))[0]);
  expect(record.schemaVersion).toBe("1.3.0");
  expect(record.attendees[0].signatureConsent.accepted).toBe(true);
  expect(record.accessControl.classification).toBe("Internal");
  expect(record.attachmentAdapterMetadata.adapterId).toBe("record-reference");
  expect(record.schemaAudit.schemaVersion).toBe("1.3.0");
  expect(record.retentionMetadata.policyId).toBeTruthy();
  expect(record.externalReleaseControl.approvalRequired).toBe(true);
  expect(record.dispositionControl.approvalRequired).toBe(true);
});

test("consolidated workspace indexes active records", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Workspace Index Smoke Test");
  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save Record" }).first().click();

  await expect(page.locator("#recordsWorkspaceBodyV10")).toContainText("Workspace Index Smoke Test");
  await expect(page.locator("#recordsWorkspaceMetricsV10")).toContainText("1");
});
