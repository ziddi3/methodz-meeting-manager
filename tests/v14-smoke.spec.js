const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

function policy(overrides = {}) {
  return {
    id: "recipient-policy-test",
    label: "Named Operations Recipient",
    recipientName: "Operations Contact",
    organization: "Canadian Soft Water Corporation",
    contactReference: "operations@example.test",
    baseDestinationId: "canadian-soft-water",
    allowedProfiles: ["partner-safe", "custom"],
    allowedFields: ["core", "organizations", "summary"],
    status: "Active",
    reviewDate: "2099-12-31",
    verificationNote: "Recipient and operational field scope reviewed.",
    createdAt: "2026-07-15T00:00:00.000Z",
    updatedAt: "2026-07-15T00:00:00.000Z",
    ...overrides
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("v1.4 recipient policy panel and migration load inside v1.5", async ({ page }) => {
  await expect(page.locator("#recipientPolicyPanelV14")).toBeVisible();
  const state = await page.evaluate(() => ({
    schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
    version: window.MethodzRecipientPolicyV14.version,
    migration: window.MethodzMigrations.registry.some((entry) => entry.version === "1.4.0"),
    previewPatched: window.__methodzV14PreviewPatched,
    approvalPatched: window.__methodzV14ApprovalRequestPatched,
    stabilityPatched: window.__methodzV14PreviewStabilityHardened
  }));
  expect(state).toEqual({
    schema: "1.5.0",
    version: "1.4.0",
    migration: true,
    previewPatched: true,
    approvalPatched: true,
    stabilityPatched: true
  });
});

test("recipient policy becomes a unique destination and enforces a field allow-list", async ({ page }) => {
  await page.evaluate((value) => window.MethodzRecipientPolicyV14.writePolicies([value]), policy());
  await page.locator("#recipientPolicySelectV14").selectOption("recipient-policy-test");
  await page.getByRole("button", { name: "Apply to Export" }).click();

  await page.locator("#meetingTitle").fill("Recipient Policy Preview");
  await page.locator("#summary").fill("Approved operational summary.");
  await page.locator(".task-name").first().fill("Internal task that is outside the allow-list");

  const result = await page.evaluate(async () => {
    const payload = await window.previewExternalExportV11();
    return {
      destination: document.getElementById("externalDestinationV12").value,
      recipientPolicy: payload.manifest.recipientPolicy,
      recordKeys: Object.keys(payload.record).sort(),
      summary: payload.record.summary,
      tasks: payload.record.tasks,
      integrity: payload.integrity
    };
  });

  expect(result.destination).toBe("recipient:recipient-policy-test");
  expect(result.recipientPolicy.id).toBe("recipient-policy-test");
  expect(result.summary).toBe("Approved operational summary.");
  expect(result.recordKeys).not.toContain("tasks");
  expect(result.tasks).toBeUndefined();
  expect(result.integrity.digest).toBeTruthy();
});

test("approval request is bound to the named recipient policy snapshot", async ({ page }) => {
  await page.evaluate((value) => window.MethodzRecipientPolicyV14.writePolicies([value]), policy());
  await page.locator("#recipientPolicySelectV14").selectOption("recipient-policy-test");
  await page.getByRole("button", { name: "Apply to Export" }).click();
  await page.locator("#meetingTitle").fill("Recipient-Bound Approval");
  await page.locator("#approvalRequestedByV12").fill("Records Coordinator");
  await page.locator("#approvalPurposeV12").fill("Provide an approved operational copy to the named recipient.");
  await page.locator("#externalApprovalPanelV12").getByRole("button", { name: "Request Approval" }).click();
  await page.waitForFunction(() => {
    const requests = JSON.parse(localStorage.getItem("methodzExternalExportApprovals") || "[]");
    return requests.length === 1 && Boolean(requests[0]?.recipientPolicySnapshot);
  });

  const request = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzExternalExportApprovals"))[0]);
  expect(request.destinationPolicyId).toBe("recipient:recipient-policy-test");
  expect(request.recipientPolicyId).toBe("recipient-policy-test");
  expect(request.recipientPolicySnapshot.recipientName).toBe("Operations Contact");
  expect(request.contentFingerprint.digest).toBeTruthy();
});

test("discussion notes require a meaningful verification note", async ({ page }) => {
  const result = await page.evaluate((value) => {
    const normalized = window.MethodzRecipientPolicyV14.normalizePolicy(value);
    return window.MethodzRecipientPolicyV14.validatePolicy(normalized);
  }, policy({
    allowedFields: ["core", "discussion-notes"],
    verificationNote: "short"
  }));
  expect(result.valid).toBe(false);
  expect(result.errors.join(" ")).toContain("meaningful verification note");
});

test("overdue recipient policy cannot be applied", async ({ page }) => {
  await page.evaluate((value) => window.MethodzRecipientPolicyV14.writePolicies([value]), policy({ reviewDate: "2020-01-01" }));
  await page.locator("#recipientPolicySelectV14").selectOption("recipient-policy-test");

  const result = await page.evaluate(() => {
    let message = "";
    const original = window.alert;
    window.alert = (value) => { message = String(value || ""); };
    const applied = window.applyRecipientPolicyToExportV14();
    window.alert = original;
    return { message, applied };
  });

  expect(result.applied).toBeNull();
  expect(result.message).toContain("past its review date");
});
