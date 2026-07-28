/* Methodz Meeting Manager v1.6.9 compact meeting-day mode, migrated to the v1.6.10 panel registry. */
(function initializeMeetingDayModeV169(global) {
  "use strict";

  const config = global.METHODZ_MEETING_CONFIG || {};
  const settings = config.meetingDay || {};
  const preferencesKey = config.storageKeys?.meetingDayPreferences || "methodzMeetingDayPreferencesV169";
  const FALLBACK_SECTIONS = Object.freeze([
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
  const previousSecondaryVisibility = new WeakMap();
  let state = {
    enabled: settings.defaultEnabled === true,
    toolsOpen: false,
    lastSectionId: "meetingInformationPanelV1610"
  };

  function parseJson(raw, fallback) {
    try { return raw ? JSON.parse(raw) : fallback; } catch (error) { return fallback; }
  }

  function registryApi() {
    return global.MethodzPanelRegistryV1610 || null;
  }

  function registryReady() {
    const diagnostics = registryApi()?.diagnostics?.();
    return diagnostics?.valid === true;
  }

  function findCardByHeading(heading) {
    return Array.from(document.querySelectorAll("#mainContent > section.card"))
      .find((card) => card.querySelector(":scope > h2")?.textContent.trim() === heading);
  }

  function meetingDaySections() {
    const api = registryApi();
    if (api) {
      const registered = api.getMeetingDayPanels(document).map((entry) => ({
        id: entry.element.id,
        label: entry.meetingDayLabel,
        element: entry.element,
        panelId: entry.id,
        source: "registry"
      }));
      if (registered.length) return registered;
    }
    return FALLBACK_SECTIONS.map((section) => {
      const element = document.getElementById(section.id) || findCardByHeading(section.heading);
      if (element && !element.id) element.id = section.id;
      return { ...section, element, panelId: null, source: "heading-fallback" };
    }).filter((section) => section.element);
  }

  function defaultSectionId() {
    return meetingDaySections()[0]?.id || "meetingInformationPanelV1610";
  }

  function loadState() {
    if (settings.restorePreferences === false) return;
    const saved = parseJson(global.localStorage.getItem(preferencesKey), {});
    const validIds = new Set(meetingDaySections().map((section) => section.id));
    state = {
      enabled: saved.enabled === true,
      toolsOpen: saved.toolsOpen === true,
      lastSectionId: validIds.has(saved.lastSectionId) ? saved.lastSectionId : defaultSectionId()
    };
  }

  function saveState() {
    global.localStorage.setItem(preferencesKey, JSON.stringify({
      enabled: state.enabled,
      toolsOpen: state.toolsOpen,
      lastSectionId: state.lastSectionId,
      updatedAt: new Date().toISOString(),
      appShellVersion: config.appShellVersion,
      navigationSource: registryReady() ? "panel-registry" : "compatibility-fallback"
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

  function secondaryCards() {
    return Array.from(document.querySelectorAll(".meeting-day-secondary-v169"));
  }

  function captureSecondaryVisibility() {
    secondaryCards().forEach((card) => {
      if (card.dataset.meetingDayHiddenByModeV169 === "true") return;
      previousSecondaryVisibility.set(card, card.hidden === true);
    });
  }

  function restoreSecondaryVisibility(card) {
    if (card.dataset.meetingDayHiddenByModeV169 !== "true") return;
    card.hidden = previousSecondaryVisibility.get(card) === true;
    delete card.dataset.meetingDayHiddenByModeV169;
  }

  function markSections() {
    document.querySelectorAll("#mainContent > section.card").forEach((card) => {
      delete card.dataset.meetingDayCoreV169;
      card.classList.remove("meeting-day-secondary-v169");
    });

    const hero = document.getElementById("meetingHeroPanelV1610") || document.querySelector("#mainContent > .hero-card");
    const quickActions = document.getElementById("meetingQuickActionsPanelV1610") || document.querySelector("#mainContent > .quick-actions");
    [hero, quickActions, document.getElementById("meetingDayControlV169")].forEach((element) => {
      if (element) element.dataset.meetingDayCoreV169 = "true";
    });

    meetingDaySections().forEach((section) => {
      const card = section.element;
      if (!card) return;
      card.dataset.meetingDayCoreV169 = "true";
      card.dataset.meetingDayLabelV169 = section.label;
      card.dataset.meetingDaySourceV1610 = section.source;
    });

    document.querySelectorAll("#mainContent > section.card").forEach((card) => {
      if (card.dataset.meetingDayCoreV169 !== "true") card.classList.add("meeting-day-secondary-v169");
    });
    captureSecondaryVisibility();
  }

  function installControl() {
    if (document.getElementById("meetingDayControlV169")) return;
    const quickActions = document.getElementById("meetingQuickActionsPanelV1610") || document.querySelector("#mainContent > .quick-actions");
    const hero = document.getElementById("meetingHeroPanelV1610") || document.querySelector("#mainContent > .hero-card");
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
          <p class="helper-text">Keep the capture path in front and collapse registered infrastructure panels without removing access to them.</p>
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
    nav.innerHTML = meetingDaySections().map((section) => `<button type="button" data-meeting-day-target-v169="${escapeHtml(section.id)}" onclick="navigateMeetingDayV169('${escapeHtml(section.id)}')">${escapeHtml(section.label)}</button>`).join("");
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
    const collapseTools = settings.collapseSecondaryTools !== false;
    const registryAllowsCollapse = registryReady();
    const shouldCollapse = collapseTools && registryAllowsCollapse && state.enabled && !state.toolsOpen;
    body.classList.toggle("methodz-meeting-day-mode-v169", state.enabled);
    body.classList.toggle("methodz-meeting-day-tools-open-v169", state.enabled && (state.toolsOpen || !collapseTools || !registryAllowsCollapse));

    secondaryCards().forEach((card) => {
      if (shouldCollapse) {
        if (card.dataset.meetingDayHiddenByModeV169 !== "true") {
          previousSecondaryVisibility.set(card, card.hidden === true);
          card.dataset.meetingDayHiddenByModeV169 = "true";
        }
        card.hidden = true;
      } else {
        restoreSecondaryVisibility(card);
      }
    });

    if (toggle) {
      toggle.setAttribute("aria-pressed", String(state.enabled));
      toggle.textContent = state.enabled ? "Exit Meeting-Day Mode" : "Enter Meeting-Day Mode";
    }
    if (toolsToggle) {
      toolsToggle.hidden = !state.enabled || !collapseTools || !registryAllowsCollapse;
      toolsToggle.setAttribute("aria-expanded", String(state.toolsOpen || !collapseTools || !registryAllowsCollapse));
      toolsToggle.textContent = state.toolsOpen ? "Hide Tools" : "Show Tools";
    }
    if (status) {
      status.textContent = !registryAllowsCollapse
        ? "Panel registry validation is blocked. Meeting controls remain visible and no supporting panel will be collapsed."
        : state.enabled
          ? (!collapseTools
            ? "Meeting-day mode active. Supporting tools remain visible by configuration."
            : `Meeting-day mode active. ${state.toolsOpen ? "Supporting tools retain their previous visibility." : "Registered supporting tools are collapsed but available through Show Tools."}`)
          : "Standard workspace mode.";
    }
    updateActiveNavigation();
    saveState();
    if (options.announce !== false) {
      global.announceMethodzStatus?.(registryAllowsCollapse
        ? (state.enabled ? "Meeting-day mode active." : "Standard workspace mode active.")
        : "Meeting-day navigation is available, but panel collapsing is disabled by registry errors.");
    }
  }

  function toggleMeetingDayModeV169() {
    if (!state.enabled) captureSecondaryVisibility();
    state.enabled = !state.enabled;
    if (!state.enabled) state.toolsOpen = false;
    applyState();
  }

  function toggleMeetingDayToolsV169() {
    if (!state.enabled || settings.collapseSecondaryTools === false || !registryReady()) return;
    if (state.toolsOpen) captureSecondaryVisibility();
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
    navigateMeetingDayV169(state.lastSectionId || defaultSectionId());
  }

  function handleKeyboardShortcut(event) {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key.toLowerCase() !== "m") return;
    const target = event.target;
    if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
    event.preventDefault();
    toggleMeetingDayModeV169();
  }

  function refreshFromRegistry() {
    markSections();
    const validIds = new Set(meetingDaySections().map((section) => section.id));
    if (!validIds.has(state.lastSectionId)) state.lastSectionId = defaultSectionId();
    renderNavigation();
    applyState({ announce: false });
  }

  function start() {
    if (settings.enabled === false) return;
    installControl();
    loadState();
    refreshFromRegistry();
    document.addEventListener("keydown", handleKeyboardShortcut);
    global.addEventListener("methodz:panel-registry-ready", refreshFromRegistry);
  }

  global.toggleMeetingDayModeV169 = toggleMeetingDayModeV169;
  global.toggleMeetingDayToolsV169 = toggleMeetingDayToolsV169;
  global.navigateMeetingDayV169 = navigateMeetingDayV169;
  global.resumeMeetingDaySectionV169 = resumeMeetingDaySectionV169;

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})(window);
