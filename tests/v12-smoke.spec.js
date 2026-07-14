const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("v1.2 approval layer and migration load", async ({ page }) => {
  await expect(page.locator("#externalApprovalPanelV12")).toBeVisible();

  const state = await page.evaluate(() => ({
    schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
    approvalVersion: window.MethodzExportApprovalV12.version,
    migrationRegistered: window.MethodzMigrations.registry.some((entry) => entry.version === "1.2.0"),
    downloadGatePatched: window.__methodzV12DownloadGatePatched,
    fingerprintPolicyPatched: window.__methodzV12FingerprintPolicyPatched,
    releaseAuditPatched: window.__methodzV12ReleaseAuditPatched,
    revisionButtonPatched: window.__methodzV12RevisionButtonPatched
  }));

  expect(state).toEqual({
    schema: "1.2.0",
    approvalVersion: "1.2.0",
    migrationRegistered: true,
    downloadGatePatched: true,
    fingerprintPolicyPatched: true,
    releaseAuditPatched: true,
    revisionButtonPatched: true
  });
});

test("public destination blocks non-public profiles", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Destination Policy Test");
  await page.locator("#externalDestinationV12").selectOption("public");
  await page.locator("#externalProfileV11").selectOption("partner-safe");
  await page.locator("#approvalRequestedByV12").fill("Release Preparer");
  await page.locator("#approvalPurposeV12").fill("Website publication");

  const result = await page.evaluate(async () => {
    let message = "";
    const originalAlert = window.alert;
    window.alert = (value) => {
      message = String(value || "");
    };
    const request = await window.requestExternalApprovalV12();
    window.alert = originalAlert;
    return {
      message,
      request,
      approvals: JSON.parse(localStorage.getItem("methodzExternalExportApprovals") || "[]")
    };
  });

  expect(result.message).toContain("does not allow");
  expect(result.request).toBeNull();
  expect(result.approvals).toHaveLength(0);
});

test("approval fingerprint is stable across regenerated previews", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Stable Fingerprint Test");
  await page.locator("#summary").fill("Stable external summary.");
  await page.locator("#externalDestinationV12").selectOption("public");
  await page.locator("#externalProfileV11").selectOption("public-summary");

  const result = await page.evaluate(async () => {
    const first = await window.previewExternalExportV11();
    const firstFingerprint = await window.MethodzExportApprovalV12.computeContentFingerprint(first, "public");
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await window.previewExternalExportV11();
    const secondFingerprint = await window.MethodzExportApprovalV12.computeContentFingerprint(second, "public");
    return {
      first: firstFingerprint.digest,
      second: secondFingerprint.digest,
      generatedAt: second.record.externalCopy.generatedAt,
      sourceTitle: second.record.externalCopy.sourceReference.title
    };
  });

  expect(result.first).toBe(result.second);
  expect(result.generatedAt).toBeUndefined();
  expect(result.sourceTitle).toBe("Stable Fingerprint Test");
});

test("approved package carries reviewer sign-off and invalidates after content changes", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Approved Public Summary");
  await page.locator("#summary").fill("Approved external summary.");
  await page.locator("#externalDestinationV12").selectOption("public");
  await page.locator("#externalProfileV11").selectOption("public-summary");
  await page.locator("#approvalRequestedByV12").fill("Release Preparer");
  await page.locator("#approvalPurposeV12").fill("Publish approved meeting summary");
  await page.evaluate(() => window.requestExternalApprovalV12());

  await page.locator("#approvalReviewedByV12").fill("Release Reviewer");
  await page.locator("#approvalReviewNoteV12").fill("Summary verified for public release.");
  await page.evaluate(() => window.approveExternalRequestV12());

  const approval = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzExternalExportApprovals"))[0]);
  expect(approval.status).toBe("Approved");
  expect(approval.reviewedBy).toBe("Release Reviewer");
  expect(approval.contentFingerprint.digest.length).toBeGreaterThan(8);

  const packageData = await page.evaluate(async () => {
    window.downloadBlob = (content, filename, type) => {
      window.__v12Download = { content, filename, type };
    };
    await window.downloadApprovedExternalV12("json");
    return JSON.parse(window.__v12Download.content);
  });

  expect(packageData.packageType).toBe("methodz-approved-external-meeting-copy");
  expect(packageData.approval.approvedBy).toBe("Release Reviewer");
  expect(packageData.approval.destinationPolicyId).toBe("public");
  expect(packageData.integrity.digest.length).toBeGreaterThan(8);
  expect(JSON.stringify(packageData)).not.toContain("signatureVerification");

  await page.locator("#summary").fill("Changed after approval.");
  const changedMessage = await page.evaluate(async () => {
    let message = "";
    const originalAlert = window.alert;
    window.alert = (value) => {
      message = String(value || "");
    };
    const result = await window.downloadApprovedExternalV12("json");
    window.alert = originalAlert;
    return { message, result };
  });

  expect(changedMessage.result).toBeNull();
  expect(changedMessage.message).toContain("No current approved request matches");
});
