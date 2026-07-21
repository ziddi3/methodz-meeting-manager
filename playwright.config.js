const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  retries: 1,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    browserName: process.env.METHODZ_BROWSER || "chromium",
    headless: true,
    trace: "retain-on-failure"
  }
});
