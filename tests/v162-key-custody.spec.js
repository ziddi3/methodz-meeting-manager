const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";

async function seedPublicRegistry(page) {
  return page.evaluate(async () => {
    const cryptoCore = window.MethodzCryptoPackageV16;
    const entries = [];
    for (const [index, label] of ["Predecessor", "Successor"].entries()) {
      const pair = await cryptoCore.generateKeyPair();
      const publicKeyJwk = await cryptoCore.exportPublicJwk(pair.publicKey);
      const id = await cryptoCore.deriveKeyId(publicKeyJwk);
      entries.push({
        id,
        keyLabel: label,
        signerLabel: "Browser custody test",
        status: "Active",
        publicKeyJwk,
        source: "playwright-ephemeral",
        createdAt: `2026-07-20T00:0${index}:00.000Z`,
        updatedAt: `2026-07-20T00:0${index}:00.000Z`,
        revokedAt: ""
      });
    }
    localStorage.setItem("methodzSigningPublicKeys", JSON.stringify(entries));
    return entries.map((entry) => entry.id);
  });
}

test.describe("Key custody v1.6.2:", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(APP);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  test("workspace loads without changing the record schema", async ({ page }) => {
    await expect(page.locator("#keyCustodyPanelV162")).toBeVisible();
    const state = await page.evaluate(() => ({
      schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
      shell: window.METHODZ_MEETING_CONFIG.appShellVersion,
      core: window.MethodzKeyCustodyCoreV162.version,
      workspace: window.MethodzKeyCustodyV162.version,
      hardening: window.MethodzKeyCustodyHardeningV162.version,
      lifecycleBlocked: window.MethodzKeyCustodyHardeningV162.isLegacyLifecycleBlocked(),
      privateStorage: window.METHODZ_MEETING_CONFIG.cryptographicSigning.privateKeyStorage
    }));
    expect(state).toEqual({
      schema: "1.6.0",
      shell: "1.6.2",
      core: "1.6.2",
      workspace: "1.6.2",
      hardening: "1.6.2",
      lifecycleBlocked: true,
      privateStorage: "memory-only"
    });

    const legacyButton = page.locator('#cryptoSigningPanelV16 button[onclick="togglePublicKeyStatusV16()"]');
    await expect(legacyButton).toBeDisabled();
    await expect(legacyButton).toHaveText("Use Custody Rotation / Revocation");
  });

  test("custody metadata records an independent fingerprint check without private material", async ({ page }) => {
    const [predecessor] = await seedPublicRegistry(page);
    await page.reload();

    await page.locator("#custodyKeySelectV162").selectOption(predecessor);
    await page.locator("#custodyCustodianV162").fill("Records administrator");
    await page.locator("#custodyLocationV162").fill("vault-register-browser-test");
    await page.locator("#custodyVerifiedByV162").fill("Independent reviewer");
    await page.locator("#custodyChannelV162").selectOption("In-person comparison");
    await page.getByRole("button", { name: "Mark Fingerprint Verified Now" }).click();

    const result = await page.evaluate((keyId) => ({
      custody: JSON.parse(localStorage.getItem("methodzKeyCustodyMetadata") || "{}")[keyId],
      audit: JSON.parse(localStorage.getItem("methodzKeyCustodyAudit") || "[]"),
      privatePresent: window.MethodzCryptoPackageV16.containsPrivateKeyMaterial(
        JSON.parse(localStorage.getItem("methodzKeyCustodyMetadata") || "{}")
      )
    }), predecessor);

    expect(result.custody.custodian).toBe("Records administrator");
    expect(result.custody.fingerprintVerificationChannel).toBe("In-person comparison");
    expect(Number.isNaN(new Date(result.custody.fingerprintVerifiedAt).getTime())).toBe(false);
    expect(result.audit.some((event) => event.action === "public-key-fingerprint-verified")).toBe(true);
    expect(result.privatePresent).toBe(false);
  });

  test("documented rotation revokes the predecessor and links the successor", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());
    const [predecessor, successor] = await seedPublicRegistry(page);
    await page.reload();

    await page.locator("#rotationPredecessorV162").selectOption(predecessor);
    await page.locator("#rotationSuccessorV162").selectOption(successor);
    await page.locator("#rotationOperatorV162").fill("Controlled rotation operator");
    await page.locator("#rotationWitnessV162").fill("Independent witness");
    await page.locator("#rotationReasonV162").fill("Scheduled browser rotation test");
    await page.locator("#rotationEvidenceV162").fill("playwright-v162-rotation");
    await page.getByRole("button", { name: "Complete Key Rotation" }).click();

    const result = await page.evaluate(({ predecessor, successor }) => {
      const entries = JSON.parse(localStorage.getItem("methodzSigningPublicKeys") || "[]");
      return {
        predecessor: entries.find((entry) => entry.id === predecessor),
        successor: entries.find((entry) => entry.id === successor),
        custodyAudit: JSON.parse(localStorage.getItem("methodzKeyCustodyAudit") || "[]"),
        signingAudit: JSON.parse(localStorage.getItem("methodzSigningAudit") || "[]")
      };
    }, { predecessor, successor });

    expect(result.predecessor.status).toBe("Revoked");
    expect(result.predecessor.replacedByKeyId).toBe(successor);
    expect(result.predecessor.revocationReason).toBe("Scheduled browser rotation test");
    expect(result.successor.status).toBe("Active");
    expect(result.successor.replacesKeyId).toBe(predecessor);
    expect(result.custodyAudit.some((event) => event.action === "public-key-rotation-completed")).toBe(true);
    expect(result.signingAudit.some((event) => event.action === "public-key-rotation-completed")).toBe(true);
  });

  test("public custody manifests verify and reject content or private-key tampering", async ({ page }) => {
    await seedPublicRegistry(page);
    const result = await page.evaluate(async () => {
      const core = window.MethodzKeyCustodyCoreV162;
      const registry = JSON.parse(localStorage.getItem("methodzSigningPublicKeys") || "[]");
      const manifest = await core.createManifest(registry, {}, {
        generatedAt: "2026-07-20T10:00:00.000Z",
        generatedBy: "Browser test role",
        organization: "Methodz test context"
      });
      const verified = await core.verifyManifest(manifest);
      const tampered = structuredClone(manifest);
      tampered.keys[0].keyLabel = "Altered label";
      const tamperedResult = await core.verifyManifest(tampered);
      const privateLeak = structuredClone(manifest);
      privateLeak.keys[0].publicKeyJwk.d = "blocked-private-coordinate";
      const privateResult = await core.verifyManifest(privateLeak);
      return {
        manifest,
        verified,
        tamperedResult,
        privateResult,
        privatePresent: window.MethodzCryptoPackageV16.containsPrivateKeyMaterial(manifest)
      };
    });

    expect(result.manifest.privateKeysIncluded).toBe(false);
    expect(result.privatePresent).toBe(false);
    expect(result.verified.valid).toBe(true);
    expect(result.verified.digestMatches).toBe(true);
    expect(result.tamperedResult.valid).toBe(false);
    expect(result.tamperedResult.digestMatches).toBe(false);
    expect(result.privateResult.valid).toBe(false);
    expect(result.privateResult.errors.some((error) => error.includes("private key material"))).toBe(true);
  });

  test("verified manifest merge preserves revocation and rotation links", async ({ page }) => {
    page.on("dialog", (dialog) => dialog.accept());
    const [predecessor, successor] = await seedPublicRegistry(page);
    const packageText = await page.evaluate(async ({ predecessor, successor }) => {
      const core = window.MethodzKeyCustodyCoreV162;
      const local = JSON.parse(localStorage.getItem("methodzSigningPublicKeys") || "[]");
      const rotation = await core.buildRotationPlan(local, {
        predecessorKeyId: predecessor,
        successorKeyId: successor,
        operator: "Manifest rotation role",
        reason: "Verified manifest merge test",
        occurredAt: "2026-07-20T12:00:00.000Z"
      });
      const manifest = await core.createManifest(rotation.entries, {}, {
        generatedAt: "2026-07-20T12:01:00.000Z",
        generatedBy: "Manifest test role"
      });
      return JSON.stringify(manifest);
    }, { predecessor, successor });

    await page.locator("#custodyManifestFileV162").setInputFiles({
      name: "verified-custody-manifest.json",
      mimeType: "application/json",
      buffer: Buffer.from(packageText)
    });
    await page.getByRole("button", { name: "Verify Manifest" }).click();
    await expect(page.locator("#custodyManifestResultV162")).toContainText("Valid Public Custody Manifest");
    await page.getByRole("button", { name: "Merge Verified Public Keys" }).click();

    const merged = await page.evaluate(({ predecessor, successor }) => {
      const registry = JSON.parse(localStorage.getItem("methodzSigningPublicKeys") || "[]");
      return {
        predecessor: registry.find((entry) => entry.id === predecessor),
        successor: registry.find((entry) => entry.id === successor)
      };
    }, { predecessor, successor });

    expect(merged.predecessor.status).toBe("Revoked");
    expect(merged.predecessor.replacedByKeyId).toBe(successor);
    expect(merged.successor.status).toBe("Active");
    expect(merged.successor.replacesKeyId).toBe(predecessor);
  });
});
