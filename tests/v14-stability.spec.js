const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("recipient policy previews produce stable approval fingerprints", async ({ page }) => {
  await page.evaluate(() => {
    window.MethodzRecipientPolicyV14.writePolicies([{
      id: "stable-policy",
      label: "Stable Recipient",
      recipientName: "Verified Contact",
      organization: "Method HVAC Inc.",
      baseDestinationId: "method-hvac",
      allowedProfiles: ["partner-safe"],
      allowedFields: ["core", "summary"],
      status: "Active",
      reviewDate: "2099-12-31",
      verificationNote: "Recipient and field scope reviewed for testing.",
      createdAt: "2026-07-15T00:00:00.000Z",
      updatedAt: "2026-07-15T00:00:00.000Z"
    }]);
  });

  await page.locator("#recipientPolicySelectV14").selectOption("stable-policy");
  await page.getByRole("button", { name: "Apply to Export" }).click();
  await page.locator("#meetingTitle").fill("Stable Fingerprint Meeting");
  await page.locator("#summary").fill("Stable approved summary.");

  const result = await page.evaluate(async () => {
    const first = await window.previewExternalExportV11();
    const firstFingerprint = await window.MethodzExportApprovalV12.computeContentFingerprint(first, document.getElementById("externalDestinationV12").value);
    await new Promise((resolve) => setTimeout(resolve, 20));
    const second = await window.previewExternalExportV11();
    const secondFingerprint = await window.MethodzExportApprovalV12.computeContentFingerprint(second, document.getElementById("externalDestinationV12").value);
    return {
      firstDigest: firstFingerprint.digest,
      secondDigest: secondFingerprint.digest,
      firstExternalCopy: first.record.externalCopy,
      secondExternalCopy: second.record.externalCopy
    };
  });

  expect(result.firstDigest).toBe(result.secondDigest);
  expect(result.firstExternalCopy.policyAppliedAt).toBeUndefined();
  expect(result.secondExternalCopy.policyAppliedAt).toBeUndefined();
  expect(result.firstExternalCopy.recipientPolicyVersion).toBe("2026-07-15T00:00:00.000Z");
});
