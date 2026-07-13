/* Methodz Meeting Manager v1.1 retention review and legal-hold workflow. */
(function initializeMethodzRetentionV11(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const archiveKey = config.storageKeys?.archivedRecords || "methodzArchivedMeetingRecords";
  let baselineRetentionState = null;
  let workingRetentionState = null;
  let archiveObserver = null;

  global.addEventListener("DOMContentLoaded", initialize);
  global.addEventListener("methodz:migrations-complete", () => global.setTimeout(refreshRetentionDashboard, 0));

  function initialize() {
    installRetentionPanel();
    installRetentionDashboard();
    patchDataFlow();
    patchSaveWorkflow();
    patchRecordCards();
    patchArchiveProtection();
    restoreRetentionDraft();
    refreshRetentionPanelState();
    refreshRetentionDashboard();
  }

  function policies() {
    return Array.isArray(config.retentionPolicies) && config.retentionPolicies.length
      ? config.retentionPolicies
      : [
          { id: "business-review-7y", label: "Business Record Review - 7 Years", years: 7 },
          { id: "permanent", label: "Permanent / Do Not Dispose", years: null },
          { id: "custom", label: "Custom Review Date", years: null }
        ];
  }

  function lifecycleStatuses() {
    return Array.isArray(config.retentionLifecycleStatuses) && config.retentionLifecycleStatuses.length
      ? config.retentionLifecycleStatuses
      : ["Active", "Review Due", "Retained After Review", "Disposition Approved"];
  }

  function installRetentionPanel() {
    const governance = document.getElementById("recordGovernancePanelV10");
    const meetingInfo = document.getElementById("meetingTitle")?.closest(".card");
    const anchor = governance || meetingInfo;
    if (!anchor || document.getElementById("recordRetentionPanelV11")) return;

    const panel = document.createElement("section");
    panel.id = "recordRetentionPanelV11";
    panel.className = "card v11-card retention-panel-v11";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Record Retention & Legal Hold</h2>
          <p class="helper-text">Track review dates and preservation holds. Presets are workflow aids only and must be checked against applicable legal, insurance, tax, employment, and contractual requirements.</p>
        </div>
        <span class="release-badge-v11">v1.1</span>
      </div>

      <div class="form-grid retention-grid-v11">
        <div>
          <label for="retentionPolicyV11">Retention Policy</label>
          <select id="retentionPolicyV11">${policies().map((policy) => `<option value="${escapeHtml(policy.id)}">${escapeHtml(policy.label)}</option>`).join("")}</select>
        </div>
        <div>
          <label for="retentionReviewDateV11">Review Date</label>
          <input id="retentionReviewDateV11" type="date" />
        </div>
        <div>
          <label for="retentionLifecycleV11">Lifecycle Status</label>
          <select id="retentionLifecycleV11">${lifecycleStatuses().map((status) => `<option>${escapeHtml(status)}</option>`).join("")}</select>
        </div>
      </div>

      <p id="retentionPolicyNoteV11" class="helper-text"></p>

      <label for="retentionNoteV11">Retention Note</label>
      <textarea id="retentionNoteV11" placeholder="Reason for the retention choice, review outcome, disposition approval, or special handling instructions..."></textarea>

      <fieldset class="retention-hold-v11">
        <legend>Preservation Hold</legend>
        <label class="inline-check-v11"><input id="legalHoldActiveV11" type="checkbox" /> Legal hold / preservation hold is active</label>
        <div class="form-grid">
          <div>
            <label for="legalHoldActorV11">Placed / Released By</label>
            <input id="legalHoldActorV11" type="text" placeholder="Authorized person" />
          </div>
          <div>
            <label for="legalHoldReasonV11">Hold or Release Reason</label>
            <input id="legalHoldReasonV11" type="text" placeholder="Investigation, dispute, audit, insurance request..." />
          </div>
        </div>
        <p id="legalHoldStatusV11" class="hold-status-v11" aria-live="polite"></p>
      </fieldset>
    `;

    anchor.insertAdjacentElement("afterend", panel);
    panel.addEventListener("input", scheduleDraftSave);
    panel.addEventListener("change", scheduleDraftSave);
    document.getElementById("retentionPolicyV11")?.addEventListener("change", handlePolicyChange);
    document.getElementById("retentionReviewDateV11")?.addEventListener("change", refreshRetentionPanelState);
    document.getElementById("legalHoldActiveV11")?.addEventListener("change", refreshRetentionPanelState);
  }

  function installRetentionDashboard() {
    const archive = document.getElementById("archiveVaultV08");
    const savedCard = document.getElementById("savedRecords")?.closest(".card");
    const anchor = archive || savedCard;
    if (!anchor || document.getElementById("retentionDashboardV11")) return;

    const panel = document.createElement("section");
    panel.id = "retentionDashboardV11";
    panel.className = "card v11-card retention-dashboard-v11";
    panel.innerHTML = `
      <div class="section-subheader">
        <div>
          <h2>Retention Review Dashboard</h2>
          <p class="helper-text">Review active and archived records that are on hold, due, or missing a review date.</p>
        </div>
        <div class="button-row">
          <button type="button" onclick="refreshRetentionDashboardV11()">Refresh</button>
          <button type="button" onclick="exportRetentionReportV11()">Export Report</button>
        </div>
      </div>
      <div id="retentionMetricsV11" class="metric-grid"></div>
      <div class="form-grid retention-filter-grid-v11">
        <div>
          <label for="retentionFilterV11">Review Filter</label>
          <select id="retentionFilterV11">
            <option value="all">All Records</option>
            <option value="hold">Legal Hold Active</option>
            <option value="due">Review Due</option>
            <option value="missing">Missing Review Date</option>
          </select>
        </div>
        <div>
          <label for="retentionSearchV11">Search</label>
          <input id="retentionSearchV11" type="search" placeholder="Meeting title, number, organization..." />
        </div>
      </div>
      <div id="retentionDashboardBodyV11" aria-live="polite"></div>
    `;

    anchor.insertAdjacentElement("beforebegin", panel);
    document.getElementById("retentionFilterV11")?.addEventListener("change", refreshRetentionDashboard);
    document.getElementById("retentionSearchV11")?.addEventListener("input", refreshRetentionDashboard);
  }

  function defaultRetention() {
    const policy = policies().find((item) => item.id === "business-review-7y") || policies()[0];
    return {
      policyId: policy?.id || "custom",
      reviewDate: calculateReviewDate(document.getElementById("meetingDate")?.value, policy?.years),
      lifecycleStatus: "Active",
      note: "",
      legalHold: emptyHold(),
      holdHistory: [],
      updatedAt: new Date().toISOString()
    };
  }

  function emptyHold() {
    return {
      active: false,
      reason: "",
      placedBy: "",
      placedAt: "",
      releasedBy: "",
      releasedAt: "",
      releaseNote: ""
    };
  }

  function normalizeRetention(value) {
    const source = isPlainObject(value) ? value : {};
    const hold = isPlainObject(source.legalHold) ? source.legalHold : {};
    const fallback = defaultRetention();
    return {
      policyId: source.policyId || fallback.policyId,
      reviewDate: source.reviewDate || "",
      lifecycleStatus: source.lifecycleStatus || "Active",
      note: source.note || "",
      legalHold: { ...emptyHold(), ...hold, active: Boolean(hold.active) },
      holdHistory: Array.isArray(source.holdHistory) ? clone(source.holdHistory) : [],
      updatedAt: source.updatedAt || fallback.updatedAt
    };
  }

  function collectRetention() {
    const previous = normalizeRetention(workingRetentionState || baselineRetentionState || defaultRetention());
    const active = Boolean(document.getElementById("legalHoldActiveV11")?.checked);
    const actor = readValue("legalHoldActorV11");
    const reason = readValue("legalHoldReasonV11");
    const now = new Date().toISOString();
    const hold = { ...previous.legalHold };
    const history = clone(previous.holdHistory || []);

    if (active && !previous.legalHold.active) {
      hold.active = true;
      hold.placedBy = actor;
      hold.placedAt = now;
      hold.reason = reason;
      hold.releasedBy = "";
      hold.releasedAt = "";
      hold.releaseNote = "";
      history.push({ action: "placed", at: now, by: actor, reason });
    } else if (active && previous.legalHold.active) {
      hold.active = true;
      hold.placedBy = actor || hold.placedBy;
      hold.reason = reason || hold.reason;
      updateLatestTransition(history, "placed", hold.placedAt, hold.placedBy, hold.reason);
    } else if (!active && previous.legalHold.active) {
      hold.active = false;
      hold.releasedBy = actor;
      hold.releasedAt = now;
      hold.releaseNote = reason;
      history.push({ action: "released", at: now, by: actor, reason });
    } else {
      hold.active = false;
      if (hold.releasedAt) {
        hold.releasedBy = actor || hold.releasedBy;
        hold.releaseNote = reason || hold.releaseNote;
        updateLatestTransition(history, "released", hold.releasedAt, hold.releasedBy, hold.releaseNote);
      }
    }

    const next = {
      policyId: readValue("retentionPolicyV11") || "custom",
      reviewDate: readValue("retentionReviewDateV11"),
      lifecycleStatus: readValue("retentionLifecycleV11") || "Active",
      note: readValue("retentionNoteV11"),
      legalHold: hold,
      holdHistory: history,
      updatedAt: previous.updatedAt
    };

    if (!sameRetentionCore(previous, next)) next.updatedAt = now;
    workingRetentionState = clone(next);
    return next;
  }

  function updateLatestTransition(history, action, timestamp, actor, reason) {
    for (let index = history.length - 1; index >= 0; index -= 1) {
      const event = history[index];
      if (event?.action !== action) continue;
      if (timestamp && event.at && event.at !== timestamp) continue;
      history[index] = { ...event, by: actor || event.by || "", reason: reason || event.reason || "" };
      return;
    }
  }

  function populateRetention(value, options = {}) {
    const retention = normalizeRetention(value);
    workingRetentionState = clone(retention);
    if (options.persisted !== false) baselineRetentionState = clone(retention);
    setValue("retentionPolicyV11", retention.policyId);
    setValue("retentionReviewDateV11", retention.reviewDate);
    setValue("retentionLifecycleV11", retention.lifecycleStatus);
    setValue("retentionNoteV11", retention.note);
    const hold = retention.legalHold || {};
    const activeInput = document.getElementById("legalHoldActiveV11");
    if (activeInput) activeInput.checked = Boolean(hold.active);
    setValue("legalHoldActorV11", hold.active ? hold.placedBy : hold.releasedBy);
    setValue("legalHoldReasonV11", hold.active ? hold.reason : hold.releaseNote);
    refreshRetentionPanelState();
  }

  function restoreRetentionDraft() {
    try {
      const key = config.storageKeys?.draft || "methodzMeetingDraft";
      const draft = JSON.parse(global.localStorage.getItem(key) || "null");
      if (draft?.retentionMetadata) populateRetention(draft.retentionMetadata, { persisted: false });
      else populateRetention(defaultRetention());
    } catch (error) {
      console.warn("Unable to restore v1.1 retention draft", error);
      populateRetention(defaultRetention());
    }
  }

  function handlePolicyChange() {
    const policy = policies().find((item) => item.id === readValue("retentionPolicyV11"));
    const reviewInput = document.getElementById("retentionReviewDateV11");
    if (reviewInput && policy?.id === "permanent") reviewInput.value = "";
    else if (reviewInput && policy?.years && !reviewInput.value) {
      reviewInput.value = calculateReviewDate(document.getElementById("meetingDate")?.value, policy.years);
    }
    refreshRetentionPanelState();
  }

  function refreshRetentionPanelState() {
    const policy = policies().find((item) => item.id === readValue("retentionPolicyV11"));
    const note = document.getElementById("retentionPolicyNoteV11");
    if (note) note.textContent = policy?.note || "Confirm the review date against the governing requirement.";

    const active = Boolean(document.getElementById("legalHoldActiveV11")?.checked);
    const holdStatus = document.getElementById("legalHoldStatusV11");
    if (holdStatus) {
      holdStatus.className = `hold-status-v11 ${active ? "is-hold-v11" : "is-clear-v11"}`;
      holdStatus.textContent = active
        ? "Legal hold is active. Permanent deletion must remain blocked until an authorized release is recorded."
        : "No active legal hold is recorded for this meeting.";
    }
  }

  function patchDataFlow() {
    if (!global.__methodzV11RetentionCollectPatched && typeof global.collectMeetingData === "function") {
      const original = global.collectMeetingData;
      global.collectMeetingData = function collectMeetingDataRetentionV11(options = {}) {
        const meeting = original(options);
        meeting.retentionMetadata = collectRetention();
        meeting.redactionMetadata = {
          ...(meeting.redactionMetadata || {}),
          sourceSchemaVersion: meeting.schemaVersion || config.schemaVersion || "1.1.0"
        };
        meeting.schemaVersion = config.schemaVersion || "1.1.0";
        meeting.releaseMetadata = {
          ...(meeting.releaseMetadata || {}),
          release: "1.1.0",
          appShellVersion: config.appShellVersion || "1.1.0"
        };
        if (global.MethodzReleaseV10?.validateRecord) {
          meeting.schemaAudit = global.MethodzReleaseV10.validateRecord(meeting);
        }
        return meeting;
      };
      global.__methodzV11RetentionCollectPatched = true;
    }

    if (!global.__methodzV11RetentionPopulatePatched && typeof global.populateForm === "function") {
      const original = global.populateForm;
      global.populateForm = function populateFormRetentionV11(record, options = {}) {
        original(record, options);
        populateRetention(record?.retentionMetadata || defaultRetention());
      };
      global.__methodzV11RetentionPopulatePatched = true;
    }

    if (!global.__methodzV11RetentionResetPatched && typeof global.resetForm === "function") {
      const original = global.resetForm;
      global.resetForm = function resetFormRetentionV11(...args) {
        const result = original.apply(this, args);
        populateRetention(defaultRetention());
        return result;
      };
      global.__methodzV11RetentionResetPatched = true;
    }

    if (!global.__methodzV11RetentionSavedPatched && typeof global.loadSavedRecords === "function") {
      const original = global.loadSavedRecords;
      global.loadSavedRecords = function loadSavedRecordsRetentionV11(...args) {
        const result = original.apply(this, args);
        refreshRetentionDashboard();
        global.setTimeout(decorateArchiveCards, 0);
        return result;
      };
      global.__methodzV11RetentionSavedPatched = true;
    }
  }

  function patchSaveWorkflow() {
    if (global.__methodzV11RetentionSavePatched || typeof global.saveMeeting !== "function") return;
    const original = global.saveMeeting;
    global.saveMeeting = function saveMeetingRetentionV11(...args) {
      const active = Boolean(document.getElementById("legalHoldActiveV11")?.checked);
      const actor = readValue("legalHoldActorV11");
      const reason = readValue("legalHoldReasonV11");
      if (active && !actor) {
        alert("An active legal hold requires the name of the authorized person placing it.");
        return;
      }
      if (active && !reason) {
        alert("An active legal hold requires a preservation reason.");
        return;
      }

      const result = original.apply(this, args);
      const editingId = document.getElementById("editingRecordId")?.value || "";
      const saved = editingId && typeof global.getRecords === "function"
        ? global.getRecords().find((record) => record.id === editingId)
        : null;
      if (saved?.retentionMetadata) {
        baselineRetentionState = normalizeRetention(saved.retentionMetadata);
        workingRetentionState = clone(baselineRetentionState);
      }
      return result;
    };
    global.__methodzV11RetentionSavePatched = true;
  }

  function patchRecordCards() {
    if (global.__methodzV11RetentionCardsPatched || typeof global.createRecordCard !== "function") return;
    const original = global.createRecordCard;
    global.createRecordCard = function createRecordCardRetentionV11(record) {
      const card = original(record);
      const header = card.querySelector(".saved-record-header") || card.firstElementChild;
      const retention = normalizeRetention(record?.retentionMetadata || {});
      if (header && !header.querySelector(".retention-badges-v11")) {
        const badges = document.createElement("span");
        badges.className = "retention-badges-v11";
        const policy = policies().find((item) => item.id === retention.policyId);
        badges.innerHTML = `<span class="retention-badge-v11">${escapeHtml(policy?.label || retention.policyId)}</span>${retention.legalHold.active ? '<span class="hold-badge-v11">Legal Hold</span>' : ""}${isReviewDue(retention) ? '<span class="due-badge-v11">Review Due</span>' : ""}`;
        header.appendChild(badges);
      }
      return card;
    };
    global.__methodzV11RetentionCardsPatched = true;
    if (typeof global.loadSavedRecords === "function") global.loadSavedRecords();
  }

  function patchArchiveProtection() {
    const list = document.getElementById("archiveVaultListV08");
    if (!list) return;

    list.addEventListener("click", (event) => {
      const button = event.target.closest('button[data-action="delete"]');
      if (!button) return;
      const entry = archivedEntryForCard(button.closest(".archived-record-v08"));
      if (!entry?.record?.retentionMetadata?.legalHold?.active) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      alert("Permanent deletion is blocked because this record has an active legal hold. Release the hold and save the record before attempting disposition.");
    }, true);

    if (!global.__methodzV11ArchiveRenderPatched && typeof global.renderArchiveVaultV08 === "function") {
      const original = global.renderArchiveVaultV08;
      global.renderArchiveVaultV08 = function renderArchiveVaultRetentionV11(...args) {
        const result = original.apply(this, args);
        global.setTimeout(decorateArchiveCards, 0);
        global.setTimeout(refreshRetentionDashboard, 0);
        return result;
      };
      global.__methodzV11ArchiveRenderPatched = true;
    }

    archiveObserver = new MutationObserver(() => global.setTimeout(decorateArchiveCards, 0));
    archiveObserver.observe(list, { childList: true });
    decorateArchiveCards();
  }

  function archivedEntryForCard(card) {
    if (!card) return null;
    const entries = readArchived().slice().sort((a, b) => String(b.archivedAt || "").localeCompare(String(a.archivedAt || "")));
    if (card.dataset.archiveId) return entries.find((entry) => entry.archiveId === card.dataset.archiveId) || null;
    const cards = Array.from(document.querySelectorAll("#archiveVaultListV08 .archived-record-v08"));
    return entries[cards.indexOf(card)] || null;
  }

  function decorateArchiveCards() {
    const cards = Array.from(document.querySelectorAll("#archiveVaultListV08 .archived-record-v08"));
    cards.forEach((card) => {
      const entry = archivedEntryForCard(card);
      if (!entry) return;
      const retention = normalizeRetention(entry.record?.retentionMetadata || {});
      const meta = card.querySelector("div p") || card.querySelector("div");
      if (meta) {
        let badge = meta.querySelector(".archive-retention-v11");
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "archive-retention-v11";
          meta.append(" • ", badge);
        }
        badge.textContent = retention.legalHold.active ? "Legal Hold" : isReviewDue(retention) ? "Review Due" : "Retention Tracked";
      }
      const deleteButton = card.querySelector('button[data-action="delete"]');
      if (deleteButton) {
        deleteButton.disabled = retention.legalHold.active;
        deleteButton.title = retention.legalHold.active ? "Permanent deletion is blocked by an active legal hold." : "";
      }
    });
  }

  function allRows() {
    const active = (typeof global.getRecords === "function" ? global.getRecords() : []).map((record) => ({ source: "Active", record }));
    const archived = readArchived().filter((entry) => entry?.record).map((entry) => ({ source: "Archived", archiveId: entry.archiveId, archivedAt: entry.archivedAt, record: entry.record }));
    return [...active, ...archived];
  }

  function filteredRows() {
    const filter = readValue("retentionFilterV11") || "all";
    const query = readValue("retentionSearchV11").toLowerCase();
    return allRows().filter(({ record }) => {
      const retention = normalizeRetention(record?.retentionMetadata || {});
      const matchesFilter = filter === "all"
        || (filter === "hold" && retention.legalHold.active)
        || (filter === "due" && isReviewDue(retention))
        || (filter === "missing" && retention.policyId !== "permanent" && !retention.reviewDate);
      return matchesFilter && (!query || JSON.stringify(record).toLowerCase().includes(query));
    });
  }

  function refreshRetentionDashboard() {
    const body = document.getElementById("retentionDashboardBodyV11");
    const metrics = document.getElementById("retentionMetricsV11");
    if (!body || !metrics) return;
    const rows = allRows();
    const visible = filteredRows();
    metrics.innerHTML = `<div><strong>${rows.length}</strong><span>records</span></div><div><strong>${rows.filter(({ record }) => normalizeRetention(record.retentionMetadata).legalHold.active).length}</strong><span>legal holds</span></div><div><strong>${rows.filter(({ record }) => isReviewDue(normalizeRetention(record.retentionMetadata))).length}</strong><span>review due</span></div><div><strong>${rows.filter(({ record }) => normalizeRetention(record.retentionMetadata).policyId !== "permanent" && !normalizeRetention(record.retentionMetadata).reviewDate).length}</strong><span>missing dates</span></div>`;

    if (!visible.length) {
      body.innerHTML = '<p class="helper-text">No records match the retention filters.</p>';
      return;
    }

    body.innerHTML = visible.map(({ source, record }) => {
      const retention = normalizeRetention(record.retentionMetadata || {});
      const policy = policies().find((item) => item.id === retention.policyId);
      const state = retention.legalHold.active ? "Legal Hold" : isReviewDue(retention) ? "Review Due" : retention.lifecycleStatus;
      return `<article class="retention-row-v11"><div><strong>#${escapeHtml(record.meetingNumber || "?")} ${escapeHtml(record.title || "Untitled Meeting")}</strong><p>${escapeHtml(source)} • ${escapeHtml(policy?.label || retention.policyId)} • Review ${escapeHtml(retention.reviewDate || "not scheduled")}</p></div><span class="${retention.legalHold.active ? "hold-badge-v11" : isReviewDue(retention) ? "due-badge-v11" : "retention-badge-v11"}">${escapeHtml(state)}</span></article>`;
    }).join("");
  }

  function exportRetentionReport() {
    const rows = filteredRows().map(({ source, archiveId, archivedAt, record }) => ({
      source,
      archiveId: archiveId || null,
      archivedAt: archivedAt || null,
      recordId: record.id,
      meetingNumber: record.meetingNumber,
      title: record.title,
      date: record.date,
      organizations: record.organizations || [],
      retentionMetadata: normalizeRetention(record.retentionMetadata || {}),
      reviewDue: isReviewDue(normalizeRetention(record.retentionMetadata || {}))
    }));
    const payload = {
      packageType: "methodz-retention-review-report",
      packageVersion: 1,
      schemaVersion: config.schemaVersion || "1.1.0",
      generatedAt: new Date().toISOString(),
      warning: "Retention presets are internal workflow aids and are not legal advice.",
      count: rows.length,
      records: rows
    };
    if (typeof global.downloadBlob === "function") {
      global.downloadBlob(JSON.stringify(payload, null, 2), `methodz-retention-report-${today()}.json`, "application/json");
    }
  }

  function readArchived() {
    try {
      const value = JSON.parse(global.localStorage.getItem(archiveKey) || "[]");
      return Array.isArray(value) ? value : [];
    } catch (error) {
      return [];
    }
  }

  function isReviewDue(retention) {
    if (!retention || retention.policyId === "permanent" || !retention.reviewDate) return false;
    const review = new Date(`${retention.reviewDate}T23:59:59`);
    return !Number.isNaN(review.getTime()) && review.getTime() <= Date.now();
  }

  function calculateReviewDate(baseDate, years) {
    if (!years) return "";
    const date = baseDate ? new Date(`${baseDate}T12:00:00`) : new Date();
    if (Number.isNaN(date.getTime())) return "";
    date.setFullYear(date.getFullYear() + Number(years));
    return date.toISOString().slice(0, 10);
  }

  function sameRetentionCore(left, right) {
    const clean = (value) => {
      const copy = clone(value || {});
      delete copy.updatedAt;
      return JSON.stringify(copy);
    };
    return clean(left) === clean(right);
  }

  function scheduleDraftSave() {
    refreshRetentionPanelState();
    if (typeof global.scheduleDraftSave === "function") global.scheduleDraftSave();
  }

  function readValue(id) {
    return String(document.getElementById(id)?.value || "").trim();
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value || "";
  }

  function isPlainObject(value) {
    return Boolean(value && typeof value === "object" && !Array.isArray(value));
  }

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function today() {
    return new Date().toISOString().slice(0, 10);
  }

  global.refreshRetentionDashboardV11 = refreshRetentionDashboard;
  global.exportRetentionReportV11 = exportRetentionReport;
  global.MethodzRetentionV11 = {
    version: "1.1.0",
    normalize: normalizeRetention,
    collect: collectRetention,
    isReviewDue,
    readAll: allRows
  };
})(window);
