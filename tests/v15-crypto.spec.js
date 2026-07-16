const { test, expect } = require("@playwright/test");

const baseUrl = "http://127.0.0.1:4173";

test("v1.5 cryptographic core signs, verifies, and detects tampering", async ({ page }) => {
  await page.goto(`${baseUrl}/meeting.html`);
  await expect(page.locator("#cryptoSigningPanelV15")).toBeVisible();

  const result = await page.evaluate(async () => {
    const core = window.MethodzCryptoPackageV15;
    const pair = await core.generateKeyPair();
    const privateJwk = await core.exportPrivateJwk(pair.privateKey);
    const signed = await core.signPackage({
      packageType: "methodz-approved-external-meeting-copy",
      record: { title: "CI Test Meeting", summary: "Stable content" },
      manifest: { sourceReference: { id: "ci-record", title: "CI Test Meeting" } }
    }, privateJwk, { signerLabel: "CI Signer", keyLabel: "CI Key" });

    const verified = await core.verifyPackage(signed);
    const publicContainsPrivateMaterial = Boolean(signed.signatureEnvelope.publicKeyJwk.d);
    signed.record.summary = "Tampered content";
    const tampered = await core.verifyPackage(signed);

    return {
      supported: core.isSupported(),
      verified,
      tampered,
      publicContainsPrivateMaterial,
      signatureType: signed.signatureEnvelope.type
    };
  });

  expect(result.supported).toBe(true);
  expect(result.verified.valid).toBe(true);
  expect(result.verified.signatureValid).toBe(true);
  expect(result.verified.digestMatches).toBe(true);
  expect(result.verified.keyIdMatches).toBe(true);
  expect(result.tampered.valid).toBe(false);
  expect(result.publicContainsPrivateMaterial).toBe(false);
  expect(result.signatureType).toBe("methodz-ecdsa-p256-sha256");
});

test("standalone verifier loads without the meeting workspace", async ({ page }) => {
  await page.goto(`${baseUrl}/verify.html`);
  await expect(page.getByRole("heading", { name: "Signed Package Verifier" })).toBeVisible();
  await expect(page.locator("#verifyPackageFileV15")).toBeAttached();
  expect(await page.evaluate(() => Boolean(window.MethodzCryptoPackageV15?.isSupported()))).toBe(true);
});
