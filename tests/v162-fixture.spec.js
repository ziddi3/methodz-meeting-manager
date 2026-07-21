const fs = require("node:fs");
const path = require("node:path");
const { test, expect } = require("@playwright/test");

const fixturePath = path.resolve(
  process.env.METHODZ_FIXTURE_PATH || ".methodz-ci/fixtures/methodz-v162-disposable-signed-package.json"
);

async function choosePackage(page, packageValue) {
  if (typeof packageValue === "string") {
    await page.locator("#verifyPackageFileV16").setInputFiles(packageValue);
    return;
  }

  await page.locator("#verifyPackageFileV16").setInputFiles({
    name: "methodz-v162-disposable-signed-package.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(packageValue, null, 2))
  });
}

test.describe("Portable signed fixture v1.6.2", () => {
  test("standalone verifier accepts the disposable signed package", async ({ page, browserName }) => {
    await page.goto("/verify.html");
    await choosePackage(page, fixturePath);

    await expect(page.locator("#verifyPackageSummaryV16")).toContainText(
      "Disposable signed verification fixture"
    );

    await page.getByRole("button", { name: "Verify Signature" }).click();

    const result = page.locator("#verifyResultV16");
    await expect(result).toHaveAttribute("data-state", "valid");
    await expect(result).toContainText("Valid Signature");
    await expect(result).toContainText("Disposable CI Fixture");
    await expect(result).toContainText("Non-production ephemeral P-256 key");

    console.log(`Disposable fixture verified in ${browserName}.`);
  });

  test("standalone verifier rejects a payload-tampered copy", async ({ page }) => {
    const fixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
    fixture.record.summary = "Tampered browser fixture content";

    await page.goto("/verify.html");
    await choosePackage(page, fixture);
    await page.getByRole("button", { name: "Verify Signature" }).click();

    const result = page.locator("#verifyResultV16");
    await expect(result).toHaveAttribute("data-state", "invalid");
    await expect(result).toContainText("Invalid Signature");
    await expect(result).toContainText("payload digest does not match");
  });
});
