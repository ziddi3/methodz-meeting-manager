/* Methodz Meeting Manager v0.8 revision history and non-destructive archive workflow. */
(function initializeHistoryModule(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const revisionsKey = config.storageKeys?.revisions || "methodzMeetingRevisions";
  const archivedRecordsKey = config.storageKeys?.archivedRecords || "methodzArchivedMeetingRecords";
  const revisionLimit = Number(config.revisionLimit || 50);
  let activeHistoryRecordId = "";

  global.addEventListener("DOMContentLoaded", initializeV08History);

  function initializeV08History() {
    installArchiveVaultV08();
    installRevisionHistoryPanelV08();
    patchSaveWorkflowV08();
    patchDeleteWorkflowV08();
    patchSavedRecordCardsV08();
    renderArchiveVaultV08();
  }

  function readJson(key, fallback) {
    try {
      const value = JSON.parse(global.localStorage.getItem(key));
      return value ?? fallback;
    } catch (error) {
      console.warn(`Unable to read ${key}`, error);
      return fallback;
    }
  }

  function writeJson(key, value) {
    global.localStorage.setItem(key, JSON.stringify(value));
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function getRevisionMapV08() {
    const value = readJson(revisionsKey, {});
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  }

  function getRecordRevisionsV08(recordId) {
    return getRevisionMapV08()[recordId] || [];
  }

  function appendRevisionV08(record, reason = "Saved record") {
    if (!record?.id) return null;

    const map = getRevisionMapV08();
    const revisions = Array.isArray(map[record.id]) ? map[record.id] : [];
    const snapshot = clone(record);
    const revision = {
      id: `revision-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      recordId: record.id,
      revisionNumber: revisions.length + 1,
      capturedAt: new Date().toISOString(),
      reason,
      contentHash: hashValueV08(snapshot),
      snapshot
    };

    revisions.push(revision);
    map[record.id] = revisions.slice(-revisionLimit).map((item, index, kept) => ({
      ...item,
      revisionNumber: Math.max(1, revisions.length - kept.length + index + 1)
    }));
    writeJson(revisionsKey, map);
    return revision;
  }

  function patchSaveWorkflowV08() {
    if (global.__methodzV08SavePatched || typeof global.saveMeeting !== "function") return;

    const originalSaveMeeting = global.saveMeeting;
    global.saveMeeting = function saveMeetingV08(...args) {
      const beforeId = document.getElementById("editingRecordId")?.value || "";
      const before = beforeId ? findActiveRecordV08(beforeId) : null;
      const result = originalSaveMeeting.apply(this, args);
      const afterId = document.getElementById("editingRecordId")?.value || beforeId;
      const after = afterId ? findActiveRecordV08(afterId) : null;

      if (after) {
        const reason = before ? "Record updated" : "Initial saved record";
        appendRevisionV08(after, reason);
        if (activeHistoryRecordId === after.id) renderRevisionHistoryV08(after.id);
        announceV08(`Meeting ${after.meetingNumber || "record"} saved. Revision history updated.`);
      }

      return result;
    };

    global.__methodzV08SavePatched = true;
  }

  function patchDeleteWorkflowV08() {
    if (global.__methodzV08DeletePatched || typeof global.deleteRecord !== "function") return;

    global.permanentlyDeleteActiveRecordV08 = global.deleteRecord;
    global.deleteRecord = function archiveInsteadOfDeleteV08(recordId) {
      archiveRecordV08(recordId);
    };
    global.__methodzV08DeletePatched = true;
  }

  function patchSavedRecordCardsV08() {
    if (global.__methodzV08RecordCardsPatched || typeof global.createRecordCard !== "function") return;

    const originalCreateRecordCard = global.createRecordCard;
    global.createRecordCard = function createRecordCardV08(record) {
      const card = originalCreateRecordCard(record);
      const row = card.querySelector(".button-row");
      const destructiveButton = Array.from(card.querySelectorAll("button"))
        .find((button) => button.getAttribute("onclick")?.includes("deleteRecord"));

      if (destructiveButton) {
        destructiveButton.textContent = "Archive";
        destructiveButton.classList.add("archive-record-button-v08");
        destructiveButton.setAttribute("aria-label", `Archive meeting ${record.meetingNumber || record.title || "record"}`);
      }

      if (row && !row.querySelector(".revision-history-button-v08")) {
        const historyButton = document.createElement("button");
        historyButton.type = "button";
        historyButton.className = "revision-history-button-v08";
        historyButton.textContent = "Revision History";
        historyButton.addEventListener("click", () => openRevisionHistoryV08(record.id));
        row.appendChild(historyButton);
      }

      return card;
    };

    global.__methodzV08RecordCardsPatched = true;
    if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
  }

  function installArchiveVaultV08() {
    const savedCard = document.getElementById("savedRecords")?.closest(".card");
    if (!savedCard || document.getElementById("archiveVaultV08")) return;

    const panel = document.createElement("section");
    panel.id = "archiveVaultV08";
    panel.className = "card v08-card archive-vault-v08";
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Archive Vault</h2>
          <p class="helper-text">Archiving removes a record from the active workspace without destroying it. Restore or permanently delete it here.</p>
        </div>
        <button type="button" onclick="renderArchiveVaultV08()">Refresh Vault</button>
      </div>
      <div id="archiveVaultSummaryV08" class="archive-vault-summary-v08"></div>
      <div id="archiveVaultListV08"></div>
    `;

    savedCard.insertAdjacentElement("beforebegin", panel);
  }

  function installRevisionHistoryPanelV08() {
    const savedCard = document.getElementById("savedRecords")?.closest(".card");
    if (!savedCard || document.getElementById("revisionHistoryPanelV08")) return;

    const panel = document.createElement("section");
    panel.id = "revisionHistoryPanelV08";
    panel.className = "card v08-card revision-history-v08 is-hidden";
    panel.tabIndex = -1;
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Record Revision History</h2>
          <p class="helper-text" id="revisionHistorySubtitleV08">Saved versions appear here.</p>
        </div>
        <button type="button" onclick="closeRevisionHistoryV08()">Close History</button>
      </div>
      <div id="revisionHistoryListV08"></div>
    `;

    savedCard.insertAdjacentElement("beforebegin", panel);
  }

  function archiveRecordV08(recordId) {
    const record = findActiveRecordV08(recordId);
    if (!record) return alert("Record not found.");

    const confirmed = global.confirm(`Archive Meeting #${record.meetingNumber || "?"}: ${record.title || "Untitled Meeting"}?\n\nThe record will remain available in the Archive Vault.`);
    if (!confirmed) return;

    const archived = readArchivedRecordsV08();
    archived.push({
      archiveId: `archive-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      archivedAt: new Date().toISOString(),
      originalRecordId: record.id,
      record: clone(record)
    });
    writeJson(archivedRecordsKey, archived);

    const active = getActiveRecordsV08().filter((item) => item.id !== recordId);
    setActiveRecordsV08(active);

    if (document.getElementById("editingRecordId")?.value === recordId) {
      document.getElementById("editingRecordId").value = "";
    }

    renderArchiveVaultV08();
    if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
    if (typeof global.updateMeetingNumberLabel === "function") global.updateMeetingNumberLabel();
    announceV08(`Meeting ${record.meetingNumber || "record"} moved to the Archive Vault.`);
  }

  function restoreArchivedRecordV08(archiveId) {
    const archived = readArchivedRecordsV08();
    const entry = archived.find((item) => item.archiveId === archiveId);
    if (!entry?.record) return alert("Archived record not found.");

    const active = getActiveRecordsV08();
    const restored = clone(entry.record);
    const conflict = active.some((item) => item.id === restored.id);

    if (conflict) {
      restored.restoredFromRecordId = restored.id;
      restored.id = `meeting-restored-${Date.now()}`;
    }

    restored.restoredAt = new Date().toISOString();
    restored.updatedAt = restored.restoredAt;
    active.push(restored);
    setActiveRecordsV08(active);
    appendRevisionV08(restored, "Restored from Archive Vault");

    writeJson(archivedRecordsKey, archived.filter((item) => item.archiveId !== archiveId));
    renderArchiveVaultV08();
    if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
    announceV08(`Meeting ${restored.meetingNumber || "record"} restored to the active workspace.`);
  }

  function permanentlyDeleteArchivedRecordV08(archiveId) {
    const archived = readArchivedRecordsV08();
    const entry = archived.find((item) => item.archiveId === archiveId);
    if (!entry) return;

    const confirmed = global.confirm("Permanently delete this archived meeting and its stored revision history? This cannot be undone.");
    if (!confirmed) return;

    writeJson(archivedRecordsKey, archived.filter((item) => item.archiveId !== archiveId));
    const map = getRevisionMapV08();
    delete map[entry.originalRecordId];
    writeJson(revisionsKey, map);
    renderArchiveVaultV08();
    announceV08("Archived meeting permanently deleted.");
  }

  function downloadArchivedRecordV08(archiveId) {
    const entry = readArchivedRecordsV08().find((item) => item.archiveId === archiveId);
    if (!entry || typeof global.downloadBlob !== "function") return;
    global.downloadBlob(
      JSON.stringify(entry, null, 2),
      `methodz-archived-meeting-${entry.record?.meetingNumber || archiveId}.json`,
      "application/json"
    );
  }

  function renderArchiveVaultV08() {
    const list = document.getElementById("archiveVaultListV08");
    const summary = document.getElementById("archiveVaultSummaryV08");
    if (!list || !summary) return;

    const archived = readArchivedRecordsV08()
      .slice()
      .sort((a, b) => String(b.archivedAt || "").localeCompare(String(a.archivedAt || "")));

    summary.textContent = archived.length
      ? `${archived.length} archived meeting record${archived.length === 1 ? "" : "s"}.`
      : "No archived meeting records.";

    if (!archived.length) {
      list.innerHTML = '<p class="helper-text">Records archived from the active workspace will appear here.</p>';
      return;
    }

    list.innerHTML = "";
    archived.forEach((entry) => {
      const record = entry.record || {};
      const card = document.createElement("article");
      card.className = "archived-record-v08";
      card.innerHTML = `
        <div>
          <strong>Meeting #${escapeV08(record.meetingNumber || "?")}: ${escapeV08(record.title || "Untitled Meeting")}</strong>
          <p>${escapeV08(record.date || "No date")} • Archived ${escapeV08(formatV08(entry.archivedAt))}</p>
        </div>
        <div class="button-row">
          <button type="button" data-action="restore">Restore</button>
          <button type="button" data-action="download">Download</button>
          <button type="button" class="small-danger" data-action="delete">Permanent Delete</button>
        </div>
      `;
      card.querySelector('[data-action="restore"]').addEventListener("click", () => restoreArchivedRecordV08(entry.archiveId));
      card.querySelector('[data-action="download"]').addEventListener("click", () => downloadArchivedRecordV08(entry.archiveId));
      card.querySelector('[data-action="delete"]').addEventListener("click", () => permanentlyDeleteArchivedRecordV08(entry.archiveId));
      list.appendChild(card);
    });
  }

  function openRevisionHistoryV08(recordId) {
    activeHistoryRecordId = recordId;
    const panel = document.getElementById("revisionHistoryPanelV08");
    if (!panel) return;
    panel.classList.remove("is-hidden");
    renderRevisionHistoryV08(recordId);
    panel.focus();
    panel.scrollIntoView({ behavior: prefersReducedMotionV08() ? "auto" : "smooth", block: "start" });
  }

  function closeRevisionHistoryV08() {
    activeHistoryRecordId = "";
    document.getElementById("revisionHistoryPanelV08")?.classList.add("is-hidden");
  }

  function renderRevisionHistoryV08(recordId) {
    const list = document.getElementById("revisionHistoryListV08");
    const subtitle = document.getElementById("revisionHistorySubtitleV08");
    if (!list || !subtitle) return;

    const current = findActiveRecordV08(recordId);
    const revisions = getRecordRevisionsV08(recordId).slice().reverse();
    subtitle.textContent = `${current?.title || "Meeting record"} • ${revisions.length} saved revision${revisions.length === 1 ? "" : "s"}`;

    if (!revisions.length) {
      list.innerHTML = '<p class="helper-text">No saved revisions yet. The next save will create one.</p>';
      return;
    }

    list.innerHTML = "";
    revisions.forEach((revision) => {
      const snapshot = revision.snapshot || {};
      const item = document.createElement("article");
      item.className = "revision-entry-v08";
      item.innerHTML = `
        <div>
          <strong>Revision ${escapeV08(revision.revisionNumber)}</strong>
          <p>${escapeV08(revision.reason || "Saved record")} • ${escapeV08(formatV08(revision.capturedAt))}</p>
          <p class="helper-text">Status: ${escapeV08(snapshot.status || "Unknown")} • Tasks: ${(snapshot.tasks || []).length} • Attendees: ${(snapshot.attendees || []).length}</p>
        </div>
        <div class="button-row">
          <button type="button" data-action="preview">Preview JSON</button>
          <button type="button" data-action="restore">Restore This Revision</button>
        </div>
        <pre class="revision-preview-v08 is-hidden"></pre>
      `;
      const preview = item.querySelector("pre");
      item.querySelector('[data-action="preview"]').addEventListener("click", () => {
        preview.textContent = JSON.stringify(snapshot, null, 2);
        preview.classList.toggle("is-hidden");
      });
      item.querySelector('[data-action="restore"]').addEventListener("click", () => restoreRevisionV08(recordId, revision.id));
      list.appendChild(item);
    });
  }

  function restoreRevisionV08(recordId, revisionId) {
    const revision = getRecordRevisionsV08(recordId).find((item) => item.id === revisionId);
    const current = findActiveRecordV08(recordId);
    if (!revision?.snapshot || !current) return alert("Revision or active record not found.");

    const confirmed = global.confirm(`Restore Revision ${revision.revisionNumber}? The current record will first be preserved as another revision.`);
    if (!confirmed) return;

    appendRevisionV08(current, "Automatic snapshot before revision restore");
    const restored = {
      ...clone(revision.snapshot),
      id: current.id,
      restoredFromRevision: revision.revisionNumber,
      updatedAt: new Date().toISOString()
    };

    const records = getActiveRecordsV08();
    const index = records.findIndex((item) => item.id === recordId);
    records[index] = restored;
    setActiveRecordsV08(records);
    appendRevisionV08(restored, `Restored from Revision ${revision.revisionNumber}`);

    if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
    if (typeof global.loadRecordForEditing === "function") global.loadRecordForEditing(recordId);
    renderRevisionHistoryV08(recordId);
    announceV08(`Revision ${revision.revisionNumber} restored.`);
  }

  function readArchivedRecordsV08() {
    const value = readJson(archivedRecordsKey, []);
    return Array.isArray(value) ? value : [];
  }

  function getActiveRecordsV08() {
    return typeof global.getRecords === "function" ? global.getRecords() : [];
  }

  function setActiveRecordsV08(records) {
    if (typeof global.setRecords === "function") global.setRecords(records);
  }

  function findActiveRecordV08(recordId) {
    return getActiveRecordsV08().find((item) => item.id === recordId) || null;
  }

  function hashValueV08(value) {
    const text = stableStringifyV08(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
  }

  function stableStringifyV08(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringifyV08).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringifyV08(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  function formatV08(value) {
    if (!value) return "Unknown time";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
  }

  function escapeV08(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function prefersReducedMotionV08() {
    return global.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }

  function announceV08(message) {
    if (typeof global.announceMethodzStatus === "function") global.announceMethodzStatus(message);
  }

  global.getRecordRevisionsV08 = getRecordRevisionsV08;
  global.appendRevisionV08 = appendRevisionV08;
  global.openRevisionHistoryV08 = openRevisionHistoryV08;
  global.closeRevisionHistoryV08 = closeRevisionHistoryV08;
  global.renderArchiveVaultV08 = renderArchiveVaultV08;
  global.restoreArchivedRecordV08 = restoreArchivedRecordV08;
  global.permanentlyDeleteArchivedRecordV08 = permanentlyDeleteArchivedRecordV08;
  global.downloadArchivedRecordV08 = downloadArchivedRecordV08;
})(window);
