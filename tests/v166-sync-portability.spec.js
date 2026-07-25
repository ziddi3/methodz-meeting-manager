const { test, expect } = require("@playwright/test");

async function resetWorkspace(page) {
  await page.goto("/meeting.html");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForSelector("#syncPortabilityPanelV166");
  await page.evaluate(() => document.querySelectorAll("details").forEach((details) => { details.open = true; }));
}

test.describe("Synchronization portability v1.6.6", () => {
  test.beforeEach(async ({ page }) => {
    await resetWorkspace(page);
  });

  test("queue import requires preview and approval and never auto-processes", async ({ page }) => {
    const payload = await page.evaluate(() => {
      const tenantId = window.MethodzSyncRehearsalWorkspaceV165.getCoordinator().tenantId;
      const entry = {
        id: "queue-import-browser",
        version: "1.0.0",
        tenantId,
        operation: "push",
        recordId: "meeting-import-browser",
        recordRef: `record:${window.MethodzHostedProviderContract.fnv1a32("meeting-import-browser")}`,
        sourceConflictToken: null,
        idempotencyKey: "idempotency-import-browser",
        contentFingerprint: "sync:browser-import",
        baseFingerprint: null,
        sourceSnapshot: {
          id: "meeting-import-browser",
          title: "Portable Queue Browser Test",
          date: "2026-07-25",
          status: "Completed"
        },
        baseSnapshot: null,
        remoteSnapshot: null,
        state: "pending",
        attempts: 0,
        createdAt: "2026-07-25T12:00:00.000Z",
        updatedAt: "2026-07-25T12:00:00.000Z",
        lastError: null,
        resolution: null
      };
      return window.MethodzSyncQueuePortabilityV166.buildQueuePackage({ tenantId, entries: [entry], generatedAt: "2026-07-25T12:01:00.000Z" });
    });

    await page.locator("#syncQueueImportFileV166").setInputFiles({
      name: "methodz-sync-queue.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(payload))
    });

    await expect(page.locator("#syncQueueImportPreviewV166")).toContainText("Verified Queue Import Preview");
    expect(await page.evaluate(() => window.MethodzSyncRehearsalWorkspaceV165.getCoordinator().listQueue().length)).toBe(0);

    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Approve and Apply Import" }).click();
    await expect(page.locator("#syncPortabilityStatusV166")).toContainText("remain unprocessed");

    const result = await page.evaluate(async () => {
      const workspace = window.MethodzSyncRehearsalWorkspaceV165;
      const coordinator = workspace.getCoordinator();
      return {
        queue: coordinator.listQueue().map((entry) => ({ id: entry.id, state: entry.state, attempts: entry.attempts })),
        remote: await workspace.getRemoteProvider().getRecord("meeting-import-browser", { includeArchived: true })
      };
    });
    expect(result.queue).toEqual([{ id: "queue-import-browser", state: "pending", attempts: 0 }]);
    expect(result.remote).toBeNull();
  });

  test("tenant queues remain isolated and recover after reload", async ({ page }) => {
    await page.evaluate(() => {
      const config = window.METHODZ_MEETING_CONFIG;
      const record = { id: "tenant-reload-record", title: "Tenant Reload", date: "2026-07-25", status: "Completed" };
      localStorage.setItem(config.storageKeys.records, JSON.stringify([record]));
      window.MethodzSyncRehearsalWorkspaceV165.getCoordinator().enqueuePush(record, {
        entryId: "tenant-reload-entry",
        idempotencyKey: "tenant-reload-idempotency"
      });
    });
    expect(await page.evaluate(() => window.MethodzSyncRehearsalWorkspaceV165.getCoordinator().listQueue().length)).toBe(1);

    await page.locator("#syncTenantV165").fill("second-rehearsal-tenant");
    await page.getByRole("button", { name: "Apply Tenant" }).click();
    await expect(page.locator("#syncRehearsalStatusV165")).toContainText(/tenant applied/i);
    expect(await page.evaluate(() => window.MethodzSyncRehearsalWorkspaceV165.getCoordinator().listQueue().length)).toBe(0);

    await page.locator("#syncTenantV165").fill("methodz-rehearsal");
    await page.getByRole("button", { name: "Apply Tenant" }).click();
    await expect.poll(() => page.evaluate(() => window.MethodzSyncRehearsalWorkspaceV165.getCoordinator().listQueue().some((entry) => entry.id === "tenant-reload-entry"))).toBe(true);

    await page.reload();
    await page.waitForSelector("#syncPortabilityPanelV166");
    expect(await page.evaluate(() => window.MethodzSyncRehearsalWorkspaceV165.getCoordinator().listQueue().some((entry) => entry.id === "tenant-reload-entry"))).toBe(true);
  });

  test("operator event instrumentation survives remote reset and classifies failures", async ({ page }) => {
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Reset Disposable Remote" }).click();
    await expect(page.locator("#syncRehearsalStatusV165")).toContainText(/remote state reset/i);

    const events = await page.evaluate(async () => {
      const config = window.METHODZ_MEETING_CONFIG;
      const workspace = window.MethodzSyncRehearsalWorkspaceV165;
      const coordinator = workspace.getCoordinator();
      const record = { id: "post-reset-record", title: "Post Reset", date: "2026-07-25", status: "Completed" };
      coordinator.enqueuePush(record, { entryId: "post-reset-entry", idempotencyKey: "post-reset-idempotency" });
      try {
        await coordinator.enqueuePull("missing-remote-record", { entryId: "missing-pull-entry", idempotencyKey: "missing-pull-idempotency" });
      } catch (error) {
        // The failure is expected; the event classification is asserted below.
      }
      const base = config.storageKeys.syncRehearsalOperatorEvents;
      const key = Object.keys(localStorage).find((name) => name.startsWith(`${base}:`));
      return JSON.parse(localStorage.getItem(key) || "[]");
    });

    expect(events.some((event) => event.eventType === "enqueue" && event.result === "queued" && event.operation === "push")).toBe(true);
    expect(events.some((event) => event.eventType === "enqueue" && event.result === "error" && event.operation === "pull")).toBe(true);
    expect(events.some((event) => event.eventType === "process" && event.result === "error")).toBe(false);
  });

  test("response-loss retry preserves returned conflict metadata", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const config = window.METHODZ_MEETING_CONFIG;
      const record = { id: "response-loss-record", title: "Response Loss", date: "2026-07-25", status: "Completed" };
      localStorage.setItem(config.storageKeys.records, JSON.stringify([record]));
      const workspace = window.MethodzSyncRehearsalWorkspaceV165;
      const coordinator = workspace.getCoordinator();
      coordinator.enqueuePush(record, { entryId: "response-loss-entry", idempotencyKey: "response-loss-idempotency" });
      workspace.getSimulator().queueFault("upsertRecord", { kind: "dropResponse", phase: "after" });
      const first = await coordinator.process("response-loss-entry");
      coordinator.retry("response-loss-entry");
      const second = await coordinator.process("response-loss-entry");
      const local = JSON.parse(localStorage.getItem(config.storageKeys.records) || "[]").find((item) => item.id === record.id);
      return {
        firstState: first.state,
        firstRetryable: first.lastError?.retryable,
        secondState: second.state,
        idempotentReplay: second.idempotentReplay,
        remoteConflictToken: second.remoteConflictToken,
        localConflictToken: local?.providerMetadata?.conflictToken || null
      };
    });

    expect(result.firstState).toBe("retryable-error");
    expect(result.firstRetryable).toBe(true);
    expect(result.secondState).toBe("completed");
    expect(result.idempotentReplay).toBe(true);
    expect(typeof result.remoteConflictToken).toBe("string");
    expect(result.localConflictToken).toBe(result.remoteConflictToken);
  });

  test("archived remote pulls retain the Archive Vault envelope", async ({ page }) => {
    const result = await page.evaluate(async () => {
      const config = window.METHODZ_MEETING_CONFIG;
      const workspace = window.MethodzSyncRehearsalWorkspaceV165;
      const coordinator = workspace.getCoordinator();
      const remote = workspace.getRemoteProvider();
      const record = { id: "archived-pull-record", title: "Archived Pull", date: "2026-07-25", status: "Completed" };
      const seeded = await remote.upsertRecord(record, { idempotencyKey: "archived-pull-seed" });
      await remote.archiveRecord(record.id, { expectedConflictToken: seeded.conflictToken });
      const preview = await coordinator.previewPull();
      const queued = await coordinator.enqueuePull(record.id, { entryId: "archived-pull-entry", idempotencyKey: "archived-pull-idempotency" });
      const completed = await coordinator.process(queued.id);
      const archived = JSON.parse(localStorage.getItem(config.storageKeys.archivedRecords) || "[]");
      return {
        previewArchived: preview.archived,
        completedState: completed.state,
        envelope: archived.find((entry) => entry.record?.id === record.id) || null
      };
    });

    expect(result.previewArchived).toBeGreaterThanOrEqual(1);
    expect(result.completedState).toBe("completed");
    expect(result.envelope).not.toBeNull();
    expect(result.envelope.originalRecordId).toBe("archived-pull-record");
    expect(typeof result.envelope.archivedAt).toBe("string");
  });
});
