import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const core = require("../workspace-package-core.js");

function createPackage(entries, overrides = {}) {
  const body = {
    packageType: core.PACKAGE_TYPE,
    packageVersion: 1,
    appName: "Methodz Meeting Manager",
    schemaVersion: "1.6.0",
    exportedAt: "2026-07-18T20:00:00.000Z",
    entries,
    summary: core.summarizeEntries(entries),
    ...overrides
  };
  return {
    ...body,
    checksum: core.hashText(core.stableStringify(body))
  };
}

const entries = {
  methodzMeetingRecords: JSON.stringify([{ id: "meeting-1", title: "Recovery Test" }]),
  methodzArchivedMeetingRecords: JSON.stringify([]),
  methodzMeetingRevisions: JSON.stringify({ "meeting-1": [] }),
  methodzMeetingDirectory: JSON.stringify([{ id: "person-1", name: "Test Person" }])
};

const validPackage = createPackage(entries);
const validReport = core.inspectWorkspacePackage(validPackage);
assert.equal(validReport.valid, true);
assert.equal(validReport.checksumVerified, true);
assert.equal(validReport.summary.activeRecords, 1);
assert.equal(validReport.privateMaterialPaths.length, 0);

const tamperedPackage = structuredClone(validPackage);
tamperedPackage.entries.methodzMeetingRecords = JSON.stringify([{ id: "meeting-1", title: "Changed" }]);
const tamperedReport = core.inspectWorkspacePackage(tamperedPackage);
assert.equal(tamperedReport.valid, false);
assert.match(tamperedReport.errors.join("\n"), /checksum validation failed/i);

const privateKeyPackage = createPackage({
  methodzSigningAudit: JSON.stringify([{ privateJwk: { kty: "EC", crv: "P-256", x: "x", y: "y", d: "secret" } }])
});
const privateKeyReport = core.inspectWorkspacePackage(privateKeyPackage);
assert.equal(privateKeyReport.valid, false);
assert.match(privateKeyReport.errors.join("\n"), /private cryptographic key material/i);
assert.ok(privateKeyReport.privateMaterialPaths.length >= 1);

const oversizedPackage = createPackage({ methodzMeetingRecords: JSON.stringify([{ notes: "x".repeat(128) }]) });
const oversizedReport = core.inspectWorkspacePackage(oversizedPackage, {
  limits: { maxEntries: 10, maxEntryBytes: 32, maxTotalBytes: 64 }
});
assert.equal(oversizedReport.valid, false);
assert.match(oversizedReport.errors.join("\n"), /per-entry limit|package limit/i);

const plan = core.buildRestorePlan(validPackage, {
  methodzMeetingRecords: entries.methodzMeetingRecords,
  methodzArchivedMeetingRecords: JSON.stringify([{ archiveId: "old" }]),
  methodzLocalOnlySetting: JSON.stringify({ enabled: true })
}, { mode: "replace" });
assert.equal(plan.report.valid, true);
assert.deepEqual(plan.plan.unchanged, ["methodzMeetingRecords"]);
assert.ok(plan.plan.replace.includes("methodzArchivedMeetingRecords"));
assert.ok(plan.plan.add.includes("methodzMeetingDirectory"));
assert.ok(plan.plan.remove.includes("methodzLocalOnlySetting"));

const protectedEntryPackage = createPackage({
  methodzMeetingRecords: entries.methodzMeetingRecords,
  methodzPreRestoreBackup: JSON.stringify({ secret: "should-not-cycle" })
});
const protectedEntryReport = core.inspectWorkspacePackage(protectedEntryPackage);
assert.equal(protectedEntryReport.valid, true);
assert.ok(protectedEntryReport.ignoredKeys.includes("methodzPreRestoreBackup"));
assert.equal("methodzPreRestoreBackup" in protectedEntryReport.recognizedEntries, false);

console.log("Workspace recovery core tests passed");
