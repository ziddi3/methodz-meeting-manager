const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("v1.1 retention and partner-safe export panels load", async ({ page }) => {
  await expect(page.locator("#recordRetentionPanelV11")).toBeVisible();
  await expect(page.locator("#retentionDashboardV11")).toBeVisible();
  await expect(page.locator("#externalExportPanelV11")).toBeVisible();

  const state = await page.evaluate(() => ({
    schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
    retentionVersion: window.MethodzRetentionV11.version,
    redactionVersion: window.MethodzRedactionV11.version,
    migrationRegistered: window.MethodzMigrations.registry.some((entry) => entry.version === "1.1.0")
  }));

  expect(state).toEqual({
    schema: "1.1.0",
    retentionVersion: "1.1.0",
    redactionVersion: "1.1.0",
    migrationRegistered: true
  });
});

test("saved records preserve retention and legal-hold metadata", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Retention Smoke Test");
  await page.locator("#legalHoldActiveV11").check();
  await page.locator("#legalHoldActorV11").fill("Release Auditor");
  await page.locator("#legalHoldReasonV11").fill("Insurance record preservation request");

  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save Record" }).first().click();

  const record = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzMeetingRecords"))[0]);
  expect(record.schemaVersion).toBe("1.1.0");
  expect(record.retentionMetadata.policyId).toBe("business-review-7y");
  expect(record.retentionMetadata.reviewDate).toBeTruthy();
  expect(record.retentionMetadata.legalHold.active).toBe(true);
  expect(record.retentionMetadata.legalHold.placedBy).toBe("Release Auditor");
  expect(record.retentionMetadata.holdHistory[0].action).toBe("placed");
  expect(record.schemaAudit.valid).toBe(true);
});

test("active legal hold blocks permanent deletion in the Archive Vault", async ({ page }) => {
  await page.locator("#meetingTitle").fill("Legal Hold Archive Test");
  await page.locator("#legalHoldActiveV11").check();
  await page.locator("#legalHoldActorV11").fill("Records Administrator");
  await page.locator("#legalHoldReasonV11").fill("Pending dispute review");

  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save Record" }).first().click();

  page.once("dialog", async (dialog) => dialog.accept());
  await page.getByRole("button", { name: /Archive meeting/i }).click();

  const archivedCard = page.locator("#archiveVaultListV08 .archived-record-v08").filter({ hasText: "Legal Hold Archive Test" });
  await expect(archivedCard).toBeVisible();
  await expect(archivedCard.locator('button[data-action="delete"]')).toBeDisabled();
  await expect(archivedCard).toContainText("Legal Hold");
});

test("partner-safe redaction removes signatures, internal notes, contacts, and file locations", async ({ page }) => {
  const result = await page.evaluate(() => {
    const source = {
      id: "meeting-sensitive-test",
      schemaVersion: "1.1.0",
      meetingNumber: "101",
      title: "Sensitive Partner Meeting",
      date: "2026-07-13",
      status: "Completed",
      location: "Main Office",
      facilitator: "Facilitator Name",
      organizations: ["Canadian Soft Water Corporation", "Method HVAC Inc."],
      organizationDetails: [{ name: "Method HVAC Inc.", contact: "private@example.com", primaryRepresentative: "Representative" }],
      attendees: [{
        name: "Attendee Name",
        organizationRole: "Method HVAC",
        attendanceType: "In Person",
        signature: "SECRET SIGNATURE",
        signedAt: "2026-07-13T12:00:00.000Z",
        signatureConsent: { accepted: true },
        signatureVerification: { status: "Verified", verifiedBy: "Auditor" }
      }],
      agenda: [{ group: "Operations", item: "Review", completed: true }],
      notes: "PRIVATE INTERNAL NOTES",
      decisions: "Approved next step",
      decisionsList: [],
      tasks: [{ task: "Follow up", assignedTo: "Assigned Person", status: "Pending" }],
      attachments: [{ name: "Install photo", type: "Photo", location: "/private/path/photo.jpg", addedBy: "Recorder" }],
      summary: "External-safe summary",
      accessControl: { policyNote: "PRIVATE POLICY NOTE", classification: "Confidential" },
      retentionMetadata: { policyId: "business-review-7y", reviewDate: "2033-07-13", lifecycleStatus: "Active", legalHold: { active: false } }
    };
    const output = window.MethodzRedactionV11.redactRecord(source, "partner-safe");
    return {
      output,
      serialized: JSON.stringify(output.record)
    };
  });

  expect(result.output.manifest.signatureDataIncluded).toBe(false);
  expect(result.output.record.notes).toBeUndefined();
  expect(result.output.record.attendees[0]).toEqual({
    name: "Attendee Name",
    organizationRole: "Method HVAC",
    attendanceType: "In Person"
  });
  expect(result.output.record.attachments[0]).toEqual({ name: "Install photo", type: "Photo", date: "" });
  expect(result.serialized).not.toContain("SECRET SIGNATURE");
  expect(result.serialized).not.toContain("PRIVATE INTERNAL NOTES");
  expect(result.serialized).not.toContain("private@example.com");
  expect(result.serialized).not.toContain("/private/path/photo.jpg");
  expect(result.serialized).not.toContain("PRIVATE POLICY NOTE");
});

test("external package integrity is labeled accurately", async ({ page }) => {
  const integrity = await page.evaluate(async () => window.MethodzRedactionV11.computeIntegrity({
    packageType: "test-package",
    record: { title: "Integrity Test" }
  }));

  expect(["SHA-256", "FNV-1a-32 compatibility checksum"]).toContain(integrity.algorithm);
  expect(integrity.digest.length).toBeGreaterThan(8);
  expect(integrity.note.toLowerCase()).toContain(integrity.algorithm === "SHA-256" ? "not a digital signature" : "non-cryptographic");
});
