/* Methodz Meeting Manager v1.6.11 live meeting pulse and follow-up review browser layer. */
(function initializeFollowUpReviewV1611(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.followUpReview || {};
  const Review = global.MethodzMeetingReviewCoreV1611;
  const preferencesKey = config.storageKeys?.followUpReviewPreferences || "methodzFollowUpReviewPreferencesV1611";
  let currentReport = null;
  let refreshQueued = false;

  const text = (value) => String(value ?? "").trim();
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

  function parseJson(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }

  function safeRecords() {
    try {
      const records = typeof global.getRecords === "function" ? global.getRecords() : [];
      return Array.isArray(records) ? records : [];
    } catch (error) {
      console.error("Unable to build follow-up review", error);
      return [];
    }
  }

  function currentMeeting() {
    try { return typeof global.collectMeetingData === "function" ? global.collectMeetingData({ keepEmptyRows: true }) : {}; }
    catch (error) {
      console.error("Unable to calculate live meeting pulse", error);
      return {};
    }
  }

  function insertMeetingPulsePanel() {
    if (document.getElementById("meetingPulsePanelV1611")) return;
    const anchor = document.getElementById("meetingQuickActionsPanelV1610") || document.querySelector("#mainContent > .quick-actions");
    if (!anchor) return;
    const panel = document.createElement("section");
    panel.id = "meetingPulsePanelV1611";
    panel.className = "card meeting-pulse-v1611";
    panel.innerHTML = `
      <p class="eyebrow">Live Capture Check</p>
      <h2>Meeting Pulse</h2>
      <p class="helper-text">A read-only view of the current form. It does not save, change status, or mutate the meeting record.</p>
      <div id="meetingPulseMetricsV1611" class="meeting-pulse-grid-v1611"></div>
      <progress id="meetingPulseProgressV1611" class="meeting-pulse-progress-v1611" max="100" value="0">0%</progress>
      <div id="meetingPulseSectionsV1611" class="meeting-pulse-sections-v1611" aria-label="Meeting section readiness"></div>
      <div class="button-row">
        <button id="meetingPulseNextV1611" type="button" onclick="goToNextIncompleteMeetingSectionV1611()">Go to Next Incomplete Section</button>
        <button type="button" onclick="refreshMeetingReviewV1611()">Refresh Pulse</button>
      </div>
      <p id="meetingPulseStatusV1611" class="helper-text" aria-live="polite"></p>`;
    anchor.insertAdjacentElement("afterend", panel);
  }

  function insertFollowUpPanel() {
    if (document.getElementById("followUpReviewPanelV1611")) return;
    const anchor = document.getElementById("savedRecordsPanelV1610") || document.getElementById("savedRecords")?.closest("section.card");
    if (!anchor) return;
    const panel = document.createElement("section");
    panel.id = "followUpReviewPanelV1611";
    panel.className = "card follow-up-review-v1611";
    panel.innerHTML = `
      <p class="eyebrow">Saved Record Review</p>
      <h2>Follow-Up Review</h2>
      <p class="helper-text">Review task status across saved active records. Opening a task loads its source meeting for explicit editing.</p>
      <div id="followUpMetricsV1611" class="follow-up-metrics-v1611"></div>
      <div class="follow-up-toolbar-v1611">
        <label for="followUpFilterV1611">Review Filter
          <select id="followUpFilterV1611">
            <option value="attention">Needs Attention</option><option value="overdue">Overdue</option>
            <option value="due-soon">Due Soon</option><option value="unassigned">Unassigned</option>
            <option value="invalid-date">Invalid Date</option><option value="pending">Pending</option>
            <option value="in-progress">In Progress</option><option value="completed">Completed</option>
            <option value="all">All Tasks</option>
          </select>
        </label>
        <label for="followUpSearchV1611">Search Review
          <input id="followUpSearchV1611" type="search" placeholder="Search meeting, task, Assigned To, date, or status" autocomplete="off" />
        </label>
        <button type="button" onclick="refreshMeetingReviewV1611()">Refresh</button>
        <button type="button" onclick="downloadFollowUpReviewCsvV1611()">Download CSV</button>
      </div>
      <p id="followUpStatusV1611" class="helper-text" aria-live="polite"></p>
      <div id="followUpListV1611" class="follow-up-list-v1611"></div>`;
    anchor.insertAdjacentElement("afterend", panel);
  }

  function loadPreferences() {
    let saved = {};
    try { saved = parseJson(global.localStorage.getItem(preferencesKey), {}); } catch (error) { saved = {}; }
    const filter = document.getElementById("followUpFilterV1611");
    if (filter) filter.value = text(saved.filter) || text(settings.defaultFilter) || "attention";
  }

  function savePreferences() {
    try {
      global.localStorage.setItem(preferencesKey, JSON.stringify({
        filter: document.getElementById("followUpFilterV1611")?.value || "attention",
        updatedAt: new Date().toISOString(), appShellVersion: config.appShellVersion
      }));
    } catch (error) { console.warn("Unable to save follow-up review preferences", error); }
  }

  const metric = (label, value) => `<div class="follow-up-metric-v1611"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;

  function renderPulse() {
    if (!Review || settings.livePulseEnabled === false) return;
    const pulse = Review.createMeetingPulse(currentMeeting());
    const metrics = document.getElementById("meetingPulseMetricsV1611");
    const progress = document.getElementById("meetingPulseProgressV1611");
    const sections = document.getElementById("meetingPulseSectionsV1611");
    const status = document.getElementById("meetingPulseStatusV1611");
    const nextButton = document.getElementById("meetingPulseNextV1611");
    if (metrics) metrics.innerHTML = [
      metric("Sections ready", `${pulse.counts.completedSections}/${pulse.counts.totalSections}`),
      metric("Agenda complete", `${pulse.counts.agendaCompleted}/${pulse.counts.agendaTotal}`),
      metric("Follow-up tasks", pulse.counts.tasks), metric("Unassigned tasks", pulse.counts.tasksUnassigned)
    ].join("");
    if (progress) {
      progress.value = pulse.completionPercent;
      progress.textContent = `${pulse.completionPercent}%`;
      progress.setAttribute("aria-label", `Meeting capture ${pulse.completionPercent}% ready`);
    }
    if (sections) sections.innerHTML = pulse.sections.map((section) =>
      `<span class="meeting-pulse-section-v1611${section.complete ? " is-complete" : ""}">${section.complete ? "Ready" : "Open"}: ${escapeHtml(section.label)}</span>`
    ).join("");
    if (status) status.textContent = pulse.complete
      ? "All tracked capture sections are ready for final review. Saving remains an explicit action."
      : `Next incomplete section: ${pulse.nextIncomplete.label}.`;
    if (nextButton) {
      nextButton.disabled = pulse.complete;
      nextButton.dataset.target = pulse.nextIncomplete?.id || "";
      nextButton.textContent = pulse.complete ? "Capture Sections Ready" : `Go to ${pulse.nextIncomplete.label}`;
    }
  }

  const selectedFilter = () => document.getElementById("followUpFilterV1611")?.value || "attention";
  const searchQuery = () => text(document.getElementById("followUpSearchV1611")?.value).toLowerCase();
  const itemSearchText = (item) => [item.meetingNumber, item.meetingTitle, item.meetingDate, item.task, item.assignedTo, item.priority, item.due, item.status, item.attention.join(" ")].join(" ").toLowerCase();

  function visibleItems() {
    const filter = selectedFilter();
    const query = searchQuery();
    return (currentReport?.items || []).filter((item) => Review.matchesFilter(item, filter) && (!query || itemSearchText(item).includes(query)));
  }

  function renderFollowUp() {
    if (!Review) return;
    currentReport = Review.buildFollowUpReview(safeRecords(), { dueSoonDays: settings.dueSoonDays, maxItems: settings.maximumItems });
    const counts = currentReport.counts;
    const metrics = document.getElementById("followUpMetricsV1611");
    if (metrics) metrics.innerHTML = [
      metric("Needs attention", counts.attention), metric("Overdue", counts.overdue), metric("Due soon", counts.dueSoon),
      metric("Unassigned", counts.unassigned), metric("In progress", counts.inProgress), metric("Completed", counts.completed)
    ].join("");
    const items = visibleItems();
    const status = document.getElementById("followUpStatusV1611");
    if (status) status.textContent = `${items.length} of ${currentReport.totalItems} task${currentReport.totalItems === 1 ? "" : "s"} shown${currentReport.truncated ? "; review is capped by configuration" : ""}.`;
    const list = document.getElementById("followUpListV1611");
    if (!list) return;
    if (!items.length) {
      list.innerHTML = "<p>No saved tasks match this review.</p>";
      return;
    }
    list.innerHTML = items.map((item) => `
      <article class="follow-up-item-v1611" data-primary="${escapeHtml(item.primary)}">
        <div class="follow-up-item-heading-v1611"><div>
          <h3>${escapeHtml(item.task || "Untitled follow-up task")}</h3>
          <p class="follow-up-meta-v1611">Meeting #${escapeHtml(item.meetingNumber || "?")}: ${escapeHtml(item.meetingTitle)}${item.meetingDate ? ` · ${escapeHtml(item.meetingDate)}` : ""}</p>
        </div><button type="button" data-follow-up-record-id-v1611="${escapeHtml(item.recordId)}">Open Meeting</button></div>
        <p class="follow-up-meta-v1611">Assigned To: ${escapeHtml(item.assignedTo || "Unassigned")} · Priority: ${escapeHtml(item.priority)} · Due: ${escapeHtml(item.due || "Not set")} · Status: ${escapeHtml(item.status)}</p>
        <div class="follow-up-tags-v1611">${item.attention.map((tag) => `<span class="follow-up-tag-v1611">${escapeHtml(tag)}</span>`).join("")}</div>
      </article>`).join("");
  }

  function refreshMeetingReviewV1611() {
    if (refreshQueued) return;
    refreshQueued = true;
    const run = () => { refreshQueued = false; renderPulse(); renderFollowUp(); };
    if (typeof global.requestAnimationFrame === "function") global.requestAnimationFrame(run);
    else global.setTimeout(run, 0);
  }

  function goToNextIncompleteMeetingSectionV1611() {
    const target = document.getElementById("meetingPulseNextV1611")?.dataset.target;
    if (!target) return;
    if (typeof global.navigateMeetingDayV169 === "function") return global.navigateMeetingDayV169(target);
    const section = document.getElementById(target);
    section?.scrollIntoView({ behavior: global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth", block: "start" });
    (section?.querySelector("input:not([type='hidden']), select, textarea, button, [tabindex]") || section)?.focus?.({ preventScroll: true });
  }

  function openFollowUpMeetingV1611(recordId) {
    if (!recordId || typeof global.loadRecordForEditing !== "function") return;
    global.loadRecordForEditing(recordId);
    renderPulse();
    if (typeof global.navigateMeetingDayV169 === "function") global.navigateMeetingDayV169("followUpTasksPanelV1610");
    else document.getElementById("followUpTasksPanelV1610")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  function downloadFollowUpReviewCsvV1611() {
    if (!currentReport) renderFollowUp();
    const rows = [
      ["Meeting Number", "Meeting Title", "Meeting Date", "Task", "Assigned To", "Priority", "Due", "Status", "Attention"],
      ...visibleItems().map((item) => [item.meetingNumber, item.meetingTitle, item.meetingDate, item.task, item.assignedTo, item.priority, item.due, item.status, item.attention.join(" | ")])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const filename = `methodz-follow-up-review-${new Date().toISOString().slice(0, 10)}.csv`;
    if (typeof global.downloadBlob === "function") return global.downloadBlob(csv, filename, "text/csv;charset=utf-8");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.download = filename; link.click(); URL.revokeObjectURL(link.href);
  }

  function wrapRefreshHooks() {
    ["loadSavedRecords", "populateForm", "startNewMeeting", "clearMeeting", "addTask", "removeBlock"].forEach((name) => {
      const previous = global[name];
      if (typeof previous !== "function" || previous.__methodzReviewWrappedV1611) return;
      const wrapped = function wrappedReviewRefreshV1611(...args) {
        const result = previous.apply(this, args);
        refreshMeetingReviewV1611();
        return result;
      };
      wrapped.__methodzReviewWrappedV1611 = true;
      global[name] = wrapped;
    });
  }

  function bindEvents() {
    const main = document.getElementById("mainContent");
    main?.addEventListener("input", refreshMeetingReviewV1611);
    main?.addEventListener("change", refreshMeetingReviewV1611);
    document.getElementById("followUpFilterV1611")?.addEventListener("change", () => { savePreferences(); renderFollowUp(); });
    document.getElementById("followUpSearchV1611")?.addEventListener("input", renderFollowUp);
    document.getElementById("followUpListV1611")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-follow-up-record-id-v1611]");
      if (button) openFollowUpMeetingV1611(button.dataset.followUpRecordIdV1611);
    });
    ["taskList", "attendeeList", "agendaList"].map((id) => document.getElementById(id)).filter(Boolean).forEach((element) =>
      new MutationObserver(refreshMeetingReviewV1611).observe(element, { childList: true, subtree: true })
    );
  }

  function start() {
    if (settings.enabled === false || !Review) return;
    insertMeetingPulsePanel(); insertFollowUpPanel(); loadPreferences(); wrapRefreshHooks(); bindEvents(); renderPulse(); renderFollowUp();
  }

  global.refreshMeetingReviewV1611 = refreshMeetingReviewV1611;
  global.goToNextIncompleteMeetingSectionV1611 = goToNextIncompleteMeetingSectionV1611;
  global.openFollowUpMeetingV1611 = openFollowUpMeetingV1611;
  global.downloadFollowUpReviewCsvV1611 = downloadFollowUpReviewCsvV1611;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
