const { test, expect } = require("@playwright/test");

const baseUrl = "http://127.0.0.1:4173";

test("v1.6 cryptographic core signs, verifies, and detects package or metadata tampering", async ({ page }) => {
  await page.goto(`${baseUrl}/meeting.html`);
  await expect(page.locator("#cryptoSigningPanelV15")).toBeVisible();
  await expect(page.locator("#cryptoSigningPanelV15 .release-badge-v15")).toHaveText("v1.6");

  const result = await page.evaluate(async () => {
    const core = window.MethodzCryptoPackageV16;
    const pair = await core.generateKeyPair();
    const privateJwk = await core.exportPrivateJwk(pair.privateKey);
    const normalizedPublic = core.normalizePublicJwk(privateJwk);

    let privatePackageBlocked = false;
    try {
      await core.signPackage({
        packageType: "methodz-private-signing-key-backup",
        privateKeyJwk
      }, privateJwk, { signerLabel: "CI Signer", keyLabel: "CI Key" });
    } catch (error) {
      privatePackageBlocked = /private key material/i.test(error.message);
    }

    const signed = await core.signPackage({
      packageType: "methodz-approved-external-meeting-copy",
      record: { title: "CI Test Meeting", summary: "Stable content" },
      manifest: { sourceReference: { id: "ci-record", title: "CI Test Meeting" } }
    }, privateJwk, { signerLabel: "CI Signer", keyLabel: "CI Key" });

    const verified = await core.verifyPackage(signed);
    const publicContainsPrivateMaterial = Boolean(signed.signatureEnvelope.publicKeyJwk.d);

    const packageTampered = JSON.parse(JSON.stringify(signed));
    packageTampered.record.summary = "Tampered content";
    const tamperedPackageResult = await core.verifyPackage(packageTampered);

    const metadataTampered = JSON.parse(JSON.stringify(signed));
    metadataTampered.signatureEnvelope.signerLabel = "Altered Signer";
    const tamperedMetadataResult = await core.verifyPackage(metadataTampered);

    return {
      schema: window.METHODZ_MEETING_CONFIG.schemaVersion,
      releaseVersion: core.releaseVersion,
      supported: core.isSupported(),
      verified,
      tamperedPackageResult,
      tamperedMetadataResult,
      publicContainsPrivateMaterial,
      normalizedPublicContainsPrivateMaterial: Boolean(normalizedPublic.d),
      privatePackageBlocked,
      signatureType: signed.signatureEnvelope.type
    };
  });

  expect(result.schema).toBe("1.6.0");
  expect(result.releaseVersion).toBe("1.6.0");
  expect(result.supported).toBe(true);
  expect(result.verified.valid).toBe(true);
  expect(result.verified.signatureValid).toBe(true);
  expect(result.verified.digestMatches).toBe(true);
  expect(result.verified.keyIdMatches).toBe(true);
  expect(result.tamperedPackageResult.valid).toBe(false);
  expect(result.tamperedPackageResult.digestMatches).toBe(false);
  expect(result.tamperedMetadataResult.valid).toBe(false);
  expect(result.tamperedMetadataResult.digestMatches).toBe(true);
  expect(result.tamperedMetadataResult.signatureValid).toBe(false);
  expect(result.publicContainsPrivateMaterial).toBe(false);
  expect(result.normalizedPublicContainsPrivateMaterial).toBe(false);
  expect(result.privatePackageBlocked).toBe(true);
  expect(result.signatureType).toBe("methodz-ecdsa-p256-sha256");
});

test("public-key registry sanitizes private JWK imports", async ({ page }) => {
  await page.goto(`${baseUrl}/meeting.html`);

  const result = await page.evaluate(async () => {
    const core = window.MethodzCryptoPackageV16;
    const pair = await core.generateKeyPair();
    const privateJwk = await core.exportPrivateJwk(pair.privateKey);
    const entry = await window.MethodzCryptographicSigningV16.registerPublicKey(privateJwk, {
      signerLabel: "Registry Test",
      keyLabel: "Sanitized Registry Key",
      source: "test"
    });
    const stored = JSON.parse(localStorage.getItem("methodzSigningPublicKeys") || "[]");
    const exported = window.MethodzKeySafetyV16.readSafeRegistry();
    return {
      entryContainsPrivate: Boolean(entry.publicKeyJwk.d),
      storedContainsPrivate: stored.some((item) => Boolean(item.publicKeyJwk?.d)),
      exportedContainsPrivate: exported.some((item) => Boolean(item.publicKeyJwk?.d)),
      safetyPatched: window.__methodzV15KeySafetyPatched
    };
  });

  expect(result.safetyPatched).toBe(true);
  expect(result.entryContainsPrivate).toBe(false);
  expect(result.storedContainsPrivate).toBe(false);
  expect(result.exportedContainsPrivate).toBe(false);
});

test("standalone verifier loads without the meeting workspace", async ({ page }) => {
  await page.goto(`${baseUrl}/verify.html`);
  await expect(page.getByRole("heading", { name: "Signed Package Verifier" })).toBeVisible();
  await expect(page.locator("#verifyPackageFileV15")).toBeAttached();
  expect(await page.evaluate(() => Boolean(window.MethodzCryptoPackageV15?.isSupported()))).toBe(true);
});
