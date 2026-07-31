/* Methodz Meeting Manager read-only Follow-Up Planning Brief browser layer. */
(function initializeFollowUpPlanningV1613(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.followUpPlanning || {};
  const preferenceKey = config.storageKeys?.followUpPlanningPreferences || "methodzFollowUpPlanningPreferencesV1613";
  let currentBrief = null;
  let renderQueued = false;
  let started = false;

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
      console.error("Unable to build follow-up planning brief", error);
      return [];
    }
  }

  function allowedHorizons() {
    const values = Array.isArray(settings.horizonOptions) ? settings.horizonOptions : [7, 14, 30];
    const normalized = values.map(Number).filter((value) => Number.isInteger(value) && value >= 1 && value <= 90);
    return normalized.length ? [...new Set(normalized)] : [7, 14, 30];
  }

  function loadPreference() {
    let saved = {};
    try { saved = parseJson(global.localStorage.getItem(preferenceKey), {}); } catch (error) { saved = {}; }
    const horizons = allowedHorizons();
    const requested = Number(saved.horizonDays || settings.defaultHorizonDays || horizons[0]);
    return horizons.includes(requested) ? requested : horizons[0];
  }

  function savePreference(horizonDays) {
    try {
      global.localStorage.setItem(preferenceKey, JSON.stringify({
        horizonDays,
        updatedAt: new Date().toISOString(),
        appShellVersion: config.appShellVersion || "unknown"
      }));
    } catch (error) {
      console.warn("Unable to save follow-up planning preference", error);
    }
  }

  function insertPanel() {
    if (document.getElementById("followUpPlanningV1613")) return true;
    const focus = document.getElementById("followUpFocusV1613");
    const reviewPanel = document.getElementById("followUpReviewPanelV1611");
    if (!reviewPanel) return false;
    const panel = document.createElement("section");
    panel.id = "followUpPlanningV1613";
    panel.className = "follow-up-planning-v1613";
    panel.dataset.skipMeetingDraftAutosave = "true";
    const horizonOptions = allowedHorizons().map((days) => `<option value="${days}">${days} days</option>`).join("");
    panel.innerHTML = `
      <div class="follow-up-planning-heading-v1613">
        <div>
          <p class="eyebrow">Forward Planning</p>
          <h3>Follow-Up Planning Brief</h3>
        </div>
        <span class="follow-up-planning-readonly-v1613">Read only</span>
      </div>
      <p class="helper-text">Group incomplete saved tasks into a practical planning horizon. This brief never changes records, assigns people, sends reminders, or synchronizes data.</p>
      <div class="follow-up-planning-toolbar-v1613">
        <label for="followUpPlanningHorizonV1613">Planning Window
          <select id="followUpPlanningHorizonV1613">${horizonOptions}</select>
        </label>
        <button id="refreshFollowUpPlanningV1613" type="button">Refresh Plan</button>
        <button id="downloadFollowUpPlanningV1613" type="button">Download Planning CSV</button>
      </div>
      <div id="followUpPlanningMetricsV1613" class="follow-up-planning-metrics-v1613"></div>
      <div class="follow-up-planning-grid-v1613">
        <div>
          <h4>Planning Lanes</h4>
          <div id="followUpPlanningLanesV1613" class="follow-up-planning-lanes-v1613"></div>
        </div>
        <div>
          <h4>Assigned To Outlook</h4>
          <div id="followUpPlanningAssigneesV1613" class="follow-up-planning-assignees-v1613"></div>
        </div>
      </div>
      <p id="followUpPlanningStatusV1613" class="helper-text" aria-live="polite"></p>
      <p class="helper-text"><strong>Export note:</strong> the CSV contains task and meeting details. Protect it as business data.</p>`;
    if (focus) focus.insertAdjacentElement("afterend", panel);
    else reviewPanel.querySelector(".follow-up-toolbar-v1611")?.insertAdjacentElement("beforebegin", panel);
    return Boolean(document.getElementById("followUpPlanningV1613"));
  }

  const metric = (label, value) => `<div class="follow-up-planning-metric-v1613"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;

  function currentHorizon() {
    const control = document.getElementById("followUpPlanningHorizonV1613");
    return Number(control?.value || settings.defaultHorizonDays || 7);
  }

  function buildBrief() {
    const Review = global.MethodzMeetingReviewCoreV1611;
    const Planning = global.MethodzFollowUpPlanningCoreV1613;
    if (!Review || !Planning) return null;
    const review = Review.buildFollowUpReview(safeRecords(), {
      dueSoonDays: config.followUpReview?.dueSoonDays,
      maxItems: config.followUpReview?.maximumItems
    });
    return Planning.buildFollowUpPlanningBrief(review, {
      horizonDays: currentHorizon(),
      maximumItems: settings.maximumItems,
      maximumAssignees: settings.maximumAssignees
    });
  }

  function renderLanes(brief) {
    const container = document.getElementById("followUpPlanningLanesV1613");
    if (!container) return;
    const activeLanes = brief.lanes.filter((lane) => lane.count > 0);
    if (!activeLanes.length) {
      container.innerHTML = "<p>No incomplete saved tasks are available for planning.</p>";
      return;
    }
    container.innerHTML = activeLanes.map((lane) => `
      <section class="follow-up-planning-lane-v1613" data-planning-lane-v1613="${escapeHtml(lane.id)}">
        <div class="follow-up-planning-lane-heading-v1613">
          <h5>${escapeHtml(lane.label)}</h5>
          <span>${escapeHtml(lane.count)}</span>
        </div>
        <div class="follow-up-planning-items-v1613">
          ${lane.items.map((item) => `
            <article class="follow-up-planning-item-v1613">
              <div>
                <strong>${escapeHtml(item.task || "Untitled follow-up task")}</strong>
                <p>${escapeHtml(item.meetingTitle)} · Assigned To: ${escapeHtml(item.assignedTo || "Unassigned")}</p>
                <p>Due: ${escapeHtml(item.due || "Not set")} · ${escapeHtml(item.priority)} priority · ${escapeHtml(item.status)}</p>
                <div class="follow-up-tags-v1611">${item.planning.reasons.map((reason) => `<span class="follow-up-tag-v1611">${escapeHtml(reason)}</span>`).join("")}</div>
              </div>
              <button type="button" data-follow-up-planning-record-id-v1613="${escapeHtml(item.recordId)}">Open Meeting</button>
            </article>`).join("") || `<p>${lane.truncated ? "Items are outside the configured display limit." : "No visible items in this lane."}</p>`}
        </div>
        ${lane.truncated ? `<p class="helper-text">${escapeHtml(lane.count - lane.visibleCount)} additional item${lane.count - lane.visibleCount === 1 ? "" : "s"} omitted by the display limit.</p>` : ""}
      </section>`).join("");
  }

  function renderAssignees(brief) {
    const container = document.getElementById("followUpPlanningAssigneesV1613");
    if (!container) return;
    if (!brief.assigneeLoads.length) {
      container.innerHTML = "<p>No Assigned To outlook is available.</p>";
      return;
    }
    container.innerHTML = brief.assigneeLoads.map((item) => `
      <div class="follow-up-planning-assignee-v1613${item.missingAssignment ? " is-unassigned" : ""}">
        <strong>${escapeHtml(item.assignedTo)}</strong>
        <span>${escapeHtml(item.tasks)} open · ${escapeHtml(item.overdue)} overdue · ${escapeHtml(item.dueToday)} today · ${escapeHtml(item.withinWindow)} in window</span>
        <span>${escapeHtml(item.needsScheduling)} need scheduling · ${escapeHtml(item.inProgress)} in progress · ${escapeHtml(item.highPriority)} high priority</span>
      </div>`).join("");
  }

  function renderPlanningBriefV1613() {
    if (!insertPanel()) return;
    const horizonControl = document.getElementById("followUpPlanningHorizonV1613");
    if (horizonControl && !horizonControl.dataset.preferenceLoaded) {
      horizonControl.value = String(loadPreference());
      horizonControl.dataset.preferenceLoaded = "true";
    }
    currentBrief = buildBrief();
    const status = document.getElementById("followUpPlanningStatusV1613");
    if (!currentBrief) {
      if (status) status.textContent = "The planning core is unavailable. No records were changed.";
      return;
    }
    const counts = currentBrief.counts;
    const metrics = document.getElementById("followUpPlanningMetricsV1613");
    if (metrics) metrics.innerHTML = [
      metric("Open tasks", counts.actionable),
      metric("Overdue", counts.overdue),
      metric("Due today", counts.dueToday),
      metric(`Next ${currentBrief.horizonDays} days`, counts.withinWindow),
      metric("Need scheduling", counts.needsScheduling),
      metric("Unassigned", counts.unassigned)
    ].join("");
    renderLanes(currentBrief);
    renderAssignees(currentBrief);
    if (status) status.textContent = currentBrief.totalItems
      ? `${currentBrief.items.length} of ${currentBrief.totalItems} incomplete task${currentBrief.totalItems === 1 ? "" : "s"} shown through ${currentBrief.horizonEnd}${currentBrief.truncated ? "; the brief is capped by configuration" : ""}. This view is read-only.`
      : "No incomplete saved tasks require planning. This view is read-only.";
  }

  function queueRender() {
    if (renderQueued) return;
    renderQueued = true;
    const run = () => {
      renderQueued = false;
      renderPlanningBriefV1613();
    };
    if (typeof global.requestAnimationFrame === "function") global.requestAnimationFrame(run);
    else global.setTimeout(run, 0);
  }

  const csvCell = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;

  function downloadFollowUpPlanningBriefCsvV1613() {
    if (!currentBrief) renderPlanningBriefV1613();
    if (!currentBrief) return;
    const rows = [
      ["Planning Lane", "Meeting Number", "Meeting Title", "Meeting Date", "Task", "Assigned To", "Priority", "Due", "Status", "Planning Reasons"],
      ...currentBrief.items.map((item) => [
        item.planning.lane,
        item.meetingNumber,
        item.meetingTitle,
        item.meetingDate,
        item.task,
        item.assignedTo,
        item.priority,
        item.due,
        item.status,
        item.planning.reasons.join(" | ")
      ])
    ];
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const filename = `methodz-follow-up-planning-${currentBrief.today}-${currentBrief.horizonDays}d.csv`;
    if (typeof global.downloadBlob === "function") return global.downloadBlob(csv, filename, "text/csv;charset=utf-8");
    const link = document.createElement("a");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    link.href = url;
    link.download = filename;
    link.click();
    global.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function bindEvents() {
    const panel = document.getElementById("followUpPlanningV1613");
    document.getElementById("refreshFollowUpPlanningV1613")?.addEventListener("click", renderPlanningBriefV1613);
    document.getElementById("downloadFollowUpPlanningV1613")?.addEventListener("click", downloadFollowUpPlanningBriefCsvV1613);
    document.getElementById("followUpPlanningHorizonV1613")?.addEventListener("change", (event) => {
      savePreference(Number(event.target.value));
      renderPlanningBriefV1613();
    });
    panel?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-follow-up-planning-record-id-v1613]");
      if (!button) return;
      const recordId = button.dataset.followUpPlanningRecordIdV1613;
      if (typeof global.openFollowUpMeetingV1611 === "function") global.openFollowUpMeetingV1611(recordId);
    });
    const savedRecords = document.getElementById("savedRecords");
    if (savedRecords) new MutationObserver(queueRender).observe(savedRecords, { childList: true, subtree: true });
    global.addEventListener("storage", (event) => {
      if (event.key === config.storageKeys?.records) queueRender();
    });
  }

  function start() {
    if (started || settings.enabled === false) return started;
    if (!global.MethodzFollowUpPlanningCoreV1613 || !global.MethodzMeetingReviewCoreV1611 || !insertPanel()) return false;
    started = true;
    bindEvents();
    renderPlanningBriefV1613();
    return true;
  }

  function startWhenReady() {
    if (start()) return;
    const observer = new MutationObserver(() => {
      if (start()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    global.setTimeout(() => observer.disconnect(), 5000);
  }

  global.refreshFollowUpPlanningV1613 = renderPlanningBriefV1613;
  global.downloadFollowUpPlanningBriefCsvV1613 = downloadFollowUpPlanningBriefCsvV1613;
  global.getFollowUpPlanningBriefV1613 = () => currentBrief;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", startWhenReady, { once: true });
  else startWhenReady();
})(window);
