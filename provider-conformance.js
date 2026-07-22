/* Methodz Meeting Manager v1.6.3 reusable hosted-provider conformance suite. */
(function initializeMethodzProviderConformance(root, factory) {
  const contract = root?.MethodzHostedProviderContract || (typeof require === "function" ? require("./provider-contract.js") : null);
  const api = factory(contract);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.MethodzHostedProviderConformance = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createConformanceSuite(Contract) {
  "use strict";

  if (!Contract) throw new Error("MethodzHostedProviderContract is required.");

  function ensure(condition, message) {
    if (!condition) throw new Error(message);
  }

  async function expectProviderError(callback, code, retryable) {
    try {
      await callback();
    } catch (error) {
      ensure(error instanceof Contract.ProviderError, `Expected ProviderError, received ${error?.constructor?.name || typeof error}.`);
      ensure(error.code === code, `Expected error code ${code}, received ${error.code}.`);
      if (typeof retryable === "boolean") ensure(error.retryable === retryable, `Expected retryable=${retryable}.`);
      return error;
    }
    throw new Error(`Expected operation to fail with ${code}.`);
  }

  async function runProviderConformance(providerFactory, options = {}) {
    const provider = await providerFactory();
    const prefix = options.recordPrefix || `conformance-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const recordId = `${prefix}-record`;
    const checks = [];
    const check = async (name, callback) => {
      await callback();
      checks.push({ name, ok: true });
    };

    await check("contract shape", async () => {
      const validation = Contract.validateProvider(provider);
      ensure(validation.ok, `Provider is missing: ${validation.missing.join(", ")}`);
      ensure(provider.contractVersion === Contract.version, "Provider contract version does not match the portable core.");
    });

    await check("health check", async () => {
      const health = await provider.healthCheck();
      ensure(health.ok === true, "Provider health check did not report ok.");
      ensure(health.providerId === provider.id, "Health check provider id mismatch.");
      ensure(health.contractVersion === Contract.version, "Health check contract version mismatch.");
    });

    await check("empty list and missing record behavior", async () => {
      const records = await provider.listRecords();
      ensure(Array.isArray(records), "listRecords must return an array.");
      ensure(records.length === 0, "Disposable provider must begin empty.");
      ensure(await provider.getRecord(`${prefix}-missing`) === null, "Missing records must return null.");
      await expectProviderError(
        () => provider.archiveRecord(`${prefix}-missing`),
        Contract.errorCodes.NOT_FOUND,
        false
      );
    });

    let firstWrite;
    await check("idempotent create and unknown-field preservation", async () => {
      const input = {
        id: recordId,
        title: "Hosted provider conformance record",
        schemaVersion: "1.6.0",
        attachments: [{ id: "ref-1", name: "Reference only", location: "https://example.invalid/reference" }],
        extensionData: { futureField: "preserve-me", nested: { enabled: true } },
        integrity: { sourceChecksum: "synthetic-checksum" },
        recoveryMetadata: { packageChecksum: "synthetic-recovery-checksum" }
      };
      firstWrite = await provider.upsertRecord(input, { idempotencyKey: `${prefix}-create` });
      ensure(firstWrite.created === true, "Initial write must report created=true.");
      ensure(firstWrite.record.extensionData.futureField === "preserve-me", "Unknown fields were not preserved.");
      ensure(firstWrite.record.attachments[0].location.includes("https://"), "Attachment reference was not preserved.");
      ensure(typeof firstWrite.conflictToken === "string", "Write must return a conflict token.");

      const replay = await provider.upsertRecord(input, { idempotencyKey: `${prefix}-create` });
      ensure(replay.idempotentReplay === true, "Repeated idempotency key must replay the original result.");
      ensure(replay.conflictToken === firstWrite.conflictToken, "Idempotent replay changed the conflict token.");
    });

    await check("returned values are isolated from provider state", async () => {
      const listed = await provider.listRecords();
      listed[0].title = "Caller-side mutation";
      listed[0].extensionData.nested.enabled = false;
      const loaded = await provider.getRecord(recordId);
      ensure(loaded.record.title === "Hosted provider conformance record", "Caller mutated the stored title through a returned value.");
      ensure(loaded.record.extensionData.nested.enabled === true, "Caller mutated nested provider state through a returned value.");
    });

    await check("idempotency-key conflict", async () => {
      await expectProviderError(
        () => provider.upsertRecord({ id: recordId, title: "Different input" }, { idempotencyKey: `${prefix}-create` }),
        Contract.errorCodes.IDEMPOTENCY_CONFLICT,
        false
      );
    });

    await check("duplicate id conflict and deterministic update", async () => {
      await expectProviderError(
        () => provider.upsertRecord({ id: recordId, title: "Missing expected token" }),
        Contract.errorCodes.CONFLICT,
        false
      );

      const updated = await provider.upsertRecord(
        { id: recordId, title: "Updated title", newUnknownField: ["still", "preserved"] },
        { expectedConflictToken: firstWrite.conflictToken, idempotencyKey: `${prefix}-update` }
      );
      ensure(updated.created === false, "Update must report created=false.");
      ensure(updated.providerVersion === 2, "Update must advance provider version.");
      ensure(updated.record.extensionData.futureField === "preserve-me", "Update discarded an unknown existing field.");
      ensure(updated.record.newUnknownField.length === 2, "Update discarded an unknown new field.");
      ensure(updated.record.recoveryMetadata.packageChecksum === "synthetic-recovery-checksum", "Update discarded recovery metadata.");
      firstWrite = updated;
    });

    await check("revision preservation", async () => {
      const result = await provider.getRecord(recordId);
      ensure(result && result.revisions.length === 1, "Updating a record must preserve one prior revision.");
      ensure(result.revisions[0].title === "Hosted provider conformance record", "Revision content is incorrect.");
      ensure(result.revisions[0].extensionData.futureField === "preserve-me", "Revision discarded unknown fields.");
    });

    await check("unsafe provider payload rejection", async () => {
      await expectProviderError(
        () => provider.upsertRecord({ id: `${prefix}-private-write`, signingKey: { kty: "EC", crv: "P-256", x: "x", y: "y", d: "private" } }),
        Contract.errorCodes.PRIVATE_KEY_REJECTED,
        false
      );
      await expectProviderError(
        () => provider.upsertRecord({ id: `${prefix}-binary-write`, attachments: [{ contentBase64: "c3ludGhldGlj" }] }),
        Contract.errorCodes.BINARY_PAYLOAD_REJECTED,
        false
      );
      await expectProviderError(
        () => provider.upsertRecord({ id: `${prefix}-credential-write`, integration: { accessToken: "synthetic-token" } }),
        Contract.errorCodes.CREDENTIAL_REJECTED,
        false
      );
    });

    await check("archive and archived-update conflict", async () => {
      const archived = await provider.archiveRecord(recordId, { expectedConflictToken: firstWrite.conflictToken });
      ensure(archived.archived === true, "archiveRecord did not report archived=true.");
      ensure((await provider.listRecords()).length === 0, "Archived record remained in active list.");
      ensure((await provider.listRecords({ includeArchived: true })).length === 1, "Archived record was not returned when requested.");
      const loaded = await provider.getRecord(recordId);
      ensure(loaded.archived === true, "getRecord did not mark the archived record.");
      ensure(loaded.revisions.length === 1, "Archive operation discarded revision history.");
      await expectProviderError(
        () => provider.upsertRecord({ id: recordId, title: "Cannot update archived" }),
        Contract.errorCodes.CONFLICT,
        false
      );
    });

    await check("restore", async () => {
      const restored = await provider.restoreRecord(recordId);
      ensure(restored.restored === true, "restoreRecord did not report restored=true.");
      ensure(typeof restored.conflictToken === "string", "Restore did not return a conflict token.");
      ensure((await provider.listRecords()).length === 1, "Restored record did not return to active list.");
    });

    await check("retryable partial failure metadata", async () => {
      ensure(typeof provider.queueFailure === "function", "Reference provider must expose queueFailure for disposable fault tests.");
      provider.queueFailure("listRecords", new Contract.ProviderError("Synthetic partial failure", {
        code: Contract.errorCodes.PARTIAL_FAILURE,
        retryable: true,
        operation: "listRecords",
        providerId: provider.id,
        details: { completed: 1, failed: 1 }
      }));
      const error = await expectProviderError(() => provider.listRecords(), Contract.errorCodes.PARTIAL_FAILURE, true);
      ensure(error.details.completed === 1 && error.details.failed === 1, "Partial-failure details were not preserved.");
      ensure((await provider.listRecords()).length === 1, "Provider did not recover after disposable failure.");
    });

    await check("duplicate state rejection", async () => {
      const duplicated = {
        activeRecords: [{ id: `${prefix}-duplicate`, title: "active" }],
        archivedRecords: [{ id: `${prefix}-duplicate`, title: "archived" }],
        revisions: {},
        idempotency: {}
      };
      await expectProviderError(async () => {
        const duplicateProvider = await providerFactory({ initialState: duplicated, suffix: "duplicate" });
        await duplicateProvider.listRecords({ includeArchived: true });
      }, Contract.errorCodes.INTEGRITY_REJECTED, false);
    });

    await check("export integrity and metadata preservation", async () => {
      const exported = await provider.exportWorkspace({ metadata: { recoveryPackage: { checksum: "preserve-this" } } });
      ensure(exported.activeRecords.length === 1, "Export omitted the active record.");
      ensure(exported.revisions[recordId].length === 1, "Export omitted revision history.");
      ensure(exported.metadata.recoveryPackage.checksum === "preserve-this", "Export discarded integrity metadata.");
      const verification = Contract.verifyExportEnvelope(exported);
      ensure(verification.ok, `Provider export failed integrity verification: ${verification.reason || verification.actual}`);

      const tampered = Contract.clone(exported);
      tampered.activeRecords[0].title = "tampered";
      ensure(Contract.verifyExportEnvelope(tampered).ok === false, "Tampered provider export verified successfully.");
    });

    await check("unsafe export rejection", async () => {
      for (const [suffix, record, code] of [
        ["private", { id: `${prefix}-private`, signingKey: { kty: "EC", crv: "P-256", x: "x", y: "y", d: "synthetic-private-material" } }, Contract.errorCodes.PRIVATE_KEY_REJECTED],
        ["binary", { id: `${prefix}-binary`, attachment: { location: "data:application/pdf;base64,c3ludGhldGlj" } }, Contract.errorCodes.BINARY_PAYLOAD_REJECTED],
        ["credential", { id: `${prefix}-credential`, provider: { apiKey: "synthetic-api-key" } }, Contract.errorCodes.CREDENTIAL_REJECTED]
      ]) {
        const unsafeProvider = await providerFactory({
          initialState: {
            activeRecords: [record],
            archivedRecords: [],
            revisions: {},
            idempotency: {}
          },
          suffix
        });
        await expectProviderError(() => unsafeProvider.exportWorkspace(), code, false);
      }
    });

    await check("permanent-delete guard and cleanup", async () => {
      await expectProviderError(
        () => provider.deleteRecord(recordId),
        Contract.errorCodes.INVALID_ARGUMENT,
        false
      );
      const deleted = await provider.deleteRecord(recordId, { permanent: true });
      ensure(deleted.deleted === true, "Permanent delete did not report deletion.");
      ensure(await provider.getRecord(recordId) === null, "Deleted record remained retrievable.");
    });

    return {
      ok: true,
      providerId: provider.id,
      contractVersion: Contract.version,
      checks,
      completedAt: new Date().toISOString()
    };
  }

  return Object.freeze({ runProviderConformance, expectProviderError });
});