/* Methodz Meeting Manager v1.6.9 compact meeting-day mode and section navigation. */
(function initializeMeetingDayModeV169(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.meetingDay || {};
  const preferencesKey = config.storageKeys?.meetingDayPreferences || "methodzMeetingDayPreferencesV169";
  const CORE_SECTIONS = Object.freeze([
    { heading: "Meeting Information", id: "meetingDayInformationV169", label: "Info" },
    { heading: "Organizations / Representatives Present", id: "meetingDayOrganizationsV169", label: "Organizations" },
    { heading: "Attendance Sign-On", id: "meetingDayAttendanceV169", label: "Attendance" },
    { heading: "Agenda Checklist", id: "meetingDayAgendaV169", label: "Agenda" },
    { heading: "Discussion Notes", id: "meetingDayNotesV169", label: "Notes" },
    { heading: "Decisions Made", id: "meetingDayDecisionsV169", label: "Decisions" },
    { heading: "Follow-Up Tasks", id: "meetingDayTasksV169", label: "Tasks" },
    { heading: "Meeting Summary", id: "meetingDaySummaryV169", label: "Summary" },
    { heading: "End of Meeting", id: "meetingDaySaveV169", label: "Save" }
  ]);
  let state = {
    enabled: settings.defaultEnabled === true,
    toolsOpen: false,
    lastSectionId: "meetingDayInformationV169"
  };

  function parseJson(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }

  function loadState() {
    if (settings.restorePreferences === false) return;
    const saved = parseJson(global.localStorage.getItem(preferencesKey), {});
    state = {
      enabled: saved.enabled === true,
      toolsOpen: saved.toolsOpen === true,
      lastSectionId: CORE_SECTIONS.some((section) => section.id === saved.lastSectionId)
        ? saved.lastSectionId
        : "meetingDayInformationV169"
    };
  }

  function saveState() {
    global.localStorage.setItem(preferencesKey, JSON.stringify({
      enabled: state.enabled,
      toolsOpen: state.toolsOpen,
      lastSectionId: state.lastSectionId,
      updatedAt: new Date().toISOString(),
      appShellVersion: config.appShellVersion
    }));
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function findCardByHeading(heading) {
    return Array.from(document.querySelectorAll("#mainContent > section.card"))
      .find((card) => card.querySelector(":scope > h2")?.textContent.trim() === heading);
  }

  function markSections() {
    const hero = document.querySelector("#mainContent > .hero-card");
    const quickActions = document.querySelector("#mainContent > .quick-actions");
    [hero, quickActions, document.getElementById("meetingDayControlV169")].forEach((element) => {
      if (element) element.dataset.meetingDayCoreV169 = "true";
    });

    CORE_SECTIONS.forEach((section) => {
      const card = findCardByHeading(section.heading);
      if (!card) return;
      card.id = section.id;
      card.dataset.meetingDayCoreV169 = "true";
      card.dataset.meetingDayLabelV169 = section.label;
    });

    document.querySelectorAll("#mainContent > section.card").forEach((card) => {
      if (card.dataset.meetingDayCoreV169 === "true") {
        card.classList.remove("meeting-day-secondary-v169");
      } else {
        card.classList.add("meeting-day-secondary-v169");
      }
    });
  }

  function installControl() {
    if (document.getElementById("meetingDayControlV169")) return;
    const quickActions = document.querySelector("#mainContent > .quick-actions");
    const hero = document.querySelector("#mainContent > .hero-card");
    const anchor = quickActions || hero;
    if (!anchor) return;

    const panel = document.createElement("section");
    panel.id = "meetingDayControlV169";
    panel.className = "card meeting-day-control-v169";
    panel.dataset.meetingDayCoreV169 = "true";
    panel.innerHTML = `
      <div class="meeting-day-control-row-v169">
        <div>
          <p class="eyebrow">Live Meeting Workspace</p>
          <h2>Meeting-Day Mode</h2>
          <p class="helper-text">Keep the capture path in front and collapse infrastructure panels without removing access to them.</p>
        </div>
        <div class="button-row meeting-day-actions-v169">
          <button id="meetingDayToggleV169" type="button" aria-pressed="false" onclick="toggleMeetingDayModeV169()">Enter Meeting-Day Mode</button>
          <button id="meetingDayToolsToggleV169" type="button" aria-expanded="false" onclick="toggleMeetingDayToolsV169()">Show Tools</button>
          <button type="button" onclick="resumeMeetingDaySectionV169()">Resume Section</button>
        </div>
      </div>
      <nav id="meetingDayNavV169" class="meeting-day-nav-v169" aria-label="Meeting-day sections"></nav>
      <p id="meetingDayStatusV169" class="helper-text" aria-live="polite">Standard workspace mode.</p>`;
    anchor.insertAdjacentElement("afterend", panel);
  }

  function renderNavigation() {
    const nav = document.getElementById("meetingDayNavV169");
    if (!nav) return;
    nav.innerHTML = CORE_SECTIONS.map((section) => {
      const available = Boolean(document.getElementById(section.id));
      return `<button type="button" data-meeting-day-target-v169="${escapeHtml(section.id)}" ${available ? "" : "disabled"} onclick="navigateMeetingDayV169('${escapeHtml(section.id)}')">${escapeHtml(section.label)}</button>`;
    }).join("");
    updateActiveNavigation();
  }

  function updateActiveNavigation() {
    document.querySelectorAll("[data-meeting-day-target-v169]").forEach((button) => {
      const active = button.dataset.meetingDayTargetV169 === state.lastSectionId;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "location");
      else button.removeAttribute("aria-current");
    });
  }

  function applyState(options = {}) {
    const body = document.body;
    const toggle = document.getElementById("meetingDayToggleV169");
    const toolsToggle = document.getElementById("meetingDayToolsToggleV169");
    const status = document.getElementById("meetingDayStatusV169");
    body.classList.toggle("methodz-meeting-day-mode-v169", state.enabled);
    body.classList.toggle("methodz-meeting-day-tools-open-v169", state.enabled && state.toolsOpen);

    document.querySelectorAll(".meeting-day-secondary-v169").forEach((card) => {
      card.hidden = state.enabled && !state.toolsOpen;
    });

    if (toggle) {
      toggle.setAttribute("aria-pressed", String(state.enabled));
      toggle.textContent = state.enabled ? "Exit Meeting-Day Mode" : "Enter Meeting-Day Mode";
    }
    if (toolsToggle) {
      toolsToggle.hidden = !state.enabled;
      toolsToggle.setAttribute("aria-expanded", String(state.toolsOpen));
      toolsToggle.textContent = state.toolsOpen ? "Hide Tools" : "Show Tools";
    }
    if (status) {
      status.textContent = state.enabled
        ? `Meeting-day mode active. ${state.toolsOpen ? "Supporting tools are expanded." : "Supporting tools are collapsed but available through Show Tools."}`
        : "Standard workspace mode.";
    }
    updateActiveNavigation();
    saveState();
    if (options.announce !== false) {
      global.announceMethodzStatus?.(state.enabled ? "Meeting-day mode active." : "Standard workspace mode active.");
    }
  }

  function toggleMeetingDayModeV169() {
    state.enabled = !state.enabled;
    if (!state.enabled) state.toolsOpen = false;
    applyState();
  }

  function toggleMeetingDayToolsV169() {
    if (!state.enabled) return;
    state.toolsOpen = !state.toolsOpen;
    applyState();
  }

  function navigateMeetingDayV169(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    state.lastSectionId = sectionId;
    updateActiveNavigation();
    saveState();
    section.hidden = false;
    section.scrollIntoView({ behavior: global.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ? "auto" : "smooth", block: "start" });
    const focusTarget = section.querySelector("input:not([type='hidden']), select, textarea, button, [tabindex]") || section;
    if (!focusTarget.hasAttribute("tabindex") && focusTarget === section) focusTarget.tabIndex = -1;
    global.setTimeout(() => focusTarget.focus({ preventScroll: true }), 250);
  }

  function resumeMeetingDaySectionV169() {
    navigateMeetingDayV169(state.lastSectionId || "meetingDayInformationV169");
  }

  function handleKeyboardShortcut(event) {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key.toLowerCase() !== "m") return;
    const target = event.target;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    event.preventDefault();
    toggleMeetingDayModeV169();
  }

  function start() {
    if (settings.enabled === false) return;
    loadState();
    installControl();
    markSections();
    renderNavigation();
    applyState({ announce: false });
    document.addEventListener("keydown", handleKeyboardShortcut);
  }

  global.toggleMeetingDayModeV169 = toggleMeetingDayModeV169;
  global.toggleMeetingDayToolsV169 = toggleMeetingDayToolsV169;
  global.navigateMeetingDayV169 = navigateMeetingDayV169;
  global.resumeMeetingDaySectionV169 = resumeMeetingDaySectionV169;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
