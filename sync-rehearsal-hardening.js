/* Methodz Meeting Manager v1.6.5 synchronization rehearsal hardening layer. */
(function hardenMethodzSyncRehearsal(root, factory) {
  const sync = root?.MethodzSyncRehearsalV165 || (typeof require === "function" ? require("./sync-rehearsal-core.js") : null);
  const api = factory(sync);
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function applySyncRehearsalHardening(Sync) {
  "use strict";

  if (!Sync?.SyncRehearsalCoordinator) throw new Error("The synchronization rehearsal core is required.");
  const prototype = Sync.SyncRehearsalCoordinator.prototype;
  if (prototype.__methodzV165Hardened) return Sync;

  const originalEnqueuePush = prototype.enqueuePush;
  prototype.enqueuePush = function enqueuePushWithBaseline(record, options = {}) {
    const entry = originalEnqueuePush.call(this, record, options);
    if (!entry.baseSnapshot) {
      entry.baseSnapshot = this.remoteProvider?.contractVersion && options.baseRecord
        ? options.baseRecord
        : Sync ? JSON.parse(JSON.stringify(entry.sourceSnapshot)) : entry.sourceSnapshot;
      entry.baseFingerprint = Sync.fingerprint(entry.baseSnapshot);
      return this.replaceEntry(entry);
    }
    return entry;
  };

  const originalProcessPush = prototype.processPush;
  prototype.processPush = async function processPushWithLocalMetadata(entry) {
    const result = await originalProcessPush.call(this, entry);
    if (result?.state === Sync.queueStates.COMPLETED && result.remoteSnapshot) {
      await this.localRepository.upsertRecord(JSON.parse(JSON.stringify(result.remoteSnapshot)), {
        source: "sync-rehearsal-confirmation",
        archived: Boolean(result.remoteSnapshot.providerMetadata?.archivedAt)
      });
    }
    return result;
  };

  Object.defineProperty(prototype, "__methodzV165Hardened", { value: true });
  return Sync;
});
