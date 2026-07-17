const { test, expect } = require("@playwright/test");

const APP = "http://127.0.0.1:4173/meeting.html";
const VERIFY = "http://127.0.0.1:4173/verify.html";

test.beforeEach(async ({ page }) => {
  await page.goto(APP);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("v1.6 signing workspace, migration, and record metadata load", async ({ page }) => {
  await expect(page.locator("#cryptoSigningPanelV16")).toBeVisible();

  const state = await page.evaluate(() => ({
    schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
    coreVersion: window.MethodzCryptoPackageV16.version,
    workspaceVersion: window.MethodzCryptographicSigningV16.version,
    metadataVersion: window.MethodzSignatureRecordMetadataV16.version,
    migration: window.MethodzMigrations.registry.some((entry) => entry.version === "1.6.0"),
    recordCollectionPatched: window.__methodzV16CollectionPatched,
    supported: window.MethodzCryptoPackageV16.isSupported()
  }));

  expect(state).toEqual({
    schema: "1.6.0",
    coreVersion: "1.6.0",
    workspaceVersion: "1.6.0",
    metadataVersion: "1.6.0",
    migration: true,
    recordCollectionPatched: true,
    supported: true
  });
});

test("ECDSA package signatures verify and reject content tampering", async ({ page }) => {
  const result = await page.evaluate(async () => {
    const core = window.MethodzCryptoPackageV16;
    const pair = await core.generateKeyPair();
    const privateJwk = await core.exportPrivateJwk(pair.privateKey);
    const publicJwk = await core.exportPublicJwk(pair.publicKey);
    const unsigned = {
      packageType: "methodz-record-export",
      packageVersion: 1,
      manifest: {
        sourceReference: {
          id: "record-v16-test",
          meetingNumber: "016",
          title: "Signed package test"
        }
      },
      record: {
        id: "record-v16-test",
        title: "Signed package test",
        summary: "Approved test content"
      }
    };

    const signed = await core.signPackage(unsigned, privateJwk, {
      publicKeyJwk: publicJwk,
      signerLabel: "Automated Records Test",
      keyLabel: "CI signing key",
      signedAt: "2026-07-17T00:00:00.000Z"
    });
    const verified = await core.verifyPackage(signed);
    const tampered = structuredClone(signed);
    tampered.record.summary = "Altered after signing";
    const rejected = await core.verifyPackage(tampered);

    return {
      signed,
      verified,
      rejected,
      privateMaterialPresent: core.containsPrivateKeyMaterial(signed)
    };
  });

  expect(result.signed.signatureEnvelope.type).toBe("methodz-ecdsa-p256-sha256");
  expect(result.signed.signatureEnvelope.keyId).toMatch(/^p256:/);
  expect(result.verified.valid).toBe(true);
  expect(result.verified.signatureValid).toBe(true);
  expect(result.verified.digestMatches).toBe(true);
  expect(result.rejected.valid).toBe(false);
  expect(result.rejected.digestMatches).toBe(false);
  expect(result.privateMaterialPresent).toBe(false);
  expect(JSON.stringify(result.signed)).not.toContain('"d":');
});

test("private key material is removed from the browser public-key registry", async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem("methodzSigningPublicKeys", JSON.stringify([
      {
        id: "unsafe-test-key",
        keyLabel: "Unsafe test key",
        status: "Active",
        publicKeyJwk: {
          kty: "EC",
          crv: "P-256",
          x: "not-a-real-coordinate",
          y: "not-a-real-coordinate",
          d: "private-material-must-not-remain"
        }
      }
    ]));
  });
  await page.reload();

  const state = await page.evaluate(() => ({
    registry: JSON.parse(localStorage.getItem("methodzSigningPublicKeys") || "[]"),
    audit: JSON.parse(localStorage.getItem("methodzSigningAudit") || "[]")
  }));

  expect(state.registry).toHaveLength(1);
  expect(state.registry[0].publicKeyJwk.d).toBeUndefined();
  expect(state.registry[0].publicKeyJwk.key_ops).toEqual(["verify"]);
  expect(state.audit.some((event) => event.action === "public-key-registry-sanitized")).toBe(true);
  expect(JSON.stringify(state.registry)).not.toContain("private-material-must-not-remain");
});

test("saved records include optional external signature control metadata", async ({ page }) => {
  page.on("dialog", (dialog) => dialog.accept());
  await page.locator("#meetingTitle").fill("V1.6 Signature Metadata Meeting");
  await page.locator("#meetingDate").fill("2026-07-17");
  await page.getByRole("button", { name: "Save Record" }).first().click();

  const record = await page.evaluate(() => JSON.parse(localStorage.getItem("methodzMeetingRecords") || "[]")[0]);
  expect(record.schemaVersion).toBe("1.6.0");
  expect(record.externalSignatureControl).toEqual({
    optional: true,
    lastSignedPackageAt: "",
    lastSigningKeyId: "",
    lastSignatureAlgorithm: "",
    lastVerificationAt: ""
  });
});

test("standalone verifier is deployable and loads the shared crypto core", async ({ page }) => {
  await page.goto(VERIFY);
  await expect(page.getByRole("heading", { name: "Verify a Signed Package" })).toBeVisible();
  await expect(page.locator("#verifyResultV16")).toContainText("No verification has been run.");

  const state = await page.evaluate(() => ({
    core: window.MethodzCryptoPackageV16?.version,
    loader: typeof window.loadStandalonePackageV16,
    verifier: typeof window.verifySelectedPackageV16
  }));
  expect(state).toEqual({ core: "1.6.0", loader: "function", verifier: "function" });
});
