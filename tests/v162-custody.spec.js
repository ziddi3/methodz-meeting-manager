const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("Custody v1.6.2: workspace loads without changing record schema", async ({ page }) => {
  await expect(page.locator("#keyCustodyPanelV162")).toBeVisible();
  const state = await page.evaluate(() => ({
    schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
    shell: window.METHODZ_MEETING_CONFIG.appShellVersion,
    core: window.MethodzKeyCustodyCoreV162.version,
    workspace: window.MethodzKeyCustodyV162.version
  }));
  expect(state).toEqual({ schema: "1.6.0", shell: "1.6.4", core: "1.6.2", workspace: "1.6.2" });
});

test("Custody v1.6.2: completed rotation produces a private-key-free public manifest", async ({ page }) => {
  const keyIds = await page.evaluate(async () => {
    const core = window.MethodzCryptoPackageV16;
    const entries = [];
    for (const label of ["Retiring test key", "Replacement test key"]) {
      const pair = await core.generateKeyPair();
      const publicKeyJwk = await core.exportPublicJwk(pair.publicKey);
      entries.push({
        id: await core.deriveKeyId(publicKeyJwk),
        keyLabel: label,
        signerLabel: "Browser test operator",
        status: "Active",
        publicKeyJwk,
        source: "playwright",
        createdAt: "2026-07-21T23:00:00.000Z",
        updatedAt: "2026-07-21T23:00:00.000Z",
        revokedAt: ""
      });
    }
    localStorage.setItem("methodzSigningPublicKeys", JSON.stringify(entries));
    return entries.map((entry) => entry.id);
  });

  await page.evaluate(() => window.refreshKeyCustodyWorkspaceV162());
  await page.selectOption("#custodyEventTypeV162", "rotation");
  await page.selectOption("#custodyEventStatusV162", "Completed");
  await page.selectOption("#custodyFromKeyV162", keyIds[0]);
  await page.selectOption("#custodyToKeyV162", keyIds[1]);
  await page.fill("#custodyOperatorV162", "Browser test operator");
  await page.fill("#custodyWitnessV162", "Browser test witness");
  await page.fill("#custodyReasonV162", "Disposable browser rotation ceremony.");
  await page.check("#custodyBackupSeparatedV162");
  await page.check("#custodyFingerprintConfirmedV162");
  await page.check("#custodyRegistryReviewedV162");
  await page.check("#custodyRecoveryEvidenceV162");
  await page.click("button[onclick='recordKeyCustodyEventV162()']");

  await expect(page.locator("#keyCustodyHistoryV162 .custody-event-v162")).toHaveCount(1);
  const result = await page.evaluate(async () => {
    const manifest = await window.MethodzKeyCustodyV162.buildCurrentManifest();
    const verification = await window.MethodzKeyCustodyV162.validateManifest(manifest);
    return {
      manifest,
      verification,
      storedEvents: JSON.parse(localStorage.getItem("methodzSigningCustodyEvents") || "[]")
    };
  });

  expect(result.verification.valid).toBe(true);
  expect(result.manifest.privateKeysIncluded).toBe(false);
  expect(result.manifest.keys).toHaveLength(2);
  expect(result.manifest.events).toHaveLength(1);
  expect(result.storedEvents).toHaveLength(1);
  expect(JSON.stringify(result.manifest)).not.toContain('"d"');
});

test("Custody v1.6.2: completed events fail closed when checklist evidence is incomplete", async ({ page }) => {
  const keyId = await page.evaluate(async () => {
    const core = window.MethodzCryptoPackageV16;
    const pair = await core.generateKeyPair();
    const publicKeyJwk = await core.exportPublicJwk(pair.publicKey);
    const id = await core.deriveKeyId(publicKeyJwk);
    localStorage.setItem("methodzSigningPublicKeys", JSON.stringify([{ id, keyLabel: "Test key", status: "Active", publicKeyJwk }]));
    return id;
  });
  await page.evaluate(() => window.refreshKeyCustodyWorkspaceV162());
  await page.selectOption("#custodyEventTypeV162", "revocation");
  await page.selectOption("#custodyEventStatusV162", "Completed");
  await page.selectOption("#custodyFromKeyV162", keyId);
  await page.fill("#custodyOperatorV162", "Operator");
  await page.fill("#custodyWitnessV162", "Witness");
  await page.fill("#custodyReasonV162", "Checklist should block this event.");
  page.once("dialog", (dialog) => dialog.accept());
  await page.click("button[onclick='recordKeyCustodyEventV162()']");
  await expect(page.locator("#keyCustodyStatusV162")).toContainText("checklist");
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzSigningCustodyEvents") || "[]"));
  expect(stored).toHaveLength(0);
});
