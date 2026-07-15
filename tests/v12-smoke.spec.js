const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("v1.2 approval layer and migration load inside v1.3", async ({ page }) => {
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
    schema: "1.3.0",
    approvalVersion: "1.2.0",
    migrationRegistered: true,
    downloadGatePatched: true,
    fingerprintPolicyPatched: true,
    releaseAuditPatched: true,
    revisionButtonPatched: true
  });
});

test("archive page migrates v1.2 records forward without losing release controls", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("methodzMeetingRecords", JSON.stringify([{
      id: "archive-schema-v12",
      schemaVersion: "1.2.0",
      meetingNumber: "120",
      title: "Archive Schema Safety",
      date: "2026-07-14",
      status: "Completed",
      organizations: [],
      attendees: [],
      agenda: [],
      decisionsList: [],
      tasks: [],
      attachments: [],
      organizationDetails: [],
      accessControl: {},
      retentionMetadata: {},
      externalReleaseControl: {
        approvalRequired: true,
        defaultDestinationPolicyId: "other-external",
        lastApprovalId: "",
        lastApprovedAt: "",
        lastExportAt: ""
      }
    }]));
  });

  await page.goto("http://127.0.0.1:4173/archive.html");
  const result = await page.evaluate(() => ({
    schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
    record: JSON.parse(localStorage.getItem("methodzMeetingRecords"))[0]
  }));

  expect(result.schema).toBe("1.3.0");
  expect(result.record.schemaVersion).toBe("1.3.0");
  expect(result.record.externalReleaseControl.approvalRequired).toBe(true);
  expect(result.record.dispositionControl.approvalRequired).toBe(true);
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
      sourceTitle: second.record.externalCopy.sourceReference.title,
      sourceBinding: second.record.externalCopy.sourceBinding.digest
    };
  });

  expect(result.first).toBe(result.second);
  expect(result.generatedAt).toBeUndefined();
  expect(result.sourceTitle).toBe("Stable Fingerprint Test");
  expect(result.sourceBinding.length).toBeGreaterThan(8);
});

test("identical saved records receive different source-bound approval fingerprints", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const base = {
      schemaVersion: "1.3.0",
      meetingNumber: "777",
      title: "Identical Visible Record",
      date: "2026-07-14",
      status: "Completed",
      organizations: [],
      attendees: [],
      agenda: [],
      decisions: "",
      decisionsList: [],
      tasks: [],
      attachments: [],
      summary: "Same public summary",
      retentionMetadata: {},
      externalReleaseControl: { approvalRequired: true },
      dispositionControl: { approvalRequired: true }
    };
    localStorage.setItem("methodzMeetingRecords", JSON.stringify([
      { ...base, id: "source-record-a" },
      { ...base, id: "source-record-b" }
    ]));
    window.loadSavedRecords();
    document.getElementById("externalProfileV11").value = "public-summary";

    document.getElementById("externalRecordSourceV11").value = "active:source-record-a";
    const first = await window.previewExternalExportV11();
    const firstFingerprint = await window.MethodzExportApprovalV12.computeContentFingerprint(first, "public");

    document.getElementById("externalRecordSourceV11").value = "active:source-record-b";
    const second = await window.previewExternalExportV11();
    const secondFingerprint = await window.MethodzExportApprovalV12.computeContentFingerprint(second, "public");

    return {
      first: firstFingerprint.digest,
      second: secondFingerprint.digest,
      firstBinding: first.record.externalCopy.sourceBinding.digest,
      secondBinding: second.record.externalCopy.sourceBinding.digest
    };
  });

  expect(result.first).not.toBe(result.second);
  expect(result.firstBinding).not.toBe(result.secondBinding);
});

test("approved JSON and HTML packages carry reviewer sign-off and invalidate after content changes", async ({ page }) => {
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

  const downloads = await page.evaluate(async () => {
    window.__v12Downloads = [];
    window.downloadBlob = (content, filename, type) => {
      window.__v12Downloads.push({ content, filename, type });
    };
    await window.downloadApprovedExternalV12("json");
    await window.downloadApprovedExternalV12("html");
    return window.__v12Downloads;
  });

  const jsonDownload = downloads.find((item) => item.type === "application/json");
  const htmlDownload = downloads.find((item) => item.type === "text/html");
  const packageData = JSON.parse(jsonDownload.content);

  expect(packageData.packageType).toBe("methodz-approved-external-meeting-copy");
  expect(packageData.approval.approvedBy).toBe("Release Reviewer");
  expect(packageData.approval.destinationPolicyId).toBe("public");
  expect(packageData.integrity.digest.length).toBeGreaterThan(8);
  expect(JSON.stringify(packageData)).not.toContain("signatureVerification");

  expect(htmlDownload.content).toContain("Release Approval");
  expect(htmlDownload.content).toContain("Public / Website");
  expect(htmlDownload.content).toContain("Release Reviewer");
  expect(htmlDownload.content).not.toContain("signatureVerification");
  expect(htmlDownload.content).not.toContain("signatureConsent");

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
