const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("release receipt verification detects local receipt tampering", async ({ page }) => {
  const result = await page.evaluate(() => {
    const api = window.MethodzPolicyOperationsV15;
    api.appendReleaseReceipt({
      packageType: "methodz-approved-external-meeting-copy",
      exportedAt: "2026-07-16T12:00:00.000Z",
      manifest: {
        profile: "public-summary",
        sourceReference: {
          id: "tamper-test-record",
          meetingNumber: "T-001",
          title: "Receipt Tamper Test",
          date: "2026-07-16"
        }
      },
      integrity: {
        algorithm: "SHA-256",
        digest: "sha256-test-package-digest"
      },
      approval: {
        approvalId: "approval-tamper-test",
        destinationPolicyId: "public",
        destinationLabel: "Public / Website",
        contentFingerprint: {
          algorithm: "SHA-256",
          digest: "sha256-test-fingerprint"
        },
        requestedBy: "Release Preparer",
        approvedBy: "Release Reviewer",
        approvedAt: "2026-07-16T11:59:00.000Z",
        expiresAt: "2026-07-17T11:59:00.000Z",
        purpose: "Verify receipt-chain change detection."
      }
    }, "json");

    const before = api.verifyReceiptLedger();
    const receipts = api.readReceipts();
    receipts[0].approvalId = "tampered-approval-id";
    localStorage.setItem("methodzExternalReleaseReceipts", JSON.stringify(receipts));
    const after = api.verifyReceiptLedger();

    return { before, after };
  });

  expect(result.before.valid).toBe(true);
  expect(result.before.checked).toBe(1);
  expect(result.after.valid).toBe(false);
  expect(result.after.error).toContain("failed digest verification");
});

test("policy review state separates inactive, overdue, due-soon, undated, and current policies", async ({ page }) => {
  const states = await page.evaluate(() => {
    const reviewState = window.MethodzPolicyOperationsV15.reviewState;
    const now = Date.parse("2026-07-16T12:00:00.000Z");
    return {
      inactive: reviewState({ status: "Inactive", reviewDate: "2099-01-01" }, now),
      overdue: reviewState({ status: "Active", reviewDate: "2026-07-15" }, now),
      dueSoon: reviewState({ status: "Active", reviewDate: "2026-07-30" }, now),
      noDate: reviewState({ status: "Active", reviewDate: "" }, now),
      current: reviewState({ status: "Active", reviewDate: "2027-07-16" }, now)
    };
  });

  expect(states).toEqual({
    inactive: "inactive",
    overdue: "overdue",
    dueSoon: "due-soon",
    noDate: "no-date",
    current: "current"
  });
});
