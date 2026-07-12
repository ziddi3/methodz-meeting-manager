/* Methodz Meeting Manager v0.9 stable schema migration registry. */
(function initializeMethodzMigrations(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const currentVersion = config.schemaVersion || "0.9.0";
  const storageKeys = config.storageKeys || {};
  const migrationStateKey = storageKeys.migrationState || "methodzMigrationState";
  const registry = [];

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function versionParts(version) {
    return String(version || "0.0.0")
      .replace(/^v/i, "")
      .split(".")
      .map((part) => Number.parseInt(part, 10) || 0)
      .slice(0, 3)
      .concat([0, 0, 0])
      .slice(0, 3);
  }

  function compareVersions(left, right) {
    const a = versionParts(left);
    const b = versionParts(right);
    for (let index = 0; index < 3; index += 1) {
      if (a[index] !== b[index]) return a[index] - b[index];
    }
    return 0;
  }

  function registerMigration(version, description, migrate) {
    if (!version || typeof migrate !== "function") throw new Error("Migration version and function are required.");
    registry.push({ version, description: description || "Schema migration", migrate });
    registry.sort((a, b) => compareVersions(a.version, b.version));
  }

  function ensureArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function ensureObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function baseNormalize(record) {
    const now = new Date().toISOString();
    const source = ensureObject(record);
    return {
      ...source,
      id: source.id || `meeting-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      meetingNumber: source.meetingNumber || "IMP",
      title: source.title || "Imported Meeting",
      status: source.status || "Archived",
      date: source.date || "",
      location: source.location || "",
      facilitator: source.facilitator || "",
      organizations: ensureArray(source.organizations),
      attendees: ensureArray(source.attendees),
      agenda: ensureArray(source.agenda),
      notes: source.notes || "",
      decisions: source.decisions || "",
      tasks: ensureArray(source.tasks),
      summary: source.summary || "",
      createdAt: source.createdAt || source.savedAt || now,
      updatedAt: source.updatedAt || source.savedAt || now,
      savedAt: source.savedAt || source.createdAt || now
    };
  }

  registerMigration("0.3.0", "Add structured decisions and validation metadata", (record) => ({
    ...record,
    decisionsList: ensureArray(record.decisionsList),
    validation: ensureArray(record.validation)
  }));

  registerMigration("0.4.0", "Preserve custom agenda and template-era record fields", (record) => ({
    ...record,
    agenda: ensureArray(record.agenda).map((item) => ({
      group: item?.group || "General",
      item: item?.item || String(item || ""),
      completed: Boolean(item?.completed)
    }))
  }));

  registerMigration("0.5.0", "Add attachment, directory, and signature audit fields", (record) => ({
    ...record,
    attachments: ensureArray(record.attachments),
    attachmentSummary: ensureObject(record.attachmentSummary),
    signatureAudit: ensureObject(record.signatureAudit),
    directorySnapshot: ensureArray(record.directorySnapshot)
  }));

  registerMigration("0.6.0", "Add governance and sync readiness metadata", (record) => ({
    ...record,
    governance: ensureObject(record.governance),
    syncMetadata: ensureObject(record.syncMetadata)
  }));

  registerMigration("0.7.0", "Add organization detail snapshots and adapter metadata", (record) => ({
    ...record,
    organizationDetails: ensureArray(record.organizationDetails),
    adapterMetadata: ensureObject(record.adapterMetadata)
  }));

  registerMigration("0.8.0", "Add history and recovery-compatible record metadata", (record) => ({
    ...record,
    recordMeta: ensureObject(record.recordMeta)
  }));

  registerMigration("0.9.0", "Normalize record collections and stamp migration provenance", (record, context) => {
    const normalized = baseNormalize(record);
    const migratedFrom = context.fromVersion || record.schemaVersion || "0.1.0";
    return {
      ...normalized,
      schemaVersion: currentVersion,
      decisionsList: ensureArray(normalized.decisionsList),
      validation: ensureArray(normalized.validation),
      attachments: ensureArray(normalized.attachments),
      attachmentSummary: ensureObject(normalized.attachmentSummary),
      signatureAudit: ensureObject(normalized.signatureAudit),
      directorySnapshot: ensureArray(normalized.directorySnapshot),
      governance: ensureObject(normalized.governance),
      syncMetadata: ensureObject(normalized.syncMetadata),
      organizationDetails: ensureArray(normalized.organizationDetails),
      adapterMetadata: ensureObject(normalized.adapterMetadata),
      recordMeta: {
        ...ensureObject(normalized.recordMeta),
        migratedFrom,
        migratedTo: currentVersion,
        migratedAt: context.migratedAt
      }
    };
  });

  function migrateRecord(input, options = {}) {
    const original = baseNormalize(input);
    const fromVersion = String(input?.schemaVersion || "0.1.0");
    const migratedAt = options.migratedAt || new Date().toISOString();
    let record = clone(original);
    const applied = [];

    registry.forEach((entry) => {
      if (compareVersions(fromVersion, entry.version) < 0 && compareVersions(entry.version, currentVersion) <= 0) {
        record = entry.migrate(record, { fromVersion, currentVersion, migratedAt, options }) || record;
        applied.push(entry.version);
      }
    });

    record = baseNormalize(record);
    record.schemaVersion = currentVersion;

    if (applied.length && !record.recordMeta?.migratedAt) {
      record.recordMeta = {
        ...ensureObject(record.recordMeta),
        migratedFrom: fromVersion,
        migratedTo: currentVersion,
        migratedAt
      };
    }

    const changed = JSON.stringify(input || {}) !== JSON.stringify(record);
    return { record, changed, fromVersion, toVersion: currentVersion, applied };
  }

  function validateRecord(record) {
    const errors = [];
    const warnings = [];
    if (!record || typeof record !== "object" || Array.isArray(record)) errors.push("Record must be an object.");
    if (!record?.id) errors.push("Record ID is missing.");
    if (!record?.title) warnings.push("Meeting title is missing.");
    if (!record?.date) warnings.push("Meeting date is missing.");
    ["organizations", "attendees", "agenda", "tasks", "decisionsList", "attachments"].forEach((field) => {
      if (!Array.isArray(record?.[field])) errors.push(`${field} must be an array.`);
    });
    if (compareVersions(record?.schemaVersion, currentVersion) !== 0) warnings.push(`Record schema is ${record?.schemaVersion || "unknown"}; expected ${currentVersion}.`);
    return { valid: errors.length === 0, errors, warnings };
  }

  function readJson(key, fallback) {
    if (!key) return fallback;
    try {
      const raw = global.localStorage.getItem(key);
      return raw == null ? fallback : JSON.parse(raw);
    } catch (error) {
      console.warn(`Unable to parse ${key} during migration`, error);
      return fallback;
    }
  }

  function writeJsonIfChanged(key, previousValue, nextValue) {
    if (!key) return false;
    const before = JSON.stringify(previousValue);
    const after = JSON.stringify(nextValue);
    if (before === after) return false;
    global.localStorage.setItem(key, after);
    return true;
  }

  function migrateRecordArray(records, migratedAt) {
    let changedCount = 0;
    const migrated = ensureArray(records).map((record) => {
      const result = migrateRecord(record, { migratedAt });
      if (result.changed) changedCount += 1;
      return result.record;
    });
    return { migrated, changedCount };
  }

  function migrateWorkspace() {
    const migratedAt = new Date().toISOString();
    const summary = {
      currentVersion,
      startedAt: migratedAt,
      completedAt: "",
      activeRecordsChanged: 0,
      archivedRecordsChanged: 0,
      revisionSnapshotsChanged: 0,
      draftChanged: 0,
      writes: 0,
      errors: []
    };

    try {
      const recordsKey = storageKeys.records || "methodzMeetingRecords";
      const records = readJson(recordsKey, []);
      const activeResult = migrateRecordArray(records, migratedAt);
      summary.activeRecordsChanged = activeResult.changedCount;
      if (writeJsonIfChanged(recordsKey, records, activeResult.migrated)) summary.writes += 1;

      const archiveKey = storageKeys.archivedRecords || "methodzArchivedMeetingRecords";
      const archived = readJson(archiveKey, []);
      const migratedArchive = ensureArray(archived).map((entry) => {
        if (!entry?.record) return entry;
        const result = migrateRecord(entry.record, { migratedAt });
        if (result.changed) summary.archivedRecordsChanged += 1;
        return { ...entry, record: result.record };
      });
      if (writeJsonIfChanged(archiveKey, archived, migratedArchive)) summary.writes += 1;

      const revisionsKey = storageKeys.revisions || "methodzMeetingRevisions";
      const revisions = readJson(revisionsKey, {});
      const migratedRevisions = {};
      Object.entries(ensureObject(revisions)).forEach(([recordId, items]) => {
        migratedRevisions[recordId] = ensureArray(items).map((revision) => {
          if (!revision?.snapshot) return revision;
          const result = migrateRecord(revision.snapshot, { migratedAt });
          if (result.changed) summary.revisionSnapshotsChanged += 1;
          return { ...revision, snapshot: result.record };
        });
      });
      if (writeJsonIfChanged(revisionsKey, revisions, migratedRevisions)) summary.writes += 1;

      const draftKey = storageKeys.draft || "methodzMeetingDraft";
      const draft = readJson(draftKey, null);
      if (draft && typeof draft === "object") {
        const result = migrateRecord(draft, { migratedAt });
        const nextDraft = { ...result.record, draftSavedAt: draft.draftSavedAt || migratedAt };
        summary.draftChanged = result.changed ? 1 : 0;
        if (writeJsonIfChanged(draftKey, draft, nextDraft)) summary.writes += 1;
      }
    } catch (error) {
      summary.errors.push(error.message || String(error));
      console.error("Methodz workspace migration failed", error);
    }

    summary.completedAt = new Date().toISOString();
    global.localStorage.setItem(migrationStateKey, JSON.stringify(summary));
    global.dispatchEvent(new CustomEvent("methodz:migrations-complete", { detail: clone(summary) }));
    return summary;
  }

  global.MethodzMigrations = {
    currentVersion,
    registry,
    compareVersions,
    registerMigration,
    migrateRecord,
    migrateWorkspace,
    validateRecord,
    getState() {
      return readJson(migrationStateKey, null);
    }
  };

  global.addEventListener("DOMContentLoaded", migrateWorkspace);
})(window);
