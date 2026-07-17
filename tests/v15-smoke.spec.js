const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

function policy() {
  return {
    id: "recipient-policy-v15-test",
    label: "V1.5 Operations Recipient",
    recipientName: "Operations Contact",
    organization: "Canadian Soft Water Corporation",
    contactReference: "operations@example.test",
    baseDestinationId: "canadian-soft-water",
    allowedProfiles: ["partner-safe", "custom"],
    allowedFields: ["core", "organizations", "summary"],
    status: "Active",
    reviewDate: "2099-07-20",
    verificationNote: "Recipient scope was verified for the operations test.",
    createdAt: "2026-07-16T00:00:00.000Z",
    updatedAt: "2026-07-16T00:00:00.000Z"
  };
}

function governance(overrides = {}) {
  return {
    policyId: "recipient-policy-v15-test",
    stewardName: "Records Coordinator",
    stewardRole: "Records Coordinator",
    riskTier: "Elevated",
    businessPurpose: "Provide reviewed operational meeting summaries to the named partner contact.",
    cadenceDays: 90,
    lastReviewedAt: "2026-07-16T00:00:00.000Z",
    lastReviewedBy: "Compliance Reviewer",
    reviewNote: "Recipient, purpose, and allowed fields reviewed.",
    createdAt: "2026-07-16T00:00:00.000Z",
    updatedAt: "2026-07-16T00:00:00.000Z",
    ...overrides
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("v1.5 policy operations panel, migration, API, and download routing load inside v1.6", async ({ page }) => {
  await expect(page.locator("#policyOperationsPanelV15")).toBeVisible();
  const state = await page.evaluate(() => ({
    schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
    version: window.MethodzPolicyOperationsV15.version,
    migration: window.MethodzMigrations.registry.some((entry) => entry.version === "1.5.0"),
    previewPatched: window.__methodzV15PreviewGovernancePatched,
    downloadPatched: window.__methodzV15ApprovedDownloadPatched,
    downloadRoutingPatched: window.__methodzV15DownloadRoutingPatched
  }));
  expect(state).toEqual({
    schema: "1.6.0",
    version: "1.5.0",
    migration: true,
    previewPatched: true,
    downloadPatched: true,
    downloadRoutingPatched: true
  });
});

test("policy stewardship can be saved and a review advances the policy review date", async ({ page }) => {
  await page.evaluate((value) => window.MethodzRecipientPolicyV14.writePolicies([value]), policy());
  await page.reload();

  await page.locator("#governancePolicySelectV15").selectOption("recipient-policy-v15-test");
  await page.locator("#policyStewardNameV15").fill("Records Coordinator");
  await page.locator("#policyStewardRoleV15").selectOption({ label: "Records Coordinator" });
  await page.locator("#policyRiskTierV15").selectOption("Elevated");
  await page.locator("#policyReviewCadenceV15").fill("90");
  await page.locator("#policyBusinessPurposeV15").fill("Provide reviewed operational summaries to the named recipient.");
  await page.getByRole("button", { name: "Save Stewardship" }).click();

  await page.locator("#policyReviewerNameV15").fill("Compliance Reviewer");
  await page.locator("#policyReviewNoteV15").fill("Recipient identity reference, purpose, profile, and field scope reviewed.");
  await page.getByRole("button", { name: "Mark Reviewed Now" }).click();

  const result = await page.evaluate(() => ({
    policy: window.MethodzRecipientPolicyV14.readPolicies()[0],
    governance: window.MethodzPolicyOperationsV15.readGovernance()[0]
  }));
  expect(result.policy.reviewDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  expect(Date.parse(`${result.policy.reviewDate}T23:59:59.999Z`)).toBeGreaterThan(Date.now());
  expect(result.governance.stewardName).toBe("Records Coordinator");
  expect(result.governance.lastReviewedBy).toBe("Compliance Reviewer");
  expect(result.governance.riskTier).toBe("Elevated");
});

test("recipient governance version is bound into the redacted preview fingerprint", async ({ page }) => {
  await page.evaluate(({ policyValue, governanceValue }) => {
    window.MethodzRecipientPolicyV14.writePolicies([policyValue]);
    window.MethodzPolicyOperationsV15.writeGovernance([governanceValue]);
  }, { policyValue: policy(), governanceValue: governance() });
  await page.reload();

  await page.locator("#recipientPolicySelectV14").selectOption("recipient-policy-v15-test");
  await page.getByRole("button", { name: "Apply to Export" }).click();
  await page.locator("#meetingTitle").fill("Governance Binding Test");
  await page.locator("#summary").fill("Reviewed operational summary.");

  const first = await page.evaluate(async () => {
    const payload = await window.previewExternalExportV11();
    return {
      version: payload.record.externalCopy.recipientGovernanceVersion,
      riskTier: payload.record.externalCopy.recipientRiskTier,
      digest: payload.integrity.digest
    };
  });

  await page.evaluate((updated) => window.MethodzPolicyOperationsV15.writeGovernance([updated]), governance({
    riskTier: "Restricted",
    updatedAt: "2026-07-17T00:00:00.000Z"
  }));

  const second = await page.evaluate(async () => {
    const payload = await window.previewExternalExportV11();
    return {
      version: payload.record.externalCopy.recipientGovernanceVersion,
      riskTier: payload.record.externalCopy.recipientRiskTier,
      digest: payload.integrity.digest
    };
  });

  expect(first.riskTier).toBe("Elevated");
  expect(second.riskTier).toBe("Restricted");
  expect(second.version).not.toBe(first.version);
  expect(second.digest).not.toBe(first.digest);
});

test("approved external download records and verifies a chained release receipt", async ({ page }) => {
  await page.evaluate(({ policyValue, governanceValue }) => {
    window.MethodzRecipientPolicyV14.writePolicies([policyValue]);
    window.MethodzPolicyOperationsV15.writeGovernance([governanceValue]);
  }, { policyValue: policy(), governanceValue: governance() });
  await page.reload();

  await page.locator("#recipientPolicySelectV14").selectOption("recipient-policy-v15-test");
  await page.getByRole("button", { name: "Apply to Export" }).click();
  await page.locator("#meetingTitle").fill("Release Receipt Test");
  await page.locator("#summary").fill("Approved summary for receipt verification.");
  await page.locator("#approvalRequestedByV12").fill("Records Coordinator");
  await page.locator("#approvalPurposeV12").fill("Provide the approved summary to the named operations recipient.");
  const approvalPanel = page.locator("#externalApprovalPanelV12");
  await approvalPanel.getByRole("button", { name: "Request Approval", exact: true }).click();
  await page.waitForFunction(() => {
    const requests = JSON.parse(localStorage.getItem("methodzExternalExportApprovals") || "[]");
    return requests.some((request) => request.status === "Pending");
  });

  await page.locator("#approvalReviewedByV12").fill("Compliance Reviewer");
  await page.locator("#approvalReviewNoteV12").fill("Approved for the recipient-specific operational purpose.");
  await approvalPanel.getByRole("button", { name: "Approve Selected", exact: true }).click();
  await page.waitForFunction(() => {
    const requests = JSON.parse(localStorage.getItem("methodzExternalExportApprovals") || "[]");
    return requests.some((request) => request.status === "Approved");
  });

  const result = await page.evaluate(async () => {
    window.downloadBlob = () => {};
    await window.downloadExternalJsonV11();
    return {
      receipts: window.MethodzPolicyOperationsV15.readReceipts(),
      verification: window.MethodzPolicyOperationsV15.verifyReceiptLedger()
    };
  });

  expect(result.receipts).toHaveLength(1);
  expect(result.receipts[0].approvalId).toBeTruthy();
  expect(result.receipts[0].recipientPolicy.id).toBe("recipient-policy-v15-test");
  expect(result.receipts[0].chain.sequence).toBe(1);
  expect(result.receipts[0].chain.previousDigest).toBe("GENESIS");
  expect(result.receipts[0].chain.digest).toMatch(/^fnv1a32-/);
  expect(result.verification.valid).toBe(true);
  expect(result.verification.checked).toBe(1);
});
